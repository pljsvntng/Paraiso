import { z } from "zod";
import { db, transaction, type Staff } from "./db";
import { BookingError, text } from "./validation";
import { inventoryLock } from "./capacity";
import { imageBytes } from "./payments";
export const commerceSchema = z
  .object({
    holdMinutes: z.number().int().min(5).max(1440).nullable(),
    autoConfirm: z.boolean(),
    terms: text(20000),
    cancellationPolicy: text(20000),
    privacyPolicy: text(20000).optional(),
    reschedulingPolicy: text(20000).optional(),
    balanceReminderDays: z.number().int().min(1).max(30).nullable().optional(),
    gatewayEnabled: z.boolean(),
    gatewayMethods: z
      .array(z.enum(["gcash", "paymaya", "qrph", "card"]))
      .max(4),
    reminderDays: z.number().int().min(1).max(30).nullable(),
  })
  .strict();
export async function saveCommerce(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = commerceSchema.parse(raw);
  await transaction(async (c) => {
    await inventoryLock(c);
    await c.query(
      "UPDATE reservation_settings SET hold_minutes=$1,auto_confirm=$2,terms=$3,cancellation_policy=$4,gateway_enabled=$5,gateway_methods=$6,reminder_days=$7 WHERE id=1",
      [
        v.holdMinutes,
        v.autoConfirm,
        v.terms,
        v.cancellationPolicy,
        v.gatewayEnabled,
        JSON.stringify(v.gatewayMethods),
        v.reminderDays,
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('PAYMENT_AND_POLICY_SETTINGS_UPDATED',$1)",
      [user.id],
    );
    await c.query(
      "UPDATE reservation_settings SET privacy_policy=COALESCE($1,privacy_policy),rescheduling_policy=COALESCE($2,rescheduling_policy),balance_reminder_days=$3,policy_version=policy_version+1,policies_published_at=now() WHERE id=1",
      [
        v.privacyPolicy ?? null,
        v.reschedulingPolicy ?? null,
        v.balanceReminderDays ?? null,
      ],
    );
  });
}
export async function saveReceivingAccount(
  raw: unknown,
  qr: Buffer | null,
  user: Staff,
) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = z
      .object({
        id: z.string().uuid().optional(),
        method: z.enum(["GCASH", "MAYA"]),
        accountName: text(160).min(2),
        accountNumber: text(80).min(5),
        instructions: text(2000),
        active: z.boolean(),
      })
      .strict()
      .parse(raw),
    image = qr ? await imageBytes(qr) : null;
  await transaction(async (c) => {
    if (v.id) {
      const existing = (
        await c.query(
          "SELECT * FROM receiving_accounts WHERE id=$1 FOR UPDATE",
          [v.id],
        )
      ).rows[0];
      if (!existing)
        throw new BookingError(404, "Receiving account not found.");
      if (
        (existing.method !== v.method ||
          existing.account_name !== v.accountName ||
          existing.account_number !== v.accountNumber) &&
        (
          await c.query(
            "SELECT 1 FROM payment_claims WHERE account_id=$1 LIMIT 1",
            [v.id],
          )
        ).rowCount
      )
        throw new BookingError(
          409,
          "This receiving account has payment history. Disable it and add a new account instead of changing its identity.",
        );
    }
    await c.query(
      "INSERT INTO receiving_accounts(id,method,account_name,account_number,instructions,active,qr_image,qr_mime) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET method=$2,account_name=$3,account_number=$4,instructions=$5,active=$6,qr_image=COALESCE($7,receiving_accounts.qr_image),qr_mime=COALESCE($8,receiving_accounts.qr_mime)",
      [
        v.id,
        v.method,
        v.accountName,
        v.accountNumber,
        v.instructions,
        v.active,
        image,
        image ? "image/jpeg" : null,
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('RECEIVING_ACCOUNT_UPDATED',$1)",
      [user.id],
    );
  });
}
export async function commerceSettings() {
  const settings = (
    await db().query("SELECT * FROM reservation_settings WHERE id=1")
  ).rows[0];
  const accounts = (
    await db().query(
      "SELECT id,method,account_name,account_number,instructions,active,(qr_image IS NOT NULL) has_qr FROM receiving_accounts ORDER BY created_at",
    )
  ).rows;
  return {
    ...settings,
    accounts,
    gatewayMode: process.env.PAYMONGO_MODE || "test",
    gatewayConfigured: !!process.env.PAYMONGO_SECRET_KEY,
  };
}
