"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/reservations";
import {
  trackingStatuses,
  type TrackingResult,
} from "@/lib/booking/tracking-status";

export function BookingTracker() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function track(value: string) {
    setBusy(true);
    setError("");
    setInvalid(false);
    setResult(null);
    try {
      setResult(
        await api<TrackingResult>("commerce/track", {
          reference: value.trim(),
        }),
      );
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === "No matching reservation was found."
      )
        setInvalid(true);
      else
        setError(
          e instanceof Error
            ? e.message
            : "Unable to check your reservation. Please try again.",
        );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(location.hash.slice(1));
    const query = new URLSearchParams(location.search);
    const saved = fragment.get("reference") || query.get("reference") || "";
    const token = fragment.get("token");
    // Keep references out of subsequent referrers and browser URLs.
    history.replaceState(null, "", "/booking/track/");
    if (!saved) return;
    async function open() {
      await Promise.resolve();
      setReference(saved);
      if (saved.startsWith("PDJ-")) {
        // Compatibility requires an existing private guest session or signed link.
        const recovered = await api<{ trackingReference: string }>(
          token ? "commerce/access/consume" : "commerce/tracking-reference",
          token ? { reference: saved, token } : { reference: saved },
        );
        setReference(recovered.trackingReference);
        await track(recovered.trackingReference);
      } else await track(saved);
    }
    void open().catch(() => {
      setError(
        "For an older reservation, contact the resort to obtain your public tracking reference after confirming your booking details.",
      );
    });
  }, []);

  const status = result ? trackingStatuses[result.status] : null;
  return (
    <div className="reservation-page container reservation-tracking">
      <header className="reservation-intro">
        <p className="eyebrow">YOUR PARAISO RESERVATION</p>
        <h1>Your visit, a little closer.</h1>
        <p>
          Enter your reservation reference to see the latest status of your
          request.
        </p>
      </header>
      <section
        className="reservation-panel tracking-panel"
        aria-labelledby="tracking-heading"
      >
        <h2 id="tracking-heading">Track your reservation</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void track(reference);
          }}
        >
          <label className="field" htmlFor="tracking-reference">
            Reservation Reference Number
          </label>
          <input
            id="tracking-reference"
            name="reference"
            required
            maxLength={80}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="PDJT-…"
            value={reference}
            aria-describedby="tracking-help"
            onChange={(e) => {
              setReference(e.target.value);
              setResult(null);
              setInvalid(false);
              setError("");
            }}
            disabled={busy}
          />
          <p id="tracking-help" className="small-copy">
            Use the public reference shown after booking. Save it to check from
            any device.
          </p>
          <button className="reservation-button" disabled={busy}>
            {busy ? "Checking reservation…" : "Track Reservation"}
          </button>
        </form>
        <div aria-live="polite" aria-atomic="true" aria-busy={busy}>
          {invalid && (
            <div className="tracking-result">
              <h3>Invalid Reference</h3>
              <p>No matching reservation was found.</p>
            </div>
          )}
          {result && status && (
            <div className="tracking-result">
              <p className="eyebrow">RESERVATION REFERENCE</p>
              <p className="reservation-reference">{result.reference}</p>
              <h3
                className={
                  "commerce-status status-" + result.status.toLowerCase()
                }
              >
                {status.label}
              </h3>
              <p>{status.message}</p>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <p className="small-copy">
          Have an older reference such as PDJ-2026-000004?{" "}
          <Link href="/contact/">Contact the resort</Link> for a public tracking
          reference after confirming your booking details.
        </p>
      </section>
    </div>
  );
}
