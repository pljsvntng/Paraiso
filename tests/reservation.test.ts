import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import ExcelJS from "exceljs";
import {
  db,
  transaction,
  type Product,
  type Staff,
} from "../src/lib/booking/db";
import {
  createBooking,
  updateBooking,
  availability,
  lockProduct,
  bookingDetails,
} from "../src/lib/booking/service";
import { bookingSchema, BookingError } from "../src/lib/booking/validation";
import { saveProduct, saveUnit, saveBlock } from "../src/lib/booking/inventory";
import { saveAccount } from "../src/lib/booking/accounts";
import {
  hashPassword,
  hash,
  verifyPassword,
  rateLimit,
} from "../src/lib/booking/security";
import { exportWorkbook, excelHeaders } from "../src/lib/booking/excel";
import { runJobs, syncExcel } from "../src/lib/booking/jobs";
import { estimate } from "../src/lib/booking/pricing";
import {
  migrate,
  seed,
  resetAdministratorPassword,
} from "../scripts/booking-admin";
import { manilaDate } from "../src/lib/dates";
async function freePort() {
  const server = createServer();
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((r) => server.close(() => r()));
  return port;
}
const plusDay = (date: string, n: number) =>
  new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10);
test(
  "reservation system on isolated real PostgreSQL",
  { timeout: 240000 },
  async (t) => {
    // Never run against DATABASE_URL supplied by the user. Each test run gets a new cluster.
    const password = randomBytes(24).toString("hex"),
      port = await freePort(),
      directory = resolve(".local/booking-tests", randomUUID());
    await mkdir(directory, { recursive: true });
    const postgres = new EmbeddedPostgres({
      databaseDir: directory,
      user: "booking_test",
      password,
      port,
      persistent: true,
      autoRehydrateSymlinks: true,
      onLog: () => {},
      onError: () => {},
    });
    let web: ChildProcess | undefined;
    try {
      await postgres.initialise();
      await postgres.start();
      process.env.DATABASE_URL = `postgresql://booking_test:${password}@127.0.0.1:${port}/postgres`;
      delete process.env.SMTP_HOST;
      delete process.env.MS_CLIENT_ID;
      await migrate();
      await t.test(
        "migration and real catalog seed are repeatable and invent no inventory or prices",
        async () => {
          await migrate();
          await seed();
          await seed();
          const r = await db().query(
            "SELECT * FROM accommodation_types WHERE category='ACCOMMODATION'",
          );
          assert.equal(r.rows.length, 5);
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM accommodation_types WHERE category='ACTIVITY' AND NOT active AND price IS NULL AND max_guests IS NULL",
              )
            ).rows[0].n,
            8,
          );
          assert.ok(
            r.rows.every(
              (p) => !p.active && p.price === null && p.max_guests === null,
            ),
          );
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM accommodation_units",
              )
            ).rows[0].n,
            0,
          );
        },
      );
      const adminId = randomUUID(),
        staffId = randomUUID(),
        adminPassword = randomBytes(16).toString("hex");
      await db().query(
        "INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,'Test Administrator','admin@example.test',$2,'ADMIN'),($3,'Test Staff','staff@example.test',$2,'STAFF')",
        [adminId, await hashPassword(adminPassword), staffId],
      );
      const admin: Staff = {
        id: adminId,
        full_name: "Test Administrator",
        email: "admin@example.test",
        role: "ADMIN",
        can_approve: true,
        can_export: true,
      };
      const staff: Staff = {
        id: staffId,
        full_name: "Test Staff",
        email: "staff@example.test",
        role: "STAFF",
        can_approve: false,
        can_export: false,
      };
      const option = await saveProduct(
        {
          name: "TEST ONLY Cabin",
          slug: "test-only-cabin",
          description: "Isolated test fixture",
          category: "ACCOMMODATION",
          overnight: true,
          active: true,
          minGuests: 1,
          maxGuests: 4,
          dayCapacity: null,
          price: null,
          priceBasis: "UNIT",
          slots: [],
          image: "/images/accommodations/fmly_deluxe.jpg",
        },
        admin,
      );
      const productId = option.id as string;
      await saveUnit(
        { productId, identifier: "TEST-UNIT-1", active: true },
        admin,
      );
      const start = plusDay(manilaDate(), 7),
        end = plusDay(start, 2);
      const input = (overrides = {}) => ({
        productId,
        checkIn: start,
        checkOut: end,
        adults: 2,
        children: 0,
        units: 1,
        slot: "",
        guestName: "Test Guest",
        guestEmail: "guest@example.test",
        guestPhone: "09171234567",
        notes: "Test fixture only",
        consent: true as const,
        addons: [],
        website: "",
        requestKey: randomUUID(),
        ...overrides,
      });
      let first = "",
        second = "",
        reference = "",
        receipt = "";
      await t.test(
        "server rejects invalid dates, counts, capacities, honeypot and client totals",
        async () => {
          assert.equal(
            bookingSchema.safeParse(input({ checkIn: "2027-02-30" })).success,
            false,
          );
          assert.equal(
            bookingSchema.safeParse(input({ adults: 0 })).success,
            false,
          );
          assert.equal(
            bookingSchema.safeParse(input({ website: "spam" })).success,
            false,
          );
          assert.equal(
            bookingSchema.safeParse(input({ total_amount: 0 })).success,
            false,
          );
          await assert.rejects(
            createBooking(input({ checkOut: start })),
            /Check-out/,
          );
          await assert.rejects(createBooking(input({ adults: 5 })), /capacity/);
          const inactive = (
            await db().query(
              "SELECT id FROM accommodation_types WHERE slug='igloo'",
            )
          ).rows[0].id;
          await assert.rejects(
            createBooking(input({ productId: inactive })),
            /verification|inventory/,
          );
        },
      );
      await t.test(
        "website submissions persist as pending with private receipts and durable jobs",
        async () => {
          const request = input(),
            one = await createBooking(request),
            retry = await createBooking(request),
            two = await createBooking(input());
          assert.equal(one.reference, retry.reference);
          assert.notEqual(one.receipt, retry.receipt);
          reference = retry.reference;
          receipt = retry.receipt;
          const r = (
            await db().query(
              "SELECT id,status,total_amount,receipt_hash FROM bookings WHERE reference_number=$1",
              [reference],
            )
          ).rows[0];
          first = r.id;
          second = (
            await db().query(
              "SELECT id FROM bookings WHERE reference_number=$1",
              [two.reference],
            )
          ).rows[0].id;
          assert.equal(r.status, "PENDING");
          assert.equal(r.total_amount, null);
          assert.notEqual(r.receipt_hash, receipt);
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM integration_jobs WHERE booking_id=$1",
                [first],
              )
            ).rows[0].n,
            3,
          );
          await assert.rejects(
            createBooking({ ...request, guestName: "Different" }),
            /submission key/,
          );
        },
      );
      await t.test(
        "concurrent confirmations cannot overbook; database exclusion is a second guard",
        async () => {
          const results = await Promise.allSettled([
            updateBooking(first, { status: "CONFIRMED", version: 1 }, admin),
            updateBooking(second, { status: "CONFIRMED", version: 1 }, admin),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          const winner = (
            await db().query("SELECT id FROM bookings WHERE status='CONFIRMED'")
          ).rows[0].id;
          const loser = winner === first ? second : first;
          first = winner;
          second = loser;
          const unit = (
            await db().query(
              "SELECT unit_id FROM booking_units WHERE booking_id=$1",
              [winner],
            )
          ).rows[0].unit_id;
          await assert.rejects(
            db().query(
              "INSERT INTO booking_units(booking_id,unit_id,check_in_date,check_out_date) VALUES($1,$2,$3,$4)",
              [loser, unit, start, end],
            ),
            (e: unknown) =>
              typeof e === "object" &&
              e !== null &&
              "code" in e &&
              e.code === "23P01",
          );
        },
      );
      await t.test(
        "checkout is excluded; cancellation restores availability; stale writes fail",
        async () => {
          const onCheckout = await transaction(async (c) =>
            availability(c, await lockProduct(c, productId), {
              checkIn: end,
              checkOut: plusDay(end, 1),
              units: 1,
              adults: 2,
              children: 0,
              slot: "",
            }),
          );
          assert.equal(onCheckout.available, true);
          const during = await transaction(async (c) =>
            availability(c, await lockProduct(c, productId), {
              checkIn: start,
              checkOut: end,
              units: 1,
              adults: 2,
              children: 0,
              slot: "",
            }),
          );
          assert.equal(during.available, false);
          await assert.rejects(
            updateBooking(first, { status: "CANCELLED", version: 1 }, admin),
            /changed/,
          );
          await updateBooking(
            first,
            { status: "CANCELLED", version: 2 },
            admin,
          );
          await updateBooking(
            second,
            { status: "CONFIRMED", version: 1 },
            admin,
          );
          await updateBooking(
            second,
            { status: "CANCELLED", version: 2 },
            admin,
          );
        },
      );
      await t.test(
        "staff permissions, invalid status transitions and last-admin protection are enforced",
        async () => {
          const b = await createBooking(input()),
            id = (
              await db().query(
                "SELECT id FROM bookings WHERE reference_number=$1",
                [b.reference],
              )
            ).rows[0].id;
          await assert.rejects(
            updateBooking(id, { status: "CONFIRMED", version: 1 }, staff),
            /cannot approve/,
          );
          await assert.rejects(
            updateBooking(id, { status: "CHECKED_OUT", version: 1 }, admin),
            /not permitted/,
          );
          await assert.rejects(
            saveUnit({ productId, identifier: "X", active: true }, staff),
            /Administrator/,
          );
          await assert.rejects(
            saveAccount(
              {
                id: adminId,
                fullName: admin.full_name,
                email: admin.email,
                role: "STAFF",
                active: true,
                canApprove: false,
                canExport: false,
              },
              admin,
            ),
            /at least one/,
          );
        },
      );
      await t.test(
        "manual reservations share inventory, confirmations, audit and job rules",
        async () => {
          const b = await createBooking(input(), admin),
            id = (
              await db().query(
                "SELECT id FROM bookings WHERE reference_number=$1",
                [b.reference],
              )
            ).rows[0].id;
          await updateBooking(id, { status: "CONFIRMED", version: 1 }, admin);
          const d = await bookingDetails(id);
          assert.equal(d.source, "MANUAL");
          assert.equal(d.history.length, 2);
          assert.ok(d.jobs.length >= 5);
          await assert.rejects(
            saveBlock(
              {
                productId,
                unitId: null,
                start,
                end,
                slot: "",
                reason: "maintenance",
              },
              admin,
            ),
            /overlaps/,
          );
          await assert.rejects(
            saveUnit(
              { productId, identifier: "TEST-UNIT-1", active: false },
              admin,
            ),
            /allocated/,
          );
          await updateBooking(id, { status: "CANCELLED", version: 2 }, admin);
        },
      );
      await t.test(
        "blocked inventory rejects requests and can be restored",
        async () => {
          await saveBlock(
            {
              productId,
              unitId: null,
              start,
              end,
              slot: "",
              reason: "test closure",
            },
            admin,
          );
          await assert.rejects(createBooking(input()), /availability/);
          await db().query("DELETE FROM blocked_dates WHERE product_id=$1", [
            productId,
          ]);
          await createBooking(input());
        },
      );
      await t.test(
        "day slots use guest capacity atomically and cancel correctly",
        async () => {
          const day = await saveProduct(
            {
              name: "TEST ONLY Day Tour",
              slug: "test-only-day",
              description: "",
              category: "DAY_TOUR",
              overnight: false,
              active: true,
              minGuests: 1,
              maxGuests: 4,
              dayCapacity: 3,
              price: 100,
              priceBasis: "PERSON",
              slots: ["Morning", "Afternoon"],
              image: null,
            },
            admin,
          );
          const a = await createBooking(
              input({
                productId: day.id,
                checkOut: undefined,
                slot: "Morning",
              }),
            ),
            b = await createBooking(
              input({
                productId: day.id,
                checkOut: undefined,
                slot: "Morning",
              }),
            );
          const ids = (
            await db().query(
              "SELECT id FROM bookings WHERE reference_number=ANY($1)",
              [[a.reference, b.reference]],
            )
          ).rows.map((r) => r.id);
          const r = await Promise.allSettled(
            ids.map((id) =>
              updateBooking(id, { status: "CONFIRMED", version: 1 }, admin),
            ),
          );
          assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
          const p = (
            await db().query<Product>(
              "SELECT * FROM accommodation_types WHERE id=$1",
              [day.id],
            )
          ).rows[0];
          assert.equal(
            estimate(p, { checkIn: start, units: 1, adults: 2, children: 1 }),
            300,
          );
          assert.equal(
            (
              await transaction((c) =>
                availability(c, p, {
                  checkIn: start,
                  units: 1,
                  adults: 2,
                  children: 0,
                  slot: "Afternoon",
                }),
              )
            ).available,
            true,
          );
        },
      );
      await t.test(
        "multiple room units are allocated together and guest lifecycle releases inventory",
        async () => {
          await saveUnit(
            { productId, identifier: "TEST-UNIT-2", active: true },
            admin,
          );
          const b = await createBooking(
            input({
              checkIn: plusDay(start, 60),
              checkOut: plusDay(start, 62),
              adults: 4,
              units: 2,
            }),
          );
          const id = (
            await db().query(
              "SELECT id FROM bookings WHERE reference_number=$1",
              [b.reference],
            )
          ).rows[0].id;
          await updateBooking(id, { status: "CONFIRMED", version: 1 }, admin);
          assert.equal((await bookingDetails(id)).units.length, 2);
          await assert.rejects(
            updateBooking(id, { status: "CHECKED_IN", version: 2 }, staff),
            /not due/,
          );
          await updateBooking(id, { status: "CANCELLED", version: 2 }, admin);
          await saveUnit(
            { productId, identifier: "TEST-UNIT-2", active: false },
            admin,
          );
          const todayBooking = await createBooking(
            input({
              checkIn: manilaDate(),
              checkOut: plusDay(manilaDate(), 1),
            }),
          );
          const todayId = (
            await db().query(
              "SELECT id FROM bookings WHERE reference_number=$1",
              [todayBooking.reference],
            )
          ).rows[0].id;
          await updateBooking(
            todayId,
            { status: "CONFIRMED", version: 1 },
            admin,
          );
          await updateBooking(
            todayId,
            { status: "CHECKED_IN", version: 2 },
            staff,
          );
          await updateBooking(
            todayId,
            { status: "CHECKED_OUT", version: 3 },
            staff,
          );
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM booking_units WHERE booking_id=$1 AND active",
                [todayId],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "permitted guest edits retain audit history without financial changes",
        async () => {
          const created = await createBooking(input()),
            id = (
              await db().query(
                "SELECT id FROM bookings WHERE reference_number=$1",
                [created.reference],
              )
            ).rows[0].id;
          await updateBooking(
            id,
            {
              version: 1,
              notes: "Updated visit arrangement",
              guestPhone: "09991234567",
            },
            admin,
          );
          const detail = await bookingDetails(id);
          assert.equal(detail.special_requests, "Updated visit arrangement");
          assert.equal(detail.guest_phone, "09991234567");
          assert.equal(detail.history.length, 2);
          assert.equal(
            (
              await db().query(
                "SELECT total_amount FROM bookings WHERE id=$1",
                [id],
              )
            ).rows[0].total_amount,
            null,
          );
        },
      );
      await t.test(
        "unconfigured email/Excel and SMTP failures preserve reservations and record retry state",
        async () => {
          const count = (await db().query("SELECT count(*) FROM bookings"))
            .rows[0].count;
          await runJobs(100);
          assert.ok(
            (
              await db().query(
                "SELECT 1 FROM integration_jobs WHERE state='NOT_CONFIGURED'",
              )
            ).rowCount,
          );
          process.env.INTEGRATION_ENCRYPTION_KEY =
            randomBytes(32).toString("hex");
          process.env.SMTP_HOST = "127.0.0.1";
          process.env.SMTP_PORT = "1";
          process.env.SMTP_FROM = "test@example.test";
          await db().query(
            "UPDATE integration_jobs SET state='PENDING',next_attempt_at=now() WHERE kind='GUEST_EMAIL'",
          );
          await runJobs(100);
          assert.ok(
            (
              await db().query(
                "SELECT 1 FROM integration_jobs WHERE state='FAILED' AND kind='GUEST_EMAIL' AND attempts=1",
              )
            ).rowCount,
          );
          assert.equal(
            (await db().query("SELECT count(*) FROM bookings")).rows[0].count,
            count,
          );
          delete process.env.SMTP_HOST;
        },
      );
      await t.test(
        "Excel export is valid XLSX with literal guest text and numeric amounts",
        async () => {
          const b = (await db().query("SELECT * FROM bookings LIMIT 1"))
            .rows[0];
          const buffer = await exportWorkbook([
            { ...b, guest_name: '=HYPERLINK("bad")' },
          ]);
          const book = new ExcelJS.Workbook();
          await book.xlsx.load(buffer);
          const sheet = book.worksheets[0];
          assert.equal(sheet.rowCount, 2);
          assert.equal(sheet.getCell("B2").value, '=HYPERLINK("bad")');
          assert.equal(sheet.getCell("B2").type, ExcelJS.ValueType.String);
          assert.equal(sheet.getCell("A1").value, excelHeaders[0]);
        },
      );
      await t.test(
        "Graph synchronization retries ambiguous appends without duplicate rows and updates status (mock transport)",
        async () => {
          const b = (await db().query("SELECT * FROM bookings LIMIT 1"))
              .rows[0],
            rows: { index: number; values: unknown[][] }[] = [];
          let appendCalls = 0,
            patchCalls = 0,
            ambiguous = true;
          const mock: typeof fetch = async (url, init) => {
            const path = String(url);
            if (path.endsWith("/columns"))
              return Response.json({
                value: excelHeaders.map((name) => ({ name })),
              });
            if (path.endsWith("/rows/add")) {
              appendCalls++;
              rows.push({
                index: 0,
                values: JSON.parse(String(init?.body)).values,
              });
              if (ambiguous) {
                ambiguous = false;
                throw new Error("network interrupted after append");
              }
              return Response.json({});
            }
            if (init?.method === "PATCH") {
              patchCalls++;
              rows[0].values = JSON.parse(String(init.body)).values;
              return Response.json({});
            }
            return Response.json({ value: rows });
          };
          await transaction(async (c) => {
            const settings = {
              drive_id: "drive",
              workbook_id: "workbook",
              table_name: "Reservations",
              token_encrypted: null,
            };
            await assert.rejects(
              syncExcel(c, b, settings, mock, "test-access"),
            );
            await syncExcel(
              c,
              { ...b, status: "CANCELLED" },
              settings,
              mock,
              "test-access",
            );
          });
          assert.equal(appendCalls, 1);
          assert.equal(patchCalls, 1);
          assert.equal(rows.length, 1);
          assert.equal(
            rows[0].values[0][excelHeaders.indexOf("Reservation Status")],
            "CANCELLED",
          );
        },
      );
      await t.test(
        "password hashing and persistent rate limits work",
        async () => {
          const digest = await hashPassword(adminPassword);
          assert.equal(await verifyPassword(adminPassword, digest), true);
          assert.equal(await verifyPassword("incorrect", digest), false);
          await rateLimit("test-rate", 1, 60);
          await assert.rejects(
            rateLimit("test-rate", 1, 60),
            (e: unknown) => e instanceof BookingError && e.status === 429,
          );
        },
      );
      await t.test(
        "local administrator recovery resets only the target, revokes sessions and rejects staff recovery",
        async () => {
          const targetId = randomUUID(),
            email = "recovery-admin@example.test";
          const oldPassword = randomBytes(20).toString("hex"),
            newPassword = randomBytes(24).toString("hex");
          await db().query(
            "INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,'TEST ONLY Recovery Admin',$2,$3,'ADMIN')",
            [targetId, email, await hashPassword(oldPassword)],
          );
          const otherSession = hash(randomUUID());
          await db().query(
            "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour'),($3,$4,now()+interval '1 hour')",
            [hash(randomUUID()), targetId, otherSession, staff.id],
          );
          await rateLimit(`login:${email}`, 1, 60);
          await resetAdministratorPassword(
            ` ${email.toUpperCase()} `,
            newPassword,
          );
          const target = (
            await db().query(
              "SELECT password_hash,role,active FROM users WHERE id=$1",
              [targetId],
            )
          ).rows[0];
          assert.equal(
            await verifyPassword(newPassword, target.password_hash),
            true,
          );
          assert.equal(
            await verifyPassword(oldPassword, target.password_hash),
            false,
          );
          assert.equal(target.role, "ADMIN");
          assert.equal(target.active, true);
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM sessions WHERE user_id=$1",
                [targetId],
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM sessions WHERE token_hash=$1",
                [otherSession],
              )
            ).rows[0].n,
            1,
          );
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM rate_limits WHERE key=$1",
                [hash(`login:${email}`)],
              )
            ).rows[0].n,
            0,
          );
          const audit = (
            await db().query(
              "SELECT details FROM booking_activity_logs WHERE action='ADMIN_PASSWORD_RESET' AND details->>'targetUserId'=$1",
              [targetId],
            )
          ).rows;
          assert.equal(audit.length, 1);
          assert.ok(!JSON.stringify(audit).includes(newPassword));
          await assert.rejects(
            resetAdministratorPassword(staff.email, newPassword),
            /active administrator/,
          );
          const unchanged = (
            await db().query("SELECT password_hash FROM users WHERE id=$1", [
              staff.id,
            ])
          ).rows[0];
          assert.equal(
            await verifyPassword(adminPassword, unchanged.password_hash),
            true,
          );
          await assert.rejects(
            resetAdministratorPassword(email, "short"),
            /12–128/,
          );
        },
      );
      await db().query(
        "UPDATE reservation_settings SET terms='Isolated test terms only',cancellation_policy='Isolated cancellation test only',privacy_policy='Isolated privacy test only',rescheduling_policy='Isolated reschedule test only' WHERE id=1",
      );
      const webPort = await freePort(),
        base = `http://127.0.0.1:${webPort}`;
      process.env.APP_URL = base;
      if (!(await readFile(resolve(".next/BUILD_ID"), "utf8").catch(() => "")))
        throw new Error(
          "Run npm run build before npm test (HTTP tests use the production server).",
        );
      let serverOutput = "";
      web = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(webPort),
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: "production" },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      );
      web.stdout?.on("data", (d) => {
        serverOutput += d.toString();
      });
      web.stderr?.on("data", (d) => {
        serverOutput += d.toString();
      });
      for (let n = 0; n < 100; n++) {
        if (
          await fetch(`${base}/api/reservations/catalog/`)
            .then((r) => r.ok)
            .catch(() => false)
        )
          break;
        if (web.exitCode !== null) throw new Error(serverOutput);
        await new Promise((r) => setTimeout(r, 300));
      }
      const request = (
        path: string,
        data?: unknown,
        cookie = "",
        method = "POST",
        origin = base,
      ) =>
        fetch(`${base}/api/reservations/${path}/`, {
          method: data === undefined ? "GET" : method,
          headers: {
            "Content-Type": "application/json",
            Origin: origin,
            Cookie: cookie,
          },
          ...(data === undefined ? {} : { body: JSON.stringify(data) }),
          redirect: "manual",
        });
      let adminCookie = "",
        staffCookie = "";
      await t.test(
        "protected HTTP routes deny unauthorized guests and staff-only permissions",
        async () => {
          for (const path of [
            "dashboard",
            "bookings",
            "export",
            "settings",
            "accounts",
            "inventory",
          ])
            assert.equal((await request(path)).status, 401, path);
          assert.equal(
            (await fetch(`${base}/admin/dashboard/`, { redirect: "manual" }))
              .status,
            307,
          );
          const a = await request("login", {
            email: admin.email,
            password: adminPassword,
          });
          assert.equal(a.status, 200);
          adminCookie = a.headers.get("set-cookie")!.split(";")[0];
          const s = await request("login", {
            email: staff.email,
            password: adminPassword,
          });
          staffCookie = s.headers.get("set-cookie")!.split(";")[0];
          for (const path of ["export", "settings", "accounts", "inventory"])
            assert.equal(
              (await request(path, undefined, staffCookie)).status,
              403,
              path,
            );
          assert.equal(
            (await request("products", {}, staffCookie)).status,
            403,
          );
          assert.equal(
            (
              await request(
                "logout",
                {},
                adminCookie,
                "POST",
                "https://attacker.test",
              )
            ).status,
            403,
          );
          assert.equal((await request("worker", {})).status, 401);
          assert.equal(
            (await request("dashboard", undefined, adminCookie)).status,
            200,
          );
        },
      );
      await t.test(
        "guest HTTP booking preserves legacy receipt access, public references, dashboard counts and XLSX",
        async () => {
          const result = await request("bookings", {
            items: [
              {
                productId,
                checkIn: start,
                checkOut: end,
                adults: 2,
                children: 0,
                units: 1,
                slot: "",
                restrictionsAccepted: true,
                participantsMeetAge: true,
              },
            ],
            guestName: "Test Guest",
            guestEmail: "http@example.test",
            guestPhone: "09171234567",
            consent: true,
            termsAccepted: true,
            cancellationAccepted: true,
            requestKey: randomUUID(),
            policyVersion: 1,
          });
          assert.equal(result.status, 201);
          const created = await result.json();
          const cookie = result.headers.get("set-cookie")!.split(";")[0];
          const privatePage = await fetch(
            `${base}/booking/confirmation/${created.reference}/`,
            { headers: { Cookie: cookie } },
          ).then((r) => r.text());
          assert.match(privatePage, /Copy Reference/);
          assert.ok(privatePage.includes(created.trackingReference));
          assert.doesNotMatch(privatePage, /http@example.test|Test Guest/);
          const publicPage = await fetch(
            `${base}/booking/confirmation/${created.reference}/`,
          ).then((r) => r.text());
          assert.doesNotMatch(publicPage, /http@example.test|Test Guest/);
          assert.ok(
            !publicPage.includes(created.trackingReference),
            "Internal numbers cannot reveal the public reference without a private receipt",
          );
          const publicConfirmation = await fetch(
            `${base}/booking/confirmation/${created.trackingReference}/`,
          ).then((r) => r.text());
          assert.ok(publicConfirmation.includes(created.trackingReference));
          assert.match(publicConfirmation, /Copy Reference/);
          assert.doesNotMatch(
            publicConfirmation,
            /http@example.test|Test Guest/,
          );
          await db().query(
            "UPDATE guest_booking_sessions SET expires_at=now()-interval '1 second' WHERE booking_id=(SELECT id FROM bookings WHERE reference_number=$1)",
            [created.reference],
          );
          const expiredPage = await fetch(
            `${base}/booking/confirmation/${created.reference}/`,
            { headers: { Cookie: cookie } },
          ).then((r) => r.text());
          assert.doesNotMatch(expiredPage, /Test Guest/);
          const overview = await (
            await request("dashboard", undefined, adminCookie)
          ).json();
          assert.ok(overview.pending > 0);
          assert.ok(overview.unread > 0);
          assert.ok(
            overview.arrivals > 0,
            "Completed stays still count in today’s scheduled arrivals",
          );
          const exported = await request("export", undefined, adminCookie);
          assert.equal(exported.status, 200);
          const book = new ExcelJS.Workbook();
          await book.xlsx.load(
            Buffer.from(
              await exported.arrayBuffer(),
            ) as unknown as ExcelJS.Buffer,
          );
          assert.ok(book.worksheets[0].rowCount > 2);
          assert.match(exported.headers.get("cache-control")!, /no-store/);
        },
      );
      await t.test(
        "transaction recording is retired for administrators and staff",
        async () => {
          const before = (
            await db().query("SELECT count(*)::int n FROM payments")
          ).rows[0].n;
          for (const cookie of [adminCookie, staffCookie])
            assert.equal(
              (
                await request(
                  "payments/" + first,
                  { amount: 100, kind: "PAYMENT" },
                  cookie,
                )
              ).status,
              410,
            );
          assert.equal(
            (await db().query("SELECT count(*)::int n FROM payments")).rows[0]
              .n,
            before,
          );
        },
      );
      await t.test(
        "existing public pages still render with internal booking links",
        async () => {
          for (const path of [
            "",
            "about",
            "accommodations",
            "accommodations/family-deluxe",
            "adventures",
            "pool-cottages",
            "dining",
            "gallery",
            "guest-reviews",
            "packages",
            "contact",
            "faq",
            "booking",
          ]) {
            const r = await fetch(`${base}/${path}${path ? "/" : ""}`);
            assert.equal(r.status, 200, path);
            const html = await r.text();
            assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
            assert.match(html, /id="main"/);
            assert.match(html, /href="\/booking\//, path);
          }
        },
      );
      if (process.env.BOOKING_BROWSER_TESTS === "1")
        await t.test(
          "desktop/mobile booking, keyboard dialog, staff sign-in and guest submission in browser",
          async () => {
            await db().query(
              "UPDATE reservation_settings SET terms='Isolated test terms only',cancellation_policy='Isolated cancellation test only',privacy_policy='Isolated privacy test only',rescheduling_policy='Isolated reschedule test only' WHERE id=1",
            );
            const { chromium } = await import("playwright");
            const browser = await chromium.launch({
              ...(process.platform === "win32" ? { channel: "msedge" } : {}),
              headless: true,
            });
            try {
              const page = await browser.newPage({ reducedMotion: "reduce" }),
                errors: string[] = [];
              page.setDefaultTimeout(15000);
              page.setDefaultNavigationTimeout(15000);
              page.on("pageerror", (e) => errors.push(e.message));
              for (const width of [360, 390, 768, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                await page.goto(`${base}/booking/?subject=TEST%20ONLY%20Cabin`);
                await page
                  .getByRole("button", { name: /TEST ONLY Cabin/ })
                  .waitFor();
                assert.equal(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth > innerWidth,
                  ),
                  false,
                  `booking overflow at ${width}`,
                );
                await page
                  .locator(".reservation-option img")
                  .evaluateAll(async (images) => {
                    await Promise.all(
                      images.map(async (element) => {
                        const img = element as HTMLImageElement;
                        img.loading = "eager";
                        await img.decode();
                      }),
                    );
                  });
                await page.screenshot({
                  path: resolve(`.local/booking-tests/booking-${width}.png`),
                  fullPage: true,
                });
              }
              await page.setViewportSize({ width: 390, height: 844 });
              await page
                .getByLabel("Check-in", { exact: true })
                .fill(plusDay(start, 30));
              await page
                .getByLabel("Check-out", { exact: true })
                .fill(plusDay(start, 32));
              await page
                .getByRole("checkbox", { name: /restrictions/ })
                .check();
              await page
                .getByRole("button", {
                  name: "Check availability & add service",
                })
                .click();
              await page
                .getByLabel("Full name", { exact: true })
                .fill("Browser Test Guest");
              await page
                .getByLabel("Email address")
                .fill("browser@example.test");
              await page
                .getByLabel("Contact number", { exact: true })
                .fill("09171234567");
              for (const checkbox of await page.getByRole("checkbox").all())
                await checkbox.check();
              const submit = page.getByRole("button", {
                name: "Submit Reservation Request",
                exact: true,
              });
              await submit.waitFor();
              await submit.click({ timeout: 15000 });
              await page.waitForURL(/\/booking\/confirmation\//);
              await page
                .getByRole("link", { name: "Track Reservation", exact: true })
                .click();
              await page
                .getByRole("heading", { name: "Your visit, a little closer." })
                .waitFor();
              assert.match(
                await page.locator("h1").innerText(),
                /Your visit, a little closer/,
              );
              await page.goto(`${base}/admin/login/`);
              await page.getByLabel("Email address").fill(admin.email);
              await page
                .getByLabel("Password", { exact: true })
                .fill(adminPassword);
              await page
                .getByRole("button", { name: "Sign in securely" })
                .click();
              await page.waitForURL(/admin\/dashboard/);
              await page
                .getByRole("button", { name: "Open navigation", exact: true })
                .click();
              await page
                .getByRole("button", { name: "All reservations", exact: true })
                .click();
              await page
                .getByRole("button", { name: "View & manage" })
                .first()
                .click();
              await page.getByRole("dialog").waitFor();
              await page.screenshot({
                path: resolve(".local/booking-tests/dashboard-detail-390.png"),
                fullPage: true,
              });
              await page.keyboard.press("Escape");
              assert.equal(await page.getByRole("dialog").count(), 0);
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth > innerWidth,
                ),
                false,
                "dashboard mobile overflow",
              );
              for (const path of [
                "",
                "accommodations",
                "adventures",
                "gallery",
                "contact",
              ]) {
                await page.goto(`${base}/${path}${path ? "/" : ""}`);
                assert.equal(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth > innerWidth,
                  ),
                  false,
                );
              }
              assert.deepEqual(errors, []);
            } finally {
              await browser.close();
            }
          },
        );
      else
        t.diagnostic(
          "Browser checks skipped; set BOOKING_BROWSER_TESTS=1 to run installed Chromium/Edge.",
        );
    } finally {
      web?.kill();
      if (process.env.DATABASE_URL) await db().end();
      await postgres.stop();
    }
  },
);
