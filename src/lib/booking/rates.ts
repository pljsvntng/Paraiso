import { z } from "zod";
import type { PoolClient } from "pg";
import { transaction, type Product, type Staff } from "./db";
import type { Selection } from "./capacity";
import { inventoryLock } from "./capacity";
import { BookingError, dateSchema, text } from "./validation";
import { centavos } from "./money";

export async function servicePrice(
  c: PoolClient,
  p: Product,
  s: Selection,
  end: string,
) {
  const periods = (
    await c.query(
      "SELECT * FROM service_rate_periods WHERE product_id=$1 AND active AND start_date<$3 AND end_date>$2 ORDER BY priority DESC,id",
      [p.id, s.checkIn, end],
    )
  ).rows;
  const rates: {
    date: string;
    rate: number | null;
    childRate: number | null;
    periodId: string | null;
  }[] = [];
  for (
    let at = Date.parse(s.checkIn);
    at < (p.overnight ? Date.parse(end) : Date.parse(s.checkIn) + 86400000);
    at += 86400000
  ) {
    const date = new Date(at).toISOString().slice(0, 10),
      weekday = new Date(at).getUTCDay();
    const matching = periods.filter(
      (r) =>
        r.start_date <= date &&
        r.end_date > date &&
        r.weekdays.includes(weekday),
    );
    if (matching.length > 1 && matching[0].priority === matching[1].priority)
      throw new BookingError(
        409,
        `${p.name}: overlapping rate rules need administrator review.`,
      );
    const period = matching[0];
    const rate = period
      ? Number(period.price_centavos)
      : p.price === null
        ? null
        : centavos(p.price);
    const childRate = period
      ? Number(period.child_price_centavos ?? period.price_centavos)
      : p.child_price === null
        ? rate
        : centavos(p.child_price);
    rates.push({ date, rate, childRate, periodId: period?.id || null });
  }
  const total = rates.some((r) => r.rate === null || r.childRate === null)
    ? null
    : rates.reduce(
        (sum, r) =>
          sum +
          (p.price_basis === "UNIT"
            ? r.rate! * s.units
            : r.rate! * s.adults + r.childRate! * s.children),
        0,
      );
  return { total, rates };
}
export async function saveRate(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = z
    .object({
      id: z.string().uuid().optional(),
      productId: z.string().uuid(),
      name: text(120).min(2),
      start: dateSchema,
      end: dateSchema,
      weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      priceCentavos: z.number().int().min(0).max(1000000000),
      childPriceCentavos: z.number().int().min(0).max(1000000000).nullable(),
      priority: z.number().int().min(0).max(1000),
      active: z.boolean(),
    })
    .strict()
    .parse(raw);
  if (v.end <= v.start)
    throw new BookingError(
      400,
      "Rate end must follow its start (end excluded).",
    );
  await transaction(async (c) => {
    await inventoryLock(c);
    if (
      v.id &&
      !(
        await c.query(
          "SELECT 1 FROM service_rate_periods WHERE id=$1 AND product_id=$2",
          [v.id, v.productId],
        )
      ).rowCount
    )
      throw new BookingError(404, "Rate rule not found for this service.");
    if (
      v.active &&
      (
        await c.query(
          "SELECT 1 FROM service_rate_periods WHERE product_id=$1 AND active AND priority=$2 AND start_date<$4 AND end_date>$3 AND weekdays && $5::integer[] AND ($6::uuid IS NULL OR id<>$6)",
          [v.productId, v.priority, v.start, v.end, v.weekdays, v.id || null],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "Overlapping rate rules must have different priorities.",
      );
    await c.query(
      "INSERT INTO service_rate_periods(id,product_id,name,start_date,end_date,weekdays,price_centavos,child_price_centavos,priority,active,created_by) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO UPDATE SET name=$3,start_date=$4,end_date=$5,weekdays=$6,price_centavos=$7,child_price_centavos=$8,priority=$9,active=$10",
      [
        v.id || null,
        v.productId,
        v.name,
        v.start,
        v.end,
        v.weekdays,
        v.priceCentavos,
        v.childPriceCentavos,
        v.priority,
        v.active,
        user.id,
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by,details) VALUES('RATE_PERIOD_UPDATED',$1,$2)",
      [user.id, JSON.stringify(v)],
    );
  });
}
