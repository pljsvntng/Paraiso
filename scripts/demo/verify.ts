import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";
import ExcelJS from "exceljs";
import { loadDemoEnvironment, withDemoDatabase } from "../booking-demo";
import { db, type Staff } from "../../src/lib/booking/db";
import { setupDemo, resetDemo } from "./seed";
import { assertDemoTarget } from "../../src/lib/booking/demo-mode";
import { runJobs, syncExcel } from "../../src/lib/booking/jobs";
import { manilaDate } from "../../src/lib/dates";
import { createCart } from "../../src/lib/booking/cart";

async function verify() {
  loadDemoEnvironment();
  const runId = randomUUID().slice(0, 8);
  await withDemoDatabase(async () => {
    const base = process.env.APP_URL!,
      directory = resolve(".local/client-demo-audit");
    await mkdir(directory, { recursive: true });
    assert.equal(
      (await fetch(base + "/api/reservations/demo-mode/").then((r) => r.json()))
        .demoMode,
      true,
      "Start demo:dev or demo:start first",
    );
    const results: string[] = [],
      errors: string[] = [];
    const pass = (s: string) => {
      results.push(s);
      console.log("PASS " + s);
    };
    await resetDemo();
    const baseline = await db().query(
      "SELECT (SELECT count(*)::int FROM accommodation_types) services,(SELECT count(*)::int FROM accommodation_units) units",
    );
    await setupDemo();
    await setupDemo();
    assert.deepEqual(
      (
        await db().query(
          "SELECT (SELECT count(*)::int FROM accommodation_types) services,(SELECT count(*)::int FROM accommodation_units) units",
        )
      ).rows,
      baseline.rows,
    );
    assert.equal(baseline.rows[0].services, 16);
    assert.equal(baseline.rows[0].units, 13);
    pass("Idempotent catalog: 16 services, 13 physical units");
    // Exercise the safety gates before any destructive operation.
    for (const [key, value] of [
      ["PARAISO_DEMO_MODE", "false"],
      ["PARAISO_DEMO_TOKEN", "incorrect"],
      ["PARAISO_DEPLOYMENT_ENV", "production"],
      ["RENDER_SERVICE_ID", "hosted-test"],
      [
        "DATABASE_URL",
        process.env.DATABASE_URL!.replace("paraiso_client_demo", "paraiso_dev"),
      ],
    ]) {
      const prior = process.env[key];
      process.env[key] = value;
      await assert.rejects(() => resetDemo());
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
    const marker = (await db().query("SELECT token FROM paraiso_demo.identity"))
      .rows[0].token;
    try {
      await db().query("UPDATE paraiso_demo.identity SET token='invalid'");
      await assert.rejects(() => assertDemoTarget(db()));
    } finally {
      await db().query("UPDATE paraiso_demo.identity SET token=$1", [marker]);
    }
    pass(
      "Reset rejects missing flag, wrong token, hosted/production environment, wrong database and invalid database marker",
    );
    const delivery = await runJobs();
    assert.ok("demoSuppressed" in delivery && delivery.demoSuppressed);
    let external = false;
    await assert.rejects(() =>
      syncExcel({} as never, {} as never, {} as never, async () => {
        external = true;
        throw Error("Unexpected delivery");
      }),
    );
    assert.equal(external, false);
    pass(
      "Email/remote spreadsheet jobs suppressed, including direct sync calls",
    );
    const browser = await chromium.launch({
      headless: true,
      ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    });
    const guest = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      }),
      staffContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
    const page = await guest.newPage(),
      staffPage = await staffContext.newPage();
    page.setDefaultTimeout(30000);
    staffPage.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(90000);
    staffPage.setDefaultNavigationTimeout(90000);
    for (const p of [page, staffPage])
      p.on("pageerror", (e) => errors.push(e.message));
    const catalog = await fetch(
      base + "/api/reservations/commerce/catalog/",
    ).then((r) => r.json());
    const products = catalog.products as {
      id: string;
      slug: string;
      name: string;
      image: string;
      category: string;
      overnight: boolean;
      slots: string[];
    }[];
    const product = (slug: string) => products.find((p) => p.slug === slug)!;
    const day = (n: number) =>
      new Date(Date.parse(manilaDate()) + n * 86400000)
        .toISOString()
        .slice(0, 10);
    const item = (slug: string, n: number, units = 1) => ({
      productId: product(slug).id,
      checkIn: day(n),
      ...(product(slug).overnight ? { checkOut: day(n + 1) } : {}),
      adults: Math.max(2, units),
      children: 0,
      units,
      slot: product(slug).slots[0] || "",
      restrictionsAccepted: true,
      participantsMeetAge: true,
    });
    const input = (items: unknown[], name: string) => ({
      items,
      guestName: "DEMO Verify — " + name,
      guestEmail: `demo-verify-${runId}@example.test`,
      guestPhone: "09170000000",
      consent: true,
      termsAccepted: true,
      cancellationAccepted: true,
      requestKey: randomUUID(),
      policyVersion: catalog.settings.policy_version,
    });
    const request = async (
      p: Page,
      path: string,
      data?: unknown,
      method = "POST",
    ) => {
      const [pathname, query] = path.split("?");
      return p.request.fetch(
        base +
          "/api/reservations/" +
          pathname +
          "/" +
          (query ? "?" + query : ""),
        {
          method: data === undefined ? "GET" : method,
          headers: { Origin: base },
          ...(data === undefined ? {} : { data }),
        },
      );
    };
    async function login(email: string, password: string) {
      await staffPage.goto(base + "/admin/login/");
      await staffPage.getByLabel("Email address", { exact: true }).fill(email);
      await staffPage.getByLabel("Password", { exact: true }).fill(password);
      await staffPage
        .getByRole("button", { name: "Sign in securely", exact: true })
        .click();
      await staffPage.waitForURL(/admin\/dashboard/);
      await staffPage.locator(".admin-kpi").first().waitFor();
    }
    async function add(slug: string, n: number) {
      const p = product(slug);
      await page.getByLabel("Reservation category").selectOption(p.category);
      await page
        .getByRole("button", {
          name: new RegExp(p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        })
        .click();
      if (
        !(await page
          .getByLabel(p.overnight ? "Check-in" : "Visit date", { exact: true })
          .inputValue())
      ) {
        assert.equal(
          await page
            .getByRole("button", {
              name: "Check availability & add service",
              exact: true,
            })
            .isDisabled(),
          true,
        );
      }
      await page
        .getByLabel(p.overnight ? "Check-in" : "Visit date", { exact: true })
        .fill(day(n));
      if (p.overnight)
        await page.getByLabel("Check-out", { exact: true }).fill(day(n + 1));
      if (p.slots.length)
        await page.getByLabel("Session / time").selectOption(p.slots[0]);
      if (slug === "demo-day-swimming")
        await page.getByLabel("Children", { exact: true }).fill("1");
      await page
        .getByRole("checkbox", { name: /restrictions and confirm/ })
        .check();
      assert.equal(
        await page
          .getByRole("button", {
            name: "Check availability & add service",
            exact: true,
          })
          .isEnabled(),
        true,
      );
      await page
        .getByRole("button", {
          name: "Check availability & add service",
          exact: true,
        })
        .click();
      await page
        .getByText(
          p.name +
            " added. You can add another service or enter your guest details.",
          { exact: true },
        )
        .waitFor();
    }
    try {
      for (const p of products) {
        assert.ok(p.image);
        assert.equal((await fetch(base + p.image)).status, 200);
      }
      for (const path of [
        "/accommodations/family-deluxe/",
        "/pool-cottages/",
        "/adventures/",
        "/dining/",
      ]) {
        await page.goto(base + path);
        await page.locator(".public-booking-service a").first().waitFor();
        await page.locator(".public-booking-service a").first().click();
        await page.waitForURL(/booking\/\?subject=/);
        await page.locator(".reservation-option.selected").waitFor();
      }
      pass(
        "All four public sections link to selected bookable demo offerings; all 16 real source photos load",
      );
      await login(
        process.env.DEMO_ADMIN_EMAIL!,
        process.env.DEMO_ADMIN_PASSWORD!,
      );
      for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
        await staffPage.setViewportSize({ width, height: 950 });
        assert.equal(
          await staffPage.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await staffPage.screenshot({
          path: resolve(directory, `demo-dashboard-${width}.png`),
          fullPage: true,
        });
      }
      const cases = [
        { label: "Accommodation", slugs: ["family-deluxe"] },
        { label: "Swimming", slugs: ["demo-day-swimming"] },
        { label: "Adventure", slugs: ["atv"] },
        { label: "Dining", slugs: ["demo-dining"] },
        {
          label: "Combined",
          slugs: [
            "family-deluxe",
            "demo-day-swimming",
            "skywalk",
            "demo-dining",
          ],
        },
        { label: "Multiple Adventures", slugs: ["atv", "zipline"] },
        { label: "Cottage", slugs: ["demo-cottage"] },
      ];
      for (const [index, scenario] of cases.entries()) {
        await page.goto(base + "/booking/");
        await page.locator(".reservation-option").first().waitFor();
        for (const slug of scenario.slugs) await add(slug, 8 + index);
        if (index === 0) {
          for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 950 });
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
            );
          }
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({
            path: resolve(directory, "demo-booking-390.png"),
            fullPage: true,
          });
        }
        await page
          .getByLabel("Full name", { exact: true })
          .fill("DEMO Browser — " + scenario.label);
        await page
          .getByLabel("Email address", { exact: true })
          .fill(`demo-browser-${runId}-${index}@example.test`);
        await page
          .getByLabel("Contact number", { exact: true })
          .fill("09170000000");
        for (const checkbox of await page.getByRole("checkbox").all())
          await checkbox.check();
        await page
          .getByRole("button", {
            name: "Submit Reservation Request",
            exact: true,
          })
          .click();
        await page.waitForURL(/booking\/confirmation/);
        const ref = page.url().split("/").filter(Boolean).at(-1)!;
        const booking = (
          await db().query(
            "SELECT * FROM bookings WHERE public_tracking_reference=$1",
            [ref],
          )
        ).rows[0];
        assert.equal(booking.workflow_status, "PENDING_APPROVAL");
        assert.equal(
          (
            await db().query(
              "SELECT count(*)::int n FROM booking_items WHERE booking_id=$1",
              [booking.id],
            )
          ).rows[0].n,
          scenario.slugs.length,
        );
        if (index === 3) {
          await staffContext.clearCookies();
          await login(
            process.env.DEMO_STAFF_EMAIL!,
            process.env.DEMO_STAFF_PASSWORD!,
          );
        }
        await staffPage.setViewportSize({ width: 1440, height: 1000 });
        await staffPage.goto(base + "/admin/dashboard/?tab=pending");
        await staffPage
          .getByRole("button", {
            name: booking.public_tracking_reference,
            exact: true,
          })
          .click();
        await staffPage.locator(".reservation-drawer[open]").waitFor();
        const decline = index === 2,
          label = decline ? "Decline Reservation" : "Approve Reservation";
        await staffPage
          .getByRole("button", { name: label, exact: true })
          .click();
        if (decline)
          await staffPage
            .getByLabel("Reason for declining")
            .fill(
              "DEMO DATA: sample requested schedule unavailable for this presentation.",
            );
        await staffPage
          .locator(".decision-panel")
          .getByRole("button", { name: label, exact: true })
          .click();
        await staffPage.locator(".decision-panel").waitFor({ state: "hidden" });
        assert.equal(
          (
            await db().query(
              "SELECT workflow_status FROM bookings WHERE id=$1",
              [booking.id],
            )
          ).rows[0].workflow_status,
          decline ? "DECLINED" : "CONFIRMED",
        );
        if (index === 4)
          await staffPage.screenshot({
            path: resolve(directory, "demo-combined-details.png"),
            fullPage: false,
          });
        await page.goto(base + "/booking/track/?reference=" + ref);
        await page
          .getByText(
            decline
              ? "Your reservation request was declined."
              : "Your reservation has been approved.",
            { exact: true },
          )
          .first()
          .waitFor();
        pass(
          scenario.label +
            ": browser submit → PostgreSQL pending → staff " +
            (decline ? "decline with reason" : "approval") +
            " → public reference status tracking",
        );
      }
      await staffPage.goto(base + "/admin/dashboard/?tab=calendar");
      await staffPage.getByLabel("Calendar view", { exact: true }).waitFor();
      for (const view of ["day", "week", "month"])
        await staffPage
          .getByLabel("Calendar view", { exact: true })
          .selectOption(view);
      const calendar = await request(
        staffPage,
        `commerce/admin/calendar?from=${day(0)}&to=${day(30)}`,
      );
      assert.equal(calendar.status(), 200);
      // Use the export API actually consumed by the dashboard and parse the returned workbook.
      const excel = await request(staffPage, "export"),
        workbook = new ExcelJS.Workbook();
      assert.equal(excel.status(), 200);
      await workbook.xlsx.load(Buffer.from(await excel.body()) as never);
      assert.equal(workbook.worksheets.length, 1);
      assert.equal(workbook.worksheets[0].columnCount, 16);
      await writeFile(
        resolve(directory, "demo-reservations.xlsx"),
        await excel.body(),
      );
      pass("Calendar day/week/month and PostgreSQL reservation Excel export");
      const full = await request(
        page,
        "commerce/checkout",
        input([item("standard-cabin", 25, 3)], "Full inventory"),
      );
      assert.equal(full.status(), 201, await full.text());
      const fullRef = (await full.json()).reference,
        b = (
          await db().query(
            "SELECT id,version FROM bookings WHERE reference_number=$1",
            [fullRef],
          )
        ).rows[0];
      assert.equal(
        (
          await request(
            staffPage,
            `bookings/${b.id}`,
            { status: "CONFIRMED", version: b.version },
            "PATCH",
          )
        ).status(),
        200,
      );
      const unavailable = await request(
        page,
        "commerce/checkout",
        input([item("standard-cabin", 25)], "Capacity conflict"),
      );
      assert.equal(unavailable.status(), 409);
      const dates = await request(
        page,
        `calendar?productId=${product("standard-cabin").id}&checkIn=${day(25)}&adults=2&children=0&units=1&slot=`,
      );
      assert.equal((await dates.json()).days[0].available, false);
      pass(
        "Fully booked physical inventory rejects submission and marks calendar unavailable",
      );
      const invalid = await request(page, "commerce/checkout", {
        ...input([item("demo-dining", 28)], "Validation"),
        guestName: "Real guest",
        guestEmail: "guest@example.com",
      });
      assert.equal(invalid.status(), 400);
      assert.equal(
        (await request(staffPage, "commerce/gateway", {})).status(),
        410,
      );
      for (const table of [
        "payments",
        "payment_claims",
        "booking_charges",
        "checkout_attempts",
      ])
        assert.equal(
          (await db().query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,
          0,
        );
      pass(
        "Real guest details rejected; all payment endpoints retired and financial tables empty",
      );
      assert.deepEqual(errors, []);
    } catch (e) {
      await page
        .screenshot({
          path: resolve(directory, "failure-guest.png"),
          fullPage: true,
        })
        .catch(() => {});
      await staffPage
        .screenshot({
          path: resolve(directory, "failure-staff.png"),
          fullPage: true,
        })
        .catch(() => {});
      throw e;
    } finally {
      await browser.close();
    }
    // Prove reset preserves an explicitly unmarked synthetic reservation.
    const admin = (
      await db().query<Staff>("SELECT * FROM users WHERE email=$1", [
        process.env.DEMO_ADMIN_EMAIL,
      ])
    ).rows[0];
    const preserved = await createCart(
      input([item("demo-dining", 29)], "Unmarked preservation probe"),
      admin,
    );
    const sentinel = (
      await db().query("SELECT id FROM bookings WHERE reference_number=$1", [
        preserved.reference,
      ])
    ).rows[0].id;
    await db().query(
      "DELETE FROM paraiso_demo.records WHERE kind='booking' AND id=$1",
      [sentinel],
    );
    await resetDemo();
    assert.equal(
      (
        await db().query("SELECT count(*)::int n FROM bookings WHERE id=$1", [
          sentinel,
        ])
      ).rows[0].n,
      1,
    );
    await db().query("DELETE FROM bookings WHERE id=$1", [sentinel]); // Only the probe created immediately above.
    await resetDemo();
    assert.equal(
      (await db().query("SELECT count(*)::int n FROM bookings")).rows[0].n,
      5,
    );
    assert.equal(
      (await db().query("SELECT count(*)::int n FROM schema_migrations"))
        .rows[0].n,
      10,
    );
    pass(
      "Repeatable reset preserves unmarked data, keeps 10 migrations, restores five scenarios and creates no duplicate units",
    );
    await writeFile(
      resolve(directory, "demo-verification.json"),
      JSON.stringify(
        {
          passed: results,
          errors,
          sampleServices: 16,
          sampleUnits: 13,
          restoredReservations: 5,
        },
        null,
        2,
      ),
    );
  });
}
verify()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Demo verification failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await db().end();
  });
