# Resort image integration

Completed against the local project on **18 November 2026 (Asia/Manila)**. The existing Next.js 16 / React 19 / TypeScript / Tailwind 4 application and static-export routing were preserved. No deployment, backend, database, reservation, or dependency changes were made. Existing uncommitted work was retained.

## Inventory and integration

- **50 source image assets discovered** before changes: **43 website images**, six historical screenshots, and one branding SVG. Vendor dependencies, generated builds, and ignored local QA artifacts are excluded. No JPG/JPEG/AVIF uploads were found in the website photo folders.
- The 43 website files comprise **36 distinct resort photographs, three existing promotional posters, and four pre-existing WebP delivery copies** of PNG photographs.
- **27 later-uploaded resort photographs identified** relative to the earlier documented photo set: **21 enhanced WebPs and six additional PNGs**. Their names, timestamps, folder context, and visible subjects were reviewed. All website image files have 17 November timestamps, so timestamps alone do not establish an upload order.
- All **27 later uploads** are now integrated. The gallery contains **36 distinct photographs**, and the existing three poster slots remain connected with corrected descriptive text. Every one of the original 43 website image files has an explicit catalog, delivery, or poster role.
- **Zero existing broken file URLs or capitalization mismatches found.** The main fault was disconnected assets: four shared sources still held null placeholders, and the gallery covered only three available photos. Those slots are connected, and gallery coverage is complete. Activity records with null image fields now reference their matching images directly.
- **Zero byte-identical duplicate source files** found. Four visually matching cinematic/PNG pairs are intentional delivery copies; they are reused and excluded from duplicate gallery entries. No originals were deleted, renamed, moved, or overwritten. SHA-256 checks confirmed all 50 original source image assets remained byte-for-byte unchanged.
- A pavilion image stored in the accommodations folder depicts covered tables and a garden path. It is used for dining and gathering facilities, rather than advertised as a room.
- **Unmatched photo subjects: none.** Formal room names, whether the garden pool is officially called a mini pool, and current operation/availability cannot be established from photographs. Labels describe visible subjects; no capacities, rates, amenities, or bookable room categories were invented.

## Sections updated

| Page or section | Result |
|---|---|
| Home | Enhanced resort aerial hero; separate phone crop; grounds, activities, swimming, cabins, dining, and photo preview |
| About | Authentic aerial photograph of the pools and grounds |
| Adventures | Correct images for all eight existing activity entries; existing operation caveats retained |
| Swimming & cottages | Main pool plus seven other pool, slide, entrance, and water-play views; no inferred cottage inventory |
| Accommodations | Hillside cabins, full private cabin exterior, bedroom, and bunk-bed room; separate camping/glamping collection |
| Dining | Pavilion entrance, dining hall interior, and garden cabanas |
| Groups & offers | Existing facilities slot now shows the garden gathering pavilion |
| Gallery | 36 unique photos in seven categories; initial 12 thumbnails, then batches of 12; filters show matching collections |
| Promotions | Three existing posters retained, inaccurate summer label corrected to match the rainy-season poster, and placeholder descriptions/alt text replaced |

## Responsive delivery

- **90 new WebP derivatives** in public/images/optimized/; original photos and suitable existing delivery WebPs retained. Next.js already supplies Sharp, so no dependency was added.
- Native srcset/sizes work on the static host without an image optimization server. Widths of 480, 960, and source-appropriate full sizes are supplied without upscaling. The hero additionally has 480/648-pixel portrait crops for phones.
- Gallery thumbnails preserve natural proportions, cards use consistent reserved frames, and private-cabin/bunk/night-camping photos use contain where cropping would hide their subjects. Tall banners request enough source pixels for cover cropping.
- Full-photo dialogs use contain, and original full-resolution uploads can be opened directly from the viewer. Large PNG originals are not used for card or gallery thumbnails.
- Below-the-fold images are lazy; the hero is eager/high priority. Mutually exclusive phone/desktop preloads avoid downloading both hero versions.
- Intrinsic image dimensions, fixed/aspect-ratio frames, and a labeled fallback preserve space when an image fails, including failures before client hydration.
- The 36 full delivery selections total approximately **18.1 MB**, compared with **66.9 MB** for their source photos (about **73% less**). This is an aggregate asset comparison, not a claim about a page's initial transfer. The gallery initially mounts only 12 thumbnails, and most page photos load on demand.

## Validation

Browser QA used the existing isolated Playwright installation and headless Microsoft Edge; it added no application dependencies.

| Check | Verified result |
|---|---|
| npm run lint | Passed, exit 0 |
| npm run typecheck | Passed, exit 0 |
| npm run build | Passed; ten public routes, 404, robots, sitemap, responsive assets, and portable navigation payloads exported |
| npm test | All **11** audits passed |
| HTTP asset audit | All **133** original and generated website image URLs returned HTTP 200, image MIME types, and byte-identical contents |
| Browser layouts | All **30 page/viewport combinations** passed: ten routes at 360, 768, and 1440 pixels. Every rendered page image was scrolled into view and decoded; no horizontal overflow |
| Browser errors | **Zero** console errors, runtime errors, or failing HTTP responses during the full page/interaction run |
| Gallery | All seven category filters, 12 → 24 → 36 incremental loading, full-photo contain, buttons, keyboard arrows, wraparound, synthetic touch swipe, Escape, focus containment, and focus restoration passed |
| Existing scroll effects | All four photo chapters, normal desktop scrolling, and reduced-motion reset passed without runtime errors |
| Navigation and posters | Mobile menu navigated to Gallery; existing poster preview opened and closed |
| Missing-photo handling | Intentionally aborted dining-image requests displayed the labeled fallback in its reserved frame, including failures before hydration |
| Hero delivery | Exactly one hero image downloaded at each tested viewport; the 360px phone selected a tall 480px WebP, about **164 KB** including transfer overhead |
| JavaScript disabled | Homepage hero and first 12 gallery thumbnails remained server-rendered and available |
| Development server | Started at http://127.0.0.1:3111/; homepage returned HTTP 200 with the hero |
| Original integrity | All 50 original source assets passed SHA-256 comparison against the pre-edit inventory |

The production export preview is running at http://127.0.0.1:3110/. Source and build artifacts were tested locally; no live website was deployed.

Review screenshots: [desktop hero](../screenshots/images-home-fold-1440.png), [mobile hero](../screenshots/images-home-fold-360.png), [accommodations](../screenshots/images-accommodations-1440.png), [swimming](../screenshots/images-pool-cottages-1440.png), [dining](../screenshots/images-dining-1440.png), [gallery](../screenshots/images-gallery-1440.png), and [portrait lightbox](../screenshots/images-portrait-lightbox-360.png).

### Remaining limits

No unresolved image-loading, mapping, or overflow failures remain in the tested configurations. Safari, Firefox, physical iOS/Android devices, and a deployed host were not tested. No Lighthouse or measured CLS score is claimed. Formal room inventory, current rates, schedules, exact map pin, final domain, and indexing approval remain unchanged. Existing dated posters remain manually enabled; their current promotional validity was not established.


## Files changed by this integration

Existing files updated:

- package.json; scripts/legacy/preview-static.mjs; scripts/legacy/static-audit.test.mjs
- src/config/media.ts; src/types/content.ts
- src/data/adventures.ts; src/data/gallery.ts; src/data/promotions.ts
- src/components/media.tsx; src/components/experience-story.tsx; src/components/scroll-scenes.ts
- src/components/gallery/resort-gallery.tsx; src/components/promotions/promotion-cards.tsx
- src/app/page.tsx; src/app/about/page.tsx; src/app/accommodations/page.tsx; src/app/adventures/page.tsx; src/app/dining/page.tsx; src/app/pool-cottages/page.tsx; src/app/gallery/page.tsx; src/app/globals.css
- README.md; docs/CONTENT-CHECKLIST.md; historical audit notices in docs/PHOTO_ASSET_GUIDE.md and docs/VERIFICATION.md

Added:

- scripts/assets/prepare-images.mjs; scripts/legacy/finalize-export.mjs
- src/data/photo-catalog.json; src/data/image-variants.json
- src/components/responsive-image.tsx; src/components/photo-collection.tsx
- public/images/optimized/ (90 delivery files); this report; image verification screenshots under docs/screenshots/images-*

The workspace already contained other uncommitted edits. They are outside this integration's change list. Next.js development startup also generated AGENTS.md and its standard route-type references. Build output is in ignored out/; local QA scripts, raw inventories, and JSON evidence are in ignored .local/image-audit/.

## Static navigation fix

Browser console/network verification exposed a pre-existing Windows export defect: Next.js emitted nested __next.<route>/__PAGE__.txt payloads while its client requested __next.<route>.__PAGE__.txt. The new postbuild script adds the correctly named, byte-identical payload copies to out/ on every build. Existing generated files are preserved. This fixes preview and deployable artifacts without relying on a host-only rewrite or modifying the framework.

## Updating photographs

Keep originals in their existing folders. The reviewed catalog supplies subjects, alt text, category, crop position, and optional reused delivery file. Run npm run images:prepare after changing a known photo or the catalog; npm run build runs it automatically. New, unidentified uploads are not silently assigned a room or activity label. The source hashes in delivery filenames prevent stale CDN copies after replacement.

## Reviewed photo inventory

| Subject | Gallery category | Original upload |
|---|---|---|
| Paraiso from above | Nature | /images/hero/paraiso_aerial_website_16x9.webp |
| Pools among the trees | Nature | /images/hero/paraiso.png |
| Skywalk entrance | Adventures | /images/adventures/Skywalk.png |
| ATVs on the trail | Adventures | /images/adventures/Tropical ATV Adventure Trail.png |
| Cable Jeep | Adventures | /images/adventures/cablejeep.png |
| Cavite Swing | Adventures | /images/adventures/Cavite-Swing.png |
| Crystal kayaking | Adventures | /images/adventures/Crystal-kayaking.png |
| Rainbow Bridge | Adventures | /images/adventures/Rainbow-Bridge.png |
| Zip Bike | Adventures | /images/adventures/ZipBike.png |
| Zipline across the valley | Adventures | /images/adventures/Zipline.png |
| Dining pavilion | Dining | /images/dining/Dining.png |
| Inside the dining hall | Dining | /images/dining/Dining-2.png |
| Garden dining cabanas | Resort Facilities | /images/accommodations/Tropical Pavilion and Garden Walkway.png |
| Main pool | Swimming | /images/swimming/paraiso_main_pool_website_16x9.webp |
| Blue pool | Swimming | /images/swimming/paraiso_blue_pool_website_16x9.webp |
| Garden pool | Swimming | /images/swimming/Tropical Garden Pool Retreat.png |
| Nature pool entrance | Swimming | /images/swimming/Nature Pool Entrance Adventure.png |
| Kids’ pool moments | Swimming | /images/gallery/paraiso_kids_pool_website_16x9.webp |
| Water play area | Swimming | /images/swimming/paraiso_water_play_gallery.webp |
| Colourful water slides | Swimming | /images/swimming/paraiso_water_slides_website_16x9.webp |
| Pool playground | Swimming | /images/swimming/pool_playground_professionally_aligned_16x9.webp |
| Hillside cabins | Accommodations | /images/accommodations/hillside_cabins_professionally_aligned_16x9.webp |
| Private cabin exterior | Accommodations | /images/accommodations/private_cabin_professionally_aligned_full.webp |
| Bedroom interior | Accommodations | /images/accommodations/deluxe_room_professionally_aligned_16x9.webp |
| Bunk-bed room | Accommodations | /images/accommodations/bunk_room_professionally_aligned_full.webp |
| Glamping tents | Camping & Glamping | /images/accommodations/glamping_tents_professionally_aligned_16x9.webp |
| Camping after dark | Camping & Glamping | /images/accommodations/night_camping_professionally_aligned_full.webp |
| A dusty trail ride | Adventures | /images/gallery/ATV Adventure on a Dusty Trail.png |
| Giant swing in motion | Adventures | /images/gallery/giant_swing_professionally_aligned_16x9.webp |
| ATV group outing | Adventures | /images/gallery/paraiso_atv_group_website_16x9.webp |
| Two riders, one adventure | Adventures | /images/gallery/paraiso_atv_riders_website_16x9.webp |
| Together by the river | Adventures | /images/gallery/paraiso_atv_riverside_group_website_16x9.webp |
| Riverside trail | Adventures | /images/gallery/paraiso_atv_riverside_trail_website_16x9.webp |
| Around the ATV circuit | Adventures | /images/gallery/paraiso_atv_trail_website_16x9.webp |
| Crossing the hanging bridge | Adventures | /images/gallery/paraiso_hanging_bridge_website_16x9.webp |
| Zipline departure | Adventures | /images/gallery/paraiso_zipline_website_16x9.webp |
