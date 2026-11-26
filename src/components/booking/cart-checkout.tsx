"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/booking/db";
import type { CartItem } from "@/lib/booking/cart";
import { peso } from "@/lib/booking/money";
import { manilaDate } from "@/lib/dates";
import { api } from "@/lib/api/reservations";
import { AvailabilityCalendar } from "./availability-calendar";
type Quote = {
  total: number | null;
  items: {
    name: string;
    total: number | null;
    remaining: number;
    rates: { date: string; rate: number | null; childRate: number | null }[];
  }[];
};
export const serviceCategories = [
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "SWIMMING", label: "Swimming pool" },
  { value: "ACTIVITY", label: "Adventures" },
  { value: "DINING", label: "Dining" },
  { value: "DAY_TOUR", label: "Day tours" },
  { value: "PACKAGE", label: "Resort packages" },
];
export function CartCheckout({
  manual = false,
  onCreated,
  initialCheckIn = "",
}: {
  manual?: boolean;
  onCreated?: (reference: string) => void;
  initialCheckIn?: string;
}) {
  const router = useRouter(),
    key = useRef("");
  const [products, setProducts] = useState<Product[]>([]),
    [category, setCategory] = useState("ACCOMMODATION"),
    [selected, setSelected] = useState("");
  const [addons, setAddons] = useState<
      { id: string; name: string; price: number | null }[]
    >([]),
    [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [items, setItems] = useState<CartItem[]>([]),
    [quote, setQuote] = useState<Quote | null>(null),
    [settings, setSettings] = useState({
      terms: "",
      cancellation_policy: "",
      privacy_policy: "",
      rescheduling_policy: "",
      policy_version: 0,
    });
  const [checkIn, setCheckIn] = useState(initialCheckIn),
    [checkOut, setCheckOut] = useState(""),
    [slot, setSlot] = useState(""),
    [adults, setAdults] = useState(2),
    [children, setChildren] = useState(0),
    [units, setUnits] = useState(1),
    [acknowledged, setAcknowledged] = useState(false);
  const [errorArea, setErrorArea] = useState("selection");
  const [staffUnits, setStaffUnits] = useState<
      { id: string; accommodation_type_id: string; unit_identifier: string }[]
    >([]),
    [preferredUnits, setPreferredUnits] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [catalogConfigured, setCatalogConfigured] = useState(false),
    [demoMode, setDemoMode] = useState(false),
    [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [step, setStep] = useState(1),
    [serviceNotes, setServiceNotes] = useState(""),
    [notice, setNotice] = useState("");
  const product = products.find((p) => p.id === selected),
    today = manilaDate();
  useEffect(() => {
    if (manual)
      void api<typeof staffUnits>("commerce/admin/units")
        .then(setStaffUnits)
        .catch(() => {});
  }, [manual]);
  useEffect(() => {
    api<{
      products: Product[];
      settings: typeof settings;
      configured: boolean;
      demoMode?: boolean;
      addons: { id: string; name: string; price: number | null }[];
    }>("commerce/catalog")
      .then((r) => {
        setCatalogConfigured(r.configured);
        setDemoMode(!!r.demoMode);
        setProducts(r.products);
        setAddons(r.addons || []);
        setSettings(r.settings);
        const q = new URLSearchParams(window.location.search),
          p = r.products.find(
            (p) => p.name.toLowerCase() === q.get("subject")?.toLowerCase(),
          );
        if (p) {
          setSelected(p.id);
          setCategory(p.category);
        } else {
          const mapped: Record<string, string> = {
            adventure: "ACTIVITY",
            dining: "DINING",
            cottage: "SWIMMING",
            group: "PACKAGE",
          };
          setCategory(mapped[q.get("interest") || ""] || "ACCOMMODATION");
        }
      })
      .catch((e) => setCatalogError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const addDisabledReason = loading
    ? "Loading resort services. Please wait."
    : catalogError
      ? "Service availability could not be loaded. Refresh the page or contact the resort."
      : !catalogConfigured
        ? "Online reservations are not open yet. Please contact the resort for availability."
        : !product
          ? "Select a resort service above before checking availability."
          : !product.active
            ? `${product.name} is not open for online reservations yet. Please choose another service or contact the resort.`
            : !checkIn
              ? "Choose a visit or check-in date before checking availability."
              : checkIn < today
                ? "Choose today or a future date."
                : product.overnight && (!checkOut || checkOut <= checkIn)
                  ? "Choose a check-out date after check-in."
                  : product.slots.length > 0 && !slot
                    ? "Choose a configured session or time."
                    : !Number.isInteger(adults) ||
                        adults < 1 ||
                        !Number.isInteger(children) ||
                        children < 0 ||
                        !Number.isInteger(units) ||
                        units < 1
                      ? "Enter valid guest and unit quantities."
                      : !!product.max_guests &&
                          adults + children >
                            product.max_guests *
                              (product.overnight || product.unit_inventory
                                ? units
                                : 1)
                        ? "The guest count exceeds this service’s configured capacity."
                        : !acknowledged
                          ? "Acknowledge the selected service’s restrictions and participant requirements."
                          : items.length >= 12 && editingIndex === null
                            ? "Your reservation has the maximum of 12 services. Remove a service to add another."
                            : "";
  async function priceCart(next: CartItem[]) {
    if (!next.length) {
      setQuote(null);
      return;
    }
    const q = await api<Quote>("commerce/quote", { items: next });
    setQuote(q);
  }
  async function add() {
    setErrorArea("selection");
    if (!product) {
      setError("Choose a resort service first.");
      return;
    }
    if (!acknowledged) {
      setError(
        "Please acknowledge the service restrictions and participant requirements.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const item: CartItem = {
        productId: product.id,
        checkIn,
        ...(product.overnight ? { checkOut } : {}),
        slot,
        adults,
        children,
        units: product.overnight || product.unit_inventory ? units : 1,
        restrictionsAccepted: true,
        participantsMeetAge: true,
        addons: selectedAddons,
        notes: serviceNotes,
        ...(manual && preferredUnits.length ? { unitIds: preferredUnits } : {}),
      };
      const next =
        editingIndex === null
          ? [...items, item]
          : items.map((old, index) => (index === editingIndex ? item : old));
      await priceCart(next);
      setItems(next);
      setEditingIndex(null);
      setSelectedAddons([]);
      setServiceNotes("");
      setPreferredUnits([]);
      setStep(3);
      setNotice(
        `${product.name} added. You can add another service or enter your guest details.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add this service.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(index: number) {
    setErrorArea("checkout");
    setBusy(true);
    setError("");
    const next = items.filter((_, i) => i !== index);
    try {
      await priceCart(next);
      setItems(next);
      setEditingIndex(null);
      setPreferredUnits([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update the cart.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    setErrorArea("checkout");
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (!key.current) key.current = crypto.randomUUID();
      const r = await api<{ reference: string; trackingReference: string }>(
        "commerce/checkout",
        {
          items,
          guestName: f.get("guestName"),
          guestEmail: f.get("guestEmail"),
          guestPhone: f.get("guestPhone"),
          guestAddress: f.get("guestAddress"),
          additionalPhone: f.get("additionalPhone"),
          channel: manual ? f.get("channel") : "WEBSITE",
          notes: f.get("notes"),
          consent: f.get("consent") === "on",
          termsAccepted: f.get("terms") === "on",
          cancellationAccepted: f.get("cancellation") === "on",
          website: f.get("website"),
          requestKey: key.current,
          acceptedTotal: quote?.total,
          policyVersion: settings.policy_version,
        },
      );
      if (manual && onCreated) {
        onCreated(r.trackingReference);
        key.current = "";
        setItems([]);
        setQuote(null);
      } else
        router.push(
          `/booking/confirmation/${encodeURIComponent(r.trackingReference)}/`,
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save this reservation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ol className="booking-progress" aria-label="Reservation progress">
        {[
          "Select services",
          "Select dates",
          "Guest details",
          "Review and submit",
        ].map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="reservation-layout">
        <div className="reservation-fields">
          <section
            className="reservation-panel"
            onFocusCapture={() => setStep(1)}
          >
            <p className="eyebrow">01 / BUILD YOUR PARAISO VISIT</p>
            <h2>One escape. All your favourites.</h2>
            <p className="small-copy">
              Add a stay, swimming, adventures or dining to one reservation.
              Only services configured by the resort can be requested.
            </p>
            <label className="field">
              Reservation category
              <select
                value={category}
                disabled={loading}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelected("");
                  setPreferredUnits([]);
                  setSlot("");
                  setAcknowledged(false);
                }}
              >
                {serviceCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {!loading && (!catalogConfigured || catalogError) && (
              <p className="reservation-notice" role="status">
                {catalogError
                  ? "Service availability could not be loaded. Refresh the page or contact the resort."
                  : "Online reservations are not open yet. Please contact the resort for availability."}{" "}
                <Link href="/contact/">Contact the resort team.</Link>
                {manual && !catalogError && (
                  <>
                    {" "}
                    Connect the booking database, run migrations, then configure
                    and activate verified inventory in the dashboard.
                  </>
                )}
              </p>
            )}
            {loading ? (
              <p role="status">Loading resort services…</p>
            ) : (
              <div
                className="reservation-options"
                role="group"
                aria-label="Choose a resort service"
              >
                {products
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={`reservation-option ${selected === p.id ? "selected" : ""}`}
                      aria-pressed={selected === p.id}
                      onClick={() => {
                        setSelected(p.id);
                        if (["ACTIVITY", "DINING"].includes(p.category))
                          setChildren(0);
                        setPreferredUnits([]);
                        setSlot("");
                        setAcknowledged(false);
                      }}
                    >
                      {p.image && (
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={320}
                          height={200}
                        />
                      )}
                      <span>
                        <strong>{p.name}</strong>
                        {demoMode && (
                          <small className="demo-data-label">
                            DEMO DATA · Illustrative rate & capacity
                          </small>
                        )}
                        <small>
                          {p.max_guests
                            ? `Up to ${p.max_guests} guests${p.overnight ? " per unit" : " per group"}`
                            : "Capacity awaiting verification"}
                        </small>
                        <small>
                          {p.price === null
                            ? "Price to be confirmed"
                            : `PHP ${p.price.toLocaleString()} per ${p.price_basis === "PERSON" ? "guest" : "unit / group"}${p.overnight ? " per night" : " per visit"}`}
                        </small>
                        {!p.active && (
                          <small>Online requests not open yet</small>
                        )}
                      </span>
                    </button>
                  ))}
              </div>
            )}
            {!loading &&
              catalogConfigured &&
              !products.some((p) => p.category === category) && (
                <p className="reservation-notice">
                  No verified offerings are configured in this category yet.{" "}
                  <Link href="/contact/">Contact the resort team.</Link>
                </p>
              )}
            {product && (
              <>
                <p>{product.description}</p>
                {product.amenities.length > 0 && (
                  <p className="small-copy">
                    Amenities: {product.amenities.join(" · ")}
                  </p>
                )}
                {product.photos.length > 0 && (
                  <details>
                    <summary>View service photographs</summary>
                    <div className="reservation-options">
                      {product.photos.map((src) => (
                        <Image
                          key={src}
                          src={src}
                          alt={`${product.name} at Paraiso`}
                          width={400}
                          height={260}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </section>
          <section
            className="reservation-panel"
            onFocusCapture={() => setStep(2)}
          >
            <p className="eyebrow">02 / MAKE TIME FOR PARADISE</p>
            <h2>Your dates & your people.</h2>
            {editingIndex !== null && (
              <p role="status" className="reservation-notice">
                Editing service {editingIndex + 1}. Update dates or quantities,
                then check availability to save.
              </p>
            )}
            <div className="reservation-grid">
              <label className="field">
                {product?.overnight === false ? "Visit date" : "Check-in"}
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </label>
              {!!product?.overnight && (
                <label className="field">
                  Check-out
                  <input
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
              )}
              <label className="field">
                {product?.category === "ACTIVITY"
                  ? "Number of participants"
                  : product?.category === "DINING"
                    ? "Number of guests"
                    : "Adults"}
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                />
              </label>
              {!["ACTIVITY", "DINING"].includes(product?.category || "") && (
                <label className="field">
                  Children
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                  />
                </label>
              )}
              {(product?.overnight || product?.unit_inventory) && (
                <label className="field">
                  Rooms / cabins / cottages
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                  />
                </label>
              )}
              {!!product?.slots.length && (
                <label className="field">
                  Session / time
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    <option value="">Choose a configured time</option>
                    {product.slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <label className="field">
              Requests for this service (optional)
              <textarea
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Activity arrangements, dining requests, or cottage preferences"
              />
            </label>
            <AvailabilityCalendar
              product={product}
              adults={adults}
              childCount={children}
              units={units}
              slot={slot}
              onChoose={setCheckIn}
            />
            {manual && (product?.overnight || product?.unit_inventory) && (
              <label className="field">
                Optional exact physical units (leave empty for automatic
                allocation)
                <select
                  multiple
                  value={preferredUnits}
                  onChange={(e) =>
                    setPreferredUnits(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                >
                  {staffUnits
                    .filter((u) => u.accommodation_type_id === product.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_identifier}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {product && (
              <div className="reservation-notice">
                {product.duration_minutes
                  ? `${product.duration_minutes} minute session. `
                  : ""}
                {product.exclusive ? "Private exclusive reservation. " : ""}
                {product.min_age !== null
                  ? `Minimum participant age: ${product.min_age}. `
                  : ""}
                {product.restrictions ||
                  "Ask the resort about any participation requirements before your visit."}
              </div>
            )}
            {!!addons.length && (
              <fieldset className="service-config">
                <legend>
                  Optional configured meals / add-ons · once per selected item
                </legend>
                {addons.map((a) => (
                  <label className="checkbox-field" key={a.id}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes(a.id)}
                      onChange={(e) =>
                        setSelectedAddons(
                          e.target.checked
                            ? [...selectedAddons, a.id]
                            : selectedAddons.filter((id) => id !== a.id),
                        )
                      }
                    />
                    <span>
                      {a.name} ·{" "}
                      {a.price === null
                        ? "Price to be confirmed"
                        : `PHP ${a.price.toLocaleString()}`}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I have read the selected service’s restrictions and confirm all
                participants meet the configured age and safety requirements.
              </span>
            </label>
            <button
              type="button"
              className="reservation-button"
              disabled={busy || !!addDisabledReason}
              aria-describedby={
                addDisabledReason ? "cart-add-guidance" : undefined
              }
              onClick={() => void add()}
            >
              {busy
                ? "Checking availability…"
                : editingIndex !== null
                  ? "Check availability & save changes"
                  : "Check availability & add service"}
            </button>
            {addDisabledReason && (
              <p id="cart-add-guidance" className="small-copy" role="status">
                {addDisabledReason}
              </p>
            )}
            {error && errorArea === "selection" && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="small-copy">
                {notice}
              </p>
            )}
          </section>
          <form
            id="cart-guest-form"
            className="reservation-panel"
            onFocusCapture={() => setStep(3)}
            onSubmit={submit}
          >
            <p className="eyebrow">03 / A LITTLE ABOUT YOU</p>
            <h2>{manual ? "Guest information." : "Let’s make you welcome."}</h2>
            {demoMode && (
              <p className="reservation-notice">
                Use a name starting with DEMO and an @example.test email. These
                records are presentation samples; emails are disabled.
              </p>
            )}
            <div className="reservation-grid">
              <label className="field">
                Full name
                <input
                  name="guestName"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
              <label className="field">
                Email address
                <input
                  name="guestEmail"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <label className="field">
                Contact number
                <input
                  name="guestPhone"
                  type="tel"
                  required
                  minLength={10}
                  placeholder="0917 123 4567 or +63 917 123 4567"
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>
              <label className="field">
                Address (optional)
                <input
                  name="guestAddress"
                  maxLength={500}
                  autoComplete="street-address"
                />
              </label>
              <label className="field">
                Additional contact number (optional)
                <input name="additionalPhone" type="tel" maxLength={30} />
              </label>
              {manual && (
                <label className="field">
                  Reservation channel
                  <select name="channel">
                    <option value="STAFF">Staff entry</option>
                    <option value="WALK_IN">Walk-in</option>
                    <option value="TELEPHONE">Telephone</option>
                  </select>
                </label>
              )}
            </div>
            <label className="field">
              Additional requests or notes
              <textarea
                name="notes"
                maxLength={2000}
                rows={4}
                placeholder="Let us know if you have any special requests for your visit."
              />
            </label>
            <div className="booking-honeypot" aria-hidden="true">
              <input
                name="website"
                aria-label="Leave this empty"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <details>
              <summary>Booking terms</summary>
              <p className="policy-copy">
                {settings.terms ||
                  "The resort has not published its booking terms yet."}
              </p>
            </details>
            <label className="checkbox-field">
              <input name="terms" type="checkbox" required />
              <span>I accept the published booking terms.</span>
            </label>
            <details>
              <summary>Reservation cancellation policy</summary>
              <p className="policy-copy">
                {settings.cancellation_policy ||
                  "The resort has not published its cancellation policy yet."}
              </p>
            </details>
            <label className="checkbox-field">
              <input name="cancellation" type="checkbox" required />
              <span>I acknowledge the published cancellation policy.</span>
            </label>
            <label className="checkbox-field">
              <input name="consent" type="checkbox" required />
              <span>
                {manual ? (
                  "I have the guest’s permission to record these details and send booking messages."
                ) : (
                  <>
                    I agree to the{" "}
                    <Link href="/policies/privacy/">privacy policy</Link> and
                    understand my request requires approval from resort staff.
                  </>
                )}
              </span>
            </label>
            {!settings.terms ||
            !settings.cancellation_policy ||
            !settings.privacy_policy ||
            !settings.rescheduling_policy ? (
              <p className="reservation-notice">
                Reservation requests will open once the resort publishes its
                approved policies.
              </p>
            ) : null}
          </form>
        </div>
        <aside className="reservation-summary">
          <p className="eyebrow">YOUR PARAISO RESERVATION</p>
          <h2>A little of everything you love.</h2>
          {items.length === 0 ? (
            <p className="small-copy">
              Choose a service and check availability to start your reservation.
            </p>
          ) : (
            <ul className="cart-lines">
              {items.map((i, index) => (
                <li key={`${i.productId}-${index}`}>
                  <strong>
                    {products.find((p) => p.id === i.productId)?.name}
                  </strong>
                  <small>
                    {i.checkIn}
                    {i.checkOut ? ` → ${i.checkOut}` : ""}
                    {i.slot ? ` · ${i.slot}` : ""}
                    <br />
                    {i.adults + i.children} guests · {i.units} unit / group
                    {i.checkOut &&
                    products.find((p) => p.id === i.productId)?.overnight
                      ? ` · ${(Date.parse(i.checkOut) - Date.parse(i.checkIn)) / 86400000} nights`
                      : ""}
                  </small>
                  {!!i.addons?.length && (
                    <small>
                      Add-ons:{" "}
                      {i.addons
                        .map(
                          (id) =>
                            addons.find((a) => a.id === id)?.name ||
                            "Selected add-on",
                        )
                        .join(", ")}
                    </small>
                  )}
                  <span>{peso(quote?.items[index]?.total ?? null)}</span>
                  {quote?.items[index]?.rates?.map((r) => (
                    <small key={r.date}>
                      {r.date}: {peso(r.rate)} per{" "}
                      {products.find((p) => p.id === i.productId)
                        ?.price_basis === "PERSON"
                        ? "adult"
                        : "unit / group"}
                      {products.find((p) => p.id === i.productId)
                        ?.price_basis === "PERSON"
                        ? ` · ${peso(r.childRate)} per child`
                        : ""}
                    </small>
                  ))}

                  <button
                    type="button"
                    className="cart-remove"
                    disabled={busy}
                    onClick={() => {
                      const p = products.find((p) => p.id === i.productId);
                      if (!p) return;
                      setSelected(p.id);
                      setCategory(p.category);
                      setCheckIn(i.checkIn);
                      setCheckOut(i.checkOut || "");
                      setSlot(i.slot);
                      setAdults(i.adults);
                      setChildren(i.children);
                      setUnits(i.units);
                      setSelectedAddons(i.addons || []);
                      setServiceNotes(i.notes || "");
                      setAcknowledged(false);
                      setEditingIndex(index);
                      setStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit dates or quantities
                  </button>
                  <button
                    type="button"
                    className="cart-remove"
                    disabled={busy}
                    onClick={() => void remove(index)}
                    aria-label={`Remove ${products.find((p) => p.id === i.productId)?.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <dl>
            <dt>Estimated service total</dt>
            <dd className="reservation-total">{peso(quote?.total ?? null)}</dd>
            <dt>Request status</dt>
            <dd>Pending approval after submission</dd>
          </dl>
          <p className="small-copy">
            Prices are estimates for your selected services. No online payment
            is required. Pending requests do not reserve capacity; staff will
            recheck availability before approval.
          </p>
          {error && errorArea === "checkout" && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="reservation-button"
            type="submit"
            form="cart-guest-form"
            onFocus={() => setStep(4)}
            disabled={
              busy ||
              !items.length ||
              !settings.terms ||
              !settings.cancellation_policy ||
              !settings.privacy_policy ||
              !settings.rescheduling_policy ||
              editingIndex !== null
            }
          >
            {busy
              ? "Saving your reservation…"
              : manual
                ? "Add pending reservation"
                : "Submit Reservation Request"}
          </button>
          <Link href="/booking/track/">
            Already booked? Track your reservation
          </Link>
          <p className="small-copy">
            Need help? <Link href="/contact/">Talk to the resort team.</Link>
          </p>
        </aside>
      </div>
    </>
  );
}
