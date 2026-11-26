"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Staff } from "@/lib/booking/db";
import { transitions } from "@/lib/booking/validation";
import { reservationStatus } from "@/lib/booking/request-status";
import { api } from "@/lib/api/reservations";
import { AdminStatus, adminDate, readable } from "./ui";
import { ReschedulePanel } from "./operations-panels";
import type { BookingDetail } from "./types";
import { CopyTrackingReference } from "./copy-tracking-reference";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
type Update = {
  status?: string;
  reason?: string;
  notes?: string;
  guestPhone?: string;
};
export function ReservationDrawer({
  detail,
  user,
  busy,
  error,
  onClose,
  onReload,
  onUpdate,
  execute,
}: {
  detail: BookingDetail;
  user: Staff;
  busy: boolean;
  error: string;
  onClose: () => void;
  onReload: () => Promise<void>;
  onUpdate: (v: Update) => Promise<boolean>;
  execute: (fn: () => Promise<unknown>, notice?: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [section, setSection] = useState("summary"),
    [decision, setDecision] = useState("");
  const canApprove = user.role === "ADMIN" || user.can_approve;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      modal = dialog.current;
    modal?.showModal();
    return () => {
      modal?.close();
      previous?.focus();
    };
  }, []);
  const state = reservationStatus(detail),
    labels: Record<string, string> = {
      CONFIRMED: "Approve Reservation",
      DECLINED: "Decline Reservation",
      CANCELLED: "Cancel Reservation",
      CHECKED_IN: "Check In",
      CHECKED_OUT: detail.items.some((i) => i.overnight)
        ? "Check Out"
        : "Complete Visit",
    };
  return (
    <div className="admin-detail">
      <dialog
        ref={dialog}
        className="reservation-drawer"
        aria-labelledby="booking-detail-title"
        onClose={(event) => {
          // Strict Mode reopens the dialog after effect cleanup. Its queued
          // close event must not dismiss the newly reopened review panel.
          if (!event.currentTarget.open) onClose();
        }}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="drawer-header">
          <div>
            <span className="workspace-eyebrow">
              {displayedReservationReference(detail)} ·{" "}
              {detail.reservation_channel || detail.source}
            </span>
            <h2 id="booking-detail-title">{detail.guest_name}</h2>
            <AdminStatus value={state} />
          </div>
          <button
            className="icon-button"
            disabled={busy}
            aria-label="Close reservation details"
            onClick={() => dialog.current?.close()}
          >
            <X size={21} />
          </button>
        </header>
        <nav className="drawer-tabs" aria-label="Reservation detail sections">
          {[
            "summary",
            ...(canApprove && ["PENDING", "CONFIRMED"].includes(detail.status)
              ? ["reschedule"]
              : []),
            "history",
          ].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSection(s);
                setDecision("");
              }}
              aria-pressed={section === s}
            >
              {s === "summary"
                ? "Overview"
                : s === "history"
                  ? "Notes & history"
                  : "Reschedule"}
            </button>
          ))}
        </nav>
        <div className="drawer-body">
          {error && (
            <p className="form-error" role="alert">
              {error}
              <button
                type="button"
                className="admin-action"
                disabled={busy}
                onClick={() => void onReload()}
              >
                Reload reservation
              </button>
            </p>
          )}
          {decision ? (
            <section className="decision-panel">
              <h3>{labels[decision]}</h3>
              <p>
                {displayedReservationReference(detail)} · {detail.guest_name}
              </p>
              <ul>
                {detail.items.map((i) => (
                  <li key={i.id}>
                    {i.name} · {i.check_in_date}
                    {i.overnight ? ` to ${i.check_out_date}` : ""} {i.slot} ·{" "}
                    {i.adult_count + i.child_count} guests
                  </li>
                ))}
              </ul>
              <p>
                {decision === "CONFIRMED"
                  ? "All services must be available. Availability will be rechecked before approval."
                  : decision === "DECLINED"
                    ? "The public tracker shows only the declined status. Communicate any explanation to the guest directly."
                    : "Confirm this change to the reservation. Released inventory becomes available again."}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(
                    new FormData(e.currentTarget).get("reason") || "",
                  );
                  void onUpdate({ status: decision, reason }).then((saved) => {
                    if (saved) setDecision("");
                  });
                }}
              >
                {decision === "DECLINED" && (
                  <label className="field">
                    Reason for declining
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                    />
                  </label>
                )}
                <div className="drawer-quick-actions">
                  <button className="reservation-button" disabled={busy}>
                    {labels[decision]}
                  </button>
                  <button
                    type="button"
                    className="admin-action"
                    onClick={() => setDecision("")}
                    disabled={busy}
                  >
                    Go back
                  </button>
                </div>
              </form>
            </section>
          ) : section === "summary" ? (
            <>
              <div className="drawer-contact">
                <a href={`mailto:${detail.guest_email}`}>
                  {detail.guest_email}
                </a>
                <a href={`tel:${detail.guest_phone}`}>{detail.guest_phone}</a>
                {detail.guest_address && <p>{detail.guest_address}</p>}
                {detail.additional_phone && <p>{detail.additional_phone}</p>}
              </div>
              <section className="drawer-contact">
                {detail.public_tracking_reference ? (
                  <CopyTrackingReference
                    reference={detail.public_tracking_reference}
                  />
                ) : (
                  <>
                    <p>
                      Confirm the guest’s booking details before giving them a
                      public tracking reference.
                    </p>
                    <button
                      type="button"
                      className="admin-action"
                      disabled={busy}
                      onClick={() =>
                        void execute(async () => {
                          await api(
                            `commerce/admin/tracking-reference/${detail.id}`,
                            {},
                          );
                          await onReload();
                        }, "Public tracking reference is ready to share with the verified guest.")
                      }
                    >
                      Create public tracking reference
                    </button>
                  </>
                )}
                <p className="small-copy">
                  Internal reference (staff records only):{" "}
                  {detail.reference_number}
                </p>
              </section>
              <div className="drawer-quick-actions">
                {(detail.status === "CONFIRMED" &&
                !detail.items.some((i) => i.overnight)
                  ? ["CHECKED_OUT", "CANCELLED"]
                  : transitions[detail.status] || []
                )
                  .filter(
                    (s) =>
                      !["CONFIRMED", "DECLINED", "CANCELLED"].includes(s) ||
                      canApprove,
                  )
                  .map((target) => (
                    <button
                      className={
                        target === "CONFIRMED"
                          ? "reservation-button"
                          : "admin-action"
                      }
                      key={target}
                      disabled={busy}
                      onClick={() => setDecision(target)}
                    >
                      {labels[target]}
                    </button>
                  ))}
              </div>
              {detail.decline_reason && (
                <p className="admin-notice">
                  Staff response: {detail.decline_reason}
                </p>
              )}
              <section className="drawer-section">
                <h3>Reserved services</h3>
                {detail.items.length ? (
                  detail.items.map((i) => (
                    <article className="drawer-service" key={i.id}>
                      <span>{readable(i.category)}</span>
                      <h4>{i.name}</h4>
                      <p>
                        {adminDate(i.check_in_date)}
                        {i.overnight
                          ? ` to ${adminDate(i.check_out_date)}`
                          : ""}{" "}
                        {i.slot}
                      </p>
                      <p>
                        {i.adult_count} adults · {i.child_count} children ·{" "}
                        {i.units_count} unit / group
                      </p>
                      {i.special_requests && <p>{i.special_requests}</p>}
                      {!!i.addons?.length && (
                        <p>{i.addons.map((a) => a.name).join(", ")}</p>
                      )}
                    </article>
                  ))
                ) : (
                  <p>
                    {detail.product_name} · {adminDate(detail.check_in_date)}
                  </p>
                )}
              </section>
              <section className="drawer-section">
                <h3>Guest requests & allocated units</h3>
                <p className="preserve-lines">
                  {detail.special_requests || "No special requests recorded."}
                </p>
                <p>
                  Allocated units:{" "}
                  {detail.units.map((u) => u.unit_identifier).join(", ") ||
                    "None"}
                </p>
                {detail.reviewed_at && (
                  <p>Reviewed {adminDate(detail.reviewed_at, true)}</p>
                )}
              </section>
              <details className="admin-disclosure">
                <summary>Edit permitted guest details</summary>
                <form
                  key={detail.version}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void onUpdate({
                      notes: String(f.get("notes")),
                      guestPhone: String(f.get("phone")),
                    });
                  }}
                >
                  <label className="field">
                    Contact number
                    <input
                      name="phone"
                      defaultValue={detail.guest_phone}
                      maxLength={30}
                      required
                    />
                  </label>
                  <label className="field">
                    Special requests
                    <textarea
                      name="notes"
                      defaultValue={detail.special_requests}
                      maxLength={2000}
                    />
                  </label>
                  <button className="reservation-button" disabled={busy}>
                    Save permitted details
                  </button>
                </form>
              </details>
            </>
          ) : section === "reschedule" ? (
            <ReschedulePanel
              booking={{ ...detail, workflow_status: state }}
              execute={execute}
              onUpdated={onReload}
            />
          ) : (
            <>
              <section className="drawer-section">
                <h3>Private staff notes</h3>
                {detail.staff_notes.map((n) => (
                  <article className="staff-note" key={n.id}>
                    <strong>{n.full_name}</strong>
                    <time>{adminDate(n.created_at, true)}</time>
                    <p>{n.note}</p>
                  </article>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void execute(async () => {
                      await api(`commerce/admin/notes/${detail.id}`, {
                        requestKey: crypto.randomUUID(),
                        note: f.get("internalNote"),
                      });
                      await onReload();
                    }, "Private staff note added.");
                  }}
                >
                  <label className="field">
                    Internal note
                    <textarea
                      name="internalNote"
                      required
                      maxLength={2000}
                      rows={3}
                    />
                  </label>
                  <button className="admin-action" disabled={busy}>
                    Add private note
                  </button>
                </form>
              </section>
              <section className="drawer-section">
                <h3>Reservation activity</h3>
                <ol className="admin-timeline">
                  {detail.history.map((h, i) => (
                    <li key={i}>
                      <div>
                        <strong>{readable(h.action)}</strong>
                        <p>
                          {h.full_name || "Guest / system"} ·{" "}
                          {h.new_status && readable(h.new_status)}
                        </p>
                        <time>{adminDate(h.timestamp, true)}</time>
                        <details>
                          <summary>Event details</summary>
                          <pre>{JSON.stringify(h.details, null, 2)}</pre>
                        </details>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <details className="admin-disclosure">
                <summary>Notification delivery</summary>
                {detail.jobs.map((j) => (
                  <p key={j.id}>
                    {j.kind} · {j.state} {j.last_error}
                  </p>
                ))}
              </details>
            </>
          )}
        </div>
        <footer className="drawer-footer">
          <span>Submitted {adminDate(detail.created_at, true)}</span>
          <button
            className="admin-action"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </footer>
      </dialog>
    </div>
  );
}
