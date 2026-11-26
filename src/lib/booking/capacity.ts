import type { PoolClient } from "pg";
import type { Product } from "./db";
import { BookingError } from "./validation";
export type Selection = {
  checkIn: string;
  checkOut?: string;
  units: number;
  adults: number;
  children: number;
  slot: string;
  unitIds?: string[];
};
export function endDate(p: Product, s: Selection) {
  if (p.overnight) {
    if (!s.checkOut || s.checkOut <= s.checkIn)
      throw new BookingError(400, "Check-out must be after check-in.");
    if (Date.parse(s.checkOut) - Date.parse(s.checkIn) > 90 * 86400000)
      throw new BookingError(
        400,
        "For stays over 90 nights, contact the resort.",
      );
    return s.checkOut;
  }
  return new Date(Date.parse(s.checkIn) + 86400000).toISOString().slice(0, 10);
}
export function slotsOverlap(
  a: string,
  ad: number | null | undefined,
  b: string,
  bd: number | null | undefined,
) {
  if (!a || !b) return true;
  if (/^\d{2}:\d{2}$/.test(a) && /^\d{2}:\d{2}$/.test(b)) {
    const minute = (s: string) =>
      Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
    return (
      minute(a) < minute(b) + (bd || 1) && minute(b) < minute(a) + (ad || 1)
    );
  }
  return a === b;
}
export type ExtraOccupancy = {
  product: Product;
  selection: Selection;
  end: string;
};
export function peakGuests(
  rows: { slot: string; duration_minutes: number | null; guests: number }[],
  slot: string,
  duration: number | null | undefined,
) {
  const bounds = (s: string, d: number | null | undefined) => {
    if (!/^\d{2}:\d{2}$/.test(s)) return [0, 1440];
    const start = Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
    return [start, start + (d || 1)];
  };
  const [start, end] = bounds(slot, duration),
    events: { at: number; delta: number }[] = [];
  for (const row of rows) {
    const [s, e] = bounds(row.slot, row.duration_minutes),
      left = Math.max(start, s),
      right = Math.min(end, e);
    if (left < right) {
      events.push(
        { at: left, delta: row.guests },
        { at: right, delta: -row.guests },
      );
    }
  }
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let current = 0,
    peak = 0;
  for (const event of events) {
    current += event.delta;
    peak = Math.max(peak, current);
  }
  return peak;
}
export async function expireInventory(c: PoolClient) {
  const expired = (
    await c.query(
      "UPDATE bookings SET workflow_status='EXPIRED',status='CANCELLED',hold_expires_at=NULL,version=version+1,updated_at=now() WHERE is_cart AND hold_expires_at<=now() AND workflow_status IN ('PENDING_PAYMENT','PENDING_VERIFICATION','PENDING_APPROVAL') RETURNING id,version",
    )
  ).rows;
  for (const b of expired) {
    await c.query("UPDATE booking_units SET active=false WHERE booking_id=$1", [
      b.id,
    ]);
    await c.query(
      "UPDATE booking_items SET allocated=false WHERE booking_id=$1",
      [b.id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,new_status) VALUES($1,'PAYMENT_HOLD_EXPIRED','EXPIRED')",
      [b.id],
    );
    await c.query(
      "INSERT INTO integration_jobs(booking_id,kind,event_version,event_status) SELECT $1,k,$2,'EXPIRED' FROM unnest(ARRAY['EXCEL','GUEST_EMAIL','STAFF_EMAIL']) k ON CONFLICT DO NOTHING",
      [b.id, b.version],
    );
  }
  return expired.length;
}
export async function inventoryLock(c: PoolClient) {
  await c.query("SELECT pg_advisory_xact_lock(19766124)");
  await expireInventory(c);
}
export async function capacity(
  c: PoolClient,
  p: Product,
  s: Selection,
  exclude: string | null = null,
  extras: ExtraOccupancy[] = [],
) {
  const end = endDate(p, s),
    guests = s.adults + s.children;
  if (p.slots.length ? !p.slots.includes(s.slot) : !!s.slot)
    throw new BookingError(400, "Select a configured time slot.");
  const physical = p.overnight || p.unit_inventory;
  if (s.unitIds && !physical)
    throw new BookingError(
      400,
      "This service does not use physical unit selection.",
    );
  if (!physical && s.units !== 1)
    throw new BookingError(
      400,
      "Day reservations use one group; capacity is counted by guests.",
    );
  if (
    guests < p.min_guests * (physical ? s.units : 1) ||
    (p.max_guests && guests > p.max_guests * (physical ? s.units : 1))
  )
    throw new BookingError(
      400,
      "Guest count is outside the configured capacity.",
    );
  const base = {
    end,
    configured: true,
    available: false,
    remaining: 0,
    unitIds: [] as string[],
  };
  if (!p.active || !p.max_guests || (!physical && !p.day_capacity))
    return { ...base, configured: false };
  const blocks = (
    await c.query(
      "SELECT bd.*,p.duration_minutes FROM blocked_dates bd JOIN accommodation_types p ON p.id=bd.product_id WHERE (p.id=$1 OR ($4<>'' AND p.resource_group=$4)) AND bd.start_date<$3 AND bd.end_date>$2",
      [p.id, s.checkIn, end, p.resource_group || ""],
    )
  ).rows;
  if (
    blocks.some(
      (b) =>
        !b.unit_id &&
        slotsOverlap(s.slot, p.duration_minutes, b.slot, b.duration_minutes),
    )
  )
    return base;
  if (physical) {
    const units = (
      await c.query<{ id: string }>(
        `SELECT u.id FROM accommodation_units u WHERE u.accommodation_type_id=$1 AND u.active AND NOT EXISTS(
      SELECT 1 FROM booking_units bu JOIN bookings b ON b.id=bu.booking_id WHERE bu.unit_id=u.id AND bu.active AND bu.check_in_date<$3 AND bu.check_out_date>$2 AND ($4::uuid IS NULL OR b.id<>$4) AND (b.hold_expires_at IS NULL OR b.hold_expires_at>now()) AND
      tsrange(bu.check_in_date+COALESCE(bu.slot_start,'00:00'::time),CASE WHEN bu.slot_start IS NULL THEN bu.check_out_date::timestamp ELSE bu.check_in_date+bu.slot_start+bu.duration_minutes*interval '1 minute' END,'[)') &&
      tsrange($2::date+COALESCE($5::time,'00:00'::time),CASE WHEN $5::time IS NULL THEN $3::date::timestamp ELSE $2::date+$5::time+$6::int*interval '1 minute' END,'[)')) ORDER BY u.unit_identifier`,
        [
          p.id,
          s.checkIn,
          end,
          exclude,
          !p.overnight && s.slot ? s.slot : null,
          p.duration_minutes,
        ],
      )
    ).rows.filter(
      (u) =>
        !blocks.some(
          (b) =>
            b.unit_id === u.id &&
            slotsOverlap(
              s.slot,
              p.duration_minutes,
              b.slot,
              b.duration_minutes,
            ),
        ),
    );
    if (
      s.unitIds &&
      (s.unitIds.length !== s.units ||
        new Set(s.unitIds).size !== s.units ||
        s.unitIds.some((id) => !units.some((u) => u.id === id)))
    )
      throw new BookingError(
        409,
        "The selected physical units are unavailable or do not match the unit count.",
      );
    return {
      ...base,
      remaining: units.length,
      available: units.length >= s.units,
      unitIds: s.unitIds || units.slice(0, s.units).map((u) => u.id),
    };
  }
  const occupied = (
    await c.query(
      `SELECT i.adult_count+i.child_count guests,i.slot,i.exclusive,p.duration_minutes,i.units_count FROM booking_items i JOIN bookings b ON b.id=i.booking_id JOIN accommodation_types p ON p.id=i.product_id WHERE i.allocated AND (p.id=$1 OR ($4<>'' AND p.resource_group=$4)) AND i.check_in_date<$3 AND i.check_out_date>$2 AND ($5::uuid IS NULL OR b.id<>$5) AND (b.hold_expires_at IS NULL OR b.hold_expires_at>now())
    UNION ALL SELECT b.adult_count+b.child_count,b.slot,p.exclusive,p.duration_minutes,b.units_count FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE NOT b.is_cart AND b.status IN ('CONFIRMED','CHECKED_IN') AND (p.id=$1 OR ($4<>'' AND p.resource_group=$4)) AND b.check_in_date<$3 AND b.check_out_date>$2 AND ($5::uuid IS NULL OR b.id<>$5)`,
      [p.id, s.checkIn, end, p.resource_group || "", exclude],
    )
  ).rows.filter((b) =>
    slotsOverlap(s.slot, p.duration_minutes, b.slot, b.duration_minutes),
  );
  occupied.push(
    ...extras
      .filter(
        (i) =>
          !i.product.overnight &&
          (i.product.id === p.id ||
            (!!p.resource_group &&
              i.product.resource_group === p.resource_group)) &&
          i.selection.checkIn < end &&
          i.end > s.checkIn &&
          slotsOverlap(
            s.slot,
            p.duration_minutes,
            i.selection.slot,
            i.product.duration_minutes,
          ),
      )
      .map((i) => ({
        guests: i.selection.adults + i.selection.children,
        slot: i.selection.slot,
        exclusive: i.product.exclusive,
        duration_minutes: i.product.duration_minutes,
        units_count: i.selection.units,
      })),
  );
  if (occupied.some((b) => b.exclusive) || (p.exclusive && occupied.length))
    return base;
  const peak = peakGuests(occupied, s.slot, p.duration_minutes);
  const remaining = Math.max(0, p.day_capacity! - peak);
  const equipmentRemaining = p.equipment_count
    ? p.equipment_count - peak
    : Infinity;
  return {
    ...base,
    remaining: Math.min(remaining, equipmentRemaining),
    available: remaining >= guests && equipmentRemaining >= guests,
  };
}
