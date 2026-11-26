# Homepage refinement and featured experiences

The alternating feature presentation described here has been superseded by the [interactive resort showcase](HOMEPAGE_INTERACTIVE_SHOWCASE.md). Other homepage refinements remain in place; the category pages are unchanged by that follow-up.

The subsequent [Promotions restoration](HOMEPAGE_PROMOTIONS_RESTORED.md) removes the hidden-empty-section behavior described below. Promotions now follows the interactive showcase and stays visible even when there are no current offers. Original expired posters remain available as clearly labeled past promotions.

## Existing-site audit

The project uses Next.js 16 App Router, React 19, local PostgreSQL reservation services and an existing admin/staff application. The homepage is server-rendered static content with selected client enhancements. Fraunces/Manrope are already self-hosted as the Paraiso Serif/Sans fonts, with forest green, ivory, warm gold and earthy accents.

Reviewed the homepage, accommodation list/details, swimming/cottages, adventures, dining, booking form, public service catalog, shared imagery, promotions, reviews, location and motion components. Existing booking links support intent and exact service-name preselection. Only active services appear in the public catalog; a category match alone does not establish that a particular attraction is bookable.

The former homepage repeated category navigation, separate adventure/pool/stay/dining previews, an empty gallery introduction and another experience link band. The unmounted `ExperienceStory` component offered another overlapping presentation; it remains unchanged and is not added to the page. The shared motion engine already used IntersectionObserver and accessible reveal markers, but the homepage photograph also had a 16-second drift.

## Implementation

Kept the existing navigation, fonts, palette, hero photograph and working public/service pages. Consolidated the category previews into **Discover the Best of Paraiso**, using exactly four editorial selections with alternating photography and text. The flow is now hero → short introduction → four features → garden gathering information → active promotions → approved guest reviews → FAQs → location/contact → final reservation action. The existing promotion date filtering remains active; empty announcement blocks are hidden on the homepage.

| Feature | Existing photographic source | Reason for selection | Details |
| --- | --- | --- | --- |
| Family Deluxe | Owner-labeled `fmly_deluxe.jpg` | Named accommodation with an existing detail page and authentic timber/balcony photograph | `/accommodations/family-deluxe/` |
| Main Pool | Existing main-pool WebP | Clear landscape photo of the resort's principal pool area | `/pool-cottages/` |
| Cable Jeep | Existing `cablejeep.png` | Distinctive attraction already documented in the adventure catalog | `/adventures/#cable-jeep` |
| Dining Pavilion | Existing `Dining.png` | Real pavilion entrance and an established dining page | `/dining/` |

These are labeled Featured, with no visitor ranking, invented price, capacity, operating schedule or new review. Garden gathering imagery uses the existing pavilion photograph rather than repeating the four feature photos.

### Booking behavior

All four detail links work without JavaScript. The hero and final actions open the existing booking form; the final area also links to reservation tracking. A small shared client provider checks the existing public service catalog once when the feature section approaches the viewport. A matching active service produces **Reserve Now** with the exact configured service name for booking preselection. Unconfigured, unrelated or unavailable services retain an availability inquiry to the existing contact flow. Catalog failures leave the content and inquiry links usable.

No reservation API, PostgreSQL schema, status transitions, role permissions, customer reference tracking or payment functionality was changed. No database migration or new dependency is required.

### Motion and delivery

- Retained the shared observer: 640ms opacity/upward section reveals, bounded 90ms sibling staggering and masked hero title entrances.
- Feature rows and their restrained 1.035→1 image entrances use 820ms ease-out timing.
- Image hover scale is 1.03, with a 3px lift and subtle shadow over 300ms on fine pointers only. Navigation receives the existing underline transition on hover.
- Removed hero drift, hero visibility tracking and its visibility-change listener. The photograph stays stationary.
- Reduced-motion settings remove animations/transitions; server HTML stays readable if scripts or IntersectionObserver are unavailable.
- Photographic frames reserve aspect ratios. Existing responsive WebP/srcset delivery and lazy loading remain in use; the hero retains high priority and exclusive mobile/desktop picture preloads. Its sizes hint now reflects the displayed viewport rather than requesting a 1700px mobile image.
- No new scroll listener, animation library, continuous animation or scroll hijacking was introduced. Homepage CSS is separately scoped.

## Files changed

- `src/app/page.tsx`: hierarchy, direct booking hero, consolidated sections and tracking access.
- `src/app/home.css`: alternating feature layouts, image framing, responsive spacing, hover/reveal styling and empty-promotion handling.
- `src/app/globals.css`: remove hero drift; extend the existing navigation hover treatment.
- `src/components/motion-experience.tsx`: remove obsolete hero animation/visibility bookkeeping; retain the shared entrance system.
- `src/components/home/featured-experiences.tsx`: server-rendered feature showcase.
- `src/components/home/featured-booking.tsx`: one deferred catalog request and truthful reservation/inquiry actions.
- `src/data/featured-experiences.ts`: four selections tied to current photos, pages and booking identities.
- `scripts/homepage-verify.ts`: repeatable browser checks for responsive layouts, motion, images, navigation, booking preselection, catalog failure and no-script readability.

## Verification

Final results:

- Production build, standalone TypeScript check, ESLint and `git diff --check` passed. The homepage remains statically rendered.
- Full regression suite with `BOOKING_BROWSER_TESTS=1` and `TRACKING_BROWSER_TESTS=1`: **55 passed, 0 failed, 0 skipped**. This includes reservation persistence, reference tracking, staff decisions/permissions, database errors, inventory and existing public pages.
- The dedicated homepage browser script passed against the production build at every listed width, with no browser console errors or horizontal overflow. All four featured photographs loaded; all detail routes and the adventure anchor resolved. Booking catalog matching/preselection, inquiry fallback, reduced motion, mobile navigation and no-script readability passed.
- Observed local production CLS was **0 at all seven widths**. Local LCP observations ranged from approximately 0.44–0.90 seconds in this run; these are local browser measurements, not public network or physical-device guarantees.
- Additional checks passed for 1.03 desktop hover scaling, a live switch to reduced motion, touch-only navigation and 48px detail-action targets.
- Desktop and mobile screenshots were visually reviewed, including the active sticky navigation and authentic photographs. Evidence: `.local/homepage-review/homepage-1440.png`, `homepage-390.png`, `featured-1440.png`, `featured-390.png` and `verification.json`.

Run `npx tsx scripts/homepage-verify.ts http://127.0.0.1:PORT` against a running local build. It saves screenshots and measured local layout/paint data in `.local/homepage-review`. Checks cover 320, 375, 390, 430, 768, 1024 and 1440px; real detail destinations; the Cable Jeep anchor; mobile menu and Escape handling; the existing booking and reference-tracking pages; all four matching-service reservation links; exact service preselection; unavailable catalog fallback; reduced motion and JavaScript disabled.

Catalog fixtures are intercepted only in the browser and do not alter database services. The existing Google map iframe is replaced by a small test response during this UI check to isolate third-party network behavior. Local browser measurements are not a field Core Web Vitals or physical-device benchmark.

## Resort information still needed

Enable the matching real services in the existing reservation catalog when owner-approved operation, inventory, rates, schedules and participation requirements are ready. Availability inquiries remain available in the meantime. No promotion is fabricated when no approved offer is active. Existing owner-maintained guest reviews and contact/location information are preserved; no new popularity statistics are asserted.
