"use client";
import { displayedReservationReference } from "@/lib/booking/tracking-status";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Download } from "lucide-react";
import type { Staff } from "@/lib/booking/db";
import { api } from "@/lib/api/reservations";
import { useAdminResource } from "@/hooks/use-admin-resource";
import {
  CartCheckout,
  serviceCategories,
} from "@/components/booking/cart-checkout";
import { ReadinessPanel, ChangeRequests } from "./operations-panels";
import { StaffCalendar } from "./calendar";
import { type Inventory, type Account } from "./forms";
import { AdminShell, allowedTab, tabMeta, type AdminTab } from "./shell";
import { AdminOverview, ActivityFeed, type Insights } from "./overview";
import { ServiceWorkspace, StaffWorkspace } from "./service-workspace";
import { ReservationDrawer } from "./reservation-drawer";
import {
  ReservationReports,
  GuestRecords,
  ReservationSettings,
} from "./reservation-records";
import {
  AdminEmpty,
  AdminLoading,
  AdminPanel,
  AdminStatus,
  adminDate,
  readable,
} from "./ui";
import { reservationStatus } from "@/lib/booking/request-status";
import type { BookingRow, BookingDetail } from "./types";
const serviceTabs = [
  "inventory",
  "accommodations",
  "swimming",
  "adventures",
  "dining",
  "availability",
];
export function Dashboard({
  user,
  initialTab = "overview",
}: {
  user: Staff;
  initialTab?: string;
}) {
  const router = useRouter(),
    searchParams = useSearchParams(),
    tab = allowedTab(searchParams.get("tab") || "overview", user),
    [insights, setInsights] = useState<Insights | null>(null),
    [unread, setUnread] = useState(0),
    [rows, setRows] = useState<BookingRow[]>([]),
    [detail, setDetail] = useState<BookingDetail | null>(null),
    [inventory, setInventory] = useState<Inventory | null>(null),
    [accounts, setAccounts] = useState<Account[]>([]),
    [filters, setFilters] = useState(
      initialTab === "pending" ? "status=PENDING_APPROVAL" : "",
    ),
    [page, setPage] = useState(1),
    [range, setRange] = useState(""),
    [manualDate, setManualDate] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState("");
  const generation = useRef(0),
    loadRequest = useRef<AbortController | null>(null),
    operation = useRef(false),
    openRequest = useRef(0),
    admin = user.role === "ADMIN",
    canApprove = admin || user.can_approve,
    canExport = admin || user.can_export;
  const directory = tab === "reservations" || tab === "pending";
  const load = useCallback(async () => {
    const version = ++generation.current;
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    const get = <T,>(path: string) =>
      api<T>(path, undefined, "GET", { signal: controller.signal });
    const [overview, data, extra] = await Promise.allSettled([
      get<{ unread: number }>("dashboard"),
      get<Insights>(`commerce/admin/insights?${range}`),
      directory
        ? get<BookingRow[]>(`bookings?${filters}&page=${page}`)
        : serviceTabs.includes(tab) && admin
          ? get<Inventory>("inventory")
          : tab === "accounts" && admin
            ? get<Account[]>("accounts")
            : Promise.resolve(null),
    ]);
    if (version !== generation.current || controller.signal.aborted) return;
    if (overview.status === "fulfilled") setUnread(overview.value.unread);
    if (data.status === "fulfilled") setInsights(data.value);
    if (extra.status === "fulfilled") {
      if (directory) setRows(extra.value as BookingRow[]);
      else if (serviceTabs.includes(tab))
        setInventory(extra.value as Inventory);
      else if (tab === "accounts") setAccounts(extra.value as Account[]);
    }
    setLoadError(
      [overview, data, extra]
        .filter((r) => r.status === "rejected")
        .map((r) =>
          r.reason instanceof Error
            ? r.reason.message
            : "Unable to load workspace data.",
        )
        .filter((message, i, all) => all.indexOf(message) === i)
        .join(" "),
    );
  }, [tab, admin, directory, filters, page, range]);
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError("");
          setRows([]);
          setInventory(null);
          setAccounts([]);
          return load();
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const timer = setInterval(() => {
      if (!document.hidden && !operation.current)
        void load().catch((e) => setError(e.message));
    }, 30000);
    return () => {
      active = false;
      loadRequest.current?.abort();
      clearInterval(timer);
    };
  }, [load]);
  function navigate(next: AdminTab, query?: string) {
    const target = allowedTab(next, user);
    openRequest.current++;
    setDetail(null);
    setPage(1);
    if (target === "pending") {
      setFilters("status=PENDING_APPROVAL");
      void api("notifications/read", {})
        .then(() => setUnread(0))
        .catch(() => {});
    }
    if (target === "reservations") setFilters(query || "");
    setError("");
    setNotice("");
    router.replace(`/admin/dashboard/?tab=${encodeURIComponent(target)}`, {
      scroll: false,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const reservations = (f: Record<string, string>) =>
    navigate("reservations", new URLSearchParams(f).toString());
  async function execute(
    fn: () => Promise<unknown>,
    message = "Changes saved.",
  ) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action.",
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function open(id: string) {
    const request = ++openRequest.current;
    try {
      const d = await api<BookingDetail>(`bookings/${id}`);
      if (request === openRequest.current) {
        setDetail(d);
        setError("");
      }
    } catch (e) {
      if (request !== openRequest.current) return;
      setError(
        e instanceof Error ? e.message : "Unable to open this reservation.",
      );
    }
  }
  async function reloadDetail() {
    if (detail) await open(detail.id);
  }
  async function update(input: {
    status?: string;
    reason?: string;
    notes?: string;
    guestPhone?: string;
  }) {
    if (!detail) return false;
    let saved = false;
    await execute(
      async () => {
        await api(
          `bookings/${detail.id}`,
          { ...input, version: detail.version },
          "PATCH",
        );
        saved = true;
        await open(detail.id);
      },
      input.status
        ? "Reservation status updated."
        : "Reservation details saved.",
    );
    return saved;
  }
  async function logout() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      await api("logout", {});
      openRequest.current++;
      generation.current++;
      loadRequest.current?.abort();
      router.replace("/admin/login/");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  const q = new URLSearchParams(filters);
  return (
    <AdminShell
      user={user}
      tab={tab}
      onNavigate={navigate}
      onSearch={(query) => reservations({ q: query })}
      onLogout={() => void logout()}
      unread={unread}
      pendingCount={insights?.metrics.approvals || 0}
    >
      <div className="admin-workspace" aria-busy={busy}>
        {tab !== "overview" && (
          <header className="workspace-heading">
            <div>
              <p className="workspace-eyebrow">RESERVATION OPERATIONS</p>
              <h1>{tabMeta[tab].title}</h1>
              <p>{tabMeta[tab].description}</p>
            </div>
            <button
              className="reservation-button"
              onClick={() => navigate("add reservation")}
            >
              <Plus size={17} />
              New reservation
            </button>
          </header>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loadError && (
          <div className="admin-load-error" role="alert">
            <p>{loadError}</p>
            <button
              className="admin-action"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              Retry loading
            </button>
            <a href="/admin/login/">Sign in</a>
          </div>
        )}
        {notice && (
          <p className="admin-toast" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <AdminLoading />
        ) : (
          <>
            {admin &&
              tab === "overview" &&
              insights &&
              !insights.demoMode &&
              !insights.emailConfigured && (
                <p className="admin-notice" role="status">
                  Email delivery needs configuration. Reservations and staff
                  decisions are saved.{" "}
                  <button
                    className="text-action"
                    onClick={() => navigate("settings")}
                  >
                    Review resort settings
                  </button>
                </p>
              )}
            {tab === "overview" && insights && (
              <AdminOverview
                data={insights}
                onNavigate={navigate}
                onReservations={reservations}
                onOpen={(id) => void open(id)}
                onRange={(from, to) =>
                  setRange(new URLSearchParams({ from, to }).toString())
                }
                refreshing={busy}
              />
            )}{" "}
            {directory && (
              <>
                <AdminPanel
                  title={
                    tab === "pending"
                      ? "Requests awaiting approval"
                      : "Reservation directory"
                  }
                  description="Search, review and manage guest reservations."
                >
                  <form
                    key={filters}
                    className="reservation-filter-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPage(1);
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
                    {q.get("guestEmail") && (
                      <>
                        <input
                          type="hidden"
                          name="guestEmail"
                          value={q.get("guestEmail")!}
                        />
                        <p>Guest history: {q.get("guestEmail")}</p>
                      </>
                    )}
                    <div className="primary-filters">
                      <label className="field">
                        Guest or reference
                        <input
                          name="q"
                          type="search"
                          maxLength={120}
                          defaultValue={q.get("q") || ""}
                        />
                      </label>
                      <label className="field">
                        Reservation status
                        <select
                          name="status"
                          defaultValue={q.get("status") || ""}
                        >
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
                            <option key={s} value={s}>
                              {readable(s)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Service category
                        <select
                          name="category"
                          defaultValue={q.get("category") || ""}
                        >
                          <option value="">All services</option>
                          {serviceCategories.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="reservation-button" disabled={busy}>
                        Apply filters
                      </button>
                    </div>
                    <details className="filter-disclosure">
                      <summary>Date & sorting filters</summary>
                      <div className="advanced-filters">
                        <label className="field">
                          Date basis
                          <select
                            name="dateField"
                            defaultValue={q.get("dateField") || "arrival"}
                          >
                            <option value="arrival">Arrival date</option>
                            <option value="departure">Departure date</option>
                          </select>
                        </label>
                        <label className="field">
                          From
                          <input
                            name="from"
                            type="date"
                            defaultValue={q.get("from") || ""}
                          />
                        </label>
                        <label className="field">
                          To
                          <input
                            name="to"
                            type="date"
                            defaultValue={q.get("to") || ""}
                          />
                        </label>
                        <label className="field">
                          Sort by
                          <select
                            name="sort"
                            defaultValue={q.get("sort") || "newest"}
                          >
                            {[
                              ["newest", "Newest first"],
                              ["oldest", "Oldest first"],
                              ["arrival", "Arrival date"],
                              ["departure", "Departure date"],
                              ["guest", "Guest name"],
                            ].map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </details>
                  </form>
                  <div className="directory-toolbar">
                    <span>
                      Page {page} · {rows.length} reservations{" "}
                      {filters && (
                        <button
                          className="text-action"
                          onClick={() => {
                            setFilters("");
                            setPage(1);
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </span>
                    <div>
                      {canExport && (
                        <a
                          className="admin-action"
                          href={`/api/reservations/export/?${filters}`}
                          download
                        >
                          <Download size={16} />
                          Export Excel
                        </a>
                      )}
                      <button
                        className="icon-button"
                        aria-label="Refresh reservations"
                        disabled={busy}
                        onClick={() => void load()}
                      >
                        <RefreshCw size={17} />
                      </button>
                    </div>
                  </div>
                  {rows.length ? (
                    <>
                      <div
                        className="admin-table-wrap reservation-desktop-table"
                        role="region"
                        aria-label="Reservation directory, scroll for additional columns"
                        tabIndex={0}
                      >
                        <table className="admin-table reservation-directory">
                          <thead>
                            <tr>
                              {[
                                "Reservation reference",
                                "Guest name",
                                "Contact number",
                                "Category",
                                "Selected services",
                                "Visit date",
                                "Guests",
                                "Date submitted",
                                "Status",
                                "Actions",
                              ].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id}>
                                <td>
                                  <button
                                    className="reference-link"
                                    onClick={() => void open(r.id)}
                                  >
                                    {displayedReservationReference(r)}
                                  </button>
                                </td>
                                <td>{r.guest_name}</td>
                                <td>{r.guest_phone}</td>
                                <td>{readable(r.booking_category)}</td>
                                <td>{r.product_name}</td>
                                <td>
                                  {adminDate(r.check_in_date)}
                                  {r.overnight && (
                                    <small>
                                      to {adminDate(r.check_out_date)}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  {r.guest_summary ||
                                    `${r.adult_count + r.child_count} guests`}
                                </td>
                                <td>{adminDate(r.created_at, true)}</td>
                                <td>
                                  <AdminStatus value={reservationStatus(r)} />
                                </td>
                                <td>
                                  <button
                                    className="admin-action"
                                    onClick={() => void open(r.id)}
                                  >
                                    View & manage
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="reservation-mobile-cards">
                        {rows.map((r) => (
                          <article key={r.id}>
                            <div>
                              <strong>
                                {displayedReservationReference(r)}
                              </strong>
                              <AdminStatus value={reservationStatus(r)} />
                            </div>
                            <h3>{r.guest_name}</h3>
                            <p>
                              {r.guest_phone} · {readable(r.booking_category)}
                            </p>
                            <p>{r.product_name}</p>
                            <p>
                              {adminDate(r.check_in_date)} ·{" "}
                              {r.guest_summary ||
                                `${r.adult_count + r.child_count} guests`}
                            </p>
                            <small>
                              Submitted {adminDate(r.created_at, true)}
                            </small>
                            <button
                              className="admin-action"
                              onClick={() => void open(r.id)}
                            >
                              View & manage
                            </button>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <AdminEmpty
                      title="No matching reservations"
                      description="Try different filters, or wait for a new request."
                    />
                  )}
                  <div className="admin-pagination">
                    <button
                      className="admin-action"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page}</span>
                    <button
                      className="admin-action"
                      disabled={rows.length < 50}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </AdminPanel>
                {canApprove && (
                  <details className="admin-disclosure">
                    <summary>Guest change requests</summary>
                    <ChangeRequests
                      execute={execute}
                      onOpen={(id) => void open(id)}
                    />
                  </details>
                )}
              </>
            )}
            {tab === "add reservation" && (
              <CartCheckout
                manual
                initialCheckIn={manualDate}
                onCreated={(reference) => {
                  navigate("pending");
                  setNotice(`Reservation ${reference} saved as pending.`);
                }}
              />
            )}
            {tab === "calendar" && (
              <StaffCalendar
                onOpen={(id) => void open(id)}
                onCreate={(date) => {
                  setManualDate(date);
                  navigate("add reservation");
                }}
              />
            )}
            {serviceTabs.includes(tab) && inventory && admin && (
              <ServiceWorkspace
                key={tab}
                tab={tab}
                data={inventory}
                execute={execute}
                error={error}
                busy={busy}
              />
            )}{" "}
            {tab === "guests" && (
              <GuestRecords
                onHistory={(email) => reservations({ guestEmail: email })}
              />
            )}{" "}
            {["reports", "export"].includes(tab) && canExport && (
              <ReservationReports onOpen={(id) => void open(id)} />
            )}{" "}
            {tab === "accounts" && admin && (
              <StaffWorkspace
                data={accounts}
                execute={execute}
                error={error}
                busy={busy}
              />
            )}{" "}
            {tab === "booking settings" && (
              <ReservationSettings
                user={user}
                execute={execute}
                onNavigate={navigate}
              />
            )}{" "}
            {tab === "settings" && admin && (
              <>
                <ReservationSettings
                  user={user}
                  execute={execute}
                  onNavigate={navigate}
                  profile
                />
                <ReadinessPanel />
                <NotificationSettings execute={execute} />
              </>
            )}{" "}
            {tab === "activity" && insights && (
              <ActivityFeed data={insights} onOpen={(id) => void open(id)} />
            )}
          </>
        )}
        {detail && (
          <ReservationDrawer
            key={detail.id}
            detail={detail}
            user={user}
            busy={busy}
            error={error}
            onClose={() => {
              setDetail(null);
              openRequest.current++;
            }}
            onReload={reloadDetail}
            onUpdate={update}
            execute={execute}
          />
        )}
      </div>
    </AdminShell>
  );
}
function NotificationSettings({
  execute,
}: {
  execute: (fn: () => Promise<unknown>, notice?: string) => Promise<void>;
}) {
  const resource = useAdminResource<{
      status: { email: boolean; staffEmail: boolean };
      jobs: {
        id: number;
        kind: string;
        state: string;
        reference_number: string;
        public_tracking_reference?: string | null;
        last_error: string;
      }[];
    }>("settings"),
    data = resource.data,
    error = resource.error;
  return (
    <AdminPanel title="Reservation notifications">
      {error && (
        <div className="admin-load-error" role="alert">
          <p>{error}</p>
          <button
            className="admin-action"
            onClick={() => void resource.reload().catch(() => {})}
          >
            Retry notifications
          </button>
        </div>
      )}
      {data ? (
        <>
          <p>
            SMTP: {data.status.email ? "Configured" : "Not configured"} · Staff
            recipients:{" "}
            {data.status.staffEmail ? "Configured" : "Not configured"}
          </p>
          <p>
            Server credentials remain private. Queued notifications are not
            proof of delivery.
          </p>
          <button
            className="admin-action"
            onClick={() =>
              void execute(async () => {
                await api("jobs/run", {});
                await resource.reload();
              }, "Notification batch processed. Review delivery status.")
            }
          >
            Process notification queue
          </button>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reservation</th>
                  <th>Notification</th>
                  <th>Delivery status</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{displayedReservationReference(j)}</td>
                    <td>{j.kind}</td>
                    <td>
                      {j.state} {j.last_error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading notification status…</p>
      )}
    </AdminPanel>
  );
}
