import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  demoConfiguration,
  assertDemoTarget,
  type DemoTarget,
} from "../src/lib/booking/demo-mode";
test("demo guard requires explicit local mode, approved connection and live database identity", async () => {
  const cwd = process.cwd(),
    before = { ...process.env },
    home = resolve(".local/demo-guard-tests", randomUUID());
  await mkdir(resolve(home, ".local/client-demo"), { recursive: true });
  try {
    process.chdir(home);
    for (const k of [
      "VERCEL",
      "VERCEL_ENV",
      "RENDER_SERVICE_ID",
      "RAILWAY_ENVIRONMENT",
      "FLY_APP_NAME",
    ])
      delete process.env[k];
    const target: DemoTarget = {
      version: 1,
      id: randomUUID(),
      token: randomUUID(),
      databaseUrl:
        "postgresql://paraiso_demo_app:test@127.0.0.1:55435/paraiso_client_demo",
      databaseDir: resolve(".local/client-demo/postgres"),
      port: 55435,
      bootstrapPassword: "unused-test-only",
    };
    await writeFile(
      resolve(".local/client-demo/target.json"),
      JSON.stringify(target),
    );
    Object.assign(process.env, {
      PARAISO_DEMO_MODE: "true",
      PARAISO_DEPLOYMENT_ENV: "local-demo",
      PARAISO_DEMO_TOKEN: target.token,
      DATABASE_URL: target.databaseUrl,
      APP_URL: "http://127.0.0.1:3001",
    });
    assert.equal(demoConfiguration().id, target.id);
    for (const [key, value] of [
      ["PARAISO_DEMO_MODE", "false"],
      ["PARAISO_DEPLOYMENT_ENV", "production"],
      ["PARAISO_DEMO_TOKEN", "wrong"],
      ["APP_URL", "https://production.example"],
      ["DATABASE_URL", target.databaseUrl.replace("55435", "5432")],
      ["RENDER_SERVICE_ID", "production"],
    ]) {
      const previous = process.env[key];
      process.env[key] = value;
      assert.throws(() => demoConfiguration());
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    const connection = (
      name = "paraiso_client_demo",
      role = "paraiso_demo_app",
      superuser = false,
      token = target.token,
    ) => ({
      query: async (sql: string) => ({
        rows: sql.includes("current_database")
          ? [{ name, role, superuser }]
          : [{ id: target.id, token }],
      }),
    });
    await assertDemoTarget(connection() as never);
    for (const p of [
      connection("paraiso_dev"),
      connection(undefined, "postgres"),
      connection(undefined, undefined, true),
      connection(undefined, undefined, false, "wrong-marker"),
    ])
      await assert.rejects(() => assertDemoTarget(p as never));
  } finally {
    process.chdir(cwd);
    for (const key of Object.keys(process.env))
      if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
