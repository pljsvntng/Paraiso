import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:3000";
const directory = resolve(".local/showcase-review");
const details = [
  "/accommodations/family-deluxe/",
  "/pool-cottages/",
  "/adventures/#cable-jeep",
  "/dining/",
];
const names = ["Family Deluxe", "Main Pool", "Cable Jeep", "Dining Pavilion"];
const products = names.map((name, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  name,
  slug: ["family-deluxe", "main-pool", "cable-jeep", "dining-pavilion"][index],
  category: ["ACCOMMODATION", "SWIMMING", "ACTIVITY", "DINING"][index],
  active: true,
  overnight: index === 0,
  slots: [],
  amenities: [],
  photos: [],
  restrictions: "Fixture only",
  min_guests: 1,
  max_guests: 4,
  min_age: null,
  price: null,
  child_price: null,
  price_basis: "UNIT",
  description: "Browser fixture only; no database write.",
}));
type Metrics = { cls: number; lcp: number; reveals: string[] };

async function main() {
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  const errors: string[] = [];
  const summary: Record<string, unknown> = {};
  try {
    const context = await browser.newContext({
      reducedMotion: "no-preference",
    });
    await context.route("https://www.google.com/maps/embed**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<p>Existing third-party map excluded from local UI verification.</p>",
      }),
    );
    await context.addInitScript(() => {
      const metrics = { cls: 0, lcp: 0, reveals: [] as string[] };
      (window as unknown as { homeMetrics: Metrics }).homeMetrics = metrics;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!shift.hadRecentInput) metrics.cls += shift.value || 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        metrics.lcp = list.getEntries().at(-1)?.startTime || 0;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      document.addEventListener("animationstart", (event) => {
        if ((event.target as Element)?.closest(".home-page"))
          metrics.reveals.push(event.animationName);
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(base);
      await page.locator(".hero-photo").evaluate(async (element) => {
        await (element as HTMLImageElement).decode();
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        (
          window as unknown as { homeMetrics: Metrics }
        ).homeMetrics.reveals.includes("reveal-mask"),
      );
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.getByRole("tab").count(), 4);
      assert.equal(await page.getByRole("tabpanel").count(), 1);
      await page.locator(".showcase-stage").scrollIntoViewIfNeeded();
      const originalUrl = page.url();
      const stageHeight = await page
        .locator(".showcase-stage")
        .evaluate((node) => node.getBoundingClientRect().height);
      for (let index = 0; index < 4; index++) {
        await page.getByRole("tab").nth(index).click();
        await page.waitForFunction(
          (expected) =>
            document
              .querySelectorAll('[role="tab"]')
              [expected].getAttribute("aria-selected") === "true",
          index,
        );
        const panel = page.getByRole("tabpanel");
        assert.equal(
          await panel.getByRole("heading").innerText(),
          names[index],
        );
        await page
          .locator('.showcase-image[data-active="true"] img')
          .evaluate(async (element) => {
            await (element as HTMLImageElement).decode();
          });
        assert.equal(
          await panel.locator(".showcase-explore").getAttribute("href"),
          details[index],
        );
        assert.ok(
          (
            await page.locator(".showcase-image-counter").innerText()
          ).startsWith("0" + (index + 1)),
        );
        assert.equal(
          page.url(),
          originalUrl,
          "Switching experiences must not navigate",
        );
        assert.ok(
          Math.abs(
            (await page
              .locator(".showcase-stage")
              .evaluate((node) => node.getBoundingClientRect().height)) -
              stageHeight,
          ) < 1,
          "Panel height must stay stable",
        );
      }
      await page.getByRole("tab").first().click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="tab"]')
            ?.getAttribute("aria-selected") === "true",
      );
      await page.locator(".home-end").scrollIntoViewIfNeeded();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Homepage overflow at " + width,
      );
      assert.equal(
        await page.locator(".image-fallback").count(),
        0,
        "Image fallback at " + width,
      );
      await page.waitForFunction(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length ===
          0,
      );
      const metrics = await page.evaluate(
        () => (window as unknown as { homeMetrics: Metrics }).homeMetrics,
      );
      assert.ok(metrics.cls < 0.1, `Layout shift at ${width}: ${metrics.cls}`);
      assert.ok(
        metrics.reveals.includes("reveal-mask"),
        "Hero entrance must run",
      );
      assert.ok(
        metrics.reveals.includes("reveal-fade"),
        "Showcase photograph reveal must run",
      );
      assert.equal(
        await page
          .locator(".hero-photo")
          .evaluate((element) => getComputedStyle(element).animationName),
        "none",
        "Hero photograph must remain stable",
      );
      summary[String(width)] = metrics;
      if ([390, 1440].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: resolve(directory, `homepage-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
        await page.screenshot({
          path: resolve(directory, `hero-${width}.png`),
          fullPage: false,
          animations: "disabled",
        });
        await page.locator(".showcase-heading").scrollIntoViewIfNeeded();
        await page.waitForFunction(
          () =>
            !document
              .querySelector(".site-header")
              ?.classList.contains("header-hero"),
        );
        await page.screenshot({
          path: resolve(directory, `featured-${width}.png`),
          fullPage: false,
          animations: "disabled",
        });
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Open navigation menu", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Accommodations", exact: true })
      .click();
    await page.waitForURL(/\/accommodations\//);
    await page
      .getByRole("heading", { name: "Accommodations", exact: true })
      .waitFor();
    await page.goto(base);
    await page
      .getByRole("button", { name: "Open navigation menu", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("dialog", { name: "Main navigation", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(
      await page
        .getByRole("dialog", { name: "Main navigation", exact: true })
        .isVisible(),
      false,
    );

    // Verify actual destinations exist, including the Cable Jeep anchor.
    for (const href of details) {
      const response = await page.request.get(
        new URL(href.split("#")[0], base).href,
      );
      assert.equal(response.status(), 200, href);
      if (href.includes("#"))
        assert.match(await response.text(), /id="cable-jeep"/);
    }
    await page.goto(base);
    await page.locator(".hero-actions a[href^='/booking/']").click();
    await page.waitForURL(/\/booking\//);
    await page.getByRole("heading", { name: /Your next escape/ }).waitFor();
    await page.goto(base + "/booking/track/");
    await page.getByLabel("Reservation Reference Number").waitFor();
    assert.equal(await page.locator('input[type="email"]').count(), 0);
    await context.close();

    // Catalog fixtures are intercepted in the browser; no database data is changed.
    const fixtures = await browser.newContext({ reducedMotion: "reduce" });
    await fixtures.route("https://www.google.com/maps/embed**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>Map preview</p>" }),
    );
    let catalogRequests = 0;
    await fixtures.route("**/api/reservations/commerce/catalog/**", (route) => {
      catalogRequests++;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          products,
          configured: true,
          settings: {},
          addons: [],
        }),
      });
    });
    const fixture = await fixtures.newPage();
    fixture.on("pageerror", (error) => errors.push(error.message));
    await fixture.goto(base);
    await fixture.locator("#featured-experiences").scrollIntoViewIfNeeded();
    await fixture
      .getByRole("link", { name: "Reserve Now — Family Deluxe", exact: true })
      .waitFor();
    assert.equal(
      catalogRequests,
      1,
      "Featured actions share one deferred catalog request",
    );
    for (const [index, name] of names.entries()) {
      await fixture.getByRole("tab").nth(index).click();
      await fixture.waitForFunction(
        (expected) =>
          document
            .querySelectorAll('[role="tab"]')
            [expected].getAttribute("aria-selected") === "true",
        index,
      );
      const href = await fixture
        .getByRole("link", { name: `Reserve Now — ${name}`, exact: true })
        .getAttribute("href");
      assert.equal(new URL(href!, base).searchParams.get("subject"), name);
    }
    assert.equal(
      await fixture.evaluate(() => document.getAnimations().length),
      0,
      "Reduced motion should not animate",
    );
    await fixture.getByRole("tab").first().click();
    await fixture.waitForFunction(
      () =>
        document
          .querySelector('[role="tab"]')
          ?.getAttribute("aria-selected") === "true",
    );
    const familyLink = fixture.getByRole("link", {
      name: "Reserve Now — Family Deluxe",
      exact: true,
    });
    await fixtures.route("**/api/reservations/calendar/**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ days: [] }),
      }),
    );
    await familyLink.click();
    await fixture.waitForURL(/booking/);
    await fixture.getByLabel("Reservation category").waitFor();
    assert.equal(
      await fixture.getByLabel("Reservation category").inputValue(),
      "ACCOMMODATION",
    );
    assert.equal(
      await fixture.locator('.reservation-option[aria-pressed="true"]').count(),
      1,
      "Booking preselects the matching service",
    );
    await fixtures.unroute("**/api/reservations/commerce/catalog/**");
    await fixtures.route("**/api/reservations/commerce/catalog/**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unavailable" }),
      }),
    );
    await fixture.goto(base);
    await fixture.locator("#featured-experiences").scrollIntoViewIfNeeded();
    assert.equal(
      await fixture.getByRole("link", { name: /^Reserve Now/ }).count(),
      0,
    );
    assert.equal(
      await fixture
        .locator('.featured-booking-link[href^="/contact/"]')
        .count(),
      4,
      "Catalog failure preserves inquiries",
    );
    await fixtures.close();

    const staticContext = await browser.newContext({
      javaScriptEnabled: false,
    });
    const staticPage = await staticContext.newPage();
    await staticPage.goto(base);
    assert.equal(await staticPage.getByRole("tab").count(), 4);
    assert.equal(await staticPage.locator(".showcase-noscript a").count(), 4);
    assert.equal(await staticPage.locator("#featured-title").isVisible(), true);
    await staticContext.close();
    assert.deepEqual(errors, []);
    await writeFile(
      resolve(directory, "verification.json"),
      JSON.stringify(
        { widths: summary, consoleErrors: errors, result: "passed" },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        result: "passed",
        widths: Object.keys(summary),
        screenshots: directory,
        metrics: summary,
      }),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
