import { site } from "./site";
export type BookingIntent =
  | "general"
  | "stay"
  | "cottage"
  | "adventure"
  | "group"
  | "dining";
/** Update this configuration when the separately maintained reservation website is ready. */
export const booking = {
  mode: "contact" as "contact" | "external",
  externalUrl: "",
  fallbackUrl: site.facebook,
  openInNewTab: true,
  intentParameter: "interest",
};
export function getBookingLink(intent: BookingIntent = "general") {
  if (booking.mode === "external") {
    try {
      const url = new URL(booking.externalUrl);
      if (url.protocol === "https:") {
        url.searchParams.set(booking.intentParameter, intent);
        return { href: url.toString(), external: true, isInquiry: false };
      }
    } catch {
      /* Incomplete integration falls back to the supplied contact page. */
    }
  }
  return { href: booking.fallbackUrl, external: true, isInquiry: true };
}
