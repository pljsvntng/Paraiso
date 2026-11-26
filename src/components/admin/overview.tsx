"use client";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Clock3,
  BadgeCheck,
  CalendarDays,
  Plus,
} from "lucide-react";
import { AdminPanel, AdminEmpty, AdminStatus, adminDate, readable } from "./ui";
import type { AdminTab } from "./shell";
export type InsightBooking = {
  id: string;
  reference_number: string;
  public_tracking_reference?: string | null;
  guest_name: string;
  product_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  workflow_status: string;
  category?: string;
  slot?: string;
};
export type Insights = {
  demoMode?: boolean;
  today: string;
  from: string;
  to: string;
  emailConfigured: boolean;
  metrics: {
    total: number;
    approvals: number;
    approved: number;
    checkins: number;
    checkouts: number;
    visits: number;
    upcoming: number;
    declined: number;
    cancelled: number;
    room_units: number;
    occupied_units: number;
  };
  recent: InsightBooking[];
  arrivals: InsightBooking[];
  visits: InsightBooking[];
  scheduled: InsightBooking[];
  trend: { date: string; reservations: number }[];
  categories: { category: string; count: number }[];
  statuses: { status: string; count: number }[];
  activity: {
    id: string;
    booking_id: string | null;
    action: string;
    timestamp: string;
    reference_number: string | null;
    public_tracking_reference?: string | null;
    actor: string | null;
    new_status: string | null;
  }[];
};
function VisitList({
  rows,
  onOpen,
}: {
  rows: InsightBooking[];
  onOpen: (id: string) => void;
}) {
  return rows.length ? (
    <div className="attention-records">
      {rows.map((r, i) => (
        <button key={r.id + "-" + i} onClick={() => onOpen(r.id)}>
          <span>
            <strong>
              {r.guest_name} · {displayedReservationReference(r)}
            </strong>
            <small>{r.product_name}</small>
            <small>
              {adminDate(r.check_in_date)} {r.slot || ""}
            </small>
          </span>
          <AdminStatus value={r.workflow_status} />
        </button>
      ))}
    </div>
  ) : (
    <AdminEmpty
      compact
      title="No scheduled reservations"
      description="Verified reservation records will appear here."
    />
  );
}
export function AdminOverview({
  data,
  onNavigate,
  onReservations,
  onOpen,
  onRange,
  refreshing,
}: {
  data: Insights;
  onNavigate: (t: AdminTab) => void;
  onReservations: (f: Record<string, string>) => void;
  onOpen: (id: string) => void;
  onRange: (from: string, to: string) => void;
  refreshing: boolean;
}) {
  const m = data.metrics,
    stats = [
      {
        label: "Total reservations",
        value: m.total,
        icon: ClipboardList,
        action: () => onReservations({}),
      },
      {
        label: "Pending approval",
        value: m.approvals,
        icon: Clock3,
        action: () => onNavigate("pending"),
      },
      {
        label: "Confirmed reservations",
        value: m.approved,
        icon: BadgeCheck,
        action: () => onReservations({ status: "CONFIRMED" }),
      },
      {
        label: "Today’s visits",
        value: m.visits,
        icon: CalendarCheck,
        action: () => onNavigate("calendar"),
      },
      {
        label: "Today’s departures",
        value: m.checkouts,
        icon: CalendarClock,
        action: () =>
          onReservations({
            from: data.today,
            to: data.today,
            dateField: "departure",
          }),
      },
      {
        label: "Upcoming reservations",
        value: m.upcoming,
        icon: CalendarDays,
        action: () => onReservations({ from: data.today, status: "CONFIRMED" }),
      },
      {
        label: "Declined reservations",
        value: m.declined,
        icon: ClipboardList,
        action: () => onReservations({ status: "DECLINED" }),
      },
      {
        label: "Cancelled reservations",
        value: m.cancelled,
        icon: CalendarDays,
        action: () => onReservations({ status: "CANCELLED" }),
      },
    ];
  const peak = Math.max(1, ...data.trend.map((t) => t.reservations));
  return (
    <>
      <div className="overview-welcome">
        <div>
          <span className="workspace-eyebrow">YOUR RESORT, AT A GLANCE</span>
          <h1>Reservation dashboard</h1>
          <p>Requests first. Clear schedules. Confident approvals.</p>
        </div>
        <button
          className="reservation-button"
          onClick={() => onNavigate("add reservation")}
        >
          <Plus size={17} />
          New reservation
        </button>
      </div>
      <div className="admin-kpis">
        {stats.map(({ icon: Icon, ...s }) => (
          <button className="admin-kpi" key={s.label} onClick={s.action}>
            <span className="kpi-top">
              {s.label}
              <Icon size={18} />
            </span>
            <strong>{s.value}</strong>
          </button>
        ))}
      </div>
      <div className="overview-operation-grid">
        <AdminPanel
          className="reservation-summary-panel"
          title="Requests awaiting approval"
          action={
            <button
              className="admin-action"
              onClick={() => onNavigate("pending")}
            >
              Review pending requests
            </button>
          }
        >
          <p>
            {m.approvals} requests need a staff decision. Availability is
            rechecked when you approve.
          </p>
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Today’s scheduled visits"
        >
          <VisitList rows={data.visits} onOpen={onOpen} />
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Recent reservation requests"
        >
          <VisitList rows={data.recent.slice(0, 5)} onOpen={onOpen} />
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Upcoming confirmed visits"
        >
          <VisitList rows={data.arrivals.slice(0, 5)} onOpen={onOpen} />
        </AdminPanel>
      </div>
      <div className="analytics-heading">
        <h2>Reservation activity</h2>
        <form
          className="analytics-range"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onRange(String(f.get("from")), String(f.get("to")));
          }}
        >
          <label>
            From
            <input name="from" type="date" defaultValue={data.from} required />
          </label>
          <label>
            To
            <input name="to" type="date" defaultValue={data.to} required />
          </label>
          <button
            className="admin-action"
            disabled={refreshing}
            aria-label="Apply analytics range"
          >
            Apply
          </button>
        </form>
      </div>
      <div className="overview-chart-grid">
        <AdminPanel
          className="reservation-summary-panel"
          title="Reservations over time"
        >
          {data.trend.some((p) => p.reservations > 0) ? (
            <figure>
              <svg
                viewBox="0 0 600 160"
                width="100%"
                role="img"
                aria-label="Daily reservation request counts"
              >
                {data.trend.map((p, i) => (
                  <rect
                    key={p.date}
                    x={(i * 600) / data.trend.length}
                    y={150 - (p.reservations / peak) * 140}
                    width={Math.max(1, 600 / data.trend.length - 3)}
                    height={(p.reservations / peak) * 140}
                    fill="#577b52"
                  >
                    <title>
                      {p.date}: {p.reservations} requests
                    </title>
                  </rect>
                ))}
              </svg>
              <figcaption>
                {data.from} to {data.to} · Asia/Manila
              </figcaption>
            </figure>
          ) : (
            <p className="overview-empty-copy">
              No reservation requests in this date range.
            </p>
          )}
          <details>
            <summary>View daily figures</summary>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reservations</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((t) => (
                    <tr key={t.date}>
                      <td>{t.date}</td>
                      <td>{t.reservations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Reservation status distribution"
        >
          {data.statuses.map((s) => (
            <p key={s.status}>
              <AdminStatus
                value={s.status === "PENDING" ? "PENDING_APPROVAL" : s.status}
              />
              <strong> {s.count}</strong>
            </p>
          ))}
          {!data.statuses.length && (
            <p className="overview-empty-copy">
              Reservation statuses appear after the first request.
            </p>
          )}
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Reservations by category"
        >
          {data.categories.map((c) => (
            <p key={c.category}>
              {readable(c.category)} <strong>{c.count}</strong>
            </p>
          ))}
          {!data.categories.length && (
            <p className="overview-empty-copy">
              Service categories appear after the first request.
            </p>
          )}
        </AdminPanel>
        <AdminPanel
          className="reservation-summary-panel"
          title="Accommodation occupancy"
        >
          {m.room_units > 0 ? (
            <strong className="panel-stat">
              {m.room_units
                ? Math.round((m.occupied_units / m.room_units) * 100)
                : 0}
              %
            </strong>
          ) : (
            <p className="overview-empty-copy">
              No active accommodation units configured.
            </p>
          )}
          <p>
            {m.occupied_units} of {m.room_units} active rooms occupied today.
          </p>
        </AdminPanel>
      </div>
      <div className="overview-operation-grid">
        {[
          ["ACCOMMODATION", "Upcoming accommodation check-ins"],
          ["SWIMMING", "Upcoming swimming & cottages"],
          ["ACTIVITY", "Upcoming adventures"],
          ["DINING", "Upcoming dining reservations"],
        ]
          .filter(([category]) =>
            data.scheduled.some((r) => r.category === category),
          )
          .map(([category, title]) => (
            <AdminPanel
              className="reservation-summary-panel"
              key={category}
              title={title}
            >
              <VisitList
                rows={data.scheduled
                  .filter((r) => r.category === category)
                  .slice(0, 5)}
                onOpen={onOpen}
              />
            </AdminPanel>
          ))}
      </div>
      {!data.scheduled.length && (
        <AdminPanel title="Upcoming service schedules">
          <p className="overview-empty-copy">
            No upcoming confirmed services. Approved reservations will appear
            here by category.
          </p>
        </AdminPanel>
      )}
    </>
  );
}
export function ActivityFeed({
  data,
  onOpen,
}: {
  data: Insights;
  onOpen: (id: string) => void;
}) {
  return (
    <AdminPanel
      className="reservation-summary-panel"
      title="Reservation activity logs"
      description="Recent reservation and administrative events. Private payloads are excluded."
    >
      {data.activity.length ? (
        <ol className="admin-timeline">
          {data.activity.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{readable(a.action)}</strong>
                <p>
                  {a.booking_id ? (
                    <button
                      className="text-action"
                      onClick={() => onOpen(a.booking_id!)}
                    >
                      {displayedReservationReference(a)}
                    </button>
                  ) : (
                    "Resort configuration"
                  )}{" "}
                  · {a.actor || "Guest / system"}
                </p>
                <time>{adminDate(a.timestamp, true)}</time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <AdminEmpty
          title="No activity yet"
          description="Reservation actions will be recorded here."
        />
      )}
    </AdminPanel>
  );
}
