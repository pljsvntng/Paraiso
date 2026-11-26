"use client";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
import { useState } from "react";
import { useAdminResource } from "@/hooks/use-admin-resource";
import { api } from "@/lib/api/reservations";
import {
  AdminPanel,
  AdminStatus,
  AdminEmpty,
  AdminLoading,
  adminDate,
} from "./ui";
import { serviceCategories } from "@/components/booking/cart-checkout";
import type { Staff } from "@/lib/booking/db";
import type { AdminTab } from "./shell";
import type { BookingRow } from "./types";
export function ReservationReports({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const [filters, setFilters] = useState(""),
    [downloadError, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const resource = useAdminResource<BookingRow[]>(`bookings?${filters}&page=1`),
    rows = resource.data || [],
    error = downloadError || resource.error;
  async function download() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/reservations/export/?${filters}`);
      if (!r.ok) throw new Error((await r.json()).error || "Export failed.");
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = "paraiso-reservations.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminPanel
      title="Reservation reports & Excel export"
      description="Reservation records, guest details and staff decisions. Downloads work without Microsoft 365."
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
          {resource.error && (
            <button
              type="button"
              className="admin-action"
              onClick={() => void resource.reload().catch(() => {})}
            >
              Retry report
            </button>
          )}
        </p>
      )}
      <form
        className="reservation-grid"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(
            new URLSearchParams(
              [...new FormData(e.currentTarget)].map(([k, v]) => [
                k,
                String(v),
              ]),
            ).toString(),
          );
        }}
      >
        <label className="field">
          Visit date from
          <input name="from" type="date" />
        </label>
        <label className="field">
          Visit date to
          <input name="to" type="date" />
        </label>
        <label className="field">
          Category
          <select name="category">
            <option value="">All categories</option>
            {serviceCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Reservation status
          <select name="status">
            <option value="">All statuses</option>
            {[
              "PENDING_APPROVAL",
              "CONFIRMED",
              "DECLINED",
              "CANCELLED",
              "CHECKED_IN",
              "CHECKED_OUT",
              "COMPLETED",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="reservation-button">Apply report filters</button>
      </form>
      <button
        className="admin-action"
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? "Preparing Excel…" : "Download reservation Excel"}
      </button>
      <p>
        Preview: up to 50 records. The download includes all matching
        reservations, up to 10,000.
      </p>
      {resource.loading ? (
        <AdminLoading label="Loading reservation report…" />
      ) : !resource.error && !rows.length ? (
        <AdminEmpty
          title="No matching reservations"
          description="Try a different date range or reservation status."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Services</th>
                <th>Visit date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="reference-link"
                      onClick={() => onOpen(r.id)}
                    >
                      {displayedReservationReference(r)}
                    </button>
                  </td>
                  <td>{r.guest_name}</td>
                  <td>{r.product_name}</td>
                  <td>{adminDate(r.check_in_date)}</td>
                  <td>
                    <AdminStatus value={r.workflow_status || r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPanel>
  );
}
export function GuestRecords({
  onHistory,
}: {
  onHistory: (email: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    resource = useAdminResource<
      {
        email: string;
        guest_name: string;
        guest_phone: string;
        total: number;
        previous: number;
        upcoming: number;
        cancelled: number;
      }[]
    >(`commerce/admin/guests?q=${encodeURIComponent(search)}&page=${page}`),
    rows = resource.data || [],
    error = resource.error;
  return (
    <AdminPanel
      title="Guest records"
      description="Private contact details and reservation history, grouped by booking email."
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
          <button
            type="button"
            className="admin-action"
            onClick={() => void resource.reload().catch(() => {})}
          >
            Retry guest records
          </button>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(String(new FormData(e.currentTarget).get("q") || ""));
        }}
      >
        <label className="field">
          Search guests
          <input
            name="q"
            type="search"
            maxLength={120}
            placeholder="Name, email or contact number"
          />
        </label>
        <button className="admin-action">Search guests</button>
      </form>
      {resource.loading ? (
        <AdminLoading label="Loading guest records…" />
      ) : error ? null : rows.length ? (
        <div className="guest-record-grid">
          {rows.map((g) => (
            <article key={g.email} className="reservation-panel">
              <h3>{g.guest_name}</h3>
              <p>
                {g.guest_phone || "Contact number not provided"}
                <br />
                {g.email}
              </p>
              <p>
                {g.total} reservations · {g.previous} previous · {g.upcoming}{" "}
                upcoming · {g.cancelled} cancelled
              </p>
              <button
                className="admin-action"
                onClick={() => onHistory(g.email)}
              >
                View reservation history
              </button>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmpty
          title="No matching guests"
          description="Guest records appear after a reservation is submitted."
        />
      )}
      <div className="admin-pagination">
        <button
          className="admin-action"
          disabled={resource.loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="admin-action"
          disabled={resource.loading || rows.length < 50}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </AdminPanel>
  );
}
export function ReservationSettings({
  user,
  execute,
  onNavigate,
  profile = false,
}: {
  user: Staff;
  execute: (fn: () => Promise<unknown>, notice?: string) => Promise<void>;
  onNavigate: (t: AdminTab) => void;
  profile?: boolean;
}) {
  const resource = useAdminResource<Record<string, string | number | null>>(
      "commerce/admin/policies",
    ),
    config = resource.data;
  if (!config)
    return resource.error ? (
      <div className="admin-load-error" role="alert">
        <p>{resource.error}</p>
        <button
          className="admin-action"
          onClick={() => void resource.reload().catch(() => {})}
        >
          Retry settings
        </button>
      </div>
    ) : (
      <AdminLoading label="Loading reservation settings…" />
    );
  const admin = user.role === "ADMIN",
    fields = profile
      ? [
          ["Resort name", "resort_name"],
          ["Resort address", "resort_address"],
          ["Resort contact number", "resort_phone"],
          ["Resort email", "resort_email"],
          ["Approved operating hours", "operating_hours"],
        ]
      : [
          ["Owner-approved booking terms", "terms"],
          ["Owner-approved cancellation policy", "cancellation_policy"],
          ["Owner-approved privacy policy", "privacy_policy"],
          [
            "Owner-approved reservation and rescheduling policy",
            "rescheduling_policy",
          ],
        ];
  return (
    <AdminPanel
      title={
        profile
          ? "Resort information & operations"
          : "Published reservation policies"
      }
      description="Enter verified resort information only. Blank fields remain unconfigured."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            value = (k: string) =>
              String(f.has(k) ? f.get(k) : (config[k] ?? ""));
          void execute(async () => {
            await api("commerce/admin/policies", {
              version: Number(config.policy_version),
              resortName: value("resort_name"),
              resortAddress: value("resort_address"),
              resortPhone: value("resort_phone"),
              resortEmail: value("resort_email"),
              operatingHours: value("operating_hours"),
              terms: value("terms"),
              cancellationPolicy: value("cancellation_policy"),
              privacyPolicy: value("privacy_policy"),
              reschedulingPolicy: value("rescheduling_policy"),
              reminderDays: value("reminder_days")
                ? Number(value("reminder_days"))
                : null,
            });
            await resource.reload();
          }, "Reservation settings saved.");
        }}
      >
        {fields.map(([label, key]) => (
          <label className="field" key={key}>
            {label}
            {profile &&
            ["resort_name", "resort_phone", "resort_email"].includes(key) ? (
              <input
                name={key}
                type={
                  key === "resort_email"
                    ? "email"
                    : key === "resort_phone"
                      ? "tel"
                      : "text"
                }
                defaultValue={String(config[key] || "")}
                key={key + config.policy_version}
                maxLength={
                  key === "resort_name"
                    ? 160
                    : key === "resort_phone"
                      ? 40
                      : 254
                }
                readOnly={!admin}
              />
            ) : (
              <textarea
                name={key}
                defaultValue={String(config[key] || "")}
                key={key + config.policy_version}
                rows={profile ? 2 : 5}
                maxLength={profile ? 2000 : 20000}
                readOnly={!admin}
              />
            )}
          </label>
        ))}
        {profile && (
          <label className="field">
            Visit reminder (days before arrival; blank disables)
            <input
              name="reminder_days"
              type="number"
              min="1"
              max="30"
              defaultValue={config.reminder_days ?? ""}
            />
          </label>
        )}
        {admin && (
          <button className="reservation-button">
            Save reservation settings
          </button>
        )}
      </form>
      {profile && (
        <>
          <h3>Schedules & availability</h3>
          <div className="drawer-quick-actions">
            {[
              ["accommodations", "Accommodation availability"],
              ["swimming", "Swimming schedules"],
              ["adventures", "Adventure schedules"],
              ["dining", "Dining schedules"],
              ["accounts", "Staff accounts"],
            ].map(([tab, label]) => (
              <button
                className="admin-action"
                key={tab}
                onClick={() => onNavigate(tab as AdminTab)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </AdminPanel>
  );
}
