import { z } from "zod";
import type { PoolClient } from "pg";
import { transaction, type Product, type Staff } from "./db";
import { BookingError, dateSchema, text, philippinePhone } from "./validation";
import { centavos, deposit } from "./money";
import {
  capacity,
  endDate,
  inventoryLock,
  slotsOverlap,
  type Selection,
} from "./capacity";
import { hash, token, requireApproval } from "./security";
import { enqueue } from "./service";
import { manilaDate } from "../dates";
import { ensureTrackingReference } from "./public-tracking";
import {
  demoRequested,
  ensureDemoDatabase,
  markDemoBooking,
} from "./demo-mode";
export const itemSchema = z
  .object({
    productId: z.string().uuid(),
    checkIn: dateSchema,
    checkOut: dateSchema.optional(),
    adults: z.number().int().min(1).max(500),
    children: z.number().int().min(0).max(500),
    units: z.number().int().min(1).max(100),
    slot: text(80).default(""),
    restrictionsAccepted: z.literal(true),
    participantsMeetAge: z.literal(true),
    addons: z.array(z.string().uuid()).max(20).optional(),
    notes: text(2000).optional(),
    unitIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  })
  .strict()
  .refine((v) => v.checkIn >= manilaDate(), "Choose today or a future date.");
export const cartSchema = z
  .object({
    items: z.array(itemSchema).min(1).max(12),
    guestName: text(120).min(2),
    guestEmail: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    guestPhone: text(30).regex(/^\+?[0-9 ()-]{7,30}$/),
    guestAddress: text(500).default(""),
    additionalPhone: text(30).default(""),
    channel: z
      .enum(["WEBSITE", "WALK_IN", "TELEPHONE", "STAFF"])
      .default("WEBSITE"),
    notes: text(2000).default(""),
    consent: z.literal(true),
    termsAccepted: z.literal(true),
    cancellationAccepted: z.literal(true),
    website: z.string().max(0).default(""),
    requestKey: z.string().uuid(),
    acceptedTotal: z.number().int().min(0).nullable().optional(),
    acceptedDeposit: z.number().int().min(0).nullable().optional(),
    policyVersion: z.number().int().positive().optional(),
  })
  .strict();
export type CartItem = z.infer<typeof itemSchema>;
export function itemPrice(p: Product, s: Selection) {
  if (p.price === null) return null;
  const nights = p.overnight
    ? (Date.parse(endDate(p, s)) - Date.parse(s.checkIn)) / 86400000
    : 1;
  return (
    nights *
    (p.price_basis === "UNIT"
      ? centavos(p.price) * s.units
      : centavos(p.price) * s.adults +
        centavos(p.child_price ?? p.price) * s.children)
  );
}
export async function quoteItems(
  c: PoolClient,
  items: CartItem[],
  exclude: string | null = null,
  reservationOnly = false,
) {
  const result: {
    product: Product;
    selection: CartItem;
    total: number | null;
    deposit: number | null;
    end: string;
    unitIds: string[];
    remaining: number;
    addons: { id: string; name: string; price: number | null }[];
    rates: {
      date: string;
      rate: number | null;
      childRate: number | null;
      periodId: string | null;
    }[];
  }[] = [];
  for (const s of items) {
    const p = (
      await c.query<Product>("SELECT * FROM accommodation_types WHERE id=$1", [
        s.productId,
      ])
    ).rows[0];
    if (!p) throw new BookingError(404, "A selected service no longer exists.");
    const a = await capacity(c, p, s, exclude, result);
    if (!a.configured || !a.available)
      throw new BookingError(
        409,
        `${p.name}: inventory or capacity is unavailable for this selection.`,
      );
    const overlapping = result.filter(
      (i) =>
        (i.product.id === p.id ||
          (!!p.resource_group &&
            i.product.resource_group === p.resource_group)) &&
        i.selection.checkIn < endDate(p, s) &&
        i.end > s.checkIn &&
        slotsOverlap(
          i.selection.slot,
          i.product.duration_minutes,
          s.slot,
          p.duration_minutes,
        ),
    );
    if ((p.overnight || p.unit_inventory) && overlapping.length)
      throw new BookingError(
        400,
        "Combine overlapping room selections for the same accommodation into one item using its room count.",
      );
    const selectedAddons = [...new Set(s.addons || [])];
    const addons = (
      await c.query<{ id: string; name: string; price: number | null }>(
        "SELECT id,name,price FROM addons WHERE id=ANY($1::uuid[]) AND active",
        [selectedAddons],
      )
    ).rows;
    if (addons.length !== selectedAddons.length)
      throw new BookingError(
        409,
        "An optional meal or add-on is no longer available.",
      );
    const { servicePrice } = await import("./rates");
    const priced = await servicePrice(c, p, s, a.end);
    const baseTotal = priced.total;
    const total =
        baseTotal === null || addons.some((a) => a.price === null)
          ? null
          : baseTotal + addons.reduce((n, a) => n + centavos(a.price!), 0),
      due = reservationOnly
        ? null
        : deposit(total, p.deposit_mode, p.deposit_value);
    if (total !== null && !Number.isSafeInteger(total))
      throw new BookingError(
        400,
        "Reservation amount exceeds the supported limit.",
      );
    result.push({
      product: p,
      selection: s,
      total,
      deposit: due,
      end: a.end,
      unitIds: a.unitIds,
      remaining: a.remaining,
      addons,
      rates: priced.rates,
    });
  }
  const sum = (key: "total" | "deposit") =>
    result.some((i) => i[key] === null)
      ? null
      : result.reduce((n, i) => n + i[key]!, 0);
  const total = sum("total"),
    requiredDeposit = sum("deposit");
  if (total !== null && (!Number.isSafeInteger(total) || total > 999999999999))
    throw new BookingError(
      400,
      "Combined amount exceeds the supported limit. Contact the resort for a separate quotation.",
    );
  return { items: result, total, deposit: requiredDeposit };
}
export async function allocateCart(c: PoolClient, id: string) {
  await c.query(
    "UPDATE booking_items SET allocated=false WHERE booking_id=$1",
    [id],
  );
  await c.query("UPDATE booking_units SET active=false WHERE booking_id=$1", [
    id,
  ]);
  const items = (
    await c.query(
      "SELECT * FROM booking_items WHERE booking_id=$1 ORDER BY id",
      [id],
    )
  ).rows;
  for (const i of items) {
    const p = (
      await c.query<Product>(
        "SELECT * FROM accommodation_types WHERE id=$1 FOR UPDATE",
        [i.product_id],
      )
    ).rows[0];
    if (p.category !== i.category || p.overnight !== i.overnight)
      throw new BookingError(
        409,
        "The service definition changed. Review the guest’s reservation before creating an updated request.",
      );
    const a = await capacity(c, p, {
      checkIn: i.check_in_date,
      checkOut: i.check_out_date,
      adults: i.adult_count,
      children: i.child_count,
      units: i.units_count,
      slot: i.slot,
      unitIds: i.price_snapshot.unitIds || undefined,
    });
    if (!a.configured || !a.available)
      throw new BookingError(
        409,
        `${i.name}: capacity is no longer available. Staff reconciliation is required.`,
      );
    await c.query(
      "UPDATE booking_items SET allocated=true,exclusive=$2,resource_group=$3 WHERE id=$1",
      [i.id, p.exclusive, p.resource_group],
    );
    for (const unit of a.unitIds)
      await c.query(
        "INSERT INTO booking_units(booking_id,unit_id,check_in_date,check_out_date,item_id,slot_start,duration_minutes) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(item_id,unit_id) WHERE item_id IS NOT NULL DO UPDATE SET active=true,check_in_date=EXCLUDED.check_in_date,check_out_date=EXCLUDED.check_out_date,slot_start=EXCLUDED.slot_start,duration_minutes=EXCLUDED.duration_minutes",
        [
          id,
          unit,
          i.check_in_date,
          i.check_out_date,
          i.id,
          !p.overnight && i.slot ? i.slot : null,
          p.duration_minutes,
        ],
      );
  }
}
export async function createCart(
  raw: unknown,
  user: Staff | null = null,
  reservationOnly = true,
) {
  const input = cartSchema.parse(raw),
    access = token(),
    digest = hash(JSON.stringify(input));
  if (demoRequested()) {
    await ensureDemoDatabase();
    if (
      !/^DEMO\b/i.test(input.guestName) ||
      !input.guestEmail.endsWith("@example.test")
    )
      throw new BookingError(
        400,
        "Demo mode: use a name beginning DEMO and an email ending @example.test. Do not enter real guest details.",
      );
  }
  if (reservationOnly) {
    philippinePhone.parse(input.guestPhone);
    if (input.additionalPhone) philippinePhone.parse(input.additionalPhone);
    if (!user && input.channel !== "WEBSITE")
      throw new BookingError(
        403,
        "Only staff may record walk-in or telephone requests.",
      );
  }
  if (!user && input.items.some((i) => i.unitIds))
    throw new BookingError(
      403,
      "Exact unit selection is available only to authorized staff.",
    );
  return transaction(async (c) => {
    await inventoryLock(c);
    const prior = (
      await c.query(
        "SELECT id,reference_number,request_hash,created_by,reservation_only FROM bookings WHERE request_key=$1 FOR UPDATE",
        [input.requestKey],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.request_hash !== digest ||
        prior.reservation_only !== reservationOnly ||
        (prior.created_by || null) !== (user?.id || null)
      )
        throw new BookingError(409, "This request key has already been used.");
      await c.query(
        "INSERT INTO guest_booking_sessions(token_hash,booking_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [hash(access), prior.id],
      );
      const trackingReference = await ensureTrackingReference(c, prior.id);
      return {
        reference: prior.reference_number as string,
        access,
        trackingReference,
      };
    }
    const settings = (
      await c.query("SELECT * FROM reservation_settings WHERE id=1")
    ).rows[0];
    if (
      !settings.terms ||
      !settings.cancellation_policy ||
      !settings.privacy_policy ||
      !settings.rescheduling_policy
    )
      throw new BookingError(
        409,
        "The resort must publish approved terms, privacy, cancellation and rescheduling policies before accepting reservation requests.",
      );
    const quote = await quoteItems(c, input.items, null, reservationOnly),
      first = quote.items[0];
    if (
      (input.acceptedTotal !== undefined &&
        input.acceptedTotal !== quote.total) ||
      (!reservationOnly &&
        input.acceptedDeposit !== undefined &&
        input.acceptedDeposit !== quote.deposit) ||
      (input.policyVersion !== undefined &&
        input.policyVersion !== settings.policy_version)
    )
      throw new BookingError(
        409,
        "Rates or policies changed. Check availability and review the current estimate and policies before submitting again.",
      );
    if (
      !reservationOnly &&
      quote.deposit !== null &&
      quote.deposit > 0 &&
      !settings.hold_minutes
    )
      throw new BookingError(
        409,
        "The resort must configure its payment window before requesting a deposit.",
      );
    const year = Number(manilaDate().slice(0, 4));
    const sequence = (
      await c.query(
        "INSERT INTO booking_reference_counters(year,value) VALUES($1,1) ON CONFLICT(year) DO UPDATE SET value=booking_reference_counters.value+1 RETURNING value",
        [year],
      )
    ).rows[0].value;
    const reference = `PDJ-${year}-${String(sequence).padStart(6, "0")}`;
    const workflow =
      !reservationOnly && quote.deposit !== null && quote.deposit > 0
        ? "PENDING_PAYMENT"
        : "PENDING_APPROVAL";
    const hold =
      !reservationOnly && quote.deposit !== null && quote.deposit > 0;
    const start = quote.items.map((i) => i.selection.checkIn).sort()[0],
      end = quote.items
        .map((i) => i.end)
        .sort()
        .at(-1)!;
    const b = (
      await c.query(
        `INSERT INTO bookings(reference_number,receipt_hash,request_key,request_hash,guest_name,guest_email,guest_phone,product_id,product_name,booking_category,check_in_date,check_out_date,adult_count,child_count,units_count,total_amount,special_requests,source,created_by,is_cart,workflow_status,total_centavos,deposit_centavos,hold_expires_at,policy_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1,$15,$16,$17,$18,true,$19,$20,$21,CASE WHEN $22 THEN now()+$23*interval '1 minute' ELSE NULL END,$24) RETURNING id`,
        [
          reference,
          hash(access),
          input.requestKey,
          digest,
          input.guestName,
          input.guestEmail,
          input.guestPhone,
          first.product.id,
          quote.items.map((i) => i.product.name).join(" + "),
          quote.items.length === 1 ? first.product.category : "COMBINED",
          start,
          end,
          first.selection.adults,
          first.selection.children,
          quote.total === null ? null : quote.total / 100,
          input.notes,
          user ? "MANUAL" : "WEBSITE",
          user?.id || null,
          workflow,
          quote.total,
          reservationOnly ? null : quote.deposit,
          hold,
          settings.hold_minutes,
          JSON.stringify({
            terms: settings.terms,
            cancellation: settings.cancellation_policy,
            privacy: settings.privacy_policy,
            rescheduling: settings.rescheduling_policy,
            version: settings.policy_version,
            acceptedAt: new Date().toISOString(),
          }),
        ],
      )
    ).rows[0];
    await c.query(
      "UPDATE bookings SET reservation_only=$2,guest_address=$3,additional_phone=$4,reservation_channel=$5 WHERE id=$1",
      [
        b.id,
        reservationOnly,
        input.guestAddress,
        input.additionalPhone,
        user && input.channel === "WEBSITE" ? "STAFF" : input.channel,
      ],
    );
    const trackingReference = await ensureTrackingReference(c, b.id);
    await markDemoBooking(c, b.id);
    for (const i of quote.items) {
      const row = (
        await c.query(
          `INSERT INTO booking_items(booking_id,product_id,name,category,overnight,check_in_date,check_out_date,slot,adult_count,child_count,units_count,total_centavos,deposit_centavos,price_snapshot,exclusive,resource_group) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [
            b.id,
            i.product.id,
            i.product.name,
            i.product.category,
            i.product.overnight,
            i.selection.checkIn,
            i.end,
            i.selection.slot,
            i.selection.adults,
            i.selection.children,
            i.selection.units,
            i.total,
            reservationOnly ? null : i.deposit,
            JSON.stringify({
              rates: i.rates,
              unitIds: i.selection.unitIds || null,
              rate: i.product.price,
              childRate: i.product.child_price,
              basis: i.product.price_basis,
              depositMode: i.product.deposit_mode,
              depositValue: i.product.deposit_value,
              notes: i.selection.notes,
            }),
            i.product.exclusive,
            i.product.resource_group,
          ],
        )
      ).rows[0];
      await c.query(
        "UPDATE booking_items SET special_requests=$2 WHERE id=$1",
        [row.id, i.selection.notes || ""],
      );
      for (const addon of i.addons)
        await c.query(
          "INSERT INTO booking_item_addons(item_id,addon_id,name,price_centavos) VALUES($1,$2,$3,$4)",
          [
            row.id,
            addon.id,
            addon.name,
            addon.price === null ? null : centavos(addon.price),
          ],
        );
      if (!reservationOnly && i.total !== null)
        await c.query(
          "INSERT INTO booking_charges(booking_id,item_id,external_key,description,amount_centavos) VALUES($1,$2,$3,$4,$5)",
          [b.id, row.id, `reservation:${row.id}`, i.product.name, i.total],
        );
    }
    if (hold) await allocateCart(c, b.id);
    await c.query(
      "INSERT INTO guest_booking_sessions(token_hash,booking_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [hash(access), b.id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,new_status,performed_by) VALUES($1,'CART_REQUEST_CREATED',$2,$3)",
      [b.id, workflow, user?.id || null],
    );
    await c.query("INSERT INTO notifications(booking_id) VALUES($1)", [b.id]);
    await enqueue(c, b.id, 1, workflow, true);
    return { reference, access, trackingReference };
  });
}
export type FinancialRow = {
  booking_id: string;
  total: string | null;
  required_deposit: string | null;
  paid: string;
  refunds: string;
  net: string;
  remaining: string | null;
  deposit_remaining: string | null;
  payment_status: string;
};
export function financialValues(row: FinancialRow) {
  return {
    total: row.total === null ? null : Number(row.total),
    requiredDeposit:
      row.required_deposit === null ? null : Number(row.required_deposit),
    verifiedPayments: Number(row.paid),
    refunds: Number(row.refunds),
    netPaid: Number(row.net),
    remaining: row.remaining === null ? null : Number(row.remaining),
    depositRemaining:
      row.deposit_remaining === null ? null : Number(row.deposit_remaining),
    paymentStatus: row.payment_status,
  };
}
export async function billing(c: PoolClient, id: string) {
  const row = (
    await c.query<FinancialRow>(
      "SELECT * FROM booking_financials WHERE booking_id=$1",
      [id],
    )
  ).rows[0];
  if (!row) throw new BookingError(404, "Reservation not found.");
  return financialValues(row);
}
export async function cartTransition(
  c: PoolClient,
  b: Record<string, unknown>,
  target: string,
  user: Staff | null,
  automatic = false,
  reason = "",
) {
  const id = String(b.id),
    current = String(b.workflow_status);
  const allowed: Record<string, string[]> = {
    PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "DECLINED"],
    PENDING_VERIFICATION: ["CONFIRMED", "CANCELLED", "DECLINED"],
    PENDING_APPROVAL: ["CONFIRMED", "CANCELLED", "DECLINED"],
    CONFIRMED: ["COMPLETED", "CANCELLED"],
    EXPIRED: [],
    CANCELLED: [],
    DECLINED: [],
    COMPLETED: [],
  };
  if (!allowed[current]?.includes(target))
    throw new BookingError(
      409,
      "This reservation status change is not permitted.",
    );
  if (user && ["CONFIRMED", "CANCELLED", "DECLINED"].includes(target))
    requireApproval(user);
  if (b.status === "CHECKED_IN" && target !== "COMPLETED")
    throw new BookingError(
      409,
      "Checked-in reservations must complete the guest checkout workflow.",
    );
  if (!user)
    throw new BookingError(
      403,
      "Reservation requests require an authorized staff decision.",
    );
  if (target === "DECLINED" && text(2000).parse(reason).length < 10)
    throw new BookingError(
      400,
      "Provide a meaningful decline reason of at least 10 characters.",
    );
  if (target === "CONFIRMED") {
    if ((b.check_in_date as string) < manilaDate())
      throw new BookingError(409, "Cannot confirm a reservation in the past.");
    if (automatic && ["EXPIRED", "CANCELLED"].includes(current))
      throw new BookingError(
        409,
        "Payment arrived after the hold expired; staff reconciliation is required.",
      );
    await allocateCart(c, id);
  }
  if (target === "COMPLETED" && (b.check_in_date as string) > manilaDate())
    throw new BookingError(
      409,
      "Cannot complete a reservation before its arrival date.",
    );
  if (["CANCELLED", "DECLINED", "COMPLETED"].includes(target)) {
    await c.query(
      "UPDATE booking_items SET allocated=false WHERE booking_id=$1",
      [id],
    );
    await c.query("UPDATE booking_units SET active=false WHERE booking_id=$1", [
      id,
    ]);
  }
  const legacy =
    target === "CONFIRMED"
      ? "CONFIRMED"
      : target === "COMPLETED"
        ? "CHECKED_OUT"
        : target === "DECLINED"
          ? "DECLINED"
          : "CANCELLED";
  await c.query(
    "UPDATE bookings SET workflow_status=$2,status=$3,hold_expires_at=NULL,version=version+1,updated_at=now() WHERE id=$1",
    [id, target, legacy],
  );
  if (["CONFIRMED", "DECLINED"].includes(target))
    await c.query(
      "UPDATE bookings SET reviewed_by=$2,reviewed_at=now(),decline_reason=$3 WHERE id=$1",
      [id, user?.id || null, target === "DECLINED" ? reason.trim() : null],
    );
  await c.query(
    "INSERT INTO booking_activity_logs(booking_id,action,previous_status,new_status,performed_by,details) VALUES($1,'CART_STATUS_CHANGED',$2,$3,$4,$5)",
    [
      id,
      current,
      target,
      user?.id || null,
      JSON.stringify(target === "DECLINED" ? { reason: reason.trim() } : {}),
    ],
  );
  await enqueue(c, id, Number(b.version) + 1, target, true);
}
