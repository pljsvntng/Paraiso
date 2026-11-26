import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import type { PoolClient } from "pg";
import { db, transaction, type Staff } from "./db";
import { BookingError, text } from "./validation";
import { inventoryLock } from "./capacity";
import { billing, cartTransition } from "./cart";
import { enqueue } from "./service";
import { hash } from "./security";
import { centavos } from "./money";
export function requireVerifier(user: Staff) {
  if (user.role !== "ADMIN" && !user.can_verify_payments)
    throw new BookingError(403, "Payment verification permission required.");
}
export async function imageBytes(bytes: Buffer) {
  if (bytes.length > 3 * 1024 * 1024 || bytes.length < 8)
    throw new BookingError(
      400,
      "Choose a PNG or JPEG image no larger than 3 MB.",
    );
  if (!(
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ))
    throw new BookingError(
      400,
      "Only genuine PNG and JPEG images are accepted.",
    );
  try {
    return await sharp(bytes, { limitInputPixels: 16000000 })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw new BookingError(
      400,
      "The image could not be safely decoded. Choose another PNG or JPEG.",
    );
  }
}
const normalized = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
export async function submitClaim(
  id: string,
  raw: unknown,
  proof: Buffer | null,
) {
  const v = z
    .object({
      accountId: z.string().uuid(),
      reference: text(100).min(4),
      amountCentavos: z.number().int().positive().max(1000000000000),
      transferredAt: z.string().datetime({ offset: true }),
    })
    .strict()
    .parse(raw);
  if (normalized(v.reference).length < 4)
    throw new BookingError(
      400,
      "Enter the actual wallet transaction reference.",
    );
  const image = proof ? await imageBytes(proof) : null;
  return transaction(async (c) => {
    await inventoryLock(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !b?.is_cart ||
      b.reservation_only ||
      ![
        "PENDING_PAYMENT",
        "PENDING_VERIFICATION",
        "PENDING_APPROVAL",
        "CONFIRMED",
        "EXPIRED",
      ].includes(b.workflow_status)
    )
      throw new BookingError(
        409,
        "This reservation is not accepting payment claims. Contact the resort.",
      );
    const account = (
      await c.query("SELECT * FROM receiving_accounts WHERE id=$1 AND active", [
        v.accountId,
      ])
    ).rows[0];
    if (!account)
      throw new BookingError(
        409,
        "This receiving account is no longer enabled.",
      );
    if (
      (
        await c.query(
          "SELECT 1 FROM checkout_attempts WHERE booking_id=$1 AND state IN ('CREATING','OPEN','UNCERTAIN')",
          [id],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "A gateway checkout is still active or needs reconciliation. Do not send a second payment.",
      );
    if (
      (
        await c.query(
          "SELECT 1 FROM payment_claims WHERE booking_id=$1 AND state='UNDER_VERIFICATION'",
          [id],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "A payment claim is already awaiting review.",
      );
    if (
      (
        await c.query(
          "SELECT 1 FROM payment_claims WHERE method=$1 AND normalized_reference=$2 AND state='VERIFIED'",
          [account.method, normalized(v.reference)],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "That transfer has already been matched to a reservation.",
      );
    if (new Date(v.transferredAt).getTime() > Date.now() + 300000)
      throw new BookingError(400, "The transfer time cannot be in the future.");
    const money = await billing(c, id);
    const due =
      b.workflow_status === "CONFIRMED"
        ? money.remaining
        : money.depositRemaining;
    if (due === null || due <= 0 || v.amountCentavos > (money.remaining ?? 0))
      throw new BookingError(
        409,
        "No configured balance is due, or the claim exceeds the remaining balance.",
      );
    await c.query(
      "INSERT INTO payment_claims(booking_id,account_id,method,transaction_reference,normalized_reference,claimed_centavos,transferred_at,proof_image,proof_mime) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id,
        v.accountId,
        account.method,
        v.reference,
        normalized(v.reference),
        v.amountCentavos,
        v.transferredAt,
        image,
        image ? "image/jpeg" : null,
      ],
    );
    await c.query(
      "UPDATE bookings SET workflow_status=CASE WHEN workflow_status IN ('EXPIRED','CONFIRMED') THEN workflow_status ELSE 'PENDING_VERIFICATION' END,reconciliation_required=(reconciliation_required OR workflow_status='EXPIRED'),version=version+1,updated_at=now() WHERE id=$1",
      [id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,new_status) VALUES($1,'MANUAL_PAYMENT_CLAIM_SUBMITTED','PENDING_VERIFICATION')",
      [id],
    );
    await enqueue(c, id, b.version + 1, "PENDING_VERIFICATION", true);
  });
}
async function paymentApplied(c: PoolClient, id: string) {
  const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0],
    money = await billing(c, id);
  // Financial updates never rewind a confirmed or later lifecycle, even after checkout.
  if (
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status) ||
    b.workflow_status === "COMPLETED"
  ) {
    await c.query(
      "UPDATE bookings SET reconciliation_required=(reconciliation_required OR $2),version=version+1,updated_at=now() WHERE id=$1",
      [id, money.total !== null && money.netPaid > money.total],
    );
    await enqueue(c, id, b.version + 1, "PAYMENT_VERIFIED", true);
    return;
  }
  if (["EXPIRED", "CANCELLED", "DECLINED"].includes(b.workflow_status)) {
    await c.query(
      "UPDATE bookings SET reconciliation_required=true,version=version+1 WHERE id=$1",
      [id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,details) VALUES($1,'LATE_PAYMENT_REQUIRES_RECONCILIATION',$2)",
      [id, JSON.stringify({ amount: money.netPaid })],
    );
    await enqueue(
      c,
      id,
      b.version + 1,
      "PAYMENT_REQUIRES_RECONCILIATION",
      true,
    );
    return;
  }
  if (money.depositRemaining === 0) {
    // A verified deposit retains the already allocated inventory while staff review it.
    await c.query(
      "UPDATE bookings SET workflow_status='PENDING_APPROVAL',hold_expires_at=NULL,version=version+1,updated_at=now() WHERE id=$1",
      [id],
    );
    const config = (
      await c.query("SELECT auto_confirm FROM reservation_settings WHERE id=1")
    ).rows[0];
    if (config.auto_confirm) {
      // Inventory remains checked even when automatic confirmation is enabled.
      await c.query("SAVEPOINT automatic_confirmation");
      try {
        await cartTransition(
          c,
          { ...b, workflow_status: "PENDING_APPROVAL", version: b.version + 1 },
          "CONFIRMED",
          null,
          true,
        );
      } catch {
        await c.query("ROLLBACK TO SAVEPOINT automatic_confirmation");
        await c.query(
          "UPDATE bookings SET reconciliation_required=true WHERE id=$1",
          [id],
        );
      }
    }
  } else
    await c.query(
      "UPDATE bookings SET workflow_status='PENDING_PAYMENT',version=version+1,updated_at=now() WHERE id=$1",
      [id],
    );
  if (money.total !== null && money.netPaid > money.total)
    await c.query(
      "UPDATE bookings SET reconciliation_required=true WHERE id=$1",
      [id],
    );
  const current = (
    await c.query("SELECT version,workflow_status FROM bookings WHERE id=$1", [
      id,
    ])
  ).rows[0];
  await enqueue(c, id, current.version, current.workflow_status, true);
}
export async function reviewClaim(claimId: string, raw: unknown, user: Staff) {
  requireVerifier(user);
  const v = z
    .object({
      decision: z.enum(["VERIFY", "REJECT"]),
      note: text(1000).min(10),
      independentlyVerified: z.boolean(),
      actualCentavos: z.number().int().positive().max(1000000000000).optional(),
      actualReference: text(100).optional(),
      accountId: z.string().uuid().optional(),
      receivedAt: z.string().datetime({ offset: true }).optional(),
    })
    .strict()
    .parse(raw);
  await transaction(async (c) => {
    await inventoryLock(c);
    const claim = (
      await c.query("SELECT * FROM payment_claims WHERE id=$1 FOR UPDATE", [
        claimId,
      ])
    ).rows[0];
    if (!claim) throw new BookingError(404, "Payment claim not found.");
    if (claim.state !== "UNDER_VERIFICATION")
      throw new BookingError(409, "This claim was already reviewed.");
    await c.query("SELECT id FROM bookings WHERE id=$1 FOR UPDATE", [
      claim.booking_id,
    ]);
    if (v.decision === "VERIFY") {
      if (
        !v.independentlyVerified ||
        !v.actualReference ||
        v.actualCentavos !== Number(claim.claimed_centavos) ||
        normalized(v.actualReference) !== claim.normalized_reference ||
        v.accountId !== claim.account_id ||
        !v.receivedAt
      )
        throw new BookingError(
          400,
          "Independently match the actual amount, receiving account, reference and received time to the wallet or bank record. Reject a claim if its details differ.",
        );
      if (Date.parse(v.receivedAt) > Date.now() + 300000)
        throw new BookingError(400, "Received time cannot be in the future.");
      const duplicate = await c.query(
        "SELECT 1 FROM payment_claims WHERE method=$1 AND normalized_reference=$2 AND state='VERIFIED'",
        [claim.method, claim.normalized_reference],
      );
      if (duplicate.rowCount)
        throw new BookingError(
          409,
          "That transaction is already assigned to a reservation.",
        );
      await c.query(
        "UPDATE payment_claims SET state='VERIFIED',verification_note=$2,verified_by=$3,verified_at=now() WHERE id=$1",
        [claimId, v.note, user.id],
      );
      await c.query(
        "INSERT INTO payments(booking_id,amount,kind,note,recorded_by,external_key,method,transaction_reference,claim_id,received_at) VALUES($1,$2,'PAYMENT',$3,$4,$5,$6,$7,$8,$9)",
        [
          claim.booking_id,
          Number(claim.claimed_centavos) / 100,
          v.note,
          user.id,
          `MANUAL:${claim.method}:${claim.normalized_reference}`,
          claim.method,
          claim.transaction_reference,
          claimId,
          v.receivedAt,
        ],
      );
      await paymentApplied(c, claim.booking_id);
    } else {
      await c.query(
        "UPDATE payment_claims SET state='REJECTED',verification_note=$2,verified_by=$3,verified_at=now() WHERE id=$1",
        [claimId, v.note, user.id],
      );
      const b = (
        await c.query(
          "UPDATE bookings SET workflow_status=CASE WHEN workflow_status='PENDING_VERIFICATION' THEN 'PENDING_PAYMENT' ELSE workflow_status END,version=version+1,updated_at=now() WHERE id=$1 RETURNING version",
          [claim.booking_id],
        )
      ).rows[0];
      await enqueue(c, claim.booking_id, b.version, "PAYMENT_REJECTED", true);
    }
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,$2,$3,$4)",
      [
        claim.booking_id,
        `MANUAL_PAYMENT_${v.decision}`,
        user.id,
        JSON.stringify({ claimId, note: v.note }),
      ],
    );
  });
}
export async function recordLedger(id: string, raw: unknown, user: Staff) {
  requireVerifier(user);
  const v = z
    .object({
      requestKey: z.string().uuid(),
      kind: z.enum(["PAYMENT", "REFUND"]),
      method: z.enum(["CASH", "BANK", "PROVIDER_REFUND"]),
      amountCentavos: z.number().int().positive().max(1000000000000),
      reference: text(100).min(4),
      note: text(1000).min(10),
      receivedAt: z.string().datetime({ offset: true }),
      independentlyVerified: z.literal(true),
    })
    .strict()
    .parse(raw);
  if (v.kind === "REFUND" && user.role !== "ADMIN")
    throw new BookingError(
      403,
      "Only administrators can record completed refunds.",
    );
  if (v.method === "PROVIDER_REFUND" && v.kind !== "REFUND")
    throw new BookingError(
      400,
      "Provider refund entries cannot record incoming payments.",
    );
  if (normalized(v.reference).length < 4)
    throw new BookingError(
      400,
      "Enter the actual transaction or receipt reference.",
    );
  if (Date.parse(v.receivedAt) > Date.now() + 300000)
    throw new BookingError(
      400,
      "The actual transaction time cannot be in the future.",
    );
  await transaction(async (c) => {
    await inventoryLock(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!b) throw new BookingError(404, "Booking not found.");
    const external = `LEDGER:${v.kind}:${v.method}:${normalized(v.reference)}`;
    const old = (
      await c.query(
        "SELECT * FROM payments WHERE request_key=$1 OR external_key=$2",
        [v.requestKey, external],
      )
    ).rows[0];
    if (old) {
      if (
        old.booking_id === id &&
        old.kind === v.kind &&
        old.method === v.method &&
        centavos(old.amount) === v.amountCentavos &&
        old.external_key === external &&
        old.note === v.note &&
        new Date(old.received_at).getTime() === Date.parse(v.receivedAt)
      )
        return;
      throw new BookingError(
        409,
        "This transaction or request was already recorded.",
      );
    }
    const money = await billing(c, id);
    if (v.kind === "REFUND" && v.amountCentavos > money.netPaid)
      throw new BookingError(
        409,
        "Refunds cannot exceed verified payments remaining on this booking.",
      );
    await c.query(
      "INSERT INTO payments(booking_id,amount,kind,note,recorded_by,external_key,method,transaction_reference,received_at,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        id,
        v.amountCentavos / 100,
        v.kind,
        v.note,
        user.id,
        external,
        v.method,
        v.reference,
        v.receivedAt,
        v.requestKey,
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,$2,$3,$4)",
      [
        id,
        v.kind === "REFUND"
          ? "ACTUAL_REFUND_RECORDED"
          : "ACTUAL_RECEIPT_RECORDED",
        user.id,
        JSON.stringify({
          amount: v.amountCentavos,
          method: v.method,
          reference: v.reference,
        }),
      ],
    );
    if (v.kind === "PAYMENT" && b.is_cart) await paymentApplied(c, id);
    else {
      const after = await billing(c, id);
      const updated = (
        await c.query(
          "UPDATE bookings SET reconciliation_required=(reconciliation_required OR $2),version=version+1,updated_at=now() WHERE id=$1 RETURNING version",
          [
            id,
            (after.total !== null && after.netPaid > after.total) ||
              (b.is_cart &&
                b.workflow_status === "CONFIRMED" &&
                (after.depositRemaining ?? 0) > 0),
          ],
        )
      ).rows[0];
      await enqueue(
        c,
        id,
        updated.version,
        v.kind === "REFUND" ? "REFUND_RECORDED" : "PAYMENT_RECORDED",
        true,
      );
    }
  });
}
export function gatewayConfig() {
  const mode = process.env.PAYMONGO_MODE || "test",
    key = process.env.PAYMONGO_SECRET_KEY || "";
  if (!["test", "live"].includes(mode) || !key.startsWith(`sk_${mode}_`))
    throw new BookingError(
      503,
      "PayMongo is not configured for this environment.",
    );
  if (
    mode === "live" &&
    (process.env.PAYMONGO_LIVE_APPROVED !== "true" ||
      process.env.PAYMONGO_SANDBOX_VERIFIED !== "true")
  )
    throw new BookingError(
      503,
      "Live payments require completed sandbox testing and explicit merchant approval on the server.",
    );
  return { mode, key };
}
export type ProviderSession = {
  id: string;
  attributes: {
    reference_number: string;
    livemode: boolean;
    checkout_url?: string;
    status?: string;
    metadata?: Record<string, string>;
    payments?: {
      id: string;
      attributes: {
        status: string;
        amount: number;
        currency: string;
        paid_at?: number;
        source?: { type: string };
      };
    }[];
  };
};
export async function provider(
  path: string,
  method = "GET",
  payload?: unknown,
  transport: typeof fetch = fetch,
): Promise<ProviderSession> {
  const cfg = gatewayConfig();
  const r = await transport(
    `https://api.paymongo.com/${method === "POST" && path === "" ? "v2" : "v1"}/checkout_sessions${path}`,
    {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.key}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!r.ok)
    throw new BookingError(
      r.status >= 500 ? 502 : 400,
      `PAYMONGO_HTTP_${r.status}`,
    );
  return (await r.json()).data;
}
export async function startCheckout(
  id: string,
  transport: typeof fetch = fetch,
  fullPayment = false,
) {
  const cfg = gatewayConfig();
  if (!process.env.APP_URL)
    throw new BookingError(
      503,
      "Configure APP_URL before enabling gateway checkout.",
    );
  const root = new URL(process.env.APP_URL).origin;
  if (cfg.mode === "live" && !root.startsWith("https://"))
    throw new BookingError(
      503,
      "Live payments require an HTTPS website origin.",
    );
  const attempt = await transaction(async (c) => {
    await inventoryLock(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (
      !b?.is_cart ||
      b.reservation_only ||
      (!["CONFIRMED"].includes(b.workflow_status) &&
        (!b.hold_expires_at ||
          new Date(b.hold_expires_at).getTime() <= Date.now())) ||
      !["PENDING_PAYMENT", "PENDING_VERIFICATION", "CONFIRMED"].includes(
        b.workflow_status,
      ) ||
      b.status === "CHECKED_OUT"
    )
      throw new BookingError(
        409,
        "The payment window has closed. Contact the resort before paying.",
      );
    const config = (
      await c.query("SELECT * FROM reservation_settings WHERE id=1")
    ).rows[0];
    if (!config.gateway_enabled || !config.gateway_methods.length)
      throw new BookingError(
        503,
        "Gateway checkout is not enabled by the resort.",
      );
    if (
      (
        await c.query(
          "SELECT 1 FROM payment_claims WHERE booking_id=$1 AND state='UNDER_VERIFICATION'",
          [id],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "A manual transfer is awaiting verification. Do not pay twice.",
      );
    const money = await billing(c, id);
    const due =
      b.workflow_status === "CONFIRMED" || fullPayment
        ? money.remaining
        : money.depositRemaining;
    const existing = (
      await c.query(
        "SELECT * FROM checkout_attempts WHERE booking_id=$1 AND state IN ('CREATING','OPEN','UNCERTAIN')",
        [id],
      )
    ).rows[0];
    if (existing) {
      if (Number(existing.expected_centavos) !== due)
        throw new BookingError(
          409,
          "An existing checkout has a different amount. Resolve that attempt before starting another.",
        );
      if (existing.state === "OPEN") return { ...existing, existing: true };
      throw new BookingError(
        409,
        "A checkout attempt needs reconciliation. Do not create or pay a second attempt.",
      );
    }
    if (!due || money.total === null)
      throw new BookingError(
        409,
        "No verified, configured downpayment amount is due.",
      );
    const row = (
      await c.query(
        "INSERT INTO checkout_attempts(booking_id,expected_centavos,mode,state) VALUES($1,$2,$3,'CREATING') RETURNING *",
        [id, due, cfg.mode],
      )
    ).rows[0];
    return {
      ...row,
      reference: b.reference_number,
      methods: config.gateway_methods,
      existing: false,
    };
  });
  if (attempt.existing) return { url: attempt.checkout_url as string };
  let session: ProviderSession;
  try {
    session = await provider(
      "",
      "POST",
      {
        data: {
          attributes: {
            line_items: [
              {
                name: `Paraiso downpayment ${attempt.reference}`,
                amount: Number(attempt.expected_centavos),
                currency: "PHP",
                quantity: 1,
              },
            ],
            payment_method_types: attempt.methods,
            reference_number: attempt.reference,
            metadata: { booking_id: id, attempt_id: attempt.id },
            success_url: `${root}/booking/track/?reference=${encodeURIComponent(attempt.reference)}`,
            cancel_url: `${root}/booking/track/?reference=${encodeURIComponent(attempt.reference)}&payment=cancelled`,
            send_email_receipt: false,
            pass_on_fees: false,
          },
        },
      },
      transport,
    );
    if (
      !session.id ||
      session.attributes.livemode !== (cfg.mode === "live") ||
      session.attributes.reference_number !== attempt.reference ||
      !session.attributes.checkout_url ||
      new URL(session.attributes.checkout_url).hostname !==
        "checkout.paymongo.com" ||
      new URL(session.attributes.checkout_url).protocol !== "https:"
    )
      throw new Error("INVALID_PROVIDER_SESSION");
    await db().query(
      "UPDATE checkout_attempts SET provider_session_id=$2,checkout_url=$3,state=CASE WHEN state IN ('PAID','EXPIRED') THEN state ELSE 'OPEN' END,updated_at=now() WHERE id=$1",
      [attempt.id, session.id, session.attributes.checkout_url],
    );
    return { url: session.attributes.checkout_url };
  } catch (error) {
    const definitive = error instanceof BookingError && error.status === 400;
    await db().query(
      "UPDATE checkout_attempts SET state=CASE WHEN state IN ('PAID','EXPIRED') THEN state ELSE $2 END,last_error=$3,updated_at=now() WHERE id=$1",
      [
        attempt.id,
        definitive ? "FAILED" : "UNCERTAIN",
        definitive ? "PROVIDER_REJECTED" : "SESSION_CREATION_UNCERTAIN",
      ],
    );
    throw new BookingError(
      502,
      definitive
        ? "The provider rejected checkout. Contact the resort for assistance."
        : "Checkout creation could not be confirmed. Do not make a second payment; ask staff to reconcile this attempt.",
    );
  }
}
export function verifyWebhook(
  raw: string,
  signature: string,
  now = Date.now(),
) {
  const { mode } = gatewayConfig(),
    secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret)
    throw new BookingError(503, "Webhook signing secret is not configured.");
  const parts = Object.fromEntries(
      signature.split(",").map((p) => p.trim().split("=")),
    ),
    timestamp = parts.t;
  if (
    !/^\d+$/.test(timestamp || "") ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    throw new BookingError(401, "Invalid webhook timestamp.");
  const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${raw}`)
      .digest(),
    supplied = Buffer.from(parts[mode === "live" ? "li" : "te"] || "", "hex");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    throw new BookingError(401, "Invalid webhook signature.");
}
export async function settleSession(
  session: ProviderSession,
  eventKey: string,
  eventType: string,
) {
  const cfg = gatewayConfig();
  return transaction(async (c) => {
    await inventoryLock(c);
    if (
      (
        await c.query("SELECT 1 FROM provider_events WHERE event_key=$1", [
          eventKey,
        ])
      ).rowCount
    )
      return { duplicate: true };
    const attempt = (
      await c.query(
        "SELECT * FROM checkout_attempts WHERE provider_session_id=$1 OR (id=$2::uuid AND provider_session_id IS NULL) FOR UPDATE",
        [
          session.id,
          z.string().uuid().safeParse(session.attributes.metadata?.attempt_id)
            .success
            ? session.attributes.metadata!.attempt_id
            : null,
        ],
      )
    ).rows[0];
    if (!attempt) return { ignored: true };
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [
        attempt.booking_id,
      ])
    ).rows[0];
    if (
      session.attributes.reference_number !== b.reference_number ||
      session.attributes.metadata?.attempt_id !== attempt.id ||
      session.attributes.metadata?.booking_id !== b.id ||
      session.attributes.livemode !== (cfg.mode === "live") ||
      attempt.mode !== cfg.mode
    )
      throw new BookingError(
        400,
        "Provider booking association or mode does not match.",
      );
    if (!attempt.provider_session_id)
      await c.query(
        "UPDATE checkout_attempts SET provider_session_id=$2,checkout_url=$3 WHERE id=$1",
        [attempt.id, session.id, session.attributes.checkout_url || null],
      );
    const paid =
      session.attributes.payments?.filter(
        (p) => p.attributes.status === "paid",
      ) || [];
    if (paid.length !== 1) {
      const state =
        session.attributes.status === "expired"
          ? "EXPIRED"
          : eventType.includes("failed") ||
              session.attributes.payments?.some(
                (p) => p.attributes.status === "failed",
              )
            ? "FAILED"
            : attempt.state;
      // A failed payment attempt does not necessarily expire its checkout session.
      await c.query(
        "UPDATE checkout_attempts SET state=$2,last_error=$3,updated_at=now() WHERE id=$1",
        [
          attempt.id,
          state === "FAILED" ? "OPEN" : state,
          state === "FAILED" ? "PAYMENT_ATTEMPT_FAILED" : null,
        ],
      );
      await c.query(
        "INSERT INTO provider_events(event_key,session_id,event_type,result) VALUES($1,$2,$3,$4)",
        [eventKey, session.id, eventType, state],
      );
      if (state === "FAILED") {
        const updated = (
          await c.query(
            "UPDATE bookings SET version=version+1 WHERE id=$1 RETURNING version",
            [b.id],
          )
        ).rows[0];
        await enqueue(c, b.id, updated.version, "PAYMENT_ATTEMPT_FAILED", true);
      }
      return { pending: true };
    }
    const payment = paid[0];
    if (
      payment.attributes.currency !== "PHP" ||
      payment.attributes.amount !== Number(attempt.expected_centavos)
    ) {
      await c.query(
        "UPDATE bookings SET reconciliation_required=true WHERE id=$1",
        [b.id],
      );
      await c.query(
        "INSERT INTO provider_events(event_key,session_id,event_type,result) VALUES($1,$2,$3,'AMOUNT_OR_CURRENCY_MISMATCH')",
        [eventKey, session.id, eventType],
      );
      await c.query(
        "INSERT INTO booking_activity_logs(booking_id,action,details) VALUES($1,'PROVIDER_PAYMENT_MISMATCH',$2)",
        [
          b.id,
          JSON.stringify({
            paymentId: payment.id,
            amount: payment.attributes.amount,
            currency: payment.attributes.currency,
          }),
        ],
      );
      await enqueue(
        c,
        b.id,
        b.version,
        "PAYMENT_REQUIRES_RECONCILIATION",
        true,
      );
      return { reconciliation: true };
    }
    const paidAt = payment.attributes.paid_at;
    if (
      !Number.isSafeInteger(paidAt) ||
      paidAt! < 1262304000 ||
      paidAt! * 1000 > Date.now() + 300000
    )
      throw new BookingError(
        400,
        "Provider payment has no valid authoritative paid_at timestamp; reconciliation is required.",
      );
    const receivedAt = new Date(paidAt! * 1000).toISOString();
    const inserted = await c.query(
      "INSERT INTO payments(booking_id,amount,kind,note,external_key,method,transaction_reference,checkout_attempt_id,received_at,provider_paid_at) VALUES($1,$2,'PAYMENT','Verified through PayMongo',$3,$4,$5,$6,$7,$7) ON CONFLICT(external_key) DO NOTHING RETURNING id",
      [
        b.id,
        payment.attributes.amount / 100,
        `PAYMONGO:${payment.id}`,
        payment.attributes.source?.type || "PAYMONGO",
        payment.id,
        attempt.id,
        receivedAt,
      ],
    );
    await c.query(
      "UPDATE checkout_attempts SET state='PAID',updated_at=now() WHERE id=$1",
      [attempt.id],
    );
    await c.query(
      "INSERT INTO provider_events(event_key,session_id,event_type,result) VALUES($1,$2,$3,'VERIFIED')",
      [eventKey, session.id, eventType],
    );
    if (inserted.rowCount) {
      await c.query(
        "INSERT INTO booking_activity_logs(booking_id,action,details) VALUES($1,'GATEWAY_PAYMENT_VERIFIED',$2)",
        [
          b.id,
          JSON.stringify({
            paymentId: payment.id,
            amount: payment.attributes.amount,
          }),
        ],
      );
      await paymentApplied(c, b.id);
    }
    return { verified: true };
  });
}
export async function handleWebhook(
  raw: string,
  signature: string,
  transport: typeof fetch = fetch,
) {
  verifyWebhook(raw, signature);
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new BookingError(400, "Invalid webhook JSON.");
  }
  const envelope = event.data?.attributes?.type
    ? event.data.attributes
    : event.data;
  const resource = envelope?.data;
  if (!envelope?.type || !resource?.id?.startsWith("cs_"))
    return { ignored: true };
  if (
    envelope.livemode !== undefined &&
    envelope.livemode !== ((process.env.PAYMONGO_MODE || "test") === "live")
  )
    throw new BookingError(400, "Webhook mode mismatch.");
  // Retrieve the session with the secret API key; browser redirects and webhook claims alone cannot settle a booking.
  const session = await provider(
    `/${encodeURIComponent(resource.id)}`,
    "GET",
    undefined,
    transport,
  );
  return settleSession(session, event.data?.id || hash(raw), envelope.type);
}
export async function reconcileAttempt(
  attemptId: string,
  providerId: string,
  user: Staff,
  transport: typeof fetch = fetch,
) {
  requireVerifier(user);
  if (!/^cs_[A-Za-z0-9]+$/.test(providerId))
    throw new BookingError(
      400,
      "Enter an actual PayMongo checkout session ID.",
    );
  const session = await provider(
    `/${encodeURIComponent(providerId)}`,
    "GET",
    undefined,
    transport,
  );
  await transaction(async (c) => {
    await inventoryLock(c);
    const a = (
      await c.query("SELECT * FROM checkout_attempts WHERE id=$1 FOR UPDATE", [
        attemptId,
      ])
    ).rows[0];
    if (
      !a ||
      session.attributes.metadata?.attempt_id !== a.id ||
      session.attributes.metadata?.booking_id !== a.booking_id
    )
      throw new BookingError(
        409,
        "This provider session does not belong to this attempt.",
      );
    await c.query(
      "UPDATE checkout_attempts SET provider_session_id=$2,checkout_url=$3,state=CASE WHEN state='PAID' THEN state ELSE 'OPEN' END WHERE id=$1",
      [attemptId, session.id, session.attributes.checkout_url || null],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(booking_id,action,performed_by) VALUES($1,'GATEWAY_ATTEMPT_RECONCILED',$2)",
      [a.booking_id, user.id],
    );
  });
  return settleSession(
    session,
    `reconcile:${attemptId}:${hash(JSON.stringify(session))}`,
    "STAFF_RECONCILIATION",
  );
}
