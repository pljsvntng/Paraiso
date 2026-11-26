"use client";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/reservations";
import { manilaDate } from "@/lib/dates";
import { serviceCategories } from "@/components/booking/cart-checkout";
import { AdminEmpty, readable } from "./ui";
type CalendarData = {
  items: {
    id: string;
    booking_id: string;
    name: string;
    category: string;
    check_in_date: string;
    check_out_date: string;
    slot: string;
    guest_name: string;
    reference_number: string;
    public_tracking_reference?: string | null;
    status: string;
    workflow_status: string | null;
    allocated: boolean;
  }[];
  blocks: {
    id: string;
    name: string;
    category: string;
    start_date: string;
    end_date: string;
    slot: string;
    unit_identifier: string | null;
  }[];
};
const addDay = (s: string, n: number) =>
  new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10);
export function StaffCalendar({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate?: (date: string) => void;
}) {
  const [date, setDate] = useState(manilaDate()),
    [view, setView] = useState("month"),
    [category, setCategory] = useState(""),
    [data, setData] = useState<CalendarData>({ items: [], blocks: [] }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const first = date.slice(0, 8) + "01",
    weekday = (new Date(date).getUTCDay() + 6) % 7;
  const start =
    view === "month"
      ? addDay(first, -((new Date(first).getUTCDay() + 6) % 7))
      : view === "week"
        ? addDay(date, -weekday)
        : date;
  const count = view === "month" ? 42 : view === "day" ? 1 : 7;
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return api<CalendarData>(
          "commerce/admin/calendar?" +
            new URLSearchParams({
              from: start,
              to: addDay(start, count - 1),
              category,
            }),
        );
      })
      .then((r) => {
        if (active) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [start, count, category]);
  function shift(direction: number) {
    if (view === "month") {
      const d = new Date(first);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(addDay(date, direction * (view === "day" ? 1 : 7)));
  }
  function days(agenda: boolean) {
    const entries = Array.from({ length: count }, (_, index) =>
      addDay(start, index),
    ).map((day) => ({
      day,
      items: data.items
        .filter((i) => i.check_in_date <= day && i.check_out_date > day)
        .sort((a, b) => a.slot.localeCompare(b.slot)),
      blocks: data.blocks.filter(
        (b) => b.start_date <= day && b.end_date > day,
      ),
    }));
    const visible = agenda
      ? entries.filter((d) => d.items.length || d.blocks.length)
      : entries;
    return visible.length ? (
      visible.map(({ day, items, blocks }) => (
        <section
          key={day}
          className={"calendar-day" + (day === manilaDate() ? " is-today" : "")}
        >
          <h3>
            {new Date(day).toLocaleDateString("en-PH", {
              timeZone: "UTC",
              day: "numeric",
              month: "short",
              weekday: "short",
            })}
            {day === manilaDate() ? " · Today" : ""}
          </h3>
          {onCreate && day >= manilaDate() && (
            <button className="admin-action" onClick={() => onCreate(day)}>
              Add reservation
            </button>
          )}
          {items.map((i, index) => (
            <button
              key={i.booking_id + "-" + index}
              className={
                "calendar-event status-" +
                (i.workflow_status || i.status).toLowerCase()
              }
              onClick={() => onOpen(i.booking_id)}
            >
              <strong>
                {i.slot || "All day / room night"} · {i.name}
              </strong>
              <small>
                {i.guest_name} · {displayedReservationReference(i)}
                <br />
                {readable(i.workflow_status || i.status)}
                {i.allocated ? " · Inventory allocated" : ""}
              </small>
            </button>
          ))}
          {blocks.map((b) => (
            <div key={b.id} className="calendar-event status-blocked">
              <strong>Blocked: {b.name}</strong>
              <small>
                {b.unit_identifier || "All units / service"} ·{" "}
                {b.slot || "All sessions"}
              </small>
            </div>
          ))}
        </section>
      ))
    ) : (
      <AdminEmpty
        title="No scheduled activity in this period"
        description="Choose another date or add a reservation to plan the next visit."
        action={
          onCreate ? (
            <button className="admin-action" onClick={() => onCreate(date)}>
              Add reservation
            </button>
          ) : undefined
        }
      />
    );
  }
  return (
    <section>
      <h2>Resort booking calendar</h2>
      <div className="admin-filters">
        <label className="field">
          Calendar date
          <input
            type="date"
            value={date}
            required
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <label className="field">
          View
          <select
            aria-label="Calendar view"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="month">Monthly calendar</option>
            <option value="week">Weekly schedule</option>
            <option value="day">Daily timeline</option>
            <option value="agenda">Agenda</option>
          </select>
        </label>
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All services</option>
            {serviceCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="calendar-navigation">
        <strong>
          {new Date(date).toLocaleDateString("en-PH", {
            timeZone: "UTC",
            month: "long",
            year: "numeric",
            ...(view === "day" ? { day: "numeric" } : {}),
          })}
        </strong>
        <button
          className="admin-action"
          aria-label="Previous calendar period"
          onClick={() => shift(-1)}
        >
          Previous
        </button>
        <button className="admin-action" onClick={() => setDate(manilaDate())}>
          Today
        </button>
        <button
          className="admin-action"
          aria-label="Next calendar period"
          onClick={() => shift(1)}
        >
          Next
        </button>
      </div>
      <p className="admin-notice">
        Asia/Manila · Green: approved / occupied · Gold: pending · Grey:
        cancelled / expired · Rose: declined · Red: blocked. Pending reservation
        requests do not reserve capacity.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="small-copy">
          Loading resort schedule…
        </p>
      )}
      <div className="calendar-desktop-grid admin-table-wrap">
        <div
          className={
            "staff-calendar calendar-" + (view === "day" ? "dayview" : view)
          }
        >
          {days(view === "agenda")}
        </div>
      </div>
      <div className="calendar-mobile-agenda">
        <div className="staff-calendar calendar-agenda">{days(true)}</div>
      </div>
    </section>
  );
}
