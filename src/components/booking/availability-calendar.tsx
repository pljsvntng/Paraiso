"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/booking/db";
import { manilaDate } from "@/lib/dates";
import { api } from "@/lib/api/reservations";
type Day = { date: string; available: boolean; configured: boolean };
export function AvailabilityCalendar({
  product,
  adults,
  childCount,
  units,
  slot,
  onChoose,
}: {
  product: Product | undefined;
  adults: number;
  childCount: number;
  units: number;
  slot: string;
  onChoose: (date: string) => void;
}) {
  const [result, setResult] = useState<{ key: string; days: Day[] } | null>(
      null,
    ),
    [error, setError] = useState("");
  const query = new URLSearchParams({
    productId: product?.id || "",
    checkIn: manilaDate(),
    adults: String(adults),
    children: String(childCount),
    units: String(product?.overnight ? units : 1),
    slot,
  }).toString();
  useEffect(() => {
    if (!product || (product.slots.length && !slot)) return;
    let active = true;
    const timer = setTimeout(() => {
      api<{ days: Day[] }>(`calendar?${query}`)
        .then((r) => {
          if (active) {
            setResult({ key: query, days: r.days });
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, product, slot]);
  if (!product || (product.slots.length && !slot)) return null;
  return (
    <details className="reservation-calendar">
      <summary>Next 31 days · live availability</summary>
      <p className="small-copy">
        Crossed dates are unavailable for the selected guest count, room count
        and session. Each day checks one night or visit; your full stay and
        combined cart are rechecked before submission.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result?.key === query ? (
        <div className="calendar-grid">
          {result.days.map((d) => (
            <button
              key={d.date}
              type="button"
              disabled={!d.available}
              aria-label={`${d.date}: ${d.configured ? (d.available ? "available" : "unavailable") : "awaiting inventory configuration"}`}
              onClick={() => onChoose(d.date)}
            >
              <small>
                {new Date(d.date).toLocaleDateString("en-PH", {
                  timeZone: "UTC",
                  month: "short",
                })}
              </small>
              {Number(d.date.slice(-2))}
            </button>
          ))}
        </div>
      ) : (
        <p role="status">Checking calendar…</p>
      )}
    </details>
  );
}
