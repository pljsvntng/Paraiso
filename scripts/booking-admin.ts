import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { db, transaction } from "../src/lib/booking/db";
import { hash, hashPassword } from "../src/lib/booking/security";
import { accommodations } from "../src/data/accommodations";
import { adventures } from "../src/data/adventures";
import { runJobs } from "../src/lib/booking/jobs";
import { privatePrompt } from "./private-prompt";
import { backfillTrackingReferences } from "../src/lib/booking/public-tracking";
loadEnvConfig(process.cwd());
export async function resetAdministratorPassword(
  rawEmail: string,
  password: string,
) {
  const email = z
    .string()
    .trim()
    .email()
    .max(254)
    .parse(rawEmail)
    .toLowerCase();
  const passwordHash = await hashPassword(password);
  await transaction(async (c) => {
    const accounts = await c.query(
      "SELECT id FROM users WHERE lower(email)=$1 AND role='ADMIN' AND active FOR UPDATE",
      [email],
    );
    if (accounts.rowCount !== 1)
      throw new Error(
        "Exactly one active administrator must match that email. No password was changed.",
      );
    const id = accounts.rows[0].id;
    await c.query("UPDATE users SET password_hash=$2 WHERE id=$1", [
      id,
      passwordHash,
    ]);
    await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    await c.query("DELETE FROM rate_limits WHERE key=$1", [
      hash(`login:${email}`),
    ]);
    await c.query(
      "INSERT INTO booking_activity_logs(action,details) VALUES('ADMIN_PASSWORD_RESET',$1)",
      [JSON.stringify({ method: "LOCAL_OWNER_RECOVERY", targetUserId: id })],
    );
  });
}
export async function migrate() {
  await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(19766123)");
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir(resolve("db/migrations")))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(resolve("db/migrations", name), "utf8"),
        checksum = hash(sql);
      const existing = (
        await c.query("SELECT checksum FROM schema_migrations WHERE name=$1", [
          name,
        ])
      ).rows[0];
      if (existing && existing.checksum !== checksum)
        throw new Error(
          "An applied migration changed. Restore it and create a new migration.",
        );
      if (!existing) {
        await c.query(sql);
        await c.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
          [name, checksum],
        );
      }
    }
    await backfillTrackingReferences(c);
  });
}
export async function seed() {
  await transaction(async (c) => {
    for (const stay of accommodations)
      await c.query(
        "INSERT INTO accommodation_types(slug,name,description,category,overnight,image) VALUES($1,$2,$3,'ACCOMMODATION',true,$4) ON CONFLICT(slug) DO NOTHING",
        [stay.slug, stay.name, stay.description, stay.photos[0]?.src || null],
      );
    for (const activity of adventures)
      await c.query(
        "INSERT INTO accommodation_types(slug,name,description,category,overnight,image) VALUES($1,$2,$3,'ACTIVITY',false,$4) ON CONFLICT(slug) DO NOTHING",
        [
          activity.slug,
          activity.name,
          activity.description,
          activity.image || null,
        ],
      );
  });
}
async function main() {
  try {
    switch (process.argv[2]) {
      case "migrate":
        await migrate();
        console.log("Database migrations applied.");
        break;
      case "seed":
        await seed();
        console.log(
          "Existing five stays and eight adventure topics imported, inactive. No prices, capacity, units or bookings were invented.",
        );
        break;
      case "check": {
        await db().query("SELECT 1");
        console.log(
          "PostgreSQL connection succeeded. Credentials were not printed.",
        );
        break;
      }
      case "readiness": {
        const result = await (
          await import("../src/lib/booking/readiness")
        ).readiness();
        console.log(JSON.stringify(result, null, 2));
        if (result.checks.some((c) => !c.ok)) process.exitCode = 1;
        break;
      }
      case "admin": {
        const email = z
            .string()
            .email()
            .parse(process.env.ADMIN_EMAIL)
            .toLowerCase(),
          name = z.string().min(2).max(120).parse(process.env.ADMIN_NAME),
          password = await hashPassword(process.env.ADMIN_PASSWORD || "");
        await transaction(async (c) => {
          await c.query("SELECT pg_advisory_xact_lock(19766122)");
          if (
            (
              await c.query(
                "SELECT 1 FROM users WHERE role='ADMIN' AND active LIMIT 1",
              )
            ).rowCount
          )
            throw new Error(
              "An administrator already exists. Use the dashboard to manage team accounts.",
            );
          await c.query(
            "INSERT INTO users(full_name,email,password_hash,role,can_approve,can_export) VALUES($1,$2,$3,'ADMIN',true,true)",
            [name, email, password],
          );
        });
        console.log(
          "First administrator created. Clear ADMIN_PASSWORD from your environment.",
        );
        break;
      }
      case "admin-reset": {
        const email = z.string().trim().email().max(254).parse(process.argv[3]);
        console.log(
          `Reset the website administrator password for ${email}. PostgreSQL credentials are unchanged.`,
        );
        const password = await privatePrompt(
          "New password (12–128 characters; input hidden): ",
        );
        const confirmation = await privatePrompt(
          "Enter the new password again (input hidden): ",
        );
        if (password !== confirmation)
          throw new Error("Passwords do not match. No password was changed.");
        await resetAdministratorPassword(email, password);
        console.log(
          "Administrator password reset. Existing sessions were signed out. Sign in using your new password.",
        );
        break;
      }
      case "jobs":
        console.log(JSON.stringify(await runJobs(20)));
        break;
      case "sandbox-checkout":
        throw new Error("Online payment processing has been retired.");
      case "privacy-preview": {
        const days = z.coerce
          .number()
          .int()
          .min(1)
          .max(36500)
          .parse(process.argv[3]);
        console.log(
          JSON.stringify(
            await (
              await import("../src/lib/booking/reports")
            ).retentionPreview(days),
          ),
        );
        console.log(
          "Read-only preview. No guest information, financial records or images were deleted.",
        );
        break;
      }
      default:
        throw new Error(
          "Use migrate, seed, check, readiness, admin, admin-reset, jobs, sandbox-checkout or privacy-preview.",
        );
    }
  } catch (e) {
    console.error(
      e instanceof Error && !("code" in e)
        ? e.message
        : "Database operation failed. Check server configuration and connectivity.",
    );
    process.exitCode = 1;
  } finally {
    if (process.env.DATABASE_URL) await db().end();
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/booking-admin.ts"))
  void main();
