> **Historical static-site report.** The integrated reservation system supersedes the static-only booking/deployment assumptions below. See [current setup and validation](../RESERVATION-SYSTEM.md).

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

# Connecting the separately maintained reservation system

This application is exclusively the informational public website. The partner owns the separate booking application, credentials, APIs, database, sessions, payment configuration, and booking policies.

Reservation/inquiry CTAs render `src/components/shared/booking-cta.tsx`, which uses `src/config/booking.ts`. General CTAs open the supplied official Facebook page in contact mode. CTAs with a `subject` open `/contact/?interest=...&subject=...#inquiry`, preselecting the room, activity, dining or group topic. These URL parameters contain public resort context, never guest details.

The Contact page prepares an email-app draft with required-field/contact/date validation. The website does not deliver messages or store drafts. Visitors review the draft, then explicitly open their email app or copy it into the official Facebook conversation. Copy failures offer manual selection; no false delivery confirmation appears. The form requires JavaScript; direct phone, email and Facebook links remain in the static HTML. The contact destination comes from `src/config/site.ts`, centralized from the existing Contact page details and still subject to owner reconfirmation.

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

Agree on the `interest` and optional `subject` query parameters with the partner. Interest values are `general`, `stay`, `cottage`, `adventure`, `group`, and `dining`. The partner must independently validate these public hints. Existing query parameters are preserved. Invalid, incomplete, non-HTTPS or credential-bearing destinations fall back to the inquiry journey.

Use `<BookingCTA intent="stay" subject={stay.name}>Inquire about this stay</BookingCTA>` for a room-specific action. Do not add hardcoded booking URLs in individual pages. Ordinary editorial navigation and public inquiry-topic links use Next.js links. Explicit Facebook/social links always remain Facebook links when the booking provider is configured.

Rebuild with `npm run build`, inspect the link destinations, and deploy `out/`. Every link changes together. No CORS, API secrets, database access, shared cookies, authentication, or cross-application code import is necessary. Never put secrets into this public configuration: it is bundled for visitors.

To return to inquiry mode, set `mode: 'contact'` and rebuild. Until the partner system is live, avoid labels suggesting a completed booking or verified availability. The current labels describe planning and inquiries.

## Partner acceptance checks

Check each intent, mobile and desktop destinations, external tab behavior, URL parameters, and the fallback. The booking application is responsible for availability, pricing, guest data, confirmation, status transitions, payments, accessibility, and privacy requirements within its own system. Add the verified booking origin to any host Content Security Policy if later embedding or browser API calls are introduced; this static site currently uses plain external links.
