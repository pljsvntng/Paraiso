# Client demo readiness report

Prepared for the **23 November 2026** presentation. Start and presentation instructions are in [CLIENT-DEMO-GUIDE.md](../CLIENT-DEMO-GUIDE.md).

## Root cause

The normal `paraiso_dev` connection and all **10 migrations** were healthy. The disabled booking flow was caused by incomplete inventory configuration: all five stays and eight adventures were inactive; accommodations had no physical units; most capacities/rates were empty; no swimming/cottage catalog existed; adventure sessions were missing or unsuitable; dining had only the earlier single test offering. The normal database's existing policies were present. Removing a disabled attribute would not have made this inventory bookable.

A further browser-reproduced issue affected staff review in the development server: React Strict Mode cleanup closed the native reservation dialog, and its queued close event dismissed the reopened dialog. The close handler now checks the dialog's current open state. Development-mode approval/decline was then exercised through the browser.

## Isolated configuration and populated data

- Separate local PostgreSQL **cluster**, not only another schema in the normal database. Data lives under `.local/client-demo/postgres`; connections bind to loopback on a separately allocated port.
- Restricted non-superuser application role `paraiso_demo_app`, database `paraiso_client_demo`, private `.env.demo.local`, a manifest token and database identity marker. No connection credentials are published in this report.
- Explicit `PARAISO_DEMO_MODE=true` and `PARAISO_DEPLOYMENT_ENV=local-demo` are required. Seeding/reset also verify the exact approved connection, directory, role and marker. Hosted/production deployment settings are refused. Naming a database “demo” is insufficient.
- **16 active demo offerings**: five existing accommodation names, eight existing adventure names, swimming entrance, physical cottages and dining. **13 physical units**: ten accommodation units and three cottages. Existing genuine project photographs are retained.
- Sample nightly rates, maximum total guests, room counts, bed/group arrangements, check-in/out hours, amenities, restrictions, child swimming rate, session times/durations, seating/equipment capacity and sample policies are explicitly labelled DEMO/SAMPLE. No official dining menu or package is invented.
- Existing public service cards and booking options display DEMO DATA. A shared demo banner appears on public pages, reservation/tracking pages and the admin/staff area. The banner is driven by the server's validated demo mode and is absent from the normal environment.
- The seeded five scenarios are accommodation pending, swimming confirmed, adventure declined, combined confirmed and dining pending. The combined scenario contains accommodation, swimming, an adventure and dining under one reference.

The complete sample catalog table is in the [client guide](../CLIENT-DEMO-GUIDE.md#sample-catalog). Adventure operation and safety assumptions remain unconfirmed. The pool-area image used on the sample cottage is disclosed as contextual, not a photograph verifying a particular cottage.

## Application and database changes

The normal migration files were not modified. The isolated cluster adds a private `paraiso_demo` schema containing its identity marker and explicit owned-record registry. New demo guest submissions are registered in the same transaction as the reservation.

The existing catalog API reports a boolean `demoMode`, and `/api/reservations/demo-mode/` provides the validated mode to the shared notice. No secrets or privileged configuration are returned. The existing booking, quote, inventory, approval, decline, calendar, guest ownership, CSRF, private tracking and XLSX endpoints continue to implement the workflow.

The booking form explains missing dates, invalid checkout, missing sessions, invalid quantities, excess configured capacity and missing acknowledgements. Backend validation and PostgreSQL allocation constraints remain authoritative. Demo submissions require fictitious `DEMO` names and `@example.test` emails. Normal anti-abuse rate limits remain active; automated tests use distinct fictitious addresses rather than disabling those protections.

Demo email delivery and remote spreadsheet synchronization are blocked in application code, including direct sync and worker calls. They are also removed from the demo launch environment. Reservation-only downloads work locally. Payment/provider endpoints remain retired, and demo reservations create no payments, charges, payment claims or checkout transactions. Demo login/guest cookies are separately named to avoid replacing normal website sessions.

Reset deletes only explicitly registered demo reservations and their dependent sample items/allocations/history/notes, preserves unmarked data and all migrations, and refuses deletion if historical financial rows are attached. The owned catalog/units are restored idempotently, and the five scenarios are created through the existing booking and staff-decision code. Reference counters are not rewound.

## Verification

| Check | Result |
| --- | --- |
| ESLint | Passed, no errors/warnings |
| TypeScript | Passed |
| Normal production build | Passed |
| Optimized local demo build | Passed |
| Full project suite, `BOOKING_BROWSER_TESTS=1 npm test` | **52 passed, 0 failed, 0 skipped**, including real isolated PostgreSQL and browser tests; 236.5 seconds |
| Dedicated `npm run demo:verify` | **15 verification groups passed** against the optimized demo server; no browser runtime errors; five sample scenarios restored |
| Normal-environment browser check | Passed: demo mode false, no demo banner or DEMO DATA labels in the normal optimized build |

The dedicated check covers seven actual browser submission flows: accommodation, swimming with child quantity, adventure, dining, combined four-service reservation, multiple adventures and a physical cottage. It checks PostgreSQL creation, one reference for combined services, Pending Approval, administrator/staff decisions and updated private tracking. The adventure decline includes a meaningful response. Public source image responses, existing public booking links, seven viewport widths (320, 375, 390, 430, 768, 1024, 1440), missing-date button behavior, calendar views and parsed 16-column reservation XLSX are included.

Additional checks cover fully booked inventory, live calendar availability, absence of financial rows, rejection of real guest details, delivery suppression, repeated seed/reset, guard rejection and preservation of an explicitly unmarked synthetic reservation during reset. Development and optimized local builds are both used; success is not inferred from compilation alone.

Saved evidence is private under `.local/client-demo-audit/`:

- [Project test log](../../.local/client-demo-audit/test-output.txt), [normal build log](../../.local/client-demo-audit/build-output.txt), [demo build log](../../.local/client-demo-audit/demo-build.txt), [ESLint](../../.local/client-demo-audit/lint-output.txt), [TypeScript](../../.local/client-demo-audit/typecheck-output.txt).
- [Dedicated demo verification log](../../.local/client-demo-audit/verification-output.txt) and [structured results](../../.local/client-demo-audit/demo-verification.json).
- [Desktop dashboard](../../.local/client-demo-audit/demo-dashboard-1440.png), [small phone dashboard](../../.local/client-demo-audit/demo-dashboard-320.png), [mobile booking](../../.local/client-demo-audit/demo-booking-390.png), [combined details](../../.local/client-demo-audit/demo-combined-details.png), and [sample reservation XLSX](../../.local/client-demo-audit/demo-reservations.xlsx).
- [Normal database preservation comparison](../../.local/client-demo-audit/original-data-preserved.json): original catalog configuration and counts match the initial snapshot; its **2 reservations and 10 migrations** remain unchanged.
- [Final live demo state](../../.local/client-demo-audit/final-state.json): 16 active services, 13 active physical units, five reservations (2 pending, 2 confirmed, 1 declined), 10 migrations, zero payments and zero financial charges. The optimized demo is running at `http://127.0.0.1:3001`.
- [Normal environment browser result](../../.local/client-demo-audit/normal-mode-output.txt): demo UI absent when the explicit mode is disabled.

## Files changed for this task

| Area | Files |
| --- | --- |
| Provision, seed, reset, verify | `scripts/booking-demo.ts`, `scripts/demo/catalog.ts`, `scripts/demo/seed.ts`, `scripts/demo/verify.ts` |
| Mode guard and startup | `src/lib/booking/demo-mode.ts`, `src/instrumentation.ts`, `src/lib/booking/db.ts` |
| Reservation/data integration | `src/lib/booking/cart.ts`, `src/lib/booking/commerce-api.ts`, `src/lib/booking/admin-insights.ts`, `src/lib/booking/readiness.ts`, `src/app/api/reservations/[...path]/route.ts` |
| Delivery/session isolation | `src/lib/booking/jobs.ts`, `src/lib/booking/security.ts`, `src/lib/booking/guest-access.ts` |
| Existing UI and demo labels | `src/components/booking/demo-notice.tsx`, `public-services.tsx`, `cart-checkout.tsx`, `dashboard.tsx`, `admin-overview.tsx`, `reservation-drawer.tsx` in that directory; `src/app/layout.tsx`, `src/app/globals.css` |
| Local build/configuration | `next.config.ts`, `tsconfig.json`, generated `next-env.d.ts`, `eslint.config.mjs`, `.gitignore`, `.env.demo.example`, `package.json` |
| Regression coverage | `tests/demo.test.ts`; existing reservation/browser tests were executed |
| Documentation | `README.md`, `docs/archive/BOOKING-DEMO.md` historical notice, `docs/CLIENT-DEMO-GUIDE.md`, this report |

No new dependencies were installed, no original guest records were edited, and no demonstration data was deployed to production.

## Remaining approval and operational limits

The local demonstration intentionally makes no claim of client approval for sample pricing, inventory, rooms/beds/amenities, capacities, activity operation, safety/age rules, schedules or policies. Actual email delivery and remote spreadsheet sync are deliberately disabled. Private tracking works in the browser used to submit; no demonstration email-access recovery is delivered. The example cottage photo remains contextual. Use a different fictitious email for repeated presentations because normal anti-abuse limits remain active.

Start locally using `npm run demo:start` (optimized, after `demo:build`) or `npm run demo:dev`. Initialize a fresh isolated target using `demo:provision` then `demo:setup`; reset using `demo:reset`. The existing project/database stays separate. Nothing was published or deployed.
