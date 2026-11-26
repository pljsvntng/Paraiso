# Accommodations redesign

Implemented in the existing Next.js 16 App Router site on 19 November 2026. The supplied attachment contained the written layout brief; no separate visual-reference file named `collage` or `match` was found in the project. The layout follows the specified cream/green styling and horizontal 60/40 card proportions.

## Current accommodation entries

Names and photo associations follow the owner's room-labelled uploads. No unverified guest capacities, bed sizes, bathroom facilities, air conditioning, rates or availability have been added.

| Entry / detail route | Associated original uploads |
| --- | --- |
| Family Deluxe — `/accommodations/family-deluxe/` | `fmly_deluxe.jpg` exterior; `family_deluxe.jpg` bedroom |
| Igloo — `/accommodations/igloo/` | `Igloo-pax.png` exterior; `Igloo-2pax.png` interior |
| Wooden & Brick — `/accommodations/wooden-and-brick/` | `wooden_brck.png` exterior; `wooden_brick.png` interior |
| Standard Cabin — `/accommodations/standard-cabin/` | `stndrd_cabin.png` |
| Bunkhouse — `/accommodations/bunkhouse/` | `bunkhouse.webp` |

The files are in `public/images/accommodations/`. Original uploads, older photographs and other pages' photo collections remain intact. The main Gallery still uses its original 36-entry catalog. No existing room interior was assigned to a new room based only on similarity.

## Presentation and behavior

- The landing page has the requested title/subtitle, a real hillside-cabin hero photograph, a restrained dark overlay, and spacious horizontal cards. Card photo areas take 60% of the desktop content width; room information takes 40%.
- A three-photo entry automatically uses one large image and two stacked supporting images. Two-photo entries use a balanced pair, and single-photo entries use one uninterrupted image. Available uploads currently provide three pairs and two single photographs, so no room yet has a three-photo collage. No repeated or unrelated photographs were used to fill empty slots.
- Mobile cards stack the image area above the room information and use full-width detail links. Tablet spacing and image compositions adapt without horizontal carousels.
- Each entry has a statically exported detail route, metadata, breadcrumbs, room-specific gallery, inquiry panel, back link and related accommodations.
- The full-screen native-dialog viewer supports next/previous buttons, arrow keys, horizontal touch gestures, Escape, explicit close, contained focus and focus return. Vertical touch gestures do not change photographs. One-photo entries disable unnecessary next/previous controls. Full original photos remain available through a link.
- Confirmed room facts can be added through `information`; confirmed configurations can be added through `variants`. Empty variants produce no fake room options. Missing facts are described as information to confirm with the resort.
- Existing `BookingCTA` and booking configuration are reused with `intent="stay"`. The current configuration uses the official Facebook inquiry fallback because a reservation-partner URL has not been configured. No new reservation backend or booking flow was added.
- Existing Intersection Observer reveals animate cards once at 900ms. Fine-pointer image hover uses a 1.025 scale. Dialog transitions and gallery fades are lightweight, respect reduced motion and do not alter native scrolling.

## Photo management

`src/data/accommodations.ts` centralizes names, descriptions, photo associations, photographed highlights, confirmed facts and optional real configurations. `src/data/accommodation-photo-catalog.json` supplies the room-upload source paths, descriptive alt text and focal points.

`npm run images:prepare` now processes the original resort catalog plus the separate accommodation catalog. Content-addressed responsive WebP derivatives are stored in `public/images/optimized/`, and dimensions/srcsets are recorded in `src/data/image-variants.json`. Original photographs are never rewritten. The shared image lookup recognizes room photos while keeping the main Gallery collection unchanged. Below-the-fold card images are lazy-loaded; hero and initial detail images load eagerly with reserved frame dimensions.

For a third matching image, add its approved source to the accommodation photo catalog, run image preparation, and add its `accommodationPhotos` reference to that room's `photos` array. The three-image layout activates automatically. Use only photos of that accommodation.

## Files changed or added

- `src/app/accommodations/page.tsx` — redesigned listing.
- `src/app/accommodations/layout.tsx` — shared route stylesheet import.
- `src/app/accommodations/accommodations.css` — scoped responsive cards, hero, details and lightbox styling.
- `src/app/accommodations/[slug]/page.tsx` — static detail routes, metadata and related rooms.
- `src/components/accommodations/accommodation-card.tsx` — reusable cards and photographed highlights.
- `src/components/accommodations/accommodation-gallery.tsx` — gallery and accessible full-screen viewer.
- `src/data/accommodations.ts` — central accommodation content.
- `src/data/accommodation-photo-catalog.json` — separate room photo inventory.
- `src/data/image-variants.json` — generated responsive delivery metadata.
- `src/config/media.ts` — room-image mapping and shared lookup.
- `src/app/sitemap.ts` — includes detail routes when a final domain is configured.
- `scripts/assets/prepare-images.mjs` — includes room-upload derivatives.
- `scripts/legacy/static-audit.test.mjs` — audits all 15 public pages, room associations and responsive assets; recognizes Next.js dynamic-segment payload filenames.
- `public/images/optimized/` — generated smaller copies of the eight room uploads.
- `README.md` and this report — editing and handoff documentation.

## Validation and remaining content

Checks include ESLint, TypeScript, production build/static export, and all 13 static audits. Browser QA covers widths 320, 360, 390, 700, 768, 1024, 1051, 1440 and 1920px, every room route and its photo sources, detail/back links, keyboard controls, swipe handling, close/focus restoration, reduced motion and console/resource errors. A single-photo mobile overflow found during QA was fixed by explicitly constraining the gallery width to its container. Current reports/screenshots are stored in ignored `.local/accommodations-redesign/`.

Still needed for fuller room listings: any third/supplementary matching photos, a separate visual reference if one is intended, confirmed public room-name spelling, capacities, bed arrangements, bathrooms, air conditioning, other amenities, rates/check-in terms, and a reservation-partner URL if it should replace the existing inquiry fallback. The Igloo filename containing `2pax` alone was not used to assert a capacity.
