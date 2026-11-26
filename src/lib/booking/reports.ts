import { reservationStatus } from "./request-status";
import { db, transaction } from "./db";
import { dateSchema, BookingError } from "./validation";
export async function calendarEntries(params: URLSearchParams) {
  const start = dateSchema.parse(params.get("from")),
    end = dateSchema.parse(params.get("to"));
  if (end < start || Date.parse(end) - Date.parse(start) > 42 * 86400000)
    throw new BookingError(400, "Choose a calendar range of up to 42 days.");
  const category = (params.get("category") || "").slice(0, 40);
  const items = (
    await db().query(
      "SELECT i.id,i.booking_id,i.product_id,i.name,i.category,i.overnight,i.check_in_date,i.check_out_date,i.slot,i.adult_count,i.child_count,i.units_count,i.exclusive,i.resource_group,i.allocated,b.reference_number,b.public_tracking_reference,b.guest_name,b.status,b.workflow_status,b.hold_expires_at,b.id booking_id FROM booking_items i JOIN bookings b ON b.id=i.booking_id WHERE i.check_in_date<=$2 AND i.check_out_date>$1 AND ($3='' OR i.category=$3) UNION ALL SELECT NULL::uuid,b.id,b.product_id,b.product_name,b.booking_category,p.overnight,b.check_in_date,b.check_out_date,b.slot,b.adult_count,b.child_count,b.units_count,false,'',false,b.reference_number,b.public_tracking_reference,b.guest_name,b.status,b.workflow_status,b.hold_expires_at,b.id FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE NOT b.is_cart AND b.check_in_date<=$2 AND b.check_out_date>$1 AND ($3='' OR b.booking_category=$3) ORDER BY check_in_date,slot",
      [start, end, category],
    )
  ).rows;
  const blocks = (
    await db().query(
      "SELECT bd.*,p.name,p.category,u.unit_identifier FROM blocked_dates bd JOIN accommodation_types p ON p.id=bd.product_id LEFT JOIN accommodation_units u ON u.id=bd.unit_id WHERE bd.start_date<=$2 AND bd.end_date>$1 AND ($3='' OR p.category=$3)",
      [start, end, category],
    )
  ).rows;
  return {
    items: items.map((b) => ({ ...b, workflow_status: reservationStatus(b) })),
    blocks,
  };
}
export async function retentionPreview(days: number) {
  return transaction(async (c) => {
    const rows = await c.query(
      "SELECT count(DISTINCT b.id)::int bookings,COALESCE(sum(octet_length(p.proof_image)),0)::bigint proof_bytes FROM bookings b LEFT JOIN payment_claims p ON p.booking_id=b.id WHERE b.updated_at<now()-$1*interval '1 day' AND b.status IN ('CANCELLED','DECLINED','CHECKED_OUT')",
      [days],
    );
    return rows.rows[0];
  });
}
