import { db, type Staff } from "./db";
import { BookingError, dateSchema } from "./validation";
import { integrationStatus } from "./jobs";
import { manilaDate } from "../dates";
import { reservationStatus } from "./request-status";
import { demoRequested } from "./demo-mode";
export async function adminInsights(params: URLSearchParams, user: Staff) {
  const today = manilaDate(),
    to = dateSchema.parse(params.get("to") || today),
    from = dateSchema.parse(
      params.get("from") ||
        new Date(Date.parse(to) - 29 * 86400000).toISOString().slice(0, 10),
    );
  if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000)
    throw new BookingError(400, "Choose an analytics range of up to 366 days.");
  const [
    metrics,
    trend,
    categories,
    recent,
    arrivals,
    visits,
    activity,
    statuses,
    scheduled,
  ] = await Promise.all([
    db().query(
      `SELECT count(*)::int total,count(*) FILTER(WHERE status='PENDING')::int approvals,count(*) FILTER(WHERE status='CONFIRMED')::int approved,count(*) FILTER(WHERE status='DECLINED')::int declined,count(*) FILTER(WHERE status='CANCELLED')::int cancelled,count(*) FILTER(WHERE status='CONFIRMED' AND check_in_date>$1)::int upcoming,
    count(*) FILTER(WHERE status IN ('CONFIRMED','CHECKED_IN') AND (EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.overnight AND i.check_in_date=$1) OR (NOT is_cart AND check_in_date=$1)))::int checkins,
    count(*) FILTER(WHERE status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT') AND (EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.overnight AND i.check_out_date=$1) OR (NOT is_cart AND check_out_date=$1)))::int checkouts,
    count(*) FILTER(WHERE status IN ('CONFIRMED','CHECKED_IN') AND ((is_cart AND EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.check_in_date<=$1 AND i.check_out_date>$1)) OR (NOT is_cart AND check_in_date<=$1 AND check_out_date>$1)))::int visits,
    (SELECT count(*)::int FROM accommodation_units u JOIN accommodation_types p ON p.id=u.accommodation_type_id WHERE u.active AND p.overnight) room_units,
    (SELECT count(DISTINCT bu.unit_id)::int FROM booking_units bu JOIN bookings occupied ON occupied.id=bu.booking_id JOIN accommodation_units u ON u.id=bu.unit_id JOIN accommodation_types p ON p.id=u.accommodation_type_id WHERE bu.active AND u.active AND occupied.status IN ('CONFIRMED','CHECKED_IN') AND p.overnight AND bu.check_in_date<=$1 AND bu.check_out_date>$1) occupied_units
    FROM bookings b`,
      [today],
    ),
    db().query(
      `SELECT d::date::text date,(SELECT count(*)::int FROM bookings b WHERE (b.created_at AT TIME ZONE 'Asia/Manila')::date=d::date) reservations FROM generate_series($1::date,$2::date,interval '1 day') d ORDER BY d`,
      [from, to],
    ),
    db().query(
      `SELECT category,count(DISTINCT booking_id)::int count FROM (SELECT i.category,b.id booking_id FROM booking_items i JOIN bookings b ON b.id=i.booking_id WHERE (b.created_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $1::date AND $2::date UNION ALL SELECT booking_category,id FROM bookings WHERE NOT is_cart AND (created_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $1::date AND $2::date) s GROUP BY category ORDER BY count DESC`,
      [from, to],
    ),
    db().query(
      "SELECT id,reference_number,public_tracking_reference,guest_name,product_name,check_in_date,check_out_date,status,workflow_status,created_at FROM bookings ORDER BY created_at DESC,id LIMIT 8",
    ),
    db().query(
      "SELECT b.id,b.reference_number,b.public_tracking_reference,b.guest_name,b.product_name,b.check_in_date,b.check_out_date,b.status,b.workflow_status FROM bookings b WHERE status='CONFIRMED' AND check_in_date>=$1 ORDER BY check_in_date,created_at LIMIT 8",
      [today],
    ),
    db().query(
      "SELECT b.id,b.reference_number,b.public_tracking_reference,b.guest_name,b.product_name,b.check_in_date,b.check_out_date,b.status,b.workflow_status FROM bookings b WHERE status IN ('CONFIRMED','CHECKED_IN') AND ((is_cart AND EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.check_in_date<=$1 AND i.check_out_date>$1)) OR (NOT is_cart AND check_in_date<=$1 AND check_out_date>$1)) ORDER BY check_in_date LIMIT 12",
      [today],
    ),
    db().query(
      "SELECT l.id,l.booking_id,l.action,l.new_status,l.previous_status,l.timestamp,b.reference_number,b.public_tracking_reference,u.full_name actor FROM booking_activity_logs l LEFT JOIN bookings b ON b.id=l.booking_id LEFT JOIN users u ON u.id=l.performed_by WHERE l.action !~ '(PAYMENT|REFUND|LEDGER|DEPOSIT|BALANCE|RECONCIL|GATEWAY|CHECKOUT|FINANCIAL)' ORDER BY l.timestamp DESC,l.id DESC LIMIT 20",
    ),
    db().query(
      "SELECT status,count(*)::int count FROM bookings WHERE (created_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $1::date AND $2::date GROUP BY status ORDER BY count DESC",
      [from, to],
    ),
    db().query(
      "SELECT b.id,b.reference_number,b.public_tracking_reference,b.guest_name,i.name product_name,i.category,i.check_in_date,i.check_out_date,i.slot,b.status,b.workflow_status FROM booking_items i JOIN bookings b ON b.id=i.booking_id WHERE b.status='CONFIRMED' AND i.check_in_date>=$1 ORDER BY i.check_in_date,i.slot LIMIT 100",
      [today],
    ),
  ]);
  const normalize = (rows: typeof recent.rows) =>
    rows.map((b) => ({ ...b, workflow_status: reservationStatus(b) }));
  return {
    from,
    to,
    today,
    demoMode: demoRequested(),
    emailConfigured:
      integrationStatus().email &&
      !!process.env.APP_URL &&
      !!process.env.INTEGRATION_ENCRYPTION_KEY,
    metrics: metrics.rows[0],
    trend: trend.rows,
    categories: categories.rows,
    statuses: statuses.rows,
    recent: normalize(recent.rows),
    arrivals: normalize(arrivals.rows),
    visits: normalize(visits.rows),
    scheduled: normalize(scheduled.rows),
    activity: activity.rows.filter(
      (a) => user.role === "ADMIN" || a.booking_id,
    ),
  };
}
