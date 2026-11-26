import assert from "node:assert/strict";
import { chromium } from "playwright";
import { featuredExperiences } from "../src/data/featured-experiences";

const base = process.argv[2] || "http://127.0.0.1:3000";
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true },
      }),
    );
    const photo = featuredExperiences[1].photo;
    const paths = new Set(
      [
        photo.src,
        ...(photo.srcSet || "")
          .split(",")
          .map((candidate) => candidate.trim().split(/\s/)[0]),
      ]
        .filter(Boolean)
        .map((src) => new URL(src, base).pathname)
        .filter((path) => !path.endsWith("-160.webp")),
    );
    const poolImages = (url: URL) => paths.has(url.pathname);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await context.route(poolImages, async (route) => {
      await gate;
      await route.continue();
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator(".showcase-stage").scrollIntoViewIfNeeded();
    await page
      .locator('.showcase-image[data-active="true"] img')
      .evaluate((image) => (image as HTMLImageElement).decode());
    await page.waitForFunction(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length ===
        0,
    );
    const originalUrl = page.url();
    await page.getByRole("tab").nth(1).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".showcase-stage")?.getAttribute("aria-busy") ===
        "true",
    );
    assert.match(await page.getByRole("tabpanel").innerText(), /Family Deluxe/);
    assert.equal(
      await page.getByRole("tab").first().getAttribute("aria-selected"),
      "true",
    );
    assert.equal(
      await page
        .locator('.showcase-image[data-active="true"] img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
      true,
    );
    release();
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll('[role="tab"]')[1]
          .getAttribute("aria-selected") === "true",
    );
    const visibleFrames = await page.evaluate(async () => {
      const samples: number[] = [];
      for (let index = 0; index < 20; index++) {
        await new Promise(requestAnimationFrame);
        samples.push(
          [...document.querySelectorAll(".showcase-image")].reduce(
            (sum, image) => sum + Number(getComputedStyle(image).opacity),
            0,
          ),
        );
      }
      return samples;
    });
    assert.ok(
      visibleFrames.every((opacity) => opacity >= 0.95),
      "Crossfade must never leave the photograph blank",
    );
    assert.equal(
      await page
        .locator('.showcase-image[data-active="true"] img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
      true,
    );
    await context.unroute(poolImages);
    await page.getByRole("tab").nth(2).click();
    await page.getByRole("tab").nth(3).click();
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll('[role="tab"]')[3]
          .getAttribute("aria-selected") === "true",
    );
    await page.waitForTimeout(1000);
    assert.equal(
      await page.getByRole("tab").nth(3).getAttribute("aria-selected"),
      "true",
      "Selection stays manual",
    );
    assert.equal(page.url(), originalUrl);
    await page.keyboard.press("Home");
    assert.equal(
      await page
        .getByRole("tab")
        .first()
        .evaluate((tab) => tab === document.activeElement),
      true,
    );
    assert.equal(
      await page.getByRole("tab").nth(3).getAttribute("aria-selected"),
      "true",
      "Arrow navigation focuses; Enter activates",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document
          .querySelector('[role="tab"]')
          ?.getAttribute("aria-selected") === "true",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await context.route(poolImages, (route) => route.abort("failed"));
    await page.reload();
    await page.getByRole("tab").nth(1).click();
    await page
      .locator(".showcase-feedback")
      .filter({ hasText: "could not load" })
      .waitFor();
    assert.equal(
      await page.getByRole("tab").first().getAttribute("aria-selected"),
      "true",
    );
    assert.match(await page.getByRole("tabpanel").innerText(), /Family Deluxe/);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "Passed slow-image preservation, decoded crossfade, rapid switching, keyboard navigation, manual selection, reduced motion and image-error fallback.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
