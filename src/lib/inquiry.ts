import type { BookingIntent } from "@/config/booking";
import { manilaDate, isCalendarDate } from "@/lib/dates";
export { manilaDate } from "@/lib/dates";

export const inquiryTypes: { value: BookingIntent; label: string }[] = [
  { value: "general", label: "General inquiry" },
  { value: "stay", label: "Accommodation" },
  { value: "cottage", label: "Swimming & cottages" },
  { value: "adventure", label: "Activities" },
  { value: "group", label: "Group or event inquiry" },
  { value: "dining", label: "Dining" },
];
export type InquiryDraft = {
  name: string;
  contact: string;
  interest: string;
  subject: string;
  date: string;
  guests: string;
  message: string;
};
export type InquiryErrors = Partial<Record<keyof InquiryDraft, string>>;
export function validateInquiry(
  draft: InquiryDraft,
  today = manilaDate(),
): InquiryErrors {
  const errors: InquiryErrors = {};
  if (draft.name.trim().length < 2 || draft.name.length > 120)
    errors.name = "Enter your full name (2–120 characters).";
  const contact = draft.contact.trim();
  if (contact.length > 150)
    errors.contact =
      "Keep your email address or phone number to 150 characters.";
  if (
    contact.includes("@")
      ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
      : !/^\+?[\d\s().-]+$/.test(contact) ||
        contact.replace(/\D/g, "").length < 7 ||
        contact.replace(/\D/g, "").length > 15
  )
    errors.contact =
      "Enter a valid email address or phone number, including your area/country code.";
  if (!inquiryTypes.some((type) => type.value === draft.interest))
    errors.interest = "Choose an inquiry type.";
  if (draft.date && (!isCalendarDate(draft.date) || draft.date < today))
    errors.date = "Choose today or a future visit date.";
  if (
    draft.guests &&
    (!/^\d+$/.test(draft.guests) ||
      Number(draft.guests) < 1 ||
      Number(draft.guests) > 9999)
  )
    errors.guests = "Enter a whole number of guests between 1 and 9,999.";
  if (draft.message.trim().length < 10 || draft.message.length > 1500)
    errors.message = "Add a little detail (10–1,500 characters).";
  if (draft.subject.length > 160)
    errors.subject = "Keep the topic to 160 characters.";
  return errors;
}
export function inquiryText(draft: InquiryDraft) {
  return [
    "Hello Paraiso team,",
    "",
    `Name: ${draft.name.trim()}`,
    `Contact: ${draft.contact.trim()}`,
    `Inquiry: ${inquiryTypes.find((type) => type.value === draft.interest)?.label || "General inquiry"}`,
    ...(draft.subject.trim() ? [`Interested in: ${draft.subject.trim()}`] : []),
    ...(draft.date ? [`Preferred visit date: ${draft.date}`] : []),
    ...(draft.guests ? [`Guests: ${draft.guests}`] : []),
    "",
    draft.message.trim(),
    "",
    "Please confirm current arrangements, rates and availability. This is an inquiry, not a confirmed reservation.",
  ].join("\n");
}
export function inquiryMailto(email: string, draft: InquiryDraft) {
  const subject =
    `Paraiso inquiry${draft.subject.trim() ? ` — ${draft.subject.trim()}` : ""}`.replace(
      /[\r\n]/g,
      " ",
    );
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@").replace(/%2E/g, ".")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryText(draft))}`;
}
