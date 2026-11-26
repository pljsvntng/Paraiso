# Initial cleanup audit

Recorded before structural changes on 22 November 2026. This is a working Next.js 16 App Router application with an integrated reservation API and PostgreSQL backend. Its framework entry points must stay under `src/app`, with `public` and configuration at the project root.

## Reversible checkpoint

The existing modified and untracked source, scripts, tests, configuration, migrations and documentation were copied to `.local/cleanup-checkpoints/2026-11-22T07-06-53-001Z`. The checkpoint also contains the pre-cleanup Git status, a binary patch for tracked changes, and SHA-256 hashes for all 431 inventoried files. All 215 public assets were hashed and will remain in place; their original files are not candidates for removal. Environment files, credentials, database files and existing backups remain in their original locations and are not copied into shareable documentation.

The checkpoint was created without a commit, stash, reset or overwrite of existing work. The audit's machine-readable inventory is `.local/cleanup-work/audit.json`.

## Findings

| Area | Evidence and decision |
| --- | --- |
| Framework layout | `src/app`, `src/lib/booking`, `db/migrations`, `public`, `scripts` and `tests` are active. Keep one Next.js application and its existing routes; splitting into separately built frontend/backend projects would add risk without improving this codebase. |
| Components | Guest checkout/tracking and staff dashboards currently share `src/components/booking`. Move staff-specific components to `src/components/admin`, preserving their markup, state and CSS. |
| Reusable client utilities | Fetch helper is inside the booking component directory; generic date/carousel hooks are inside `components/shared`. Move to `src/lib/api` and `src/hooks`. |
| Naming | `BookingCTA.tsx` is inconsistent with surrounding kebab-case filenames; `commerce-admin.tsx` now contains only the reservation calendar. Rename to `booking-cta.tsx` and an admin calendar filename. |
| Scripts | Three static-export scripts are not referenced by active package commands. Archive them under `scripts/legacy`; retain the tools and old output reversibly. Separate image tools, demo support modules and test helpers by responsibility. Preserve CLI entry scripts and their guard-sensitive paths. |
| Documentation | Historical payment/static-site instructions and implementation reports share one flat directory with current setup/demo guides. Group reports, reference guides and historical documents, updating local links. Add current structure/setup/cleanup entry documents. |
| Generated output | `out/` is the obsolete static deployment artifact. Active deployment is `next build`/`next start`; archive `out/` under ignored `.local/archive` instead of deleting it. Keep `.next`, the running `.next-demo`, `node_modules`, all database clusters and backups. |
| Unreferenced components | Static import analysis found `src/components/booking/booking-form.tsx` and `src/components/experience-story.tsx` with no inbound source imports. Retain both for review; do not remove them solely on that analysis. |
| Duplicate photos | One pair of original accommodation WebPs and three pairs of generated responsive images are byte-identical. Retain every copy. Catalog aliases and original-photo preservation requirements make deletion inappropriate without approval. |
| Empty directory | `public/images/resort` is empty. Remove only this empty directory after a fresh emptiness/path check. |
| Dependencies | Direct runtime dependencies are referenced, except `react-dom`, which is required by React/Next.js even without a direct app import. Retain all dependencies; no package pruning is justified. |
| Large files | Admin/global CSS, checkout, dashboard, staff forms and historical finance/backend modules are large. Avoid splitting their behavior or CSS cascade during a structural cleanup. Staff component relocation supplies separation without a redesign. |
| Import resolution | Initial TypeScript import inventory found no unresolved local imports. Re-run after relocation. |

## Before structure

```text
Paraiso/
  src/
    app/                    # Public/admin routes and API; keep these paths
    components/
      booking/              # Guest UI, staff UI, types, fetch helper, hooks mixed
      shared/               # Shared components and hooks mixed; BookingCTA.tsx
      accommodations/, gallery/, layout/, promotions/, reviews/, ui/
    lib/booking/            # Server-side reservation/database operations
    config/, data/, styles/, types/
  scripts/                  # Active CLIs, demo helpers, image tools, old export tools
  tests/                    # Tests and browser helper mixed
  docs/                     # Flat current guides, reports, historical instructions
  PARAISO_WEBSITE_AUDIT.md
  public/, db/migrations/
  out/                      # Obsolete static export
  .next/, .next-demo/, .local/, node_modules/   # Protected generated/private state
```

## Planned validation

Resolve all imports and package entry paths; validate Markdown links and image references; compare public asset and stylesheet hashes; run ESLint, TypeScript, the production builds and existing PostgreSQL/browser tests; verify database connectivity without changing the normal database; inspect actual public/admin/mobile rendering against before screenshots. Exercise demo workflows only in their verified isolated database, preserving the client presentation configuration.
