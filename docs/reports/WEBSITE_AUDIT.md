# Paraiso website audit and missing requirements checklist

**Project:** Paraiso de June Quixote Ecofarm & Resort  
**Audit date:** 21 November 2026, Asia/Manila  
**Workspace:** `C:\projects\Paraiso`  
**Scope:** source, routes, components, styling, assets, SQL, authentication, payments, configuration, scripts, documentation and automated/browser checks. **Audit only: no application fixes or business configuration were applied.**

## A. Executive Summary

The project is a substantial custom resort website with a real PostgreSQL booking backend. It is considerably beyond a frontend demonstration. It has authentic local photography, a coherent forest/cream visual system, responsive layouts, a multi-service reservation cart, per-item deposits, concurrent inventory protection, staff permissions, private payment evidence, gateway verification code, Excel exports and a secure guest tracker. Rebuilding the website would discard useful work.

**Suitable for a supervised client demonstration:** yes, for the public website and, using a separately configured staging environment, the implemented booking workflows. Clearly explain that rates, operational offerings, payment accounts and policies still require owner approval. The current unconfigured website cannot demonstrate a real customer booking from end to end.

**Ready to accept actual customer bookings/payments:** no. No environment file other than `.env.example` was present; the running local catalog returned `configured: false` and no services. There is no evidence of an operating production database, merchant account, notification service, scheduled worker, backup restore or deployed HTTPS host. This explains the disabled availability/add-service button. It is a configuration gate, not proof that the capacity engine is absent.

The audit also found **nine confirmed defects**, including four reproduced with isolated fixture data. The most important are a confirmed booking reverting to pending approval when another payment is recorded, and the legacy payment endpoint accepting the same financial entry twice. These are not fixed by having a successful build or a passing existing test suite.

### Count definitions and audit totals

The totals below count each of the **75 numbered feature/page requirements in section B once**. “Complete” means implemented with source/test/browser evidence; it does not certify production account setup. “Partial” means an implementation exists but has an identified limitation, missing approved content, defect or unverified external dependency. “Missing” means the listed capability/configuration has no completed implementation or evidence in this workspace. Future POS/loyalty/analytics ideas are excluded from these totals. Subtasks and image requests are not counted again.

- Confirmed completed feature/page requirements: **31**.
- Incomplete/partially implemented feature/page requirements: **32**.
- Missing requirements: **12**.
- Confirmed bugs: **9** — four reproduced in isolated data/HTTP probes, five established by the source path.
- Critical/P0 issues: **5** — B01, B03, L01, L02 and L03. This includes launch blockers; it does **not** mean five exploitable security vulnerabilities were found.
- Known dependency vulnerabilities reported by `npm audit`: **0** at audit time. This is an advisory-database result, not a penetration-test certificate.

### Actual technology stack

| Layer | Evidence / installed lockfile version |
|---|---|
| Application | Next.js **16.4.6**, App Router; React and React DOM **19.3.1**. `package.json` permits React `^19.2.0`; the installed lockfile resolves 19.3.1. |
| Language and styling | TypeScript **5.9.3**, Tailwind CSS **4.3.5**, application CSS, self-hosted Fraunces/Manrope, Lucide icons. |
| Server | Node.js Route Handlers in the same Next application; Node **24.18.1**, npm **11.16.0** used for audit. No Express server, Vite app or Supabase implementation. |
| Database | PostgreSQL via `pg` **8.23.1** and parameterized SQL. Seven ordered SQL migrations. No Prisma/ORM is required by this architecture. |
| Validation/authentication | Zod **4.6.7**; Node scrypt password hashing, random session tokens stored as hashes, HttpOnly cookies, backend roles and permissions. |
| Payments | Direct server-side PayMongo Hosted Checkout HTTP integration; separate manual GCash/Maya verification; immutable receipt/refund ledger and deduplication keys for the new flow. |
| Supporting services | ExcelJS **4.4.0**, Nodemailer **10.6.1**, Sharp **0.35.5**, optional Microsoft Graph Excel synchronization. |
| Quality tools | ESLint, TypeScript, Node test runner, real isolated embedded PostgreSQL, Playwright **1.65.1** with headless Edge on Windows. |
| Deployment model | Persistent Next.js Node runtime plus PostgreSQL and a private scheduled worker. Historical static `out/` publishing cannot run the reservation backend. Actual Hostinger account/plan not accessible for verification. |

### Project structure and inspection coverage

The recursive inventory covered **390 relevant files**, including **110 source files**, **7 migrations**, **3 existing test files**, **6 scripts**, **21 Markdown documents**, **15 documentation screenshots** and **215 public files**. Generated TypeScript cache was inventoried but not treated as application source. Dependencies, `.git` internals, `.next`, old `out/`, pre-existing `.local` test data and caches were excluded from the project scan. Package manifests/lock metadata were inspected without recursively auditing dependency source.

```text
C:\projects\Paraiso\
  package.json / package-lock.json       Dependencies and scripts
  next.config.ts / tsconfig.json         Runtime headers and TypeScript
  .env.example                          Names only; no supplied live configuration
  src\app\                            Public, booking, staff and API routes
    accommodations\[slug]\page.tsx     Five generated room-detail routes
    booking\page.tsx                    Unified guest reservation form
    booking\track\page.tsx              Private guest tracker
    booking\confirmation\[reference]\ Legacy private receipt
    admin\login\ / admin\dashboard\   Staff authentication and workspace
    api\reservations\[...path]\        Route Handler/API dispatcher
    globals.css / interactive.css        Public layout and motion
    booking\reservation.css             Booking/staff styles
  src\components\                      Public, gallery, review, booking/staff UI
  src\config\                          Site, media, branding and booking destinations
  src\data\                            Rooms, activities, gallery, promos, reviews, FAQs
  src\lib\booking\                    SQL services, capacity, cart, payments, jobs, reports
  db\migrations\001_...007_...sql      Persistent schema and financial view
  public\images\                       Original resort photos and generated delivery assets
  public\branding\ / public\fonts\  Resort marks and licensed local fonts
  scripts\booking-admin.ts              Migrate/seed/admin/jobs/sandbox/retention-preview CLI
  tests\                               Content, reservations and commerce tests
  docs\                                Current handoff guides and historical design reports
```

Source imports resolve; no missing local TypeScript/component import was found. A source secret-pattern check found no embedded private keys, database credentials or live/test merchant secrets. No historical Git secret scan or external-account inventory was performed.

### Checks executed in this audit

| Check | Outcome and practical limit |
|---|---|
| `npm run lint` | Passed, exit 0; no fixes applied. |
| `npm run typecheck` | Passed, exit 0. TypeScript can update its ignored incremental cache. |
| Production build | Passed with `node node_modules/next/dist/bin/next build` in a disposable source copy, preserving original application/assets. This deliberately bypassed `prebuild`, which writes generated image files. Next warned about the copied nested lockfile/root; the production compilation, types and routes completed. |
| Existing suite | `BOOKING_BROWSER_TESTS=1 npm test` in the disposable copy: **48 passed, 0 failed, 0 skipped**, approximately 311 seconds under audit load. Original test files were unchanged. |
| Extra reproduction probes | Disposable fixtures confirmed B01, B02, B03 and B09. These observations are separate from the 48-test correctness result. No resort database, guest record or real money was used. |
| Dependency advisory inspection | `npm audit --json`: 0 reported vulnerabilities, 599 dependencies in its metadata. No dependency upgrades or audit fixes were run. |
| Routes/links | 19 public/guest/login routes returned 200; 42 discovered internal links returned successful responses. Expected absent routes and authorization gates were checked separately. No broken internal navigation link was found in this crawl. |
| Responsive browser audit | 66 checks: 11 representative pages at **320, 375, 430, 768, 1024 and 1440px**. No document-level horizontal overflow. Existing suite additionally checks booking at 360/390/768/1440px and staff/guest flows at 390px. |
| Interactions | Mobile menu opens/closes with Escape and returns focus; gallery opens, steps and closes with keyboard; FAQ search responds; unavailable booking has visible guidance; normal motion leaves text visible. No page exceptions were recorded in the public audit. |
| Assets | Catalog/variant files resolved. Loaded public local image URLs returned successfully. Homepage images loaded after scrolling. Off-screen lazy-image placeholders in an immediate full-page capture were not counted as broken images. |
| Authorization | Unauthenticated dashboard redirects to login; accounts, claims and private tracker endpoints return 401; `.env` URL returns 404. Existing suite checks permitted/forbidden staff and private upload access. |
| External services | Actual PayMongo sandbox/live, real wallets/refunds, SMTP delivery, Microsoft OAuth/workbook writes, production TLS/DNS, Hostinger plan, backups and restore were **not verified**. |

The existing test runner emits a synchronous-termination notice because it uses `--test-force-exit`. Both correctness suites reported successful completion and stop their test databases; the notice does not establish graceful production shutdown behavior. It is a testing-maintainability follow-up, not an application failure.

## B. Website Completion Checklist

Priority uses **High / Medium / Low**, with the delivery stage in parentheses. These rows are the counting register for the summary. “Missing” does not automatically require a new standalone route if an approved, discoverable section can meet the requirement.

| Feature / Page | Status | File Location | Issue / Missing Requirement | Priority |
|---|---|---|---|---|
| F01 Homepage | Complete | [page.tsx](C:/projects/Paraiso/src/app/page.tsx) | Real hero, sections, internal CTAs, reviews/location; route and responsive checks pass. Current offers intentionally empty. | Low |
| F02 About the resort | Partial | [about/page.tsx](C:/projects/Paraiso/src/app/about/page.tsx) | Working editorial page; owner-approved history, positioning and differentiating facts are not supplied. | Medium (P1) |
| F03 Accommodation listing | Partial | [accommodations.ts](C:/projects/Paraiso/src/data/accommodations.ts) | Five real named options and images; verified rates, capacity and amenities absent from public facts. | High (P1) |
| F04 Room details | Partial | [detail page](C:/projects/Paraiso/src/app/accommodations/[slug]/page.tsx) | All five routes work; beds/bathrooms/air-conditioning/inclusions/house rules require approval. | High (P1) |
| F05 Swimming page | Partial | [pool-cottages/page.tsx](C:/projects/Paraiso/src/app/pool-cottages/page.tsx) | Real photos; pool/cottage offers, rates, sessions and rules absent; stale availability sentence, B06. | High (P1) |
| F06 Adventures | Partial | [adventures.ts](C:/projects/Paraiso/src/data/adventures.ts) | Eight inquiry topics have `confirmed: false`; actual operation, schedules, age/weight/safety and rates unknown. | High (P1) |
| F07 Dining | Partial | [dining/page.tsx](C:/projects/Paraiso/src/app/dining/page.tsx) | Real dining photos and CTAs; no approved menu, service hours, seating or dining packages. | High (P1) |
| F08 Amenities/facilities content | Missing | [about page](C:/projects/Paraiso/src/app/about/page.tsx) | No dedicated amenities route or complete verified facilities section. Add a section first if sufficient; do not invent facilities. | Medium (P1) |
| F09 Gallery | Complete | [resort-gallery.tsx](C:/projects/Paraiso/src/components/gallery/resort-gallery.tsx) | 36 catalog entries, filters, incremental loading and accessible viewer implemented; tested controls work. | Low |
| F10 Promotions/offers | Partial | [promotions.ts](C:/projects/Paraiso/src/data/promotions.ts) | Three supplied posters are all expired as of audit date. Empty current-offers state is correct; new approved offer content is optional. | Medium (P2) |
| F11 Guest reviews | Complete | [reviews.ts](C:/projects/Paraiso/src/data/reviews.ts) | Three approved entries, original links, filtering/display and Google actions; permission and authenticity need owner records. No live feed is claimed. | Low |
| F12 Contact | Complete | [contact/page.tsx](C:/projects/Paraiso/src/app/contact/page.tsx) | Telephone/email/social links and guest-controlled inquiry draft work by design. It is not a server-delivered contact form. | Low |
| F13 Location/directions | Complete | [resort-location.tsx](C:/projects/Paraiso/src/components/shared/resort-location.tsx) | Address, embed, Maps and directions configured. External Google behavior and current directions require manual owner confirmation. | Low |
| F14 FAQ | Partial | [faq.ts](C:/projects/Paraiso/src/data/faq.ts) | Search works; location, hours and inventory-hold wording disagree with current site/configuration, B06. | Medium (P1) |
| F15 Booking page/current availability access | Partial | [cart-checkout.tsx](C:/projects/Paraiso/src/components/booking/cart-checkout.tsx) | UI works and explains disabled button, but current catalog is unconfigured and no live bookable services can be selected. | High (P0/L01) |
| F16 Booking confirmation | Partial | [legacy receipt](C:/projects/Paraiso/src/app/booking/confirmation/[reference]/page.tsx) | Private legacy receipt works; new bookings use tracker. Legacy payment wording is stale, B06; avoid creating a duplicate confirmation system. | Medium (P1) |
| F17 Private guest tracker | Complete | [booking-tracker.tsx](C:/projects/Paraiso/src/components/booking/booking-tracker.tsx) | Ownership cookie, amounts, statuses and claim/transaction history implemented and browser-tested. | Low |
| F18 Privacy policy content | Partial | [contact privacy section](C:/projects/Paraiso/src/app/contact/page.tsx:140) | Existing notice covers data/services; approved controller/contact, retention and full operating policy are missing. Standalone route absent. | High (P1) |
| F19 Terms and conditions | Partial | [commerce-config.ts](C:/projects/Paraiso/src/lib/booking/commerce-config.ts) | Editable policy text, checkout disclosure/acceptance and snapshot exist; no resort-approved terms supplied. | High (P1) |
| F20 Cancellation/refund policy | Partial | [cart.ts](C:/projects/Paraiso/src/lib/booking/cart.ts) | Editable acknowledgement/snapshot exist; policy content and applicable refund rules are not supplied. | High (P1) |
| F21 Unified multi-service cart | Complete | [cart.ts](C:/projects/Paraiso/src/lib/booking/cart.ts) | Four core categories, item dates, quantities and single checkout tested. | Low |
| F22 Dates and guest counts | Partial | [cart.ts](C:/projects/Paraiso/src/lib/booking/cart.ts:277) | Per-item validation works; booking-level adult/child aggregation is incorrect for mixed groups, B02. | High (P1) |
| F23 Server price calculations | Complete | [money.ts](C:/projects/Paraiso/src/lib/booking/money.ts) | Integer centavos, authoritative item prices and conservative null handling verified. No invented prices/discounts. | Low |
| F24 Configured add-ons/preorders | Complete | [cart.ts](C:/projects/Paraiso/src/lib/booking/cart.ts:115) | Active optional items and immutable snapshots; tests cover configured meal charges. No restaurant ordering/POS is implied. | Low |
| F25 References/idempotent booking submission | Complete | [cart.ts](C:/projects/Paraiso/src/lib/booking/cart.ts:249) | Backend annual counter and request key; concurrent references and retries protected. | Low |
| F26 Backend conflict prevention | Complete | [capacity.ts](C:/projects/Paraiso/src/lib/booking/capacity.ts) | Shared advisory transaction lock, real room allocation, exclusion constraint and final recheck; concurrency tests pass. | Low |
| F27 Holds, expiry and release | Complete | [capacity.ts](C:/projects/Paraiso/src/lib/booking/capacity.ts:78) | Configured deposit holds, cancellation/expiry release and late-payment reconciliation tested. Worker deployment is separate F63. | Low |
| F28 Shared/private resources and equipment | Complete | [capacity.ts](C:/projects/Paraiso/src/lib/booking/capacity.ts:105) | Pool exclusive/shared overlap and peak concurrent equipment/guest capacity enforced. Actual resource counts still require owner input. | Low |
| F29 Maintenance/manual channels | Complete | [inventory.ts](C:/projects/Paraiso/src/lib/booking/inventory.ts) | Room/service blocks and walk-in bookings share backend inventory rules. External telephone bookings must be entered by staff. | Low |
| F30 Per-item downpayments | Complete | [money.ts](C:/projects/Paraiso/src/lib/booking/money.ts:22) | Percentage/fixed/full/no deposit; no arbitrary 30% default; mixed-deposit tests pass. | Low |
| F31 Automated gateway | Partial | [payments.ts](C:/projects/Paraiso/src/lib/booking/payments.ts:433) | Signed events, authenticated retrieval, amount/currency/association checks and dedupe implemented; actual merchant sandbox not performed. | High (P0/L02) |
| F32 Manual GCash/Maya | Partial | [payments.ts](C:/projects/Paraiso/src/lib/booking/payments.ts:53) | Claims and independent review implemented; actual authorized receiving details and real staff procedure not supplied/verified. | High (P0/L02) |
| F33 Private payment uploads | Complete | [payments.ts](C:/projects/Paraiso/src/lib/booking/payments.ts:16) | Limited PNG/JPEG decode/reencode, private DB storage and authenticated image routes tested. | Low |
| F34 Separate booking/payment states | Partial | [payments.ts](C:/projects/Paraiso/src/lib/booking/payments.ts:165) | Most states implemented; later receipts can regress approval state, B01. | High (P0) |
| F35 Duplicate payment protection | Partial | [Route Handler](C:/projects/Paraiso/src/app/api/reservations/[...path]/route.ts:294) | New ledger/provider/manual claims protected; legacy endpoint credits repeated requests, B03. | High (P0) |
| F36 Actual completed refund recording | Complete | [payments.ts](C:/projects/Paraiso/src/lib/booking/payments.ts:319) | Administrator-only, bounded/idempotent ledger entries. Refund initiation remains external by design. | Low |
| F37 Balances and payment history | Partial | [reports.ts](C:/projects/Paraiso/src/lib/booking/reports.ts) | Verified net/balance calculations exist; gateway dates/report categorization need corrections B04/B08. | High (P1) |
| F38 Formal printable payment receipt/invoice | Missing | [tracker](C:/projects/Paraiso/src/components/booking/booking-tracker.tsx) | Tracker/history and notification emails exist; no dedicated printable/downloadable official receipt/invoice workflow. Confirm exact accounting scope with owner. | Medium (P1) |
| F39 Staff login | Complete | [security.ts](C:/projects/Paraiso/src/lib/booking/security.ts) | Password hash, cookie session, expiry/logout and administrator bootstrap; login/denial tested on isolated DB. | Low |
| F40 Backend roles/permissions | Complete | [accounts.ts](C:/projects/Paraiso/src/lib/booking/accounts.ts) | ADMIN/STAFF plus approval/export/payment permissions; last-admin protection and session invalidation implemented. | Low |
| F41 Dashboard metrics | Partial | [commerce-api.ts](C:/projects/Paraiso/src/lib/booking/commerce-api.ts:286) | Actual SQL metrics, details and search exist; “active balances” also includes completed bookings, B05. | Medium (P1) |
| F42 Approval, decline/cancel and edits | Partial | [service.ts](C:/projects/Paraiso/src/lib/booking/service.ts:176) | Backend rechecks/versioning and cancellation exist; mixed status/detail PATCH silently loses details, B09. | Medium (P1) |
| F43 Rescheduling | Missing | [service.ts](C:/projects/Paraiso/src/lib/booking/service.ts:148) | No transactional date/time/item reschedule endpoint/UI. Current workaround is cancellation and new request; paid amounts need explicit reconciliation. | High (P1) |
| F44 Check-in/check-out | Complete | [service.ts](C:/projects/Paraiso/src/lib/booking/service.ts:185) | Authorized guest lifecycle and allocation release tested. Clarify policies for combined stays/activities. | Low |
| F45 Reservation/financial XLSX | Partial | [reports.ts](C:/projects/Paraiso/src/lib/booking/reports.ts:67) | Real formatted workbook and date/category/status filters; counts, payment timestamps and combined-category presentation need fixes. CSV is not implemented; XLSX meets the “Excel or CSV” requirement. | High (P1) |
| F46 Staff calendar | Complete | [commerce-admin.tsx](C:/projects/Paraiso/src/components/admin/calendar.tsx:561) | Month/week/day, category filters, pending/confirmed/blocked records and opening details; tested UI. | Low |
| F47 Audit history | Complete | [001_booking.sql](C:/projects/Paraiso/db/migrations/001_booking.sql:47) | Important booking/payment/account actions persist audit entries. Database-admin tamper-proof logging is not claimed. | Low |
| F48 Guest/staff notification delivery | Partial | [jobs.ts](C:/projects/Paraiso/src/lib/booking/jobs.ts:103) | Transactional jobs and failures/retries tested; SMTP credentials, sender DNS and actual mailbox delivery unverified. | High (P1) |
| F49 Returning-guest email access | Partial | [guest-access.ts](C:/projects/Paraiso/src/lib/booking/guest-access.ts:29) | One-time encrypted links and token consumption tested; SMTP/encryption/origin settings absent in current workspace. | High (P1) |
| F50 Upcoming reminders | Partial | [maintenance.ts](C:/projects/Paraiso/src/lib/booking/maintenance.ts) | Configurable job generation exists; real scheduling and delivery not established. | Medium (P1) |
| F51 Database models/relationships | Complete | [migrations](C:/projects/Paraiso/db/migrations/004_checkout_and_payments.sql) | 28 application tables across migrations, plus migration bookkeeping and financial view; real isolated SQL tests pass. | Low |
| F52 Repeatable migrations/real catalog seed | Complete | [booking-admin.ts](C:/projects/Paraiso/scripts/booking-admin.ts) | Ordered/checksummed migrations; verified names/photos imported inactive, with no invented inventory/rates. | Low |
| F53 Connected production/staging database | Missing | [db.ts](C:/projects/Paraiso/src/lib/booking/db.ts:5) | `DATABASE_URL` absent; no supplied deployment database/account/real inventory evidence. | High (P0/L01) |
| F54 Server validation/error responses | Complete | [validation.ts](C:/projects/Paraiso/src/lib/booking/validation.ts) | Zod, bounded bodies, parameterized SQL and sanitized API errors; tests cover malicious/invalid forms. | Low |
| F55 Password/session/token security | Complete | [security.ts](C:/projects/Paraiso/src/lib/booking/security.ts:19) | Salted scrypt, random tokens, hashed sessions, production Secure/HttpOnly cookies and expiry. No live proxy/TLS verification. | Low |
| F56 CSRF and abuse limits | Complete | [security.ts](C:/projects/Paraiso/src/lib/booking/security.ts:69) | Same-origin mutations, separate signed webhook authentication, persistent rate limits and honeypot. Proxy trust must be configured correctly. | Low |
| F57 Security headers/deployment hardening | Partial | [next.config.ts](C:/projects/Paraiso/next.config.ts) | Frame/nosniff/referrer/permissions headers exist. No CSP configured; HTTPS/HSTS and production proxy settings unverified. | Medium (P1/P2) |
| F58 Dependency advisory check | Complete | [package-lock.json](C:/projects/Paraiso/package-lock.json) | Current `npm audit` reports zero known advisories. Repeat at deployment; do not infer permanent safety. | Low |
| F59 Source/environment secret handling | Complete | [.env.example](C:/projects/Paraiso/.env.example) | Server-only names, ignored env files and no source-secret pattern matches. External secret management remains launch work. | Low |
| F60 Error observability | Partial | [API error handler](C:/projects/Paraiso/src/app/api/reservations/[...path]/route.ts) | Sanitized structured error code and job failure state exist; no proven alerting, trace/request IDs or end-to-end monitoring. | Medium (P1) |
| F61 Backup/restore implementation evidence | Missing | [handoff guide](C:/projects/Paraiso/docs/archive/BOOKING-PAYMENTS.md) | Procedure documented; no backup schedule, retention, restore result or recovery-time evidence supplied. | High (P1/L03) |
| F62 Operational alerts | Missing | [jobs.ts](C:/projects/Paraiso/src/lib/booking/jobs.ts) | No deployed uptime/failed-webhook/job-backlog/DB alerting configuration or delivery proof. | High (P1) |
| F63 Deployed private worker schedule | Missing | [maintenance.ts](C:/projects/Paraiso/src/lib/booking/maintenance.ts) | CLI/private endpoint exists, but no minute-level scheduler or `JOBS_SECRET` configuration is present. | High (P0/L03) |
| F64 Domain/HTTPS/Node hosting | Missing | [next.config.ts](C:/projects/Paraiso/next.config.ts) | No verified production origin, DNS/certificate or accessible Hostinger plan/runtime configuration. | High (P0/L03) |
| F65 Titles/canonical/indexing/sitemap | Partial | [site.ts](C:/projects/Paraiso/src/config/site.ts:12) | Titles/descriptions exist. `url: null`, `allowIndexing: false`; canonical absent, sitemap empty and robots blocks all, intentionally prelaunch. | High (P1) |
| F66 Local-business structured data | Missing | [layout.tsx](C:/projects/Paraiso/src/app/layout.tsx) | No JSON-LD emitted in inspected routes. Add only owner-verified business facts. | Medium (P2) |
| F67 Social-share image | Missing | [metadata.ts](C:/projects/Paraiso/src/lib/metadata.ts) | Open Graph text exists; no `og:image` in inspected pages or configured share-image asset. | Medium (P2) |
| F68 Performance readiness | Partial | [responsive-image.tsx](C:/projects/Paraiso/src/components/responsive-image.tsx) | Responsive WebP/lazy loading work; some delivery photos are large, booking images bypass variant helper, and no field CWV/load test is available. | Medium (P2) |
| F69 Responsive layouts | Complete | [globals.css](C:/projects/Paraiso/src/app/globals.css) | 66 requested-width checks without horizontal overflow; existing mobile staff/browser tests pass. Not a guarantee for every device. | Low |
| F70 Accessibility | Partial | [header.tsx](C:/projects/Paraiso/src/components/layout/header.tsx) | Skip link, labels, modal focus/keyboard and reduced motion present; B07 alt copy incorrect; full contrast/screen-reader/zoom review outstanding. | Medium (P2) |
| F71 Automated test infrastructure | Complete | [tests](C:/projects/Paraiso/tests/commerce.test.ts) | Existing 48 tests pass on real isolated SQL and browsers. Add regressions for the nine findings; passing current tests does not cover them. | Low |
| F72 CI release checks | Missing | [package.json](C:/projects/Paraiso/package.json) | Commands exist; no CI workflow in repository. Establish repeatable build/test/advisory checks before release automation. | Medium (P2) |
| F73 Documentation/handoff | Partial | [BOOKING-PAYMENTS.md](C:/projects/Paraiso/docs/archive/BOOKING-PAYMENTS.md) | Substantial current guide exists; historical static reports and old scripts can confuse deployment. Add a clear authoritative index and reconcile current copy. | Medium (P2) |
| F74 Self-service staff recovery/MFA | Missing | [accounts.ts](C:/projects/Paraiso/src/lib/booking/accounts.ts) | No self-service forgot-password flow or MFA; administrator account management exists. Define a secure recovery procedure; UI/MFA enhancements depend on owner scope. | Medium (P2/P3) |
| F75 Public/booking catalog synchronization | Partial | [accommodations.ts](C:/projects/Paraiso/src/data/accommodations.ts) | Public TS room facts and DB offerings are separate sources. An admin rate change does not update public room facts. Define ownership/sync to prevent drift. | Medium (P1) |

## C. Missing Files and Content

### Required capabilities versus proposed filenames

These are implementation suggestions, not changes made by the audit. Existing modules should be extended where practical; absence of a conventional filename alone is not a defect.

| Proposed path / existing module | Required or optional | Purpose and reason |
|---|---|---|
| Private deployment environment, or `C:\projects\Paraiso\.env.local` for local development | Required configuration | Set actual database/origin/encryption/service credentials outside Git. `.env.example` is not loaded as live configuration. |
| Extend `C:\projects\Paraiso\src\lib\booking\payments.ts` and existing tests | Required fix | Preserve approved/check-in state on later receipts; regression B01. Do not introduce a second payment system. |
| Extend `C:\projects\Paraiso\src\app\api\reservations\[...path]\route.ts` | Required fix | Route legacy financial writes through the idempotent ledger or safely deprecate them, B03. |
| Extend `C:\projects\Paraiso\src\lib\booking\service.ts` and staff booking UI | Required workflow | Add transactional rescheduling with availability recheck, price/deposit reconciliation, authorization and audit, if rescheduling remains in launch scope. |
| `C:\projects\Paraiso\src\app\privacy\page.tsx` | Required approved content; route optional | Make a full approved privacy notice easy to find. Expanding `/contact/#privacy` can meet this without another route. |
| `C:\projects\Paraiso\src\app\terms\page.tsx` | Required approved content; route optional | Publish consistent terms from the existing configured policy source; avoid separate conflicting copies. |
| `C:\projects\Paraiso\src\app\cancellation-policy\page.tsx` | Required approved content; route optional | Stable cancellation/refund disclosure. Existing checkout text can be reused after owner approval. |
| About-page facilities section, or `C:\projects\Paraiso\src\app\amenities\page.tsx` | Required content; separate route optional | Publish verified parking, accessibility, pool/dining/shared facilities, restrictions and photographs. |
| `C:\projects\Paraiso\src\app\booking\receipt\[reference]\page.tsx` | Scope-dependent launch requirement | Printable authorized financial receipt if required; use the same ownership checks and verified ledger. Determine formal tax/accounting requirements with owner; do not call an ordinary page an official fiscal invoice. |
| `C:\projects\Paraiso\public\images\branding\paraiso-social-share.webp` and metadata wiring | Quality improvement | Approved 1200×630 social preview, currently absent. |
| Existing layout/metadata helper for JSON-LD | Quality improvement | Verified business name/address/contact/URL, without fabricated ratings or unapproved prices. A new metadata module is not necessary. |
| Host-specific Node service/scheduler settings; optionally a reviewed deployment manifest | Required operations; manifest optional | Reproducible Node runtime, HTTPS, secrets, worker and DB connectivity. Do not add Docker/Render/Vercel configuration until hosting is chosen. |
| `C:\projects\Paraiso\docs\OPERATIONS-RUNBOOK.md` | Required procedure; file optional | Recovery owner, backup/restore evidence, monitoring, payment reconciliation and incident contacts; existing guide can instead be expanded. |
| `C:\projects\Paraiso\.github\workflows\quality.yml` | Optional delivery improvement | Automated lint/types/build/tests/advisory inspection if GitHub is the chosen CI platform. Do not assume a remote repository/service. |

No missing ORM schema, duplicate auth provider, separate backend app or Supabase RLS file is required. This app uses server-only SQL access with backend permissions; database roles/TLS still need deployment verification. There is no evidence of missing migration dependencies: all seven apply successfully in isolated databases.

### Photo and asset audit

- **206 raster assets plus 2 brand SVGs**, approximately **101.38 MiB** total for those image assets.
- **44 catalog source photographs**, **155 generated optimized files**, **4 cinematic delivery files** and **3 supplied promotion posters**. The public gallery enumerates 36 entries; the separate accommodation catalog has eight source entries. Dynamic gallery enumeration means a catalog ID absent from literal JSX is not proof of an unused photo.
- Catalog and generated srcset references resolve. No confirmed missing referenced local photo was found. Both SVG marks are imported by the branding module; literal-string searching alone incorrectly labels them unused.
- **22 source images exceed 1 MiB**. Examples: `public/images/adventures/Tropical ATV Adventure Trail.png` ≈3.90 MiB, `ZipBike.png` ≈3.82 MiB, `public/images/swimming/Tropical Garden Pool Retreat.png` ≈3.79 MiB, `public/images/hero/paraiso.png` ≈3.68 MiB. Original downloads/viewer intentionally preserve quality; do not mistake source size for every card's transfer size.
- Some generated delivery files remain heavy: desktop hero 874,700 bytes; private-cabin portrait 851,846; hanging-bridge 746,666; zipline-platform 741,692; ATV-trail 732,306. These are tuning candidates, not broken files. Validate composition/quality before lowering dimensions or compression.
- Four exact-duplicate hash groups were found: `public/images/accommodations/bunkhouse.webp` equals `bunk_room_professionally_aligned_full.webp`, and their `bunkhouseInterior-*`/`bunkRoom-*` generated 160/480/960 variants match. They are catalog aliases with intentional references, not evidence that originals should be deleted.
- All three portrait posters have suitable portrait dimensions: 998×1576, 1024×1536 and 1086×1448. Do not force poster information into landscape cover crops.
- Source filenames include spaces, mixed case and underscores. Existing references work; future filenames should use consistent lowercase kebab case. A rename is not required for launch and must update catalog entries/tests if ever performed.
- `CartCheckout` uses unoptimized Next Image URLs for configured product photographs. An administrator entering a large original PNG can deliver that original rather than the existing responsive variants. Reuse the established image helper or constrain delivery-path selection as a performance improvement.
- Standard Cabin and Bunkhouse have one supplied detail photo each; Family Deluxe, Igloo and Wooden & Brick have two each. One-photo layouts are supported, but they cannot show a complete room assessment.
- No proven unused photo collection was found. Expired posters are currently unpublished but intentionally retained. Unreferenced code candidates are listed later; no assets were deleted.

### Client photo request list

Dimensions are **recommended source/delivery targets**, not claims about missing resort facilities. Request only facilities the owner confirms exist. Keep unedited originals and written usage permission separately.

| Recommended filename / directory under `public/images/` | Target dimensions | Intended use / requested description | Need |
|---|---|---|---|
| `accommodations/standard-cabin-exterior.webp` | 1600×1067 | Actual exterior/entrance corresponding to the named Standard Cabin. | High |
| `accommodations/bunkhouse-exterior.webp` | 1600×1067 | Actual Bunkhouse exterior/access, not an inferred cabin photo. | High |
| `accommodations/family-deluxe-bathroom.webp` | 1200×1600 | Owner-confirmed bathroom and whether private/shared. | High |
| `accommodations/igloo-bathroom.webp` | 1200×1600 | Corresponding facilities, with correct room mapping. | High |
| `accommodations/wooden-brick-bathroom.webp` | 1200×1600 | Bathroom/access details for Wooden & Brick. | High |
| `accommodations/standard-cabin-bathroom.webp` | 1200×1600 | Corresponding bathroom, confirmed by owner. | High |
| `accommodations/bunkhouse-washroom.webp` | 1200×1600 | Actual shared/private washroom arrangement, accurately described. | High |
| `accommodations/ROOM-NAME-bed-layout.webp` | 1600×1067 | Wider interior showing real bed count/layout for each of the five named options. | High |
| `swimming/pool-name-overview.webp` | 1920×1080 | Clearly identified pool corresponding to a configured booking service. Current generic pool photos can be reused once mapped. | High mapping; extra shoot conditional |
| `swimming/pool-name-safety-signage.webp` | 1600×1200 | Legible actual depth/rules/opening signage, if present. | High |
| `swimming/cottage-name-seating.webp` | 1600×1067 | Actual cottage/table/seating layout linked to a verified name/capacity. | High if offered |
| `adventures/activity-name-equipment.webp` | 1600×1067 | Current operating equipment, briefing/loading area and safety setup for each enabled activity. Existing attraction images do not establish current operation. | High if bookable |
| `dining/current-menu-YYYY-MM.webp` | 1600×2200 or accessible text | Owner-approved current menu, prices, allergens and validity date. Prefer real text for accessibility/search. | High |
| `dining/signature-dish-name.webp` | 1600×1067 | Actual dishes included in advertised/preorder offerings, not stock food. | Medium |
| `dining/seating-area-name.webp` | 1600×1067 | Real table arrangement/seating zone matching configured capacity. Existing pavilion/hall photos may suffice. | Medium |
| `amenities/entrance-parking.webp` | 1600×1067 | Entrance and parking only if confirmed; arrival guidance. | Medium |
| `amenities/access-route.webp` | 1600×1067 | Actual step-free or stepped access to rooms/facilities, accurately labeled. | High accessibility information |
| `amenities/facility-name.webp` | 1600×1067 | Owner-confirmed changing room, shower, restroom, gathering area or other real facility. | Medium |
| `about/resort-team-or-grounds.webp` | 1920×1280 | Consented staff/team/host or distinctive grounds photo to support authentic About content. | Optional |
| `promotions/approved-offer-YYYY-MM.webp` | 1200×1600 | Current approved poster with actual validity/inclusions/terms; existing posters must not be redated without authorization. | Optional marketing |
| `branding/paraiso-social-share.webp` | 1200×630 | Approved logo/real-resort photo composition for shared links. | Medium |

Receiving-account QR images must be genuine, privately configured through the dashboard. **Do not put payment QR evidence or guest screenshots in `public/images/`.**

## D. Bugs and Broken Functionality

### Confirmed defects

| ID / severity | Exact evidence / cause | Effect and recommended correction |
|---|---|---|
| **B01 — High, P0: later payment regresses confirmed booking** | [payments.ts:191](C:/projects/Paraiso/src/lib/booking/payments.ts:191), called by [payments.ts:415](C:/projects/Paraiso/src/lib/booking/payments.ts:415). `paymentApplied()` unconditionally changes a paid-enough nonterminal booking to `PENDING_APPROVAL`. Isolated reproduction: ₱4,000 test reservation, ₱1,200 verified deposit, staff confirmation, then ₱2,800 receipt. Before: workflow/status `CONFIRMED/CONFIRMED`; after: `PENDING_APPROVAL/CONFIRMED`, payment `PAID`, balance zero. | Guest tracker and staff legacy status disagree after final collection; automatic confirmation may also interfere with check-in state. Preserve CONFIRMED/CHECKED_IN state on additional receipts, keep financial updates independent, and test manual/automatic approval plus final balance collection. |
| **B02 — Medium, P1: artificial combined guest count** | [cart.ts:277](C:/projects/Paraiso/src/lib/booking/cart.ts:277) takes maximum adults and maximum children independently; [reports.ts:127](C:/projects/Paraiso/src/lib/booking/reports.ts:127) adds them. Reproduction: item A has 5 adults/0 children, item B 1 adult/5 children; parent becomes 5 adults/5 children = 10, although groups are 5 and 6. | Reports/emails imply a nonexistent combined party. Define whether the parent represents a named shared party, peak participants or per-service counts; retain item-level counts, label them clearly and stop constructing a synthetic total. Do not sum service participants as unique guests without identities. |
| **B03 — High, P0: duplicate credit on legacy payment retry** | [Route Handler:294](C:/projects/Paraiso/src/app/api/reservations/[...path]/route.ts:294), direct [INSERT at 329](C:/projects/Paraiso/src/app/api/reservations/[...path]/route.ts:329). The legacy endpoint has no request key or transaction-reference dedupe. Isolated HTTP reproduction: identical authorized POST of a ₱100 payment twice returns `[200,200]`, writes **2 rows totaling ₱200**. | A retry/double click can overstate actual receipts for legacy bookings. Use the new idempotent ledger for existing records too, or retire the route/UI after a safe compatibility plan. This defect does not negate the new gateway/manual-claim dedupe controls. |
| **B04 — Medium, P1: gateway reports processing time as receipt time** | [payments.ts:792](C:/projects/Paraiso/src/lib/booking/payments.ts:792) omits `received_at`; its [migration default](C:/projects/Paraiso/db/migrations/004_checkout_and_payments.sql) is `now()`. [reports.ts:142](C:/projects/Paraiso/src/lib/booking/reports.ts:142) filters actual financial dates by that value. Source-confirmed; real merchant event delivery was not available to replay. | Delayed webhook/reconciliation across Manila midnight puts money in the processing day rather than the actual provider transaction day. Validate/store the provider's authoritative payment time and separately retain ingestion/verification timestamps; test cross-day delayed events. |
| **B05 — Medium, P1: “active balances” includes completed bookings** | [commerce-api.ts:289](C:/projects/Paraiso/src/lib/booking/commerce-api.ts:289) excludes only CANCELLED/DECLINED, while [commerce-admin.tsx:1025](C:/projects/Paraiso/src/components/admin/calendar.tsx:1025) labels the result “Outstanding active balances.” CHECKED_OUT/COMPLETED is included. Source-confirmed. | Staff may misunderstand the metric. Define active versus all receivables; either filter completed records or rename/split the metric while retaining legitimate unpaid completed balances. |
| **B06 — Medium, P1: contradictory operational copy** | [pool page:92](C:/projects/Paraiso/src/app/pool-cottages/page.tsx:92) says the website does not show live pool availability; [FAQ:42](C:/projects/Paraiso/src/data/faq.ts:42) says pending requests never hold rooms, despite deposit holds; [FAQ:12](C:/projects/Paraiso/src/data/faq.ts:12) asks for an exact map pin although the site already publishes one; [legacy receipt:70](C:/projects/Paraiso/src/app/booking/confirmation/[reference]/page.tsx:70) says no payment is collected through this website; [header:153](C:/projects/Paraiso/src/components/layout/header.tsx:153) still describes inquiries via Facebook. Source-confirmed. | Clarify conditional availability/payment enablement and the difference between inquiry, held request and confirmed booking. Reconcile owner-approved hours/address with the FAQ. Keep genuine Contact/social links; do not route bookings back to Facebook. |
| **B07 — Low, P2: inaccurate facilities photo alt text** | [packages/page.tsx:33](C:/projects/Paraiso/src/app/packages/page.tsx:33) passes “Approved photograph of resort gathering areas pending” while `resortMedia.facilities` maps to an existing pavilion photo in [media.ts:54](C:/projects/Paraiso/src/config/media.ts:54). Source-confirmed. | Screen-reader text describes an absent placeholder instead of the shown photo. Use the actual approved pavilion description. |
| **B08 — Low/Medium, P2: financial ledger category loses item detail** | [reports.ts:176](C:/projects/Paraiso/src/lib/booking/reports.ts:176) writes parent `booking_category`, which is `COMBINED` for multi-service bookings. The Reservations sheet separately lists actual item categories. Source-confirmed. | A financial report filtered by dining can still label the service category merely COMBINED. Include actual category list or a clearly named mixed-booking label. Do not invent per-category payment allocation without an accounting rule. |
| **B09 — Medium, P1: accepted detail fields silently ignored on status change** | [service.ts:185](C:/projects/Paraiso/src/lib/booking/service.ts:185) handles status changes; phone/notes updates occur only in its alternate branch at [215](C:/projects/Paraiso/src/lib/booking/service.ts:215). API accepts status, phone and notes in one request. Isolated function reproduction: cancel plus changed phone/note returns successfully, but original phone/note remain. | A valid combined PATCH loses requested edits without telling the caller. Apply permitted detail changes atomically with the transition, or explicitly reject mixed requests. Add an API contract regression test; current UI usually sends these actions separately. |

### Confirmed launch blockers / configuration gaps

| ID | Evidence | Required next action |
|---|---|---|
| **L01 — P0: no connected booking data/inventory** | [db.ts:5](C:/projects/Paraiso/src/lib/booking/db.ts:5), only `.env.example` present, live local catalog `configured:false`. | Establish a staging PostgreSQL database, apply migrations, create authorized administrator and enter actual inventory/rates/capacity/policies. Keep inactive seeds inactive until verified. Production activation is a separate controlled step. |
| **L02 — P0 for paid bookings: no operational payment channel proven** | [gateway guard](C:/projects/Paraiso/src/lib/booking/payments.ts:433); no keys or wallet configuration supplied. | Owner chooses launch channels. Independently verify a genuine receiving account and staff process; if gateway is in launch scope, complete real merchant sandbox tests/webhook setup before live activation. Gateway may stay disabled for an owner-approved manual-only launch. |
| **L03 — P0: production runtime/security/operations not established** | [.env.example](C:/projects/Paraiso/.env.example), [maintenance.ts](C:/projects/Paraiso/src/lib/booking/maintenance.ts), [site.ts](C:/projects/Paraiso/src/config/site.ts). | Verify Node-capable hosting, origin/HTTPS, restricted DB/TLS, encryption/secrets, private worker, notifications and recoverable backups before publishing transactional booking. No actual account access was available. |

### Suspected risks and manual follow-up, not counted as confirmed bugs

- `deliverAccessLinks()` sends up to five emails inside a transaction with a 60-second idle transaction limit; SMTP operations allow 20-second socket timeouts. Slow delivery may roll back delivery markers after messages were sent. Fault-inject slow SMTP and verify retries/duplicate behavior. A real SMTP service was unavailable.
- Reminder generation matches one exact arrival-minus-reminder date. Test scheduler outages spanning that day; overdue reminders may need a bounded catch-up policy. Do not silently send late reminders without a business rule.
- Repeated provider callbacks retrieve the remote session before event dedupe inside settlement. This protects truth but increases external calls under repeated valid delivery. Load-test and monitor; no availability incident was reproduced.
- The global inventory advisory lock is safe but serializes all inventory writes. Benchmark peak reservation load and managed-DB latency before optimizing lock granularity. No evidence supports replacing the safe lock immediately.
- A shared fallback rate-limit bucket protects the app when proxy trust is unknown, but can throttle unrelated guests together. Verify a host-overwritten, non-bypassable client-address header before configuring `TRUSTED_IP_HEADER`.
- Day sessions crossing midnight are intentionally rejected; one participant consumes one equipment slot. Confirm these limits fit actual operations. A multi-passenger ATV or night-swimming model may need explicit resource/next-day rules.
- Staff and public catalogs are separately maintained; this is a known architecture boundary, not automatic data synchronization. Verify price/photo/name alignment in release checks.

### Redundant or obsolete candidates — do not delete without review

- [booking-form.tsx](C:/projects/Paraiso/src/components/booking/booking-form.tsx:35) retains the earlier `BookingForm` component, while current routes use `CartCheckout`. Its `api()` helper is imported widely. Extracting that helper and retiring the old UI is optional, after checking compatibility/tests.
- [experience-story.tsx](C:/projects/Paraiso/src/components/experience-story.tsx) exports a component without a current import; associated `.experience-story` CSS remains. Verify design intent before any removal.
- [reports.ts:228](C:/projects/Paraiso/src/lib/booking/reports.ts:228) exports `financialOverview` without a current caller; another summary query is used by commerce API. Consolidation can reduce metric drift.
- [finalize-export.mjs](C:/projects/Paraiso/scripts/legacy/finalize-export.mjs), old static audit helpers and `public/_headers` reflect static-host deployment. They are not called by the current Node build. Keep clearly historical or archive intentionally after release planning; do not run them as the booking deployment process.
- Twenty-one documentation files include several historical motion/static-conversion reports. Current guides already mark some as historical. A single “start here/current architecture” index is safer than treating every historical instruction as current.

## E. Client Requirements Checklist

Every unchecked item requires a specific owner decision, supplied record or verification. Nothing below authorizes fabricated business data.

### Accommodations

- [ ] Confirm official names and physical unit identifiers for Family Deluxe, Igloo, Wooden & Brick, Standard Cabin and Bunkhouse; identify real variants without inferring them from photos.
- [ ] Supply unit counts, maximum adults/children, bed counts/sizes, bathroom arrangement, air-conditioning and included amenities for each actual unit/type.
- [ ] Supply approved PHP rates, per-night/per-person/per-unit basis, weekday/weekend/holiday rules, child/extra-person charges, taxes/fees and effective dates.
- [ ] Confirm check-in/check-out times, late arrival/late checkout, minimum stay, occupancy, pets, smoking, outside-food rules and accessibility constraints.
- [ ] Approve room-to-photo mapping and provide missing exterior/bathroom/layout images from section C.

### Swimming, adventures and dining

- [ ] Confirm which swimming/day/night/private/package services actually exist, with session hours, pool capacity, private/shared resource group, entrance rates, child age bands and cottage capacity/inclusions.
- [ ] Supply closure/maintenance calendar, safety requirements, lifeguard/child supervision rules and current signage where applicable.
- [ ] Confirm each activity's current operating status, price basis, actual start times/duration, participants/equipment, minimum age/height/weight, safety/access restrictions and weather cancellation policy.
- [ ] Confirm dining service times, capacity/seating zones, reservation fee or explicitly free reservation, real packages, menu prices, preorder quantities, allergens/dietary handling and outside-food rules.
- [ ] Confirm whether midnight-crossing sessions, multi-person equipment or group packages require features beyond the current model.

### Payments and operational policy

- [ ] Approve a deposit rule for each bookable offering: none, fixed, percentage or full. Confirm add-on treatment, hold duration and manual-review deadline.
- [ ] Choose staff approval versus payment-triggered automatic confirmation; establish who checks availability and reconciles late money.
- [ ] Supply authorized business GCash/Maya names/numbers and genuine QR images privately; verify through a separate trusted owner channel before publication.
- [ ] Supply merchant ownership/approved PayMongo methods and **test** credentials privately if gateway launch is required. Complete test evidence before live credentials are enabled.
- [ ] Document who independently checks wallet/bank records, actual amount/time/reference/account, how duplicate claims/disputes are resolved and who can authorize refunds.
- [ ] Approve cancellation, rescheduling, no-show, weather interruption, expiry, refund timing, fee and exception policies.
- [ ] Decide whether receipts must be printable financial acknowledgements, fiscal invoices, or both; provide required business identity/accounting details and authorized numbering rules.
- [ ] Provide existing off-site/telephone reservations and an import/entry/reconciliation owner so configured inventory does not ignore other sales channels.
- [ ] Define staff users/roles and minimum required approval/export/payment permissions; nominate primary and recovery administrators.

### Public content, privacy and delivery

- [ ] Approve official business/legal name, About story, differentiators, amenities list, current address/pin, telephone, email, operating hours and arrival instructions.
- [ ] Confirm Google review authenticity, source attribution and permission records; confirm whether the quoted historical guest prices require contextual wording.
- [ ] Supply a current promotion only if wanted: dates, inclusions, exclusions, quantity limits, actual price, terms and authorized poster. Otherwise keep the honest empty state.
- [ ] Approve all photograph rights, captions and accessibility/child-photo permissions; request only real facilities, never stock/generated substitutes.
- [ ] Supply approved privacy/controller contact, data-use wording, retention periods, handling of access/correction/deletion requests and export/backup retention procedures.
- [ ] Provide final domain/DNS access, actual Hostinger subscription/runtime details, email sender/provider and authorized deployment contacts privately.
- [ ] Approve backup retention, recovery targets, incident contacts, operational alerts and staff training/UAT ownership.

## F. Priority-Based Development Roadmap

### P0 — Critical

1. **B01:** preserve approved/check-in state when collecting later receipts; add regressions before allowing real balances to be collected.
2. **B03:** make every financial write idempotent, including legacy records and retry paths.
3. **L01:** establish a correctly configured staging database, administrator and verified inventory; do not activate unknown capacities/rates to make a button clickable.
4. **L02:** establish at least one owner-approved, tested payment workflow for paid reservations; keep unverified channels disabled.
5. **L03:** prove production Node/HTTPS/database/worker/secrets and operational recovery configuration. Static-only upload is not an alternative backend.

### P1 — Required before launch

- Correct B02/B04/B05/B06/B09 and financial/reporting semantics; make state and ledger evidence consistent across staff UI, guest tracker, emails and exports.
- Obtain/publish actual service data, rate/deposit rules, policies, facilities and contact information. Make public and booking catalogs agree.
- Configure SMTP, access-link encryption/origin, sender identity and the private worker; test real delivery and retry handling in staging.
- Implement the agreed rescheduling workflow or explicitly document/approve a safe replacement/reconciliation procedure before advertising rescheduling.
- Confirm receipt/invoice scope, backup restore, alert routing, staff recovery, least privilege, DB TLS and genuine staff payment verification.
- Configure the final domain, canonical metadata, indexing and sitemap only when launch approval is given; keep staff/private routes excluded.
- Run owner-led desktop/mobile UAT, including sold-out inventory, late/manual payment, expired hold, refund and final balance collection.

### P2 — Quality improvements

- Correct B07/B08 and improve audit logs/operational metric definitions.
- Add verified local-business structured data and a real 1200×630 social image.
- Use responsive delivery for admin-configured booking images; tune the largest WebP files after visual comparison and measured transfer checks.
- Complete keyboard, screen-reader, contrast, 200%/400% zoom and touch-target checks, including small secondary links and native date controls.
- Introduce a tested CSP in report-only mode first; validate nonce/hash requirements, Maps, hosted-checkout navigation and Next hydration before enforcement. Verify host TLS/HSTS separately.
- Add CI checks, an authoritative operations index, safer module boundaries and regression coverage for all confirmed findings.
- Test slow SMTP, worker downtime, real device/network performance, load and graceful shutdown.

### P3 — Optional future features

- Full POS/restaurant orders, additional charges, itemized invoices, tax/discount allocation and one final checkout.
- Guest accounts, passkeys/MFA/self-service staff recovery, loyalty and advanced analytics when business value and scope are agreed.
- Automated provider refunds, waitlists, channel manager integration, dynamic pricing, multi-person equipment resources or midnight-spanning activity schedules if actual operations require them.
- Google Sheets, richer Excel Online financial synchronization and live review integration only with appropriate authorization and a clear maintenance plan.

## G. Recommended Development Order

1. Preserve the current work and agree the feature boundary. Use this report as a backlog; do not rebuild the frontend or change auth/database providers.
2. Fix **B01 first** in `paymentApplied()` with tests for deposit → staff confirmation → check-in/final balance. Require that approval/check-in state remains correct while paid/balance figures update.
3. Unify or deprecate the legacy ledger safely and add retry/idempotency tests (**B03**).
4. Correct guest-count semantics, authoritative provider receipt timestamps, active-balance labeling, ledger categories and mixed PATCH handling (**B02/B04/B05/B08/B09**).
5. Obtain the owner requirements packet in section E. Complete rate/capacity/policy decisions before configuring bookable stock.
6. Set up isolated staging PostgreSQL and restricted roles, apply all migrations, bootstrap administrator and enter verified units/services. Verify all booking channels are represented.
7. Configure the chosen manual channel and verification procedure. Add genuine PayMongo sandbox credentials/webhook only if gateway is included; exercise real test transactions, expiry and reconciliation without customer funds.
8. Configure SMTP, secure recovery links, reminders, private scheduler, alerts and recoverable backups; restore a backup into a separate test environment.
9. Publish approved public facts/policies and remove stale copy. Complete any agreed rescheduling/receipt workflow.
10. Verify actual hosting plan supports Node and required scheduling/network connections; configure final HTTPS origin, secrets, DNS and process supervision.
11. Complete responsive/accessibility/asset/SEO polish, then run clean build, tests, dependency audit, real-device and business UAT. Confirm exports reconcile to independent payment records.
12. Obtain explicit owner launch approval, enable only verified payment methods, publish the approved domain and indexing settings, train staff and monitor the first real bookings. Keep a rollback and financial reconciliation plan available.

**Recommended first implementation task:** fix B01 and add its missing lifecycle regression test. It is a small, concrete change to an existing module with direct customer/staff impact, and it does not depend on client credentials.

## H. Project Readiness Assessment

These are engineering **readiness rubric scores**, not market valuations or automatic guarantees. Each category uses five equally weighted criteria, each scored out of 20; the five numbers shown add to the reported score. Missing evidence earns limited/no readiness credit, even if a documented plan exists. “Complete” checklist rows refer to implemented mechanisms, whereas these scores include operational readiness.

| Area | Score / 100 | Criteria scores and evidence |
|---|---|---|
| Frontend completeness | **82** | Routes/components 20; coherent design 19; interactions 18; approved business content 10; policies/SEO completeness 15. Major public routes work, but commercial facts/disclosures are incomplete. |
| Backend completeness | **76** | Schema/migrations 20; validation/auth 18; inventory transactions 19; lifecycle/report correctness 12; operational integrations 7. Real SQL tests pass; confirmed defects and no live service evidence reduce readiness. |
| Booking system completeness | **70** | Multi-category/cart/deposits 19; inventory/holds 19; approval/lifecycle 11; payment operational readiness 9; rescheduling/receipts/staff handoff 12. Not ready to accept customer funds despite broad implemented scope. |
| UI/UX quality | **85** | Branding/type/color 19; navigation/hierarchy 18; responsive composition 19; forms/feedback 16; content clarity/accessibility proof 13. Screenshots and interactions support a premium foundation; no wholesale redesign is justified. |
| Mobile responsiveness | **88** | Width/layout 20; menu/modals 19; form layout 18; content density/readability 17; device/assistive coverage 14. 66 viewport checks pass; physical iOS/Android, zoom and complete staff workflows at every width are not all tested. |
| Security readiness | **73** | Authentication/permissions 18; validation/CSRF 18; private data/uploads 18; payment integrity 11; deployment/operations 8. No known advisory/source secret found; B03 and external TLS/secrets/recovery evidence remain gaps. No penetration-test certification. |
| Performance readiness | **72** | Responsive images 17; loading/bundle strategy 16; local lab evidence 17; heavy-photo tuning 12; production/network/load evidence 10. Local measurement is favorable, but field CWV and production cache behavior remain unassessed. |
| Deployment readiness | **24** | Build/runtime documentation 17; domain/HTTPS 1; production DB/inventory 1; payment/email/worker setup 2; recovery/monitoring/owner UAT 3. Documentation/builds are available; actual external deployment proof is absent. |

**Not assessed:** field Core Web Vitals/CrUX, production INP, real mobile network performance, physical device behavior, production load/concurrency capacity, external account security, independent legal compliance, restore time and actual merchant activation. These must not be inferred from the rubric.

### Performance and accessibility observations

The isolated production server's unthrottled localhost mobile-sized homepage observation recorded approximately **432 ms LCP**, **0 measured CLS**, **2 long tasks**, **37 resources**, **531,060 encoded resource bytes** and **187,393 encoded script bytes** during that initial observation window. The mobile hero candidate was 163,364 bytes. Lazy off-screen resources were not all loaded in that window. This is **not Lighthouse, a real 3G/4G test, or a field CWV pass**; it cannot predict client hosting latency or INP.

The existing 220ms UI, 300ms hover, 640ms section and 820ms image transitions are bounded. The desktop hero drift is 16 seconds and pauses out of view; reduced motion disables enhancement. No custom scroll hijacking was found. Preserve these functioning choices. Long mobile pages and repeated “ask the resort” copy are mainly a content-completeness problem; improve useful information before adding more animation.

No unnamed icon-only buttons or missing image `alt` attributes were found in the inspected public DOM, but semantic accuracy still matters (B07). Native dialogs, focus restoration, skip link, explicit form labels and reduced-motion support are strengths. Automated layout checks are not a full accessibility audit: contrast against photographs, large zoom, assistive technology reading order, error announcements and small footer/review link touch targets need manual verification.

### Backend/security architecture assessment

- All important booking capacity writers use the shared transaction lock. Actual room allocations have an SQL exclusion constraint over `[check-in, check-out)`; checkout day remains reusable. Swimming/activity/dining use concurrent session capacity, not room-night logic. Availability is checked again inside checkout/confirmation.
- The database has 17 initial application tables, 10 added in migration 004 and one add-on snapshot table in 006: **28 application tables**, plus `schema_migrations` bookkeeping and the `booking_financials` view. Existing roles/sessions/payments/jobs are reused rather than duplicated.
- Provider/manual payment proof is treated separately from money. Manual evidence credits zero until authorized independent review; successful gateway claims require HMAC validation and authenticated provider retrieval. Late payments do not silently overbook. Current direct API behavior is covered with transport fixtures, not real merchant tests.
- Uploads are bounded and genuine PNG/JPEG files are decoded/reencoded with pixel limits and metadata stripping. Private evidence stays in PostgreSQL bytes and no-store owner/verifier routes. No public proof bucket was found.
- Queries use parameters; no `dangerouslySetInnerHTML` use was found in source. Secrets remain server-side. Production Secure cookies, same-origin mutation checks and permission checks are present. CORS is same-origin by design; broad `Access-Control-Allow-Origin: *` is not needed.
- Backups, encryption at rest, database least privilege, trusted proxy headers, HTTPS/HSTS and network boundaries are deployment responsibilities not proven by source. No production monitoring/restore or complete penetration/load test was run.
- The current “future POS ready” claim means useful relationships/deduplication foundations exist. It does not mean charge mutation, invoicing, tax, service fulfillment or cash management is already implemented.

## I. Final Master Checklist

### Confirmed completed

- [x] Inspect the current Next.js/React/TypeScript architecture and dependency lockfile.
- [x] Confirm real public pages and all five room-detail routes exist and render.
- [x] Confirm internal reservation CTAs, working local assets and preserved branding/motion.
- [x] Verify gallery/menu/FAQ keyboard and responsive interactions.
- [x] Verify unified cart, server totals, per-item deposits, configured add-ons and references in isolated tests.
- [x] Verify room exclusion, shared/private pools, timed equipment capacity, concurrent reservations, blocks and hold release.
- [x] Verify staff permissions, private evidence, one-time guest ownership and sanitized failure handling in tests.
- [x] Verify provider signature/retrieval/deduplication logic with isolated transport fixtures; this is not merchant activation.
- [x] Verify configured manual claims require separate independent staff verification.
- [x] Verify financial XLSX generation and distinguish it from the legacy Excel Online summary mirror.
- [x] Execute lint/type/build and the 48 existing tests without changing original application files.
- [x] Reproduce four previously untested defects in disposable fixture databases; retain them in the audit backlog.

### Missing or unfinished — exact next actions

- [ ] **B01 / P0:** preserve CONFIRMED/CHECKED_IN state on later receipts; add final-balance lifecycle regressions first.
- [ ] **B03 / P0:** make legacy receipt/refund writes idempotent or retire the endpoint/UI safely with a migration plan.
- [ ] **L01 / P0:** configure staging DB/TLS, run migrations, create authorized administrator and verify real units/capacities/rates.
- [ ] **L02 / P0:** owner approves actual payment channels and independent verification procedure; finish real PayMongo sandbox only if included.
- [ ] **L03 / P0:** prove production Node/HTTPS/origin/secrets/private worker, SMTP, backups and recovery before transactional launch.
- [ ] **B02:** decide guest-count semantics and correct parent/report/email representation.
- [ ] **B04:** retain validated provider transaction time separately from ingestion time and test Manila-midnight delays.
- [ ] **B05:** define/split active versus total receivables; align SQL and dashboard labels.
- [ ] **B06:** replace stale FAQ/pool/header/legacy-receipt wording with approved conditional booking/payment language.
- [ ] **B07:** correct facilities image alt description to match the actual approved photo.
- [ ] **B08:** show actual service categories for combined bookings without inventing payment allocation.
- [ ] **B09:** update permitted phone/notes atomically with status or reject mixed PATCH requests explicitly.
- [ ] **Content:** obtain section E approvals, supply missing photos and publish useful factual room/pool/activity/dining/facilities information.
- [ ] **Policies:** publish approved terms, cancellation/refund and privacy text through one maintained source.
- [ ] **Rescheduling:** implement authorized transactional rescheduling or obtain explicit scope approval for a safe replacement procedure.
- [ ] **Receipts:** establish official receipt/invoice scope and add authenticated print/download if required.
- [ ] **SEO:** set final verified domain, canonicals, real sitemap and indexing on launch approval; add share image and verified JSON-LD.
- [ ] **Operations:** establish alerting, backup retention/restore evidence, scheduler logs, staff recovery and incident contacts.
- [ ] **Maintainability:** add missing regression coverage/CI and clarify historical docs/unused UI candidates without unnecessary rewrites.

### Needs manual verification

- [ ] Owner confirms every published name/rate/capacity, operating hour, contact, photo mapping and policy; record approval date.
- [ ] Merchant owner completes actual sandbox session, signed webhook delivery, duplicate/failed/cancelled/expired/late scenarios and reconciliation with merchant records.
- [ ] Authorized staff verify a real receiving account and demonstrate independent manual review in staging; never treat a screenshot/reference as proof.
- [ ] SMTP test reaches guest/staff mailboxes; access link is private, expiring and single-use; sender DNS and retries are checked.
- [ ] Worker actually runs on schedule and recovers safely after downtime; slow SMTP and webhook outages are exercised.
- [ ] Production TLS, restricted DB role, backup restore, encryption-key recovery and monitoring alerts are independently checked.
- [ ] Real Hostinger plan supports the deployed Next runtime, private scheduling and outbound DB/SMTP/provider connections; otherwise select compatible hosting.
- [ ] Physical Android/iPhone, keyboard/screen reader, contrast and 200%/400% zoom pass business UAT.
- [ ] Final financial exports reconcile to independent receipts/refunds and all sales channels' inventory.
- [ ] Owner approves launch and staff are trained; unverified payment channels remain disabled.

### Future POS integration assessment

**Future feature, not a launch prerequisite unless contracted.** Existing booking UUIDs, `booking_items`, `booking_charges`, `payments`, claim/provider identifiers and idempotency keys are useful foundations. A future authenticated POS must read the booking through its UUID, append uniquely keyed charges, credit existing verified deposits exactly once and calculate a reconciled final bill. It still needs authorized charge/order APIs, tax/discount/allocation rules, immutable adjustment/void rules, invoice/receipt numbering, stock/fulfillment if required, cashier roles, refund rules and integration tests. Current balance computation uses stored booking totals; it does not yet automatically include arbitrary future POS charges. No POS was built or changed during this audit.

### Audit limits and preservation statement

No production database writes, actual customer reservations, real payments, merchant configuration, deployments, source fixes, file renames or dependency updates were performed. Tests and targeted probes used disposable copies and isolated databases. Evidence files/screenshots were written under ignored audit storage; the copied build did not replace the user's running development server. Application-file hashes were compared before/after; see the final preservation result below. Only this requested root audit report is the intended application-repository deliverable.

**Preservation verification:** All original application/source/configuration/documentation/asset files match their pre-audit SHA-256 hashes; none were deleted. No pre-existing inventoried file content changed. Generated build/test artifacts were kept separate from application source.
