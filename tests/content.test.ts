import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { accommodations } from "../src/data/accommodations";
import { getBookingLink, getInquiryPath } from "../src/config/booking";
import { isCalendarDate, manilaDate } from "../src/lib/dates";
import { filterCatalog, emptyCatalogFilters } from "../src/lib/catalog";
import { getActivePromotions, type Promotion } from "../src/data/promotions";
import { getApprovedReviews } from "../src/data/reviews";
import { validateInquiry, inquiryMailto } from "../src/lib/inquiry";
import { faqs } from "../src/data/faq";
import { resortMedia } from "../src/config/media";
import { manilaInputTimestamp } from "../src/lib/dates";
test("B06/B07: booking copy reflects reservation requests without payment and the actual facilities photo", () => {
  assert.match(
    faqs.find((f) => f.question === "Can I book or pay on this website?")!
      .answer,
    /submit without online payment/,
  );
  assert.doesNotMatch(
    faqs.map((f) => f.answer).join(" "),
    /do not hold rooms until staff confirm|ask the resort for its exact address/,
  );
  assert.doesNotMatch(
    readFileSync(resolve("src/app/pool-cottages/page.tsx"), "utf8"),
    /does not show live/,
  );
  assert.doesNotMatch(
    readFileSync(resolve("src/components/layout/header.tsx"), "utf8"),
    /Inquiries via the official Facebook page/,
  );
  assert.match(
    readFileSync(resolve("src/app/packages/page.tsx"), "utf8"),
    /alt=\{resortMedia.facilities.alt\}/,
  );
  assert.equal(
    resortMedia.facilities.alt,
    "Covered wooden tables beside a paved garden walkway",
  );
});
test("financial form dates are interpreted as Manila time on every browser timezone", () => {
  assert.equal(
    manilaInputTimestamp("2026-11-21T00:01"),
    "2026-11-20T16:01:00.000Z",
  );
  assert.throws(() => manilaInputTimestamp("2026-02-30T10:00"));
});
test("all original resort images and responsive image candidates remain available", () => {
  const catalogs = [
    "photo-catalog",
    "accommodation-photo-catalog",
    "image-variants",
  ].map((name) =>
    JSON.parse(readFileSync(resolve(`src/data/${name}.json`), "utf8")),
  );
  let checked = 0;
  function inspect(value: unknown) {
    if (typeof value === "string") {
      for (const match of value.matchAll(
        /\/images\/[^,]+?(?=\s+\d+w(?:,|$)|$)/g,
      )) {
        assert.ok(
          existsSync(resolve("public", `.${match[0].trim()}`)),
          match[0],
        );
        checked++;
      }
    } else if (Array.isArray(value)) value.forEach(inspect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(inspect);
  }
  catalogs.forEach(inspect);
  assert.ok(checked > 100);
  assert.equal(accommodations.length, 5);
  assert.ok(accommodations.every((stay) => stay.photos.length > 0));
});
test("existing booking CTAs stay internal and preserve accommodation/activity context", () => {
  for (const stay of accommodations) {
    const result = getBookingLink("stay", stay.name),
      url = new URL(result.href, "https://resort.test");
    assert.equal(result.external, false);
    assert.equal(url.pathname, "/booking/");
    assert.equal(url.searchParams.get("subject"), stay.name);
  }
  const inquiry = new URL(
    getInquiryPath("group", "x".repeat(200)),
    "https://resort.test",
  );
  assert.equal(inquiry.searchParams.get("subject")?.length, 160);
});
test("business dates respect Manila midnight and reject impossible dates", () => {
  assert.equal(manilaDate(new Date("2026-11-20T15:59:59Z")), "2026-11-20");
  assert.equal(manilaDate(new Date("2026-11-20T16:00:00Z")), "2026-11-21");
  assert.equal(isCalendarDate("2028-02-29"), true);
  assert.equal(isCalendarDate("2027-02-29"), false);
});
test("existing self-hosted fonts and motion accessibility remain intact", () => {
  const css = readFileSync(resolve("src/styles/fonts.css"), "utf8");
  assert.doesNotMatch(css, /https?:\/\//);
  for (const [, path] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g))
    assert.ok(existsSync(resolve("public", `.${path}`)), path);
  assert.match(
    readFileSync(resolve("src/components/motion-experience.tsx"), "utf8"),
    /prefers-reduced-motion/,
  );
  assert.match(
    readFileSync(resolve("src/app/booking/reservation.css"), "utf8"),
    /prefers-reduced-motion/,
  );
});
test("existing catalog filtering combines verified facts without modifying source items", () => {
  const items = [
    {
      id: "a",
      title: "Cabin",
      category: "Stay",
      searchText: "forest",
      capacity: 4,
      price: 100,
    },
    { id: "b", title: "Igloo", category: "Stay", searchText: "nature" },
  ];
  assert.deepEqual(
    filterCatalog(items, {
      ...emptyCatalogFilters,
      query: "forest",
      guests: "3",
      maxPrice: "150",
    }).map((i) => i.id),
    ["a"],
  );
  assert.deepEqual(
    filterCatalog(items, { ...emptyCatalogFilters, guests: "1" }).map(
      (i) => i.id,
    ),
    ["a"],
  );
  assert.equal(items.length, 2);
});
test("promotion visibility still follows approved dates at Manila midnight", () => {
  const item: Promotion = {
    id: "test",
    title: "Test",
    description: "",
    image: "/images/promotions/promotion.png",
    startDate: "2026-11-20",
    endDate: "2026-11-20",
    active: true,
    displayOrder: 1,
  };
  assert.equal(
    getActivePromotions([item], new Date("2026-11-20T15:59:59Z")).length,
    1,
  );
  assert.equal(
    getActivePromotions([item], new Date("2026-11-20T16:00:00Z")).length,
    0,
  );
  assert.equal(
    getActivePromotions(
      [{ ...item, status: "draft" }],
      new Date("2026-11-20T04:00:00Z"),
    ).length,
    0,
  );
});
test("public review publication strips private fields and keeps unapproved reviews private", () => {
  const base = {
    id: "test",
    guestName: "Test Guest",
    rating: 5 as const,
    message: "Review test fixture",
    source: "Google Maps" as const,
    approved: true,
    email: "PRIVATE",
    bookingReference: "PRIVATE",
  };
  const result = getApprovedReviews([
    base,
    { ...base, id: "other", approved: false },
  ]);
  assert.equal(result.length, 1);
  assert.equal("email" in result[0], false);
  assert.equal("bookingReference" in result[0], false);
});
test("existing inquiry drafts still validate contacts and open a guest-controlled email draft", () => {
  const draft = {
    name: "Test Guest",
    contact: "test@example.test",
    interest: "stay",
    subject: "Family Deluxe",
    date: "2027-01-01",
    guests: "2",
    message: "Please share current arrangements.",
  };
  assert.deepEqual(validateInquiry(draft, "2026-11-21"), {});
  assert.ok(
    validateInquiry({ ...draft, contact: "bad" }, "2026-11-21").contact,
  );
  assert.match(
    inquiryMailto("resort@example.test", draft),
    /^mailto:resort@example.test\?/,
  );
});
