# Static website conversion report

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

Completed 16 November 2026 (Asia/Manila).

## Repository scan and preservation

The initial project contained 29 files: configuration, a Prisma schema, backend utilities and API routes, and seven preliminary UI components. There were no complete public pages, photographs, official logos, admin pages, partner-owned modules, or existing Git repository. Imports and references were inspected before cleanup.

Created a local Git repository and committed **all original project files** as `30db04f` (`checkpoint: preserve full-stack scaffold before static conversion`). Nothing from the original scaffold has been lost: use `git show 30db04f:<path>` to retrieve an individual file. No partner-owned implementation was identified or modified. The separate partner booking project was not accessed.

## Deleted files and reasons

| Files | Reason |
| --- | --- |
| `prisma/schema.prisma` | Database models are outside the static website scope. |
| `src/app/api/auth/[...nextauth]/route.ts` | Server authentication endpoint removed. |
| `src/app/api/availability/route.ts` | Runtime availability queries removed. |
| `src/app/api/inquiries/route.ts` | Database-backed inquiry submission removed. |
| `src/app/api/payments/route.ts` | Payment endpoint removed, including its disabled placeholder response. |
| `src/app/api/reservations/route.ts` | Reservation processing removed. |
| `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/email.ts` | Auth.js, Prisma connection, and transactional notifications removed. |
| `src/lib/reservations.ts`, `src/lib/security.ts`, `src/lib/validation.ts` | Server reservation, API security, and guest form logic removed. |
| `src/lib/content.ts` | Database-backed content access replaced by typed local data. |
| `src/components/quick-booking.tsx` | Reservation controls and links to a nonexistent booking page removed. |
| `.env.example` | No backend credentials or environment setup is required. |

Removed the now-empty API and Prisma directories after checking they contained no files. No migrations, uploaded media, admin work, or approved brand assets existed to remove.

## Modified and preserved files

- `next.config.ts`: static export, trailing slash route directories, unoptimized local images; removed server-only header configuration.
- `package.json`: frontend-only runtime dependencies and npm build, lint, typecheck, preview, and static audit scripts. Created npm's lockfile without changing package managers.
- `.gitignore`: excludes generated export output and local build/review artifacts.
- `src/components/layout/header.tsx`: retained brand/navigation structure; added central CTAs, active links, scroll-to-solid styling, and a native dialog mobile menu with browser focus handling and Escape dismissal.
- `src/components/layout/footer.tsx`: retained footer structure; replaced booking/admin/dead legal links with real static page links and centralized CTAs.
- `src/components/media.tsx`: retained reusable media rendering; now supports local static images and clearly labeled photography placeholders.
- `src/components/reveal.tsx`: preserved restrained Motion reveals and reduced-motion support; formatted for readability.
- `src/components/ui/button.tsx`: preserved the selective shadcn-style button primitive and its Radix composition support; formatted for readability.
- `src/lib/utils.ts`: preserved class-name helpers; removed the unused pricing formatter.
- `postcss.config.mjs`: retained Tailwind configuration and fixed the anonymous export lint warning.
- `components.json`, `eslint.config.mjs`, `tsconfig.json`, `next-env.d.ts`: retained compatible frontend configuration; normalized formatting/generated Next.js declarations.

## New implementation

- Ten explicit public page files, a shared layout, static 404, robots file, and sitemap.
- Responsive visual system in `src/app/globals.css` using forest green, warm ivory, lagoon, terracotta, and restrained gold.
- Self-hosted Fraunces and Manrope, with their open font licenses. No runtime font service requests.
- `src/config/site.ts`, `src/config/booking.ts` and reusable `BookingCTA.tsx`.
- Typed local data collections in `src/data/` and types in `src/types/content.ts`.
- Gallery category filters and an approved-image-only lightbox using a native dialog.
- Filterable native FAQ disclosures, reusable page introductions, and visit notes.
- Page-specific metadata, domain-aware canonical URLs, noindex review defaults, and static-host security header suggestions.
- Local static preview and built-export audit scripts; optional font asset maintenance script.
- README, partner integration guide, client checklist, this inventory, verification report, and review screenshots.

## Dependencies removed

`@prisma/client`, `prisma`, `next-auth`, `@auth/prisma-adapter`, `zod`, `resend`, `cloudinary`, `tsx`, `vitest`, and `@electric-sql/pglite`.

Retained Next.js, React, TypeScript, Tailwind, Lucide, Motion, and the small styling/primitive packages actually used by the existing UI. Tests use Node's built-in test runner; no browser or database test framework is required in production or for the export audit. Ran npm prune to remove an extraneous package left by the interrupted initial installation.

## Final structure

```text
src/
  app/
    layout.tsx, page.tsx, globals.css, not-found.tsx
    about/page.tsx
    accommodations/page.tsx
    adventures/page.tsx
    pool-cottages/page.tsx
    dining/page.tsx
    gallery/page.tsx
    packages/page.tsx
    contact/page.tsx
    faq/page.tsx
    robots.ts, sitemap.ts
  components/
    layout/{header,footer}.tsx
    gallery/resort-gallery.tsx
    shared/{BookingCTA,page-intro,visit-note,faq-list}.tsx
    ui/button.tsx
    media.tsx, reveal.tsx
  config/{site,booking}.ts
  data/{accommodations,adventures,gallery,packages,faq}.ts
  lib/{utils,metadata}.ts
  styles/fonts.css
  types/content.ts
public/
  branding/icon.svg
  fonts/                       # local fonts + OFL licenses
  images/                      # category directories ready for approved assets
  _headers
scripts/
  preview.mjs
  static-audit.test.mjs
  fetch-fonts.mjs
docs/
  BOOKING-INTEGRATION.md
  CONTENT-CHECKLIST.md
  STATIC-CONVERSION.md
  VERIFICATION.md
  screenshots/
README.md
package.json, package-lock.json
next.config.ts, tsconfig.json, components.json
postcss.config.mjs, eslint.config.mjs, next-env.d.ts
out/                           # generated, ignored, deployable static output
.local/paraiso-static.zip       # generated, ignored, packaged export
```

## Design review

The homepage uses an editorial typographic hero, a compact route strip, a landscape story section, a dark adventure feature with numbered links, a calm stay composition, a lagoon pool section, and a warmer dining composition. Page compositions use open typography, rules, and asymmetric media rather than repetitive cards. Interactions support navigation and content exploration; no autoplay, carousels, excessive shadows, or decorative continuous motion were added.

No fake photographs, testimonials, statistics, prices, room categories, availability, reviews, or package inclusions appear. The hero and media graphics are explicitly design placeholders, not depictions of actual facilities. Authenticity remains dependent on receiving approved photographs and business information, as documented in the client checklist.

## Handoff and remaining work

All booking-related links use one configuration and one component. The partner can connect a verified external reservation URL without adding booking code here; see `BOOKING-INTEGRATION.md`.

The code and export are complete for the static scope. Before public launch the client still needs to approve actual photographs, proposed branding and copy, exact location, contact details, current facilities/rates, and the final domain. The gallery's live photo viewer awaits approved media. No external site was published, no database was provisioned, and no partner-owned system was modified.
