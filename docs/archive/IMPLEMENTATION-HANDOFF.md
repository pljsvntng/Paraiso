> Historical reference: payment processing and financial dashboard functions are retired. Use [the current reservation-only guide](../RESERVATION-SYSTEM.md) for active features, endpoints and tests.

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

# Paraiso booking implementation handoff

Updated 21 November 2026 (Asia/Manila). Start here for the current architecture. The original `docs/reports/WEBSITE_AUDIT.md` and older static-export guides are historical evidence, not current release instructions.

## Scope and release status

Implementation extends the existing Next.js App Router website, PostgreSQL schema, custom authentication/permissions, PayMongo integration, manual claims, ExcelJS reporting and notification outbox. No second application/database/authentication framework was introduced. Existing user changes and original photographs were retained. No production database was connected, real money/email sent, or deployment performed.

**Production readiness is not certified.** Owner-approved inventory/rates/policies, genuine receiving accounts, merchant sandbox evidence, SMTP delivery, the chosen host/scheduler and backup recovery must be verified. The setup panel reports configuration, not business approval or successful external integration.

## Audit defects

All nine defects were still present at inspection. Existing locks, private evidence, request keys and financial infrastructure were reused.

| ID | Resolution | Regression evidence |
| --- | --- | --- |
| B01 | Financial updates retain CONFIRMED/CHECKED_IN/CHECKED_OUT/COMPLETED. Late funds on inactive bookings require reconciliation. Confirmed guests can pay balances. | Deposit/final-payment retries and actual approval/check-in/payment/checkout lifecycle. |
| B02 | Each service retains its own guests. Parent counts are a first-service compatibility pair, **not a unique-party estimate**. Lists, reports and notifications use per-service summaries. | Mixed 1-adult/4-child and 5-adult/0-child services and workbook attendance checks. |
| B03 | Legacy payment writes now use the transaction-safe ledger and require request UUID, actual method/reference/time and independent verification. Unsafe old payloads are rejected. | Concurrent HTTP duplicates, fresh-key retries of the same reference, conflicting replay and bounded refunds. |
| B04 | Validated provider `paid_at` populates `provider_paid_at` and financial `received_at`; `created_at` remains ingestion time. Missing authoritative time cannot credit money. | Delayed gateway payment across Manila midnight and actual reporting-date checks. |
| B05 | Active, completed, total and configured-overdue receivables are distinct centavo metrics. | Known completed unpaid booking and independent expected active-balance calculation through HTTP. |
| B06 | FAQ, pool, mobile navigation, location/hours and legacy payment copy reflect conditional live booking and deposit holds. Facebook remains a separate contact option. | Content assertions and public route rendering. |
| B07 | Facilities photo uses its maintained catalog alt text: covered wooden tables beside a paved garden walkway. | Canonical alt-text regression. |
| B08 | Financial exports list actual item categories. Totals appear once per booking; no category allocation of received money is invented. | Combined accommodation/swimming ledger category and attendance checks. |
| B09 | Status, phone and notes commit atomically with one version change or all roll back. | Service-level permission/rollback checks and mixed-field HTTP PATCH. |

## Database changes

Original migrations `001`–`007` remain unchanged. New **`db/migrations/008_operations.sql`** adds:

- Provider transaction timestamps, received-date index and column comments distinguishing financial and ingestion dates.
- A `NOT_REQUIRED` financial state for explicitly free reservations, instead of calling them unpaid.
- A separate declined cart status.
- Physical day-use inventory on the existing service/unit tables. Unit exclusion uses local timestamp ranges: whole stays for rooms, nonoverlapping sessions for cottages.
- Maintained privacy/rescheduling policies and policy version/publication metadata.
- Configured balance due dates and optional balance reminders.
- Idempotent guest change requests with one pending request per booking.
- Seasonal/weekday/holiday rate periods with exact centavo rates, applicable weekdays and priority.
- Worker run heartbeat/failure records.
- Private staff notes in a separate append-only table; these do not replace guest requests or appear in the guest tracker/emails.

Migrations remain checksum-verified and serialized in a transaction. No historical bookings/financial entries are deleted or recreated. Historical gateway dates are **not** backfilled with guessed provider times; reconcile old daily figures with genuine merchant records.

PostgreSQL `numeric` retains the existing peso ledger. Booking calculations use integer centavos; percentage deposits use basis points and round up to the next centavo. Date-only values remain `YYYY-MM-DD`. Financial timestamps use `timestamptz` and are reported in Asia/Manila. Entered financial form times are explicitly interpreted as Manila time, regardless of browser timezone.

`booking_financials` is authoritative for balances. `booking_charges` retains accepted initial/revised snapshots: **never sum historical rescheduling revisions as current revenue**. Current accepted totals live on bookings/items; receipts/refunds remain separate.

## Catalog and services

Editorial names/photos remain in the source catalogs. Exact existing stay names are **Family Deluxe, Igloo, Wooden & Brick, Standard Cabin and Bunkhouse**. Do not guess different room mappings.

`npm run db:seed` imports these five stays and all eight existing adventure topics using their actual source names/slugs/photos. New rows are inactive with no fabricated price, capacity, sessions or physical units. Repeating import preserves administrator edits. No swimming/cottage/dining offerings, customers or financial fixtures are seeded.

PostgreSQL owns bookable commercial data: active status, capacity, units, base/date-specific rates, deposits, sessions, descriptions, amenities, restrictions and photographs used at booking. Public stay/adventure cards and pool/dining sections fetch current facts; static editorial copy supplies no competing bookable rates. Unknown/disabled offerings show a not-configured/inquiry state.

| Service | Available workflow | Required owner information |
| --- | --- | --- |
| Accommodation | Real room availability, multi-night continuous unit allocation, guests/rooms, photos/details, deposits, rate periods and staff exact-unit selection. | Physical identifiers/counts, rates, capacity, bed/facility details, check-in/out and restrictions. Enter verified arrangements in description/amenities/restrictions. |
| Swimming | Independent date/session booking, adult/child pricing, duration, capacity, shared pool groups, approved exclusive use, maintenance and combined checkout. | Actual services, schedule, guest limits, fees, rules and deposit requirements. |
| Cottage | Actual SWIMMING services can enable **Physical day-use units** with real identifiers/capacity. Inventory is separate from swimming and both can be in one cart. Adjacent HH:mm sessions can reuse a cottage; overlaps cannot. | Verified cottage names, inventory, photos, inclusions, capacities/rates. None are assumed to exist. |
| Adventure | Eight inactive source topics; enabled services support date/session/participant/equipment capacity, duration, minimum age, deposits and published safety/weather/height/weight guidance. | Operational confirmation, actual participant/equipment limits, schedule, safety requirements and prices. |
| Dining | Independent date/session capacity, explicitly approved free/paid reservations, approved package services and once-per-item meal/add-on packages in the unified cart. | Real dining areas/capacity/sessions and package/menu prices. This is not a POS or kitchen fulfillment system. |

Exact physical-unit selection is restricted to authenticated staff; leaving it empty uses automatic allocation. Seasonal/weekday/weekend/holiday rules use half-open `[start,end)` dates. Higher priority wins; overlapping equal-priority rules are rejected. Price/editorial changes affect new quotes while existing bookings retain snapshots. Structural capacity/resource/session changes remain protected while active commitments exist.

Current sessions remain within one Manila calendar day. One adventure participant consumes one equipment-capacity place. If the owner approves midnight-crossing swimming or multi-passenger equipment accounting, specify/test that additional model before enabling it. Separate services do not imply separate unique visitors. No unapproved tax, fee, menu or accounting allocation is invented.

## Unified checkout and payment

The existing `/booking/` cart supports up to 12 items with independent dates/sessions. Guests can edit quantities/dates, remove items and recheck availability. It displays per-date rates, guests/units/nights, add-ons, total/deposit/balance. Unconfigured fees/discounts are not added.

HTTP checkout requires accepted total, deposit and policy version. Stale prices/policies are rejected rather than silently changing obligations. All four owner-approved policies must be published before checkout opens. Accepted policy text/version and prices/deposit rules are snapshotted.

Submission/allocation is atomic under the existing global inventory advisory lock; the PostgreSQL unit exclusion is an independent guard. Deposit holds expire and release capacity. Verified deposits retain allocations for staff review. No-deposit requests allocate only when confirmed. Expiry runs on inventory writes and the private worker.

One reference covers every item. Random hashed secrets, HttpOnly cookies and one-use recovery email links protect access. A reference alone never reveals private details/evidence. Legacy receipt access is retained; email recovery can use the same tracker for legacy records.

Manual wallet references/images remain pending until authorized staff independently match actual account, amount, reference and transaction time. Evidence and QR images remain private PostgreSQL bytea. Gateway settlement still requires signature verification, secret-key provider retrieval, exact amount/currency/booking association and idempotent insertion. Checkout supports required deposit or full outstanding amount; confirmed guests can pay remaining balances.

Refund recording describes completed refunds; it does not initiate a transfer. Refunds are administrator-only and cannot exceed verified net receipts. Financial updates do not rewind lifecycle. Late money cannot silently reacquire sold inventory.

An already-open gateway attempt cannot silently substitute its deposit amount for a newly requested full payment. The differing attempt must be resolved first. If actual cash and a delayed genuine gateway receipt together exceed the total, both actual receipts remain in the ledger and the booking is flagged for credit/refund reconciliation; the lifecycle is preserved.

## Rescheduling, management and reporting

Guests submit cancellation/rescheduling requests from the existing private tracker. Duplicate keys do not create repeated requests; unresolved requests leave current arrangements unchanged. Approval-authorized staff review requests from Reservations.

Cart and legacy rescheduling retain the original booking/reference/payments. Staff preview all services' availability, new totals/deposits, verified funds, balance and potential refund review. Applying requires current booking version, exact accepted amounts, published policy version, audit reason and recorded guest consent. Every item and allocation changes in one transaction; unavailable/stale changes roll back. Confirmed status is retained, with reconciliation flagged for changed deposit obligations or credit due. Closed/checked-in bookings and unresolved payment attempts/claims cannot be rescheduled. Refund review never automatically sends money.

The dashboard retains role checks, private history/details, phone/notes, walk-in/telephone booking and check-in/out. Lists have 50-row pages and category/lifecycle/arrival filters. Monthly/weekly/daily calendars show services, holds and blocks; date selection starts staff booking and reservation selection opens details. Due dates require an expressly agreed deadline/audit note; optional reminders use those configured dates.

The permission-protected Excel workbook includes **Reservations, Financial ledger, Service itinerary, Pending payment claims, Outstanding balances and Receipt totals**. Receipt totals include daily/weekly/monthly views; weeks start Monday in Manila time. Claims are labeled unverified and excluded from receipts. Mixed payments retain their actual category list and are not allocated to a filtered category. Booking-date filters apply to reservation creation, financial filters to actual received/refunded dates and claim filters to submission. XLSX downloads need no Microsoft 365 account; optional Microsoft mirroring remains separate.

## API and components

All routes remain under `/api/reservations/` in the existing Node catch-all handler.

| Route | Behavior/access |
| --- | --- |
| `POST payments/:id` | Legacy compatibility endpoint delegates to verified idempotent ledger. |
| `PATCH bookings/:id` | Atomic status/contact/request edits. |
| `GET bookings` | Category/workflow filters; optional `page` returns 50 rows. |
| `GET commerce/catalog`, `POST commerce/quote` | Live commercial facts, maintained policies and date-specific rates. |
| `POST commerce/checkout` | Accepted total/deposit/policy-version protection. |
| `POST commerce/gateway` | Optional `fullPayment` for full balance. |
| `POST commerce/change-request` | Guest cookie required; request only. |
| `GET commerce/admin/change-requests` | Authenticated staff queue. |
| `POST commerce/admin/review-change/:id` | Approval-authorized decisions/rejections. |
| `POST commerce/admin/reschedule/:id` | Authorized preview; `?commit=true` applies an agreed revision. |
| `POST commerce/admin/due-date/:id` | Authorized agreed balance deadline with version/reason. |
| `POST commerce/admin/reconciliation/:id` | Authorized closure of a resolved financial alert with audit evidence; unresolved funds/claims/attempts prevent closure. |
| `GET/POST commerce/admin/rates` | Administrator rate periods. |
| `GET commerce/admin/units` | Authenticated staff physical-unit choices. |
| `POST commerce/admin/notes/:id` | Idempotent private staff note; returned only in staff booking details. |
| `GET commerce/admin/readiness` | Setup/worker status, without secrets. |
| `GET commerce/admin/summary`, `GET commerce/admin/export` | Correct receivables and expanded protected XLSX. |
| `POST commerce/admin/settings` | Maintained policies and reminders. |
| `POST worker` | Existing private worker plus run heartbeat/failure record. |

New modules: `changes.ts`, `rates.ts`, `readiness.ts`, `summaries.ts`, `policies.ts`. Existing cart/capacity/service/payment/report/inventory/outbox modules retain their responsibilities. New UI: `operations-panels.tsx`, `public-services.tsx`; existing cart/tracker/dashboard/payment/inventory/settings forms are extended. Policies are discoverable at `/policies/privacy/`, `/policies/terms/`, `/policies/cancellation/`, `/policies/rescheduling/` and share the admin-maintained source.

## Exact environment variables

Use `.env.local` only for development and host-managed secrets for staging/production. Use separate databases, roles, origins, merchant test configuration and restricted email recipients. Scripts use Next's existing environment loader.

| Variables | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL URL for the correct database/role; verified TLS when required. |
| `APP_URL` | Exact origin; `http://127.0.0.1:3000` locally, real HTTPS origin remotely. No path. |
| `JOBS_SECRET` | Random private worker bearer secret, at least 32 bytes. |
| `INTEGRATION_ENCRYPTION_KEY` | Stable 32-byte key as 64 hex characters; protects queued access links and optional Microsoft tokens. Back it up privately. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Real SMTP. Port 587 uses mandatory STARTTLS; port 465 uses `SMTP_SECURE=true`. |
| `STAFF_NOTIFICATION_EMAILS` | Designated authorized staff recipients. |
| `PAYMONGO_MODE`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` | Merchant configuration. Default/test mode uses real merchant `sk_test_...` credentials, not fixtures. |
| `PAYMONGO_SANDBOX_VERIFIED`, `PAYMONGO_LIVE_APPROVED` | Both stay false until genuine sandbox tests and owner approval justify live checkout. |
| `TRUSTED_IP_HEADER` | Optional, only after verifying a non-bypassable proxy overwrites it. Empty retains the existing shared rate-limit bucket. |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` | Optional Microsoft mirror; not required for booking/XLSX downloads. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Temporary first-administrator bootstrap values; password 12–128 characters. Clear after creation. |
| `BOOKING_BROWSER_TESTS=1` | Tests only: enables installed Edge/Chromium checks. |
| `PORT` | Optional runtime port according to selected Node host. |

Generate independent secrets using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never reuse test credentials or one secret across purposes.

## Connect PostgreSQL and start locally

Use the approved PostgreSQL server and create a separate development database/login through its administration channel. No command here creates/resets a production database.

Local URL shape: `postgresql://USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/paraiso_dev?sslmode=disable`. Remote providers must use genuine host/database/login and certificate-verifying TLS, normally `?sslmode=verify-full`; do not disable remote verification. The migration role needs `btree_gist` provisioned/authorized by the provider.

Use Node 24 (tested here with v24.18.1):

```powershell
Set-Location C:\projects\Paraiso
npm ci
if (!(Test-Path -LiteralPath .env.local)) { Copy-Item .env.example .env.local }
# Edit .env.local privately with DATABASE_URL, APP_URL and generated secrets.
npm run db:check
npm run db:migrate
npm run db:seed
```

Bootstrap once, keeping the password out of files/history:

```powershell
$env:ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL'
$env:ADMIN_NAME = 'YOUR_ADMIN_NAME'
$securePassword = Read-Host 'Administrator password (12–128 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
Remove-Item Env:ADMIN_NAME
npm run dev
```

Open `http://127.0.0.1:3000/admin/login/`. Configure genuine inventory/rates/deposits/sessions in Inventory; publish approved policies and wallet details in Booking settings. Then visit `/booking/`, choose/check dates, combine services, review the quote, accept policies and submit. Save the reference/private tracker session. Only independently verified payments reduce balances. A free/no-deposit test service still requires real owner approval outside isolated tests.

`npm run ops:readiness` is read-only and exits nonzero when setup remains incomplete. For production-style local verification, run `npm run build` then `npm start`. Never deploy the historical static `out/` export for booking.

## Validation evidence

Administrator password recovery (local owner maintenance): run `npm.cmd run admin:reset-password -- YOUR_ADMIN_EMAIL` from an interactive VS Code terminal. Enter the new password twice when prompted; input is hidden and is not supplied in command arguments or environment variables. The command updates only one matching active administrator, revokes that account's existing sessions, clears its email login-attempt bucket and records a password-reset audit event without the password. It does not change PostgreSQL credentials or booking records. Access to the project's database credentials is required; no public password-reset endpoint is added.

Recovery follow-up verification: `npm.cmd run typecheck` and targeted ESLint passed. `node --import tsx --test --test-force-exit tests/reservation.test.ts` passed 21 tests on isolated PostgreSQL, including reset scope, new/old hash verification, session revocation, audit privacy, and rejection of staff/weak-password resets. The interactive hidden prompt was checked using a deliberately invalid short test password; no live account was modified.

Tests create isolated randomly named local PostgreSQL clusters and override supplied database URLs before connecting. SMTP is disabled; gateway transports are mocked. Windows browser checks use installed Edge. These tests cannot certify actual merchant settlement or deliverability. Final commands/results are recorded below after verification.

| Executed command/check | Actual result |
| --- | --- |
| `npm run lint` | Exit 0; no errors or warnings. |
| `npm run typecheck` | Exit 0. |
| `npm run build` | Exit 0; Next.js 16.4.6 Node server build. Image preparation retained originals and prepared delivery variants for 44 photographs. |
| `$env:BOOKING_BROWSER_TESTS = '1'; npm test` | **64 passed, 0 failed, 0 skipped**, including real isolated PostgreSQL and installed Edge. |
| `$env:BOOKING_BROWSER_TESTS = '1'; node --import tsx --test --test-force-exit tests/commerce.test.ts` | Final targeted run after the cart edit/remove state fix: **33 passed, 0 failed, 0 skipped**, including editing dates, removing an edited item, re-adding and completing mobile checkout. |
| Migration validation inside the tests | Eight ordered migrations applied; repeat migration and safe five-stay/eight-adventure import passed. |
| HTTP/security/finance/concurrency | Protected endpoints, guest/proof isolation, payment idempotency, final-room and reschedule races, B01–B09, financial reports and private staff-note isolation passed. |
| Responsive/browser checks | Booking layouts at 360, 390, 768 and 1440 pixels; mobile tracking, keyboard dialog, staff login/calendar/settings and guest submissions passed. Desktop/mobile PNGs were visually inspected. |
| `git diff --check` | Exit 0. |

Tests use explicitly named TEST ONLY fixtures in isolated clusters. No resort database or real merchant/SMTP credentials were exercised. The test runner's synchronous-termination notice comes from the existing `--test-force-exit`/embedded-PostgreSQL runner; the test counts above are the actual pass/fail results.

Intermediate checks deliberately reproduced B01, then caught test permission-message assumptions, a rescheduling PostgreSQL numeric/bigint cast and the changed workbook sheet count. Those were corrected rather than omitted.

## Safe staging checklist

- [ ] Choose a host that actually runs the Next.js Node server, reaches PostgreSQL, protects secrets and schedules private jobs. Static-only or unsupported shared plans are insufficient. No provider was selected automatically.
- [ ] Use an isolated staging DB/roles. Verify target identity privately, back up before migration, apply all eight migrations and import only approved catalog records.
- [ ] Obtain approved units, rates/capacity, bed/check-in details, swimming/cottages, adventure safety/operation, dining packages and policies. Reconcile off-site/telephone bookings before opening inventory.
- [ ] Set HTTPS and exact `APP_URL`; verify cookies, proxy trust, private tracker/proof isolation. CSP is **report-only** until real Maps/checkout/browser checks justify enforcement.
- [ ] Use genuine merchant **test** credentials and webhook `https://STAGING_ORIGIN/api/reservations/paymongo/webhook/`. Test signed callbacks, duplicates, delays, wrong amounts/currency, expiration, full/balance payments and real refund evidence. Mock tests do not justify live flags.
- [ ] Configure restricted staging SMTP recipients and verified sending DNS/SPF/DKIM. Verify booking/payment/status/reschedule/recovery/reminder emails with designated consenting recipients.
- [ ] Schedule `npm run jobs:run` **every minute**, or private POST `/api/reservations/worker/` with `Authorization: Bearer JOBS_SECRET`. Keep secrets out of browser code/public query strings. Confirm host timeouts, heartbeat, hold expiry, failed jobs and provider reconciliation.
- [ ] Exercise accommodation, swimming, adventure, combined cart, final-room concurrency, cottages, rescheduling rollback, cancellation/expiry, report reconciliation, mobile/keyboard access and recovery on another device.
- [ ] Monitor worker failures/overdue heartbeat, delivery failures, provider reconciliation and DB errors/latency. Verify a real external operational alert channel.
- [ ] Keep encrypted restricted PostgreSQL backups, including private evidence, and separately back up the encryption key. Restore into a **separate recovery database** and verify payments/allocations/recovery before claiming readiness. Never overwrite live data for a restore test.
- [ ] Obtain owner approval for merchant activation, policies/privacy/retention, refund authority and launch. Only then set live secrets/flags and approve the public URL/indexing in `src/config/site.ts`.

## Remaining external evidence and operational limits

No genuine resort database credentials, approved rates/inventory, receiving account/QR, merchant credentials, SMTP account, chosen host or production access were supplied. Real TLS/privileges, merchant callbacks, wallet verification, SMTP delivery, scheduler failures, backup/restore and deployment remain external acceptance work.

No fabricated service, menu, policy, fee, customer or receipt is published. Unknown bed/check-in/safety facts need owner input. Midnight-crossing or multi-passenger equipment offerings need an approved model before activation. Refund transfer initiation, restaurant POS/fulfillment, fiscal invoicing and category allocation are not represented as implemented.

SMTP uses durable jobs, retries and stable Message-IDs; ambiguous provider timeouts can still cause duplicate delivery because SMTP has no end-to-end exactly-once guarantee. Test slow/failing SMTP with the actual provider. Arrival reminders use the configured arrival-minus-days date; an outage catch-up policy needs owner approval before sending late reminders. Benchmark the intentionally conservative global inventory lock before changing its concurrency model.
