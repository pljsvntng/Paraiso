import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, transaction } from "./db";
import { demoRequested } from "./demo-mode";
import { BookingError, text } from "./validation";
import {
  cookieOptions,
  currentStaff,
  requireStaff,
  rateLimit,
  clientKey,
  requireApproval,
} from "./security";
import { cartSchema, itemSchema, createCart, quoteItems } from "./cart";
import {
  guestCookie,
  guestBooking,
  consumeAccess,
  requestAccess,
} from "./guest-access";
import { ensureTrackingReference, publicTracking } from "./public-tracking";
import {
  reschedule,
  requestChange,
  reviewChange,
  listChangeRequests,
} from "./changes";
import { calendarEntries } from "./reports";
import { adminInsights } from "./admin-insights";
import { readiness } from "./readiness";
import { saveRate } from "./rates";
import {
  operationalSettings,
  saveOperationalSettings,
  guestRecords,
  reservationWorkbook,
} from "./operations";
import { updateBooking } from "./service";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const ref = z
  .string()
  .max(80)
  .regex(/^PDJ-(?:\d{4}-\d{6,}|\d{8}-[A-F0-9]{12})$/);
export async function limitedBytes(req: Request, limit = 32768) {
  const reader = req.body?.getReader();
  if (!reader) throw new BookingError(400, "Request body required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    length += r.value.length;
    if (length > limit) {
      await reader.cancel();
      throw new BookingError(413, "Upload or form exceeds the allowed size.");
    }
    chunks.push(r.value);
  }
  return Buffer.concat(chunks);
}
async function json(req: Request, limit = 32768) {
  try {
    return JSON.parse((await limitedBytes(req, limit)).toString("utf8"));
  } catch (e) {
    if (e instanceof BookingError) throw e;
    throw new BookingError(400, "Invalid JSON form data.");
  }
}
export async function commerceApi(
  req: NextRequest,
  path: string[],
): Promise<Response | null> {
  const route = path.join("/"),
    method = req.method,
    params = req.nextUrl.searchParams;
  if (route === "paymongo/webhook")
    throw new BookingError(
      410,
      "Online transaction processing has been retired.",
    );
  if (path[0] !== "commerce") return null;
  if (["manual", "gateway", "qr"].includes(path[1]))
    throw new BookingError(
      410,
      "Online transaction processing has been retired.",
    );
  if (route === "commerce/catalog" && method === "GET") {
    if (!process.env.DATABASE_URL)
      return response({
        products: [],
        settings: { terms: "", cancellation_policy: "" },
        configured: false,
      });
    const products = (
      await db().query(
        "SELECT * FROM accommodation_types WHERE active ORDER BY name",
      )
    ).rows;
    const settings = (
      await db().query(
        "SELECT terms,cancellation_policy,privacy_policy,rescheduling_policy,policy_version FROM reservation_settings WHERE id=1",
      )
    ).rows[0];
    return response({
      products: products.map((p) => {
        const publicProduct = { ...p };
        delete publicProduct.deposit_mode;
        delete publicProduct.deposit_value;
        return publicProduct;
      }),
      settings,
      addons: (
        await db().query(
          "SELECT id,name,price FROM addons WHERE active ORDER BY name",
        )
      ).rows,
      configured: true,
      demoMode: demoRequested(),
    });
  }
  if (route === "commerce/quote" && method === "POST") {
    await rateLimit(`cart-quote:${clientKey(req)}`, 120, 60);
    const v = z
      .object({ items: z.array(itemSchema).min(1).max(12) })
      .strict()
      .parse(await json(req));
    if (v.items.some((i) => i.unitIds) && !(await currentStaff()))
      throw new BookingError(
        403,
        "Exact unit selection requires staff authentication.",
      );
    const quote = await transaction((c) => quoteItems(c, v.items, null, true));
    return response({
      total: quote.total,
      items: quote.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        total: i.total,
        remaining: i.remaining,
        end: i.end,
        rates: i.rates,
      })),
    });
  }
  if (route === "commerce/checkout" && method === "POST") {
    const v = cartSchema.parse(await json(req)),
      user = await currentStaff();
    if (v.policyVersion === undefined)
      throw new BookingError(
        400,
        "Review and accept the published reservation policies before submitting.",
      );
    if (!user) {
      await rateLimit(`cart-submit:${clientKey(req)}`, 30, 3600);
      await rateLimit(`cart-email:${v.guestEmail}`, 5, 3600);
    }
    const result = await createCart(v, user);
    (await cookies()).set(guestCookie(result.reference), result.access, {
      ...cookieOptions,
      maxAge: 86400,
    });
    return response(
      {
        reference: result.reference,
        trackingReference: result.trackingReference,
      },
      201,
    );
  }
  if (route === "commerce/access/request" && method === "POST") {
    const v = z
      .object({ reference: ref, email: z.string().trim().email().max(254) })
      .strict()
      .parse(await json(req));
    await rateLimit(`access:${clientKey(req)}`, 20, 3600);
    await rateLimit(`access-email:${v.email.toLowerCase()}`, 4, 3600);
    await requestAccess(v.reference, v.email);
    return response({
      message:
        "If those details match a booking, a one-time access link will be emailed shortly.",
    });
  }
  if (route === "commerce/access/consume" && method === "POST") {
    const v = z
      .object({ reference: ref, token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(await json(req));
    await rateLimit(`access-exchange:${clientKey(req)}`, 30, 900);
    const access = await consumeAccess(v.reference, v.token);
    (await cookies()).set(guestCookie(v.reference), access, {
      ...cookieOptions,
      maxAge: 86400,
    });
    const id = await guestBooking(v.reference);
    return response({
      trackingReference: await ensureTrackingReference(db(), id),
    });
  }
  if (route === "commerce/track" && ["POST", "GET"].includes(method)) {
    await rateLimit(`public-track:${clientKey(req)}`, 30, 900);
    const raw =
      method === "POST"
        ? await json(req, 256)
        : { reference: params.get("reference") };
    const v = z
      .object({ reference: z.string().trim().min(1).max(80) })
      .strict()
      .parse(raw);
    return response(await publicTracking(v.reference));
  }
  if (route === "commerce/tracking-reference" && method === "POST") {
    await rateLimit(`tracking-recovery:${clientKey(req)}`, 20, 900);
    const v = z
      .object({ reference: ref })
      .strict()
      .parse(await json(req, 256));
    const id = await guestBooking(v.reference);
    return response({
      trackingReference: await ensureTrackingReference(db(), id),
    });
  }
  if (route === "commerce/change-request" && method === "POST") {
    const raw = await json(req);
    const reference = ref.parse(raw.reference);
    const id = await guestBooking(reference);
    await rateLimit(`guest-change:${id}`, 10, 3600);
    const { reference: _reference, ...change } = raw;
    void _reference;
    return response(await requestChange(id, change), 201);
  }

  const user = await requireStaff();
  if (
    path[1] === "admin" &&
    path[2] === "tracking-reference" &&
    path.length === 4 &&
    method === "POST"
  ) {
    const id = z.string().uuid().parse(path[3]);
    const trackingReference = await transaction(async (c) => {
      const reference = await ensureTrackingReference(c, id);
      await c.query(
        "INSERT INTO booking_activity_logs(booking_id,action,performed_by) VALUES($1,'TRACKING_REFERENCE_RETRIEVED',$2)",
        [id, user.id],
      );
      return reference;
    });
    return response({ trackingReference });
  }
  if (
    path[1] === "admin" &&
    path[2] === "notes" &&
    path.length === 4 &&
    method === "POST"
  ) {
    const id = z.string().uuid().parse(path[3]),
      v = z
        .object({ requestKey: z.string().uuid(), note: text(2000).min(1) })
        .strict()
        .parse(await json(req));
    await transaction(async (c) => {
      const b = (
        await c.query("SELECT id FROM bookings WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!b) throw new BookingError(404, "Reservation not found.");
      const inserted = await c.query(
        "INSERT INTO booking_staff_notes(booking_id,request_key,note,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(request_key) DO NOTHING RETURNING id",
        [id, v.requestKey, v.note, user.id],
      );
      if (!inserted.rowCount) {
        const prior = (
          await c.query(
            "SELECT * FROM booking_staff_notes WHERE request_key=$1",
            [v.requestKey],
          )
        ).rows[0];
        if (
          prior.booking_id !== id ||
          prior.created_by !== user.id ||
          prior.note !== v.note
        )
          throw new BookingError(
            409,
            "This note request key was already used.",
          );
        return;
      }
      await c.query(
        "UPDATE bookings SET version=version+1,updated_at=now() WHERE id=$1",
        [id],
      );
      await c.query(
        "INSERT INTO booking_activity_logs(booking_id,action,performed_by,details) VALUES($1,'INTERNAL_NOTE_ADDED',$2,$3)",
        [id, user.id, JSON.stringify({ noteId: inserted.rows[0].id })],
      );
    });
    return response({ ok: true });
  }

  if (route === "commerce/admin/insights" && method === "GET")
    return response(await adminInsights(params, user));
  if (route === "commerce/admin/guests" && method === "GET")
    return response(await guestRecords(params));
  if (route === "commerce/admin/policies" && method === "GET")
    return response(await operationalSettings());
  if (route === "commerce/admin/policies" && method === "POST") {
    await saveOperationalSettings(await json(req, 262144), user);
    return response({ ok: true });
  }
  if (route === "commerce/admin/units" && method === "GET")
    return response(
      (
        await db().query(
          "SELECT id,accommodation_type_id,unit_identifier FROM accommodation_units WHERE active ORDER BY unit_identifier",
        )
      ).rows,
    );
  if (route === "commerce/admin/readiness" && method === "GET") {
    await requireStaff(true);
    return response(await readiness());
  }
  if (route === "commerce/admin/change-requests" && method === "GET") {
    requireApproval(user);
    return response(await listChangeRequests());
  }
  if (path[2] === "review-change" && path.length === 4 && method === "POST") {
    await reviewChange(z.string().uuid().parse(path[3]), await json(req), user);
    return response({ ok: true });
  }
  if (path[2] === "reschedule" && path.length === 4 && method === "POST")
    return response(
      await reschedule(
        z.string().uuid().parse(path[3]),
        await json(req),
        user,
        params.get("commit") === "true",
      ),
    );
  if (route === "commerce/admin/calendar" && method === "GET")
    return response(await calendarEntries(params));
  if (path[2] === "reservation" && path.length === 4 && method === "GET") {
    const { bookingDetails } = await import("./service");
    return response(await bookingDetails(z.string().uuid().parse(path[3])));
  }
  if (path[2] === "status" && path.length === 4 && method === "POST") {
    const v = z
      .object({
        status: z.enum([
          "CONFIRMED",
          "CANCELLED",
          "DECLINED",
          "CHECKED_IN",
          "CHECKED_OUT",
        ]),
        version: z.number().int().positive(),
        reason: text(2000).optional(),
      })
      .strict()
      .parse(await json(req));
    await updateBooking(z.string().uuid().parse(path[3]), v, user);
    return response({ ok: true });
  }
  if (route === "commerce/admin/export" && method === "GET") {
    if (user.role !== "ADMIN" && !user.can_export)
      throw new BookingError(403, "Export permission required.");
    return new Response(new Uint8Array(await reservationWorkbook(params)), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=paraiso-reservations.xlsx",
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (path[2] === "history" && path.length === 4 && method === "GET") {
    if (user.role !== "ADMIN" && !user.can_verify_payments)
      throw new BookingError(403, "Historical archive permission required.");
    const id = z.string().uuid().parse(path[3]);
    return response({
      payments: (
        await db().query(
          "SELECT id,amount,kind,method,note,transaction_reference,received_at FROM payments WHERE booking_id=$1 ORDER BY received_at",
          [id],
        )
      ).rows,
    });
  }
  if (route === "commerce/admin/rates") {
    await requireStaff(true);
    if (method === "GET")
      return response(
        (
          await db().query(
            "SELECT r.*,p.name service_name FROM service_rate_periods r JOIN accommodation_types p ON p.id=r.product_id ORDER BY r.start_date,r.priority DESC",
          )
        ).rows,
      );
    if (method === "POST") {
      await saveRate(await json(req), user);
      return response({ ok: true });
    }
  }
  if (
    [
      "claims",
      "attempts",
      "billing",
      "settings",
      "receiving",
      "review",
      "ledger",
      "reconcile",
      "reconciliation",
      "due-date",
      "summary",
    ].includes(path[2]) ||
    path[1] === "proof"
  )
    throw new BookingError(
      410,
      "Financial management has been retired. Historical records remain in the protected database archive.",
    );
  throw new BookingError(404, "Endpoint not found.");
}
