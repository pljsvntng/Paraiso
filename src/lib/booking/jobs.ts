import nodemailer from "nodemailer";
import { type PoolClient } from "pg";
import { db } from "./db";
import { decrypt, encrypt } from "./security";
import { excelHeaders, excelValues, type ExportBooking } from "./excel";
import { reservationStatus } from "./request-status";
import { summaryColumns } from "./summaries";
import { demoRequested } from "./demo-mode";
import { ensureTrackingReference } from "./public-tracking";
type Settings = {
  drive_id: string;
  workbook_id: string;
  table_name: string;
  token_encrypted: string | null;
};
export function integrationStatus() {
  if (demoRequested())
    return { email: false, staffEmail: false, microsoft: false };
  return {
    email: !!(process.env.SMTP_HOST && process.env.SMTP_FROM),
    staffEmail: !!process.env.STAFF_NOTIFICATION_EMAILS,
    microsoft: !!(
      process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.INTEGRATION_ENCRYPTION_KEY
    ),
  };
}
export async function microsoftToken(c: PoolClient, settings: Settings) {
  if (demoRequested()) throw new Error("DEMO_DELIVERY_DISABLED");
  if (!settings.token_encrypted || !integrationStatus().microsoft)
    throw new Error("NOT_CONFIGURED");
  const result = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_TENANT_ID!)}/oauth2/v2.0/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID!,
        client_secret: process.env.MS_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: decrypt(settings.token_encrypted),
        scope: "offline_access https://graph.microsoft.com/Files.ReadWrite",
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!result.ok) throw new Error(`MICROSOFT_AUTH_${result.status}`);
  const value = await result.json();
  if (value.refresh_token)
    await c.query(
      "UPDATE integration_settings SET token_encrypted=$1,updated_at=now() WHERE id=1",
      [encrypt(value.refresh_token)],
    );
  return value.access_token as string;
}
export async function syncExcel(
  c: PoolClient,
  booking: ExportBooking,
  settings: Settings,
  graphFetch: typeof fetch = fetch,
  accessToken?: string,
) {
  if (demoRequested()) throw new Error("DEMO_DELIVERY_DISABLED");
  if (!settings.drive_id || !settings.workbook_id || !settings.table_name)
    throw new Error("NOT_CONFIGURED");
  const access = accessToken || (await microsoftToken(c, settings));
  const root = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(settings.drive_id)}/items/${encodeURIComponent(settings.workbook_id)}/workbook/tables/${encodeURIComponent(settings.table_name)}`;
  async function graph(url: string, method = "GET", body?: unknown) {
    if (!url.startsWith("https://graph.microsoft.com/v1.0/"))
      throw new Error("INVALID_GRAPH_URL");
    const r = await graphFetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`GRAPH_${r.status}`);
    return r.status === 204 ? null : r.json();
  }
  const columns = await graph(`${root}/columns`);
  if (
    JSON.stringify(columns.value.map((v: { name: string }) => v.name)) !==
    JSON.stringify(excelHeaders)
  )
    throw new Error("EXCEL_COLUMN_MISMATCH");
  let next = `${root}/rows?$top=500`,
    index: number | null = null;
  while (next) {
    const page = await graph(next);
    for (const row of page.value)
      if (row.values?.[0]?.[0] === booking.reference_number) {
        if (index !== null) throw new Error("EXCEL_DUPLICATE_REFERENCE");
        index = row.index;
      }
    next = page["@odata.nextLink"] || "";
  }
  // Scan first on every retry, including after ambiguous network failures.
  // Prefix formula-leading guest text for Graph, which can interpret it as formulas.
  const values = excelValues(booking).map((v) =>
    typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v,
  );
  if (index !== null)
    await graph(`${root}/rows/${index}`, "PATCH", { values: [values] });
  else
    await graph(`${root}/rows/add`, "POST", { index: null, values: [values] });
}
async function sendMail(
  b: ExportBooking,
  kind: string,
  eventStatus: string,
  jobId: string,
  details = "",
) {
  const status = integrationStatus();
  if (!status.email || (kind === "STAFF_EMAIL" && !status.staffEmail))
    throw new Error("NOT_CONFIGURED");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 15000,
    socketTimeout: 20000,
  });
  const pending = eventStatus.startsWith("PENDING");
  const reference = b.public_tracking_reference || b.reference_number;
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to:
      kind === "STAFF_EMAIL"
        ? process.env.STAFF_NOTIFICATION_EMAILS
        : b.guest_email,
    messageId: `<paraiso-${jobId}@${new URL(process.env.APP_URL || "https://localhost").hostname}>`,
    subject: `Paraiso reservation ${reference}: ${eventStatus.replaceAll("_", " ")}`,
    text: `${kind === "STAFF_EMAIL" ? "A reservation update is ready for review." : `Hello ${b.guest_name},`}\n\nReservation reference: ${reference}\n${b.product_name}\nArrival: ${b.check_in_date}\n${b.overnight ? `Departure: ${b.check_out_date}\n` : ""}Guests: ${b.guest_summary || (b.is_cart ? "See service itinerary" : b.adult_count + b.child_count)}\nStatus: ${["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(eventStatus) ? reservationStatus(b) : eventStatus}\n\n${details}\n${pending ? "Your request is awaiting resort confirmation. Your reservation is not yet guaranteed." : "Please contact the resort if you need assistance with this reservation."}\n\nParaiso de June Quixote Ecofarm Resort`,
  });
}
async function processJobs(limit = 20) {
  await (await import("./maintenance")).commerceMaintenance();
  const c = await db().connect();
  let processed = 0;
  try {
    for (let n = 0; n < limit; n++) {
      await c.query("BEGIN");
      try {
        // Transaction-scoped lock also works behind a transaction-pooled connection.
        const locked = (
          await c.query("SELECT pg_try_advisory_xact_lock(19766121) AS locked")
        ).rows[0].locked;
        if (!locked) {
          await c.query("ROLLBACK");
          return { processed, busy: true };
        }
        const job = (
          await c.query(
            "SELECT * FROM integration_jobs WHERE state IN ('PENDING','FAILED','NOT_CONFIGURED') AND attempts<12 AND next_attempt_at<=now() AND event_status !~ '(PAYMENT|VERIFICATION|BALANCE|REFUND|DEPOSIT|RECONCIL)' ORDER BY id LIMIT 1",
          )
        ).rows[0];
        if (!job) {
          await c.query("COMMIT");
          break;
        }
        try {
          const b = (
            await c.query(
              `SELECT b.*,p.overnight,${summaryColumns} FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE b.id=$1`,
              [job.booking_id],
            )
          ).rows[0];
          const settings = (
            await c.query("SELECT * FROM integration_settings WHERE id=1")
          ).rows[0];
          if (job.kind === "EXCEL") await syncExcel(c, b, settings);
          else {
            let details = "";
            {
              const items = (
                await c.query(
                  "SELECT name,check_in_date,check_out_date,overnight,slot,adult_count,child_count FROM booking_items WHERE booking_id=$1 ORDER BY check_in_date,slot",
                  [b.id],
                )
              ).rows;
              details =
                "Selected services:\n" +
                items
                  .map(
                    (i) =>
                      `${i.name}: ${i.check_in_date}${i.overnight ? ` to ${i.check_out_date}` : ""} ${i.slot} · ${i.adult_count} adults, ${i.child_count} children`,
                  )
                  .join("\n");
              if (b.decline_reason)
                details += `\nResort response: ${b.decline_reason}`;
              if (job.kind === "GUEST_EMAIL") {
                const trackingReference = await ensureTrackingReference(
                  c,
                  b.id,
                );
                b.public_tracking_reference = trackingReference;
                details +=
                  "\nPublic tracking reference: " +
                  trackingReference +
                  "\nSave this reference to track your reservation from any device.";
                if (process.env.APP_URL)
                  details +=
                    "\nTrack reservation: " +
                    process.env.APP_URL +
                    "/booking/track/#reference=" +
                    encodeURIComponent(trackingReference);
              } else
                details += `\nStaff dashboard: ${process.env.APP_URL || ""}/admin/dashboard/`;
              details +=
                "\nNo online payment is required. Only resort staff can approve this request.";
            }
            await sendMail(
              b,
              job.kind,
              job.event_status,
              String(job.id),
              details,
            );
          }
          await c.query(
            "UPDATE integration_jobs SET state='DONE',attempts=attempts+1,last_error=NULL,updated_at=now() WHERE id=$1",
            [job.id],
          );
        } catch (error) {
          const raw =
            error instanceof Error ? error.message : "INTEGRATION_FAILED";
          const message =
            /^(NOT_CONFIGURED|MICROSOFT_AUTH_\d+|GRAPH_\d+|DEPOSIT_NOT_VERIFIED|EXCEL_COLUMN_MISMATCH|EXCEL_DUPLICATE_REFERENCE|INVALID_GRAPH_URL)$/.test(
              raw,
            )
              ? raw
              : "DELIVERY_FAILED";
          const unconfigured = message === "NOT_CONFIGURED";
          await c.query(
            "UPDATE integration_jobs SET state=$2,attempts=attempts+$3,last_error=$4,next_attempt_at=now()+$5*interval '1 second',updated_at=now() WHERE id=$1",
            [
              job.id,
              unconfigured ? "NOT_CONFIGURED" : "FAILED",
              unconfigured ? 0 : 1,
              message,
              unconfigured ? 3600 : Math.min(21600, 30 * 2 ** job.attempts),
            ],
          );
        }
        await c.query("COMMIT");
        processed++;
      } catch (error) {
        await c.query("ROLLBACK");
        throw error;
      }
    }
    await c.query(
      "DELETE FROM rate_limits WHERE expires_at<now()-interval '1 day'",
    );
    await c.query("DELETE FROM sessions WHERE expires_at<now()");
    return { processed, busy: false };
  } finally {
    c.release();
  }
}
export async function runJobs(limit = 20) {
  if (demoRequested())
    return { processed: 0, busy: false, demoSuppressed: true };
  const run = (
    await db().query(
      "INSERT INTO operational_worker_runs DEFAULT VALUES RETURNING id",
    )
  ).rows[0];
  try {
    const result = await processJobs(limit);
    await db().query(
      "UPDATE operational_worker_runs SET finished_at=now(),state='DONE',processed=$2 WHERE id=$1",
      [run.id, result.processed],
    );
    return result;
  } catch (error) {
    await db().query(
      "UPDATE operational_worker_runs SET finished_at=now(),state='FAILED',error_code='WORKER_FAILED' WHERE id=$1",
      [run.id],
    );
    throw error;
  }
}
