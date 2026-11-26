# Reservation reference mismatch correction

## Root cause

The configured `paraiso_dev` PostgreSQL database contained `PDJ-2026-000004` with `status=CONFIRMED`, `workflow_status=CONFIRMED` and a null `public_tracking_reference`. All four existing reservations lacked public references. The reservation was saved correctly.

The earlier tracking implementation intentionally accepted only cryptographically random public references, protecting guests from sequential-number guessing. However, staff directory and overview queries still selected/displayed the internal number, and the migration had not populated public references on older records. Staff therefore saw a reference that public tracking correctly refused. This was a data/display integration gap, not an error-message problem or missing reservation.

## Correction

- `scripts/booking-admin.ts` now backfills missing references within its existing locked migration transaction, using `backfillTrackingReferences` in `src/lib/booking/public-tracking.ts`. It uses Node `randomBytes(24)` (192 bits), preserves existing public references, and audits issuance. Running `npm run db:migrate` again is safe and does not rotate references.
- `src/lib/booking/service.ts` returns the public reference in staff listings and accepts either public or internal reference in protected staff search. UUIDs, internal numbers, relationships, status, version and guest fields remain intact.
- Staff overview, calendar, reports preview, change requests, notification list and reservation directory now select/display the public reference. Corresponding queries are in `admin-insights.ts`, `reports.ts`, `changes.ts` and the existing reservation route handler. The original dashboard components and layout remain in use.
- `src/components/admin/reservation-drawer.tsx` presents the public reference with the new `copy-tracking-reference.tsx` control. The sequential number is labeled **Internal reference (staff records only)**. Staff confirm a legacy guest's booking details before sharing the public reference. Public lookup never accepts sequential numbers as a substitute.
- Staff-created booking notices and optional guest email messages now use the public reference. Existing financial processing and internal workbook synchronization keys are unchanged.
- Public lookup returns exactly `reference`, mapped `status` and a generic `message`. Existing PostgreSQL rate limits, strict input/body validation, parameterized queries, private/no-store responses and generic database errors remain enforced. It needs no login, registration, email input or email link.
- Only narrowly scoped wrapping rules were added to the existing admin CSS for longer references. The resort design and unrelated pages were preserved.

## Local record preservation

Applied backfill to the configured local PostgreSQL database. Before/after comparison verified all four complete reservation rows were identical except for the new public reference; all seventeen pre-existing history entries and all payment rows were retained. New issuance audit entries were added. No test reservations were inserted into this database. `PDJ-2026-000004` now has a stored public reference and lookup returns Approved. Its exact reference was supplied in the private task response, rather than committed into documentation.

## Verification

Final verification: **55 passed, 0 failed, 0 skipped**, with both `BOOKING_BROWSER_TESTS=1` and `TRACKING_BROWSER_TESTS=1` enabled (`npm test`, approximately 194 seconds). Production build, standalone TypeScript check, ESLint and `git diff --check` passed. Mobile/desktop staff reference and approval-dialog screenshots were visually inspected.

The running local website's actual tracking endpoint was also checked for the repaired existing record: HTTP 200, CONFIRMED/Approved, and exactly the three public response fields. It disclosed no guest data.

- Migration regression checks null legacy references, preserved reservation fields/history, stable references on repeat execution and a single issuance audit entry.
- HTTP/PostgreSQL tests check new booking persistence, staff search by public reference, exact status-only payloads, approval/decline/cancellation, validation, throttling, database errors and sequential-reference rejection.
- Real-browser tests submit a booking, copy its confirmation reference, reload, return in a fresh browser context, find the same record in the admin dashboard, copy the staff reference and perform all three decisions through the existing dashboard controls.
- Responsive checks cover customer tracking at 320–1440px and staff reference display at 320, 390, 768 and 1440px, alongside the broader admin/staff regression suite.

Run `npm run db:migrate` before deploying this correction to another database. The local backfill is already applied.
