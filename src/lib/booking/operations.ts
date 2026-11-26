import { z } from "zod";
import { db, transaction, type Staff } from "./db";
import { BookingError, text, dateSchema } from "./validation";
import { listBookings } from "./service";
import { exportWorkbook } from "./excel";

export const operationsSchema = z
  .object({
    version: z.number().int().positive(),
    resortName: text(160),
    resortAddress: text(1000),
    resortPhone: text(60),
    resortEmail: z.union([z.literal(""), z.string().email().max(254)]),
    operatingHours: text(2000),
    terms: text(20000),
    cancellationPolicy: text(20000),
    privacyPolicy: text(20000),
    reschedulingPolicy: text(20000),
    reminderDays: z.number().int().min(1).max(30).nullable(),
  })
  .strict();
export async function operationalSettings() {
  return (
    await db().query(
      "SELECT resort_name,resort_address,resort_phone,resort_email,operating_hours,terms,cancellation_policy,privacy_policy,rescheduling_policy,policy_version,reminder_days FROM reservation_settings WHERE id=1",
    )
  ).rows[0];
}
export async function saveOperationalSettings(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = operationsSchema.parse(raw);
  await transaction(async (c) => {
    const result = await c.query(
      "UPDATE reservation_settings SET resort_name=$1,resort_address=$2,resort_phone=$3,resort_email=$4,operating_hours=$5,terms=$6,cancellation_policy=$7,privacy_policy=$8,rescheduling_policy=$9,reminder_days=$10,policy_version=policy_version+1,policies_published_at=now() WHERE id=1 AND policy_version=$11 RETURNING id",
      [
        v.resortName,
        v.resortAddress,
        v.resortPhone,
        v.resortEmail,
        v.operatingHours,
        v.terms,
        v.cancellationPolicy,
        v.privacyPolicy,
        v.reschedulingPolicy,
        v.reminderDays,
        v.version,
      ],
    );
    if (!result.rowCount)
      throw new BookingError(409, "Settings changed. Reload before saving.");
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('RESERVATION_SETTINGS_UPDATED',$1)",
      [user.id],
    );
  });
}
export async function guestRecords(params: URLSearchParams) {
  const search = text(120).parse(params.get("q") || ""),
    page = Number(params.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new BookingError(400, "Invalid guest page.");
  return (
    await db().query(
      `SELECT lower(guest_email) email,(array_agg(guest_name ORDER BY created_at DESC))[1] guest_name,(array_agg(guest_phone ORDER BY created_at DESC))[1] guest_phone,count(*)::int total,count(*) FILTER(WHERE check_out_date<=(now() AT TIME ZONE 'Asia/Manila')::date AND status NOT IN ('CANCELLED','DECLINED'))::int previous,count(*) FILTER(WHERE check_out_date>(now() AT TIME ZONE 'Asia/Manila')::date AND status IN ('PENDING','CONFIRMED','CHECKED_IN'))::int upcoming,count(*) FILTER(WHERE status='CANCELLED')::int cancelled FROM bookings WHERE ($1='' OR guest_name ILIKE '%'||$1||'%' OR guest_phone ILIKE '%'||$1||'%' OR guest_email ILIKE '%'||$1||'%') GROUP BY lower(guest_email) ORDER BY max(created_at) DESC,lower(guest_email) LIMIT 50 OFFSET $2`,
      [search, (page - 1) * 50],
    )
  ).rows;
}
export async function reservationWorkbook(params: URLSearchParams) {
  for (const key of ["from", "to"])
    if (params.get(key)) dateSchema.parse(params.get(key));
  if (
    params.get("from") &&
    params.get("to") &&
    params.get("from")! > params.get("to")!
  )
    throw new BookingError(400, "End date must follow start date.");
  const filters = new URLSearchParams(params);
  filters.delete("page");
  const rows = await listBookings(filters);
  if (rows.length > 10000)
    throw new BookingError(
      400,
      "Narrow the export to 10,000 reservations or fewer.",
    );
  if (!rows.length) return exportWorkbook([]);
  const ids = rows.map((b) => b.id);
  const [items, reviews] = await Promise.all([
    db().query(
      "SELECT booking_id,name,category,overnight,check_in_date,check_out_date,slot,adult_count,child_count,special_requests FROM booking_items WHERE booking_id=ANY($1::uuid[]) ORDER BY check_in_date,slot",
      [ids],
    ),
    db().query(
      "SELECT DISTINCT ON (l.booking_id) l.booking_id,u.full_name approved_by,l.timestamp approval_date FROM booking_activity_logs l LEFT JOIN users u ON u.id=l.performed_by WHERE l.booking_id=ANY($1::uuid[]) AND l.new_status='CONFIRMED' ORDER BY l.booking_id,l.timestamp DESC,l.id DESC",
      [ids],
    ),
  ]);
  const byId = new Map<string, typeof items.rows>();
  for (const i of items.rows) {
    const group = byId.get(i.booking_id) || [];
    group.push(i);
    byId.set(i.booking_id, group);
  }
  const approval = new Map(reviews.rows.map((r) => [r.booking_id, r]));
  return exportWorkbook(
    rows.map((b) => ({
      ...b,
      ...approval.get(b.id),
      itinerary: byId.get(b.id) || [],
    })),
  );
}
