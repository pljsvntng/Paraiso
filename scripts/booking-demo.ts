import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, chmod, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import {
  assertDemoTarget,
  demoConfiguration,
  demoTargetPath,
  type DemoTarget,
} from "../src/lib/booking/demo-mode";

export const demoEnvironmentPath = () => resolve(".env.demo.local");
export function loadDemoEnvironment() {
  Object.assign(
    process.env,
    parseEnv(readFileSync(demoEnvironmentPath(), "utf8")),
  );
  for (const key of [
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "STAFF_NOTIFICATION_EMAILS",
    "MS_CLIENT_ID",
    "MS_CLIENT_SECRET",
    "PAYMONGO_SECRET_KEY",
  ])
    delete process.env[key];
  return demoConfiguration();
}
function cluster(target: DemoTarget) {
  return new EmbeddedPostgres({
    databaseDir: target.databaseDir,
    port: target.port,
    user: "demo_bootstrap",
    password: target.bootstrapPassword,
    persistent: true,
    authMethod: "scram-sha-256",
    autoRehydrateSymlinks: true,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
}
export async function withDemoDatabase<T>(
  fn: () => Promise<T>,
  mode: "server" | "exclusive" = "exclusive",
) {
  const target = demoConfiguration(),
    postgres = cluster(target);
  const ownerPath = resolve(".local/client-demo/owner.json");
  if (existsSync(ownerPath)) {
    const owner = JSON.parse(readFileSync(ownerPath, "utf8")) as {
      pid: number;
      mode: string;
    };
    let alive = true;
    try {
      process.kill(owner.pid, 0);
    } catch {
      alive = false;
    }
    if (!alive) await unlink(ownerPath);
    else if (owner.mode !== "server")
      throw new Error(
        "Another demo setup/check/build command is running. Let it finish, then retry.",
      );
    else if (mode === "server")
      throw new Error(
        "The demo website is already running. Use http://127.0.0.1:3001.",
      );
  }
  let owned = false;
  const probe = new Pool({
    connectionString: target.databaseUrl,
    connectionTimeoutMillis: 1000,
    max: 1,
  });
  probe.on("error", () => {});
  try {
    const connected = await probe
      .query("SELECT 1")
      .then(() => true)
      .catch(() => false);
    if (!connected) {
      await writeFile(ownerPath, JSON.stringify({ pid: process.pid, mode }), {
        flag: "wx",
        mode: 0o600,
      });
      await postgres.start();
      owned = true;
    }
    await assertDemoTarget(probe);
    await probe.end();
    return await fn();
  } finally {
    if (!probe.ended) await probe.end();
    if (owned) {
      await postgres.stop();
      await unlink(ownerPath);
    }
  }
}
async function provision() {
  if (existsSync(demoTargetPath()) || existsSync(demoEnvironmentPath()))
    throw new Error(
      "A demo target already exists. Use demo:setup or demo:reset; provisioning never overwrites it.",
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
    throw new Error(
      "Provision the demonstration locally, not on a hosted deployment.",
    );
  const socket = createServer();
  await new Promise<void>((r) => socket.listen(0, "127.0.0.1", r));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((r) => socket.close(() => r()));
  const password = randomBytes(32).toString("hex"),
    adminPassword = randomBytes(18).toString("base64url");
  const target: DemoTarget = {
    version: 1,
    id: randomUUID(),
    token: randomBytes(32).toString("hex"),
    port,
    databaseDir: resolve(".local/client-demo/postgres"),
    bootstrapPassword: randomBytes(32).toString("hex"),
    databaseUrl: `postgresql://paraiso_demo_app:${password}@127.0.0.1:${port}/paraiso_client_demo`,
  };
  await mkdir(resolve(".local/client-demo"), { recursive: true });
  await writeFile(demoTargetPath(), JSON.stringify(target, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  const postgres = cluster(target);
  try {
    await postgres.initialise();
    await postgres.start();
    const bootstrap = new Pool({
      connectionString: `postgresql://demo_bootstrap:${target.bootstrapPassword}@127.0.0.1:${port}/postgres`,
    });
    try {
      // Password is generated hex; SQL identifiers are constants, never user input.
      await bootstrap.query(
        `CREATE ROLE paraiso_demo_app LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`,
      );
      await bootstrap.query(
        "CREATE DATABASE paraiso_client_demo OWNER paraiso_demo_app",
      );
      await bootstrap.query("REVOKE CONNECT ON DATABASE postgres FROM PUBLIC");
      await bootstrap.query("REVOKE CONNECT ON DATABASE template1 FROM PUBLIC");
    } finally {
      await bootstrap.end();
    }
    const app = new Pool({ connectionString: target.databaseUrl });
    try {
      await app.query(
        "CREATE SCHEMA paraiso_demo; CREATE TABLE paraiso_demo.identity(singleton integer PRIMARY KEY CHECK(singleton=1),id uuid NOT NULL,token text NOT NULL); CREATE TABLE paraiso_demo.records(kind text NOT NULL,key text NOT NULL,id text NOT NULL,PRIMARY KEY(kind,key),UNIQUE(kind,id));",
      );
      await app.query("INSERT INTO paraiso_demo.identity VALUES(1,$1,$2)", [
        target.id,
        target.token,
      ]);
    } finally {
      await app.end();
    }
    const values = {
      PARAISO_DEMO_MODE: "true",
      PARAISO_DEPLOYMENT_ENV: "local-demo",
      PARAISO_DEMO_TOKEN: target.token,
      DATABASE_URL: target.databaseUrl,
      APP_URL: "http://127.0.0.1:3001",
      INTEGRATION_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      JOBS_SECRET: randomBytes(32).toString("hex"),
      DEMO_ADMIN_EMAIL: "demo-admin@example.test",
      DEMO_ADMIN_PASSWORD: adminPassword,
      DEMO_STAFF_EMAIL: "demo-staff@example.test",
      DEMO_STAFF_PASSWORD: randomBytes(18).toString("base64url"),
    };
    await writeFile(
      demoEnvironmentPath(),
      Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") + "\n",
      { flag: "wx", mode: 0o600 },
    );
    await writeFile(
      resolve(".local/client-demo/LOGIN.txt"),
      `LOCAL PRESENTATION ONLY. Keep private.\nWebsite: http://127.0.0.1:3001\nAdmin: ${values.DEMO_ADMIN_EMAIL}\nPassword: ${values.DEMO_ADMIN_PASSWORD}\nStaff (may approve/export): ${values.DEMO_STAFF_EMAIL}\nPassword: ${values.DEMO_STAFF_PASSWORD}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await chmod(demoTargetPath(), 0o600);
    console.log(
      "Isolated PostgreSQL cluster provisioned. Private login details: .local/client-demo/LOGIN.txt. Run npm run demo:setup, then npm run demo:dev.",
    );
  } finally {
    await postgres.stop();
  }
}
async function web(command: "dev" | "build" | "start") {
  const args = [
    "node_modules/next/dist/bin/next",
    command,
    ...(command === "build"
      ? []
      : ["--hostname", "127.0.0.1", "--port", "3001"]),
  ];
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: command === "dev" ? "development" : "production",
    },
  });
  const stop = () => child.kill();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await new Promise<void>((r, j) => {
      child.once("error", j);
      child.once("exit", (code) =>
        code === 0 || code === null
          ? r()
          : j(new Error(`Demo ${command} exited with code ${code}.`)),
      );
    });
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
async function main() {
  try {
    const command = process.argv[2] || "setup";
    if (command === "provision") return await provision();
    loadDemoEnvironment();
    await withDemoDatabase(
      async () => {
        if (["dev", "build", "start"].includes(command))
          return web(command as "dev" | "build" | "start");
        const { db } = await import("../src/lib/booking/db");
        try {
          if (command === "check") {
            console.log(
              "Verified isolated local PostgreSQL cluster, restricted role and database identity. Website: http://127.0.0.1:3001. Delivery disabled.",
            );
          } else if (command === "setup" || command === "reset") {
            const { setupDemo, resetDemo } = await import("./demo/seed");
            if (command === "reset") await resetDemo();
            else await setupDemo();
            const count = (
              await db().query(
                "SELECT (SELECT count(*)::int FROM accommodation_types) services,(SELECT count(*)::int FROM accommodation_units) units,(SELECT count(*)::int FROM bookings) reservations",
              )
            ).rows[0];
            console.log(
              JSON.stringify(
                {
                  demoOnly: true,
                  ...count,
                  website: "http://127.0.0.1:3001",
                  deliveryDisabled: true,
                },
                null,
                2,
              ),
            );
          } else
            throw new Error(
              "Use provision, setup, reset, check, dev, build or start.",
            );
        } finally {
          await db().end();
        }
      },
      ["dev", "start"].includes(command) ? "server" : "exclusive",
    );
  } catch (e) {
    console.error(
      e instanceof Error && !("code" in e)
        ? e.message
        : "Demo operation failed. The original database was not accessed. Check local demo configuration.",
    );
    process.exitCode = 1;
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/booking-demo.ts"))
  void main();
