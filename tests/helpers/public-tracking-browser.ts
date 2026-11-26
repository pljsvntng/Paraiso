import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

export async function runPublicTrackingBrowserChecks(f: {
  baseUrl: string;
  visitDate: string;
  adminEmail: string;
  adminPassword: string;
  declinedReference: string;
}) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const directory = resolve(".local/tracking-tests");
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(f.baseUrl + "/booking/");
    await page.getByLabel("Reservation category").selectOption("DINING");
    await page.getByRole("button", { name: /TEST ONLY Dining/ }).click();
    await page.getByLabel("Visit date").fill(f.visitDate);
    await page.getByLabel("Session / time").selectOption("12:00");
    await page.getByRole("checkbox", { name: /restrictions/ }).check();
    await page
      .getByRole("button", {
        name: "Check availability & add service",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Private Tracking Browser Guest");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("tracking-browser@example.test");
    await page
      .getByLabel("Contact number", { exact: true })
      .fill("09171234567");
    for (const checkbox of await page.getByRole("checkbox").all())
      await checkbox.check();
    const submitted = page.waitForResponse(
      (r) =>
        r.url().includes("commerce/checkout") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Submit Reservation Request", exact: true })
      .click();
    const creation = await (await submitted).json();
    await page.waitForURL(/booking\/confirmation\/PDJT-/);
    await page
      .getByRole("heading", { name: "Reservation Request Submitted!" })
      .waitFor();
    assert.equal(
      await page.locator(".reservation-reference").innerText(),
      creation.trackingReference,
    );
    await page
      .getByRole("button", { name: "Copy Reference", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      creation.trackingReference,
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Pending Approval", exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "Track Reservation", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Pending Approval", exact: true })
      .waitFor();
    await context.close();

    // A fresh context models returning on another device with no receipt or guest session.
    const returning = await browser.newContext({ reducedMotion: "reduce" });
    const tracker = await returning.newPage();
    tracker.on("pageerror", (e) => errors.push(e.message));
    const check = async (reference: string, label: string) => {
      await tracker
        .getByLabel("Reservation Reference Number", { exact: true })
        .fill(reference);
      await tracker
        .getByRole("button", { name: "Track Reservation", exact: true })
        .click();
      await tracker
        .getByRole("heading", { name: label, exact: true })
        .waitFor();
    };
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await tracker.setViewportSize({ width, height: 950 });
      await tracker.goto(f.baseUrl + "/booking/track/");
      assert.equal(await tracker.locator(".tracking-panel input").count(), 1);
      assert.equal(await tracker.locator('input[type="email"]').count(), 0);
      await check(creation.trackingReference, "Pending Approval");
      assert.equal(
        await tracker.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Tracking overflow at " + width,
      );
      const text = await tracker.locator(".tracking-result").innerText();
      assert.doesNotMatch(
        text,
        /Private Tracking Browser Guest|tracking-browser|09171234567/,
      );
      if ([390, 1440].includes(width))
        await tracker.screenshot({
          path: resolve(directory, "tracking-" + width + ".png"),
          fullPage: true,
        });
    }
    const staffContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const staffPage = await staffContext.newPage();
    staffPage.setDefaultTimeout(15000);
    staffPage.on("pageerror", (e) => errors.push(e.message));
    await staffPage.goto(f.baseUrl + "/admin/login/");
    await staffPage.getByLabel("Email address").fill(f.adminEmail);
    await staffPage
      .getByLabel("Password", { exact: true })
      .fill(f.adminPassword);
    await staffPage
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    await staffPage.waitForURL(/admin\/dashboard/);
    const open = async (reference: string) => {
      await staffPage.goto(f.baseUrl + "/admin/dashboard/?tab=reservations");
      await staffPage.locator(".admin-loading").waitFor({ state: "hidden" });
      await staffPage
        .getByLabel("Guest or reference", { exact: true })
        .fill(reference);
      await staffPage
        .getByRole("button", { name: "Apply filters", exact: true })
        .click();
      await staffPage.waitForFunction((ref) => {
        const rows = document.querySelectorAll(
          ".reservation-desktop-table tbody tr",
        );
        return rows.length === 1 && rows[0].textContent?.includes(ref);
      }, reference);
      await staffPage
        .getByRole("button", { name: "View & manage", exact: true })
        .click();
      await staffPage.locator(".reservation-drawer[open]").waitFor();
      assert.equal(
        await staffPage
          .getByLabel("Public tracking reference", { exact: true })
          .inputValue(),
        reference,
      );
    };
    const decide = async (label: string, badge: string, reason?: string) => {
      await staffPage.getByRole("button", { name: label, exact: true }).click();
      if (reason)
        await staffPage.getByLabel("Reason for declining").fill(reason);
      await staffPage
        .locator(".decision-panel")
        .getByRole("button", { name: label, exact: true })
        .click();
      await staffPage.locator(".decision-panel").waitFor({ state: "hidden" });
      await staffPage
        .locator(".reservation-drawer .admin-badge")
        .filter({ hasText: badge })
        .waitFor();
    };
    await open(creation.trackingReference);
    for (const width of [320, 390, 768, 1440]) {
      await staffPage.setViewportSize({ width, height: 950 });
      assert.equal(
        await staffPage.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Staff reference overflow at " + width,
      );
      assert.equal(
        await staffPage
          .locator(".reservation-drawer")
          .evaluate((node) => node.scrollWidth > node.clientWidth + 1),
        false,
      );
      if ([390, 1440].includes(width))
        await staffPage.screenshot({
          path: resolve(directory, `staff-reference-${width}.png`),
          fullPage: false,
        });
    }
    await staffPage
      .getByRole("button", {
        name: "Copy public tracking reference",
        exact: true,
      })
      .click();
    const copied = await staffPage.evaluate(() =>
      navigator.clipboard.readText(),
    );
    assert.equal(
      copied,
      creation.trackingReference,
      "Staff and customer use exactly the same reference",
    );
    await check(copied, "Pending Approval");
    await decide("Approve Reservation", "Confirmed");
    await check(copied, "Approved");
    await decide("Cancel Reservation", "Cancelled");
    await check(copied, "Cancelled");
    await open(f.declinedReference);
    await decide(
      "Decline Reservation",
      "Declined",
      "Private staff reason must never appear in public tracking.",
    );
    await check(f.declinedReference, "Declined");
    await staffContext.close();
    await check(creation.reference, "Invalid Reference");
    await check("PDJT-" + "0".repeat(48), "Invalid Reference");
    await tracker.route("**/api/reservations/commerce/track/", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "The reservation service is temporarily unavailable. Please try again shortly.",
        }),
      }),
    );
    await tracker
      .getByLabel("Reservation Reference Number")
      .fill(creation.trackingReference);
    await tracker
      .getByRole("button", { name: "Track Reservation", exact: true })
      .click();
    await tracker
      .getByRole("alert")
      .filter({ hasText: "temporarily unavailable" })
      .waitFor();
    assert.equal(
      await tracker.locator(".tracking-result").count(),
      0,
      "Failures must clear stale results",
    );
    await returning.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
