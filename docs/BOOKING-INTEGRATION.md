# Connecting the separately maintained reservation system

This application is exclusively the informational public website. The partner owns the separate booking application, credentials, APIs, database, sessions, payment configuration, and booking policies.

All visit, accommodation, cottage, group, dining, and adventure CTAs render `src/components/shared/BookingCTA.tsx`, which uses `src/config/booking.ts`. The default opens the supplied official Facebook page and identifies the action as an inquiry. The static website collects no dates or personal data and sends no request to a reservation API.

## Enable the real booking destination

After the partner provides and verifies a deployed HTTPS URL, edit:

```ts
export const booking = {
  mode: "external" as "contact" | "external",
  externalUrl: "https://YOUR-VERIFIED-BOOKING-HOST/",
  fallbackUrl: site.facebook,
  openInNewTab: true,
  intentParameter: "interest",
};
```

Agree on the `interest` query parameter with the partner. Its non-sensitive values are `general`, `stay`, `cottage`, `adventure`, `group`, and `dining`. The partner may use the value as an initial preference and must independently validate it. Existing query parameters on the configured URL are preserved. Invalid, incomplete, or non-HTTPS destinations fall back to the Facebook inquiry link.

Use `<BookingCTA intent="stay">Reserve your stay</BookingCTA>` for a new reservation CTA. Do not add hardcoded booking URLs in individual pages. Ordinary editorial navigation continues to use Next.js links.

Rebuild with `npm run build`, inspect the link destinations, and deploy `out/`. Every link changes together. No CORS, API secrets, database access, shared cookies, authentication, or cross-application code import is necessary. Never put secrets into this public configuration: it is bundled for visitors.

To return to inquiry mode, set `mode: 'contact'` and rebuild. Until the partner system is live, avoid labels suggesting a completed booking or verified availability. The current labels describe planning and inquiries.

## Partner acceptance checks

Check each intent, mobile and desktop destinations, external tab behavior, URL parameters, and the fallback. The booking application is responsible for availability, pricing, guest data, confirmation, status transitions, payments, accessibility, and privacy requirements within its own system. Add the verified booking origin to any host Content Security Policy if later embedding or browser API calls are introduced; this static site currently uses plain external links.
