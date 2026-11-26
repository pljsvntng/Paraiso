# Public reservation tracking implementation

Follow-up correction: staff views now use the same public reference as customers, and migration execution fills missing legacy references automatically. The [reference mismatch report](REFERENCE-MISMATCH-FIX.md) supersedes the original on-demand legacy issuance description below.

Implemented 22 November 2026. Customers use one randomly generated public reference; tracking no longer requires email or a guest session. Results disclose only reference and status. New reservations still persist in PostgreSQL, retain their internal number, and follow existing staff decisions and permissions.

## Files changed

| Files | Change |
| --- | --- |
| `db/migrations/011_public_tracking.sql` | Additive nullable reference column, format constraint and unique index. Previous migrations unchanged. |
| `src/lib/booking/public-tracking.ts` | Generate 192-bit cryptographic references, issue stable references and query only public status columns. |
| `src/lib/booking/tracking-status.ts` | Shared public result types and exact customer labels/messages. |
| `src/lib/booking/cart.ts`, `service.ts` | Persist public references within booking transactions; preserve references on retries; expose reference in authenticated staff details. |
| `src/lib/booking/commerce-api.ts` | Validated, rate-limited status endpoint; authenticated legacy recovery; audited staff reference retrieval. |
| `src/lib/booking/jobs.ts` | Include public reference and direct tracker link in optional guest notifications. |
| `src/components/booking/booking-tracker.tsx` | Replace email access form and detailed itinerary with a single input and private status-only result. |
| `src/components/booking/reference-confirmation.tsx` | Reference display, clipboard copy, save instructions and tracking link. |
| `src/components/booking/cart-checkout.tsx` | Navigate to confirmation using the persisted public reference. Booking contact email retained. |
| `src/app/booking/confirmation/[reference]/page.tsx` | Support public reference confirmation and verified legacy receipt/session recovery without exposing guest details. |
| `src/app/booking/reservation.css` | Match existing resort typography/colors; responsive form and long-reference wrapping. |
| `src/components/admin/reservation-drawer.tsx` | Display public reference; allow staff to issue one for a verified legacy guest; correct decline explanation copy. |
| `src/components/admin/types.ts`, `operations-panels.tsx` | Keep detailed reservation types within admin code and include nullable public reference. |
| `tests/commerce.test.ts` | Status lifecycle, exact minimal response, retries, permissions, legacy exchange, validation, CSRF, limits/expiry and database failure coverage. |
| `tests/helpers/public-tracking-browser.ts` | Real browser booking, copy, reload, new context, statuses, privacy, error handling and responsive checks. |
| `tests/reservation.test.ts`, `tests/helpers/admin-workspace-browser.ts` | Update existing workflows to verify public confirmation and omission of private guest/staff details. |
| `scripts/demo/verify.ts` | Separate public confirmation reference from internal staff reservation number; update status assertions. |
| `.env.example`, `db/README.md`, `docs/RESERVATION-SYSTEM.md` | Document optional email integration, migration, recovery and limiter deployment settings. |

The Next.js production build also regenerated `next-env.d.ts` to reference production route types.

## Compatibility and database preservation

Migration 011 was applied to the configured local PostgreSQL database `paraiso_dev`. Before/after checks confirmed the same four reservations, sixteen history records, payment count and status distribution. No fixture reservations were inserted there. Test fixtures use isolated, randomly named PostgreSQL clusters.

Sequential references always fail public status lookup, even with an existing guest cookie. Previously issued private sessions, receipts or valid single-use access links can recover a public reference after ownership verification. Otherwise staff must verify the guest's booking details and issue/share the public reference through the existing drawer. Public references do not authorize guest edits or private detail access.

Tracking is limited to 30 attempts per 15 minutes per trusted client key, with PostgreSQL persistence. Only set `TRUSTED_IP_HEADER` behind a proxy that overwrites that header; otherwise requests use a shared restrictive limit. Tracking requests accept at most 256 bytes. The customer form submits the reference in a POST body, and generated tracker links use a fragment that is removed on opening. Database errors return a generic message.

## Verification

- `npm run build`: production build passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Browser-enabled PostgreSQL regression command: `$env:BOOKING_BROWSER_TESTS='1'; $env:TRACKING_BROWSER_TESTS='1'; npm test`.
- Final result: **54 passed, 0 failed, 0 skipped**, approximately 193 seconds, including both browser suites.
- Real Edge checks cover customer submission, saved reference and clipboard copy, confirmation reload, returning in a fresh context without cookies, pending/approved/declined/cancelled/invalid results, and status-only responses.
- HTTP/PostgreSQL checks cover all staff decisions and history, stable submission retries, sequential reference rejection, authenticated legacy recovery, single-use link exchange/replay rejection, unauthorized staff actions, validation/injection inputs, oversized requests, rate limiting/expiry and a simulated database query failure with recovery.
- Responsive tracking widths: 320, 375, 390, 430, 768, 1024 and 1440 pixels. Desktop and mobile screenshots were visually inspected under `.local/tracking-tests`.

Apply `npm run db:migrate` in each other environment before deploying the updated application. No hosted production deployment was performed.
