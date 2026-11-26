import { db } from "./db";
import { integrationStatus } from "./jobs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { demoRequested } from "./demo-mode";
export async function readiness() {
  const expected = (await readdir(resolve("db/migrations")))
    .filter((n) => n.endsWith(".sql"))
    .sort();
  const applied = (
    await db().query("SELECT name FROM schema_migrations ORDER BY name")
  ).rows.map((r) => r.name);
  const settings = (
    await db().query("SELECT * FROM reservation_settings WHERE id=1")
  ).rows[0];
  const services = (
    await db().query(`SELECT p.id,p.name,p.category,p.active,
    p.max_guests IS NOT NULL AND (CASE WHEN p.overnight OR p.unit_inventory THEN EXISTS(SELECT 1 FROM accommodation_units u WHERE u.accommodation_type_id=p.id AND u.active) ELSE p.day_capacity IS NOT NULL END) inventory_configured,
    p.price IS NOT NULL price_configured,
    (p.category NOT IN ('ACTIVITY','DINING') OR (jsonb_array_length(p.slots)>0 AND p.duration_minutes IS NOT NULL)) sessions_configured
    FROM accommodation_types p ORDER BY p.category,p.name`)
  ).rows;
  const jobs = (
    await db().query(
      "SELECT count(*) FILTER(WHERE state='FAILED')::int failed,count(*) FILTER(WHERE state='NOT_CONFIGURED')::int unconfigured FROM integration_jobs",
    )
  ).rows[0];
  const worker =
    (
      await db().query(
        "SELECT started_at,finished_at,state,processed,error_code FROM operational_worker_runs ORDER BY id DESC LIMIT 1",
      )
    ).rows[0] || null;
  return {
    checks: [
      {
        name: "PostgreSQL connection",
        ok: true,
        detail: "Connected using server-side DATABASE_URL.",
      },
      {
        name: "Database migrations",
        ok: expected.every((n) => applied.includes(n)),
        detail: `${applied.length}/${expected.length} migration files applied.`,
      },
      {
        name: demoRequested()
          ? "Published DEMO policies"
          : "Published policies",
        ok: !!(
          settings.terms &&
          settings.cancellation_policy &&
          settings.privacy_policy &&
          settings.rescheduling_policy
        ),
        detail: demoRequested()
          ? "Sample policies for presentation only; not approved resort policies."
          : "Owner-approved terms, privacy, cancellation and rescheduling text are required.",
      },
      {
        name: "Reservation request mode",
        ok: true,
        detail:
          "New requests require staff approval. Online payments and deposit holds are not required.",
      },
      {
        name: demoRequested() ? "Demo email suppression" : "SMTP",
        ok: demoRequested() || integrationStatus().email,
        detail: demoRequested()
          ? "External email delivery is intentionally blocked in demo mode."
          : "A real delivery test and sender DNS verification are still required.",
      },
      {
        name: demoRequested()
          ? "Demo notification isolation"
          : "Staff notification recipients",
        ok: demoRequested() || integrationStatus().staffEmail,
        detail: demoRequested()
          ? "No notifications are sent to actual guests or staff."
          : "Set designated staff recipients.",
      },
      {
        name: "Private access encryption",
        ok: /^[a-fA-F0-9]{64}$/.test(
          process.env.INTEGRATION_ENCRYPTION_KEY || "",
        ),
        detail:
          "A stable 32-byte hex encryption key protects access email links.",
      },
      {
        name: "Worker secret",
        ok: (process.env.JOBS_SECRET || "").length >= 32,
        detail: "Use a random private worker secret.",
      },
      {
        name: demoRequested() ? "Demo worker isolation" : "Worker heartbeat",
        ok:
          demoRequested() ||
          (!!worker?.finished_at &&
            worker.state === "DONE" &&
            Date.now() - new Date(worker.finished_at).getTime() < 5 * 60000),
        detail: demoRequested()
          ? "Remote delivery and provider work are disabled; no worker is required for presentation."
          : "Run the private worker every minute; inspect failures and overdue heartbeats.",
      },
      {
        name: "Delivery jobs",
        ok: jobs.failed === 0 && jobs.unconfigured === 0,
        detail: `${jobs.failed} failed; ${jobs.unconfigured} unconfigured.`,
      },
    ],
    services,
    worker,
    productionVerified: false,
  };
}
