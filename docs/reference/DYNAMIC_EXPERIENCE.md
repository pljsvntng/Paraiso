# Dynamic visitor experience

The existing static-export Next.js / React application was improved in place. Its layouts, resort photography, branding, room routes, review quotations, navigation, map and motion system were retained. There is no new backend, booking database, checkout, CMS, authentication or runtime dependency.

## Audit and completed functionality

The project already had five accommodation detail routes, eight photographed activities, a categorized masonry gallery, accessible native dialogs, local guest reviews, map/directions links, a centralized booking integration, FAQ disclosures and manually managed promotions. The gaps were browsing controls, inquiry context, thumbnails/zoom, genuinely current promotion handling and a functional contact draft.

### Accommodation and activity browsing

- The existing room cards and activity sections now support search, real-content categories, result counts, reset and useful empty states. Initial HTML still contains the complete collection; the client filters existing server-rendered cards rather than importing a second content catalog or replacing the design.
- Accommodation categories come from the five existing room records. Activity categories come from the eight existing activity records. No invented attractions or categories were added.
- Room cards and detail pages carry the selected room name into the inquiry journey. Activity, dining and group-topic actions do the same.
- `Accommodation.verified` supports owner-confirmed capacity, amenities, rate/unit and house rules. Optional guest, rate and amenity filters appear only when such data exists. The current records contain none, so those unsupported filters and facts stay hidden.
- `Adventure.verified` supports owner-confirmed requirements and price text. Nothing is inferred from a photo, and no activity fee, safety restriction or live availability was invented.
- Existing related rooms, room-photo associations, descriptions and breadcrumbs remain.

### One shared photograph viewer

- Both existing galleries use `PhotoLightbox`: a full-viewport native dialog with captions, original-resolution photographs, previous/next controls, keyboard arrows, Home/End, touch gestures, thumbnails and 2× zoom.
- Zoomed photographs can be scrolled; zoom mode suppresses photo-changing swipes so visitors can inspect the image. Predominantly vertical gestures do not advance a photograph. Selection resets zoom and updates the selected thumbnail.
- Escape, focus containment, thumbnail focus return and original-photo links remain. Each room still displays its own images. Gallery categories are derived from approved photographs, and repeated original sources are excluded.
- `ResponsiveImage` now supports explicit original-source delivery for the viewer, plus loading placeholders and accessible failure fallbacks. Static HTML and JavaScript-disabled visits keep their visible photographs; placeholders are a client enhancement.
- The existing Sharp preparation script adds 160px delivery candidates for thumbnails. It preserves every original and previously generated image. Normal card/hero sizes continue to use the existing larger candidates. The viewer requests its current original on opening, rather than preloading the entire original collection.
- Two-photo room cards and detail collages now declare their full mobile width for the second photo. The smaller thumbnail candidates exposed the previous half-width hint; correcting it prevents a full-width photograph from selecting a soft 160px rendition.

### Current promotions and authentic reviews

- Promotion data now supports `startDate`, `endDate`, `status`, `featured` and `verifiedPrice` alongside the existing fields. Dates use verified ISO calendar dates and inclusive end days in Asia/Manila. Invalid dates, reversed ranges, draft/archive status, inactive entries, future entries and expired entries are hidden.
- The three existing posters explicitly show May–July 2026 validity periods. Those dates were transcribed from the actual supplied artwork. Their records and original images remain, but none is presented as a current offer.
- Multiple current promotions use a manual native scroll-snap carousel, with touch, visible arrows and keyboard controls. There is no autoplay. The existing review carousel now shares its small scrolling hook; genuine review text, names, ratings, dates, sources and Read More/Read Less behavior remain intact.
- Promotion previews retain the full, uncropped poster and gain a contextual inquiry action while current. An open preview that expires is marked no longer current rather than retaining an inquiry offer.
- Initial exported HTML uses the build date. The hydrated site updates at Manila midnight and when the tab regains focus/visibility. **JavaScript-disabled visitors and crawlers retain the exported build-date snapshot until another deployment.** Refresh static builds at relevant content/date boundaries. New or changed source content always requires rebuilding and deploying.

### Honest inquiry journey

- `getBookingLink(intent, subject)` forwards the interest and selected public room/activity/package/topic to a verified HTTPS partner URL when configured. Existing partner URL parameters are preserved. URLs containing credentials or unsafe/incomplete schemes fall back to inquiries.
- No verified booking URL is configured now. General booking CTAs retain the official Facebook fallback. Contextual actions open `/contact/?interest=...&subject=...#inquiry`; only public resort context appears in this URL.
- The Contact page explicitly identifies the email-app draft workflow and the pending booking configuration. It validates full name, email-or-phone, inquiry type, optional date/guest count and message, shows inline errors and focuses the first invalid field.
- Preparing a draft **does not send a message**. The visitor reviews it, then chooses Open email app or Copy inquiry. Copy has real pending/success/failure states and a manual-copy fallback. The page never claims a message or reservation is confirmed.
- Draft details stay in browser memory. No form service, fetch submission, database, analytics event or local/session storage was introduced. Personal names/contact details/messages are never put into the website URL. An email app or the visitor’s own Facebook conversation handles actual sending.
- Existing Contact-page phone, email and hours were centralized in `src/config/site.ts`; phone/email are now functional links. These are existing owner-supplied details, not a new independent verification. Explicit Facebook links remain Facebook links even after a booking partner is configured.

### Supporting interactions

FAQ search combines with categories derived from the real question data, with counts and reset/empty handling. Native accessible disclosures remain. The footer has a working back-to-top anchor. The mobile Groups & offers link now reports its active-page state. Existing desktop/mobile navigation, directions, social links, reduced motion and page entrance behavior remain.

## Content editing and configuration

| Update | Source and requirements |
| --- | --- |
| Rooms | `src/data/accommodations.ts`; add only confirmed `verified.capacity`, `verified.amenities`, `verified.rate` and `verified.houseRules` values. Room photos belong in `src/data/accommodation-photo-catalog.json`. |
| Activities | `src/data/adventures.ts`; retain genuine category/name/photo associations. Optional confirmed facts use `verified.requirements` and `verified.priceLabel`. |
| Resort photographs | `src/data/photo-catalog.json`, `src/config/media.ts` and `public/images/`; the existing gallery is generated from approved catalog data. Run the normal build to prepare image candidates. |
| Promotions | `src/data/promotions.ts` plus approved files in `public/images/promotions/`. See `HOW_TO_ADD_PROMOTIONS.md` for publication flags, verified dates and expiry behavior. |
| Guest feedback | `src/data/reviews.ts`; preserve quotations and attribution, and publish only genuine, permission-cleared entries. Existing Google-only review submission remains. |
| Packages and group topics | `src/data/packages.ts`; package cards appear only for approved entries. The current package collection is empty and group topics remain inquiries. |
| FAQs | `src/data/faq.ts`; categories are derived automatically. |
| Contact/map | `src/config/site.ts`; reconfirm the existing phone/email/hours with the owner when updating them. The verified location/directions URLs are unchanged. |
| Partner booking | `src/config/booking.ts`; provide the resort partner’s verified deployed HTTPS URL, set `mode: "external"`, and agree on the `interest` / optional `subject` parameter contract. No API credentials are needed for plain external links. |

A real email/API delivery service is still required if the owner later wants messages delivered directly by the website. No credentials or such infrastructure were present, so the explicit email-app/copy fallback is the implemented behavior. An email app must be configured for mailto links; otherwise visitors can copy the message into Facebook. No test inquiry was sent.

Verified room capacities, amenities, rates, house rules, current activity requirements/fees, a real dining menu and event-venue details still need owner-supplied content. Unsupported filters, dishes, venues and prices were not fabricated. The production domain/indexing setting also remains as previously configured; this task did not enable indexing or publish a deployment.

## Modified files

| Area | Existing files updated |
| --- | --- |
| Pages | `src/app/accommodations/page.tsx`, `src/app/accommodations/[slug]/page.tsx`, `src/app/adventures/page.tsx`, `src/app/contact/page.tsx`, `src/app/dining/page.tsx`, `src/app/packages/page.tsx`, `src/app/layout.tsx` |
| Rooms and galleries | `src/components/accommodations/accommodation-card.tsx`, `src/components/accommodations/accommodation-gallery.tsx`, `src/components/gallery/resort-gallery.tsx`, `src/components/responsive-image.tsx` |
| Promotions and reviews | `src/components/promotions/promotion-cards.tsx`, `src/components/promotions/promotions-section.tsx`, `src/components/reviews/review-carousel.tsx` |
| Navigation and shared actions | `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/components/shared/booking-cta.tsx`, `src/components/shared/faq-list.tsx` |
| Data/configuration | `src/config/booking.ts`, `src/config/site.ts`, `src/data/accommodations.ts`, `src/data/promotions.ts`, `src/data/image-variants.json`, `src/types/content.ts` |
| Preparation/tests | `scripts/assets/prepare-images.mjs`, `scripts/legacy/static-audit.test.mjs` |
| Guides | `README.md`, `docs/HOW_TO_ADD_PROMOTIONS.md`, `docs/archive/BOOKING-INTEGRATION.md` |

New reusable files: `src/app/interactive.css`, `src/components/shared/catalog-browser.tsx`, `src/components/shared/inquiry-form.tsx`, `src/components/shared/photo-lightbox.tsx`, `src/hooks/use-resort-date.ts`, `src/hooks/use-scroll-carousel.ts`, `src/lib/catalog.ts`, `src/lib/dates.ts`, `src/lib/inquiry.ts`, and this report. The image-preparation step also generated 44 small 160px thumbnail derivatives.

All pre-existing uncommitted project work was preserved. No commit, push, deployment or external message submission was performed. The motion controller/global motion CSS, branding, original photograph files, review quotations and application dependencies were retained.

## Verification

- `npm run build`: passed with Next.js/Turbopack, including type validation and the existing export finalizer. All 16 visitor pages, the 404 and support documents exported.
- `npm run lint`: passed on the final implementation.
- `npm run typecheck`: passed on the final implementation.
- `npm test`: **22/22 passed**. The 18 existing export/content/integration checks remain, with focused tests added for contextual partner/fallback links, catalog filter combinations and unknown facts, inquiry validation/mailto drafts, and Manila promotion date boundaries/statuses.
- **64 route/viewport checks passed:** all 16 visitor pages at 360, 390, 768 and 1440px. The 48 checks at 390/768/1440 also traversed each page, checked one H1, completed image loads, visible content and cleared entrance classes. The extra 360px pass checked every route for overflow and rendered the contact draft. No horizontal document overflow was found.
- The final 360px pass was repeated after correcting the two-photo mobile size hints. It additionally checked that full-width room photos in cards/detail collages do not select a 160px thumbnail rendition; the corrected card was visually rechecked. The final build, 22 tests and lint were rerun successfully after that correction.
- The focused interaction run passed room category/search/empty/reset behavior; context preselection from rooms, activities and group topics; form required/contact validation and focus; correctly encoded mailto content; clipboard success/failure UI using a browser API stub; and **zero submission requests**. No email or Facebook message was sent.
- Gallery tests passed original-file selection without optimized `srcset`, fullscreen dimensions, thumbnails, zoom, synthetic horizontal/vertical gestures, Home/End, Escape and focus restoration. All five room viewers opened their own original files. Separate delayed/failed-response tests verified the loading placeholder clears on success and the accessible image fallback appears on failure.
- Promotion tests confirmed the three genuinely expired posters are absent from the current homepage. Browser-only historical dates exercised live expiry; response-only date fixtures exercised a multiple-card carousel, arrow/keyboard controls and poster dialog. Those fixture dates/offers were never written into the project or published.
- FAQ search/empty/reset/disclosure, back to top and mobile navigation passed. A dedicated review browser run also passed carousel arrows, keyboard Home/End, Read More/Read Less, rating-filter empty/reset behavior, sorting and the unchanged official Google destinations. Genuine review data remains covered by export/filter/publication tests.
- Motion regression checks passed the original six-step hero sequence, two masked lines, finite 16-second desktop image movement, offscreen pause, once-only entrances, 400ms route fade, new-page focus and browser Back scroll restoration. Initial/live reduced motion and missing observer support passed; all 16 routes remained readable without JavaScript.
- The complete route/motion run and focused interaction run captured no console/page errors. Desktop/tablet/phone hero images, room cards at 360/1440, the phone inquiry draft and the phone gallery viewer were visually inspected.
- Source hashes confirm all **171 pre-existing public assets** remain byte-for-byte unchanged. The motion controller, original global motion CSS and package manifests also match the pre-task snapshot. The 44 new 160px derivatives are additions. As a concrete transfer-size check, the Skywalk 160px thumbnail is 6,362 bytes versus 47,558 bytes for its existing 480px candidate; this is an asset-size measurement, not a Lighthouse claim.

Scripts, source snapshots, screenshots and JSON results are under ignored `.local/dynamic-experience/`. They use the existing isolated Playwright installation and headless Microsoft Edge. With the preview running on port 3125, repeat the browser suites with:

```sh
node .local/dynamic-experience/qa.cjs
node .local/dynamic-experience/layout-motion-qa.cjs
node .local/dynamic-experience/image-states.cjs
node .local/dynamic-experience/responsive-360.cjs
node .local/dynamic-experience/reviews.cjs
```

Physical Android/iPhone hardware, Safari/Firefox-specific rendering, live email-client behavior and the future booking partner's application were not tested. No new Lighthouse score is claimed for this feature task. These local checks do not establish deployed-network performance or actual message delivery.
