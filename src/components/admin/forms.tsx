"use client";
import { useState, type FormEvent } from "react";
import type { Product } from "@/lib/booking/db";
import { api } from "@/lib/api/reservations";
import { ServiceFields } from "./service-fields";
type Unit = {
  id: string;
  accommodation_type_id: string;
  unit_identifier: string;
  active: boolean;
};
type Block = {
  id: string;
  product_id: string;
  unit_id: string | null;
  start_date: string;
  end_date: string;
  slot: string;
  reason: string;
};
type Addon = {
  id: string;
  name: string;
  price: number | null;
  active: boolean;
};
export type Inventory = {
  products: Product[];
  units: Unit[];
  blocks: Block[];
  addons: Addon[];
};
export type Account = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  can_approve: boolean;
  can_export: boolean;
};
const values = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  return new FormData(e.currentTarget);
};
const string = (f: FormData, key: string) => String(f.get(key) || "").trim();
const numberOrNull = (f: FormData, key: string) =>
  string(f, key) === "" ? null : Number(f.get(key));
export function InventoryForms({
  data,
  execute,
  initialProductId = "",
  initialCategory = "ACCOMMODATION",
  view = "all",
}: {
  data: Inventory;
  execute: (fn: () => Promise<unknown>, message?: string) => Promise<void>;
  initialProductId?: string;
  initialCategory?: string;
  view?: "all" | "editor" | "operations";
}) {
  const [selected, setSelected] = useState(initialProductId),
    [blockProduct, setBlockProduct] = useState("");
  const p = data.products.find((p) => p.id === selected);
  return (
    <div className={`inventory-forms inventory-${view}`}>
      <p className="admin-notice">
        Enter only verified resort facts. An option accepts requests when it is
        enabled, has a verified maximum guest capacity, and has active room
        units or a day capacity. A blank rate means “Price to be confirmed by
        resort staff”. Existing active reservations protect capacity settings
        from changes.
      </p>
      <div className="admin-two-column">
        <section className="reservation-panel">
          <h2>{p ? `Edit ${p.name}` : "Create a resort service"}</h2>
          <label className="field">
            Edit an option
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Create a new option</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <form
            key={selected || "new"}
            onSubmit={(e) => {
              const f = values(e);
              void execute(
                () =>
                  api("products", {
                    ...(p ? { id: p.id } : {}),
                    name: string(f, "name"),
                    slug: string(f, "slug"),
                    description: string(f, "description"),
                    category: string(f, "category"),
                    overnight: f.has("overnight"),
                    unitInventory: f.has("unitInventory"),
                    active: f.has("active"),
                    minGuests: Number(f.get("minGuests")),
                    maxGuests: numberOrNull(f, "maxGuests"),
                    dayCapacity: numberOrNull(f, "dayCapacity"),
                    price: numberOrNull(f, "price"),
                    priceBasis: string(f, "priceBasis"),
                    slots: string(f, "slots")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    image: string(f, "image") || null,
                    childPrice: numberOrNull(f, "childPrice"),
                    amenities: string(f, "amenities")
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean),
                    restrictions: string(f, "restrictions"),
                    durationMinutes: numberOrNull(f, "durationMinutes"),
                    equipmentCount: numberOrNull(f, "equipmentCount"),
                    minAge: numberOrNull(f, "minAge"),
                    resourceGroup: string(f, "resourceGroup"),
                    exclusive: f.has("exclusive"),
                    photos: string(f, "photos")
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  }),
                "Resort option saved.",
              );
            }}
          >
            <section className="editor-section">
              <h3>01 · Basic information</h3>
              <label className="field">
                Verified name
                <input
                  name="name"
                  defaultValue={p?.name}
                  required
                  maxLength={120}
                />
              </label>
              <label className="field">
                Unique slug
                <input
                  name="slug"
                  defaultValue={p?.slug}
                  required
                  pattern="[a-z0-9-]+"
                />
              </label>
              <label className="field">
                Description
                <textarea
                  name="description"
                  aria-label="Description"
                  defaultValue={p?.description}
                  rows={3}
                  maxLength={2000}
                />
              </label>
              <label className="field">
                Category
                <select
                  name="category"
                  defaultValue={p?.category || initialCategory}
                >
                  {[
                    "ACCOMMODATION",
                    "SWIMMING",
                    "ACTIVITY",
                    "DINING",
                    "DAY_TOUR",
                    "PACKAGE",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </section>
            <section className="editor-section">
              <h3>02 · Inventory & capacity</h3>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="overnight"
                  defaultChecked={
                    p?.overnight ?? initialCategory === "ACCOMMODATION"
                  }
                />
                Overnight stay (uses room units and nightly rates)
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="unitInventory"
                  defaultChecked={p?.unit_inventory ?? false}
                />
                Physical day-use units (owner-approved cottages; configure
                actual unit identifiers below)
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={p?.active ?? false}
                />
                Enable online requests
              </label>
              <div className="reservation-grid">
                <label className="field">
                  Minimum guests per unit / group
                  <input
                    name="minGuests"
                    type="number"
                    min="1"
                    max="500"
                    defaultValue={p?.min_guests || 1}
                    required
                  />
                </label>
                <label className="field">
                  Verified maximum guests per unit / group
                  <input
                    name="maxGuests"
                    type="number"
                    min="1"
                    max="500"
                    defaultValue={p?.max_guests ?? ""}
                  />
                </label>
                <label className="field">
                  Day capacity per date / time slot
                  <input
                    name="dayCapacity"
                    type="number"
                    min="1"
                    max="10000"
                    defaultValue={p?.day_capacity ?? ""}
                  />
                </label>
                <label className="field">
                  Verified price (PHP, blank if unknown)
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={p?.price ?? ""}
                  />
                </label>
              </div>
            </section>
            <section className="editor-section">
              <h3>03 · Pricing, sessions & cover photo</h3>
              <label className="field">
                Price basis
                <select
                  name="priceBasis"
                  defaultValue={p?.price_basis || "UNIT"}
                >
                  <option value="UNIT">
                    Per unit per night / group per visit
                  </option>
                  <option value="PERSON">Per guest per night / visit</option>
                </select>
              </label>
              <label className="field">
                Time slots (comma separated; leave blank for no time slots)
                <input name="slots" defaultValue={p?.slots.join(", ")} />
              </label>
              <label className="field">
                Existing resort photo path (optional)
                <input
                  name="image"
                  defaultValue={p?.image || ""}
                  placeholder="/images/accommodations/..."
                />
              </label>
            </section>
            <ServiceFields product={p} />
            <button className="reservation-button">Save option</button>
          </form>
        </section>
        <div>
          <section className="reservation-panel">
            <h2>Room inventory</h2>
            <form
              onSubmit={(e) => {
                const f = values(e);
                void execute(
                  () =>
                    api("units", {
                      productId: string(f, "productId"),
                      identifier: string(f, "identifier"),
                      active: true,
                    }),
                  "Unit added or enabled.",
                );
              }}
            >
              <label className="field">
                Accommodation or physical day-use service
                <select name="productId" required>
                  <option value="">Choose an option</option>
                  {data.products
                    .filter((p) => p.overnight || p.unit_inventory)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Actual unit identifier
                <input
                  name="identifier"
                  required
                  maxLength={80}
                  placeholder="Use the resort’s existing room identifier"
                />
              </label>
              <button className="reservation-button">Add / enable unit</button>
            </form>
            <ul>
              {data.units.map((u) => (
                <li key={u.id}>
                  <span className="small-copy">
                    {
                      data.products.find(
                        (p) => p.id === u.accommodation_type_id,
                      )?.name
                    }{" "}
                    · {u.unit_identifier} ·{" "}
                    {u.active ? "Active" : "Disabled"}{" "}
                  </span>
                  <button
                    type="button"
                    className="admin-action"
                    onClick={() => {
                      if (
                        window.confirm(
                          `${u.active ? "Disable" : "Enable"} ${u.unit_identifier}?`,
                        )
                      )
                        void execute(() =>
                          api("units", {
                            productId: u.accommodation_type_id,
                            identifier: u.unit_identifier,
                            active: !u.active,
                          }),
                        );
                    }}
                  >
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="reservation-panel admin-section">
            <h2>Block dates</h2>
            <form
              onSubmit={(e) => {
                const f = values(e);
                if (window.confirm("Block these dates for new confirmations?"))
                  void execute(
                    () =>
                      api("blocks", {
                        productId: blockProduct,
                        unitId: string(f, "unitId") || null,
                        start: string(f, "start"),
                        end: string(f, "end"),
                        slot: string(f, "slot"),
                        reason: string(f, "reason"),
                      }),
                    "Dates blocked.",
                  );
              }}
            >
              <label className="field">
                Accommodation or package
                <select
                  required
                  value={blockProduct}
                  onChange={(e) => setBlockProduct(e.target.value)}
                >
                  <option value="">Choose an option</option>
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Room unit
                <select name="unitId" key={blockProduct}>
                  <option value="">All units / full package capacity</option>
                  {data.units
                    .filter((u) => u.accommodation_type_id === blockProduct)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_identifier}
                      </option>
                    ))}
                </select>
              </label>
              <div className="reservation-grid">
                <label className="field">
                  Start (included)
                  <input name="start" type="date" required />
                </label>
                <label className="field">
                  End (excluded)
                  <input name="end" type="date" required />
                </label>
              </div>
              <label className="field">
                Time slot
                <select name="slot" key={`slot-${blockProduct}`}>
                  <option value="">All time slots</option>
                  {data.products
                    .find((p) => p.id === blockProduct)
                    ?.slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </label>
              <label className="field">
                Reason
                <input name="reason" maxLength={200} />
              </label>
              <button className="reservation-button">Block dates</button>
            </form>
            <ul>
              {data.blocks.map((b) => (
                <li key={b.id}>
                  <span className="small-copy">
                    {data.products.find((p) => p.id === b.product_id)?.name} ·{" "}
                    {b.start_date} → {b.end_date} · {b.slot || "All slots"} ·{" "}
                    {b.reason}{" "}
                  </span>
                  <button
                    className="admin-action"
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove this date block?"))
                        void execute(() => api(`blocks/${b.id}`, {}, "DELETE"));
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="reservation-panel admin-section">
            <h2>Optional add-ons</h2>
            <form
              onSubmit={(e) => {
                const f = values(e);
                void execute(
                  () =>
                    api("addons", {
                      name: string(f, "name"),
                      price: numberOrNull(f, "price"),
                      active: true,
                    }),
                  "Add-on saved.",
                );
              }}
            >
              <label className="field">
                Verified add-on name
                <input name="name" required maxLength={120} />
              </label>
              <label className="field">
                Price per reservation (PHP, blank if unknown)
                <input name="price" type="number" step="0.01" min="0" />
              </label>
              <button className="reservation-button">Add option</button>
            </form>
            <ul>
              {data.addons.map((a) => (
                <li key={a.id}>
                  <span className="small-copy">
                    {a.name} ·{" "}
                    {a.price === null
                      ? "Price to be confirmed"
                      : `PHP ${a.price}`}{" "}
                  </span>
                  <button
                    className="admin-action"
                    type="button"
                    onClick={() =>
                      void execute(() =>
                        api("addons", { ...a, active: !a.active }),
                      )
                    }
                  >
                    {a.active ? "Disable" : "Enable"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
export function AccountsForm({
  data,
  execute,
  initialAccountId = "",
}: {
  data: Account[];
  initialAccountId?: string;
  execute: (fn: () => Promise<unknown>, message?: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(initialAccountId);
  const a = data.find((a) => a.id === selected);
  return (
    <section className="reservation-panel staff-login">
      <h2>Resort team accounts</h2>
      <p className="small-copy">
        Account changes end that user’s existing sessions. Administrators always
        have full permissions.
      </p>
      <label className="field">
        Account
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Create account</option>
          {data.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name} · {a.role}
            </option>
          ))}
        </select>
      </label>
      <form
        key={selected}
        onSubmit={(e) => {
          const f = values(e);
          if (window.confirm("Save these account permissions?"))
            void execute(
              () =>
                api("accounts", {
                  ...(a ? { id: a.id } : {}),
                  fullName: string(f, "fullName"),
                  email: string(f, "email"),
                  role: string(f, "role"),
                  active: f.has("active"),
                  canApprove: f.has("canApprove"),
                  canExport: f.has("canExport"),
                  ...(string(f, "password")
                    ? { password: string(f, "password") }
                    : {}),
                }),
              "Account saved. If you edited yourself, sign in again.",
            );
        }}
      >
        <label className="field">
          Full name
          <input
            name="fullName"
            defaultValue={a?.full_name}
            required
            maxLength={120}
          />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" defaultValue={a?.email} required />
        </label>
        <label className="field">
          Role
          <select name="role" defaultValue={a?.role || "STAFF"}>
            <option>STAFF</option>
            <option>ADMIN</option>
          </select>
        </label>
        <label className="field">
          {a ? "New password (leave blank to keep)" : "Password"}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required={!a}
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="active"
            defaultChecked={a?.active ?? true}
          />
          Account active
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="canApprove"
            defaultChecked={a?.can_approve}
          />
          Staff may confirm, decline and cancel
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="canExport"
            defaultChecked={a?.can_export}
          />
          Staff may export booking reports
        </label>
        <button className="reservation-button">Save account</button>
      </form>
    </section>
  );
}
