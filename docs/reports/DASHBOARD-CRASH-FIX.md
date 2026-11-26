# Dashboard crash audit and repair

## Pending-table follow-up

The supplied pending-request screenshot exposed a table-cell defect missed by the earlier document-overflow checks: status badges allowed `overflow-wrap: anywhere`, so the desktop table compressed “Pending Approval” to about 35px wide and 176px tall. Each row grew to about 209px. Table badges now stay on one line, long service/guest descriptions wrap at spaces, and reference/action columns remain visible during horizontal scrolling. The scroll region also supports keyboard focus.

The live PostgreSQL recheck covered 320, 375, 390, 430, 768, 1024, 1366 and 1440px. Status badges are now 22px tall and the sample desktop rows approximately 87px tall, with no page overflow or browser runtime errors. The existing browser suite now also asserts status badge height, so a page-width check alone cannot miss this regression. [Before screenshot](../../.local/pending-table-fix/before-1366.png), [after screenshot](../../.local/pending-table-fix/after-1366.png), and [measurements](../../.local/pending-table-fix/after.json) are saved locally.

This follow-up changes `src/app/admin/admin.css`, the directory scroll container in `src/components/admin/dashboard.tsx`, and the existing browser assertion in `tests/helpers/admin-workspace-browser.ts`. Existing reservation data is unchanged.

Audit date: 22 November 2026. Existing Next.js dashboard and PostgreSQL integration retained. No payment features, dependencies or migrations added. Existing local reservations and historical financial records were preserved.

## Findings and repairs

The initial live dashboard loaded its CSS and PostgreSQL data. The browser showed no uncaught React errors, hydration mismatches or failed initial API requests. The reported appearance came from confirmed layout defects; separate functional defects were reproduced through navigation and controlled request failures.

| Confirmed cause | Repair |
| --- | --- |
| Dashboard tab state was initialized once. Clicking the resort logo changed the URL to the overview while the reservation screen remained visible. | The active tab now follows Next.js search parameters. Navigation also invalidates pending detail requests and closes the previous detail panel. |
| One `Promise.all` coupled notification counts, analytics and the active screen's data. A simulated analytics 503 hid inventory even though inventory returned 200. | Requests settle independently, successful data remains visible, and failures offer retry and sign-in actions. Superseded requests are cancelled. |
| New report/settings forms were direct children of `AdminPanel`, which supplied no shared body padding. Older children supplied their own padding. | A shared panel body supplies consistent spacing. Redundant child padding is removed within that wrapper. |
| Overview grids stretched panels and always rendered four large empty service schedules. | Panels align at their content height, empty states are smaller, and empty category schedules consolidate into one useful message. Zero reservation counts do not produce artificial chart bars. |
| The decision form cleared its confirmation view whenever the update promise resolved, including errors caught by the parent. | Updates report whether the write succeeded. Failed decisions retain the form and entered reason; staff can reload the current reservation before retrying. |
| Guest/report/settings requests had no cancellation or response ordering protection, and guest/report screens displayed empty content during loading. | A shared resource hook cancels superseded requests, provides loading/error/retry states, and distinguishes a failed request from an empty result. |
| Logout used the generic mutation helper, which fetched protected dashboard data after revoking the session. | Logout has a dedicated path that cancels pending dashboard requests and redirects to sign-in. Background refresh pauses during mutations. |
| The date formatter could throw for missing/invalid dates. | Missing or invalid dates render a fallback. The dashboard also has a route error boundary with retry. |
| The square sidebar emblem declared a different height, generating a Next Image warning. | Dimensions now match its aspect ratio. |

Shared reservation CSS now imports once, before dashboard overrides in the admin layout, following the installed Next.js CSS ordering guidance. This is a consistency fix; missing Tailwind or stylesheet delivery was not reproduced.

Typography, mobile status/reference wrapping, form controls, panel headings and analytics controls were adjusted within the existing green/cream design. The overview's Today's Visits value is an uncapped PostgreSQL count of current confirmed/checked-in visits; the card opens the calendar.

Visual inspection at 320px also identified clipped native date inputs and crowded settings shortcuts. Analytics dates now stack at small widths, settings shortcuts use the full available width, and empty overview summaries use compact text. Stacked chart cards retain a visible gap.

## Changed files

| Area | Files |
| --- | --- |
| Admin routes/styles | `src/app/admin/layout.tsx`, `src/app/admin/admin.css`, `src/app/admin/dashboard/page.tsx`, `src/app/admin/dashboard/error.tsx` (new), `src/app/admin/login/page.tsx` |
| Dashboard loading/navigation | `src/components/admin/dashboard.tsx`, `src/lib/api/reservations.ts`, `src/hooks/use-admin-resource.ts` (new) |
| Existing UI components | `src/components/admin/shell.tsx`, `src/components/admin/ui.tsx`, `src/components/admin/overview.tsx`, `src/components/admin/reservation-drawer.tsx`, `src/components/admin/reservation-records.tsx` |
| Actual visit count | `src/lib/booking/admin-insights.ts` |
| Regression/browser verification | `tests/helpers/admin-workspace-browser.ts`, `tests/commerce.test.ts` |
| Documentation | This report and `docs/RESERVATION-SYSTEM.md` |

No files outside the relevant dashboard, shared reservation API helper, analytics query, tests and documentation were intentionally changed. Pre-existing workspace changes were retained.

## Browser evidence

Local screenshots are intentionally under ignored `.local/` because the live database may contain private guest information. Do not publish them as public website assets.

| View | Before | After |
| --- | --- | --- |
| Desktop overview | [1440px](../../.local/dashboard-ui-audit/before/overview-1440.png) | [1440px](../../.local/dashboard-ui-audit/after/overview-1440.png) |
| Mobile settings | [390px](../../.local/dashboard-ui-audit/before/settings-390.png) | [390px](../../.local/dashboard-ui-audit/after/settings-390.png) |
| Small phone reservations | [320px](../../.local/dashboard-ui-audit/before/reservations-320.png) | [320px](../../.local/dashboard-ui-audit/after/reservations-320.png) |
| Analytics failure on services | [Blank service area](../../.local/dashboard-ui-audit/before/auxiliary-api-failure.png) | [Inventory retained](../../.local/dashboard-ui-audit/after/auxiliary-api-failure.png) |
| Logo navigation | [Wrong screen](../../.local/dashboard-ui-audit/before/brand-navigation-mismatch.png) | [Overview restored](../../.local/dashboard-ui-audit/after/brand-navigation-mismatch.png) |

Live after screenshots cover overview, reservations, calendar and settings at 320, 375, 390, 430, 768, 1024 and 1440px. The browser diagnostic JSON records viewport/document widths, API/CSS responses and console errors. The deliberate 503 probe is recorded separately from normal requests.

Isolated PostgreSQL fixtures provide [empty dashboard screenshots](../../.local/dashboard-ui-audit/empty/empty-overview-1440.png), [approval review](../../.local/reservation-only-cleanup/approval-390.png) and [combined reservation details](../../.local/reservation-only-cleanup/combined-reservation-390.png). These contain clearly labelled test records.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, no errors or warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed, including production CSS and route compilation |
| `npm run db:check` | Passed; PostgreSQL service is running automatically |
| `BOOKING_BROWSER_TESTS=1 npm test` | **51 passed, 0 failed, 0 skipped**; 175.9 seconds, including production browser workflows and isolated PostgreSQL integration tests |

The final production dashboard test group passed all 19 tests, including the real empty-database browser test. Administrator and restricted staff views were exercised at **320, 375, 390, 430, 768, 1024 and 1440px**. Approval dialogs were also checked for viewport bounds, not only document overflow.

| Workflow | Verified behavior |
| --- | --- |
| Admin/staff sign-in and overview | Real authentication, eight PostgreSQL metrics, correct roles and empty states |
| Navigation | Desktop collapse/expand, mobile drawer, active screen and logo navigation |
| Reservations | Search, filters, private details, combined services and omitted optional guest fields |
| Staff decisions | Approval persists and updates private tracking; decline reason persists and appears in private tracking; failed decisions retain the entered form |
| Calendar | Day/week/month controls, reservations and maintenance data |
| Resort services | Accommodation, swimming/cottages, adventure, dining and availability screens; service editor at all seven widths; actual service save |
| Guest records | Search, loading, failed non-JSON response, retry, exact guest-history navigation |
| Reports/export | Filtered reports and a downloaded, parsed 16-column XLSX with one reservation-only worksheet |
| Accounts/settings | Administrator screens, server permission checks, settings/policies and restricted staff navigation |
| Logout | Admin and staff sign-out return to login, sessions are revoked, and protected dashboard requests are not reissued afterward |
| Failure isolation | An analytics 503 leaves the successful service catalog visible and retry restores the failed data |

The live recheck covered **28 screen/viewport combinations**, with **zero document horizontal overflows, zero uncaught browser errors and no failed normal API/CSS requests**. Its single deliberate analytics 503 is explicitly recorded in the diagnostic JSON. Screenshots were visually inspected for desktop, tablet, phone, empty, approval and combined-reservation states; this report does not infer visual success from compilation alone.

The original local database still contains **2 reservations and 14 services**. Financial archive protection and historical-row preservation pass in the disposable database tests. No migrations were changed.

Saved evidence: [complete test output](../../.local/dashboard-ui-audit/test-results.txt), [build output](../../.local/dashboard-ui-audit/build-results.txt), [ESLint output](../../.local/dashboard-ui-audit/lint-results.txt), [TypeScript output](../../.local/dashboard-ui-audit/typecheck-results.txt), [live browser diagnostic](../../.local/dashboard-ui-audit/after/diagnosis.json), and [compact browser summary](../../.local/dashboard-ui-audit/verification-summary.json).

Browser checks exercise administrator and restricted staff accounts separately. Mutation tests use disposable PostgreSQL databases and test accounts, never existing local guest reservations. Read-only live inspection uses a temporary session that is removed afterward; notification-read writes are intercepted during that inspection.

## Configuration still requiring resort setup

SMTP delivery, designated staff email recipients, private tracking encryption and worker configuration require the resort's real settings. Unapproved profile fields, capacities and schedules remain unconfigured rather than invented. Those operational warnings are displayed in Resort Settings. Reservation recording and permitted staff decisions work independently of email delivery.

Development inspection still produces informational font-preload and service-image LCP advisories. No stylesheet failures, hydration errors or uncaught runtime errors accompanied them. The Next.js development indicator appears in live development screenshots; it is absent from production screenshots.

No online payment processing, payment-management UI, financial report or new financial transaction was restored. Historical finance remains archived and protected by existing authorization. This task did not deploy the website.
