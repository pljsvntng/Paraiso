"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  House,
  Waves,
  Mountain,
  UtensilsCrossed,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import type { Staff } from "@/lib/booking/db";
import { resortLogoOnLight } from "@/config/branding";
export type AdminTab =
  | "overview"
  | "reservations"
  | "pending"
  | "add reservation"
  | "calendar"
  | "accommodations"
  | "swimming"
  | "adventures"
  | "dining"
  | "availability"
  | "inventory"
  | "guests"
  | "reports"
  | "export"
  | "accounts"
  | "booking settings"
  | "settings"
  | "activity";
export const tabMeta: Record<AdminTab, { title: string; description: string }> =
  {
    overview: {
      title: "Dashboard",
      description:
        "Reservation requests, schedules and daily resort operations.",
    },
    reservations: {
      title: "All reservations",
      description: "Review requests and manage confirmed visits.",
    },
    pending: {
      title: "Pending requests",
      description: "Requests awaiting an authorized staff decision.",
    },
    "add reservation": {
      title: "New reservation",
      description: "Record a telephone or walk-in request.",
    },
    calendar: {
      title: "Booking calendar",
      description: "Visits, sessions and maintenance blocks.",
    },
    accommodations: {
      title: "Accommodations",
      description: "Rooms, units and guest capacities.",
    },
    swimming: {
      title: "Swimming & cottages",
      description: "Pool sessions and cottage availability.",
    },
    adventures: {
      title: "Adventures",
      description: "Activity schedules, equipment and participant limits.",
    },
    dining: {
      title: "Dining",
      description: "Dining services, seating and schedules.",
    },
    availability: {
      title: "Availability management",
      description: "Physical units, maintenance blocks and closed dates.",
    },
    inventory: {
      title: "Service catalog",
      description: "Verified resort services and informational rates.",
    },
    guests: {
      title: "Guest records",
      description: "Private guest contact details and reservation history.",
    },
    reports: {
      title: "Reservation reports",
      description: "Filter reservation records and download Excel.",
    },
    export: {
      title: "Excel export",
      description:
        "Reservation records only. No external spreadsheet account required.",
    },
    accounts: {
      title: "Staff accounts",
      description: "Manage authorized resort staff.",
    },
    "booking settings": {
      title: "Reservation policies",
      description: "Owner-approved reservation and privacy policies.",
    },
    settings: {
      title: "Resort settings",
      description:
        "Resort information, schedules and notification configuration.",
    },
    activity: {
      title: "Activity logs",
      description: "Reservation and administrative history.",
    },
  };
const groups = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Reservations",
    items: [
      { id: "reservations", label: "All reservations", icon: ClipboardList },
      { id: "pending", label: "Pending requests", icon: Bell },
      { id: "calendar", label: "Booking calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Resort services",
    admin: true,
    items: [
      { id: "accommodations", label: "Accommodations", icon: House },
      { id: "swimming", label: "Swimming & cottages", icon: Waves },
      { id: "adventures", label: "Adventures", icon: Mountain },
      { id: "dining", label: "Dining", icon: UtensilsCrossed },
      {
        id: "availability",
        label: "Availability management",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "guests", label: "Guest records", icon: Users },
      {
        id: "reports",
        label: "Reservation reports",
        icon: ChartNoAxesCombined,
      },
      { id: "export", label: "Excel export", icon: ClipboardList },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "accounts", label: "Staff accounts", icon: Users, admin: true },
      {
        id: "settings",
        label: "Resort settings",
        icon: Settings2,
        admin: true,
      },
      {
        id: "booking settings",
        label: "Reservation policies",
        icon: ShieldCheck,
      },
      { id: "activity", label: "Activity logs", icon: Activity },
    ],
  },
];
function visibleItem(item: { id: string; admin?: boolean }, user: Staff) {
  return (
    (!item.admin || user.role === "ADMIN") &&
    (!["reports", "export"].includes(item.id) ||
      user.role === "ADMIN" ||
      user.can_export)
  );
}
export function allowedTab(tab: string, user: Staff): AdminTab {
  const allowed = groups
    .filter((g) => !g.admin || user.role === "ADMIN")
    .flatMap((g) => g.items)
    .filter((i) => visibleItem(i, user))
    .map((i) => i.id);
  return (
    allowed.includes(tab) ||
    tab === "add reservation" ||
    (tab === "inventory" && user.role === "ADMIN")
      ? tab
      : "overview"
  ) as AdminTab;
}
export function AdminShell({
  user,
  tab,
  onNavigate,
  onSearch,
  onLogout,
  unread = 0,
  pendingCount = 0,
  children,
}: {
  user: Staff;
  tab: AdminTab;
  onNavigate: (tab: AdminTab) => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  unread?: number;
  pendingCount?: number;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [search, setSearch] = useState("");
  const mobile = useRef<HTMLDialogElement>(null),
    mobileTrigger = useRef<HTMLButtonElement>(null);
  const admin = user.role === "ADMIN";
  const navigate = (id: string) => {
    onNavigate(id as AdminTab);
    mobile.current?.close();
  };
  const nav = (
    <>
      {groups
        .filter((g) => !g.admin || admin)
        .map((group) => (
          <section className="sidebar-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.items
              .filter((item) => visibleItem(item, user))
              .map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    {item.id === "pending" && pendingCount > 0 && (
                      <small>{pendingCount > 99 ? "99+" : pendingCount}</small>
                    )}
                  </button>
                );
              })}
          </section>
        ))}
    </>
  );
  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="admin-sidebar">
        <Link
          href="/admin/dashboard/"
          className="admin-brand"
          aria-label="Paraiso resort management"
        >
          <Image
            src={resortLogoOnLight.src}
            alt=""
            width={37}
            height={37}
            style={{ width: 37, height: "auto" }}
            unoptimized
          />
          <span>
            <strong>paraiso</strong>
            <small>RESORT MANAGEMENT</small>
          </span>
        </Link>
        <nav aria-label="Resort management">{nav}</nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            <ArrowUpRight size={17} />
            <span>View resort website</span>
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <dialog
        ref={mobile}
        className="admin-nav-drawer"
        aria-label="Mobile resort navigation"
        onClose={() => mobileTrigger.current?.focus()}
      >
        <header>
          <span>Paraiso · Management</span>
          <button
            onClick={() => mobile.current?.close()}
            aria-label="Close navigation"
          >
            <X size={21} />
          </button>
        </header>
        <nav aria-label="Mobile resort management">{nav}</nav>
        <button className="admin-action" onClick={onLogout}>
          <LogOut size={17} />
          Sign out
        </button>
      </dialog>
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-location">
            <button
              ref={mobileTrigger}
              className="mobile-nav-trigger"
              onClick={() => mobile.current?.showModal()}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="admin-breadcrumb">
              Workspace <span>/</span> <strong>{tabMeta[tab].title}</strong>
            </span>
          </div>
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) onSearch(search.trim());
            }}
          >
            <Search size={17} />
            <input
              type="search"
              aria-label="Search reservations"
              placeholder="Search guest or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={120}
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-controls">
            <button
              className="notification-trigger"
              onClick={() => navigate("pending")}
              aria-label={`Reservation notifications${unread ? `, ${unread} unread updates` : ""}`}
            >
              <Bell size={20} />
              {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
            </button>
            <details className="staff-menu">
              <summary>
                <span className="staff-avatar">
                  {user.full_name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <span className="staff-identity">
                  <strong>{user.full_name}</strong>
                  <small>{admin ? "Administrator" : "Resort staff"}</small>
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="staff-menu-content">
                <strong>{user.full_name}</strong>
                <small>{user.email}</small>
                <span>{admin ? "Administrator" : "Staff"} access</span>
                <button onClick={onLogout}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        <div className="admin-content">{children}</div>
        <footer className="admin-footer">
          <span>Paraiso de June Quixote</span>
          <span>Resort management · Asia/Manila</span>
        </footer>
      </div>
    </div>
  );
}
