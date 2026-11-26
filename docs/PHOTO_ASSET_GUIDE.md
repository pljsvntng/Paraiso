# Paraiso de June Quixote — photo asset audit and upload guide

> Updated photography status (18 November 2026): uploaded resort photos are now connected. See [IMAGE-INTEGRATION.md](reports/IMAGE-INTEGRATION.md) for the current inventory and verification. The dated findings below are historical.

> Historical audit snapshot: a subsequent cinematic scroll upgrade connected the later-uploaded `public/images/hero/paraiso.png` through `public/images/cinematic/pool-aerial.webp` to hero/pool and their gallery appearances. Four WebP delivery copies were added with all original PNGs preserved. See [the cinematic implementation guide](reference/CINEMATIC_SCROLL_GUIDE.md) for the newer connections; missing-photo statuses below describe the earlier scan.

Audit date: **17 November 2026, Asia/Manila**. Scope: the existing local static Next.js website. This document records the files and code actually inspected; it does not claim to audit a deployed website.

**The answer to “what goes where?”:** keep the eight working attraction PNGs in `public/images/adventures/`. Supply six additional approved photographs for the hero, grounds, pool, accommodation overview, dining area, and gathering facilities. Save them at the proposed paths below, then connect their public URLs in `src/config/media.ts`. Uploading a photograph by itself does not connect a currently empty photo slot.

Only this documentation file was added for this audit. No photographs, components, data, configuration, booking integration, or backend code were changed. Existing work in the project was preserved.

## 1. Actual folder structure

These directories and files existed at inspection time. `[empty]` means the directory exists but contains no files; it does not mean the website automatically discovers future uploads.

```text
public/
├── _headers
├── branding/
│   └── icon.svg
├── fonts/
│   ├── fraunces-italic-0.woff2
│   ├── fraunces-regular-1.woff2
│   ├── manrope-regular-2.woff2
│   ├── fraunces-OFL.txt
│   └── manrope-OFL.txt
└── images/
    ├── accommodations/                     [empty]
    ├── adventures/
    │   ├── cablejeep.png
    │   ├── Cavite-Swing.png
    │   ├── Crystal-kayaking.png
    │   ├── Rainbow-Bridge.png
    │   ├── Skywalk.png
    │   ├── Tropical ATV Adventure Trail.png
    │   ├── ZipBike.png
    │   └── Zipline.png
    ├── dining/                             [empty]
    ├── gallery/                            [empty]
    ├── hero/                               [empty]
    ├── resort/                             [empty]
    └── swimming/                           [empty]
```

There is **no** `public/images/adventure/` singular directory, `about/`, `cottages/`, or `packages/` image directory. Do not create these just because they appeared in an example brief. Use the existing **`adventures`** directory.

The application actually has these ten public page routes:

```text
src/app/page.tsx                  → /
src/app/about/page.tsx            → /about/
src/app/adventures/page.tsx       → /adventures/
src/app/accommodations/page.tsx   → /accommodations/
src/app/pool-cottages/page.tsx    → /pool-cottages/
src/app/dining/page.tsx           → /dining/
src/app/gallery/page.tsx          → /gallery/
src/app/packages/page.tsx         → /packages/
src/app/contact/page.tsx          → /contact/
src/app/faq/page.tsx              → /faq/
```

`src/app/not-found.tsx` supplies the 404 page. There is no separate `/swimming/` or `/cottages/` page. Shared UI is in `src/components/`, content in `src/data/`, photo settings in `src/config/media.ts`, site settings in `src/config/site.ts`, and styling in `src/app/globals.css` plus `src/styles/fonts.css`.

### Folder-by-folder instructions

| Actual folder | Purpose and consuming pages | Current files | Missing photograph / upload instruction |
|---|---|---|---|
| `public/images/hero/` | Home's full-width opening hero | None | Add `paraiso-hero.webp`: approved wide drone/resort or pool view, with a calm center for the heading. |
| `public/images/resort/` | Grounds: Home/About/Nature gallery; facilities: Groups & offers/Facilities gallery | None | Add `paraiso-resort-view.webp` and `paraiso-gathering-area.webp`. Use genuine, separately identified grounds and gathering-area subjects. |
| `public/images/adventures/` | Home's two adventure features; all eight Adventures entries; two Adventures gallery entries | Eight PNGs listed above | No current activity slot lacks a file. Keep names and paths intact. More gallery coverage needs additional data entries, not another folder. |
| `public/images/accommodations/` | Home/Accommodations/gallery overview | None | Add `paraiso-accommodation-overview.webp` after the client identifies what the image actually shows. No verified room subfolders can be named yet. |
| `public/images/swimming/` | Home/Swimming & cottages/Swimming gallery | None | Add `paraiso-main-pool.webp`. Optional later pool aerial, poolside, and approved cottage photos can also live here. |
| `public/images/dining/` | Home/Dining/Dining gallery | None | Add `paraiso-dining-area.webp`. Restaurant exterior, food, or menu photographs are additional content, not existing separate slots. |
| `public/images/gallery/` | Reserved for genuinely gallery-only assets | None | Nothing needs uploading here for the existing seven gallery records: they reuse category-folder URLs. |
| `public/branding/` | Browser icon; potential future approved brand assets | `icon.svg` only | Existing SVG can remain. Official client logo/brand approval is outstanding; uploading a logo here does not replace the inline header/footer brand. |

For **new** files, use descriptive lowercase names with hyphens and `.webp`, such as `paraiso-main-pool.webp`. Existing mixed-case names and the ATV filename with spaces work; do not rename them without updating every reference. Windows may hide case mistakes that fail on a case-sensitive host.

## 2. Status definitions and headline findings

| Status | Meaning in this guide |
|---|---|
| **CONNECTED** | File exists, exact filename case matches, and current source supplies it to a rendered slot. This is a code/path finding, not proof of client approval or deployed visibility. |
| **MISSING** | Required photo source is `null` and no corresponding dedicated upload exists, or a specifically requested example file is absent. Null placeholders do not request a broken URL. |
| **AVAILABLE BUT NOT CONNECTED** | File exists but is not wired to the particular destination being discussed. None of the eight resort PNGs is wholly unused across the source website. |
| **BROKEN REFERENCE** | Current code names a local image URL whose file is absent or incorrectly cased. None found among the current eight photo URLs and brand icon URL. |
| **NO PHOTO SLOT** | Current page/section does not render a photo. Uploading a file cannot add one. |
| **FUTURE / CLIENT CONFIRMATION** | Optional capture or content idea; not a currently implemented image requirement. |

Findings:

- **Eight uploaded resort PNGs**, all fully decoded successfully and all connected somewhere in current source.
- **Six missing unique shared photographs:** hero, nature, pool, stay, dining, facilities.
- **30 current rendered photo positions** across the ten pages: **13 connected appearances** and **17 empty/missing appearances**. Repeated appearances share files; this is not a request for 30 unique uploads.
- Home has 10 positions, Adventures has 8, Gallery has 7, and About/Accommodations/Swimming & cottages/Dining/Groups & offers have 1 each. Contact, FAQ, and 404 have no photographic positions.
- **Zero broken active local image references; zero byte-identical duplicates in `public/`; zero wholly unused resort uploads.**
- Eight PNGs total **29,246,445 bytes**, approximately **29.25 MB / 27.89 MiB**. They are large for website delivery.
- **The saved `out/` export is stale.** Its ten page HTML files have no `<img>` elements, and `out/images/` has no photograph files. Do not assume source connections are already in a published export.

### Specifically requested files

| File mentioned in the request | Actual result | What to use instead |
|---|---|---|
| `public/images/hero/paraiso-pool.png` | **MISSING**; `hero/` is empty | Upload a real approved pool photo as `public/images/swimming/paraiso-main-pool.webp`, and/or a suitable hero as `public/images/hero/paraiso-hero.webp`. A single suitable file may serve both by reusing its URL. |
| `public/images/adventure/atv riding.png` | **MISSING**; singular `adventure/` does not exist | Existing `public/images/adventures/Tropical ATV Adventure Trail.png` is **CONNECTED**. No duplicate ATV upload is required. |

Neither missing example is a broken active reference: current source does not request either path.

## 3. Every uploaded resort photograph and its actual use

All eight files are PNG, RGB/sRGB, without an alpha channel. Their subject matter was visually inspected using a contact sheet made from the actual files. Filename and visible content agree at the subject level below. Visible content alone cannot establish ownership, capture location, official attraction names, or whether an attraction is currently operating; request client confirmation.

All filesystem paths in this section are relative to the project root. The common folder is **`public/images/adventures/`** and the public URL prefix is **`/images/adventures/`**.

| Exact filename | Measured dimensions / ratio | File bytes / decimal MB | Visible subject | Current source connection and displayed destination | Status |
|---|---|---|---|---|---|
| `Skywalk.png` | 1448×1086 / 4:3 | 3,263,437 / 3.26 MB | Bridge entrance/pylon and suspension cables; not the rainbow-plank bridge | `resortMedia.skywalk`: Home main adventure feature; Adventures `#skywalk`; Home gallery preview's second item; full Gallery → Adventures | CONNECTED |
| `Tropical ATV Adventure Trail.png` | 1774×887 / 2:1 | 4,087,436 / 4.09 MB | Several people riding ATVs on a green/dirt trail | `resortMedia.trail`: Home adventure support; Adventures `#atv`; full Gallery → Adventures (`trail`); **not** Home gallery preview | CONNECTED |
| `Zipline.png` | 1672×941 / approximately 16:9 | 3,744,695 / 3.74 MB | Two helmeted people suspended from zipline cables, with a launch structure visible | `adventures` record `zipline`: Adventures `#zipline` only | CONNECTED |
| `ZipBike.png` | 1672×941 / approximately 16:9 | 4,009,695 / 4.01 MB | Riders pedaling suspended bicycles over the river | `adventures` record `zip-bike`: Adventures `#zip-bike` only; UI calls it **Zip Bike**, not Sky Bike | CONNECTED |
| `cablejeep.png` | 1450×1085 / approximately 4:3 | 3,220,478 / 3.22 MB | Cable Jeep platform/vehicle and a visible Cable Jeep sign | `adventures` record `cable-jeep`: Adventures `#cable-jeep` only | CONNECTED |
| `Crystal-kayaking.png` | 1671×941 / approximately 16:9 | 3,774,631 / 3.77 MB | Two paddlers in a clear kayak on the river | `adventures` record `crystal-kayaking`: Adventures `#crystal-kayaking` only | CONNECTED |
| `Rainbow-Bridge.png` | 1448×1086 / 4:3 | 3,716,126 / 3.72 MB | Multicolored planks forming a suspended bridge | `adventures` record `rainbow-bridge`: Adventures `#rainbow-bridge` only | CONNECTED |
| `Cavite-Swing.png` | 1672×941 / approximately 16:9 | 3,429,947 / 3.43 MB | Person on a decorated swing above/alongside a rocky river landscape | `adventures` record `cavite-swing`: Adventures `#cavite-swing` only; UI calls it **Cavite Swing**, not Giant Swing | CONNECTED |

Exact current public URLs:

```text
/images/adventures/Skywalk.png
/images/adventures/Tropical ATV Adventure Trail.png
/images/adventures/Zipline.png
/images/adventures/ZipBike.png
/images/adventures/cablejeep.png
/images/adventures/Crystal-kayaking.png
/images/adventures/Rainbow-Bridge.png
/images/adventures/Cavite-Swing.png
```

The URL for the ATV image becomes `/images/adventures/Tropical%20ATV%20Adventure%20Trail.png` when URL-encoded by a browser. Keep ordinary spaces in a JavaScript path string matching the real filename; use `%20` in a manually shared URL. This is a working filename, not a broken reference.

**User's attraction list reconciliation:** pool and aerial/drone photos are missing. ATV, Skywalk, Cable Jeep, Zipline, and Crystal Kayaking have visibly matching connected files. A suspended-bicycle photo is available and connected under **Zip Bike**; confirm whether the client's “Sky Bike” is the same attraction. A swing photo is available and connected under **Cavite Swing**; confirm whether “Giant Swing” means the same attraction. Rainbow Bridge is an additional implemented attraction. Do not create a second activity or relabel either photo until those names are confirmed.

### Other image assets in the project

- `public/branding/icon.svg`: 64×64 SVG viewBox; proposed botanical browser icon, connected through `src/app/layout.tsx`. It is not an official logo supplied by the client according to the existing project documentation.
- Header and footer use the `Brand` component in `src/components/layout/header.tsx`: inline SVG botanical mark with HTML text. There is no external header/footer logo image path to fill.
- `docs/screenshots/home-desktop.jpg`, `home-mobile.jpg`, `redesign-desktop-fold.png`, `redesign-desktop.png`, `redesign-gallery.png`, and `redesign-mobile.png` are development screenshots. They are not website photograph uploads and are not public page photo sources.
- `.local/reference-desktop.png` and `.local/reference-mobile.png` are local reference screenshots, not resort uploads. The two `.local/*static.zip` archives are prior delivery artifacts, not live image sources.
- `.local/browser-qa/node_modules/` contains Playwright icons/logos; root `node_modules/` contains dependencies. These are tooling assets, not client photos. `.next/` and `out/` are generated build artifacts. No source image reference relies on those directories as an upload location.

## 4. Missing uploads: exact filenames, filesystem paths, and URLs

These six proposed names are **new recommendations**, not filenames already referenced by current code. Upload approved photographs here, then use the indicated configuration key. If two slots intentionally share one photograph, point both keys to one file instead of making a duplicate.

| Priority | Key currently `null` | Exact project-relative filesystem path | Exact public URL to configure | Photograph to request | Recommended delivery size |
|---|---|---|---|---|---|
| 1 | `resortMedia.hero.src` | `public/images/hero/paraiso-hero.webp` | `/images/hero/paraiso-hero.webp` | Wide resort aerial or main pool view with readable centered text area | 1920×1080, 16:9; 2400×1350 only if a good larger original and useful screen coverage justify it |
| 2 | `resortMedia.pool.src` | `public/images/swimming/paraiso-main-pool.webp` | `/images/swimming/paraiso-main-pool.webp` | Main swimming pool with recognizable surroundings | 1600×1200, 4:3; flexible shared crop |
| 3 | `resortMedia.nature.src` | `public/images/resort/paraiso-resort-view.webp` | `/images/resort/paraiso-resort-view.webp` | Grounds, garden, landscape, or recognizable resort architecture | 1600×1200, 4:3; leave room for a wide About crop |
| 4 | `resortMedia.stay.src` | `public/images/accommodations/paraiso-accommodation-overview.webp` | `/images/accommodations/paraiso-accommodation-overview.webp` | Actual accommodation exterior or a representative, verified room interior | 1600×1200, 4:3; keep the subject centrally framed for taller crops |
| 5 | `resortMedia.dining.src` | `public/images/dining/paraiso-dining-area.webp` | `/images/dining/paraiso-dining-area.webp` | Actual dining area showing tables and setting | 1600×1200, 4:3; a good 1600×900 source can also work if crops are checked |
| 6 | `resortMedia.facilities.src` | `public/images/resort/paraiso-gathering-area.webp` | `/images/resort/paraiso-gathering-area.webp` | Client-identified real gathering/relaxation facilities | 1600×1200, 4:3 |

For example, with the project at `C:\Users\VT COMPHONERO SERVER\OneDrive\Pictures\Desktop\Paraiso`, the hero's full filesystem path is `C:\Users\VT COMPHONERO SERVER\OneDrive\Pictures\Desktop\Paraiso\public\images\hero\paraiso-hero.webp`. Its website URL starts at `/images/hero/paraiso-hero.webp`, **without `public`** and without a Windows drive or backslashes.

## 5. Complete page-by-page placement checklist

Every current photographic position is listed below, including repeated uses of shared assets. Sizes are delivery recommendations, **not fixed CSS dimensions**. For a connected original, keeping its current dimensions is valid; optional smaller derivatives are described in section 11. Do not upscale an existing image to reach a recommendation.

Rows marked MISSING show the **proposed** destination filename. Their current source is `null`; those proposed paths are not currently broken references. Rows marked CONNECTED use actual existing filenames.

| Website Page | Section | Folder | Required Filename | Photo Description | Recommended Size | Status |
|---|---|---|---|---|---|---|
| Home `/` | Main hero | `public/images/hero/` | `paraiso-hero.webp` | Wide authentic aerial/resort or pool scene; `hero` key | 1920×1080, 16:9 | MISSING |
| Home `/` | About preview / “More than a getaway” | `public/images/resort/` | `paraiso-resort-view.webp` | Grounds/landscape; `nature` key | 1600×1200, 4:3 | MISSING |
| Home `/` | Main adventure feature | `public/images/adventures/` | `Skywalk.png` | Bridge entrance; `skywalk` key | Keep 1448×1086 | CONNECTED |
| Home `/` | Adventure support image | `public/images/adventures/` | `Tropical ATV Adventure Trail.png` | ATV riders; `trail` key | Keep 1774×887; check cover crop | CONNECTED |
| Home `/` | Swimming preview / “Take a dip” | `public/images/swimming/` | `paraiso-main-pool.webp` | Main pool; `pool` key | 1600×1200, 4:3 | MISSING |
| Home `/` | Accommodations preview | `public/images/accommodations/` | `paraiso-accommodation-overview.webp` | Verified accommodation; `stay` key | 1600×1200, 4:3 | MISSING |
| Home `/` | Dining preview / “Good food” | `public/images/dining/` | `paraiso-dining-area.webp` | Actual dining setting; `dining` key | 1600×1200, 4:3 | MISSING |
| Home `/` | Gallery preview item 1: Nature | `public/images/resort/` | `paraiso-resort-view.webp` | Reuse `nature`; do not duplicate file | Same 1600×1200 source | MISSING |
| Home `/` | Gallery preview item 2: Adventures | `public/images/adventures/` | `Skywalk.png` | Reuse `skywalk` | Keep 1448×1086; taller thumbnail crop | CONNECTED |
| Home `/` | Gallery preview item 3: Swimming | `public/images/swimming/` | `paraiso-main-pool.webp` | Reuse `pool` | Same 1600×1200 source | MISSING |
| Adventures `/adventures/` | Skywalk Hanging Bridge `#skywalk` | `public/images/adventures/` | `Skywalk.png` | Bridge entrance; central fallback resolves despite `item.image: null` | Keep 1448×1086; optional 1200×900 derivative | CONNECTED |
| Adventures `/adventures/` | ATV Riding `#atv` | `public/images/adventures/` | `Tropical ATV Adventure Trail.png` | ATV trail; central fallback resolves despite `item.image: null` | Keep 1774×887; optional proportional 1200×600 derivative | CONNECTED |
| Adventures `/adventures/` | Zipline `#zipline` | `public/images/adventures/` | `Zipline.png` | People suspended from cables | Keep 1672×941; optional approximately 1200×675 | CONNECTED |
| Adventures `/adventures/` | Zip Bike `#zip-bike` | `public/images/adventures/` | `ZipBike.png` | Suspended bicycle riders | Keep 1672×941; optional approximately 1200×675 | CONNECTED; confirm Sky Bike naming |
| Adventures `/adventures/` | Cable Jeep `#cable-jeep` | `public/images/adventures/` | `cablejeep.png` | Cable Jeep platform/vehicle | Keep 1450×1085; optional proportional approximately 1200×898 | CONNECTED |
| Adventures `/adventures/` | Crystal Kayaking `#crystal-kayaking` | `public/images/adventures/` | `Crystal-kayaking.png` | Clear kayak with paddlers | Keep 1671×941; optional proportional approximately 1200×676 | CONNECTED |
| Adventures `/adventures/` | Rainbow Bridge `#rainbow-bridge` | `public/images/adventures/` | `Rainbow-Bridge.png` | Colored suspended bridge | Keep 1448×1086; optional 1200×900 | CONNECTED |
| Adventures `/adventures/` | Cavite Swing `#cavite-swing` | `public/images/adventures/` | `Cavite-Swing.png` | River-side swing scene | Keep 1672×941; optional approximately 1200×675 | CONNECTED; confirm Giant Swing naming |
| About `/about/` | Full-width setting photograph | `public/images/resort/` | `paraiso-resort-view.webp` | Reuse `nature`; wide crop of landscape | Same 1600×1200 source; 1600×900 if choosing a wide-only source | MISSING |
| Accommodations `/accommodations/` | Overview split section | `public/images/accommodations/` | `paraiso-accommodation-overview.webp` | Reuse `stay`; no named room records exist | Same 1600×1200 source | MISSING |
| Swimming & cottages `/pool-cottages/` | Pool banner | `public/images/swimming/` | `paraiso-main-pool.webp` | Reuse `pool` | Same 1600×1200 source | MISSING |
| Dining `/dining/` | Full-width restaurant/dining feature | `public/images/dining/` | `paraiso-dining-area.webp` | Reuse `dining`; subject must survive wide crop | Same 1600×1200 source; 1600×900 alternative | MISSING |
| Groups & offers `/packages/` | Gathering facilities overview | `public/images/resort/` | `paraiso-gathering-area.webp` | Reuse `facilities`; actual verified gathering area | Same 1600×1200 source | MISSING |
| Gallery `/gallery/` | Nature / “A little closer to nature” (`nature`, wide) | `public/images/resort/` | `paraiso-resort-view.webp` | Reuse `nature` | Same 1600×1200 source | MISSING |
| Gallery `/gallery/` | Adventures / “A new perspective” (`skywalk`, portrait) | `public/images/adventures/` | `Skywalk.png` | Reuse bridge photo; crop preview only | Keep 1448×1086 | CONNECTED |
| Gallery `/gallery/` | Swimming / “Time for a dip” (`pool`, square) | `public/images/swimming/` | `paraiso-main-pool.webp` | Reuse `pool` | Same 1600×1200 source | MISSING |
| Gallery `/gallery/` | Accommodations / “Stay a little longer” (`stay`, portrait) | `public/images/accommodations/` | `paraiso-accommodation-overview.webp` | Reuse `stay` | Same 1600×1200 source | MISSING |
| Gallery `/gallery/` | Dining / “Gather around the table” (`dining`, wide) | `public/images/dining/` | `paraiso-dining-area.webp` | Reuse `dining` | Same 1600×1200 source | MISSING |
| Gallery `/gallery/` | Adventures / “Go a little further” (`trail`, square) | `public/images/adventures/` | `Tropical ATV Adventure Trail.png` | Reuse ATV photo; watch edge riders when cropped | Keep 1774×887 | CONNECTED |
| Gallery `/gallery/` | Resort Facilities / “Make yourself at home” (`facilities`, wide) | `public/images/resort/` | `paraiso-gathering-area.webp` | Reuse `facilities` | Same 1600×1200 source | MISSING |

The shared lightbox in the Home preview and full Gallery displays whichever approved visible entry is selected, using **that same file**. It is not an extra photograph to upload. The full Gallery currently has two openable photos; the Home preview has one.

### Public pages and sections with no current photo slots

| Page / section | Current finding | Upload consequence |
|---|---|---|
| Contact `/contact/` | Text/contact details plus `ResortLocation` | No contact photograph required. The map area is a conditional iframe or a styled pin placeholder, not a missing photo. |
| FAQ `/faq/` | Intro, FAQ controls/content, visit note | No photograph required. |
| 404 / not-found | Text and return link | No photograph required. |
| Home experience navigation, experience band, FAQ, location, closing CTA | Links/text/icons or map; no extra Media/Image instances | Do not prepare additional photos solely for these sections. |
| Swimming & cottages: cottage-information section | Text/checklist only | No separate cottage photo slot exists yet. |
| Dining: menu and group dining text | No menu/food image field or food-card collection | Extra food/menu images will not appear automatically. |
| Groups & offers: package cards | `packages` array empty; card template has no photo field | The facilities overview is the only current package-page photo slot. |
| Accommodations: approved room list | Empty data array; conditional template supports one `item.image` per approved room | Zero room category photo slots are currently rendered. No multi-image room gallery is implemented. |
| Social sharing metadata | Open Graph text configured; no explicit `openGraph.images` or dedicated OG image file found | Optional future social image is not an existing broken photo slot. |

## 6. How the website loads photographs

### Shared media lookup

`src/config/media.ts` defines eight named keys: `hero`, `nature`, `skywalk`, `trail`, `pool`, `stay`, `dining`, and `facilities`. Only `skywalk.src` and `trail.src` are non-null. Reuse these keys rather than copying the same photo into different page folders.

`src/components/media.tsx` chooses an image with:

```tsx
const photo = asset ? resortMedia[asset] : null;
const image = src || photo?.src;
```

If a source exists, it renders `next/image` with `fill`, and CSS sets `object-fit: cover`. Otherwise it renders a colored, labeled panel saying “Resort photograph to follow.” A null value is an intentional placeholder, not an HTTP 404.

An explicitly provided truthy `src` overrides the shared asset's source. A broken explicit source would not automatically fall back just because a shared asset exists. For Skywalk and ATV, `src/data/adventures.ts` has `image: null`, but the Adventures page supplies `asset="skywalk"` / `asset="trail"`, so both already render the uploaded photographs. Do not misclassify these two data values as missing images.

### Hero lookup

The Home page uses:

```tsx
const hero = site.heroImage || resortMedia.hero.src;
```

`site.heroImage` and `resortMedia.hero.src` are currently null. If `site.heroImage` is later set, it takes precedence over the shared hero source. The actual hero alt text comes from **`site.heroAlt`**; the inline focal position comes from **`resortMedia.hero.position`**, currently `50% 50%`. The generic Media component does **not** apply a shared photo's `position` field.

### Gallery lookup

`src/data/gallery.ts` declares seven records and derives each `src` and `alt` from the corresponding shared key. It sets `approved: Boolean(resortMedia[id].src)`. Thus, **any non-empty configured source is treated as approved by the gallery**; this boolean is not a separate client permission workflow.

The gallery does not scan `public/images/gallery/`, the rest of `public/images/`, or `src/data/adventures.ts`. Six activities connected only through `adventures.ts` will not appear there unless gallery data is deliberately extended later.

`src/components/gallery/resort-gallery.tsx` filters all seven records by category. The Home preview takes `selection.slice(0, 3)` **before** filtering for approved sources, so it always shows Nature, Skywalk, and Swimming in that order. It does not automatically promote ATV into an empty preview position.

### Other image-loading checks

- No photographic CSS URL, background-image URL, Tailwind arbitrary background URL utility, remote photo URL, video poster, or separate picture source was found in application source.
- CSS gradients, solid backgrounds, and the geometric placeholder decoration are design elements, not image files awaiting replacement.
- Font CSS `url(...)` values reference local `.woff2` fonts, not photos.
- The browser icon path is configured in `src/app/layout.tsx`.
- No dynamic adventure detail route, named-room detail route, or additional public photo page was found.

## 7. Adventures: coverage and correct matching

The exact implemented order is: **Skywalk Hanging Bridge, ATV Riding, Zipline, Zip Bike, Cable Jeep, Crystal Kayaking, Rainbow Bridge, Cavite Swing.** All have `confirmed: false`; photographs being connected does not confirm current operation.

| Adventure | Existing source field | Effective current URL | Home feature? | Home gallery? | Full Gallery? |
|---|---|---|---|---|---|
| Skywalk Hanging Bridge | `item.image: null`; `resortMedia.skywalk.src` supplies fallback | `/images/adventures/Skywalk.png` | Yes, main | Yes, item 2 | Yes, Adventures |
| ATV Riding | `item.image: null`; `resortMedia.trail.src` supplies fallback | `/images/adventures/Tropical ATV Adventure Trail.png` | Yes, support | No | Yes, Adventures |
| Zipline | `adventures[slug=zipline].image` | `/images/adventures/Zipline.png` | No | No | No |
| Zip Bike | `adventures[slug=zip-bike].image` | `/images/adventures/ZipBike.png` | No | No | No |
| Cable Jeep | `adventures[slug=cable-jeep].image` | `/images/adventures/cablejeep.png` | No | No | No |
| Crystal Kayaking | `adventures[slug=crystal-kayaking].image` | `/images/adventures/Crystal-kayaking.png` | No | No | No |
| Rainbow Bridge | `adventures[slug=rainbow-bridge].image` | `/images/adventures/Rainbow-Bridge.png` | No | No | No |
| Cavite Swing | `adventures[slug=cavite-swing].image` | `/images/adventures/Cavite-Swing.png` | No | No | No |

The six “No” gallery photos are **AVAILABLE BUT NOT CONNECTED to Gallery**, while remaining **CONNECTED to Adventures**. They are not globally unused files. If gallery coverage is expanded later, assign each to Adventures once; do not repeat them in Nature just because trees or a river appear in the background.

No current visible subject mismatch was found between Zipline and Zip Bike, or between Skywalk and Rainbow Bridge. Retain the separate photo identities. The Skywalk file is primarily an entrance view; a clearer walk-across/bridge-span photo could be an optional later editorial improvement if the client supplies one.

### Alt-text issue for a later authorized content change

The six activity images sourced directly from `adventures.ts` currently inherit the wording “Approved [activity name] photograph pending” from the Adventures page even though their images are present. That wording is stale for screen readers. Recommend replacing it later with accurate descriptions of the visible photograph. Skywalk and ATV receive their shared configuration alt text instead. No alt text was changed during this audit.

## 8. Accommodations, swimming, cottages, dining, and facilities

### Accommodations: no verified categories yet

`src/data/accommodations.ts` exports an **empty array**. No room names, capacities, bed configurations, bathrooms, or amenities are confirmed by an implemented record. The overview uses the `stay` key, shared with Home and Gallery.

First request one verified overview photograph and identify its subject accurately. Do not create invented room folders such as “Deluxe Villa” or “Family Suite.” Once the client confirms actual names, this **future pattern** is appropriate:

```text
public/images/accommodations/<client-confirmed-room-slug>/
  exterior.webp
  interior.webp
  bed-area.webp
  bathroom.webp       # only if that room has an applicable, verified bathroom
  amenities.webp      # only verified facilities
  surroundings.webp
```

`<client-confirmed-room-slug>` is a placeholder instruction, not a literal directory name or a confirmed room category. Suggested future captures: 1200×800 exteriors/interiors/bed areas; 800×1200 bathroom portrait when space demands it; 1200×800 amenities; 1600×900 surroundings. Preserve natural proportions. The current room data type has only one `image` field per room; uploading six files will not create six room-photo slots. Additional views require a later frontend content decision or approved gallery entries.

### Swimming and cottages

There is no uploaded pool photograph to reuse today. The kayak image is a river activity photo and must not stand in for the swimming pool. No aerial photograph of the resort/pool was found. Small background buildings in attraction photos do not establish accommodation or cottage identities.

Use the same approved `paraiso-main-pool.webp` URL for Home's pool section, the pool banner, and the Swimming gallery record. A pool image can also serve as the Home hero if the composition works for centered text and a tall phone crop; in that case set both keys to one URL and do not duplicate the file.

Future optional captures in the **existing** `swimming/` folder:

| Proposed future filename | Subject | Suggested size | Existing direct slot? |
|---|---|---|---|
| `paraiso-pool-aerial.webp` | Drone view emphasizing the pool and surroundings | 1920×1080 | No separate aerial slot; could be chosen for `hero` or `pool` |
| `paraiso-poolside.webp` | Pool edge/scenery and actual facilities | 1600×900 | No; future gallery/content addition |
| `paraiso-cottage-exterior.webp` | Client-identified cottage exterior | 1200×800 | No separate cottage image slot |
| `paraiso-cottage-interior.webp` | Seating/interior of that cottage, if applicable | 1200×800 | No separate cottage image slot |
| `paraiso-family-relaxation-area.webp` | Verified relaxation area, with permission for identifiable guests | 1200×800 | Could be selected for `facilities`; otherwise future gallery addition |

These files are not currently uploaded. Capture only the real facilities the client identifies; do not infer cottage names or capacity.

### Dining

The existing Dining page has **one** photographic position. It shares `dining` with Home and the Dining gallery record. All three currently show a labeled placeholder, not stock food or a fabricated restaurant photograph.

Start with `paraiso-dining-area.webp` showing the real tables/setting. Additional future captures can be placed in the existing dining directory:

| Proposed future filename | Subject | Suggested size | Current direct slot? |
|---|---|---|---|
| `paraiso-restaurant-exterior.webp` | Verified restaurant entrance/exterior | 1600×900 | No; could be chosen as the shared dining source if it best describes the section |
| `paraiso-food-selection.webp` | Actual client-identified food presentation | 1200×800 | No food-card/image collection exists |
| `paraiso-current-menu.webp` | Clear, approved current menu photo | Native readable proportion, around 1600px wide if available | No menu-image slot; request freshness and readable text before any later publication |
| `paraiso-group-dining-area.webp` | Verified group dining space | 1600×900 | No separate group dining image slot |

Do not invent dish names, prices, menus, restaurant capacity, or group facilities. A menu image would need a readable text equivalent if added later. No unnecessary upscale is recommended for small menu originals.

### Groups & offers

`src/data/packages.ts` has an empty package array and four text-only inquiry topics. Its overview is the `facilities` photo slot. Request a real gathering area, not a promotional graphic promising unverified packages. If a confirmed cottage photo accurately represents this setting, `facilities` may point to that existing cottage file; no new `packages/` photo folder is needed.

## 9. Gallery categories, reuse, and missing coverage

All requested categories are already supported: **Nature, Swimming, Adventures, Accommodations, Dining, Resort Facilities**, plus “All moments.” Their records are listed in the 30-position checklist.

| Category | Current configured records | Current photos shown | What should populate it |
|---|---|---|---|
| Nature | `nature` | None | Approved resort grounds photo from `resort/` |
| Swimming | `pool` | None | Actual main swimming pool photo from `swimming/` |
| Adventures | `skywalk`, `trail` | Skywalk and ATV | Keep these two; six other uploaded activities could be added as new records later, once approved |
| Accommodations | `stay` | None | Verified accommodation overview; future room photos only after identifying real categories |
| Dining | `dining` | None | Actual dining setting; future food/exterior photos only through additional records |
| Resort Facilities | `facilities` | None | Confirmed gathering/relaxation facilities |

There are no repeated file URLs among the seven current gallery records. Skywalk and ATV are intentionally reused across Home, Adventures, and Gallery without duplicate image files. Gallery lightbox images reuse the same source and use `object-fit: contain`, so the full original is visible in the viewer even when its thumbnail is cropped.

For a future entry, changing `src/data/adventures.ts` alone is insufficient. The current gallery entries use IDs typed as `ResortMediaKey`; extending the gallery requires an appropriate new shared key and gallery entry, or a deliberate future data-model change. This audit does not make that change.

## 10. Actual layout, dimensions, cropping, and readability

The components **do not enforce CSS `aspect-ratio` values**. Most image boxes use responsive grid widths and `min-height`; their displayed ratio changes with viewport width. “Wide,” “portrait,” and “square” in gallery data are **layout labels, not promises of 16:9, 2:3, or 1:1 output**. Do not force all gallery files into squares or upscale them to a generic target.

Relevant rules are in `src/app/globals.css`:

| Slot / selector | Actual sizing behavior | Photo selection consequence |
|---|---|---|
| `.hero` / `.hero-photo` | Full viewport width; desktop minimum height 760px, height `min(900px, 100svh)`; phone minimum 690px, height `max(690px, 92svh)`, capped at 820px; `cover` | 1920×1080 is a useful landscape source, but phone crops are tall. Keep the recognizable subject and quiet heading area near the center. |
| `.story-image .media` | Minimum 450px desktop / 340px phone | Grounds photo needs headroom and safe edges. Reuse a 4:3 master with the wider About slot. |
| `.adventure-feature .media` | Minimum 560px desktop / 520px tablet / 400px phone | Skywalk gets a relatively tall crop; keep the pylon/bridge identity visible. The bottom caption overlays the photo. |
| `.adventure-support .media` | Minimum 290px desktop / 270px phone | The 2:1 ATV original will lose more side content in narrower boxes; check that riders remain legible. |
| `.pool-grid .media` | Minimum 430px desktop / 320px phone | A versatile 4:3 pool master is more flexible than a very wide panorama. |
| `.stay-image .media` | Minimum 560px desktop / 390px phone | Keep the accommodation subject centered and visible under a taller crop. |
| `.dining-preview .media` | Minimum 400px desktop / 300px phone | A table/setting photograph must work in both this box and the wide Dining page. |
| `.full-media .media`, `.dining-feature .media` | Minimum 440px desktop / 320px phone, up to container width | At a 1280px-wide desktop container these boxes are about 2.91:1. A 16:9/4:3 file is cropped vertically; keep essential details within a horizontal central band. |
| `.info-split .media` | Minimum 470px desktop / 340px phone | Accommodation/facilities overview images have a taller split-column presentation. |
| `.experience-row .media` | Minimum 355px desktop / 285px phone; two desktop columns, one on phones | Desktop images are roughly landscape; phone crops become squarer. Typical new adventure delivery: 1200×800 or 1200×900, subject dependent. Existing wider files can stay. |
| `.pool-banner .media` | Minimum 440px desktop / 300px phone | Reuse main pool photo and inspect its crop. |
| Full `.gallery-grid` | Three columns desktop, two at ≤1050px, one at ≤700px | Thumbnail widths change substantially. A fixed 1000×1000 delivery is not required. |
| Full gallery media shapes | Base minimum 270px; `portrait` 400px; `wide` 300px desktop / 290px phone | These are height rules, not actual shape ratios. Preserve full originals and let the thumbnail crop. |
| Home `.gallery-preview` | Three unequal columns; on phones first item spans two columns, then two smaller items | Preview-specific and shape-specific CSS both apply. On phones first image minimum 310px and later images 245px; test the actual thumbnail crop rather than assuming the full-gallery shape. |
| `.lightbox-stage img` | `contain`, stage height `min(66dvh,650px)` desktop / `55dvh` phone | Retain natural proportions; no separate square/portrait lightbox upload needed. |

The main container is `min(1280px, calc(100% - 112px))`, changes to an 80px total gutter at ≤1200px and a 40px total gutter at ≤700px. The generic `Media` image declares `sizes="(max-width: 700px) 100vw, 65vw"`. With the current unoptimized configuration, that declaration does not generate smaller delivered derivatives.

### Hero choice

A real aerial photograph showing resort context is a strong first choice **if its central crop still identifies the resort**. A broad pool photograph with uncluttered water/greenery behind the heading can work better than a busy aerial. No uploaded candidate exists, so a final selection cannot be verified yet.

The hero already applies a dark green gradient behind light centered text. Choose a photograph with calm tonal detail around the center and keep important people/signage away from the text area. The source starts centered (`50% 50%`). The hero's inline object position takes precedence over the phone CSS center declaration; there is no separately configured mobile source. Recheck at 390px and 1440px after connection. A separate mobile crop would need later frontend support; uploading `paraiso-hero-mobile.webp` alone will do nothing.

## 11. Optimization and preservation recommendations

`next.config.ts` uses `output: "export"`, `trailingSlash: true`, and `images: { unoptimized: true }`. The current website serves the supplied file itself; it has no runtime Next.js image conversion endpoint. A 4 MB PNG stays a 4 MB PNG even in a small card. Lazy loading defers requests but does not reduce each file's size.

Recommendations, not changes already made:

1. Preserve the high-quality originals in an archive outside the deployed `public/` folder. Preserve every official client file; no original was removed during this audit.
2. All eight current PNG photos are valid and can remain unchanged for correctness. They have **no transparency requirement**, so WebP derivatives could substantially reduce payload. This is a delivery improvement, not a repair for broken files.
3. Keep `public/branding/icon.svg` as SVG. For a future raster logo needing transparency, PNG is appropriate; do not convert a real vector logo into an enlarged bitmap.
4. Use WebP for new photographs. Consider AVIF if visual quality, encoding cost, and target browsers justify it. No automatic AVIF/WebP fallback is currently configured; supplying multiple extensions does not make the static application negotiate formats automatically.
5. Start with visually inspected WebP settings around quality 80–85, then inspect foliage, faces, water, ropes, and text. File size is a check, not a reason to damage detail. Indicative starting budgets: hero roughly 250–600 KB; standard photo roughly 100–300 KB; raise them if the scene needs more detail. These are targets, not measured achievable results for these files.
6. Do not stretch or squash. Resize proportionally, or crop intentionally. Never enlarge a small source solely to meet a table target. All eight originals are usable at ordinary card sizes; their lightbox detail is limited to their measured native dimensions.
7. Keep one delivery file per shared photo where possible. Do not copy a file into `gallery/`, `hero/`, and `resort/` just because multiple pages use it.
8. The optional derivative names below are suggestions only. They are not existing files and were not created. Adopting one requires updating its source reference before it will display.

| Existing original to preserve | Optional future WebP filename in the same folder | Suggested maximum proportional delivery dimensions |
|---|---|---|
| `Skywalk.png` | `skywalk.webp` | Up to native 1448×1086; 1200×900 if sufficient after crop review |
| `Tropical ATV Adventure Trail.png` | `atv-riding.webp` | Up to native 1774×887; 1200×600 if sufficient |
| `Zipline.png` | `zipline.webp` | Up to native 1672×941; approximately 1200×675 |
| `ZipBike.png` | `zip-bike.webp` | Up to native 1672×941; approximately 1200×675; confirm name before using `sky-bike.webp` |
| `cablejeep.png` | `cable-jeep.webp` | Up to native 1450×1085; approximately 1200×898 |
| `Crystal-kayaking.png` | `crystal-kayaking.webp` | Up to native 1671×941; approximately 1200×676 |
| `Rainbow-Bridge.png` | `rainbow-bridge.webp` | Up to native 1448×1086; 1200×900 |
| `Cavite-Swing.png` | `cavite-swing.webp` | Up to native 1672×941; approximately 1200×675; confirm name before using `giant-swing.webp` |

Do not simply rename `.png` to `.webp`; that does not convert the file. Use an actual image export/conversion tool and retain the original.

## 12. Beginner upload-and-connect instructions

1. **Choose the right real photograph.** Confirm the subject and permission to publish. For six empty keys, use section 4. For eight existing activity files, no re-upload is required.
2. **Make a delivery copy.** Preserve the original, resize proportionally if needed, and export in the actual intended format.
3. **Save to the exact existing folder.** For example, put the pool at `public/images/swimming/paraiso-main-pool.webp`. Ensure Windows has not hidden a second extension such as `.webp.png`.
4. **Connect the URL.** Edit only the matching photo entry in `src/config/media.ts` when you are ready. This audit has not made those edits. For example, replace the existing `pool` entry with:

   ```tsx
   pool: {
     src: "/images/swimming/paraiso-main-pool.webp",
     alt: "The main swimming pool and poolside surroundings at Paraiso",
   },
   ```

   Adjust the alt description to the actual photo. Keep the key name `pool`. This one setting supplies Home, Swimming & cottages, and Gallery. It does not require changing the partner's booking code.

5. **Connect the hero similarly**, using `/images/hero/paraiso-hero.webp` in `resortMedia.hero.src`. Check `site.heroImage` if a different photograph appears; that setting takes precedence. Update `site.heroAlt` to accurately describe the chosen hero.
6. **Preview locally.** If using the source development server, run `npm run dev`. Open the printed local address and check each destination in section 5. A file should load directly at its `/images/...` URL before troubleshooting layout.
7. **Inspect all reuse points.** For example, check the pool in the Home feature, Home gallery preview, pool banner, full gallery thumbnail, and gallery viewer. View at narrow and wide widths. A subject hidden by a cover crop is different from a missing file.
8. **Generate a fresh static delivery** when finished: `npm run build`. This refreshes generated output; it was not run as part of this documentation-only audit. The current saved `out/` predates the new photos. Then use `npm run preview` and run the existing `npm test` export audit if preparing a release.
9. **Publish the refreshed `out/` through the existing hosting workflow** when ready. This guide does not publish anything. Do not upload new photographs only into `.next/`, `out/`, `docs/screenshots/`, or an old zip; those are not the maintained source asset location.

Keep paths root-relative and local. No database, API route, authentication, payment system, or booking implementation is necessary for these photo connections.

## 13. Broken paths, unused assets, duplication, and cleanup findings

| Check | Actual result | Recommendation |
|---|---|---|
| Active photo paths | Eight unique `/images/adventures/...` paths exist and match exact file case | Keep the working paths. |
| Browser icon | `/branding/icon.svg` exists and matches exact file case | Keep SVG; seek client brand approval. |
| Null sources | Six shared source keys are empty | Upload and connect their approved photos; nulls are not broken HTTP requests. |
| Requested old pool path | `public/images/hero/paraiso-pool.png` absent and not referenced | Do not assume an old upload was retained. Supply a pool image at the recommended new path. |
| Requested old ATV path | Singular folder/file absent and not referenced | Use existing plural-folder ATV image. |
| Globally unused resort uploads | None of the eight is unused in current source | Do not delete any. |
| Gallery-only gaps | Six uploaded activity photos are absent from Gallery | Optional later data extension; no re-upload needed. |
| Byte-identical public duplicates | None found by SHA-256 comparison | Reuse URLs rather than introducing copies. |
| Visible near-duplicates | No obvious repeated photograph among the eight visually reviewed subjects | Skywalk and Rainbow Bridge are different views/subjects; do not merge them based only on “bridge.” |
| Oversized delivery | Each photo is about 3.22–4.09 MB; combined 29.25 MB | Consider preserved-original WebP derivatives, subject to review. |
| Corrupt files | All eight PNGs successfully decoded | No file corruption found. |
| Low resolution / distortion | Native widths 1448–1774px; no clearly unusable thumbnail-only source found | Do not upscale these to 1920px for hero use. Reassess after crop on target screens. |
| Unrelated/stock replacements | No remote stock photos or unrelated resort placeholders in current photo sources | Replace labeled empty panels with approved resort photos, not with QA screenshots. Authenticity still requires client confirmation. |
| Filename style | Existing names mix case, hyphens, and spaces | Valid today; use consistent naming only for new files. No automatic renaming. |
| Misplaced resort photos | All eight uploads are attraction subjects in `adventures/` | No relocation required. |
| Alt text | Six activity images still say “photograph pending” in their alt text | Recommend a later focused accessibility copy update. |
| Stale export | Ten saved page HTML files contain no `<img>` tags; no photos copied under `out/images/` | Rebuild before previewing or publishing updated source. |
| Older documentation | README/content checklist/review notes describe an earlier photo-free state | Treat those statements as historical. This dated audit records the eight uploads now present. |

No cleanup action, conversion, deletion, relocation, replacement, or rename was performed.

## 14. Client confirmation and permission list

Ask the client to confirm the following as part of selecting the actual photographs:

- That the eight uploaded files depict this resort and are authorized for website publication. Filenames and visible matching subjects are not ownership evidence.
- Whether “Sky Bike” and the implemented “Zip Bike” are the same attraction, and whether “Giant Swing” and “Cavite Swing” are the same attraction. Keep current names until confirmed.
- The actual room/accommodation identity shown in the overview, official category names, and which bathroom/amenities belong to which room before future room-specific uploads.
- Which cottage, gathering area, restaurant area, and other facilities a photograph shows; do not infer capacities or inclusions from the photograph.
- Permission to publish photographs with identifiable guests, staff, or children, plus the photographer's/client's authorization to use the supplied media. Several activity files visibly include people.
- Permission to publish any drone photograph and confirmation that it shows the correct property. No aerial upload is present to assess today.
- Official logo/branding approval. The current botanical branding is a proposal according to project documentation.
- That any future menu image is current and approved. No menu photo or verified dish/price list was found.

There is no separate pending approval tool or permission gate implemented for these files. This is a content checklist for the client; configuring a non-null shared URL currently makes the gallery treat it as approved.

## 15. Upload priority and audit verification

1. **Hero:** establishes the resort immediately. Get a composition that works behind the existing centered text and survives the phone crop.
2. **Main pool:** fills four current positions across Home, Swimming & cottages, and Gallery; use one source URL.
3. **Grounds/resort view:** fills four positions across Home, About, and Gallery.
4. **Accommodation overview:** fills three positions; confirm the accommodation identity first.
5. **Dining area:** fills three positions; use actual resort facilities.
6. **Gathering facilities:** fills two positions in Groups & offers and Gallery.
7. **Review existing attraction crops, approval, naming, and alt text.** No extra activity upload is required for the eight implemented activities. Optimize delivery copies later if approved.
8. **Collect optional detail photos** of confirmed rooms, cottages, poolside scenery, restaurant exterior, food, and other facilities only after deciding their future display destinations.

Audit evidence and limits:

- Enumerated the real `public/` directories, all source routes, components, content data, settings, styles, and supporting scripts/documentation. No applicable `AGENTS.md` was found in the project or checked parent locations.
- Searched the application for image imports/sources, Media/Next Image use, CSS URLs/backgrounds, Tailwind image backgrounds, remote URLs, inline SVGs, metadata images, and gallery derivation.
- Matched every active local photo/icon URL to a real case-matching public file; measured photo dimensions, format, alpha, and byte counts; decoded the eight PNGs and compared hashes for exact duplicates.
- Visually reviewed all eight resort images from actual files, rather than accepting the filenames alone.
- Inspected the saved export's ten page HTML files and public-image copies. `out/index.html` is dated **16 November 2026, 14:37 Asia/Manila**; the current photo configuration and activity data were edited on **17 November 2026**, after that build. Its no-photo state does not disprove the current source connections.
- The source is the basis for the 30-position checklist. No new build, source-server browser session, deployed-site audit, crop approval, or production performance measurement was performed. Recheck loading, readability, crops, and viewer behavior after supplying and connecting the final photos.
- Installed dependencies, Git objects, generated caches, tooling icons, screenshot references, and prior archives are not treated as additional client-upload requirements.

**Completion target:** six approved source photos connected once each, eight existing activity sources preserved, no duplicated delivery copies, and a fresh static export verified before publication.
