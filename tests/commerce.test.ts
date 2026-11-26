import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import ExcelJS from "exceljs";
import { db, type Staff } from "../src/lib/booking/db";
import { migrate } from "../scripts/booking-admin";
import { saveProduct, saveUnit, saveBlock } from "../src/lib/booking/inventory";
import {
  saveCommerce,
  saveReceivingAccount,
} from "../src/lib/booking/commerce-config";
import { createCart, type CartItem } from "../src/lib/booking/cart";
import { hashPassword } from "../src/lib/booking/security";
import { guestDetails } from "../src/lib/booking/guest-access";
import { calendarEntries } from "../src/lib/booking/reports";
import { manilaDate } from "../src/lib/dates";
import { adminInsights } from "../src/lib/booking/admin-insights";
import { updateBooking, listBookings } from "../src/lib/booking/service";
import {
  reschedule,
  requestChange,
  reviewChange,
} from "../src/lib/booking/changes";
import {
  guestRecords,
  reservationWorkbook,
  operationalSettings,
  saveOperationalSettings,
} from "../src/lib/booking/operations";
import { commerceMaintenance } from "../src/lib/booking/maintenance";
import {
  runAdminWorkspaceChecks,
  runEmptyDashboardChecks,
} from "./helpers/admin-workspace-browser";
const plus = (date: string, n: number) =>
  new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10);
async function freePort() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const port = (s.address() as { port: number }).port;
  await new Promise<void>((r) => s.close(() => r()));
  return port;
}
test(
  "reservation-only operations and retired financial endpoints on isolated PostgreSQL",
  { timeout: 600000 },
  async (t) => {
    const password = randomBytes(24).toString("hex"),
      port = await freePort(),
      directory = resolve(".local/commerce-tests", randomUUID());
    await mkdir(directory, { recursive: true });
    const postgres = new EmbeddedPostgres({
      databaseDir: directory,
      user: "commerce_test",
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
      process.env.DATABASE_URL = `postgresql://commerce_test:${password}@127.0.0.1:${port}/postgres`;
      delete process.env.SMTP_HOST;
      delete process.env.MS_CLIENT_ID;
      delete process.env.PAYMONGO_SECRET_KEY;
      process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("hex");
      await migrate();
      const adminPassword = randomBytes(16).toString("hex"),
        userId = randomUUID(),
        staffId = randomUUID();
      await db().query(
        "INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,'Commerce Test Admin','commerce-admin@example.test',$2,'ADMIN'),($3,'Commerce Test Staff','commerce-staff@example.test',$2,'STAFF')",
        [userId, await hashPassword(adminPassword), staffId],
      );
      const admin: Staff = {
          id: userId,
          full_name: "Commerce Test Admin",
          email: "commerce-admin@example.test",
          role: "ADMIN",
          can_approve: true,
          can_export: true,
        },
        staff: Staff = {
          id: staffId,
          full_name: "Commerce Test Staff",
          email: "commerce-staff@example.test",
          role: "STAFF",
          can_approve: false,
          can_export: false,
          can_verify_payments: false,
        };
      const base = {
        description: "Isolated test fixture only",
        overnight: false,
        active: true,
        minGuests: 1,
        maxGuests: 6,
        dayCapacity: 6,
        price: 0,
        priceBasis: "PERSON",
        slots: [] as string[],
        image: null,
        depositMode: "NONE",
        depositValue: null,
      };
      const room = await saveProduct(
        {
          ...base,
          name: "TEST ONLY Deposit Cabin",
          slug: "test-deposit-cabin",
          category: "ACCOMMODATION",
          overnight: true,
          price: 4000,
          priceBasis: "UNIT",
          depositMode: "PERCENT",
          depositValue: 3000,
          image: "/images/accommodations/fmly_deluxe.jpg",
        },
        admin,
      );
      await saveUnit(
        { productId: room.id, identifier: "TEST-CABIN-1", active: true },
        admin,
      );
      const pool = await saveProduct(
        {
          ...base,
          name: "TEST ONLY Shared Pool",
          slug: "test-shared-pool",
          category: "SWIMMING",
          price: 200,
          childPrice: 100,
          maxGuests: 5,
          dayCapacity: 5,
          slots: ["09:00"],
          durationMinutes: 120,
          resourceGroup: "test-pool",
          depositMode: "FULL",
        },
        admin,
      );
      const privatePool = await saveProduct(
        {
          ...base,
          name: "TEST ONLY Private Pool",
          slug: "test-private-pool",
          category: "SWIMMING",
          price: 2000,
          priceBasis: "UNIT",
          maxGuests: 5,
          dayCapacity: 5,
          slots: ["09:00"],
          durationMinutes: 120,
          resourceGroup: "test-pool",
          exclusive: true,
          depositMode: "FIXED",
          depositValue: 50000,
        },
        admin,
      );
      const activity = await saveProduct(
        {
          ...base,
          name: "TEST ONLY Adventure",
          slug: "test-adventure",
          category: "ACTIVITY",
          price: 350,
          dayCapacity: 4,
          maxGuests: 4,
          equipmentCount: 2,
          slots: ["10:00", "10:30", "11:00"],
          durationMinutes: 60,
          minAge: 10,
          depositMode: "FULL",
        },
        admin,
      );
      const dining = await saveProduct(
        {
          ...base,
          name: "TEST ONLY Dining",
          slug: "test-dining",
          category: "DINING",
          slots: ["12:00"],
          durationMinutes: 60,
          price: 0,
          depositMode: "NONE",
        },
        admin,
      );
      await saveCommerce(
        {
          holdMinutes: 20,
          autoConfirm: false,
          terms: "Test-only booking terms; not a resort policy.",
          cancellationPolicy:
            "Test-only cancellation terms; not a resort policy.",
          privacyPolicy:
            "Test-only privacy policy; never a real resort policy.",
          reschedulingPolicy:
            "Test-only rescheduling policy with recorded guest consent.",
          gatewayEnabled: true,
          gatewayMethods: ["gcash", "paymaya", "qrph"],
          reminderDays: null,
        },
        admin,
      );
      await saveReceivingAccount(
        {
          method: "GCASH",
          accountName: "TEST ONLY Receiver",
          accountNumber: "TEST-ACCOUNT-NOT-REAL",
          instructions: "Test fixture, never transfer money.",
          active: true,
        },
        null,
        admin,
      );
      const account = (await db().query("SELECT * FROM receiving_accounts"))
        .rows[0];
      let dateOffset = 10;
      const nextDate = () => {
        dateOffset += 3;
        return plus(manilaDate(), dateOffset);
      };
      const item = (productId: string, date = nextDate(), overrides = {}) => ({
        productId,
        checkIn: date,
        checkOut: plus(date, 1),
        adults: 2,
        children: 0,
        units: 1,
        slot: "",
        restrictionsAccepted: true as const,
        participantsMeetAge: true as const,
        ...overrides,
      });
      const input = (items: CartItem[], overrides = {}) => ({
        items,
        guestName: "Commerce Test Guest",
        guestEmail: "commerce-guest@example.test",
        guestPhone: "09171234567",
        notes: "Test fixture only",
        consent: true,
        termsAccepted: true,
        cancellationAccepted: true,
        website: "",
        requestKey: randomUUID(),
        ...overrides,
      });
      const idFor = async (reference: string) =>
        (
          await db().query(
            "SELECT id FROM bookings WHERE reference_number=$1",
            [reference],
          )
        ).rows[0].id as string;
      const webPort = await freePort(),
        baseUrl = `http://127.0.0.1:${webPort}`;
      process.env.APP_URL = baseUrl;
      let output = "";
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
      web.stdout?.on("data", (d) => (output += d.toString()));
      web.stderr?.on("data", (d) => (output += d.toString()));
      for (let n = 0; n < 100; n++) {
        if (
          await fetch(baseUrl + "/api/reservations/commerce/catalog/")
            .then((r) => r.ok)
            .catch(() => false)
        )
          break;
        if (web.exitCode !== null) throw new Error(output);
        await new Promise((r) => setTimeout(r, 300));
      }
      const request = (
        path: string,
        data?: unknown,
        cookie = "",
        method = "POST",
        origin = baseUrl,
      ) =>
        fetch(
          `${baseUrl}/api/reservations/${path.split("?")[0]}/${path.includes("?") ? "?" + path.split("?")[1] : ""}`,
          {
            method: data === undefined ? "GET" : method,
            headers: {
              "Content-Type": "application/json",
              Origin: origin,
              Cookie: cookie,
            },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }),
            redirect: "manual",
          },
        );
      const login = await request("login", {
          email: admin.email,
          password: adminPassword,
        }),
        adminCookie = login.headers.get("set-cookie")!.split(";")[0],
        staffLogin = await request("login", {
          email: staff.email,
          password: adminPassword,
        }),
        staffCookie = staffLogin.headers.get("set-cookie")!.split(";")[0];
      if (process.env.BOOKING_BROWSER_TESTS === "1")
        await t.test(
          "empty PostgreSQL dashboard renders useful states",
          async () => {
            await runEmptyDashboardChecks({
              baseUrl,
              adminEmail: admin.email,
              password: adminPassword,
            });
          },
        );
      await t.test(
        "all categories submit without transactions and authorized staff approve without payment",
        async () => {
          for (const [productId, slot] of [
            [room.id, ""],
            [pool.id, "09:00"],
            [activity.id, "10:00"],
            [dining.id, "12:00"],
          ]) {
            const r = await createCart(
                input([item(productId, nextDate(), { slot })]),
              ),
              id = await idFor(r.reference);
            const b = (
              await db().query("SELECT * FROM bookings WHERE id=$1", [id])
            ).rows[0];
            assert.equal(b.workflow_status, "PENDING_APPROVAL");
            assert.equal(b.hold_expires_at, null);
            assert.equal(b.deposit_centavos, null);
            for (const table of [
              "payments",
              "payment_claims",
              "checkout_attempts",
              "booking_charges",
            ])
              assert.equal(
                (
                  await db().query(
                    `SELECT 1 FROM ${table} WHERE booking_id=$1`,
                    [id],
                  )
                ).rowCount,
                0,
              );
            await assert.rejects(
              updateBooking(id, { status: "CONFIRMED", version: 1 }, staff),
              /cannot approve/,
            );
            await updateBooking(id, { status: "CONFIRMED", version: 1 }, admin);
            const after = (
              await db().query("SELECT * FROM bookings WHERE id=$1", [id])
            ).rows[0];
            assert.equal(after.status, "CONFIRMED");
            assert.equal(after.reviewed_by, admin.id);
            assert.ok(after.reviewed_at);
            assert.equal(
              (
                await db().query(
                  "SELECT 1 FROM booking_items WHERE booking_id=$1 AND allocated",
                  [id],
                )
              ).rowCount,
              1,
            );
            await assert.rejects(
              updateBooking(id, { status: "CONFIRMED", version: 1 }, admin),
              /changed/,
            );
            const details = await guestDetails(id);
            assert.equal(details.workflow_status, "CONFIRMED");
            for (const field of [
              "payments",
              "billing",
              "claims",
              "accounts",
              "attempts",
            ])
              assert.ok(!(field in details));
            await updateBooking(id, { status: "CANCELLED", version: 2 }, admin);
            assert.equal(
              (
                await db().query(
                  "SELECT 1 FROM booking_items WHERE booking_id=$1 AND allocated",
                  [id],
                )
              ).rowCount,
              0,
            );
          }
        },
      );
      await t.test(
        "combined requests are idempotent and approve atomically with one reference",
        async () => {
          const date = nextDate(),
            raw = input([
              item(room.id, date),
              item(pool.id, date, { slot: "09:00" }),
              item(activity.id, date, { slot: "10:00" }),
              item(dining.id, date, {
                slot: "12:00",
                notes: "Vegetarian arrangement",
              }),
            ]);
          const [a, b] = await Promise.all([createCart(raw), createCart(raw)]);
          assert.equal(a.reference, b.reference);
          const id = await idFor(a.reference);
          assert.equal((await guestDetails(id)).items.length, 4);
          await updateBooking(id, { status: "CONFIRMED", version: 1 }, admin);
          assert.equal(
            (
              await db().query(
                "SELECT 1 FROM booking_items WHERE booking_id=$1 AND allocated",
                [id],
              )
            ).rowCount,
            4,
          );
          assert.equal(
            (
              await db().query("SELECT 1 FROM payments WHERE booking_id=$1", [
                id,
              ])
            ).rowCount,
            0,
          );
        },
      );
      await t.test(
        "decline reasons are required, persisted and private; stale decisions fail",
        async () => {
          const created = await createCart(input([item(room.id)])),
            id = await idFor(created.reference);
          await assert.rejects(
            updateBooking(id, { status: "DECLINED", version: 1 }, admin),
            /meaningful/,
          );
          const reason =
            "The requested arrangements cannot be accommodated on this date.";
          await updateBooking(
            id,
            { status: "DECLINED", reason, version: 1 },
            admin,
          );
          assert.equal((await guestDetails(id)).decline_reason, reason);
          assert.equal((await guestDetails(id)).workflow_status, "DECLINED");
          await assert.rejects(
            updateBooking(id, { status: "CONFIRMED", version: 2 }, admin),
            /not permitted/,
          );
        },
      );
      await t.test(
        "competing pending requests do not allocate inventory; only one staff approval wins",
        async () => {
          const date = nextDate(),
            requests = await Promise.all([
              createCart(input([item(room.id, date)])),
              createCart(input([item(room.id, date)])),
            ]),
            ids = await Promise.all(requests.map((r) => idFor(r.reference)));
          const outcomes = await Promise.allSettled(
            ids.map((id) =>
              updateBooking(id, { status: "CONFIRMED", version: 1 }, admin),
            ),
          );
          assert.equal(
            outcomes.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            (
              await db().query(
                "SELECT 1 FROM bookings WHERE id=ANY($1::uuid[]) AND status='PENDING'",
                [ids],
              )
            ).rowCount,
            1,
          );
        },
      );
      await t.test(
        "a conflict in a combined approval rolls back every allocation",
        async () => {
          const date = nextDate(),
            request = await createCart(
              input([
                item(room.id, date),
                item(pool.id, date, { slot: "09:00" }),
              ]),
            ),
            other = await createCart(
              input([item(privatePool.id, date, { slot: "09:00" })]),
            );
          await updateBooking(
            await idFor(other.reference),
            { status: "CONFIRMED", version: 1 },
            admin,
          );
          const id = await idFor(request.reference);
          await assert.rejects(
            updateBooking(id, { status: "CONFIRMED", version: 1 }, admin),
            /capacity/,
          );
          assert.equal(
            (
              await db().query(
                "SELECT 1 FROM booking_items WHERE booking_id=$1 AND allocated",
                [id],
              )
            ).rowCount,
            0,
          );
          assert.equal(
            (await guestDetails(id)).workflow_status,
            "PENDING_APPROVAL",
          );
        },
      );
      await t.test(
        "maintenance blocks prevent approval and preserve the pending request",
        async () => {
          const date = nextDate(),
            r = await createCart(input([item(room.id, date)])),
            id = await idFor(r.reference);
          await saveBlock(
            {
              productId: room.id,
              start: date,
              end: plus(date, 1),
              reason: "Test-only maintenance",
              slot: "",
              unitId: null,
            },
            admin,
          );
          await assert.rejects(
            updateBooking(id, { status: "CONFIRMED", version: 1 }, admin),
            /capacity/,
          );
          assert.equal(
            (await guestDetails(id)).workflow_status,
            "PENDING_APPROVAL",
          );
        },
      );
      let historicalId = "";
      let historicalPayments = "";
      await t.test(
        "historical reservations approve and reschedule without financial checks while records remain unchanged",
        async () => {
          const date = nextDate(),
            r = await createCart(input([item(room.id, date)]), null, false);
          historicalId = await idFor(r.reference);
          await db().query(
            "INSERT INTO payments(booking_id,amount,kind,recorded_by,note) VALUES($1,100,'PAYMENT',$2,'Historical isolated fixture')",
            [historicalId, admin.id],
          );
          await db().query(
            "INSERT INTO payment_claims(booking_id,account_id,method,transaction_reference,normalized_reference,claimed_centavos,transferred_at) VALUES($1,$2,'GCASH','HISTORICAL','HISTORICAL',10000,now())",
            [historicalId, account.id],
          );
          historicalPayments = JSON.stringify(
            (
              await db().query(
                "SELECT * FROM payments WHERE booking_id=$1 ORDER BY id",
                [historicalId],
              )
            ).rows,
          );
          await updateBooking(
            historicalId,
            { status: "CONFIRMED", version: 1 },
            admin,
          );
          const before = (
              await db().query(
                "SELECT total_centavos,deposit_centavos FROM bookings WHERE id=$1",
                [historicalId],
              )
            ).rows[0],
            details = await guestDetails(historicalId),
            target = nextDate();
          const change = {
            version: 2,
            items: details.items.map((i: { id: string }) => ({
              itemId: i.id,
              checkIn: target,
              checkOut: plus(target, 1),
              slot: "",
            })),
            note: "Guest agreed to revise the visit dates",
          };
          const preview = await reschedule(historicalId, change, admin, false);
          await reschedule(
            historicalId,
            {
              ...change,
              guestConsent: true,
              policyVersion: preview.policyVersion,
            },
            admin,
            true,
          );
          assert.deepEqual(
            (
              await db().query(
                "SELECT total_centavos,deposit_centavos FROM bookings WHERE id=$1",
                [historicalId],
              )
            ).rows[0],
            before,
          );
          assert.equal(
            JSON.stringify(
              (
                await db().query(
                  "SELECT * FROM payments WHERE booking_id=$1 ORDER BY id",
                  [historicalId],
                )
              ).rows,
            ),
            historicalPayments,
          );
          assert.equal(
            (
              await db().query(
                "SELECT state FROM payment_claims WHERE booking_id=$1",
                [historicalId],
              )
            ).rows[0].state,
            "UNDER_VERIFICATION",
          );
          assert.equal(
            (await guestDetails(historicalId)).workflow_status,
            "CONFIRMED",
          );
        },
      );
      await t.test(
        "unpriced services can be approved and rescheduled without synthetic charges",
        async () => {
          const p = await saveProduct(
              {
                ...base,
                name: "TEST ONLY Unpriced",
                slug: "test-unpriced",
                category: "DINING",
                price: null,
                depositMode: "UNCONFIGURED",
                slots: ["14:00"],
                durationMinutes: 60,
              },
              admin,
            ),
            r = await createCart(
              input([item(p.id, nextDate(), { slot: "14:00" })]),
            ),
            id = await idFor(r.reference);
          await updateBooking(id, { status: "CONFIRMED", version: 1 }, admin);
          const d = await guestDetails(id),
            raw = {
              version: 2,
              items: d.items.map((i: { id: string }) => ({
                itemId: i.id,
                checkIn: nextDate(),
                slot: "14:00",
              })),
              note: "Guest requested a new test visit date",
            },
            preview = await reschedule(id, raw, admin, false);
          await reschedule(
            id,
            {
              ...raw,
              policyVersion: preview.policyVersion,
              guestConsent: true,
            },
            admin,
            true,
          );
          assert.equal(
            (
              await db().query(
                "SELECT 1 FROM booking_charges WHERE booking_id=$1",
                [id],
              )
            ).rowCount,
            0,
          );
        },
      );
      await t.test(
        "guest cancellation requests are idempotent and follow staff permissions",
        async () => {
          const r = await createCart(
              input([item(dining.id, nextDate(), { slot: "12:00" })]),
            ),
            id = await idFor(r.reference),
            v = {
              requestKey: randomUUID(),
              kind: "CANCEL",
              message: "Please cancel this isolated test reservation.",
            };
          const a = await requestChange(id, v),
            b = await requestChange(id, v);
          assert.equal(a.id, b.id);
          await assert.rejects(
            reviewChange(
              a.id,
              {
                decision: "APPROVE_CANCEL",
                note: "Guest cancellation request reviewed",
              },
              staff,
            ),
            /cannot approve/,
          );
          await reviewChange(
            a.id,
            {
              decision: "APPROVE_CANCEL",
              note: "Guest cancellation request reviewed",
            },
            admin,
          );
          assert.equal((await guestDetails(id)).workflow_status, "CANCELLED");
        },
      );
      await t.test(
        "reservation Excel has exactly the requested columns and no financial sheets",
        async () => {
          const buffer = await reservationWorkbook(new URLSearchParams()),
            book = new ExcelJS.Workbook();
          await book.xlsx.load(buffer);
          assert.deepEqual(
            book.worksheets.map((s) => s.name),
            ["Reservations"],
          );
          const sheet = book.worksheets[0];
          assert.equal(sheet.columnCount, 16);
          const headers = sheet.getRow(1).values;
          assert.doesNotMatch(
            JSON.stringify(headers),
            /amount|paid|balance|payment|revenue|refund/i,
          );
          assert.match(JSON.stringify(headers), /Approved By/);
          assert.ok(sheet.rowCount > 1);
          const filtered = new ExcelJS.Workbook();
          await filtered.xlsx.load(
            await reservationWorkbook(
              new URLSearchParams({ status: "DECLINED" }),
            ),
          );
          assert.ok(filtered.worksheets[0].rowCount > 1);
        },
      );
      await t.test(
        "reservation analytics, guest history, calendar and settings contain no financial data",
        async () => {
          const stats = await adminInsights(new URLSearchParams(), admin);
          assert.ok(stats.metrics.total > 0);
          assert.ok(stats.metrics.approvals > 0);
          assert.doesNotMatch(
            JSON.stringify(Object.keys(stats.metrics)),
            /balance|receipt|claim|payment|revenue|reconcil/,
          );
          assert.ok((await guestRecords(new URLSearchParams())).length);
          assert.ok(
            (
              await listBookings(
                new URLSearchParams({
                  guestEmail: "commerce-guest@example.test",
                }),
              )
            ).length,
          );
          await assert.rejects(
            listBookings(new URLSearchParams({ sort: "total_desc" })),
            /sorting/,
          );
          assert.ok(
            (
              await calendarEntries(
                new URLSearchParams({
                  from: manilaDate(),
                  to: plus(manilaDate(), 41),
                }),
              )
            ).items.length,
          );
          const config = await operationalSettings();
          assert.ok(!("gateway_enabled" in config));
          await assert.rejects(
            saveOperationalSettings({}, staff),
            /Administrator/,
          );
        },
      );
      await t.test(
        "operational settings and service edits preserve historical configuration",
        async () => {
          const before = (
              await db().query(
                "SELECT gateway_enabled,hold_minutes,auto_confirm,balance_reminder_days FROM reservation_settings WHERE id=1",
              )
            ).rows[0],
            c = await operationalSettings();
          const raw = {
            version: c.policy_version,
            resortName: "Isolated Resort Test",
            resortAddress: "Test fixture only",
            resortPhone: "09171234567",
            resortEmail: "resort@example.test",
            operatingHours: "Owner-verified test hours",
            terms: c.terms,
            cancellationPolicy: c.cancellation_policy,
            privacyPolicy: c.privacy_policy,
            reschedulingPolicy: c.rescheduling_policy,
            reminderDays: null,
          };
          await saveOperationalSettings(raw, admin);
          await assert.rejects(
            saveOperationalSettings(raw, admin),
            /Settings changed/,
          );
          assert.deepEqual(
            (
              await db().query(
                "SELECT gateway_enabled,hold_minutes,auto_confirm,balance_reminder_days FROM reservation_settings WHERE id=1",
              )
            ).rows[0],
            before,
          );
          const p = (
            await db().query("SELECT * FROM accommodation_types WHERE id=$1", [
              room.id,
            ])
          ).rows[0];
          const revised: Record<string, unknown> = {
            ...base,
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: "Updated test description",
            category: "ACCOMMODATION",
            overnight: true,
            price: 4000,
            priceBasis: "UNIT",
            image: p.image,
          };
          delete revised.depositMode;
          delete revised.depositValue;
          await saveProduct(revised, admin);
          assert.deepEqual(
            (
              await db().query(
                "SELECT deposit_mode,deposit_value FROM accommodation_types WHERE id=$1",
                [room.id],
              )
            ).rows[0],
            { deposit_mode: p.deposit_mode, deposit_value: p.deposit_value },
          );
        },
      );
      await t.test(
        "maintenance does not process providers or change historical payment reminders",
        async () => {
          process.env.PAYMONGO_SECRET_KEY = "not-a-real-key";
          await commerceMaintenance();
          delete process.env.PAYMONGO_SECRET_KEY;
          assert.equal(
            JSON.stringify(
              (
                await db().query(
                  "SELECT * FROM payments WHERE booking_id=$1 ORDER BY id",
                  [historicalId],
                )
              ).rows,
            ),
            historicalPayments,
          );
        },
      );
      await t.test(
        "private guest records and staff mutations enforce authorization and CSRF",
        async () => {
          for (const route of [
            "bookings",
            "commerce/admin/guests",
            "commerce/admin/policies",
            "commerce/admin/calendar?from=" +
              manilaDate() +
              "&to=" +
              manilaDate(),
          ]) {
            if (!route.includes("?"))
              assert.equal((await request(route)).status, 401);
          }
          assert.equal(
            (await request("commerce/admin/guests", undefined, staffCookie))
              .status,
            200,
          );
          assert.equal(
            (await request("commerce/admin/policies", {}, staffCookie)).status,
            403,
          );
          assert.equal(
            (
              await request(
                "commerce/checkout",
                {},
                "",
                "POST",
                "https://attacker.invalid",
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "transaction endpoints return gone even for administrators; archive remains private and read-only",
        async () => {
          for (const route of [
            "commerce/manual",
            "commerce/gateway",
            "paymongo/webhook",
            `payments/${historicalId}`,
            `commerce/admin/ledger/${historicalId}`,
            "commerce/admin/receiving",
            "commerce/admin/settings",
            `commerce/admin/review/${randomUUID()}`,
            `commerce/admin/reconciliation/${historicalId}`,
            `commerce/admin/due-date/${historicalId}`,
            `commerce/admin/reconcile/${randomUUID()}`,
          ])
            assert.equal(
              (await request(route, {}, adminCookie)).status,
              410,
              route,
            );
          assert.equal(
            (await request(`commerce/admin/history/${historicalId}`)).status,
            401,
          );
          assert.equal(
            (
              await request(
                `commerce/admin/history/${historicalId}`,
                undefined,
                staffCookie,
              )
            ).status,
            403,
          );
          assert.equal(
            (await request("products", { depositMode: "FULL" }, adminCookie))
              .status,
            410,
          );
          const archive = await request(
            `commerce/admin/history/${historicalId}`,
            undefined,
            adminCookie,
          );
          assert.equal(archive.status, 200);
          assert.ok((await archive.json()).payments.length);
          assert.equal(
            JSON.stringify(
              (
                await db().query(
                  "SELECT * FROM payments WHERE booking_id=$1 ORDER BY id",
                  [historicalId],
                )
              ).rows,
            ),
            historicalPayments,
          );
        },
      );
      await t.test(
        "HTTP submission, secure tracking, staff decisions and export do not need finance",
        async () => {
          const config = await operationalSettings(),
            r = await request(
              "commerce/checkout",
              input([item(dining.id, nextDate(), { slot: "12:00" })], {
                policyVersion: config.policy_version,
              }),
            );
          assert.equal(r.status, 201, await r.clone().text());
          const created = await r.json(),
            cookie = r.headers.get("set-cookie")!.split(";")[0],
            id = await idFor(created.reference);
          assert.match(created.trackingReference, /^PDJT-[A-F0-9]{48}$/);
          const tracked = await request("commerce/track", {
            reference: created.trackingReference,
          });
          assert.equal(tracked.status, 200);
          assert.deepEqual(await tracked.json(), {
            reference: created.trackingReference,
            status: "PENDING_APPROVAL",
            message: "Your reservation is awaiting confirmation.",
          });
          assert.equal(
            (
              await request(
                "commerce/track",
                { reference: created.reference },
                cookie,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                `bookings/${id}`,
                { status: "CONFIRMED", version: 1 },
                staffCookie,
                "PATCH",
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await request(
                `bookings/${id}`,
                { status: "CONFIRMED", version: 1 },
                adminCookie,
                "PATCH",
              )
            ).status,
            200,
          );
          assert.deepEqual(
            await (
              await request("commerce/track", {
                reference: created.trackingReference,
              })
            ).json(),
            {
              reference: created.trackingReference,
              status: "CONFIRMED",
              message: "Your reservation has been approved.",
            },
          );
          assert.equal(
            (await request("export", undefined, adminCookie)).status,
            200,
          );
          assert.equal(
            (await request("export", undefined, staffCookie)).status,
            403,
          );
        },
      );
      await t.test(
        "public tracking covers every decision, legacy protection, validation, throttling and database errors",
        async () => {
          const { hash } = await import("../src/lib/booking/security");
          await db().query("DELETE FROM rate_limits WHERE key=$1", [
            hash("public-track:shared"),
          ]);
          const config = await operationalSettings();
          const submit = async () => {
            const payload = input(
              [item(dining.id, nextDate(), { slot: "12:00" })],
              {
                policyVersion: config.policy_version,
                guestEmail: randomUUID() + "@example.test",
              },
            );
            const response = await request("commerce/checkout", payload);
            assert.equal(response.status, 201, await response.clone().text());
            const created = await response.json();
            const retry = await request("commerce/checkout", payload);
            assert.deepEqual(
              await retry.json(),
              created,
              "Retries preserve both references",
            );
            return {
              ...created,
              cookie: response.headers.get("set-cookie")!.split(";")[0],
              id: await idFor(created.reference),
            };
          };
          const approved = await submit(),
            declined = await submit(),
            cancelled = await submit();
          assert.equal(
            new Set([
              approved.trackingReference,
              declined.trackingReference,
              cancelled.trackingReference,
            ]).size,
            3,
          );
          const track = (reference: string) =>
            request("commerce/track", { reference });
          for (const b of [approved, declined, cancelled]) {
            assert.deepEqual(await (await track(b.trackingReference)).json(), {
              reference: b.trackingReference,
              status: "PENDING_APPROVAL",
              message: "Your reservation is awaiting confirmation.",
            });
            assert.equal((await track(b.reference)).status, 404);
            assert.equal(
              (
                await request(
                  "commerce/track",
                  { reference: b.reference },
                  b.cookie,
                )
              ).status,
              404,
            );
          }
          for (const [b, status] of [
            [approved, "CONFIRMED"],
            [declined, "DECLINED"],
            [cancelled, "CANCELLED"],
          ] as const) {
            const updated = await request(
              "commerce/admin/status/" + b.id,
              {
                status,
                version: 1,
                reason: "Private staff explanation for this isolated fixture.",
              },
              adminCookie,
            );
            assert.equal(updated.status, 200, await updated.clone().text());
            const lookup = await track(b.trackingReference.toLowerCase());
            assert.equal(
              lookup.headers.get("cache-control"),
              "private, no-store",
            );
            assert.deepEqual(await lookup.json(), {
              reference: b.trackingReference,
              status,
              message:
                status === "CONFIRMED"
                  ? "Your reservation has been approved."
                  : status === "DECLINED"
                    ? "Your reservation request was declined."
                    : "Your reservation has been cancelled.",
            });
            const history = (
              await db().query(
                "SELECT new_status FROM booking_activity_logs WHERE booking_id=$1 ORDER BY id",
                [b.id],
              )
            ).rows;
            assert.equal(history.at(-1)?.new_status, status);
          }
          for (const reference of [
            "PDJT-" + "0".repeat(48),
            "PDJ-2026-000004",
            "' OR 1=1 --",
            "PDJT-<script>",
          ]) {
            const invalid = await track(reference);
            assert.equal(invalid.status, 404);
            assert.deepEqual(await invalid.json(), {
              error: "No matching reservation was found.",
            });
          }
          assert.equal((await track("")).status, 400);
          assert.equal((await track("a".repeat(81))).status, 400);
          assert.equal((await track("a".repeat(500))).status, 413);
          assert.equal(
            (
              await request("commerce/track", {
                reference: approved.trackingReference,
                email: "private@example.test",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "commerce/track",
                { reference: approved.trackingReference },
                "",
                "POST",
                "https://untrusted.example",
              )
            ).status,
            403,
          );
          const matched = await (
            await request(
              "bookings?q=" + approved.trackingReference,
              undefined,
              adminCookie,
            )
          ).json();
          assert.equal(matched.length, 1);
          assert.equal(
            matched[0].public_tracking_reference,
            approved.trackingReference,
          );
          assert.equal(matched[0].reference_number, approved.reference);
          // An existing private session may exchange its old number, anonymous callers may not.
          await db().query(
            "UPDATE bookings SET public_tracking_reference=NULL WHERE id=$1",
            [declined.id],
          );
          assert.equal(
            (
              await request("commerce/tracking-reference", {
                reference: declined.reference,
              })
            ).status,
            401,
          );
          const recovered = await request(
            "commerce/tracking-reference",
            { reference: declined.reference },
            declined.cookie,
          );
          assert.equal(recovered.status, 200);
          const recovery = await recovered.json();
          assert.match(recovery.trackingReference, /^PDJT-[A-F0-9]{48}$/);
          assert.equal(
            (await (await track(recovery.trackingReference)).json()).status,
            "DECLINED",
          );
          // Previously issued single-use links still recover a reference on a fresh device.
          const secret = randomBytes(32).toString("hex");
          await db().query(
            "INSERT INTO guest_access_requests(booking_id,token_hash,token_encrypted,expires_at) VALUES($1,$2,'unused-test-ciphertext',now()+interval '30 minutes')",
            [declined.id, hash(secret)],
          );
          const exchanged = await request("commerce/access/consume", {
            reference: declined.reference,
            token: secret,
          });
          assert.equal(exchanged.status, 200, await exchanged.clone().text());
          assert.deepEqual(await exchanged.json(), recovery);
          assert.equal(
            (
              await request("commerce/access/consume", {
                reference: declined.reference,
                token: secret,
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await request(
                "commerce/admin/tracking-reference/" + declined.id,
                {},
              )
            ).status,
            401,
          );
          assert.equal(
            (
              await (
                await request(
                  "commerce/admin/tracking-reference/" + declined.id,
                  {},
                  staffCookie,
                )
              ).json()
            ).trackingReference,
            recovery.trackingReference,
          );
          const stored = await request(
            "commerce/admin/reservation/" + approved.id,
            undefined,
            adminCookie,
          );
          assert.equal(
            (await stored.json()).public_tracking_reference,
            approved.trackingReference,
          );
          // Clear only this isolated test limiter, then assert the actual HTTP boundary and expiry.
          const key = hash("public-track:shared");
          await db().query("DELETE FROM rate_limits WHERE key=$1", [key]);
          for (let n = 0; n < 30; n++)
            assert.equal((await track(approved.trackingReference)).status, 200);
          const limited = await track(approved.trackingReference);
          assert.equal(limited.status, 429);
          assert.deepEqual(await limited.json(), {
            error: "Too many attempts. Please try again later.",
          });
          await db().query(
            "UPDATE rate_limits SET expires_at=now()-interval '1 second' WHERE key=$1",
            [key],
          );
          assert.equal((await track(approved.trackingReference)).status, 200);
          await db().query(
            "ALTER TABLE bookings RENAME COLUMN public_tracking_reference TO test_hidden_tracking_reference",
          );
          try {
            const failed = await track(approved.trackingReference);
            assert.equal(failed.status, 503);
            const message = await failed.text();
            assert.match(message, /temporarily unavailable/);
            assert.doesNotMatch(
              message,
              /column|SELECT|PostgreSQL|test_hidden|guest/i,
            );
          } finally {
            await db().query(
              "ALTER TABLE bookings RENAME COLUMN test_hidden_tracking_reference TO public_tracking_reference",
            );
          }
          assert.equal((await track(approved.trackingReference)).status, 200);
          await db().query("DELETE FROM rate_limits WHERE key=$1", [key]);
        },
      );
      await t.test(
        "migration backfills missing legacy references once without changing reservation fields or previous history",
        async () => {
          const legacy = await createCart(
            input([item(dining.id, nextDate(), { slot: "12:00" })]),
          );
          const id = await idFor(legacy.reference);
          await db().query(
            "UPDATE bookings SET public_tracking_reference=NULL WHERE id=$1",
            [id],
          );
          const before = (
            await db().query(
              "SELECT to_jsonb(b)-'public_tracking_reference' value FROM bookings b WHERE id=$1",
              [id],
            )
          ).rows[0].value;
          const historyBefore = (
            await db().query(
              "SELECT id FROM booking_activity_logs WHERE booking_id=$1 ORDER BY id",
              [id],
            )
          ).rows;
          await migrate();
          const saved = (
            await db().query(
              "SELECT public_tracking_reference,to_jsonb(b)-'public_tracking_reference' value FROM bookings b WHERE id=$1",
              [id],
            )
          ).rows[0];
          assert.match(saved.public_tracking_reference, /^PDJT-[A-F0-9]{48}$/);
          assert.deepEqual(saved.value, before);
          assert.deepEqual(
            (
              await db().query(
                "SELECT id FROM booking_activity_logs WHERE booking_id=$1 AND action<>'PUBLIC_TRACKING_REFERENCE_CREATED' ORDER BY id",
                [id],
              )
            ).rows,
            historyBefore,
          );
          await migrate();
          assert.equal(
            (
              await db().query(
                "SELECT public_tracking_reference FROM bookings WHERE id=$1",
                [id],
              )
            ).rows[0].public_tracking_reference,
            saved.public_tracking_reference,
          );
          assert.equal(
            (
              await db().query(
                "SELECT count(*)::int n FROM booking_activity_logs WHERE booking_id=$1 AND action='PUBLIC_TRACKING_REFERENCE_CREATED'",
                [id],
              )
            ).rows[0].n,
            1,
          );
          assert.equal(
            (
              await request("commerce/track", {
                reference: saved.public_tracking_reference,
              })
            ).status,
            200,
          );
        },
      );
      if (process.env.TRACKING_BROWSER_TESTS === "1")
        await t.test(
          "reference-only browser booking, reload, copy, new device, decisions and mobile layouts",
          async () => {
            const { hash } = await import("../src/lib/booking/security");
            await db().query("DELETE FROM rate_limits WHERE key=$1", [
              hash("public-track:shared"),
            ]);
            const fixture = await createCart(
              input([item(dining.id, nextDate(), { slot: "12:00" })]),
            );
            const { runPublicTrackingBrowserChecks } =
              await import("./helpers/public-tracking-browser");
            await runPublicTrackingBrowserChecks({
              baseUrl,
              visitDate: nextDate(),
              declinedReference: fixture.trackingReference,
              adminEmail: admin.email,
              adminPassword,
            });
          },
        );
      if (process.env.BOOKING_BROWSER_TESTS === "1")
        await t.test(
          "reservation-only dashboard and guest browser workflows at all requested widths",
          async () => {
            const { hash } = await import("../src/lib/booking/security");
            await db().query("DELETE FROM rate_limits WHERE key=$1", [
              hash("public-track:shared"),
            ]);
            await runAdminWorkspaceChecks({
              baseUrl,
              adminEmail: admin.email,
              staffEmail: staff.email,
              password: adminPassword,
              serviceName: "TEST ONLY Dining",
              visitDate: nextDate(),
            });
          },
        );
    } finally {
      web?.kill();
      if (process.env.DATABASE_URL) await db().end();
      await postgres.stop();
    }
  },
);
