import { z } from "zod";
import { db, transaction, type Staff } from "./db";
import { hashPassword } from "./security";
import { BookingError, text } from "./validation";
export async function saveAccount(raw: unknown, actor: Staff) {
  if (actor.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = z
    .object({
      id: z.string().uuid().optional(),
      fullName: text(120).min(2),
      email: z
        .string()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      role: z.enum(["ADMIN", "STAFF"]),
      active: z.boolean(),
      canApprove: z.boolean(),
      canExport: z.boolean(),
      canVerifyPayments: z.boolean().optional(),
      password: z.string().min(12).max(128).optional(),
    })
    .strict()
    .parse(raw);
  if (!v.id && !v.password)
    throw new BookingError(400, "A new account needs a password.");
  const passwordHash = v.password ? await hashPassword(v.password) : null;
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(19766122)");
    const old = v.id
      ? (
          await c.query(
            "SELECT role,active FROM users WHERE id=$1 FOR UPDATE",
            [v.id],
          )
        ).rows[0]
      : null;
    if (v.id && !old) throw new BookingError(404, "Account not found.");
    if (
      old?.role === "ADMIN" &&
      old.active &&
      (!v.active || v.role !== "ADMIN")
    ) {
      if (
        Number(
          (
            await c.query(
              "SELECT count(*) FROM users WHERE role='ADMIN' AND active",
            )
          ).rows[0].count,
        ) <= 1
      )
        throw new BookingError(409, "Keep at least one active administrator.");
    }
    await c.query(
      "INSERT INTO users(id,full_name,email,password_hash,role,active,can_approve,can_export) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET full_name=$2,email=$3,password_hash=COALESCE($4,users.password_hash),role=$5,active=$6,can_approve=$7,can_export=$8",
      [
        v.id,
        v.fullName,
        v.email,
        passwordHash,
        v.role,
        v.active,
        v.canApprove,
        v.canExport,
      ],
    );
    if (v.canVerifyPayments !== undefined)
      await c.query("UPDATE users SET can_verify_payments=$2 WHERE email=$1", [
        v.email,
        v.canVerifyPayments,
      ]);
    if (v.id) await c.query("DELETE FROM sessions WHERE user_id=$1", [v.id]);
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('STAFF_ACCOUNT_UPDATED',$1)",
      [actor.id],
    );
  });
}
export async function accounts() {
  return (
    await db().query(
      "SELECT id,full_name,email,role,active,can_approve,can_export FROM users ORDER BY full_name",
    )
  ).rows;
}
