import { capacity, inventoryLock } from "./capacity";
export { endDate } from "./capacity";
import { estimate } from "./pricing";
export { estimate } from "./pricing";
import { type PoolClient } from "pg";
import { db, transaction, type Product, type Staff } from "./db";
import { hash, token, requireApproval } from "./security";
import {
  BookingError,
  bookingSchema,
  transitions,
  type BookingInput,
  text,
} from "./validation";
import { manilaDate } from "../dates";
import { reservationStatus } from "./request-status";
import { summaryColumns } from "./summaries";
import { ensureTrackingReference } from "./public-tracking";

export async function lockProduct(c: PoolClient, id: string, forUpdate = true) {
  if (forUpdate) await inventoryLock(c);
  const p = (
    await c.query<Product>(
      `SELECT * FROM accommodation_types WHERE id=$1${forUpdate ? " FOR UPDATE" : ""}`,
      [id],
    )
  ).rows[0];
  if (!p) throw new BookingError(404, "Accommodation or package not found.");
  return p;
}
export const availability = capacity;
export async function enqueue(
  c: PoolClient,
  id: string,
  version: number,
  status: string,
  initial = false,
) {
  for (const kind of [
    "EXCEL",
    "GUEST_EMAIL",
    ...(initial ? ["STAFF_EMAIL"] : []),
  ])
    await c.query(
      "INSERT INTO integration_jobs(booking_id,kind,event_version,event_status) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [id, kind, version, status],
    );
}
export async function createBooking(raw: unknown, user: Staff | null = null) {
  const input = bookingSchema.parse(raw),
    receipt = token(),
    requestHash = hash(JSON.stringify(input));
  return transaction(async (c) => {
    // Serialize retries of the same submission before touching inventory.
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      input.requestKey,
    ]);
    const prior = (
      await c.query(
        "SELECT id,reference_number,request_hash,created_by FROM bookings WHERE request_key=$1",
        [input.requestKey],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.request_hash !== requestHash ||
        (prior.created_by || null) !== (user?.id || null)
      )
        throw new BookingError(
          409,
          "This submission key was already used. Reload the form.",
        );
      // Possession of the original random submission key permits receipt recovery after a lost response.
      await c.query(
        "UPDATE bookings SET receipt_hash=$1,receipt_expires_at=now()+interval '1 day' WHERE id=$2",
        [hash(receipt), prior.id],
      );
      const trackingReference = await ensureTrackingReference(c, prior.id);
      return {
        reference: prior.reference_number as string,
        receipt,
        trackingReference,
      };
    }
    const p = await lockProduct(c, input.productId);
    if (
      p.deposit_mode !== "UNCONFIGURED" ||
      ["SWIMMING", "DINING"].includes(p.category)
    )
      throw new BookingError(
        409,
        "Use the combined booking checkout for this service and its payment rules.",
      );
    const a = await availability(c, p, input);
    if (!a.configured)
      throw new BookingError(
        409,
        "This option is awaiting verified inventory and capacity. Please contact the resort.",
      );
    if (!a.available)
      throw new BookingError(
        409,
        "These dates do not have enough availability. Please choose another option.",
      );
    const addonIds = [...new Set(input.addons)];
    const addons = (
      await c.query(
        "SELECT id,name,price FROM addons WHERE id=ANY($1::uuid[]) AND active",
        [addonIds],
      )
    ).rows;
    if (addons.length !== addonIds.length)
      throw new BookingError(400, "An add-on is no longer available.");
    const reference = `PDJ-${manilaDate().replaceAll("-", "")}-${token().slice(0, 12).toUpperCase()}`;
    const result = await c.query(
      `INSERT INTO bookings(reference_number,receipt_hash,request_key,request_hash,guest_name,guest_email,guest_phone,product_id,product_name,booking_category,check_in_date,check_out_date,slot,adult_count,child_count,units_count,total_amount,special_requests,source,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [
        reference,
        hash(receipt),
        input.requestKey,
        requestHash,
        input.guestName,
        input.guestEmail,
        input.guestPhone,
        p.id,
        p.name,
        p.category,
        input.checkIn,
        a.end,
        input.slot,
        input.adults,
        input.children,
        input.units,
        estimate(
          p,
          input,
          addons.map((a) => a.price),
        ),
        input.notes,
        user ? "MANUAL" : "WEBSITE",
        user?.id || null,
      ],
    );
    const id = result.rows[0].id;
    const trackingReference = await ensureTrackingReference(c, id);
    for (const addon of addons)
      await c.query(
        "INSERT INTO booking_addons(booking_id,addon_id,name,price) VALUES($1,$2,$3,$4)",
        [id, addon.id, addon.name, addon.price],
      );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,new_status,performed_by) VALUES($1,'REQUEST_CREATED','PENDING',$2)",
      [id, user?.id || null],
    );
    await c.query("INSERT INTO notifications(booking_id) VALUES($1)", [id]);
    await enqueue(c, id, 1, "PENDING", true);
    return { reference, receipt, trackingReference };
  });
}
export async function updateBooking(
  id: string,
  input: {
    status?: string;
    reason?: string;
    notes?: string;
    guestPhone?: string;
    version: number;
  },
  user: Staff,
) {
  return transaction(async (c) => {
    const initial = (
      await c.query("SELECT product_id FROM bookings WHERE id=$1", [id])
    ).rows[0];
    if (!initial) throw new BookingError(404, "Reservation not found.");
    const p = await lockProduct(c, initial.product_id);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (b.version !== input.version)
      throw new BookingError(
        409,
        "This reservation changed. Refresh before saving.",
      );
    if (input.status === b.status)
      throw new BookingError(409, "This reservation already has that status.");
    if (
      input.status === "DECLINED" &&
      text(2000).parse(input.reason || "").length < 10
    )
      throw new BookingError(
        400,
        "Provide a meaningful decline reason of at least 10 characters.",
      );
    if (b.is_cart) {
      const statusChanged = !!input.status && input.status !== b.status;
      if (statusChanged) {
        if (input.status === "CHECKED_IN") {
          if (b.status !== "CONFIRMED" || b.check_in_date > manilaDate())
            throw new BookingError(
              409,
              "Check-in is not due or the reservation is not confirmed.",
            );
          await c.query(
            "UPDATE bookings SET status='CHECKED_IN',version=version+1,updated_at=now() WHERE id=$1",
            [id],
          );
          await c.query(
            "INSERT INTO booking_activity_logs(booking_id,action,performed_by) VALUES($1,'GUEST_CHECKED_IN',$2)",
            [id, user.id],
          );
        } else {
          const { cartTransition } = await import("./cart");
          await cartTransition(
            c,
            b,
            input.status === "CHECKED_OUT" ? "COMPLETED" : input.status!,
            user,
            false,
            input.reason || "",
          );
        }
      }
      if (
        input.notes !== undefined ||
        input.guestPhone !== undefined ||
        !statusChanged
      ) {
        await c.query(
          "UPDATE bookings SET special_requests=$2,guest_phone=$3,version=version+$4,updated_at=now() WHERE id=$1",
          [
            id,
            input.notes ?? b.special_requests,
            input.guestPhone ?? b.guest_phone,
            statusChanged ? 0 : 1,
          ],
        );
        await c.query(
          "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,'DETAILS_UPDATED',$2,$3)",
          [
            id,
            user.id,
            JSON.stringify({
              notes: {
                previous: b.special_requests,
                next: input.notes ?? b.special_requests,
              },
              phone: {
                previous: b.guest_phone,
                next: input.guestPhone ?? b.guest_phone,
              },
            }),
          ],
        );
        if (!statusChanged)
          await enqueue(c, id, b.version + 1, b.workflow_status);
      }
      return;
    }
    const status = input.status || b.status;
    if (status !== b.status) {
      if (
        !transitions[b.status]?.includes(status) &&
        !(status === "CHECKED_OUT" && b.status === "CONFIRMED" && !p.overnight)
      )
        throw new BookingError(409, "This status change is not permitted.");
      if (["CONFIRMED", "DECLINED", "CANCELLED"].includes(status))
        requireApproval(user);
      if (
        ["CHECKED_IN", "CHECKED_OUT"].includes(status) &&
        b.check_in_date > manilaDate()
      )
        throw new BookingError(409, "Check-in is not due yet.");
      if (status === "CONFIRMED") {
        if (b.check_in_date < manilaDate())
          throw new BookingError(
            409,
            "Cannot confirm a reservation in the past.",
          );
        const a = await availability(
          c,
          p,
          {
            checkIn: b.check_in_date,
            checkOut: b.check_out_date,
            units: b.units_count,
            adults: b.adult_count,
            children: b.child_count,
            slot: b.slot,
          },
          id,
        );
        if (!a.configured || !a.available)
          throw new BookingError(
            409,
            "Capacity is no longer available. No confirmation was made.",
          );
        for (const unitId of a.unitIds)
          await c.query(
            "INSERT INTO booking_units(booking_id,unit_id,check_in_date,check_out_date) VALUES($1,$2,$3,$4)",
            [id, unitId, b.check_in_date, b.check_out_date],
          );
      }
      if (["CANCELLED", "DECLINED", "CHECKED_OUT"].includes(status))
        await c.query(
          "UPDATE booking_units SET active=false WHERE booking_id=$1",
          [id],
        );
    }
    await c.query(
      "UPDATE bookings SET status=$2,special_requests=$3,guest_phone=$4,version=version+1,updated_at=now() WHERE id=$1",
      [
        id,
        status,
        input.notes ?? b.special_requests,
        input.guestPhone ?? b.guest_phone,
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,previous_status,new_status,performed_by,details) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        status === b.status ? "DETAILS_UPDATED" : "STATUS_CHANGED",
        b.status,
        status,
        user.id,
        JSON.stringify({
          ...(input.notes !== undefined && input.notes !== b.special_requests
            ? { notes: { previous: b.special_requests, next: input.notes } }
            : {}),
          ...(input.guestPhone !== undefined &&
          input.guestPhone !== b.guest_phone
            ? { phone: { previous: b.guest_phone, next: input.guestPhone } }
            : {}),
        }),
      ],
    );
    if (["CONFIRMED", "DECLINED"].includes(status) && status !== b.status)
      await c.query(
        "UPDATE bookings SET reviewed_by=$2,reviewed_at=now(),decline_reason=$3 WHERE id=$1",
        [id, user.id, status === "DECLINED" ? input.reason || null : null],
      );
    await enqueue(c, id, b.version + 1, status, true);
  });
}
export async function listBookings(params: URLSearchParams) {
  const search = (params.get("q") || "").trim().slice(0, 120),
    status = params.get("status") || "",
    from = params.get("from") || null,
    to = params.get("to") || null,
    category = text(40).parse(params.get("category") || "");
  const guestEmail = text(254).parse(params.get("guestEmail") || "");
  const dateField = params.get("dateField") || "arrival";
  if (!["arrival", "departure"].includes(dateField))
    throw new BookingError(400, "Choose arrival or departure dates.");
  const sorts: Record<string, string> = {
    newest: "b.created_at DESC,b.id",
    oldest: "b.created_at,b.id",
    arrival: "b.check_in_date,b.id",
    departure: "b.check_out_date,b.id",
    guest: "b.guest_name,b.id",
  };
  const sort = params.get("sort") || "newest";
  if (!Object.hasOwn(sorts, sort))
    throw new BookingError(400, "Unsupported reservation sorting.");
  const dateColumn =
    dateField === "departure" ? "b.check_out_date" : "b.check_in_date";
  const page = params.get("page");
  if (page !== null && !/^[1-9]\d{0,4}$/.test(page))
    throw new BookingError(400, "Invalid reservation page.");
  const limit = page ? 50 : 10001,
    offset = page ? (Number(page) - 1) * 50 : 0;
  return (
    await db().query(
      `SELECT b.id,b.reference_number,b.public_tracking_reference,b.guest_name,b.guest_email,b.guest_phone,b.booking_category,b.product_name,b.check_in_date,b.check_out_date,b.adult_count,b.child_count,b.units_count,b.status,b.special_requests,b.created_at,b.updated_at,b.version,b.slot,b.source,p.overnight,b.is_cart,b.workflow_status,b.reservation_only,b.guest_address,b.additional_phone,b.reservation_channel,b.decline_reason,b.reviewed_by,b.reviewed_at,${summaryColumns} FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE ($1='' OR b.guest_name ILIKE '%'||$1||'%' OR b.reference_number ILIKE '%'||$1||'%' OR b.public_tracking_reference ILIKE '%'||$1||'%' OR b.guest_email ILIKE '%'||$1||'%') AND ($2='' OR b.status=$2 OR b.workflow_status=$2 OR ($2='PENDING_APPROVAL' AND b.status='PENDING')) AND ((NOT b.is_cart AND ($3::date IS NULL OR ${dateColumn}>=$3) AND ($4::date IS NULL OR ${dateColumn}<=$4)) OR EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND ($3::date IS NULL OR ${dateField === "departure" ? "i.check_out_date" : "i.check_in_date"}>=$3) AND ($4::date IS NULL OR ${dateField === "departure" ? "i.check_out_date" : "i.check_in_date"}<=$4) AND ($5='' OR i.category=$5))) AND ($5='' OR b.booking_category=$5 OR EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.category=$5)) AND ($8='' OR lower(b.guest_email)=lower($8)) ORDER BY ${sorts[sort]} LIMIT $6 OFFSET $7`,
      [search, status, from, to, category, limit, offset, guestEmail],
    )
  ).rows;
}
export async function bookingDetails(id: string) {
  const b = (
    await db().query(
      `SELECT b.id,b.product_id,b.booking_category,b.reference_number,b.public_tracking_reference,b.guest_name,b.guest_email,b.guest_phone,b.product_name,b.check_in_date,b.check_out_date,b.slot,b.adult_count,b.child_count,b.units_count,b.status,b.special_requests,b.created_at,b.source,b.version,p.overnight,b.is_cart,b.workflow_status,b.reservation_only,b.guest_address,b.additional_phone,b.reservation_channel,b.decline_reason,b.reviewed_by,b.reviewed_at,${summaryColumns} FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE b.id=$1`,
      [id],
    )
  ).rows[0];
  if (!b) throw new BookingError(404, "Reservation not found.");
  const [history, units, jobs, addons] = await Promise.all([
    db().query(
      "SELECT l.action,l.previous_status,l.new_status,l.timestamp,l.details,u.full_name FROM booking_activity_logs l LEFT JOIN users u ON u.id=l.performed_by WHERE booking_id=$1 AND l.action !~ '(PAYMENT|REFUND|LEDGER|DEPOSIT|BALANCE|RECONCIL|GATEWAY|CHECKOUT)' ORDER BY l.timestamp,l.id",
      [id],
    ),
    db().query(
      "SELECT u.unit_identifier FROM booking_units bu JOIN accommodation_units u ON u.id=bu.unit_id WHERE booking_id=$1 AND bu.active",
      [id],
    ),
    db().query(
      "SELECT id,kind,state,attempts,last_error,updated_at FROM integration_jobs WHERE booking_id=$1 AND event_status !~ '(PAYMENT|VERIFICATION|BALANCE|REFUND|DEPOSIT|RECONCIL)' ORDER BY id DESC",
      [id],
    ),
    db().query("SELECT name,price FROM booking_addons WHERE booking_id=$1", [
      id,
    ]),
  ]);
  const items = (
    await db().query(
      "SELECT i.id,i.product_id,i.name,i.category,i.overnight,i.check_in_date,i.check_out_date,i.slot,i.adult_count,i.child_count,i.units_count,i.special_requests,COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.name)) FROM booking_item_addons a WHERE a.item_id=i.id),'[]'::jsonb) addons FROM booking_items i WHERE booking_id=$1 ORDER BY check_in_date,slot",
      [id],
    )
  ).rows;
  if (!b.is_cart && !items.length)
    items.push({
      id: b.id,
      product_id: b.product_id,
      name: b.product_name,
      category: b.booking_category,
      overnight: b.overnight,
      check_in_date: b.check_in_date,
      check_out_date: b.check_out_date,
      slot: b.slot,
      adult_count: b.adult_count,
      child_count: b.child_count,
      units_count: b.units_count,
      special_requests: "",
      addons: addons.rows,
    });
  return {
    ...b,
    changeRequests: (
      await db().query(
        "SELECT id,kind,message,state,response FROM booking_change_requests WHERE booking_id=$1 ORDER BY created_at DESC",
        [id],
      )
    ).rows,
    workflow_status: reservationStatus(b),
    staff_notes: (
      await db().query(
        "SELECT n.id,n.note,n.created_at,u.full_name FROM booking_staff_notes n JOIN users u ON u.id=n.created_by WHERE n.booking_id=$1 ORDER BY n.created_at,n.id",
        [id],
      )
    ).rows,
    items,
    history: history.rows.map((row) => ({
      ...row,
      details: reservationAudit(row.details),
    })),
    units: units.rows,
    jobs: jobs.rows,
    addons: addons.rows,
  };
}
function reservationAudit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reservationAudit);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(payment|refund|deposit|amount|centavos|price|rates|netPaid|additionalDue|refundReview)/i.test(
              key,
            ),
        )
        .map(([key, v]) => [key, reservationAudit(v)]),
    );
  return value;
}
export type { BookingInput };
