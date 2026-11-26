"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";
import { site } from "@/config/site";
import {
  inquiryMailto,
  inquiryText,
  inquiryTypes,
  manilaDate,
  validateInquiry,
  type InquiryDraft,
  type InquiryErrors,
} from "@/lib/inquiry";

export function InquiryForm() {
  const params = useSearchParams();
  const subject = params.get("subject")?.slice(0, 160) || "";
  const requested = params.get("interest") || "general";
  const interest = inquiryTypes.some((type) => type.value === requested)
    ? requested
    : "general";
  // Key the draft only by public inquiry context; no personal details go into the URL.
  return (
    <InquiryComposer
      key={`${interest}:${subject}`}
      initialInterest={interest}
      initialSubject={subject}
    />
  );
}
function InquiryComposer({
  initialInterest,
  initialSubject,
}: {
  initialInterest: string;
  initialSubject: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<InquiryDraft>({
    name: "",
    contact: "",
    interest: initialInterest,
    subject: initialSubject,
    date: "",
    guests: "",
    message: "",
  });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [prepared, setPrepared] = useState(false);
  const [copy, setCopy] = useState<"idle" | "pending" | "done" | "failed">(
    "idle",
  );
  function update(field: keyof InquiryDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setPrepared(false);
    setCopy("idle");
  }
  async function copyInquiry() {
    setCopy("pending");
    try {
      await navigator.clipboard.writeText(inquiryText(draft));
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  }
  const fields: {
    key: "name" | "contact" | "subject";
    label: string;
    autoComplete?: string;
    required?: boolean;
    max: number;
  }[] = [
    {
      key: "name",
      label: "Full name",
      autoComplete: "name",
      required: true,
      max: 120,
    },
    {
      key: "contact",
      label: "Email address or phone number",
      autoComplete: "email",
      required: true,
      max: 150,
    },
    { key: "subject", label: "Room, activity or topic (optional)", max: 160 },
  ];
  return (
    <>
      <form
        ref={form}
        className="inquiry-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const next = validateInquiry(draft);
          setErrors(next);
          if (Object.keys(next).length) {
            const first = Object.keys(next)[0];
            form.current
              ?.querySelector<HTMLElement>(`[name="${first}"]`)
              ?.focus();
            setPrepared(false);
            return;
          }
          setPrepared(true);
          setCopy("idle");
          requestAnimationFrame(() =>
            preview.current?.focus({ preventScroll: true }),
          );
        }}
      >
        {Object.values(errors).some(Boolean) && (
          <p className="inquiry-error-summary" role="alert">
            Please check the highlighted fields. Your inquiry has not been sent.
          </p>
        )}
        <div className="inquiry-fields">
          {fields.map((field) => (
            <label
              key={field.key}
              htmlFor={`inquiry-${field.key}`}
              className={field.key === "subject" ? "inquiry-wide" : ""}
            >
              {field.label}
              {field.required && <span aria-hidden="true"> *</span>}
              <input
                id={`inquiry-${field.key}`}
                name={field.key}
                autoComplete={field.autoComplete}
                required={field.required}
                maxLength={field.max}
                value={draft[field.key]}
                aria-invalid={!!errors[field.key]}
                aria-describedby={
                  errors[field.key] ? `inquiry-${field.key}-error` : undefined
                }
                onChange={(event) => update(field.key, event.target.value)}
              />
              {errors[field.key] && (
                <span className="field-error" id={`inquiry-${field.key}-error`}>
                  {errors[field.key]}
                </span>
              )}
            </label>
          ))}
          <label htmlFor="inquiry-interest">
            Inquiry type
            <select
              id="inquiry-interest"
              name="interest"
              value={draft.interest}
              onChange={(event) => update("interest", event.target.value)}
            >
              {inquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="inquiry-date">
            Preferred visit date (optional)
            <input
              id="inquiry-date"
              name="date"
              type="date"
              min={manilaDate()}
              value={draft.date}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? "inquiry-date-error" : undefined}
              onChange={(event) => update("date", event.target.value)}
            />
            {errors.date && (
              <span className="field-error" id="inquiry-date-error">
                {errors.date}
              </span>
            )}
          </label>
          <label htmlFor="inquiry-guests">
            Number of guests (optional)
            <input
              id="inquiry-guests"
              name="guests"
              type="number"
              min="1"
              max="9999"
              step="1"
              inputMode="numeric"
              value={draft.guests}
              aria-invalid={!!errors.guests}
              aria-describedby={
                errors.guests ? "inquiry-guests-error" : undefined
              }
              onChange={(event) => update("guests", event.target.value)}
            />
            {errors.guests && (
              <span className="field-error" id="inquiry-guests-error">
                {errors.guests}
              </span>
            )}
          </label>
          <label className="inquiry-wide" htmlFor="inquiry-message">
            Your message <span aria-hidden="true">*</span>
            <textarea
              id="inquiry-message"
              name="message"
              rows={5}
              required
              maxLength={1500}
              value={draft.message}
              aria-invalid={!!errors.message}
              aria-describedby={
                errors.message ? "inquiry-message-error" : "inquiry-privacy"
              }
              onChange={(event) => update("message", event.target.value)}
            />
            {errors.message && (
              <span className="field-error" id="inquiry-message-error">
                {errors.message}
              </span>
            )}
          </label>
        </div>
        <p id="inquiry-privacy" className="small-copy">
          Required fields are marked *. Details stay in this page until you copy
          them or open your email app. Nothing is stored or sent by this
          website.
        </p>
        <button className="button button-primary" type="submit">
          Prepare my inquiry <Mail size={17} aria-hidden="true" />
        </button>
      </form>
      {prepared && (
        <div
          className="inquiry-preview"
          ref={preview}
          tabIndex={-1}
          aria-labelledby="inquiry-preview-heading"
        >
          <p className="eyebrow">READY FOR YOUR REVIEW</p>
          <h3 id="inquiry-preview-heading">Your inquiry draft</h3>
          <p role="status">
            Your draft is ready. Open your email app, review it and send it
            there. No message has been sent.
          </p>
          <pre>{inquiryText(draft)}</pre>
          <div className="inquiry-actions">
            {site.email && (
              <a
                className="button button-primary"
                href={inquiryMailto(site.email, draft)}
              >
                Open email app <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            )}
            <button
              className="button button-outline"
              type="button"
              disabled={copy === "pending"}
              onClick={copyInquiry}
            >
              {copy === "done"
                ? "Copied"
                : copy === "pending"
                  ? "Copying…"
                  : "Copy inquiry"}
              {copy === "done" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="small-copy" aria-live="polite">
            {copy === "failed"
              ? "Copy is unavailable in this browser. Select the draft above and copy it manually."
              : copy === "done"
                ? "Copied to your clipboard. Paste it into a message to the resort."
                : "No email app? Copy the draft and paste it into the resort’s official Facebook conversation."}
          </p>
          <a
            className="text-link"
            href={site.facebook}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open official Facebook <ArrowUpRight size={16} />
          </a>
        </div>
      )}
    </>
  );
}
