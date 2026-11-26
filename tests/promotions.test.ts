import test from "node:test";
import assert from "node:assert/strict";
import {
  getActivePromotions,
  promotions,
  type Promotion,
} from "../src/data/promotions";
import { getPastPromotions } from "../src/lib/promotions";

test("original posters remain accessible after expiry without becoming current offers", () => {
  const now = new Date("2026-11-22T04:00:00Z");
  assert.equal(getActivePromotions(promotions, now).length, 0);
  assert.deepEqual(
    getPastPromotions(promotions, now).map((item) => item.id),
    ["summer-promo", "fathersday-promo", "adventure-promo"],
  );
});

test("past promotions honor inclusive Manila expiry and never expose unpublished or invalid entries", () => {
  const original = promotions[0];
  const excluded: Promotion[] = [
    { ...original, active: false },
    { ...original, status: "draft" },
    { ...original, status: "archived" },
    { ...original, startDate: "2026-07-12" },
    { ...original, startDate: "2026-02-30" },
    { ...original, endDate: "2026-02-30" },
    { ...original, endDate: undefined },
  ];
  assert.equal(
    getPastPromotions([original], new Date("2026-07-11T15:59:59Z")).length,
    0,
  );
  assert.equal(
    getPastPromotions([original], new Date("2026-07-11T16:00:00Z")).length,
    1,
  );
  assert.equal(
    getPastPromotions(excluded, new Date("2026-11-22T04:00:00Z")).length,
    0,
  );
});

test("current and past lists are separate and preserve the source records", () => {
  const before = JSON.stringify(promotions);
  const now = new Date("2026-06-27T04:00:00Z");
  const current = getActivePromotions(promotions, now);
  const past = getPastPromotions(promotions, now);
  assert.deepEqual(
    current.map((item) => item.id),
    ["summer-promo"],
  );
  assert.equal(past.length, 2);
  assert.ok(past.every((item) => !current.includes(item)));
  assert.equal(JSON.stringify(promotions), before);
});
