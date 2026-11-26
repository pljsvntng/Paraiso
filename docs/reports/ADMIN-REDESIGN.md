> Historical reference: payment processing and financial dashboard functions are retired. Use [the current reservation-only guide](../RESERVATION-SYSTEM.md) for active features, endpoints and tests.

# Administrator workspace redesign

22 November 2026 · Asia/Manila

## Audit and implementation plan

The current dashboard sits inside the public marketing header/footer. Its ten wrapping tabs do not scale to operational modules, KPI groups repeat information, financial/booking states use inconsistent badges, and 9–12px table/label typography is difficult to scan. Overview setup checks occupy several screens; Inventory begins with a full rate-rule form before the service catalog/editor. Reservation details combine every workflow in a long central modal. Payment claim forms expand the whole queue. Month/week calendars have no quick navigation or mobile agenda alternative.

Baseline screenshots were captured at 1440, 768 and 390 pixels in `.local/admin-redesign/`. The baseline source snapshot is local and ignored by Git. Temporary audit sessions are revoked after browser inspection; business records are not changed.

Implementation checklist:

- Build a scoped admin design system and a collapsible, permission-filtered sidebar/mobile drawer; preserve public branding outside `/admin`.
- Consolidate eight operational KPIs, actual date-range analytics, arrivals/recent reservations and an attention center backed by PostgreSQL.
- Improve server-side reservation filters/sorting and financial columns; use a side drawer with focused detail sections.
- Present service cards and category-specific management first; retain existing editor, unit/block/add-on and rate operations with logical sections.
- Redesign payment queue/review, real-data calendar month/week/day/agenda, reports, staff accounts, policies and system status.
- Preserve all transaction, payment, authorization and capacity code. No schema migration or new dependency is planned.
- Verify lint, types, production build, existing booking/payment tests, staff workflows and layouts at 320, 375, 390, 430, 768, 1024 and 1440 pixels.

## Implemented screens and components

The existing `/admin/dashboard/` now uses an isolated operations shell. The public header/footer stay on public routes. Desktop navigation collapses to labelled icons; a native modal drawer provides mobile navigation and restores keyboard focus. Navigation is filtered by the authenticated staff role, and the server continues to enforce permissions independently.

| Area | Implementation |
| --- | --- |
| Overview | Eight real database KPIs, Manila date, date-range reservation and verified-receipt charts, accessible chart data tables, service/payment breakdowns, arrivals and recent reservations. |
| Reservations | Guest/reference/email search, booking/payment/category/date filters, arrival/departure date basis, safe server-side sorting, 50-row pagination, authorized Excel export, mobile cards. |
| Reservation drawer | Guest contacts, saved service itinerary and add-ons, billing, allocation details, permission-filtered status transitions, financial operations, rescheduling, private notes, audit history and delivery jobs. |
| Calendar | Month/week/day/agenda, previous/next/today controls, category filtering, current-day highlighting, bookings and maintenance blocks, mobile schedule list, existing manual booking entry. |
| Services | Photo catalog, category-specific workspaces, search/setup filters, editor drawer with grouped fields, actual unit counts, session information, existing unit/block/rate/add-on management. |
| Payments | Searchable verification queue, expected deposit, previous verified receipts/refunds, outstanding balance, duplicate-reference warning, authenticated private evidence preview, independent-verification form, rejection and gateway reconciliation. |
| Reports | Existing financial summary, quick date ranges, category/booking/payment filters, Excel generation and download/error feedback. The existing six-sheet workbook remains in use. |
| Attention and activity | Persistent unread request count and mark-read operation, approvals, arrivals/departures, expiring holds, reconciliation, authorized setup/job alerts, recent real audit events. |
| Staff and settings | Staff directory and access editor, server-protected last-administrator rule, grouped policy disclosures, receiving-account management, operational setup checklist and existing email/Excel delivery controls. |
| Sign-in | Dedicated responsive staff sign-in, existing authentication, labels, validation, loading/error feedback and route protection. |

## Financial and inventory definitions

- Reservation counts refer to saved booking records. A combined reservation counts once; category breakdowns count it once in each included service category.
- Today’s check-ins are confirmed reservations arriving today. Today’s check-outs are checked-in reservations departing today.
- Active outstanding balance excludes cancelled, declined, expired and completed stays. Reports retain the existing separate active/completed/total/overdue receivable figures.
- Verified net receipts are actual payment ledger amounts less actual refunds. Claims and screenshots never credit funds by themselves. Receipt charts use `received_at` in Asia/Manila.
- Occupancy uses active physical overnight units allocated to confirmed/checked-in reservations today. Payment holds and day-use cottages are excluded from occupied room-night units. An unconfigured denominator displays a dash.
- Report reservation dates filter creation time, payment ledger dates filter received time, and claim dates filter submission time. Saved reservation item prices remain snapshots when the catalog changes.
- A blank price, missing capacity, absent physical units or unconfigured deposit policy stays explicit in the catalog. No rates, room counts, guest capacities, accounts or policies were fabricated to fill the interface.

## Files added

- `src/app/admin/layout.tsx`, `src/app/admin/admin.css`
- `src/components/admin/shell.tsx`, `admin-overview.tsx`, `admin-ui.tsx`, `admin-types.ts`
- `src/components/admin/reservation-drawer.tsx`, `service-workspace.tsx`
- `src/lib/booking/admin-insights.ts`
- `tests/helpers/admin-workspace-browser.ts`
- `docs/reports/ADMIN-REDESIGN.md`

## Existing files improved

- `src/app/admin/dashboard/page.tsx`, `src/app/admin/login/page.tsx`
- `src/components/admin/dashboard.tsx`, `admin-forms.tsx`, `service-fields.tsx`, `commerce-admin.tsx`, `login-form.tsx`
- `src/lib/booking/service.ts`, `commerce-api.ts`, `reports.ts`
- `tests/commerce.test.ts`, `tests/reservation.test.ts`

Existing reservation, payment, ledger, capacity, approval, rescheduling and authentication mutations are reused. The added insights endpoint is read-only. No database migration or dependency was added for this redesign. Existing user working-tree changes were retained.

## Operational setup

The local catalog currently has thirteen existing disabled services requiring owner-approved configuration. Use **Inventory → Manage** to enter verified service facts, capacity, rates and deposit rules. Configure actual physical units under **Units & availability** where applicable. Configure approved policies, the hold window and receiving accounts under **Booking settings**. Enable only offerings whose configuration the resort has verified.

Email, Microsoft delivery, merchant credentials and scheduled workers remain environment-managed. Their existing setup checks and retry controls are available under **Settings**. A successful local UI/build test does not certify live merchant settlement or external email/Excel delivery.

## Verification

Verified on 22 November 2026:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no warnings or errors. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed, including all public and dynamic admin/API routes. |
| Complete test suite with `BOOKING_BROWSER_TESTS=1` | **67 passed, 0 failed, 0 skipped**, approximately 212 seconds. |
| Browser layout matrix | Overview and 14 operational screens at **320, 375, 390, 430, 768, 1024 and 1440px**; no document overflow. |
| Service/account editors | Opened and checked at every requested width, including unit/block and rate/add-on screens; dialogs fit the viewport. |
| Actual staff workflow | Login; reservation filtering; drawer; deposit gating; authenticated evidence preview; independent verification credited once; approval; private note; permitted service edit persisted; calendar navigation/views; Excel download; logout; restricted staff access. |
| Financial regression | Actual receipt totals/date ranges, mixed-service category counts, payment/departure filters, safe sorting, booking-status workbook filters and payment-status filtering on pending claims passed. |
| Existing booking regression | Capacity/concurrency, deposits, late payments, cancellation, refunds, rescheduling, privacy, exports, permissions and guest desktop/mobile flows passed on isolated PostgreSQL. |
| Existing local server | `/admin/login/` and `/` both returned HTTP 200; admin sign-in markup appeared only on the admin route. |

The full test command was `node --import tsx --test --test-reporter=tap --test-force-exit --test-concurrency=1 tests/*.test.ts` with `BOOKING_BROWSER_TESTS=1`. PostgreSQL instances and all business writes used isolated test databases. Browser audit sessions on the existing local database were temporary and revoked after use; that audit did not change business records.

Browser artifacts live in the ignored `.local/admin-redesign/verified/` directory. Examples include `overview-1440.png`, `overview-390.png`, `reservation-drawer-390.png`, `service-editor-390.png`, plus calendar, payment, report, account and policy screenshots. Test screenshots contain explicit test fixtures, not invented production records. The final full log is `.local/admin-redesign/verified-tests.log`.

No implementation defect remains from this verification. Live payment-provider settlement, production email delivery and Microsoft synchronization still require the resort’s real approved configuration and external integration testing.
