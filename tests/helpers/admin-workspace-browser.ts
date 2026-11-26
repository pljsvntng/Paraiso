import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";
import ExcelJS from "exceljs";
type Fixture = {
  baseUrl: string;
  adminEmail: string;
  staffEmail: string;
  password: string;
  serviceName: string;
  visitDate: string;
};
export async function runEmptyDashboardChecks(
  f: Pick<Fixture, "baseUrl" | "adminEmail" | "password">,
) {
  const directory = resolve(".local/dashboard-ui-audit/empty");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 844 },
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(f.baseUrl + "/admin/login/");
    await page.getByLabel("Email address", { exact: true }).fill(f.adminEmail);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    await page.waitForURL(/admin\/dashboard/);
    await page.locator(".admin-kpi").first().waitFor();
    assert.deepEqual(
      await page.locator(".admin-kpi > strong").allTextContents(),
      Array(8).fill("0"),
    );
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.screenshot({
        path: resolve(directory, `empty-overview-${width}.png`),
        fullPage: true,
      });
    }
    for (const tab of ["reservations", "guests", "reports", "calendar"]) {
      await page.goto(f.baseUrl + "/admin/dashboard/?tab=" + tab);
      await page.locator(".admin-loading").waitFor({ state: "hidden" });
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.locator(".admin-workspace [role=alert]").count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (tab !== "calendar")
        assert.ok(await page.locator(".admin-empty").count());
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
export async function runAdminWorkspaceChecks(f: Fixture) {
  const directory = resolve(".local/reservation-only-cleanup");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(20000);
  const errors: string[] = [];
  const unexpectedUnauthorized: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() === 401 && r.url().includes("/api/reservations/"))
      unexpectedUnauthorized.push(r.url());
  });
  async function login(p: Page, email: string) {
    await p.goto(f.baseUrl + "/admin/login/");
    await p.getByLabel("Email address", { exact: true }).fill(email);
    await p.getByLabel("Password", { exact: true }).fill(f.password);
    await p
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    await p.waitForURL(/admin\/dashboard/);
    await p.locator(".admin-kpi").first().waitFor();
  }
  async function navigate(name: string) {
    const trigger = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    if (await trigger.isVisible()) await trigger.click();
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForFunction(
      (label) =>
        [
          ...document.querySelectorAll(
            '.sidebar-group button[aria-current="page"]',
          ),
        ].some((n) => n.getAttribute("aria-label") === label),
      name,
    );
    await page.waitForLoadState("networkidle");
    await page.locator(".admin-loading").waitFor({ state: "hidden" });
  }
  async function noOverflow(label: string) {
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      label,
    );
    if (await page.locator(".reservation-desktop-table").isVisible()) {
      const statuses = await page
        .locator(".reservation-directory .admin-badge")
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            height: n.getBoundingClientRect().height,
            line: parseFloat(getComputedStyle(n).lineHeight),
          })),
        );
      assert.ok(
        statuses.every((s) => s.height <= s.line + 10),
        label + ": reservation statuses must fit on one line",
      );
    }
    assert.equal(
      await page.locator(".form-error[role=alert]").count(),
      0,
      label +
        " API errors: " +
        (await page.locator(".form-error[role=alert]").allTextContents()).join(
          "; ",
        ),
    );
  }
  async function openReference(ref: string) {
    await navigate("All reservations");
    await page.getByLabel("Guest or reference", { exact: true }).fill(ref);
    await page
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".reservation-desktop-table tbody tr")
          .length === 1,
    );
    await page
      .getByRole("button", { name: "View & manage", exact: true })
      .click();
    await page.locator(".reservation-drawer[open]").waitFor();
  }
  try {
    await page.goto(f.baseUrl + "/booking/");
    await page.getByLabel("Reservation category").selectOption("DINING");
    await page.getByRole("button", { name: new RegExp(f.serviceName) }).click();
    await page.getByLabel("Visit date").fill(f.visitDate);
    await page.getByLabel("Session / time").selectOption("12:00");
    await page.getByRole("checkbox", { name: /restrictions/ }).check();
    await page
      .getByRole("button", {
        name: "Check availability & add service",
        exact: true,
      })
      .click();
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await noOverflow("Guest form " + width);
      assert.equal(
        await page
          .locator(
            'input[name*="payment"],input[name*="transaction"],input[type=file]',
          )
          .count(),
        0,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Reservation Browser Guest");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("reservation-browser@example.test");
    await page
      .getByLabel("Contact number", { exact: true })
      .fill("09171234567");
    for (const checkbox of await page.getByRole("checkbox").all())
      await checkbox.check();
    await page
      .getByRole("button", { name: "Submit Reservation Request", exact: true })
      .click();
    await page.waitForURL(/booking\/confirmation/);
    await page
      .getByRole("heading", { name: "Reservation Request Submitted!" })
      .waitFor();
    const ref = page.url().split("/").filter(Boolean).at(-1)!;
    await page
      .getByRole("link", { name: "Track Reservation", exact: true })
      .click();
    await page
      .getByText("Your reservation is awaiting confirmation.", { exact: true })
      .first()
      .waitFor();
    await login(page, f.adminEmail);
    assert.equal(await page.locator(".admin-kpi").count(), 8);
    for (const forbidden of [
      "Payments",
      "Financial reports",
      "Payment verification",
    ])
      assert.equal(
        await page
          .getByRole("button", { name: forbidden, exact: true })
          .count(),
        0,
      );
    // Browser navigation must update the rendered screen as well as the URL.
    await page.setViewportSize({ width: 1440, height: 950 });
    await page
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .waitFor();
    await noOverflow("Collapsed desktop sidebar");
    await page
      .getByRole("button", { name: "Expand sidebar", exact: true })
      .click();
    await navigate("All reservations");
    await page
      .getByRole("link", { name: "Paraiso resort management", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Reservation dashboard", exact: true })
      .waitFor();
    await page.locator(".admin-kpi").first().waitFor();
    assert.equal(await page.locator(".admin-kpi").count(), 8);
    // Analytics is auxiliary to the service catalog: its failure must not hide inventory.
    const insightsRoute = "**/api/reservations/commerce/admin/insights/**";
    await page.route(insightsRoute, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Analytics temporarily unavailable." }),
      }),
    );
    await navigate("Dining");
    await page
      .getByRole("heading", { name: f.serviceName, exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Retry loading", exact: true })
      .waitFor();
    await page.unroute(insightsRoute);
    await page
      .getByRole("button", { name: "Retry loading", exact: true })
      .click();
    await page.locator(".admin-load-error").waitFor({ state: "hidden" });
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await navigate("Dashboard");
      await noOverflow("Dashboard " + width);
      assert.equal(await page.locator(".admin-kpi").count(), 8);
      await page.screenshot({
        path: resolve(directory, `dashboard-${width}.png`),
        fullPage: true,
      });
      for (const screen of [
        "All reservations",
        "Pending requests",
        "Booking calendar",
        "Guest records",
        "Reservation reports",
        "Resort settings",
        "Dining",
      ]) {
        await navigate(screen);
        await noOverflow(screen + " " + width);
      }
      if (width === 320) {
        await navigate("Booking calendar");
        for (const view of ["day", "week", "month"]) {
          await page
            .getByLabel("Calendar view", { exact: true })
            .selectOption(view);
          await noOverflow("Calendar " + view);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await openReference("Reservation Browser Guest");
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page
      .getByRole("button", { name: "Approve Reservation", exact: true })
      .click();
    await page.locator(".decision-panel").waitFor();
    assert.equal(await page.getByRole("dialog").count(), 1);
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await noOverflow("Staff approval " + width);
      const box = await page
        .locator(".reservation-drawer")
        .evaluate((node) => ({
          scroll: node.scrollWidth,
          width: node.clientWidth,
          bounds: (() => {
            const r = node.getBoundingClientRect();
            return (
              r.left >= -1 &&
              r.top >= -1 &&
              r.right <= innerWidth + 1 &&
              r.bottom <= innerHeight + 1
            );
          })(),
        }));
      assert.ok(box.scroll <= box.width + 1);
      assert.ok(
        box.bounds,
        "Approval dialog stays within the viewport at " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve(directory, "approval-390.png"),
      fullPage: false,
    });
    await page
      .locator(".decision-panel")
      .getByRole("button", { name: "Approve Reservation", exact: true })
      .click();
    await page.locator(".decision-panel").waitFor({ state: "hidden" });
    await page
      .locator(".reservation-drawer")
      .getByText("Confirmed", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.goto(f.baseUrl + "/booking/track/?reference=" + ref);
    await page
      .getByText("Your reservation has been approved.", { exact: true })
      .first()
      .waitFor();
    assert.equal(await page.locator("input[type=file]").count(), 0);
    const catalog = await (
        await page.request.get(
          f.baseUrl + "/api/reservations/commerce/catalog/",
        )
      ).json(),
      product = catalog.products.find(
        (p: { name: string }) => p.name === f.serviceName,
      );
    const raw = {
      items: [
        {
          productId: product.id,
          checkIn: f.visitDate,
          adults: 2,
          children: 0,
          units: 1,
          slot: "12:00",
          restrictionsAccepted: true,
          participantsMeetAge: true,
        },
      ],
      guestName: "Decline Browser Guest",
      guestEmail: "decline-browser@example.test",
      guestPhone: "09171234567",
      requestKey: randomUUID(),
      consent: true,
      termsAccepted: true,
      cancellationAccepted: true,
      policyVersion: catalog.settings.policy_version,
    };
    const created = await page.request.post(
      f.baseUrl + "/api/reservations/commerce/checkout/",
      { headers: { Origin: f.baseUrl }, data: raw },
    );
    assert.equal(created.status(), 201);
    const declined = (await created.json()).reference;
    await page.goto(f.baseUrl + "/admin/dashboard/");
    await openReference(declined);
    await page
      .getByRole("button", { name: "Decline Reservation", exact: true })
      .click();
    await page
      .getByLabel("Reason for declining")
      .fill("The requested dining arrangements are unavailable on this date.");
    const decisionRoute = "**/api/reservations/bookings/*/";
    await page.route(decisionRoute, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Availability changed. Please retry.",
            }),
          })
        : route.continue(),
    );
    await page
      .locator(".decision-panel")
      .getByRole("button", { name: "Decline Reservation", exact: true })
      .click();
    await page
      .locator(".reservation-drawer [role=alert]")
      .filter({ hasText: "Availability changed. Please retry." })
      .waitFor();
    assert.equal(
      await page.getByLabel("Reason for declining").inputValue(),
      "The requested dining arrangements are unavailable on this date.",
    );
    assert.equal(await page.locator(".decision-panel").count(), 1);
    await page.unroute(decisionRoute);
    await page
      .locator(".decision-panel")
      .getByRole("button", { name: "Decline Reservation", exact: true })
      .click();
    await page.locator(".decision-panel").waitFor({ state: "hidden" });
    await page
      .locator(".reservation-drawer")
      .getByText("Declined", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.goto(f.baseUrl + "/booking/track/?reference=" + declined);
    await page
      .getByText("Your reservation request was declined.", { exact: true })
      .waitFor();
    assert.doesNotMatch(
      await page.locator(".tracking-result").innerText(),
      /The requested dining arrangements|Decline Browser Guest|decline-browser@example.test/,
      "Public status results must omit guest details and private staff explanations",
    );
    await page.screenshot({
      path: resolve(directory, "declined-tracker-390.png"),
      fullPage: true,
    });
    await page.goto(f.baseUrl + "/admin/dashboard/");
    for (const screen of [
      "Accommodations",
      "Swimming & cottages",
      "Adventures",
      "Dining",
      "Availability management",
      "Staff accounts",
      "Resort settings",
      "Reservation policies",
      "Activity logs",
    ]) {
      await navigate(screen);
      await noOverflow(screen);
      assert.equal(
        await page.getByText("Payment status", { exact: true }).count(),
        0,
      );
    }
    // Exercise a real service save against the isolated PostgreSQL fixture.
    await navigate("Dining");
    await page
      .getByRole("button", { name: `Manage ${f.serviceName}`, exact: true })
      .click();
    await page.locator(".service-editor-drawer[open]").waitFor();
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await noOverflow("Service editor " + width);
      assert.equal(
        await page
          .locator(".service-editor-drawer")
          .evaluate((n) => n.scrollWidth > n.clientWidth + 1),
        false,
      );
    }
    await page
      .getByLabel("Description", { exact: true })
      .fill("Updated isolated browser fixture service.");
    await page
      .getByRole("button", { name: "Save option", exact: true })
      .click();
    await page.locator(".service-editor-drawer").waitFor({ state: "hidden" });
    await page
      .getByText("Updated isolated browser fixture service.", { exact: true })
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("Guest records");
    const guestsRoute = "**/api/reservations/commerce/admin/guests/**";
    await page.route(guestsRoute, (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/html",
        body: "Service unavailable",
      }),
    );
    await page
      .getByRole("button", { name: "Search guests", exact: true })
      .click();
    // Change the search to trigger a request; the same query alone deliberately does not refetch.
    await page.getByLabel("Search guests", { exact: true }).fill("unavailable");
    await page
      .getByRole("button", { name: "Search guests", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry guest records", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("No matching guests", { exact: true }).count(),
      0,
    );
    await page.unroute(guestsRoute);
    await page
      .getByRole("button", { name: "Retry guest records", exact: true })
      .click();
    await page.locator(".admin-loading").waitFor({ state: "hidden" });
    await page
      .getByLabel("Search guests", { exact: true })
      .fill("reservation-browser@example.test");
    await page
      .getByRole("button", { name: "Search guests", exact: true })
      .click();
    await page
      .getByText("Reservation Browser Guest", { exact: true })
      .first()
      .waitFor();
    await page
      .locator(".guest-record-grid article")
      .filter({
        has: page.getByRole("heading", {
          name: "Reservation Browser Guest",
          exact: true,
        }),
      })
      .getByRole("button", { name: "View reservation history", exact: true })
      .click();
    await page
      .getByText("Guest history: reservation-browser@example.test", {
        exact: true,
      })
      .waitFor();
    await noOverflow("Guest reservation history");
    await navigate("Excel export");
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download reservation Excel", exact: true })
      .click();
    const download = await downloading,
      file = resolve(directory, "reservations.xlsx");
    await download.saveAs(file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    assert.equal(workbook.worksheets.length, 1);
    assert.equal(workbook.worksheets[0].columnCount, 16);
    assert.doesNotMatch(
      JSON.stringify(workbook.worksheets[0].getRow(1).values),
      /payment|balance|revenue|refund|amount/i,
    );
    // Use an existing combined fixture, whose optional address/contact fields were omitted.
    const records = await (
      await page.request.get(f.baseUrl + "/api/reservations/bookings/?page=1")
    ).json();
    const combined = records.find((r: { guest_summary?: string }) =>
      r.guest_summary?.includes("; "),
    );
    assert.ok(combined, "Expected an isolated combined reservation fixture");
    await openReference(combined.reference_number);
    assert.ok((await page.locator(".drawer-service").count()) > 1);
    await noOverflow("Combined reservation with omitted optional fields");
    await page.screenshot({
      path: resolve(directory, "combined-reservation-390.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    const staffContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      staffPage = await staffContext.newPage();
    await login(staffPage, f.staffEmail);
    staffPage.on("response", (r) => {
      if (r.status() === 401 && r.url().includes("/api/reservations/"))
        unexpectedUnauthorized.push(r.url());
    });
    await staffPage
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    for (const forbidden of [
      "Staff accounts",
      "Resort settings",
      "Accommodations",
      "Excel export",
      "Payments",
    ])
      assert.equal(
        await staffPage
          .getByRole("button", { name: forbidden, exact: true })
          .count(),
        0,
      );
    await staffPage.keyboard.press("Escape");
    staffPage.on("pageerror", (e) => errors.push(e.message));
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await staffPage.setViewportSize({ width, height: 950 });
      for (const tab of [
        "overview",
        "reservations",
        "calendar",
        "guests",
        "booking settings",
      ]) {
        await staffPage.goto(
          f.baseUrl + "/admin/dashboard/?tab=" + encodeURIComponent(tab),
        );
        await staffPage.locator(".admin-loading").waitFor({ state: "hidden" });
        await staffPage.waitForLoadState("networkidle");
        assert.equal(
          await staffPage.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `Staff ${tab} ${width}`,
        );
        assert.equal(
          await staffPage
            .locator(".admin-workspace .form-error[role=alert]")
            .count(),
          0,
        );
      }
    }
    await staffPage.setViewportSize({ width: 390, height: 844 });
    await staffPage.goto(f.baseUrl + "/admin/dashboard/?tab=settings");
    await staffPage
      .getByRole("heading", { name: "Reservation dashboard", exact: true })
      .waitFor();
    await staffPage.goto(f.baseUrl + "/admin/dashboard/?tab=reservations");
    await staffPage.locator(".admin-loading").waitFor({ state: "hidden" });
    await staffPage
      .getByRole("button", { name: "View & manage", exact: true })
      .first()
      .click();
    await staffPage.locator(".reservation-drawer[open]").waitFor();
    assert.equal(
      await staffPage
        .getByRole("button", { name: "Approve Reservation", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await staffPage
        .getByRole("button", { name: "Decline Reservation", exact: true })
        .count(),
      0,
    );
    await staffPage.keyboard.press("Escape");
    await staffPage.locator(".staff-menu summary").click();
    await staffPage
      .locator(".staff-menu")
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await staffPage.waitForURL(/admin\/login/);
    await staffContext.close();
    await page.locator(".staff-menu summary").click();
    await page
      .locator(".staff-menu")
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await page.waitForURL(/admin\/login/);
    assert.deepEqual(
      unexpectedUnauthorized,
      [],
      "Signing out must not reload protected dashboard APIs",
    );
    assert.equal(
      (
        await page.request.get(f.baseUrl + "/api/reservations/bookings/")
      ).status(),
      401,
    );
    assert.deepEqual(errors, []);
  } catch (error) {
    await page
      .screenshot({ path: resolve(directory, "failure.png"), fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}
