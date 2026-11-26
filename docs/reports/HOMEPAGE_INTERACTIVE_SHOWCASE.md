# Interactive homepage resort showcase

## Scope and design

Replaced only the homepage Featured Experiences presentation. The former four alternating image/text rows echoed the Adventures catalog. The new **Experience the Extraordinary** section uses one landscape photo stage, an offset cream information panel, a small `01 / 04` counter and four horizontal previews: **Stay, Swim, Explore, Dine**.

The existing Family Deluxe, Main Pool, Cable Jeep and Dining Pavilion selections, authentic image metadata, descriptions and detail destinations are reused. They remain editorial features, without popularity, price, amenity or availability claims.

On desktop, the photo starts slightly inset while its solid information panel overlaps the lower-left edge. On mobile, the photograph comes first, followed by a compact panel and a horizontally scrollable preview strip. All four category names remain visible in the selector introduction. The cream background, forest-green buttons, typography, real photographs and restrained shadows retain the established identity. There are no gradients or glass effects in the new showcase.

## Interaction and accessibility

- Manual click/tap selection updates the photo, title, description, category, counter and existing exploration/booking actions without navigation. There is no autoplay.
- The incoming responsive image is decoded before selection changes. The outgoing photograph stays visible while loading and during a 620ms crossfade. Visited layers remain mounted; opacity and a small transform handle the transition.
- One neighboring image is warmed near the viewport, with Data Saver respected. Pointer/focus intent reuses the same cached decode promise. Out-of-order loads cannot override the latest selection.
- An image error preserves the current experience and usable actions, with a clear status message and retry support.
- Information panels share a single CSS grid cell; their maximum intrinsic height reserves the same space for every selection. Hidden panels are inert and excluded from the accessibility tree.
- The preview strip uses a manually activated ARIA tab pattern. Left/Right/Home/End move focus; Enter/Space select. Focused previews are brought into view without animated page scrolling.
- The existing IntersectionObserver provides the heading/photo entrances and bounded preview staggering. A live reduced-motion change removes switching motion and image scaling. No shared motion code or new animation dependency was required.
- Without JavaScript, the initial feature remains readable and a no-script list provides all four destination links.

## Booking and preservation

The existing `FeaturedBookingProvider` and `FeaturedBookingAction` are unchanged. Matching enabled catalog services produce Reserve Now with the exact configured service name; other experiences retain the existing availability inquiry. Explore Experience uses the existing accommodation detail, swimming, Cable Jeep anchor and dining routes. No booking or payment logic was duplicated.

Before/after SHA-256 checks verified that Adventures, Accommodations, Swimming and Dining pages, global CSS, the shared motion engine, booking-action provider, featured content data and homepage shell are byte-for-byte unchanged. The backend, PostgreSQL schema, reservation tracking and staff applications were not edited. No migration is required.

## Files

| File | Change |
| --- | --- |
| `src/components/home/featured-experiences.tsx` | Static heading and wrapper for the interactive stage |
| `src/components/home/experience-showcase.tsx` | Manual selection, decode caching, preload intent, keyboard tabs and existing action composition |
| `src/components/home/experience-showcase.css` | Exclusively scoped stage, floating panel, previews, crossfade and mobile composition |
| `src/app/home.css` | Remove the superseded alternating-feature rules; retain other homepage rules |
| `scripts/homepage-verify.ts` | Verify the new interactive structure, all selections, stable height, destinations and preselected booking links |
| `scripts/showcase-interaction-verify.ts` | Delayed/error image loading, crossfade continuity, rapid selection, keyboard behavior and reduced motion |

## Verification commands

Final results: lint, standalone TypeScript, production build and whitespace checks passed. Both dedicated browser scripts passed against the production build. The existing browser-enabled PostgreSQL/booking/admin regression suite finished with **55 passed, 0 failed, 0 skipped** (approximately 181 seconds).

The production showcase checks covered 320, 375, 390, 430, 768, 1024 and 1440px. Every experience switched without URL changes or panel-height changes; all photographs and destinations loaded, keyboard tabs and booking preselection worked, and console errors/overflow checks passed. Observed local CLS was **0 at every tested width**. Slow-image tests sampled 20 animation frames to verify continuous photo coverage. Rapid selection, manual-only state, live reduced-motion changes and failed-image preservation also passed.

Desktop and mobile component screenshots were visually inspected: `.local/showcase-review/showcase-desktop.png`, `showcase-mobile.png` and `showcase-explore.png`. Source-preservation hashes are recorded locally in `preserved-files.json`.

```powershell
npm run lint
npm run typecheck
npm run build
npx tsx scripts/homepage-verify.ts http://127.0.0.1:PORT
npx tsx scripts/showcase-interaction-verify.ts http://127.0.0.1:PORT
$env:BOOKING_BROWSER_TESTS='1'; $env:TRACKING_BROWSER_TESTS='1'; npm test
```

Browser fixtures intercept only catalog/image requests in isolated contexts; they do not write to the resort database. The existing third-party map iframe is isolated from UI verification. Screenshots and local layout metrics are stored in `.local/showcase-review`. Local viewport/paint observations are not physical-device or public-network performance guarantees.
