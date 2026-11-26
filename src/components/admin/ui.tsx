"use client";
import type { ReactNode } from "react";
import { Inbox, LoaderCircle } from "lucide-react";
export const readable = (value: string | null | undefined) =>
  (value || "Pending")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
export function AdminStatus({ value }: { value: string | null | undefined }) {
  const status = (value || "PENDING").toUpperCase();
  const tone = [
    "CONFIRMED",
    "CHECKED_IN",
    "PAID",
    "VERIFIED",
    "DONE",
    "ACTIVE",
    "NOT_REQUIRED",
  ].includes(status)
    ? "success"
    : ["CANCELLED", "DECLINED", "REJECTED", "FAILED", "EXPIRED"].includes(
          status,
        )
      ? "danger"
      : ["CHECKED_OUT", "COMPLETED", "INACTIVE", "DISABLED"].includes(status)
        ? "neutral"
        : "warning";
  return (
    <span className={`admin-badge badge-${tone}`}>{readable(status)}</span>
  );
}
export function AdminEmpty({
  title = "Nothing here yet",
  description,
  action,
  compact = false,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`admin-empty${compact ? " admin-empty-compact" : ""}`}>
      <span className="empty-icon">
        <Inbox size={23} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function AdminLoading({
  label = "Loading workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="admin-loading" role="status">
      <span className="loading-caption">
        <LoaderCircle size={18} />
        {label}
      </span>
      <div className="admin-skeleton-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
export function AdminPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel ${className}`}>
      <header className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}
export const adminDate = (
  value: string | null | undefined,
  withTime = false,
) => {
  if (!value) return "Not provided";
  const date = new Date(
    value.length === 10 ? `${value}T00:00:00+08:00` : value,
  );
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    ...(withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { month: "short", day: "numeric", year: "numeric" }),
  }).format(date);
};
