# Paraiso reservation system

## Staff/customer reference alignment correction

The staff dashboard now displays the same secure public reference as the customer confirmation and tracker, with copy controls in the reservation drawer. Protected staff search supports public and internal numbers. `npm run db:migrate` also fills missing legacy references transactionally and audits issuance, preserving existing references, reservation fields, relationships and previous history. Sequential numbers remain internal and are never accepted by public tracking. Public responses contain only reference, mapped status and a generic message. See the [root-cause and verification report](reports/REFERENCE-MISMATCH-FIX.md).

## Reference-only tracking — 22 November 2026

The tracker now accepts one **Reservation Reference Number** and shows only public reference and status. Booking contact email remains required for resort communication. Tracking requires no email, login, browser storage or payment setup.

- New reservations persist a separate `PDJT-` reference generated with Node's cryptographic `randomBytes(24)` (192 bits). Internal numbers remain unchanged. Submission retries retain the same public reference.
- `POST /api/reservations/commerce/track/` accepts `{ "reference": "PDJT-…" }`. The parameterized query selects only public reference and status columns. Responses contain exactly `reference` and `status`, with private/no-store caching. The GET compatibility endpoint returns the same restricted result.
- Pending workflow states map to Pending Approval; CONFIRMED, CHECKED_IN, CHECKED_OUT and COMPLETED map to Approved; DECLINED maps to Declined; CANCELLED and historical EXPIRED map to Cancelled. Original statuses and history remain intact.
- PostgreSQL rate limits allow 30 attempts per 15 minutes per trusted client key, counting malformed attempts. Configure `TRUSTED_IP_HEADER` only behind a proxy that overwrites it. Without that header, requests share a restrictive limiter. Request bodies are capped at 256 bytes, schema fields are strict, and database failures return a generic 503.
- Confirmation provides Copy Reference and Track Reservation controls. Customers can return on any device. Optional guest notification emails include the public reference instead of an expiring tracking link.
- Additive migration `011_public_tracking.sql` adds a nullable, format-checked column and partial unique index. Run `npm run db:migrate` before running the updated application. It was applied to the configured local `paraiso_dev` database, preserving its four reservations, sixteen history records and existing statuses.
- Legacy sequential numbers are never accepted by public tracking. An existing unexpired private receipt/session or previously issued valid single-use link can exchange for a public reference. Otherwise staff must confirm the guest's booking details, open the existing reservation drawer and use **Create public tracking reference**. Retrieval is audited. Never issue a reference based only on possession of a sequential number. Existing bookings are not deleted or bulk-exposed.
- Staff decisions continue to use existing permission checks, PostgreSQL writes and audit history. Each customer lookup reads the latest committed status.

Run `npm run lint`, `npm run typecheck`, `npm run build` and `npm test`. For focused real-browser coverage in PowerShell: `$env:TRACKING_BROWSER_TESTS="1"; npm test`. This covers booking, copy, reload, a fresh browser context, decisions, failures and 320–1440px layouts using isolated PostgreSQL clusters. Screenshots are under `.local/tracking-tests`.

Final verification with both `BOOKING_BROWSER_TESTS=1` and `TRACKING_BROWSER_TESTS=1`: **54 passed, 0 failed, 0 skipped**. Build, TypeScript and ESLint passed. See the [changed-file summary and verification report](reports/PUBLIC-RESERVATION-TRACKING.md).

Earlier notes below are historical where they describe email tracking or private guest information on the tracker.

The latest [dashboard crash audit and repair report](reports/DASHBOARD-CRASH-FIX.md) documents navigation, request recovery, panel spacing and responsive verification.

## Reservation-only dashboard cleanup — 22 November 2026

This is the current implementation. All payments are handled personally at the resort, outside this website. The website does not process or record new payments, refunds, transfer claims or financial transactions. Earlier payment and dashboard guides are historical references.

### Features removed

Payment/verification navigation, payment claims and proof-upload screens, gateway and wallet settings, deposit controls, financial charts/KPIs, payment badges/filters/columns, ledger/refund/reconciliation controls, financial reports and financial Excel worksheets have been removed from the active application. The old commerce UI now contains only the reservation calendar. Payment-provider polling, balance reminders and financial outbox messages no longer run. The sandbox-payment CLI is retired.

Guest tracking is reservation-only for both current and historical bookings. Public catalogs omit old deposit configuration. Historical financial events and payloads are excluded from operational activity screens; the original audit records remain stored.

### Features retained and improved

- Existing Next.js website, genuine resort content/photos, PostgreSQL records, authentication, CSRF checks, request validation, rate limits, private guest ownership, transaction locks, database overlap constraints and approved allocations are retained.
- New requests use PENDING_APPROVAL; authorized staff approve to CONFIRMED or decline with a meaningful reason. Cancellation and completion release allocations. Requests never create payment holds or financial charge rows.
- Staff approval and rescheduling work without payment checks for historical reservations too. Historical totals, deposit settings, payment rows, claims, financial flags and financial configuration remain unchanged by operational edits. No reservation is automatically marked paid.
- One native reservation dialog handles review, confirmation, decline, rescheduling, permitted contact/notes edits, private staff notes, check-in/out, day-visit completion and activity history. Confirmation replaces the dialog content instead of opening an overlapping dialog.
- All Reservations and Pending Requests have search, category/status/date filters, allowed sorting and pagination. Combined reservations can match the date of any selected service. Guest records group by booking email and open exact guest reservation history.
- Day, week and month calendars retain real reservations and maintenance blocks. Pending, confirmed, declined and cancelled records have separate indicators.
- Service management retains rooms, physical cottages, sessions, capacities, equipment, restrictions, active flags, blocked dates and informational public rates. It no longer offers deposit settings. Editing a service preserves its private historical deposit configuration.
- The dashboard has eight actual PostgreSQL KPIs: Total Reservations, Pending Approval, Confirmed Reservations, Today's Visits, Today's Departures, Upcoming Reservations, Declined Reservations and Cancelled Reservations. Reservation trends, category/status distribution, confirmed accommodation occupancy, recent requests and scheduled service visits replace financial analytics. The pending badge uses the actual pending count.

### Navigation and permissions

| Section | Functional screens |
| --- | --- |
| Overview | Dashboard |
| Reservations | All Reservations, Pending Requests, Booking Calendar |
| Resort Services | Accommodations, Swimming & Cottages, Adventures, Dining, Availability Management |
| Records | Guest Records, Reservation Reports, Excel Export |
| Administration | Staff Accounts, Resort Settings, Reservation Policies, Activity Logs |

Existing permissions remain authoritative. Service configuration, resort settings and staff accounts remain administrator-only. Staff can view reservations, guest history, schedules and published policies; approval and Excel downloads require their existing permissions. Staff do not gain financial write access. A New Reservation action preserves walk-in and telephone entry without adding an empty route.

### Reservation Excel export

The download contains one Reservations worksheet with exactly 16 columns: Reservation Reference, Guest Name, Contact Number, Email, Reservation Category, Service Name, Visit Date, Check-in Date, Check-out Date, Number of Guests, Special Requests, Reservation Status, Date Submitted, Approved By, Approval Date and Decline Reason.

Filters support visit dates, category, status and guest history. Combined service dates and counts are retained. Downloads use ExcelJS directly and require no Microsoft 365 account. The 10,000-record limit, literal-text formula safety and private no-store responses remain in place. Optional existing workbook synchronization uses the same reservation-only columns.

### API changes

- Transaction-writing and gateway endpoints now return HTTP 410: payments/:id, commerce/manual, commerce/gateway, commerce/qr, paymongo/webhook, and the former admin ledger, claim review, receiving-account, payment-settings, reconciliation, balance-due, claims, attempts, billing and financial-summary endpoints. Existing authorization runs on staff endpoints; guests cannot access private archives.
- GET export and GET commerce/admin/export now generate reservation-only workbooks. Financial report generation was removed.
- GET commerce/admin/guests provides protected, paginated guest records. The reservation directory supports an exact guestEmail filter.
- GET commerce/admin/policies exposes published operational settings to staff; POST is administrator-only, validates approved content and uses version protection.
- GET commerce/admin/reservation/:id returns reservation details. Existing staff booking updates, calendar, notes, change requests, inventory and authentication endpoints remain active.
- GET commerce/admin/history/:bookingId is a read-only historical payment archive for administrators or staff with the previously stored archive/verification permission. It has no dashboard screen and cannot create or update financial records.
- POST products rejects deposit-configuration fields; service edits preserve stored historical values. Booking updates reject monetary edits.

### Database changes

Applied additive migration 010_resort_operations.sql to the configured local PostgreSQL database. It adds resort name, address, phone, email and operating-hours fields to reservation_settings, plus an index for case-insensitive guest history. New operational fields start blank; no business facts or rules were invented.

Migrations 001–009 were preserved. No payment, booking, claim, proof, transaction, charge, audit or configuration table was dropped. No old financial record or approved allocation was deleted or bulk-converted. Original financial states remain in storage while operational displays use reservation labels.

### Verification

- ESLint: passed without warnings. TypeScript: passed. Production build: passed on Next.js 16.4.6.
- Final BOOKING_BROWSER_TESTS=1 npm test run: **50 passed, 0 failed, 0 skipped**, approximately 120 seconds.
- PostgreSQL checks used isolated randomly named databases, never the resort database for fixtures. Coverage includes guest requests without payment, all categories, combined/idempotent requests, staff permissions, concurrent room approvals, full allocation rollback, maintenance blocks, cancellation, rescheduling and guest ownership.
- Historical payment rows, claims, rate/deposit snapshots and configuration remained unchanged in preservation tests. Retired transaction endpoints rejected writes even for administrators. Outdated provider/ledger/refund happy-path tests were replaced with retirement and preservation regressions; existing reservation, authentication, inventory, integration-failure and content checks were retained.
- Actual Edge browser tests completed submission, staff approval, decline with a saved reason, secure tracking, guest history and a real downloadable one-sheet/16-column workbook. Responsive checks passed at 320, 375, 390, 430, 768 and 1440px. The approval screen uses one native dialog. Desktop and mobile screenshots were visually reviewed.
- Local diagnostic: 10/10 migrations applied; 13 of 14 configured services are inactive pending resort configuration. Resort information/operating hours need configuration. SMTP, staff notification recipients, private-link encryption, worker secret and worker heartbeat are not configured.
- Screenshots and the verified reservation workbook are retained locally under .local/reservation-only-cleanup/. They contain isolated test fixtures only. git diff --check passed. No production deployment or live email delivery was performed.

### Remaining configuration and local use

Genuine accommodations/services still need owner-verified inventory, active offerings, capacities and sessions where not already configured. Populate verified resort information and operating hours in Resort Settings, and review published policies. SMTP, staff recipients, private-link encryption and worker scheduling still need real configuration; no live email delivery is claimed. Basic reservation downloads work without those integrations. No production deployment or real financial transaction was performed.

From C:\projects\Paraiso, run npm run db:check, npm run db:migrate, npm run build, then npm start (or npm run dev during development). Open /booking/ for guests and /admin/dashboard/ for staff. PostgreSQL remains the existing Windows service postgresql-x64-18. The applied migration is safe to rerun through the migration command.

### Files modified in this cleanup

- .env.example
- README.md
- db/migrations/010_resort_operations.sql
- docs/reports/ADMIN-REDESIGN.md
- docs/archive/BOOKING-PAYMENTS.md
- docs/archive/IMPLEMENTATION-HANDOFF.md
- docs/RESERVATION-SYSTEM.md
- package.json
- scripts/booking-admin.ts
- src/app/admin/admin.css
- src/app/api/reservations/[...path]/route.ts
- src/app/booking/confirmation/[reference]/page.tsx
- src/app/booking/reservation.css
- src/components/admin/forms.tsx
- src/components/admin/overview.tsx
- src/components/admin/shell.tsx
- src/components/admin/types.ts
- src/components/booking/booking-tracker.tsx
- src/components/booking/cart-checkout.tsx
- src/components/admin/calendar.tsx
- src/components/admin/dashboard.tsx
- src/components/admin/operations-panels.tsx
- src/components/admin/reservation-drawer.tsx
- src/components/admin/reservation-records.tsx
- src/components/admin/service-fields.tsx
- src/components/admin/service-workspace.tsx
- src/lib/booking/accounts.ts
- src/lib/booking/admin-insights.ts
- src/lib/booking/cart.ts
- src/lib/booking/changes.ts
- src/lib/booking/commerce-api.ts
- src/lib/booking/excel.ts
- src/lib/booking/guest-access.ts
- src/lib/booking/inventory.ts
- src/lib/booking/jobs.ts
- src/lib/booking/maintenance.ts
- src/lib/booking/operations.ts
- src/lib/booking/readiness.ts
- src/lib/booking/reports.ts
- src/lib/booking/request-status.ts
- src/lib/booking/service.ts
- tests/helpers/admin-workspace-browser.ts
- tests/commerce.test.ts
- tests/reservation.test.ts

## Earlier implementation reference

The sections below describe earlier implementations. The reservation-only cleanup above takes precedence.


## Current workflow — 22 November 2026

New website, walk-in and telephone entries use a **reservation request and staff approval** workflow. No online payment, deposit, QR code, wallet selection, payment reference or screenshot is required. Existing financial records, reporting, payment callbacks and permissions remain available for historical bookings only. [BOOKING-PAYMENTS.md](archive/BOOKING-PAYMENTS.md) documents that historical compatibility layer; it does not describe the public flow for new requests.

### Implementation and inventory policy

- Reused the existing combined-service cart, PostgreSQL tables, booking references, Zod validation, private guest sessions, staff dashboard, reports, calendar, rate engine, inventory locks and exclusion constraints.
- Public creation at both POST /api/reservations/commerce/checkout/ and POST /api/reservations/bookings/ uses the same combined request schema and service. The original BookingForm component delegates to the combined form; its API helper is shared in booking-api.ts.
- All new rows have reservation_only=true and workflow_status=PENDING_APPROVAL. The existing status column remains PENDING for compatibility with historical lifecycle queries. CONFIRMED, DECLINED and CANCELLED are synchronized across the existing status and workflow fields. Check-in/out lifecycle is retained.
- New pending requests never allocate inventory and have no hold expiry or required deposit. Approval requires an authorized staff member, a current booking version and a transaction that serializes capacity changes and allocates all selected items together. Conflicts leave the request pending and roll back every partial allocation. Cancellation releases inventory.
- Estimates may be unknown. Staff can approve verified available services without configuring a payment rule, recording money, or pretending an unknown price is zero. The guest sees an informational estimate. Rescheduling preserves this mode and rechecks every service transactionally.
- The staff approval dialog lists services, dates, sessions and guests. Decline requires at least 10 characters, stored in decline_reason and the activity audit. reviewed_by and reviewed_at record the decision. Repeated or stale decisions return a conflict.
- Existing monthly, weekly and daily calendar views, blocks, category filters, internal notes, booking history, secure ownership checks, manual entry and Excel exports are retained. The calendar query now selects explicit item columns so additive schema changes do not break historical entries.
- New tracking hides financial controls and shows the staff response. Historic records retain financial history. Payment claim and gateway creation services reject reservation-only records, and payment balance reminders exclude them. Existing callbacks remain for historical transaction reconciliation.

### Guest form fields

Full name, email and Philippine contact number are required; address and additional Philippine contact number are optional. Select one or more configured services (up to 12 items) across accommodation, swimming/cottages, adventure and dining; add dates, configured sessions, adults/children or participants, and physical units where supported. Each service supports a request note, plus general additional requests. Accommodation checkout must follow check-in. Published terms, cancellation policy and privacy acceptance are required and the published policy version is checked. Unpublished policies and inactive/unconfigured offerings are never fabricated.

The four progress labels are Select services, Select dates, Guest details, and Review and submit. Submission redirects to a private success page, states that the request is awaiting staff approval, and provides Track Reservation and Back to Home actions.

### Database migration

009_reservation_requests.sql is additive and forward-only. It adds the reservation mode, optional address/contact, channel, decline reason, reviewer/time and per-service notes, plus a database constraint prohibiting payment holds for reservation-only rows. Existing rows default to historical mode. No financial table or booking is deleted. Timestamps remain PostgreSQL timestamptz and are displayed in Asia/Manila.

### Notifications and remaining resort configuration

Initial and decision events use the transactional integration job queue. Approval email no longer checks deposits for request-only bookings. Guest messages include service/date/guest details, staff decline responses and a single-use private tracking link when delivery is configured. Administrators see a warning when SMTP/private link configuration is missing. Queued, failed and unconfigured jobs remain distinguishable from delivered jobs.

The configured local database accepted migration 009 (9/9 migrations applied). Its genuine accommodation/activity offerings are currently inactive or lack verified inventory/sessions; the pre-existing active dining option is explicitly labelled TEST ONLY. No sample booking or production offering was inserted by this implementation. Staff must configure genuine room identifiers, capacities, offered pool/cottage/dining services and activity sessions before accepting real guests. Review and publish owner-approved policies. SMTP, staff recipients, the access-link encryption key and worker scheduling are unconfigured locally; live email delivery is not verified. No merchant credentials are needed for new requests.

### Files changed in this implementation

- Database: db/migrations/009_reservation_requests.sql.
- Server: src/lib/booking/{cart,validation,service,commerce-api,payments,guest-access,maintenance,changes,request-status,jobs,excel,admin-insights,readiness,reports}.ts; src/app/api/reservations/[...path]/route.ts.
- Public booking: src/components/booking/{booking-api,booking-form,cart-checkout,booking-tracker,public-services,availability-calendar,login-form}.ts(x); src/app/booking/page.tsx, reservation.css, confirmation/[reference]/page.tsx.
- Staff UI: src/components/booking/{admin-types,admin-forms,admin-overview,admin-shell,dashboard,reservation-drawer,operations-panels,commerce-admin,service-fields}.ts(x); src/app/admin/admin.css. Some files only move the shared API import.
- Public explanatory text: src/data/faq.ts, src/app/contact/page.tsx, src/app/policies/[policy]/page.tsx.
- Tests: tests/{commerce,reservation,content}.test.ts and tests/helpers/admin-workspace-browser.ts. README.md, .env.example and this guide document the current workflow. Pre-existing uncommitted design work was preserved.

### Local verification and use

Run npm run db:migrate, npm run db:check and npm run ops:readiness against the intended local database. Sign in at /admin/login/ to configure policies and verified services. Run npm run build, then npm start (or npm run dev during development). Open /booking/, add one or several services and submit. Open /admin/dashboard/ to review the request, approve or decline it, and revisit its private tracker in the guest browser. Use separate browsers when testing ownership checks.

For regression checks, run npm run lint, npm run typecheck, npm run build, then npm test. To include the actual Edge/Chromium form and staff browser checks, set BOOKING_BROWSER_TESTS=1 before npm test. Tests create isolated, randomly named PostgreSQL clusters under .local and never use the resort database for fixtures.

### Verification — 22 November 2026

- npm run lint: passed without warnings.
- npm run typecheck: passed.
- npm run build: passed on Next.js 16.4.6.
- BOOKING_BROWSER_TESTS=1 npm test: **72 passed, 0 failed, 0 skipped**, approximately 134 seconds in the final run.
- PostgreSQL connection and migration 009: verified against the configured local database; all nine migrations applied.
- New request tests cover accommodation, swimming, adventure, dining, combined approval/decline, no payments or holds, unknown estimates, private tracking, saved staff responses, idempotent retries, restricted staff, cancellation, rescheduling, conflicting approvals and rollback of partial combined allocations.
- Edge completed a guest submission, staff approval, confirmed guest tracking, staff decline and private tracking of the decline reason. The public form and approval dialog were checked at 320, 375, 390, 430, 768 and 1440px. The broader dashboard checks additionally covered 1024px, real calendar/settings/report screens, keyboard dismissal, private notes, payment history compatibility and role restrictions.
- Mobile approval and declined-tracker screenshots were visually inspected. Local screenshots are retained under .local/commerce-tests/ and .local/admin-redesign/verified/; all shown guests and bookings are isolated test fixtures.
- git diff --check: passed. No production deployment, real SMTP delivery or Microsoft authorization was performed. Existing uncommitted work was retained.

## Earlier implementation reference

The remaining setup instructions retain historical context. Where older sections mention deposits or payment-based confirmation, the reservation-only workflow above takes precedence for new requests.

The existing Next.js App Router website now hosts its own booking backend. Its public pages, local photos, self-hosted fonts, gallery and motion system remain in place. No separate Express app is needed. PostgreSQL is the source of truth; Excel and email are asynchronous integrations. The former static-only `out/` deployment is historical and must not be used for the booking application.

## Local setup

Use Node.js 22+ (Node 24 used during development), npm and PostgreSQL 14+ with the `btree_gist` extension available. A managed PostgreSQL service, including Neon, works. Create a dedicated database and restricted runtime database user. Use the provider's TLS connection string with certificate verification; do not disable certificate verification. Give migration credentials permission to create the extension/tables, then use a runtime account with only the required table and sequence privileges.

```powershell
npm ci
Copy-Item .env.example .env.local
# Fill DATABASE_URL and APP_URL in .env.local, privately.
npm run db:migrate
npm run db:seed
npm run dev
```

Migrations are transactional, ordered and checksum-verified. Running them again is safe. Do not edit an applied migration; add a new migration file. Seeding imports only the five existing, verified room names/descriptions/photos: Family Deluxe, Igloo, Wooden & Brick, Standard Cabin and Bunkhouse. It never overwrites configuration and creates no bookings, room counts, prices or capacities. All imported options are initially inactive.

The website builds without database credentials. It cannot accept real reservations until the production database, administrator and verified inventory are configured. An absent database yields an honest empty booking state; a connection outage yields a service error and does not display fabricated inventory.

## First administrator

There is no default password or public registration endpoint. Run the bootstrap command from a trusted server terminal with temporary environment variables. Do not store bootstrap passwords in `.env.example`, shell scripts or Git.

```powershell
$env:ADMIN_EMAIL = 'your-authorized-email'
$env:ADMIN_NAME = 'Your name'
$securePassword = Read-Host 'Administrator password (12–128 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
Remove-Item Env:ADMIN_NAME
```

Sign in at `/admin/login/`. Bootstrap refuses to run when an active administrator already exists. Thereafter use **Accounts** to create staff, reset passwords, enable/disable accounts and assign approval/export permissions. Account changes invalidate existing sessions. The last active administrator cannot be disabled or demoted. Password recovery is an administrator-mediated reset; there is no guest account system.

## Configure verified resort inventory

1. Open **Inventory**, select an imported accommodation, enter verified minimum/maximum guests per unit, and enable requests. Leave price blank until verified. Save.
2. Add every actual room/unit under **Room inventory**, using the resort's real identifiers. Do not add placeholder units. Disabling an allocated unit is rejected.
3. Configure day tours, activities and other packages only when the resort supports them. Set category, uncheck overnight, enter guest capacity per day/time slot, maximum group size, and optional comma-separated time slots. Day capacity counts adults and children together. Day reservations use one group, not room counts.
4. Prices use PHP per unit/group or per person, per night for overnight stays and per visit for day bookings. Add-ons are charged once per reservation. No taxes, child discounts, deposits, cancellation policies or fees are invented. Unknown prices show **Price to be confirmed by resort staff**.
5. Use **Block dates** for maintenance/closures, for a full option or a particular room, and optionally a configured time slot. Start is included; end is excluded. A one-day closure uses the following date as its end. Blocks cannot displace existing active reservations.
6. Configure optional add-ons only with verified names and prices. Disable options instead of deleting records used by bookings.

The public booking page shows a live 31-day availability overview and validates the full selected date range separately. Guests can also choose dates further ahead with the native accessible date inputs. A multi-night stay requires the same rooms to remain available for its entire stay; it does not silently move guests between rooms. The system enforces a technical 90-night request limit; longer stays should be arranged with staff.

Active reservations protect product configuration from changes. Resolve those reservations before altering room capacity, slot definitions, overnight behavior or prices. This deliberately favors existing commitments. Changing a catalog name never rewrites the saved name on a past reservation.

## Daily reservation workflow

- Guests use `/booking/`; existing booking CTAs retain their room/activity context and open this internal page. Submissions create **PENDING** records and a unique reference. Pending requests do not hold inventory or guarantee acceptance.
- A private receipt page at `/booking/confirmation/[reference]/` uses a random HttpOnly receipt cookie valid for 24 hours. A reference alone does not reveal guest details. Guests should save the reference and use the resort's contact details for follow-up.
- The dashboard shows real counts, arrivals/departures in Asia/Manila, today's available room units, upcoming requests, and per-staff unread request counts. Data refreshes every 30 seconds while the page is visible. **Mark notifications read** marks only currently stored notifications.
- Search by guest/reference and filter by status and arrival date. Open a reservation for details, add-ons, allocated rooms, contact/request edits, staff-verified quotes, audit history, payment entries and integration delivery status.
- Permitted transitions: Pending → Confirmed / Declined / Cancelled; Confirmed → Checked in / Cancelled; Checked in → Checked out. Terminal states cannot be reopened. Rebooking uses a new request. Check-in is blocked before the arrival date.
- Approval-authorized staff can confirm, decline or cancel. All authenticated staff can view reservations and manage check-in/out and permitted phone/request edits. Only administrators manage inventory, accounts, integration configuration and manually recorded payments. Refunds cannot exceed the recorded payment balance. Excel export also requires an administrator or explicit staff export permission.
- **Add reservation** records phone, Messenger and walk-in requests in the same system. These also start pending, then use the same approval and capacity rules.
- Status changes require a confirmation dialog. A version number prevents staff from overwriting another person's newer edits. New requests and every status/detail update have audit records. Phone, request-note and quoted-total edits preserve previous and new values in private audit history. Approval-authorized staff can enter a verified reservation total without changing public catalog prices.
- Payment entries record real payments/refunds manually and remain separate from booking approval. The website does not process cards, generate payment instructions or claim a guest has paid. Verify actual payment before recording it.

## Availability and concurrency

All relevant writers lock the accommodation/package row inside a database transaction. Confirmation rechecks current guest capacity, active inventory, closures, slots and confirmed/checked-in occupancy before allocating units. PostgreSQL also has a partial GiST exclusion constraint preventing overlapping active allocations on the same room. Overnight occupancy uses `[check_in, check_out)` date ranges. Confirmed day visits reserve guest capacity for their configured date and slot. Cancellation/check-out releases allocations. Manual and website bookings share these rules.

Reservation dates are PostgreSQL `date` values and remain `YYYY-MM-DD` strings; they are not converted through a browser timezone. Audit/event timestamps are `timestamptz` and displayed in Asia/Manila. Submission UUIDs provide idempotency for network retries. A random receipt secret is hashed in the database; it is not a publicly accessible booking lookup key.

## Downloadable Excel export

**Reservations → Export filtered Excel (.xlsx)** exports the current search/status/arrival-date filters; **Export all Excel** clears them. ExcelJS writes a real workbook with a frozen header, filters, numeric amounts, contact strings and literal guest text. Exports include all required reservation fields and special requests. Staff with export permission can see these fields, so grant that permission only to staff authorized to access guest notes. Export events are audited. Files are private, sent with no-store headers, and are never written to `public/`.

Each export is limited to 10,000 records; use arrival-date filters to divide larger reports. The database is authoritative. Keep downloaded guest files in restricted storage and remove unneeded local copies according to the resort's policy.

## Microsoft Excel Online setup

Microsoft's workbook row APIs require delegated permissions, not application/client-credentials permissions. See the official [add-row permissions](https://learn.microsoft.com/en-us/graph/api/tablerowcollection-add?view=graph-rest-1.0), [update-row API](https://learn.microsoft.com/en-us/graph/api/tablerow-update?view=graph-rest-1.0) and [OAuth authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

1. In Microsoft Entra, register a **single-tenant Web application** owned by the resort. Add the exact redirect URI `https://YOUR_DOMAIN/api/reservations/microsoft/callback/` (including the trailing slash). Use the corresponding localhost URL for development. Set `APP_URL` to that exact origin.
2. Add Microsoft Graph **delegated `Files.ReadWrite`** and **`offline_access`**, and grant consent according to your tenant policy. Do not use application permissions for workbook operations. Create a client secret and set `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` on the server.
3. Generate `INTEGRATION_ENCRYPTION_KEY` using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store the 64 hex characters privately and back it up with access controls. It encrypts refresh tokens using AES-256-GCM. Changing it requires reconnecting Microsoft.
4. Create an `.xlsx` workbook in the resort's **OneDrive for Business or SharePoint document library**. Make a real Excel **table**, e.g. `Reservations`, with exactly these 13 columns in this order:

   `Reference`, `Guest name`, `Email`, `Contact number`, `Category`, `Accommodation or package`, `Check-in`, `Check-out`, `Guests`, `Amount (PHP)`, `Status`, `Created (Asia/Manila)`, `Special requests`.

5. Obtain the drive ID and workbook item ID using Microsoft Graph Explorer while signed in as the resort user: `GET /me/drive` for OneDrive; for SharePoint, `GET /sites/{site-id}/drives`, then `GET /drives/{drive-id}/root/children` or the file's path to find its item ID. The workbook must be editable by the authorizing work/school account. Enter **drive ID**, **workbook item ID** and **table name** in dashboard **Settings** and save.
6. Click **Authorize Microsoft account**, sign in as that resort account and consent. The callback checks a short-lived state cookie and administrator session before storing the refresh token encrypted in PostgreSQL. Tokens and client secrets never go to the booking frontend. No raw token is returned by settings APIs.
7. Configure the worker below. Use **Process a job batch**, then inspect delivery jobs. After configuring services, **Retry failed jobs** makes failed/unconfigured jobs eligible immediately. Saving a destination requeues existing Excel jobs so all bookings are copied to the selected destination.

Each reservation is committed before creating its outbox jobs in the same transaction. Excel jobs scan the table by unique reference before appending and update matching rows on every retry. A PostgreSQL transaction advisory lock permits one workbook writer across all app instances. A timeout after a successful append is recovered by scanning for the reference again. Existing duplicate references cause a visible error instead of creating further duplicates. Header mismatches are rejected. Guest text that could be interpreted as a formula is escaped. Status updates use the current database record.

**Operational limits:** the destination table is a managed mirror. Do not manually sort, insert, delete or edit its rows while jobs run; Graph updates use row indexes and cannot enforce unique references against external writers. Back up the workbook separately and restrict sharing. Microsoft may require renewed consent after account/tenant changes or token revocation; reconnect when authorization errors appear. Requests remain saved if synchronization fails. No live Microsoft delivery is claimed until valid credentials and account authorization have been tested.

## Email setup

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, and credentials `SMTP_USER` / `SMTP_PASSWORD` when required by your provider. Use a verified sending domain/address and configure SPF/DKIM at your provider. Set `STAFF_NOTIFICATION_EMAILS` to a comma-separated list of designated resort recipients. Port 587 uses mandatory STARTTLS; port 465 uses `SMTP_SECURE=true`.

Guest emails describe the reference, selection, dates, status and configured estimate. Pending receipts explicitly say they await confirmation. New requests also queue a staff notification. Status/detail changes queue a guest notification and Excel update. No secrets appear in frontend bundles. If SMTP or recipients are absent, jobs show **NOT_CONFIGURED** and bookings still succeed.

Failed jobs use exponential backoff, capped at six hours, for up to 12 attempts. Unconfigured jobs wait one hour without consuming failure attempts. Staff can inspect per-booking jobs; administrators can retry jobs or process a batch. SMTP delivery has at-least-once semantics: a failure after the mail provider accepted a message can lead to a duplicate email on retry. Stable Message-IDs help providers identify duplicates but are not an exactly-once guarantee.

## Worker and production deployment

The application now needs a Next.js-capable Node host or Vercel; static file hosting alone cannot run booking/authentication/database endpoints. Preserve all current public assets; do not deploy the old `out/` folder. No deployment was performed by this implementation.

```powershell
npm ci
npm run db:migrate
npm run db:seed
npm run lint
npm run typecheck
npm run build
npm start
```

On a Node host, use `npm run build` as build command and `npm start` as start command. Set `PORT` as required by the host. On Vercel, use the Next.js preset and set server environment variables there; run migrations separately from a trusted terminal/deployment step. Set `APP_URL` to the final HTTPS origin and configure the same Microsoft redirect URI. Update `site.url` in `src/config/site.ts`; preserve `allowIndexing: false` until the site is approved.

Use a trusted scheduler **every minute** to execute `npm run jobs:run` on a Node worker, or POST `/api/reservations/worker/` with `Authorization: Bearer YOUR_JOBS_SECRET` from a private scheduler. Generate a random worker secret, store it privately, and configure the scheduler separately. The endpoint deliberately accepts POST only. It does not use a hosting-provider-specific GET cron convention. A batch processes up to 20 jobs sequentially with network timeouts; use a runtime with enough execution duration (up to approximately 7 minutes for a fully stalled batch), or the CLI worker, rather than relying on a short serverless function. The dashboard's manual batch processes at most five jobs. Locks prevent overlapping workers from duplicating writes.

For serverless hosts, use the database provider's pooled connection string for runtime and a direct connection for migrations if required by that provider. Booking and worker locks are transaction-scoped and support transaction pooling. Worker transactions remain open during an individual remote delivery; configure database transaction/network timeouts for the expected workbook size and prefer a dedicated CLI worker for large reports.

Only enable `TRUSTED_IP_HEADER` when your reverse proxy overwrites the chosen header and direct access cannot bypass it. Without this setting, login/booking throttles use a conservative shared application bucket plus per-email limits. Add host/WAF request limits for public calendar endpoints and enforce HTTPS. Secure session cookies are enabled automatically for production; local production browser testing should use HTTPS or a browser that treats loopback as a secure context.

Back up PostgreSQL with point-in-time recovery where available and test restores. Separate production/test databases and Microsoft workbooks. Keep service and database secrets in the host's secret store. Application errors log event/code only, not guest details or tokens. Restrict database access, exports and provider logs to authorized operators. Request/contact data is used for reservations; no analytics or guest login was introduced. The resort must approve a retention period and establish access/correction/deletion handling, including email, Excel exports and backups. Automatic deletion is intentionally disabled because no retention policy was supplied.

## Validation

```powershell
npm run lint
npm run typecheck
npm run build
npm test
# Optional browser checks using installed Edge on Windows:
$env:BOOKING_BROWSER_TESTS='1'
npm test
Remove-Item Env:BOOKING_BROWSER_TESTS
```

Tests create an isolated, randomly named real PostgreSQL cluster under ignored `.local/booking-tests/`; they never use the resort's `DATABASE_URL`. Embedded Postgres auto-restores its packaged runtime links if needed. No system PostgreSQL user is created. The temporary cluster is stopped after testing and retained locally for diagnosis; test data is never seeded into the resort database. The suite starts a production Next.js server on a free loopback port, so build first. Browser checks use installed Edge on Windows; on other platforms install Playwright Chromium with `npx playwright install chromium`.

Coverage includes migrations/seed safety, validation, pending persistence, idempotent retries, concurrent confirmations, database overlap protection, checkout boundaries, cancellation, staff permissions, last-admin protection, manual channels, blocks, day-tour slots, independent payment history, failed/unconfigured integrations, valid XLSX output, simulated Graph deduplication, password hashing, durable rate limits, protected HTTP endpoints, private receipts, reports and existing public pages. Browser checks exercise booking submission, staff login, responsive layouts and keyboard dismissal of the details dialog. Live SMTP/Microsoft delivery requires the resort's credentials and is separate from mocked transport/failure tests.

The old `scripts/legacy/static-audit.test.mjs` and older design reports describe the previous static-export architecture, including assertions that a backend must not exist. They are retained as historical sources; `npm test` now runs the server/content regression suites in `tests/`.

## Changed and created files

### Verification record — 21 November 2026

Verified on Windows with Node.js 24.18.1 and npm 11.16.0. `npm run lint`, `npm run typecheck` and the production build passed. The final `BOOKING_BROWSER_TESTS=1 npm test` run passed **29 tests**, with zero failures or skipped tests, in approximately 44 seconds. It used an isolated real PostgreSQL cluster and a production Next.js server; Edge completed an actual mobile form submission and staff sign-in. Responsive booking layouts passed at 360, 390, 768 and 1440 pixels. The private details dialog was visually reviewed and keyboard-tested; small-screen fields use a single column to keep date controls readable. Existing public pages rendered successfully. `npm audit --omit=dev` reported zero vulnerabilities; the dependency update also cleared the full audit at installation.

Excel export files were reopened with ExcelJS to verify a real XLSX workbook. Graph duplicate recovery was verified with a simulated transport, and missing integration configuration/SMTP connection failures were exercised without losing bookings. **Live SMTP delivery, Microsoft account authorization, live workbook synchronization, a production database and hosting deployment were not tested or activated**, because the resort's credentials/services were not supplied. No production booking data or inventory was fabricated.

### Implementation file list

- `db/migrations/001_booking.sql`, `002_audit_details.sql`, `003_receipt_expiry.sql`: relational schema, constraints, exclusion constraint, indexes, sessions, inventory, reservations, payments, notifications, audit, outbox and server-enforced receipt expiry.
- `scripts/booking-admin.ts`: checksum migrations, safe catalog import, administrator bootstrap and worker command.
- `.env.example`, `package.json`, `package-lock.json`, `next.config.ts`: server configuration, dependencies, scripts and security headers.
- `src/lib/booking/{db,validation,security,pricing,service,inventory,accounts,excel,jobs}.ts`: database layer, validation, sessions, roles, availability transactions, staff management and integrations.
- `src/app/api/reservations/[...path]/route.ts`: validated public/private endpoints, reports, Microsoft OAuth, worker and error handling.
- `src/app/booking/page.tsx`, `reservation.css`, `confirmation/[reference]/page.tsx`: guest booking and private receipt pages using existing branding.
- `src/app/admin/{login,dashboard}/page.tsx`, `src/components/booking/{booking-form,login-form,dashboard,admin-forms}.tsx`: staff sign-in, operations and shared manual booking form.
- `src/config/booking.ts`, `src/components/shared/booking-cta.tsx`, `src/components/layout/footer.tsx`: internal booking links and navigation.
- `src/app/{page,contact/page,robots,sitemap}.tsx`/`.ts`, `src/data/faq.ts`: current booking copy, privacy information and indexing behavior.
- `tests/`: database, HTTP, integration and content/UI regression coverage; this document and README/setup references complete the handoff.

Previously uncommitted design/content work was present at the start and was not reset. Git's total diff includes that earlier work; the list above identifies the booking implementation's scope.
