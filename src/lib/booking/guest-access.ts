import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { db, transaction } from "./db";
import { hash, token, encrypt, decrypt } from "./security";
import { BookingError } from "./validation";
import { reservationStatus } from "./request-status";
export const guestCookie = (reference: string) =>
  `${process.env.PARAISO_DEMO_MODE === "true" ? "demo_" : ""}booking_access_${reference}`;
export async function guestBooking(reference: string) {
  const access = (await cookies()).get(guestCookie(reference))?.value;
  if (!access)
    throw new BookingError(
      401,
      "Verify ownership through the booking access link sent to your email.",
    );
  const b = (
    await db().query(
      "SELECT b.id FROM guest_booking_sessions s JOIN bookings b ON b.id=s.booking_id WHERE s.token_hash=$1 AND s.expires_at>now() AND b.reference_number=$2",
      [hash(access), reference],
    )
  ).rows[0];
  if (!b)
    throw new BookingError(
      401,
      "Your secure booking access has expired. Request a new email link.",
    );
  return b.id as string;
}
export async function requestAccess(reference: string, email: string) {
  if (
    !process.env.INTEGRATION_ENCRYPTION_KEY ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_FROM
  )
    throw new BookingError(
      503,
      "Email booking lookup is not configured. Contact the resort with your reference for assistance.",
    );
  const b = (
    await db().query(
      "SELECT id FROM bookings WHERE reference_number=$1 AND lower(guest_email)=lower($2)",
      [reference, email],
    )
  ).rows[0];
  if (!b) return;
  const value = token();
  await db().query(
    "INSERT INTO guest_access_requests(booking_id,token_hash,token_encrypted,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')",
    [b.id, hash(value), encrypt(value)],
  );
}
export async function consumeAccess(reference: string, value: string) {
  const access = token();
  return transaction(async (c) => {
    const link = (
      await c.query(
        "SELECT r.id,r.booking_id FROM guest_access_requests r JOIN bookings b ON b.id=r.booking_id WHERE b.reference_number=$1 AND r.token_hash=$2 AND r.consumed_at IS NULL AND r.expires_at>now() FOR UPDATE OF r",
        [reference, hash(value)],
      )
    ).rows[0];
    if (!link)
      throw new BookingError(
        401,
        "This access link is invalid, used or expired. Request a new link.",
      );
    await c.query(
      "UPDATE guest_access_requests SET consumed_at=now() WHERE id=$1",
      [link.id],
    );
    await c.query(
      "INSERT INTO guest_booking_sessions(token_hash,booking_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [hash(access), link.booking_id],
    );
    return access;
  });
}
export async function guestDetails(id: string) {
  const b = (
    await db().query(
      "SELECT id,product_id,booking_category,slot,adult_count,child_count,units_count,total_amount,is_cart,reference_number,guest_name,product_name,workflow_status,status,check_in_date,check_out_date,hold_expires_at,reservation_only,decline_reason,reviewed_at,reconciliation_required,policy_snapshot,balance_due_at,version FROM bookings WHERE id=$1",
      [id],
    )
  ).rows[0];
  const items = (
    await db().query(
      "SELECT i.id,i.product_id,i.name,i.category,i.overnight,i.check_in_date,i.check_out_date,i.slot,i.adult_count,i.child_count,i.units_count,i.special_requests,COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.name)) FROM booking_item_addons a WHERE a.item_id=i.id),'[]'::jsonb) AS addons FROM booking_items i WHERE i.booking_id=$1 ORDER BY i.check_in_date,i.slot",
      [id],
    )
  ).rows;
  if (!b) throw new BookingError(404, "Reservation not found.");
  if (!b.is_cart && !items.length) {
    const p = (
      await db().query(
        "SELECT overnight FROM accommodation_types WHERE id=$1",
        [b.product_id],
      )
    ).rows[0];
    items.push({
      id: b.id,
      product_id: b.product_id,
      name: b.product_name,
      category: b.booking_category,
      overnight: p.overnight,
      check_in_date: b.check_in_date,
      check_out_date: b.check_out_date,
      slot: b.slot,
      adult_count: b.adult_count,
      child_count: b.child_count,
      units_count: b.units_count,
      special_requests: "",
      addons: [],
    });
  }
  return {
    id: b.id,
    version: b.version,
    reference_number: b.reference_number,
    guest_name: b.guest_name,
    status: b.status,
    workflow_status: reservationStatus(b),
    is_cart: b.is_cart,
    reservation_only: b.reservation_only,
    decline_reason: b.decline_reason,
    reviewed_at: b.reviewed_at,
    items,
    changeRequests: (
      await db().query(
        "SELECT id,kind,message,state,response FROM booking_change_requests WHERE booking_id=$1 ORDER BY created_at DESC",
        [id],
      )
    ).rows,
  };
}
export async function deliverAccessLinks() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_FROM ||
    !process.env.INTEGRATION_ENCRYPTION_KEY ||
    !process.env.APP_URL
  )
    return;
  await transaction(async (c) => {
    const lock = (
      await c.query("SELECT pg_try_advisory_xact_lock(19766125) AS locked")
    ).rows[0].locked;
    if (!lock) return;
    const rows = (
      await c.query(
        "SELECT r.*,b.reference_number,b.guest_email FROM guest_access_requests r JOIN bookings b ON b.id=r.booking_id WHERE r.sent_at IS NULL AND r.consumed_at IS NULL AND r.expires_at>now() AND r.attempts<3 ORDER BY r.id LIMIT 5",
      )
    ).rows;
    for (const r of rows) {
      try {
        const smtp = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          requireTLS: process.env.SMTP_SECURE !== "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
          connectionTimeout: 15000,
          socketTimeout: 20000,
        });
        const link = `${process.env.APP_URL}/booking/track/#reference=${encodeURIComponent(r.reference_number)}&token=${decrypt(r.token_encrypted)}`;
        await smtp.sendMail({
          from: process.env.SMTP_FROM,
          to: r.guest_email,
          subject: `Paraiso secure booking access: ${r.reference_number}`,
          text: `Your private booking access link:\n${link}\n\nThis link can be used once and expires after 30 minutes. Open it only on the official resort website. Your browser will retain access for 24 hours. If you did not request it, ignore this email.\n\nParaiso de June Quixote Ecofarm Resort`,
          messageId: `<access-${r.id}@${new URL(process.env.APP_URL!).hostname}>`,
        });
        await c.query(
          "UPDATE guest_access_requests SET sent_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1",
          [r.id],
        );
      } catch {
        await c.query(
          "UPDATE guest_access_requests SET attempts=attempts+1,last_error='EMAIL_DELIVERY_FAILED' WHERE id=$1",
          [r.id],
        );
      }
    }
  });
}
