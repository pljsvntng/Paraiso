import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";

export type DemoTarget = {
  version: 1;
  id: string;
  token: string;
  databaseUrl: string;
  databaseDir: string;
  port: number;
  bootstrapPassword: string;
};
export const demoTargetPath = () => resolve(".local/client-demo/target.json");
export const demoRequested = () => process.env.PARAISO_DEMO_MODE === "true";
export function demoConfiguration(): DemoTarget {
  if (!demoRequested() || process.env.PARAISO_DEPLOYMENT_ENV !== "local-demo")
    throw new Error(
      "Demo commands require explicit demo mode and the local-demo environment.",
    );
  if (
    [
      "VERCEL",
      "VERCEL_ENV",
      "RENDER_SERVICE_ID",
      "RAILWAY_ENVIRONMENT",
      "FLY_APP_NAME",
    ].some((k) => process.env[k])
  )
    throw new Error("Local demo mode is prohibited on hosted deployments.");
  const target = JSON.parse(
    readFileSync(demoTargetPath(), "utf8"),
  ) as DemoTarget;
  const url = new URL(process.env.DATABASE_URL || ""),
    origin = new URL(process.env.APP_URL || "");
  if (
    target.version !== 1 ||
    !target.id ||
    !target.token ||
    process.env.PARAISO_DEMO_TOKEN !== target.token ||
    process.env.DATABASE_URL !== target.databaseUrl ||
    url.hostname !== "127.0.0.1" ||
    Number(url.port) !== target.port ||
    url.pathname !== "/paraiso_client_demo" ||
    url.username !== "paraiso_demo_app" ||
    origin.hostname !== "127.0.0.1" ||
    origin.protocol !== "http:" ||
    origin.port !== "3001" ||
    resolve(target.databaseDir) !== resolve(".local/client-demo/postgres")
  )
    throw new Error(
      "Demo target does not match the approved isolated local cluster. Nothing was changed.",
    );
  return target;
}
export async function assertDemoTarget(pool: Pick<Pool | PoolClient, "query">) {
  const target = demoConfiguration();
  const identity = (
    await pool.query(
      "SELECT current_database() name,current_user role,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) superuser",
    )
  ).rows[0];
  if (
    identity.name !== "paraiso_client_demo" ||
    identity.role !== "paraiso_demo_app" ||
    identity.superuser
  )
    throw new Error(
      "The demo connection is not the approved restricted database role.",
    );
  const marker = (
    await pool.query(
      "SELECT id,token FROM paraiso_demo.identity WHERE singleton=1",
    )
  ).rows[0];
  if (marker?.id !== target.id || marker?.token !== target.token)
    throw new Error(
      "Demo database identity verification failed. Nothing was changed.",
    );
}
let verification: Promise<void> | undefined;
export async function ensureDemoDatabase() {
  if (!demoRequested()) return;
  demoConfiguration();
  await (verification ??= (async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    try {
      await assertDemoTarget(pool);
    } finally {
      await pool.end();
    }
  })());
}
export async function markDemoBooking(c: PoolClient, id: string) {
  if (demoRequested())
    await c.query(
      "INSERT INTO paraiso_demo.records(kind,key,id) VALUES('booking',$1,$1) ON CONFLICT DO NOTHING",
      [id],
    );
}
