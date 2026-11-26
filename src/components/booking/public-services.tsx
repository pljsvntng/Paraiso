"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/booking/db";
import { api } from "@/lib/api/reservations";
type Catalog = { products: Product[]; configured: boolean; demoMode?: boolean };
let current: { at: number; request: Promise<Catalog> } | undefined;
export function loadPublicCatalog() {
  if (!current || Date.now() - current.at > 10000)
    current = { at: Date.now(), request: api<Catalog>("commerce/catalog") };
  return current.request;
}
export function PublicServices({
  category,
  slug,
}: {
  category: string;
  slug?: string;
}) {
  const [data, setData] = useState<Catalog | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      loadPublicCatalog()
        .then((r) => {
          if (active) setData(r);
        })
        .catch(() => {
          if (active) setError(true);
        });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const products =
    data?.products.filter(
      (p) => p.category === category && (!slug || p.slug === slug),
    ) || [];
  if (!data || !data.configured || !products.length)
    return (
      <p className="small-copy" role="status">
        {error
          ? "Online availability could not be loaded."
          : !data
            ? "Loading current booking details…"
            : "Rates, capacity and online reservations await resort configuration."}{" "}
        <Link href="/contact/">Contact the resort.</Link>
      </p>
    );
  return (
    <div className="public-booking-services">
      {products.map((p) => (
        <section className="public-booking-service" key={p.id}>
          {data.demoMode && (
            <span className="demo-data-label">
              DEMO DATA — Illustrative rate, capacity & schedule
            </span>
          )}
          {!slug && (
            <>
              <h3>{p.name}</h3>
              {p.image && (
                <Image
                  src={p.image}
                  alt={p.name}
                  width={480}
                  height={300}
                  style={{ width: "100%", height: "auto", borderRadius: 12 }}
                />
              )}
              <p>{p.description}</p>
            </>
          )}
          <p className="small-copy">
            <strong>
              {p.active
                ? "Check your dates for live availability"
                : "Online reservations not enabled"}
            </strong>
            <br />
            {p.price === null
              ? "Rate awaiting confirmation"
              : new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(p.price) +
                ` per ${p.price_basis === "PERSON" ? "guest" : "unit / group"}${p.overnight ? " per night" : ""}`}
            {p.price !== null
              ? " · Date-specific estimates are shown in your reservation summary."
              : ""}
            <br />
            {p.max_guests
              ? `Up to ${p.max_guests} guests${p.overnight ? " per room" : ""}`
              : "Guest capacity awaiting confirmation"}
          </p>
          {!!p.amenities.length && (
            <p className="small-copy">{p.amenities.join(" · ")}</p>
          )}
          {!!p.slots.length && (
            <p className="small-copy">
              Sessions: {p.slots.join(" · ")}
              {p.duration_minutes ? ` · ${p.duration_minutes} minutes` : ""}
            </p>
          )}
          {!!p.restrictions && <p className="small-copy">{p.restrictions}</p>}
          <Link
            className="text-link"
            href={`/booking/?subject=${encodeURIComponent(p.name)}`}
          >
            {p.active ? "Book now · choose dates" : "View booking details"}
          </Link>
        </section>
      ))}
    </div>
  );
}
