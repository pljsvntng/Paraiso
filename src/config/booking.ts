export type BookingIntent =
  "general" | "stay" | "cottage" | "adventure" | "group" | "dining";
export const booking = { mode: "internal", openInNewTab: false };
export function getInquiryPath(
  intent: BookingIntent = "general",
  subject = "",
) {
  const params = new URLSearchParams({ interest: intent });
  if (subject.trim()) params.set("subject", subject.trim().slice(0, 160));
  return "/contact/?" + params + "#inquiry";
}
export function getBookingLink(
  intent: BookingIntent = "general",
  subject = "",
) {
  const params = new URLSearchParams({ interest: intent });
  if (subject.trim()) params.set("subject", subject.trim().slice(0, 160));
  return {
    href: "/booking/?" + params,
    external: false,
    isInquiry: false,
    context: true,
  };
}
