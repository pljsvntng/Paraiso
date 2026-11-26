"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/reservations";
import {
  trackingStatuses,
  type TrackingResult,
} from "@/lib/booking/tracking-status";

export function ReferenceConfirmation({ reference }: { reference: string }) {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const started = useRef(false);
  const referenceText = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void api<TrackingResult>("commerce/track", { reference })
      .then(setResult)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load your reservation.",
        ),
      );
  }, [reference]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopyMessage("Reference copied. Save it somewhere safe.");
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      if (referenceText.current) {
        range.selectNodeContents(referenceText.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopyMessage("Select and copy the reference above to save it.");
    }
  }
  return (
    <div className="reservation-page container">
      <section className="reservation-receipt reservation-panel">
        <p className="eyebrow">PARAISO DE JUNE QUIXOTE</p>
        <h1>
          {result?.status === "PENDING_APPROVAL"
            ? "Reservation Request Submitted!"
            : "Your reservation reference"}
        </h1>
        <p>
          Thank you for choosing Paraiso de June Quixote Ecofarm &amp; Resort.
        </p>
        <p className="eyebrow">RESERVATION REFERENCE NUMBER</p>
        <p ref={referenceText} className="reservation-reference">
          {reference}
        </p>
        {result && (
          <div role="status">
            <h2>{trackingStatuses[result.status].label}</h2>
            <p>{trackingStatuses[result.status].message}</p>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p>
          Save this reference somewhere safe. Enter it on Track Reservation to
          check your latest status from any device, even after closing your
          browser.
        </p>
        <div className="receipt-actions">
          <button
            type="button"
            className="reservation-button"
            onClick={() => void copy()}
          >
            Copy Reference
          </button>
          <Link
            className="reservation-button"
            prefetch={false}
            href={`/booking/track/#reference=${encodeURIComponent(reference)}`}
          >
            Track Reservation
          </Link>
          <Link href="/">Back to Home</Link>
        </div>
        <p role="status">{copyMessage}</p>
      </section>
    </div>
  );
}
