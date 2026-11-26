import { z } from "zod";
import { db, transaction, type Staff } from "./db";
import { inventoryLock } from "./capacity";
import {
  allocateCart,
  cartTransition,
  quoteItems,
  type CartItem,
} from "./cart";
import { BookingError, dateSchema, text } from "./validation";
import { requireApproval } from "./security";
import { enqueue } from "./service";
import { manilaDate } from "../dates";
import { isDeepStrictEqual } from "node:util";

export const changeDatesSchema = z
  .array(
    z
      .object({
        itemId: z.string().uuid(),
        checkIn: dateSchema,
        checkOut: dateSchema.optional(),
        slot: text(80).default(""),
        unitIds: z.array(z.string().uuid()).min(1).max(100).optional(),
      })
      .strict(),
  )
  .min(1)
  .max(12);
const rescheduleSchema = z
  .object({
    version: z.number().int().positive(),
    items: changeDatesSchema,
    policyVersion: z.number().int().positive().optional(),
    guestConsent: z.boolean().optional(),
    note: text(1000).min(10),
    changeRequestId: z.string().uuid().optional(),
  })
  .strict();

export async function reschedule(
  id: string,
  raw: unknown,
  user: Staff,
  commit: boolean,
) {
  requireApproval(user);
  const v = rescheduleSchema.parse(raw);
  return transaction(async (c) => {
    await inventoryLock(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!b) throw new BookingError(404, "Reservation not found.");
    if (b.version !== v.version)
      throw new BookingError(
        409,
        "This booking changed. Refresh before rescheduling.",
      );
    if (
      (b.is_cart
        ? ![
            "PENDING_PAYMENT",
            "PENDING_VERIFICATION",
            "PENDING_APPROVAL",
            "CONFIRMED",
          ].includes(b.workflow_status)
        : !["PENDING", "CONFIRMED"].includes(b.status)) ||
      ["CHECKED_IN", "CHECKED_OUT"].includes(b.status)
    )
      throw new BookingError(
        409,
        "Only upcoming, active reservations can be rescheduled.",
      );
    const policy = (
      await c.query("SELECT * FROM reservation_settings WHERE id=1")
    ).rows[0];
    if (!policy.rescheduling_policy)
      throw new BookingError(
        409,
        "Publish the approved rescheduling policy first.",
      );
    let old = (
      await c.query(
        "SELECT i.*,COALESCE((SELECT array_agg(addon_id) FROM booking_item_addons WHERE item_id=i.id),'{}'::uuid[]) addons FROM booking_items i WHERE booking_id=$1 ORDER BY id",
        [id],
      )
    ).rows;
    if (!b.is_cart)
      old = [
        {
          ...b,
          id: b.id,
          product_id: b.product_id,
          name: b.product_name,
          allocated: b.status === "CONFIRMED",
          addons: (
            await c.query(
              "SELECT addon_id FROM booking_addons WHERE booking_id=$1",
              [id],
            )
          ).rows.map((a) => a.addon_id),
        },
      ];
    if (
      v.items.length !== old.length ||
      new Set(v.items.map((i) => i.itemId)).size !== old.length ||
      old.some((i) => !v.items.some((n) => n.itemId === i.id))
    )
      throw new BookingError(
        400,
        "Rescheduling must include every original service exactly once.",
      );
    const selections: CartItem[] = old.map((i) => {
      const n = v.items.find((n) => n.itemId === i.id)!;
      if (n.checkIn < manilaDate())
        throw new BookingError(400, "Choose today or a future date.");
      return {
        productId: i.product_id,
        checkIn: n.checkIn,
        checkOut: n.checkOut,
        slot: n.slot,
        unitIds: n.unitIds,
        adults: i.adult_count,
        children: i.child_count,
        units: i.units_count,
        addons: i.addons,
        restrictionsAccepted: true,
        participantsMeetAge: true,
        notes: i.special_requests || "",
      };
    });
    const quote = await quoteItems(c, selections, id, true);
    const result = {
      policyVersion: policy.policy_version,
      policy: policy.rescheduling_policy,
      version: b.version,
    };
    if (!commit) return result;
    if (v.policyVersion !== policy.policy_version || !v.guestConsent)
      throw new BookingError(
        409,
        "Preview the current quote and record guest consent to the revised dates and published policy before applying.",
      );
    if (v.changeRequestId) {
      const req = (
        await c.query(
          "SELECT * FROM booking_change_requests WHERE id=$1 AND booking_id=$2 AND kind='RESCHEDULE' AND state='PENDING' FOR UPDATE",
          [v.changeRequestId, id],
        )
      ).rows[0];
      if (!req)
        throw new BookingError(
          409,
          "This guest request has already been reviewed.",
        );
    }
    const wasAllocated = old.some((i) => i.allocated);
    await c.query(
      "UPDATE booking_items SET allocated=false WHERE booking_id=$1",
      [id],
    );
    await c.query("UPDATE booking_units SET active=false WHERE booking_id=$1", [
      id,
    ]);
    for (let n = 0; n < old.length; n++) {
      const q = quote.items[n],
        i = old[n];
      if (b.is_cart)
        await c.query(
          "UPDATE booking_items SET check_in_date=$2,check_out_date=$3,slot=$4,price_snapshot=jsonb_set(price_snapshot,'{unitIds}',$5::jsonb) WHERE id=$1",
          [
            i.id,
            q.selection.checkIn,
            q.end,
            q.selection.slot,
            JSON.stringify(q.selection.unitIds || null),
          ],
        );
    }
    const start = selections.map((i) => i.checkIn).sort()[0],
      end = quote.items
        .map((i) => i.end)
        .sort()
        .at(-1)!;
    await c.query(
      "UPDATE bookings SET check_in_date=$2,check_out_date=$3,version=version+1,updated_at=now() WHERE id=$1",
      [id, start, end],
    );
    if (wasAllocated && b.is_cart) await allocateCart(c, id);
    if (!b.is_cart) {
      await c.query("UPDATE bookings SET slot=$2 WHERE id=$1", [
        id,
        selections[0].slot,
      ]);
      if (wasAllocated)
        for (const unitId of quote.items[0].unitIds)
          await c.query(
            "INSERT INTO booking_units(booking_id,unit_id,check_in_date,check_out_date) VALUES($1,$2,$3,$4) ON CONFLICT(booking_id,unit_id) WHERE item_id IS NULL DO UPDATE SET active=true,check_in_date=EXCLUDED.check_in_date,check_out_date=EXCLUDED.check_out_date",
            [id, unitId, start, end],
          );
    }
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,'RESERVATION_RESCHEDULED',$2,$3)",
      [
        id,
        user.id,
        JSON.stringify({
          previousItems: old,
          nextItems: v.items,
          ...result,
          guestConsent: true,
          note: v.note,
        }),
      ],
    );
    if (v.changeRequestId)
      await c.query(
        "UPDATE booking_change_requests SET state='APPROVED',response=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",
        [v.changeRequestId, v.note, user.id],
      );
    await enqueue(c, id, b.version + 1, "RESERVATION_RESCHEDULED", true);
    return result;
  });
}

export async function requestChange(id: string, raw: unknown) {
  const v = z
    .object({
      requestKey: z.string().uuid(),
      kind: z.enum(["RESCHEDULE", "CANCEL"]),
      message: text(2000).min(10),
      items: changeDatesSchema.optional(),
    })
    .strict()
    .parse(raw);
  return transaction(async (c) => {
    await inventoryLock(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    const prior = (
      await c.query(
        "SELECT * FROM booking_change_requests WHERE request_key=$1",
        [v.requestKey],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.booking_id !== id ||
        prior.kind !== v.kind ||
        prior.message !== v.message ||
        !isDeepStrictEqual(prior.proposed_items, v.items || null)
      )
        throw new BookingError(409, "Request key already used.");
      return { id: prior.id };
    }
    if (
      !b ||
      ["CANCELLED", "DECLINED", "CHECKED_OUT", "CHECKED_IN"].includes(b.status)
    )
      throw new BookingError(
        409,
        "Contact the resort about this completed or inactive reservation.",
      );
    if (
      (
        await c.query(
          "SELECT 1 FROM booking_change_requests WHERE booking_id=$1 AND state='PENDING'",
          [id],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "Your previous request is still awaiting review.",
      );
    const r = (
      await c.query(
        "INSERT INTO booking_change_requests(booking_id,request_key,kind,message,proposed_items) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [
          id,
          v.requestKey,
          v.kind,
          v.message,
          v.items ? JSON.stringify(v.items) : null,
        ],
      )
    ).rows[0];
    await c.query(
      "UPDATE bookings SET version=version+1,updated_at=now() WHERE id=$1",
      [id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,details) VALUES($1,'GUEST_CHANGE_REQUESTED',$2)",
      [id, JSON.stringify({ requestId: r.id, kind: v.kind })],
    );
    await enqueue(c, id, b.version + 1, "GUEST_CHANGE_REQUESTED", true);
    return r;
  });
}
export async function reviewChange(id: string, raw: unknown, user: Staff) {
  requireApproval(user);
  const v = z
    .object({
      decision: z.enum(["APPROVE_CANCEL", "REJECT"]),
      note: text(1000).min(10),
    })
    .strict()
    .parse(raw);
  await transaction(async (c) => {
    await inventoryLock(c);
    const r = (
      await c.query(
        "SELECT * FROM booking_change_requests WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!r || r.state !== "PENDING")
      throw new BookingError(409, "Request is no longer pending.");
    if (v.decision === "APPROVE_CANCEL") {
      if (r.kind !== "CANCEL")
        throw new BookingError(
          400,
          "Use a previewed reschedule to approve date changes.",
        );
      const b = (
        await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [
          r.booking_id,
        ])
      ).rows[0];
      if (b.is_cart) await cartTransition(c, b, "CANCELLED", user);
      else {
        if (!["PENDING", "CONFIRMED"].includes(b.status))
          throw new BookingError(
            409,
            "This booking can no longer be cancelled.",
          );
        await c.query(
          "UPDATE bookings SET status='CANCELLED',version=version+1,updated_at=now() WHERE id=$1",
          [b.id],
        );
        await c.query(
          "UPDATE booking_units SET active=false WHERE booking_id=$1",
          [b.id],
        );
        await enqueue(c, b.id, b.version + 1, "CANCELLED", true);
      }
    } else {
      const b = (
        await c.query(
          "UPDATE bookings SET version=version+1,updated_at=now() WHERE id=$1 RETURNING version",
          [r.booking_id],
        )
      ).rows[0];
      await enqueue(
        c,
        r.booking_id,
        b.version,
        "CHANGE_REQUEST_DECLINED",
        true,
      );
    }
    await c.query(
      "UPDATE booking_change_requests SET state=$2,response=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1",
      [id, v.decision === "REJECT" ? "REJECTED" : "APPROVED", v.note, user.id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,'GUEST_CHANGE_REVIEWED',$2,$3)",
      [r.booking_id, user.id, JSON.stringify(v)],
    );
  });
}
export async function listChangeRequests() {
  return (
    await db().query(
      "SELECT r.*,b.reference_number,b.public_tracking_reference,b.guest_name FROM booking_change_requests r JOIN bookings b ON b.id=r.booking_id ORDER BY r.created_at DESC LIMIT 200",
    )
  ).rows;
}
