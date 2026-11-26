import { randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { BookingError } from "./validation";
import { reservationStatus } from "./request-status";
import { trackingStatuses, type TrackingStatus } from "./tracking-status";

// 192 random bits, independent of internal numbers and guest access sessions.
export const newTrackingReference = () =>
  `PDJT-${randomBytes(24).toString("hex").toUpperCase()}`;

export async function ensureTrackingReference(
  c: Pool | PoolClient,
  id: string,
) {
  const row = (
    await c.query(
      "UPDATE bookings SET public_tracking_reference=COALESCE(public_tracking_reference,$2) WHERE id=$1 RETURNING public_tracking_reference",
      [id, newTrackingReference()],
    )
  ).rows[0];
  if (!row) throw new BookingError(404, "Reservation not found.");
  return row.public_tracking_reference as string;
}

// Run inside the migration transaction. Existing references and reservation data
// are left intact; only missing public references are issued and audited.
export async function backfillTrackingReferences(c: PoolClient) {
  const missing = await c.query(
    "SELECT id FROM bookings WHERE public_tracking_reference IS NULL ORDER BY id FOR UPDATE",
  );
  for (const { id } of missing.rows) {
    await ensureTrackingReference(c, id);
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action) VALUES($1,'PUBLIC_TRACKING_REFERENCE_CREATED')",
      [id],
    );
  }
  return missing.rowCount || 0;
}

export async function publicTracking(reference: string) {
  const normalized = reference.trim().toUpperCase();
  // Never search internal references, including when the browser has a guest cookie.
  if (!/^PDJT-[A-F0-9]{48}$/.test(normalized))
    throw new BookingError(404, "No matching reservation was found.");
  const row = (
    await db().query(
      "SELECT public_tracking_reference,status,workflow_status FROM bookings WHERE public_tracking_reference=$1",
      [normalized],
    )
  ).rows[0];
  if (!row) throw new BookingError(404, "No matching reservation was found.");
  const state = reservationStatus(row);
  const status: TrackingStatus = [
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "COMPLETED",
  ].includes(state)
    ? "CONFIRMED"
    : state === "DECLINED" || state === "CANCELLED"
      ? state
      : "PENDING_APPROVAL";
  return {
    reference: row.public_tracking_reference as string,
    status,
    message: trackingStatuses[status].message,
  };
}
