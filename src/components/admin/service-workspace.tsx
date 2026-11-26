"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  House,
  Users,
  Clock3,
  Settings2,
  X,
  ImageOff,
} from "lucide-react";
import {
  InventoryForms,
  type Inventory,
  AccountsForm,
  type Account,
} from "./forms";
import { RatesPanel } from "./operations-panels";
import { AdminEmpty, AdminStatus, AdminPanel, readable } from "./ui";
import { peso, centavos } from "@/lib/booking/money";
import type { AdminTab } from "./shell";
type Execute = (fn: () => Promise<unknown>, notice?: string) => Promise<void>;
const categoryMap: Record<string, string[]> = {
  accommodations: ["ACCOMMODATION"],
  swimming: ["SWIMMING", "DAY_TOUR"],
  adventures: ["ACTIVITY"],
  dining: ["DINING", "PACKAGE"],
  inventory: [],
};
export function ServiceWorkspace({
  data,
  tab,
  execute,
  error = "",
  busy = false,
}: {
  data: Inventory;
  tab: AdminTab;
  execute: Execute;
  error?: string;
  busy?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [editor, setEditor] = useState<string | null>(null),
    [section, setSection] = useState(
      tab === "availability" ? "operations" : "catalog",
    );
  const modal = useRef<HTMLDialogElement>(null);
  const categories = categoryMap[tab] || [],
    defaultCategory = categories[0] || "ACCOMMODATION";
  const matching = data.products.filter(
    (p) =>
      (!categories.length || categories.includes(p.category)) &&
      `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const needsSetup = (id: string) => {
    const p = data.products.find((p) => p.id === id)!;
    return (
      !p.active ||
      p.max_guests === null ||
      (p.overnight || p.unit_inventory
        ? !data.units.some((u) => u.accommodation_type_id === p.id && u.active)
        : p.day_capacity === null)
    );
  };
  const visible = matching.filter(
    (p) =>
      status === "all" ||
      (status === "active" && p.active) ||
      (status === "setup" && needsSetup(p.id)),
  );
  const editing = data.products.find((p) => p.id === editor);
  useEffect(() => {
    if (editor !== null) modal.current?.showModal();
  }, [editor]);
  const cards = (
    <>
      <div className="catalog-controls">
        <div className="segmented-control">
          {[
            { id: "all", label: "All services", count: matching.length },
            {
              id: "active",
              label: "Enabled",
              count: matching.filter((p) => p.active).length,
            },
            {
              id: "setup",
              label: "Needs setup",
              count: matching.filter((p) => needsSetup(p.id)).length,
            },
          ].map((s) => (
            <button
              key={s.id}
              aria-pressed={status === s.id}
              onClick={() => setStatus(s.id)}
            >
              {s.label}
              <span>{s.count}</span>
            </button>
          ))}
        </div>
        <label className="catalog-search-input">
          <Search size={17} />
          <input
            aria-label="Search services"
            placeholder="Find a resort service…"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {visible.length ? (
        <div className="service-card-grid">
          {visible.map((p) => {
            const units = data.units.filter(
              (u) => u.accommodation_type_id === p.id && u.active,
            ).length;
            return (
              <article className="service-admin-card" key={p.id}>
                <div className="service-card-image">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width:600px) 90vw,(max-width:1100px) 45vw,30vw"
                    />
                  ) : (
                    <div className="service-image-empty">
                      <ImageOff size={25} />
                      <span>Resort photo not configured</span>
                    </div>
                  )}
                  <AdminStatus value={p.active ? "ACTIVE" : "DISABLED"} />
                </div>
                <div className="service-card-copy">
                  <span className="service-category">
                    {readable(p.category)}
                  </span>
                  <h2>{p.name}</h2>
                  <p>
                    {p.description ||
                      "Add approved details to help your team and guests plan."}
                  </p>
                  <div className="service-facts">
                    <span>
                      <Users size={15} />
                      {p.max_guests
                        ? `Up to ${p.max_guests}${p.overnight || p.unit_inventory ? " per unit" : " per group"}`
                        : "Capacity not set"}
                    </span>
                    <span>
                      {p.overnight || p.unit_inventory ? (
                        <House size={15} />
                      ) : (
                        <Clock3 size={15} />
                      )}{" "}
                      {p.overnight || p.unit_inventory
                        ? `${units} active physical units`
                        : p.duration_minutes
                          ? `${p.duration_minutes} min · ${p.slots.length} sessions`
                          : "Schedule not set"}
                    </span>
                    {!p.overnight &&
                      !p.unit_inventory &&
                      p.day_capacity !== null && (
                        <span>
                          <Users size={15} />
                          {p.day_capacity} guests per date / session
                        </span>
                      )}
                    {p.category === "ACTIVITY" &&
                      p.equipment_count !== null && (
                        <span>
                          <Settings2 size={15} />
                          {p.equipment_count} equipment resources
                        </span>
                      )}
                  </div>
                  {!!p.slots.length && (
                    <small className="service-sessions">
                      {p.slots.join(" · ")}
                    </small>
                  )}
                  <div className="service-card-footer">
                    <div>
                      <strong>
                        {p.price === null
                          ? "Rate not set"
                          : peso(centavos(p.price))}
                      </strong>
                      <small>
                        {p.price_basis === "PERSON"
                          ? "per guest"
                          : "per unit / group"}
                        {p.overnight ? " / night" : ""}
                      </small>
                    </div>
                    <button
                      className="admin-action"
                      onClick={() => setEditor(p.id)}
                      aria-label={`Manage ${p.name}`}
                    >
                      <Settings2 size={15} />
                      Manage
                    </button>
                  </div>
                  {needsSetup(p.id) && (
                    <small className="setup-hint">
                      Configure verified capacity and schedules before accepting
                      reservations.
                    </small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmpty
          title="No services in this view"
          description="Add an owner-approved service, or clear the filters to see your existing catalog."
          action={
            <button
              className="reservation-button"
              onClick={() => setEditor("new")}
            >
              <Plus size={16} />
              Add service
            </button>
          }
        />
      )}
    </>
  );
  return (
    <>
      <div className="workspace-toolbar">
        <div className="segmented-control">
          {[
            { id: "catalog", label: "Service catalog" },
            { id: "operations", label: "Units & availability" },
            { id: "rates", label: "Rates & add-ons" },
          ].map((s) => (
            <button
              key={s.id}
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="reservation-button" onClick={() => setEditor("new")}>
          <Plus size={17} />
          Add service
        </button>
      </div>
      {section === "catalog" && cards}
      {section === "operations" && (
        <InventoryForms data={data} execute={execute} view="operations" />
      )}
      {section === "rates" && (
        <>
          <RatesPanel
            products={data.products.filter(
              (p) => !categories.length || categories.includes(p.category),
            )}
            execute={execute}
          />
          <div className="addons-only">
            <InventoryForms data={data} execute={execute} view="operations" />
          </div>
        </>
      )}
      {editor !== null && (
        <dialog
          ref={modal}
          className="service-editor-drawer"
          aria-labelledby="service-editor-title"
          onClose={() => setEditor(null)}
        >
          <header className="drawer-header">
            <div>
              <span className="workspace-eyebrow">
                RESORT SERVICE CONFIGURATION
              </span>
              <h2 id="service-editor-title">
                {editing ? "Edit service" : "Add a service"}
              </h2>
              <p>
                Use the resort’s approved information. Existing reservations
                keep their saved prices.
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => modal.current?.close()}
              aria-label="Close service editor"
            >
              <X size={21} />
            </button>
          </header>
          <div className="drawer-body">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {busy && (
              <p role="status" className="saving-inline">
                Saving service configuration…
              </p>
            )}
            <fieldset className="editor-form-fields" disabled={busy}>
              <InventoryForms
                key={editor}
                data={data}
                initialProductId={editing?.id || ""}
                initialCategory={editing?.category || defaultCategory}
                view="editor"
                execute={(fn, message) =>
                  execute(async () => {
                    await fn();
                    modal.current?.close();
                  }, message)
                }
              />
            </fieldset>
          </div>
        </dialog>
      )}
    </>
  );
}
export function StaffWorkspace({
  data,
  execute,
  error = "",
  busy = false,
}: {
  data: Account[];
  execute: Execute;
  error?: string;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected !== null) modal.current?.showModal();
  }, [selected]);
  return (
    <>
      <AdminPanel
        title="Your resort team"
        description="Roles and permissions are enforced on the server. Last-administrator protection stays in place."
        action={
          <button
            className="reservation-button"
            onClick={() => setSelected("new")}
          >
            <Plus size={16} />
            Add staff account
          </button>
        }
      >
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Team member</th>
                <th>Role</th>
                <th>Account status</th>
                <th>Permissions</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.full_name}</strong>
                    <small>{a.email}</small>
                  </td>
                  <td>{a.role === "ADMIN" ? "Administrator" : "Staff"}</td>
                  <td>
                    <AdminStatus value={a.active ? "ACTIVE" : "DISABLED"} />
                  </td>
                  <td>
                    {a.role === "ADMIN"
                      ? "Full administrator access"
                      : [
                          a.can_approve && "Approval",
                          a.can_export && "Report export",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Reservation operations"}
                  </td>
                  <td>
                    <button
                      className="admin-action"
                      onClick={() => setSelected(a.id)}
                    >
                      Manage access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
      {selected !== null && (
        <dialog
          ref={modal}
          className="service-editor-drawer account-editor"
          aria-label="Staff account editor"
          onClose={() => setSelected(null)}
        >
          <header className="drawer-header">
            <h2>
              {selected === "new" ? "Add team member" : "Manage staff access"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close account editor"
              onClick={() => modal.current?.close()}
            >
              <X size={21} />
            </button>
          </header>
          <div className="drawer-body">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {busy && (
              <p role="status" className="saving-inline">
                Saving staff access…
              </p>
            )}
            <fieldset className="editor-form-fields" disabled={busy}>
              <AccountsForm
                data={data}
                initialAccountId={selected === "new" ? "" : selected}
                execute={(fn, msg) =>
                  execute(async () => {
                    await fn();
                    modal.current?.close();
                  }, msg)
                }
              />
            </fieldset>
          </div>
        </dialog>
      )}
    </>
  );
}
