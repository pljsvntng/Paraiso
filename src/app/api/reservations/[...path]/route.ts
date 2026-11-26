import { commerceApi } from "@/lib/booking/commerce-api";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z, ZodError } from "zod";
import { db, transaction } from "@/lib/booking/db";
import {
  bookingDetails,
  updateBooking,
  availability,
  listBookings,
  lockProduct,
} from "@/lib/booking/service";
import {
  BookingError,
  availabilitySchema,
  statuses,
  dateSchema,
  text,
} from "@/lib/booking/validation";
import {
  clientKey,
  cookieOptions,
  encrypt,
  hash,
  rateLimit,
  requireStaff,
  sameOrigin,
  sessionCookie,
  token,
  verifyPassword,
} from "@/lib/booking/security";
import {
  inventory,
  saveBlock,
  saveProduct,
  saveUnit,
} from "@/lib/booking/inventory";
import { accounts, saveAccount } from "@/lib/booking/accounts";
import { reservationWorkbook } from "@/lib/booking/operations";
import { integrationStatus, runJobs } from "@/lib/booking/jobs";
import { manilaDate } from "@/lib/dates";
import { ensureDemoDatabase, demoRequested } from "@/lib/booking/demo-mode";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = (v: string) => z.string().uuid().parse(v);
function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
async function body(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new BookingError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new BookingError(413, "This form is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BookingError(400, "Invalid form data.");
  }
}
function validateFilters(params: URLSearchParams) {
  for (const key of ["from", "to"])
    if (params.get(key)) dateSchema.parse(params.get(key));
  if (params.get("status"))
    z.enum([
      ...statuses,
      "PENDING_PAYMENT",
      "PENDING_VERIFICATION",
      "PENDING_APPROVAL",
      "EXPIRED",
      "COMPLETED",
    ]).parse(params.get("status"));
  if (
    params.get("from") &&
    params.get("to") &&
    params.get("from")! > params.get("to")!
  )
    throw new BookingError(
      400,
      "The arrival-date filter end must be on or after its start.",
    );
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    await ensureDemoDatabase();
    const { path } = await ctx.params,
      route = path.join("/"),
      method = req.method,
      params = req.nextUrl.searchParams;
    if (route === "demo-mode" && method === "GET")
      return json({ demoMode: demoRequested() });
    if (method !== "GET" && !["worker", "paymongo/webhook"].includes(route))
      sameOrigin(req);
    if (method === "GET" && ["availability", "calendar"].includes(route))
      await rateLimit(`calendar:${clientKey(req)}`, 300, 60);
    const commerceResponse = await commerceApi(req, path);
    if (commerceResponse) return commerceResponse;
    if (route === "catalog" && method === "GET") {
      if (!process.env.DATABASE_URL)
        return json({ products: [], addons: [], configured: false });
      const [products, addons] = await Promise.all([
        db().query("SELECT * FROM accommodation_types ORDER BY name"),
        db().query(
          "SELECT id,name,price FROM addons WHERE active ORDER BY name",
        ),
      ]);
      return json({
        products: products.rows.map((p) => {
          const publicProduct = { ...p };
          delete publicProduct.deposit_mode;
          delete publicProduct.deposit_value;
          return publicProduct;
        }),
        addons: addons.rows,
        configured: true,
      });
    }
    if (route === "availability" && method === "GET") {
      const v = availabilitySchema.parse(Object.fromEntries(params));
      if (v.checkIn < manilaDate())
        throw new BookingError(400, "Choose today or a future date.");
      const result = await transaction(async (c) =>
        availability(c, await lockProduct(c, v.productId, false), v),
      );
      return json({
        configured: result.configured,
        available: result.available,
        remaining: result.remaining,
      });
    }
    if (route === "calendar" && method === "GET") {
      const v = availabilitySchema.parse(Object.fromEntries(params));
      if (v.checkIn < manilaDate())
        throw new BookingError(400, "Choose today or a future date.");
      const days = await transaction(async (c) => {
        const p = await lockProduct(c, v.productId, false),
          result = [];
        for (let n = 0; n < 31; n++) {
          const date = new Date(Date.parse(v.checkIn) + n * 86400000)
            .toISOString()
            .slice(0, 10);
          const end = new Date(Date.parse(date) + 86400000)
            .toISOString()
            .slice(0, 10);
          const a = await availability(c, p, {
            ...v,
            checkIn: date,
            checkOut: end,
          });
          result.push({
            date,
            available: a.available,
            configured: a.configured,
          });
        }
        return result;
      });
      return json({ days });
    }
    // Preserve the original URL as an alias to the same validated request workflow.
    if (route === "bookings" && method === "POST")
      return (await commerceApi(req, ["commerce", "checkout"]))!;
    if (route === "login" && method === "POST") {
      const v = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(128),
        })
        .strict()
        .parse(await body(req));
      await rateLimit(`login-ip:${clientKey(req)}`, 30, 900);
      await rateLimit(`login:${v.email.toLowerCase()}`, 8, 900);
      const user = (
        await db().query("SELECT * FROM users WHERE email=$1 AND active", [
          v.email.toLowerCase(),
        ])
      ).rows[0];
      // Use the same expensive hash even for unknown accounts.
      const fallback = "00000000000000000000000000000000:" + "0".repeat(128);
      const valid = await verifyPassword(
        v.password,
        user?.password_hash || fallback,
      );
      if (!user || !valid)
        throw new BookingError(401, "Email or password is incorrect.");
      const value = token();
      await db().query(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
        [hash(value), user.id],
      );
      (await cookies()).set(sessionCookie, value, cookieOptions);
      return json({ ok: true });
    }
    if (route === "worker" && method === "POST") {
      if (
        !process.env.JOBS_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.JOBS_SECRET}`
      )
        throw new BookingError(401, "Unauthorized.");
      return json(await runJobs());
    }
    const user = await requireStaff();
    if (route === "me" && method === "GET") return json(user);
    if (route === "logout" && method === "POST") {
      const store = await cookies(),
        value = store.get(sessionCookie)?.value;
      if (value)
        await db().query("DELETE FROM sessions WHERE token_hash=$1", [
          hash(value),
        ]);
      store.delete(sessionCookie);
      return json({ ok: true });
    }
    if (route === "dashboard" && method === "GET") {
      const today = manilaDate();
      const [counts, upcoming, unread, available] = await Promise.all([
        db().query(
          "SELECT count(*)::int total,count(*) FILTER(WHERE status='PENDING')::int pending,count(*) FILTER(WHERE status='CONFIRMED')::int confirmed,count(*) FILTER(WHERE status='CANCELLED')::int cancelled,count(*) FILTER(WHERE check_in_date=$1 AND status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT'))::int arrivals,count(*) FILTER(WHERE check_out_date=$1 AND status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT'))::int departures FROM bookings",
          [today],
        ),
        db().query(
          "SELECT id,reference_number,public_tracking_reference,guest_name,product_name,check_in_date,status FROM bookings WHERE check_in_date>=$1 AND status IN ('PENDING','CONFIRMED') ORDER BY check_in_date LIMIT 8",
          [today],
        ),
        db().query(
          "SELECT count(*)::int count FROM notifications n WHERE NOT EXISTS(SELECT 1 FROM notification_reads r WHERE r.user_id=$1 AND r.notification_id=n.id)",
          [user.id],
        ),
        db().query(
          "SELECT count(*)::int count FROM accommodation_units u JOIN accommodation_types p ON p.id=u.accommodation_type_id WHERE u.active AND p.active AND p.overnight AND p.max_guests IS NOT NULL AND NOT EXISTS(SELECT 1 FROM booking_units bu WHERE bu.unit_id=u.id AND bu.active AND bu.check_in_date<=$1 AND bu.check_out_date>$1) AND NOT EXISTS(SELECT 1 FROM blocked_dates bd WHERE bd.product_id=p.id AND (bd.unit_id IS NULL OR bd.unit_id=u.id) AND bd.start_date<=$1 AND bd.end_date>$1)",
          [today],
        ),
      ]);
      return json({
        ...counts.rows[0],
        available: available.rows[0].count,
        unread: unread.rows[0].count,
        upcoming: upcoming.rows,
        integrations: integrationStatus(),
        today,
      });
    }
    if (route === "notifications/read" && method === "POST") {
      await db().query(
        "INSERT INTO notification_reads(user_id,notification_id) SELECT $1,id FROM notifications ON CONFLICT DO NOTHING",
        [user.id],
      );
      return json({ ok: true });
    }
    if (route === "bookings" && method === "GET") {
      validateFilters(params);
      return json(await listBookings(params));
    }
    if (path[0] === "bookings" && path.length === 2) {
      const id = uuid(path[1]);
      if (method === "GET") return json(await bookingDetails(id));
      if (method === "PATCH") {
        const v = z
          .object({
            status: z.enum(statuses).optional(),
            reason: text(2000).optional(),
            notes: text(2000).optional(),
            guestPhone: text(30)
              .regex(/^\+?[0-9 ()-]{7,30}$/)
              .optional(),
            version: z.number().int().min(1),
          })
          .strict()
          .parse(await body(req));
        await updateBooking(id, v, user);
        return json({ ok: true });
      }
    }
    if (path[0] === "payments")
      throw new BookingError(
        410,
        "Transaction recording has been retired. Payments are handled outside this website.",
      );
    if (route === "export" && method === "GET") {
      if (user.role !== "ADMIN" && !user.can_export)
        throw new BookingError(403, "Export permission required.");
      validateFilters(params);
      const buffer = await reservationWorkbook(params);
      await db().query(
        "INSERT INTO booking_activity_logs(action,performed_by) VALUES('EXCEL_EXPORTED',$1)",
        [user.id],
      );
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="paraiso-reservations-${manilaDate()}.xlsx"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    await requireStaff(true);
    if (route === "inventory" && method === "GET")
      return json(await inventory());
    if (route === "products" && method === "POST") {
      const raw = await body(req);
      if (
        raw &&
        typeof raw === "object" &&
        ("depositMode" in raw || "depositValue" in raw)
      )
        throw new BookingError(410, "Deposit configuration has been retired.");
      return json(await saveProduct(raw, user));
    }
    if (route === "units" && method === "POST") {
      await saveUnit(await body(req), user);
      return json({ ok: true });
    }
    if (route === "blocks" && method === "POST") {
      await saveBlock(await body(req), user);
      return json({ ok: true });
    }
    if (path[0] === "blocks" && path.length === 2 && method === "DELETE") {
      await transaction(async (c) => {
        const b = (
          await c.query("SELECT product_id FROM blocked_dates WHERE id=$1", [
            uuid(path[1]),
          ])
        ).rows[0];
        if (b) {
          await lockProduct(c, b.product_id);
          await c.query("DELETE FROM blocked_dates WHERE id=$1", [path[1]]);
          await c.query(
            "INSERT INTO booking_activity_logs(action,performed_by) VALUES('DATE_BLOCK_REMOVED',$1)",
            [user.id],
          );
        }
      });
      return json({ ok: true });
    }
    if (route === "addons" && method === "POST") {
      const v = z
        .object({
          id: z.string().uuid().optional(),
          name: text(120).min(2),
          price: z.number().min(0).max(1000000).nullable(),
          active: z.boolean(),
        })
        .strict()
        .parse(await body(req));
      await db().query(
        "INSERT INTO addons(id,name,price,active) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=$2,price=$3,active=$4",
        [v.id, v.name, v.price, v.active],
      );
      return json({ ok: true });
    }
    if (route === "accounts" && method === "GET") return json(await accounts());
    if (route === "accounts" && method === "POST") {
      await saveAccount(await body(req), user);
      return json({ ok: true });
    }
    if (route === "settings" && method === "GET") {
      const s = (
        await db().query(
          "SELECT drive_id,workbook_id,table_name,(token_encrypted IS NOT NULL) AS authorized FROM integration_settings WHERE id=1",
        )
      ).rows[0];
      const jobs = (
        await db().query(
          "SELECT j.id,j.kind,j.state,j.attempts,j.last_error,j.updated_at,b.reference_number,b.public_tracking_reference FROM integration_jobs j JOIN bookings b ON b.id=j.booking_id AND j.event_status !~ '(PAYMENT|VERIFICATION|BALANCE|REFUND|DEPOSIT|RECONCIL)' ORDER BY j.id DESC LIMIT 100",
        )
      ).rows;
      return json({ ...s, status: integrationStatus(), jobs });
    }
    if (route === "settings" && method === "POST") {
      const v = z
        .object({
          driveId: text(200),
          workbookId: text(200),
          tableName: text(120),
        })
        .strict()
        .parse(await body(req));
      await transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(19766121)");
        await c.query(
          "UPDATE integration_settings SET drive_id=$1,workbook_id=$2,table_name=$3,updated_at=now() WHERE id=1",
          [v.driveId, v.workbookId, v.tableName],
        );
        await c.query(
          "UPDATE integration_jobs SET state='PENDING',attempts=0,next_attempt_at=now() WHERE kind='EXCEL'",
        );
      });
      return json({ ok: true });
    }
    if (route === "jobs/retry" && method === "POST") {
      await db().query(
        "UPDATE integration_jobs SET state='PENDING',attempts=0,next_attempt_at=now() WHERE state<>'DONE' AND event_status !~ '(PAYMENT|VERIFICATION|BALANCE|REFUND|DEPOSIT|RECONCIL)'",
      );
      return json({ ok: true });
    }
    if (route === "jobs/run" && method === "POST")
      return json(await runJobs(5));
    if (route === "microsoft/connect" && method === "POST") {
      if (!integrationStatus().microsoft)
        throw new BookingError(
          503,
          "Set Microsoft client credentials, tenant and encryption key on the server first.",
        );
      const state = token();
      (await cookies()).set("ms_oauth_state", state, {
        ...cookieOptions,
        maxAge: 600,
      });
      const redirect = `${new URL(process.env.APP_URL || req.url).origin}/api/reservations/microsoft/callback/`;
      const query = new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID!,
        response_type: "code",
        redirect_uri: redirect,
        response_mode: "query",
        scope: "offline_access https://graph.microsoft.com/Files.ReadWrite",
        state,
        prompt: "consent",
      });
      return json({
        url: `https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_TENANT_ID!)}/oauth2/v2.0/authorize?${query}`,
      });
    }
    if (route === "microsoft/callback" && method === "GET") {
      const store = await cookies(),
        expected = store.get("ms_oauth_state")?.value;
      store.delete("ms_oauth_state");
      if (!expected || params.get("state") !== expected || !params.get("code"))
        throw new BookingError(
          400,
          "Microsoft authorization failed or expired. Try connecting again.",
        );
      const redirect = `${new URL(process.env.APP_URL || req.url).origin}/api/reservations/microsoft/callback/`;
      const response = await fetch(
        `https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_TENANT_ID!)}/oauth2/v2.0/token`,
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID!,
            client_secret: process.env.MS_CLIENT_SECRET!,
            code: params.get("code")!,
            grant_type: "authorization_code",
            redirect_uri: redirect,
            scope: "offline_access https://graph.microsoft.com/Files.ReadWrite",
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok)
        throw new BookingError(
          502,
          "Microsoft did not authorize this connection.",
        );
      const auth = await response.json();
      if (!auth.refresh_token)
        throw new BookingError(
          502,
          "Microsoft did not return offline authorization.",
        );
      await transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(19766121)");
        await c.query(
          "UPDATE integration_settings SET token_encrypted=$1,updated_at=now() WHERE id=1",
          [encrypt(auth.refresh_token)],
        );
      });
      return NextResponse.redirect(
        new URL("/admin/dashboard/?tab=settings", req.url),
      );
    }
    throw new BookingError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: error.issues
            .map((i) => `${i.path.join(".") || "Form"}: ${i.message}`)
            .join(" "),
        },
        400,
      );
    if (error instanceof BookingError)
      return json({ error: error.message }, error.status);
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "UNEXPECTED";
    console.error(JSON.stringify({ event: "reservation_api_error", code }));
    if (code === "23505")
      return json(
        { error: "This record already exists. Refresh and try again." },
        409,
      );
    if (code === "23P01")
      return json(
        { error: "These dates were just reserved. Choose another option." },
        409,
      );
    return json(
      {
        error:
          "The reservation service is temporarily unavailable. Please contact the resort or try again shortly.",
      },
      503,
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
