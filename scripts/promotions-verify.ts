import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { promotions } from "../src/data/promotions";

const base = process.argv[2] || "http://127.0.0.1:3033";
const directory = resolve(".local/promotions-review");
const errors: string[] = [];
const results: string[] = [];

async function prepare(context: BrowserContext) {
  // Exclude the existing third-party map from local console/network checks.
  await context.route("https://www.google.com/maps/embed**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Map excluded from local verification.</p>",
    }),
  );
}
function watch(page: Page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}
async function noOverflow(page: Page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "page overflow",
  );
}
async function main() {
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  try {
    const context = await browser.newContext();
    await prepare(context);
    const page = await context.newPage();
    watch(page);
    await page.clock.setFixedTime(new Date("2026-11-22T04:00:00Z"));
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(base);
      const section = page.locator("#promotions");
      await section.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const el = document.querySelector("#promotions .promotions-heading")!;
        return getComputedStyle(el).opacity === "1";
      });
      assert.ok(await section.isVisible());
      assert.ok(await section.locator(".promotions-empty").isVisible());
      assert.equal(await section.locator(".promotion-card").count(), 3);
      assert.equal(await section.locator(".promotion-expired").count(), 3);
      assert.ok(
        await section
          .locator(".past-promotions")
          .evaluate((el) => (el as HTMLDetailsElement).open),
      );
      assert.ok(
        await page.evaluate(() => {
          const elements = [
            ".hero",
            "#your-escape",
            "#featured-experiences",
            "#promotions",
            ".home-gathering",
            ".home-faq",
            ".reviews-section",
            "#location",
            ".home-end",
          ].map((selector) => document.querySelector(selector));
          return elements.every(
            (el, i) =>
              el &&
              (!i ||
                Boolean(
                  elements[i - 1]!.compareDocumentPosition(el) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
                )),
          );
        }),
        "homepage order and preserved sections",
      );
      const cards = section.locator(".promotion-card");
      for (let index = 0; index < 3; index++) {
        const card = cards.nth(index);
        await card.scrollIntoViewIfNeeded();
        const img = card.locator(".promotion-poster img");
        await img.evaluate(async (el) => (el as HTMLImageElement).decode());
        await page.waitForFunction(
          (el) => el && getComputedStyle(el).opacity === "1",
          await card.elementHandle(),
        );
        assert.equal(
          await img.evaluate((el) => getComputedStyle(el).objectFit),
          "contain",
        );
        assert.equal(
          await card.locator(".promotion-poster").getAttribute("href"),
          promotions[index].image,
        );
      }
      await noOverflow(page);
      if ([390, 1440].includes(width)) {
        await section
          .locator(".promotions-grid")
          .evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
        await page.waitForFunction(
          () =>
            document.querySelector("#promotions .promotions-grid")!.scrollLeft <
            1,
        );
        await section.scrollIntoViewIfNeeded();
        await section.screenshot({
          path: resolve(directory, `promotions-${width}.png`),
          animations: "disabled",
          // Element captures span several viewports; omit unrelated fixed navigation.
          style: "header, .skip-link { visibility: hidden !important; }",
        });
      }
      results.push(
        `${width}px: visible section, correct order, 3 loaded original posters, no page overflow`,
      );
    }
    for (const item of promotions) {
      const button = page.getByRole("button", {
        name: `View past promotion: ${item.title}`,
        exact: true,
      });
      await button.click();
      const modal = page.locator(".promotion-dialog[open]");
      assert.ok(await modal.isVisible());
      await modal
        .locator("img")
        .evaluate(async (el) => (el as HTMLImageElement).decode());
      assert.match(await modal.innerText(), /no longer current/);
      assert.equal(await modal.locator('a[href^="/booking/"]').count(), 0);
      assert.equal(
        await modal
          .getByRole("link", { name: /Open original poster/ })
          .getAttribute("href"),
        item.image,
      );
      assert.equal(
        (await page.request.get(`${base}${item.image}`)).status(),
        200,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".promotion-dialog[open]").count(), 0);
      assert.ok(await button.evaluate((el) => el === document.activeElement));
    }
    results.push(
      "All 3 past previews: original image links return 200, no expired booking CTA, Escape and focus restoration work",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".past-promotions .promotions-grid").focus();
    await page.keyboard.press("End");
    await page.waitForFunction(
      () =>
        document.querySelector(".past-promotions .promotions-grid")!
          .scrollLeft > 100,
    );
    await page.keyboard.press("Home");
    await page.waitForFunction(
      () =>
        document.querySelector(".past-promotions .promotions-grid")!
          .scrollLeft < 2,
    );
    await page.getByRole("button", { name: "Next promotions" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".past-promotions .promotions-grid")!
          .scrollLeft > 100,
    );
    results.push("Mobile carousel: keyboard Home/End and next control work");
    assert.equal((await page.request.get(`${base}/contact/`)).status(), 200);
    // Use real offers at their original dates; no fabricated data or database writes.
    for (const [day, index] of [
      ["2026-06-27", 0],
      ["2026-06-15", 1],
      ["2026-05-25", 2],
    ] as const) {
      await page.clock.setFixedTime(new Date(`${day}T04:00:00Z`));
      await page.goto(base);
      const active = page.getByRole("region", {
        name: "Current resort announcements",
        exact: true,
      });
      await active.waitFor();
      assert.equal(await active.locator(".promotion-card").count(), 1);
      assert.equal(
        await active.locator("h3").innerText(),
        promotions[index].title,
      );
      await active
        .getByRole("button", { name: new RegExp(`^View details:`) })
        .click();
      const modal = page.locator(".promotion-dialog[open]");
      const inquiry = modal.getByRole("link", {
        name: /Inquire about this announcement/,
      });
      const href = await inquiry.getAttribute("href");
      assert.ok(href?.startsWith("/booking/"));
      assert.equal(
        new URL(href!, base).searchParams.get("subject"),
        promotions[index].title,
      );
      assert.equal((await page.request.get(`${base}${href}`)).status(), 200);
      await modal
        .getByRole("button", { name: "Close promotion preview" })
        .click();
      results.push(
        `${day}: original ${promotions[index].title} is current, preview and existing reservation link work`,
      );
    }
    await context.close();
    for (const options of [
      { reducedMotion: "reduce" as const },
      { javaScriptEnabled: false },
    ]) {
      const fallback = await browser.newContext({
        ...options,
        viewport: { width: 390, height: 844 },
      });
      await prepare(fallback);
      const tab = await fallback.newPage();
      watch(tab);
      await tab.goto(base);
      await tab.locator("#promotions").scrollIntoViewIfNeeded();
      assert.ok(await tab.locator("#promotions").isVisible());
      assert.equal(await tab.locator("#promotions .promotion-card").count(), 3);
      await noOverflow(tab);
      results.push(
        `${JSON.stringify(options)}: section and original poster fallback remain visible`,
      );
      await fallback.close();
    }
    if (existsSync(resolve(directory, "preserved-files.json"))) {
      const preserved = JSON.parse(
        await readFile(resolve(directory, "preserved-files.json"), "utf8"),
      ) as Record<string, string>;
      for (const [file, hash] of Object.entries(preserved)) {
        assert.equal(
          createHash("sha256")
            .update(await readFile(resolve(file)))
            .digest("hex"),
          hash,
          `${file} was changed`,
        );
      }
      results.push(
        "Original promotion data/assets, interactive showcase, and all 4 category pages unchanged (SHA-256)",
      );
    }
    assert.deepEqual(errors, [], "browser console/page errors");
    results.push("No application console errors or uncaught exceptions");
    await writeFile(
      resolve(directory, "results.json"),
      JSON.stringify({ base, results, errors }, null, 2),
    );
    console.log(results.join("\n"));
  } finally {
    await browser.close();
  }
}
void main();
