import { transaction } from "./db";
import { inventoryLock } from "./capacity";
import { deliverAccessLinks } from "./guest-access";
import { enqueue } from "./service";
export async function commerceMaintenance() {
  await transaction(async (c) => {
    await inventoryLock(c);
    const config = (
      await c.query("SELECT reminder_days FROM reservation_settings WHERE id=1")
    ).rows[0];
    if (config.reminder_days) {
      const rows = (
        await c.query(
          "UPDATE bookings SET reminder_sent_at=now(),version=version+1 WHERE status='CONFIRMED' AND reminder_sent_at IS NULL AND check_in_date=(now() AT TIME ZONE 'Asia/Manila')::date+$1::int RETURNING id,version",
          [config.reminder_days],
        )
      ).rows;
      for (const b of rows)
        await enqueue(c, b.id, b.version, "UPCOMING_RESERVATION_REMINDER");
    }
    await c.query("DELETE FROM guest_booking_sessions WHERE expires_at<now()");
    await c.query(
      "DELETE FROM guest_access_requests WHERE expires_at<now()-interval '1 day'",
    );
  });
  await deliverAccessLinks();
}
