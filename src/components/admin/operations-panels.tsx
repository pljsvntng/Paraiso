"use client";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/booking/db";
import { api } from "@/lib/api/reservations";
import { peso, centavos } from "@/lib/booking/money";
import type { TrackedBooking } from "./types";
type Execute = (fn: () => Promise<unknown>, notice?: string) => Promise<void>;
export function ReadinessPanel() {
  const [data, setData] = useState<{
      checks: { name: string; ok: boolean; detail: string }[];
      services: {
        id: string;
        name: string;
        active: boolean;
        inventory_configured: boolean;
        price_configured: boolean;
        sessions_configured: boolean;
      }[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<NonNullable<typeof data>>("commerce/admin/readiness")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="reservation-panel admin-section">
      <h2>Operational setup checklist</h2>
      <p className="small-copy">
        Configure only approved resort information. These checks do not certify
        email delivery or production readiness.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Checking setup…</p>}
      {data && (
        <>
          <ul className="setup-checks">
            {data.checks.map((c) => (
              <li key={c.name}>
                <strong>
                  {c.ok ? "Configured" : "Action needed"} · {c.name}
                </strong>
                <span>{c.detail}</span>
              </li>
            ))}
          </ul>
          <h3>Service configuration</h3>
          {data.services.map((p) => (
            <p className="small-copy" key={p.id}>
              <strong>{p.name}</strong> · {p.active ? "Enabled" : "Disabled"} ·{" "}
              {p.inventory_configured
                ? "Inventory configured"
                : "Inventory needed"}{" "}
              ·{" "}
              {p.price_configured
                ? "Estimate configured"
                : "Staff will confirm the rate"}{" "}
              ·{" "}
              {p.sessions_configured
                ? "Schedule configured"
                : "Schedule needed"}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
export function RatesPanel({
  products,
  execute,
}: {
  products: Product[];
  execute: Execute;
}) {
  const [rates, setRates] = useState<
    {
      id: string;
      product_id: string;
      service_name: string;
      name: string;
      start_date: string;
      end_date: string;
      price_centavos: string;
      priority: number;
      active: boolean;
      weekdays: number[];
      child_price_centavos: string | null;
    }[]
  >([]);
  const load = useCallback(
    () => api<typeof rates>("commerce/admin/rates").then(setRates),
    [],
  );
  useEffect(() => {
    void load().catch(() => {});
  }, [load]);
  return (
    <section className="reservation-panel admin-section">
      <h2>Seasonal, weekday & holiday rates</h2>
      <p className="small-copy">
        Rates apply per booked date. End date is excluded. The highest matching
        priority wins; overlapping equal priorities are rejected. Existing
        booking amounts remain unchanged.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void execute(async () => {
            await api("commerce/admin/rates", {
              productId: f.get("productId"),
              name: f.get("name"),
              start: f.get("start"),
              end: f.get("end"),
              weekdays: f.getAll("weekday").map(Number),
              priceCentavos: centavos(String(f.get("price"))),
              childPriceCentavos: f.get("childPrice")
                ? centavos(String(f.get("childPrice")))
                : null,
              priority: Number(f.get("priority")),
              active: true,
            });
            await load();
          }, "Approved rate period saved.");
        }}
      >
        <div className="reservation-grid">
          <label className="field">
            Service
            <select name="productId" required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Rule name
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            Start
            <input name="start" type="date" required />
          </label>
          <label className="field">
            End (excluded)
            <input name="end" type="date" required />
          </label>
          <label className="field">
            Rate (PHP)
            <input name="price" type="number" min="0" step="0.01" required />
          </label>
          <label className="field">
            Child rate (blank uses rate)
            <input name="childPrice" type="number" min="0" step="0.01" />
          </label>
          <label className="field">
            Priority
            <input
              name="priority"
              type="number"
              min="0"
              max="1000"
              defaultValue="0"
              required
            />
          </label>
        </div>
        <fieldset>
          <legend>Applicable days (Asia/Manila)</legend>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <label className="checkbox-field" key={day}>
              <input type="checkbox" name="weekday" value={i} defaultChecked />
              <span>{day}</span>
            </label>
          ))}
        </fieldset>
        <button className="admin-action">Add approved rate</button>
      </form>
      {rates.map((r) => (
        <p className="small-copy" key={r.id}>
          {r.service_name}: {r.name} · {r.start_date} to {r.end_date} ·{" "}
          {peso(Number(r.price_centavos))} · priority {r.priority} ·{" "}
          {r.active ? "Active" : "Disabled"}
          {r.active && (
            <button
              className="admin-action"
              onClick={() =>
                void execute(async () => {
                  await api("commerce/admin/rates", {
                    id: r.id,
                    productId: r.product_id,
                    name: r.name,
                    start: r.start_date,
                    end: r.end_date,
                    weekdays: r.weekdays,
                    priceCentavos: Number(r.price_centavos),
                    childPriceCentavos:
                      r.child_price_centavos === null
                        ? null
                        : Number(r.child_price_centavos),
                    priority: r.priority,
                    active: false,
                  });
                  await load();
                }, "Rate period disabled for new quotes.")
              }
            >
              Disable
            </button>
          )}
        </p>
      ))}
    </section>
  );
}
export function ChangeRequests({
  execute,
  onOpen,
}: {
  execute: Execute;
  onOpen: (id: string) => void;
}) {
  const [requests, setRequests] = useState<
      {
        id: string;
        booking_id: string;
        reference_number: string;
        public_tracking_reference?: string | null;
        guest_name: string;
        kind: string;
        message: string;
        state: string;
      }[]
    >([]),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<typeof requests>("commerce/admin/change-requests").then(setRequests),
    [],
  );
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <section className="reservation-panel admin-section">
      <h2>Guest change requests</h2>
      {error && <p role="alert">{error}</p>}
      {!requests.length && <p className="small-copy">No guest requests.</p>}
      {requests.map((r) => (
        <article className="admin-section" key={r.id}>
          <strong>
            {displayedReservationReference(r)} · {r.kind} · {r.state}
          </strong>
          <p>{r.message}</p>
          <button className="admin-action" onClick={() => onOpen(r.booking_id)}>
            Open reservation
          </button>
          {r.state === "PENDING" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void execute(async () => {
                  await api(`commerce/admin/review-change/${r.id}`, {
                    decision: f.get("decision"),
                    note: f.get("note"),
                  });
                  await load();
                }, "Guest request reviewed.");
              }}
            >
              <label className="field">
                Decision
                <select name="decision">
                  <option value="REJECT">Decline request</option>
                  {r.kind === "CANCEL" && (
                    <option value="APPROVE_CANCEL">Approve cancellation</option>
                  )}
                </select>
              </label>
              <label className="field">
                Response to guest
                <input name="note" required minLength={10} maxLength={1000} />
              </label>
              <button className="admin-action">Save decision</button>
              {r.kind === "RESCHEDULE" && (
                <p className="small-copy">
                  To approve, open the reservation and preview the requested
                  dates in Reschedule.
                </p>
              )}
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
export function ReschedulePanel({
  booking,
  execute,
  onUpdated,
}: {
  booking: TrackedBooking;
  execute: Execute;
  onUpdated: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<{
      policyVersion: number;
      policy: string;
      version: number;
    } | null>(null),
    [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  return (
    <section className="admin-section">
      <h3>Reschedule with guest consent</h3>
      <p className="small-copy">
        Every service is rechecked in one transaction. Review the revised dates
        and service estimates, then record the guest’s agreement.
      </p>
      <form
        onChange={() => setPreview(null)}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const data = {
            version: booking.version,
            note: f.get("note"),
            ...(f.get("requestId")
              ? { changeRequestId: f.get("requestId") }
              : {}),
            items: booking.items.map((i) => ({
              itemId: i.id,
              checkIn: f.get(`start-${i.id}`),
              ...(i.overnight ? { checkOut: f.get(`end-${i.id}`) } : {}),
              slot: f.get(`slot-${i.id}`) || "",
            })),
          };
          void execute(async () => {
            setPayload(data);
            setPreview(
              await api(`commerce/admin/reschedule/${booking.id}`, data),
            );
          });
        }}
      >
        {booking.items.map((i) => (
          <fieldset key={i.id}>
            <legend>{i.name}</legend>
            <div className="reservation-grid">
              <label className="field">
                New visit / check-in
                <input
                  name={`start-${i.id}`}
                  type="date"
                  defaultValue={i.check_in_date}
                  required
                />
              </label>
              {i.overnight && (
                <label className="field">
                  New check-out
                  <input
                    name={`end-${i.id}`}
                    type="date"
                    defaultValue={i.check_out_date}
                    required
                  />
                </label>
              )}
              <label className="field">
                Configured session (blank for full day)
                <input name={`slot-${i.id}`} defaultValue={i.slot} />
              </label>
            </div>
          </fieldset>
        ))}
        <label className="field">
          Related guest request
          <select name="requestId">
            <option value="">Staff-arranged change</option>
            {booking.changeRequests
              ?.filter((r) => r.state === "PENDING" && r.kind === "RESCHEDULE")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.message}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Reason / audit note
          <input name="note" required minLength={10} maxLength={1000} />
        </label>
        <button className="admin-action">Preview revised availability</button>
      </form>
      {preview && payload && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              await api(`commerce/admin/reschedule/${booking.id}?commit=true`, {
                ...payload,
                policyVersion: preview.policyVersion,
                guestConsent: true,
              });
              setPreview(null);
              await onUpdated();
            }, "Reservation rescheduled.");
          }}
        >
          <p>
            Availability has been rechecked for every service. Confirm the
            revised dates under the published policy.
          </p>
          <p className="policy-copy">{preview.policy}</p>
          <label className="checkbox-field">
            <input type="checkbox" required />
            <span>
              The guest accepted these exact revised dates and published policy
              version {preview.policyVersion}. I have recorded their consent.
            </span>
          </label>
          <button className="reservation-button">
            Apply agreed reschedule
          </button>
        </form>
      )}
    </section>
  );
}
