# Paraiso de June Quixote — resort website and reservations

The public website, staff dashboard and reservation API run together as one Next.js application. The backend lives in `src/app/api/reservations` and `src/lib/booking`; staff UI lives in `src/components/admin`, guest reservation UI in `src/components/booking`, and migrations in `db/migrations`.

[Setup](docs/SETUP_GUIDE.md) · [Project structure](docs/PROJECT_STRUCTURE.md) · [Documentation index](docs/README.md) · [Cleanup report](docs/CLEANUP_REPORT.md)

**Current implementation: [Reservation-only dashboard and staff guide](docs/RESERVATION-SYSTEM.md#reservation-only-dashboard-cleanup--22-november-2026).** Customers select one or more services and submit without online payment. Authorized staff approve or decline requests; only approvals reserve inventory. Secure tracking, staff calendars and Excel exports remain integrated into the existing Next.js/PostgreSQL website.

Historical payment records remain unchanged in PostgreSQL, with a protected read-only archive. Payment processing, financial management, callbacks and financial reporting are retired for the entire website. Staff handle payments face-to-face, outside the website. Real inventory, active sessions, approved policies and SMTP/private worker settings still require resort configuration; no live guest email delivery or production deployment is claimed.

**Start with [Reservation setup and staff guide](docs/RESERVATION-SYSTEM.md).** It covers database migrations, first administrator, verified inventory, SMTP, Microsoft authorization, worker scheduling, deployment, tests, security and limitations. `.env.example` lists server-only settings. This is now a server application: deploy with a Next.js Node runtime, not the previous `out/` export.

## Run

For the isolated client presentation, see [Client demo guide](docs/CLIENT-DEMO-GUIDE.md). Start the prepared demo with `npm run demo:dev` at `http://127.0.0.1:3001`. Its private database, credentials and labelled sample data are separate from `.env.local` and the normal website.

Use Node.js 22+ and npm (Node 24 used for verification). PostgreSQL setup is required to accept reservations.

```sh
npm ci
# Copy .env.example to .env.local and configure DATABASE_URL / APP_URL.
npm run db:migrate
npm run db:seed
# Create the first administrator using the guide linked above.
npm run dev
```

For a production build and local server:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm start
```

The server opens on port 3000. Run the build before `npm test`: the tests launch an isolated PostgreSQL cluster and production server on free ports. They never use the resort database. Set `BOOKING_BROWSER_TESTS=1` to include Edge/Chromium checks. `npm run preview` is an alias for `next start`.

## Public pages

`/`, `/about/`, `/accommodations/`, `/adventures/`, `/pool-cottages/`, `/dining/`, `/gallery/`, `/guest-reviews/`, `/packages/`, `/contact/`, `/faq/`, plus the 404 page. `/booking/` accepts guest requests; `/admin/login/` and `/admin/dashboard/` are private staff routes. Receipt pages require a private cookie; references alone do not expose guest details.

## Edit content

- `src/config/site.ts`: business information, verified map, hero photo, domain, indexing.
- `src/config/media.ts`: approved photo paths shared by the homepage, inner pages, and gallery.
- `public/branding/icon.svg`: transparent white resort emblem; `icon-on-light.svg` is the matching dark variant for cream headers and the favicon. `src/config/branding.ts` imports both with content-hashed URLs.
- `src/config/booking.ts`: internal reservation links and contextual inquiry paths.
- `src/data/`: typed accommodation, activity, gallery, package, and FAQ content.
- `src/data/reviews.ts`: genuine, permission-cleared Google testimonials, published only with `approved: true`. Until supplied, a genuine empty state appears. Guests write reviews directly on Google Maps; see [the review guide](docs/GUEST_REVIEWS.md) for the manual update workflow.
- `src/config/google-reviews.ts`: the exact official Google Maps listing and optional owner-verified `writeReviewUrl`. No API keys, database, review scraping, or paid services are used.
- `src/data/accommodations.ts` and `src/data/accommodation-photo-catalog.json`: room labels, photo associations, confirmed facts and optional configurations. See [the accommodations redesign report](docs/reports/ACCOMMODATIONS_REDESIGN.md) for the room routes, image inventory and remaining content requirements.
- `public/images/`: approved local photographs. Use optimized WebP or AVIF where practical.
- `src/app/globals.css`: responsive design system and page compositions.
- `src/styles/fonts.css` and `public/fonts/`: self-hosted Fraunces and Manrope, with OFL licenses.

The uploaded resort photographs are integrated through a visually reviewed catalog in `src/data/photo-catalog.json`. Original uploads remain intact; responsive delivery sources are in `src/data/image-variants.json`. Run `npm run images:prepare` after updating the catalog or replacing a photo; production builds run it automatically. No stock or generated resort imagery was added. The supplied resort emblem uses its original artwork in transparent white and forest-green variants; see [the logo fix report](docs/reports/LOGO_UPDATE.md). Current rates, operating hours, and room categories still need confirmation. The published address and Google Maps listing were verified on 18 November 2026; map settings are centralized in `src/config/site.ts`. Photographs describe visible subjects without creating bookable room inventory or confirming activity operation.

The gallery includes 36 distinct resort photographs with category filters, incremental loading, and a full-photo dialog. The viewer supports next/previous buttons, arrow keys, touch swipes, Escape, focus containment, and focus restoration. Original full-resolution uploads are linked from the viewer. Add verified subjects and descriptions to the catalog; `src/config/media.ts` supplies the shared page mappings and the gallery. See [the image integration report](docs/reports/IMAGE-INTEGRATION.md) for the inventory, validation, and file list.

## Deploy

Set the final HTTPS domain in `src/config/site.ts`; verify business content before setting `allowIndexing: true`. Canonical URLs and sitemap entries are generated only when a domain is configured. Rebuild after content or integration configuration changes.

Deploy to a Next.js-capable Node host or Vercel. Build with `npm run build` and start a Node service with `npm start`. Run migrations against the configured PostgreSQL database and seed only the existing room catalog. Keep imported options inactive until verified capacities and actual room identifiers have been entered by an administrator. No prices, room counts or availability are inferred from photos.

Configure server environment variables, the final HTTPS `APP_URL`, email/Microsoft authorization if required, and a private scheduler for the job worker. See the [complete deployment and integration guide](docs/RESERVATION-SYSTEM.md). Public pages still prerender where possible; booking data, reports and staff endpoints run on the server. Do not publish `.env.local`, database files, exports or old `out/` artifacts.

## Handoff and audit

- [Dynamic features, content editing, inquiry setup, and verification](docs/reference/DYNAMIC_EXPERIENCE.md)
- [Current premium motion system, modified files, and validation](docs/reference/PREMIUM_MOTION_IMPLEMENTATION.md)
- [Previous reveal implementation and validation](docs/archive/PREMIUM_MOTION.md)
- [Current homepage photo selection and cleanup results](docs/reports/HOMEPAGE_IMAGE_CLEANUP.md)
- [Verified resort map, directions, and configuration](docs/LOCATION_MAP.md)
- [How to add homepage promotions and announcements](docs/HOW_TO_ADD_PROMOTIONS.md)
- [Reservation system setup, staff workflow, integrations and implementation file list](docs/RESERVATION-SYSTEM.md)
- [Previous partner booking integration](docs/archive/BOOKING-INTEGRATION.md)
- [Client assets and information](docs/CONTENT-CHECKLIST.md)
- [Conversion inventory and final structure](docs/archive/STATIC-CONVERSION.md)
- [Verification results](docs/VERIFICATION.md)
- [Visual redesign audit, file inventory, and handoff](docs/reports/REDESIGN-REVIEW.md)

The original full-stack scaffold is preserved in Git commit `30db04f`. Inspect it with `git show 30db04f:path/to/file`. The current integrated reservation system is implemented directly in the existing website; restoring the old scaffold is unnecessary.

The complete existing static implementation, including the user's previously uncommitted work, is preserved in checkpoint `6eed50b` before this visual redesign. That checkpoint describes the earlier design work; the new reservation backend is documented separately in the reservation guide.
