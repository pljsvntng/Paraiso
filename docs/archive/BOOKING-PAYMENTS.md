> Historical reference: payment processing and financial dashboard functions are retired. Use [the current reservation-only guide](../RESERVATION-SYSTEM.md) for active features, endpoints and tests.

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

# Combined reservations and verified payments

This guide covers the current booking/payment extension and supersedes the manual-payment-only sections of `RESERVATION-SYSTEM.md`. Read that guide for the existing administrator bootstrap, Microsoft authorization, database setup and account recovery procedures.

## Architecture and preserved website

The existing Next.js 16 App Router, React 19, TypeScript and Tailwind 4 website remains the application. Node.js Route Handlers provide the backend; PostgreSQL remains the source of truth. Existing staff authentication, inventory, audit logs and transactional notification jobs are extended. There is no second authentication system or database, no Supabase migration, no separate Express server and no frontend payment secret. Existing public pages, real photographs, fonts, branding and motion remain in place.

The booking entry is `/booking/`, private guest tracking is `/booking/track/`, and staff use `/admin/dashboard/`. Book Now links lead into the website booking flow. Hosted PayMongo Checkout collects payment credentials on the provider's domain. This application stores neither card details nor wallet PINs.

Production availability depends on the resort entering verified offerings, rates, physical inventory, capacity and policies. Seeds contain the existing five accommodation names and photographs, initially inactive. No new operational swimming, dining or adventure offering, price, deposit percentage, wallet account, QR image or guest record is seeded. Records named TEST ONLY exist only in isolated automated test databases under ignored `.local/`.

## Implemented workflows

- A single guest checkout can contain up to 12 accommodation, swimming, activity or dining selections, with individual dates, times, guest counts and optional configured add-ons. The server quotes and revalidates every item. PHP amounts use integer centavos; percentage deposits round up to a whole centavo. Different items retain their own percentage, fixed, full or no-deposit rule.
- Annual backend reference counters generate `PDJ-YYYY-000001` style references transactionally. An idempotency key prevents duplicate submissions. Each booking has an internal UUID separate from its public reference.
- Required-deposit bookings receive a configured temporary hold. No-deposit requests await staff approval and do not promise capacity until approval. Room nights allocate actual units; day services check concurrent guest capacity, duration, equipment and shared/exclusive resource conflicts. Maintenance blocks and legacy confirmed bookings participate in availability.
- Every inventory writer obtains the same database advisory transaction lock. Room allocations additionally have a PostgreSQL exclusion constraint. Confirmation rechecks the entire cart atomically. Expiry/cancellation releases allocations; scheduled maintenance also expires holds, and later inventory mutations clean up overdue holds.
- The guest receives an HttpOnly ownership cookie after checkout. A public reference alone cannot read a reservation, submit proof or retrieve a screenshot. Returning guests request a generic-response, one-time email access link using their booking reference and matching email. Links expire in 30 minutes, are consumed once and create a 24-hour session. The secret is in the URL fragment, exchanged by POST, then removed from the browser address.
- Staff can create a combined walk-in/manual reservation through the same cart. Approval, payment verification, report exports and administrator configuration have independent backend permission checks. Account changes invalidate existing staff sessions.
- Staff have month/week/day calendars, service/category filters, existing unit/service maintenance blocks, booking details, history, payment review, cash/bank receipt recording and completed refund recording. The calendar opens the selected booking. Summary figures come from the database, including upcoming activities, verified deposits, receipts and outstanding balances.
- Transactional jobs retain reservation, payment, rejection, confirmation, cancellation, refund and optional reminder notifications when SMTP or Excel is unavailable. The worker retries integration failures; failed delivery does not roll back a reservation. The existing Microsoft Excel summary mirror remains supported; the full financial workbook is a separate download.

Reservation workflow is `PENDING_PAYMENT`, `PENDING_VERIFICATION`, `PENDING_APPROVAL`, `CONFIRMED`, `CANCELLED`, `EXPIRED` or `COMPLETED`. Payment status is independently derived from verified receipts, refunds, current claims and checkout attempts: `UNPAID`, `PENDING`, `UNDER_VERIFICATION`, `PARTIALLY_PAID`, `PAID`, `FAILED`, `REJECTED`, `REFUNDED` or `PARTIALLY_REFUNDED`. Paying a deposit is not an official reservation confirmation unless the configured approval rule and inventory checks also succeed.

## Administrator setup

1. Use Node.js 24, install with `npm ci`, and copy `.env.example` to a private `.env.local`. Configure `DATABASE_URL`, the final HTTPS `APP_URL`, and a stable random `INTEGRATION_ENCRYPTION_KEY`. Never publish environment files.
2. Back up any existing database. Run `npm run db:migrate` with a migration account allowed to create `btree_gist`, tables, indexes and views. The migration runner verifies checksums; do not edit applied migrations. Run `npm run db:seed` only to import the existing inactive room catalog.
3. Follow `RESERVATION-SYSTEM.md` to bootstrap the first administrator with temporary `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` environment variables. Clear the password afterward. Subsequent users are created in the dashboard; there is no public staff signup or default password.
4. In Inventory, configure real service names, descriptions and existing photo paths. Choose the category, actual price basis, adult/child rates, occupancy, actual room unit identifiers or day capacity, time slots and duration. Add only verified services. The public content catalog is not automatically treated as bookable stock.
5. In each service, explicitly choose no deposit, percentage, fixed PHP deposit or full prepayment. Enter a percentage as a normal percentage in the dashboard; storage uses basis points. A fixed amount applies once to that selected service line and is capped at its total. Add-ons inherit that line's deposit rule. Use a separate bookable service when a meal/package needs a different rule. No discount or fee is invented; configure real packages/rates/add-ons instead.
6. Configure swimming shared/private options with the same resource group and consistent capacity. Set actual HH:mm sessions and duration when resources can overlap. Equipment is counted per participant. Blank time represents the full day. Day sessions cannot cross midnight; split them into separately dated sessions. Enter age/safety rules, amenities and actual secondary photo paths.
7. Activate only offerings with verified inventory/capacity. Null prices or unconfigured deposit rules remain quote requests and cannot be charged/confirmed as a known payable reservation. Unknown values never become a zero fee. A free dining request requires an explicit zero price and no-deposit rule. Snapshots are immutable: if a quote-only request needs a new price, create an updated request and cancel the superseded one with an audit note.
8. In Booking settings, publish the resort's actual booking terms and cancellation/refund policy and choose the payment window in minutes. Checkout stays closed until these policies are supplied. Optional automatic confirmation and reminder days are administrator choices; neither is assumed by default.
9. Grant staff only the required approval, export and independent payment-verification permissions. Ordinary staff cannot change financial configuration or read private payment evidence. Refund recording is administrator-only.
10. Configure SMTP, notification recipients and the worker as below. Test recovery links and integration retries before launch. Test all offerings against the resort's real operating schedule and existing off-site reservations; staff must enter telephone/walk-in bookings into this shared database.

## Manual GCash/Maya verification

In Booking settings, add the resort's verified business receiving account, instructions and optional genuine QR image. Publish it only after checking all details. Used account identities cannot be silently rewritten; disable an old account and create a new one. Instructions are displayed only to authenticated booking owners.

The guest enters the amount, actual transfer time and transaction reference, with an optional PNG/JPEG image. Images are size-limited, decoded, stripped of metadata and reencoded. They are stored as private database bytes, not in `public/` or a public storage bucket. A claim changes the workflow to pending verification but credits **zero** funds.

An administrator or explicitly authorized verifier must separately check the actual wallet/bank record and enter the independently observed amount, time, account and reference, confirm independent verification and add a note. These must match the claim. The verified ledger entry is written once in the same transaction as the review. A normalized method/reference uniqueness constraint prevents the same verified wallet transaction being credited to multiple bookings. A rejected screenshot/reference gives no credit. Do not approve based on a screenshot alone.

Verified funds first reduce the required deposit, then the remaining balance. When the deposit is met, a valid allocated hold is retained for staff approval or confirmed only under the configured automatic policy. Late money after expiry/cancellation/completion is preserved in the ledger and flagged for reconciliation; no capacity is silently reclaimed. Staff must contact the guest, check all availability and explicitly resolve an expired request or record an actual completed refund.

Cash/bank receipts and completed refunds can be recorded in booking details by permitted users. Every entry requires actual independent verification, a reference/note and an idempotency key. Refunds cannot exceed verified net receipts. This application does not initiate wallet, bank or provider refunds: process a refund through the authorized financial channel first, then record the completed transaction. Submitted claims and verified transactions are separate records throughout.

## PayMongo sandbox and live setup

The integration uses current hosted Checkout documentation: [hosted Checkout quick start](https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start), [Checkout behavior](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), and [webhook signatures](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management). Session creation uses POST `/v2/checkout_sessions`; authenticated retrieval and expiry use `/v1/checkout_sessions/{id}` and `/v1/checkout_sessions/{id}/expire`. Confirm enabled methods and behavior against the merchant's account during sandbox testing.

1. Obtain an approved merchant account and its **test** secret key. Use a separate staging database, non-customer addresses and sandbox funds. Set `PAYMONGO_MODE=test`, `PAYMONGO_SECRET_KEY=sk_test_...`, and the correct test `PAYMONGO_WEBHOOK_SECRET`. Do not put keys in source, screenshots or `NEXT_PUBLIC_` variables.
2. Enable only merchant-activated methods in Booking settings: GCash (`gcash`), Maya (`paymaya`), QR Ph (`qrph`) and/or cards (`card`). The gateway stays unavailable until both server credentials and administrator settings are valid.
3. Expose staging through HTTPS and register the POST webhook URL `https://YOUR-DOMAIN/api/reservations/paymongo/webhook/`. Subscribe to the checkout session payment events supported by the account. Requests are authenticated using the provider HMAC over the exact timestamp and raw request body with the mode-specific `te`/`li` signature and a five-minute timestamp window. Do not add browser authentication or CSRF requirements to this provider endpoint.
4. Create a staging booking with a real configured test price, deposit and available test inventory. Use its internal UUID to run `npm run payments:sandbox -- INTERNAL_BOOKING_UUID`, or open the owner's tracker and select hosted Checkout. The command refuses live mode. It creates an **actual provider sandbox session only when real test credentials exist**.
5. Complete the provider's supported test payment. Confirm the signed event reaches the app, then confirm the app independently retrieves the session with its secret API key and validates session/reference/metadata, mode, currency and exact expected deposit. Confirm exactly one ledger credit and the correct separate booking status. Browser redirects never credit a booking.
6. Test invalid signatures, a failed attempt, browser cancellation, pending payment, expired inventory, delayed events, duplicate delivery and worker reconciliation. Confirm returning to the tracker after cancelling has not marked the booking paid. Check test receipts against the merchant dashboard. A timed-out session creation stays `UNCERTAIN` and blocks another session; use Payments to reconcile the actual provider session ID before retrying. This intentionally prevents duplicate charging after ambiguous network failures.
7. Confirm a real sandbox success, audit the settings and document merchant approval. Only then configure `PAYMONGO_MODE=live`, the live secret/signing secret, `PAYMONGO_SANDBOX_VERIFIED=true`, `PAYMONGO_LIVE_APPROVED=true`, and the final HTTPS origin. Register the separate live webhook. Keep live activation under the resort's authorized merchant owner.

Only one creating/open/uncertain checkout attempt can exist for a booking. A failed payment can still leave its hosted session usable, so the app does not silently create a second session. Scheduled reconciliation retrieves provider truth and expires sessions for expired/cancelled bookings when possible. Mismatched or late payments are flagged, not fabricated or discarded. Private staff reconciliation can associate an uncertain creation with its actual session after metadata checks. Provider payment IDs and events are deduplicated in PostgreSQL.

**External status:** no merchant credentials were supplied for this implementation. Automated provider tests use an isolated transport fixture. No actual sandbox checkout, live charge, real transfer, real refund, webhook registration or merchant activation has been claimed. The staging sandbox procedure above remains required.

## Reports and calendars

Use Reports for daily, weekly, monthly or custom date ranges, category and current payment status. Downloaded XLSX files contain a Reservations sheet and Financial ledger sheet. Reservation dates filter the time the request was created; financial dates filter when money was actually received/refunded, both in Asia/Manila. These are different reporting periods by design.

Booked gross amount, verified receipts, refunds and outstanding balance have separate columns. Booked amount/balance appear once per booking in the ledger so summing multiple payment rows does not double count revenue. Figures represent customer receipts/refunds, not merchant settlement fees, taxes or accounting revenue recognition. Guest text is written as literal text, never executable spreadsheet formulas. Narrow requests exceeding 10,000 bookings or ledger rows. Download access requires export permission and creates an audit record.

Use Calendar for monthly occupancy, weekly schedule or daily timeline, filtering by category. Pending, confirmed and maintenance records are distinct. Use Inventory to block individual physical rooms or full services/sessions; conflicting allocated bookings prevent unsafe changes. Follow the resort's actual approval workflow before taking inventory offline.

The legacy Microsoft workbook mirror keeps its existing 13-column contract to avoid breaking a connected workbook. It is an asynchronous operational summary, not the new detailed financial ledger. PostgreSQL remains authoritative if Excel or email is unavailable.

## Worker, email and operational deployment

Configure SMTP with STARTTLS on 587 or implicit TLS on 465, genuine sender credentials and staff recipients. Configure sender domain DNS with the email provider. Access links additionally require the stable 32-byte encryption key. Booking storage remains operational when notification credentials are absent; jobs visibly remain pending/retryable. Email delivery is not a substitute for checking the dashboard.

Run `npm run jobs:run` every minute from a private server scheduler, or schedule POST `/api/reservations/worker/` with `Authorization: Bearer JOBS_SECRET`. Set a strong random secret. The worker expires holds, reconciles provider sessions, delivers access links, sends configured reminders and processes email/Excel jobs. Monitor scheduling, job age and failure categories; do not log passwords, raw webhook signatures, SMTP secrets, proof images or guest access links.

Build with `npm run build` and start with `npm start`; use a persistent Node service/process supervisor with the host's assigned port and a trusted HTTPS reverse proxy. The old static `out/` export cannot run booking endpoints. Production cookies are secure, reports and tracking responses are private/no-store, and booking pages send a no-referrer policy. Set `TRUSTED_IP_HEADER` only if the hosting proxy overwrites it and cannot be bypassed; otherwise rate limits deliberately use a shared app bucket.

Hostinger currently documents Next.js backend deployment on its Node.js-capable Business/Unlimited/Cloud hosting and VPS offerings: [official Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). A static-only hosting plan is insufficient. The resort's actual subscription, hPanel, DNS, HTTPS certificate, production database and deployment access were not supplied, so compatibility of that specific account is **not verified**. Confirm the plan supports the current Next.js runtime, scheduled private jobs, outbound PostgreSQL/SMTP/PayMongo HTTPS and required environment variables. Use a Node-capable plan or VPS if the existing plan cannot provide them.

Configure production PostgreSQL with verified TLS, backups and the required extension. Use a restricted runtime role, separate from migration credentials, with necessary table/sequence permissions and SELECT on `booking_financials`. Do not expose the database through a public browser SDK or share database credentials with staff browsers. All staff data access is through authenticated backend permission checks. The application supports a managed PostgreSQL provider without requiring a migration to another auth platform.

## Backup, recovery and privacy operations

- Enable encrypted automated PostgreSQL backups and point-in-time recovery where available. Private proof/QR images, ledger entries, configuration, audit history and notification queues are in this database and included in its backup. Separately back up the encryption key and server configuration through restricted secret management. Losing the encryption key prevents access to encrypted integration credentials and queued links.
- Before a migration or deployment, take a provider snapshot/backup and record the migration version. Restore into an isolated database with SMTP, Microsoft writes and live PayMongo disabled. Verify migration checksums, references, charges, net balances, room exclusions and authenticated proof access. Test a restore regularly. Never point a restored test environment at live merchant keys or customer notification recipients.
- For deployment rollback, restore the previous application version only if compatible with the applied schema. Prefer forward fixes; do not remove financial rows or edit checksummed migrations to force rollback. Preserve real payment IDs and audit evidence when reconciling any backup against provider records.
- Restrict staff access, disable departed accounts and review exports. Payment evidence is decoded privately, not publicly served; access tokens expire and old sessions are removed by the worker. Database encryption at rest, secret access and backup retention are hosting responsibilities.
- The resort must supply an approved privacy notice, authorized contact, retention periods and actual cancellation/refund rules. The published notice describes the booking/payment data used by the software; technical controls alone are not a certification of legal compliance. Review final business policies and operational procedures before accepting guests.
- `npm run privacy:preview -- DAYS` gives aggregate counts/bytes for old closed records without exposing guest details or deleting anything. There is deliberately no invented automatic deletion policy for financial evidence. For an approved deletion/anonymization request, verify identity privately, check outstanding balances/disputes and required financial retention, obtain the authorized retention decision, then perform a scoped transactional procedure with an audit record and a tested backup. Remove eligible evidence/contact fields while preserving required financial references. Apply the approved schedule to backups and exported copies too. Never delete active bookings or financial records through an ad hoc broad purge.

## Database changes

Existing migrations `001_booking.sql`, `002_audit_details.sql` and `003_receipt_expiry.sql` remain unchanged. New ordered migrations:

| Migration | Purpose |
| --- | --- |
| `004_checkout_and_payments.sql` | Extends services/staff/bookings/room allocations; adds itemized reservations, deposit settings, annual counters, receiving accounts, private claims, gateway attempts/events, guest access and POS charge relationships. |
| `005_payment_request_keys.sql` | Unique idempotency keys for staff ledger receipts/refunds. |
| `006_item_addons.sql` | Per-item immutable add-on name/price snapshots. |
| `007_financial_view_and_indexes.sql` | Shared `booking_financials` view and indexed booking/payment/session lookups for reports. |

New tables: `booking_items`, `booking_item_addons`, `booking_reference_counters`, `reservation_settings`, `receiving_accounts`, `payment_claims`, `checkout_attempts`, `provider_events`, `guest_access_requests`, `guest_booking_sessions`, `booking_charges`. Existing `accommodation_types`, `bookings`, `booking_units`, `users`, `payments`, audit and integration-job tables are extended/reused. Monetary snapshots use centavos; the existing decimal ledger remains exact PostgreSQL numeric. Unique and exclusion constraints provide database enforcement in addition to backend checks.

The future POS should authenticate staff/server requests, identify the booking through its internal UUID, read immutable charges plus verified payment/refund credits, and append uniquely keyed charges/receipts atomically. Never import deposits again as new payments. `booking_charges.external_key`, provider payment keys, claim associations and ledger request keys provide deduplication points. This phase prepares the relationships; it does not expose an unauthenticated POS API or implement a restaurant POS.

## Implementation file report

New backend modules under `src/lib/booking/`: `capacity.ts`, `money.ts`, `cart.ts`, `payments.ts`, `guest-access.ts`, `commerce-config.ts`, `commerce-api.ts`, `maintenance.ts`, `reports.ts`.

New UI: `cart-checkout.tsx`, `availability-calendar.tsx`, `booking-tracker.tsx`, `commerce-admin.tsx`, `service-fields.tsx` under `src/components/booking/`, plus `src/app/booking/track/page.tsx` and migrations `004`–`007` listed above. `tests/commerce.test.ts` exercises the new workflows.

Extended existing files: booking `db.ts`, `service.ts`, `inventory.ts`, `validation.ts`, `accounts.ts`, `security.ts`, `jobs.ts`; existing catch-all reservation Route Handler; booking/dashboard/admin forms; booking page and reservation CSS; contact privacy/FAQ text; private response headers in `next.config.ts`; tracker robots exclusion; `scripts/booking-admin.ts`; `tests/reservation.test.ts`; `.env.example`, package manifests, README and these guides. `sharp` is now an explicit runtime dependency for validated image uploads; no duplicate database/authentication/payment SDK was added.

The workspace already contains unrelated website work. It is preserved; `git status` includes that earlier work as well as this implementation. No broad reset, commit, production seed, deployment or external credential change was performed.

## Verification and launch gate

Verified on 21 November 2026 (Asia/Manila):

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, exit 0. |
| `npm run typecheck` | Passed, exit 0. |
| `npm run build` | Passed, exit 0; public pages and booking/admin/API routes generated. |
| `BOOKING_BROWSER_TESTS=1 npm test` | 48 passed, zero failures, zero skipped; real isolated PostgreSQL and headless Edge, about 92 seconds. |
| Mobile/desktop | Booking checks at 360, 390, 768 and 1440px; private tracker and staff calendar/settings/payment checks at 390px; no page overflow or browser exceptions. |
| Real merchant sandbox / live payment | Not run: merchant credentials were not supplied. Provider protocol/signature/reconciliation cases use a controlled transport fixture. |
| Deployment / actual Hostinger plan | Not performed or account-verified; external access was not supplied. |

All seven migrations were applied to isolated test databases, and rerunning migrations/seeding was verified. Manual verification cases use synthetic wallet records in those databases; no real wallet transfer is claimed. Private multipart evidence uploads and owner/verifier access restrictions are exercised through actual HTTP endpoints. Test screenshots remain under ignored `.local/booking-tests/` and `.local/commerce-tests/`; they intentionally contain test labels and must not be published as real customer bookings.

Run `npm run lint`, `npm run typecheck`, `npm run build`, then `$env:BOOKING_BROWSER_TESTS='1'; npm test` in PowerShell. Tests start separate real PostgreSQL clusters and production Next servers on unused ports, and browser checks use Edge on Windows. No resort database or customer funds are used. New cases cover mixed-category pricing/deposits, concurrent holds, exclusive/shared pool conflicts, activity equipment/duration, free dining, maintenance/add-ons, claim review/ref reuse, private upload/read access, one-time ownership links, ledger refunds/idempotency, signed webhook retrieval and replay, amount/mode checks, uncertain session creation, failed/expired checkout, late payment without overbooking, calendar/report output and mobile staff/guest routes. Existing reservation/content/integration tests remain included.

Before opening sales: enter all real inventory and policies; complete actual merchant sandbox testing; configure HTTPS, database backups, SMTP and the scheduled worker; test an expired hold and a late sandbox payment; verify staff permissions and an exported financial balance; confirm guest links arrive; and have the authorized resort owner approve published receiving details. A clean local suite does not certify a merchant account or a hosting plan that was not available to test.
