# Project cleanup report

The cleanup reorganizes the existing Next.js application without redesigning pages, changing reservation rules or creating separate frontend/backend packages. The [initial audit](CLEANUP_AUDIT.md) was written before file moves. The [structure guide](PROJECT_STRUCTURE.md) describes the final layout, and the [setup guide](SETUP_GUIDE.md) documents normal and demo startup.

## Checkpoint and reversibility

Pre-cleanup source, scripts, configuration, tests, migrations and documentation are preserved in `.local/cleanup-checkpoints/2026-11-22T07-06-53-001Z`, alongside the original Git status, tracked-file binary patch and SHA-256 manifest. Uncommitted/untracked work was retained. No reset, stash, commit, rebase or index rewrite was used.

All move targets were resolved and checked to remain inside `C:\projects\Paraiso` before mutation. The generated static artifact and incremental cache were archived within the project. No OneDrive folder or other project was changed.

To reverse a relocation, use the table below and its original checkpoint copy; move only the listed destination back to its original path, then restore the corresponding changed imports/configuration from the checkpoint. Do not overwrite newer edits or replace private database/environment state. The old generated export and incremental cache can be moved back from their documented archive paths if needed. The only directory removed was empty and can be recreated with `New-Item -ItemType Directory public/images/resort`.

## What changed

- Moved thirteen staff components/types into `src/components/admin`. Renamed the calendar-only `commerce-admin.tsx` to `calendar.tsx` and shortened redundant admin filename prefixes. Component exports, markup, class names, state, permissions and behavior are preserved.
- Kept guest checkout, tracking, public service cards and availability under `src/components/booking`. Moved the shared browser fetch helper to `src/lib/api/reservations.ts` and the three existing hooks to `src/hooks`.
- Standardized the shared CTA filename to `booking-cta.tsx`; all imports use the existing named `BookingCTA` export.
- Grouped image/font maintenance under `scripts/assets`, demo support modules under `scripts/demo`, and the browser test helper under `tests/helpers`. Stable administrator and guarded demo CLI entry paths are unchanged. Updated package commands/imports and the font utility's relative font-directory and stylesheet-output URLs.
- Moved historical export tools to `scripts/legacy`; they remain available for reference but are not active deployment/test commands.
- Grouped implementation reports under `docs/reports`, detailed interaction notes under `docs/reference`, and superseded instructions under `docs/archive`. Updated Markdown links and project-relative source references. Added clear historical notices and a current documentation index.
- Retained the framework routes, CSS entry files, backend operation modules and all ten migration files at their original paths. Kept one Node application and one dependency lockfile.
- Placed the incremental TypeScript cache under ignored `.local/cache` and explicitly excluded private `.local` artifacts/checkpoints from type checking.

### Relocated files

| Original path | New path |
| --- | --- |
| `src/components/booking/admin-ui.tsx` | `src/components/admin/ui.tsx` |
| `src/components/booking/admin-types.ts` | `src/components/admin/types.ts` |
| `src/components/booking/admin-shell.tsx` | `src/components/admin/shell.tsx` |
| `src/components/booking/admin-overview.tsx` | `src/components/admin/overview.tsx` |
| `src/components/booking/admin-forms.tsx` | `src/components/admin/forms.tsx` |
| `src/components/booking/commerce-admin.tsx` | `src/components/admin/calendar.tsx` |
| `src/components/booking/dashboard.tsx` | `src/components/admin/dashboard.tsx` |
| `src/components/booking/login-form.tsx` | `src/components/admin/login-form.tsx` |
| `src/components/booking/service-workspace.tsx` | `src/components/admin/service-workspace.tsx` |
| `src/components/booking/service-fields.tsx` | `src/components/admin/service-fields.tsx` |
| `src/components/booking/reservation-records.tsx` | `src/components/admin/reservation-records.tsx` |
| `src/components/booking/reservation-drawer.tsx` | `src/components/admin/reservation-drawer.tsx` |
| `src/components/booking/operations-panels.tsx` | `src/components/admin/operations-panels.tsx` |
| `src/components/booking/booking-api.ts` | `src/lib/api/reservations.ts` |
| `src/components/booking/use-admin-resource.ts` | `src/hooks/use-admin-resource.ts` |
| `src/components/shared/use-resort-date.ts` | `src/hooks/use-resort-date.ts` |
| `src/components/shared/use-scroll-carousel.ts` | `src/hooks/use-scroll-carousel.ts` |
| `src/components/shared/BookingCTA.tsx` | `src/components/shared/booking-cta.tsx` |
| `scripts/demo-catalog.ts` | `scripts/demo/catalog.ts` |
| `scripts/demo-seed.ts` | `scripts/demo/seed.ts` |
| `scripts/demo-verify.ts` | `scripts/demo/verify.ts` |
| `scripts/prepare-images.mjs` | `scripts/assets/prepare-images.mjs` |
| `scripts/fetch-fonts.mjs` | `scripts/assets/fetch-fonts.mjs` |
| `scripts/preview.mjs` | `scripts/legacy/preview-static.mjs` |
| `scripts/finalize-export.mjs` | `scripts/legacy/finalize-export.mjs` |
| `scripts/static-audit.test.mjs` | `scripts/legacy/static-audit.test.mjs` |
| `tests/admin-workspace-browser.ts` | `tests/helpers/admin-workspace-browser.ts` |
| `docs/CLIENT-DEMO-READINESS.md` | `docs/reports/CLIENT-DEMO-READINESS.md` |
| `docs/DASHBOARD-CRASH-FIX.md` | `docs/reports/DASHBOARD-CRASH-FIX.md` |
| `docs/ADMIN-REDESIGN.md` | `docs/reports/ADMIN-REDESIGN.md` |
| `docs/ACCOMMODATIONS_REDESIGN.md` | `docs/reports/ACCOMMODATIONS_REDESIGN.md` |
| `docs/IMAGE-INTEGRATION.md` | `docs/reports/IMAGE-INTEGRATION.md` |
| `docs/HOMEPAGE_IMAGE_CLEANUP.md` | `docs/reports/HOMEPAGE_IMAGE_CLEANUP.md` |
| `docs/LOGO_UPDATE.md` | `docs/reports/LOGO_UPDATE.md` |
| `docs/REDESIGN-REVIEW.md` | `docs/reports/REDESIGN-REVIEW.md` |
| `docs/BOOKING-DEMO.md` | `docs/archive/BOOKING-DEMO.md` |
| `docs/BOOKING-PAYMENTS.md` | `docs/archive/BOOKING-PAYMENTS.md` |
| `docs/BOOKING-INTEGRATION.md` | `docs/archive/BOOKING-INTEGRATION.md` |
| `docs/STATIC-CONVERSION.md` | `docs/archive/STATIC-CONVERSION.md` |
| `docs/IMPLEMENTATION-HANDOFF.md` | `docs/archive/IMPLEMENTATION-HANDOFF.md` |
| `docs/PREMIUM_MOTION.md` | `docs/archive/PREMIUM_MOTION.md` |
| `docs/CINEMATIC_SCROLL_GUIDE.md` | `docs/reference/CINEMATIC_SCROLL_GUIDE.md` |
| `docs/DYNAMIC_EXPERIENCE.md` | `docs/reference/DYNAMIC_EXPERIENCE.md` |
| `docs/MOTION_IMPLEMENTATION.md` | `docs/reference/MOTION_IMPLEMENTATION.md` |
| `docs/NATIVE_SCROLL_PERFORMANCE.md` | `docs/reference/NATIVE_SCROLL_PERFORMANCE.md` |
| `docs/PREMIUM_MOTION_IMPLEMENTATION.md` | `docs/reference/PREMIUM_MOTION_IMPLEMENTATION.md` |
| `PARAISO_WEBSITE_AUDIT.md` | `docs/reports/WEBSITE_AUDIT.md` |

### Archived generated output

| Original | Preserved location |
| --- | --- |
| `out/` | `.local/archive/static-export-before-cleanup-20261122/` |
| `tsconfig.tsbuildinfo` | `.local/archive/typescript-before-cleanup.tsbuildinfo` |

No files were permanently deleted. Removed only the verified empty directory `public/images/resort`. No environment files, credentials, database records/clusters, migrations, original resort photographs, dependencies, client demo records or existing backups were removed.

## Retained for review

| Item | Decision |
| --- | --- |
| `src/components/booking/booking-form.tsx` | No inbound source imports found, but it is a compatibility wrapper/export. Retained for review. |
| `src/components/experience-story.tsx` | No inbound source imports found. Retained; no visual/behavioral removal inferred from static analysis alone. |
| `public/images/accommodations/bunkhouse.webp` and `bunk_room_professionally_aligned_full.webp` | Byte-identical originals, retained under existing names/URLs. |
| `public/images/optimized/bunkhouseInterior-319ae17cb606-{160,480,960}.webp` and corresponding `bunkRoom-319ae17cb606-{160,480,960}.webp` | Three duplicate derivative pairs retained; content catalogs and photo aliases are unchanged. |
| Historical financial/archive modules and migrations | Still support protected historical records and compatibility. Not removed as unused code; no payment processing was introduced. |
| Large CSS/checkout/dashboard/backend files | Logical folder separation completed; deeper component or CSS refactors deferred to avoid changing working behavior/cascade during cleanup. |
| `react-dom` and all installed dependencies | Framework/transitive usage and active imports justify retaining them. No dependency removal was performed. |
| `.local` databases, credentials, browser evidence and backups | Private, ignored, protected and preserved at their existing paths. |
| Loose historical `.local` QA scripts/screenshots/logs | Already outside active source/deployment and may reference earlier backups or evidence; retained for a separately reviewed archival cleanup. |

## Before and after

```text
Before                              After
src/components/booking/             src/components/booking/   guest-facing reservation UI
  guest + staff UI mixed            src/components/admin/     staff views/forms/calendar/types
  booking-api.ts                    src/lib/api/reservations.ts
  use-admin-resource.ts             src/hooks/use-admin-resource.ts
src/components/shared/              src/components/shared/    public shared components
  hooks mixed with components       src/hooks/                 existing date/carousel hooks
  BookingCTA.tsx                    .../booking-cta.tsx
scripts/                            scripts/
  CLIs, assets, demo, old export       booking-admin.ts, booking-demo.ts, private-prompt.ts
                                      assets/, demo/, legacy/
tests/admin-workspace-browser.ts    tests/helpers/admin-workspace-browser.ts
docs/ flat guides + old reports     docs/ current guides + index, reports/, reference/, archive/
PARAISO_WEBSITE_AUDIT.md             docs/reports/WEBSITE_AUDIT.md
out/                               .local/archive/static-export-before-cleanup-20261122/
tsconfig.tsbuildinfo                .local/cache/typescript.tsbuildinfo (old copy archived)
src/app, public, db/migrations      Same framework routes, assets and migrations
```

## Validation

| Check | Executed result |
| --- | --- |
| `npm run lint` | Passed, no warnings or errors |
| `npm run typecheck` | Passed after relocation and cache-path update |
| `npm run build` | Passed; existing public/admin/API routes retained |
| `npm run demo:build` | Passed; relocated staff modules compile into the optimized demo |
| `BOOKING_BROWSER_TESTS=1 npm test` | **52 passed, 0 failed, 0 skipped** in 198.9 seconds, including isolated real PostgreSQL and browser workflows |
| `npm run db:check` | Passed, read-only normal database connection |
| `npm run demo:check` | Passed, existing isolated target identity and restricted role verified |
| Local import/package-command audit | No unresolved imports or broken script targets |
| Markdown links | No broken local links in current or relocated documents |
| Asset/style preservation | All **215 public asset hashes** and every existing stylesheet hash match the checkpoint |
| Source preservation | **126 source modules** checked; no changes except import paths |
| Actual browser rendering | **18 desktop/mobile views** passed, no page overflow, runtime errors or failed responses; dimensions, headings, button counts and image checks match the before pass |
| Database/private-file preservation | All table fingerprints match for the normal and demo databases, and all four private environment/identity/login files match; **2 normal reservations and 7 presentation reservations preserved** |

The browser pass covered home, accommodation detail, swimming, adventures, dining, booking, staff overview, pending requests and calendar at 1440px and 390px. Fourteen screenshots match pixel-for-pixel. Four contain paint/antialiasing variation and the existing transparent/solid mobile header transition; their dimensions and DOM metrics are unchanged. Source and stylesheet checks independently verify that rendering logic and styling were not rewritten.

The automated suites exercised accommodation/day-service reservations, combined requests, staff approval/decline, permissions, private tracking, calendar, export, inventory conflicts and historical-record protection in disposable test databases. The actual presentation database was not seeded or reset as a cleanup test. Its real existing records were preserved, including additions made since the earlier five-scenario setup.

During the local demo rebuild, the embedded PostgreSQL runtime left one orphan I/O worker after its postmaster exited. Its exact project executable, parent and cluster port were verified before stopping only that orphan. The optimized demo restarted successfully at **http://127.0.0.1:3001**, and the complete database fingerprints remained unchanged. No normal PostgreSQL service, database file or schema was altered.

The initial browser pass captured eighteen desktop/mobile views of the public website, reservation form and staff workspace, with no runtime errors or failed responses. Evidence and comparison data live privately under `.local/cleanup-work/`. Read-only database fingerprints were recorded before validation; the actual presentation database was not reset as a cleanup test. Reservation mutation/browser tests ran against disposable PostgreSQL test databases.

Saved evidence: [test output](../.local/cleanup-work/tests.txt), [normal build](../.local/cleanup-work/build.txt), [demo build](../.local/cleanup-work/demo-build.txt), [ESLint](../.local/cleanup-work/lint.txt), [TypeScript](../.local/cleanup-work/typecheck.txt), [import/link/asset audit](../.local/cleanup-work/structure-validation.json), [source preservation](../.local/cleanup-work/behavior-preservation.json), and [pixel comparison](../.local/cleanup-work/visual-comparison.json).

| View | Before | After |
| --- | --- | --- |
| Desktop staff overview | [1440px](../.local/cleanup-work/screenshots/before/dashboard-1440.png) | [1440px](../.local/cleanup-work/screenshots/after/dashboard-1440.png) |
| Mobile pending requests | [390px](../.local/cleanup-work/screenshots/before/pending-390.png) | [390px](../.local/cleanup-work/screenshots/after/pending-390.png) |
| Accommodation detail | [1440px](../.local/cleanup-work/screenshots/before/stay-1440.png) | [1440px](../.local/cleanup-work/screenshots/after/stay-1440.png) |

The screenshots and database fingerprints are private local evidence; do not publish them with the website.

## Remaining limitations

Duplicate/unreferenced review candidates remain intentionally. Archived historical instructions are not active setup guidance. Real resort configuration and the intentionally isolated demo retain their pre-existing approval/delivery limits; this task does not approve rates, send email, migrate production or deploy the site.
