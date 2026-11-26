"use client";
import { useRef, useState } from "react";

export function CopyTrackingReference({ reference }: { reference: string }) {
  const field = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setMessage("Public tracking reference copied.");
    } catch {
      field.current?.focus();
      field.current?.select();
      setMessage(
        "Copy the selected reference to share it with the verified guest.",
      );
    }
  }
  return (
    <div className="staff-tracking-reference">
      <label className="field">
        Public tracking reference
        <input
          ref={field}
          readOnly
          value={reference}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <button
        type="button"
        className="admin-action"
        onClick={() => void copy()}
      >
        Copy public tracking reference
      </button>
      <p role="status" className="small-copy">
        {message ||
          "After confirming the guest’s booking details, share this reference for customer tracking."}
      </p>
    </div>
  );
}
