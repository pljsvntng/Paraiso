# Cinematic scroll implementation — 17 November 2026

> Historical implementation. The scroll-linked controller, pinned timelines, image scaling, and animated progress indicator described below were removed on 18 November 2026. See [Native scrolling and lightweight motion](NATIVE_SCROLL_PERFORMANCE.md) for the current implementation and validation.

This extends the previous motion implementation with continuous, reversible scroll-linked scenes. Existing typography, branding, navigation, booking configuration, photograph originals, room information, and activity names remain intact. No dependencies were installed.

## Checkpoint

`codex/pre-cinematic-20261117` points to `6466e00c61a5576fe4b363ef586050d578c96b8d`. It includes existing tracked and untracked project work before this upgrade. A temporary Git index was used without switching the user's branch or staging their work in the active index.

## Files

| File | Change |
|---|---|
| `src/components/scroll-scenes.ts` — new | Reversible scroll geometry, hero transition, expansion, chapter crossfades, secondary photo scale, responsive reset and cleanup. |
| `src/components/experience-story.tsx` — new | Server-rendered pool, Skywalk, ATV, and Cable Jeep chapters, built from existing photographs. |
| `src/components/motion-experience.tsx` | Reuses the existing Motion entrance system; replaces the prior tiny parallax loop with the shared scroll-scene driver. Excludes scene contents from timed reveals so systems do not compete. |
| `src/app/page.tsx` | Adds a hero visual wrapper, inserts the four-chapter experience story after the existing adventure feature, and changes the existing pool photograph position into the expanding scene. Existing copy and links are retained. |
| `src/app/globals.css` | Scene layout, sticky enhancement, image framing, caption contrast, chapter progress line, responsive normal-flow fallback. |
| `src/config/media.ts` | Connects the uploaded pool aerial through one optimized URL shared by hero, pool overview, and their existing Gallery consumers. |
| `public/images/cinematic/*.webp` — four new delivery copies | Same uploaded photographs, resized proportionally without enlargement. Original PNGs are unchanged. |

The earlier audit found no pool photo at that time. At the start of this upgrade, `public/images/hero/paraiso.png` existed and was visually reviewed: an aerial view of pools and greenery. It was still unconnected. The new hero and pool settings reuse that upload's derivative. No accommodation photograph exists to add to the story, so no accommodation chapter was invented. Existing activities still require the resort's confirmation of current operation; the story retains an explicit inquiry note.

## Three signature scenes

1. **Hero transition.** The existing timed label/heading/CTA entrance remains short. A separate parent visual scales 1→1.07 as the hero scrolls away. Its content moves upward by at most 70px and fades proportionally. Focusing a hero control restores readable opacity and position. Separate elements prevent entrance and scroll effects from overwriting each other.
2. **Pool expansion.** The existing pool copy introduces an image frame. On desktop, a 185svh track holds a 100svh sticky stage. Scroll progress scales the full-size photo from 0.82→1 during the first 62% of the timeline, removes its small corner radius, then introduces the supporting caption. `object-fit: cover` preserves photo proportions; only the crop changes. The scene holds briefly and releases through ordinary document scrolling.
3. **Experience chapters.** A 310svh track holds one viewport stage. Pool → Skywalk → ATV → Cable Jeep images crossfade over scroll progress, with subtle copy movement and a progress line. Text fades separately to avoid overlapping headings. The final chapter releases naturally. There are no focusable controls hidden in transparent layers; the visible link follows the story. Screen readers retain the articles in logical source order.

The scroll-linked effects are direct functions of document position. They do not finish playing after scrolling stops, and scrolling backward restores the corresponding earlier values. A single requestAnimationFrame is scheduled per scroll/resize update, rather than a permanent render loop. No wheel/touch event interception, smooth-scroll library, scroll snapping, loading curtain, video sequence, canvas, or 3D package was introduced.

Secondary photo scaling is limited to existing real adventure, accommodation, and gallery images on desktop. Existing viewport reveals, menu transitions, underlines, lightbox opening/closing, keyboard arrows, touch swipe, native focus trapping, and Escape remain in place. Accommodation placeholders remain placeholders.

## Mobile, reduced motion, and fallback

- Sticky enhancement requires more than 1050px width, a fine pointer, and no reduced-motion request.
- Smaller/coarse-pointer layouts use four normal-flow photo articles and a normal-flow pool photograph. There is no pinned track to scroll through on phones or tablets.
- Without JavaScript, server-rendered chapters are readable and vertically arranged; essential content is not hidden by default CSS.
- Reduced motion skips the motion setup. Changing the preference at runtime removes sticky enhancement classes and restores the original inline styles. All chapters become visible in normal flow.
- Route changes remove observers/listeners and cancel pending animation frames. Back/forward navigation was exercised in browser QA.
- Caption gradients preserve the existing forest/ivory palette and protect text contrast. Photography remains the dominant surface.

## Delivery assets and performance

WebP derivatives were exported at quality 84, at most 1600px wide, without upscaling. They are photographic delivery copies, not replacement imagery.

| Preserved original | New delivery file | Original bytes | WebP bytes |
|---|---|---:|---:|
| `public/images/hero/paraiso.png` | `public/images/cinematic/pool-aerial.webp` | 3,861,513 | 524,694 |
| `public/images/adventures/Skywalk.png` | `public/images/cinematic/skywalk.webp` | 3,263,437 | 414,558 |
| `public/images/adventures/Tropical ATV Adventure Trail.png` | `public/images/cinematic/atv-riding.webp` | 4,087,436 | 544,228 |
| `public/images/adventures/cablejeep.png` | `public/images/cinematic/cable-jeep.webp` | 3,220,478 | 423,816 |

Total for these four scene photographs: 14,432,864→1,907,296 bytes, about 86.8% smaller. Hero/pool/chapter uses share the same pool URL for browser-cache reuse. The original adventure-page/gallery PNG paths were preserved. This is not a claim that the entire site's original PNG transfer has been optimized.

The hero remains priority-loaded. Chapter images keep lazy loading. No runtime image endpoint is needed with the existing Next static export and unoptimized-image configuration.

The visible WebP detail was reviewed in desktop pool and Skywalk scene captures. No physical midrange Android frame-rate measurement was made; no 60 FPS guarantee is claimed.

## Validation

The production build was run in `%TEMP%/paraiso-cinematic-validation-20261117` to avoid the existing OneDrive generated-directory cleanup issue described in `MOTION_IMPLEMENTATION.md`. Source, public assets, scripts, and project configuration were copied; installed dependencies were junctioned. Only the temporary copy's Turbopack filesystem root was widened to resolve that junction. The project's `next.config.ts` remains unchanged.

- `npm run typecheck` and `npm run lint` passed in the project.
- `npm run build` passed with Turbopack in the clean validation copy, producing static public routes.
- All six existing `npm test` static-export audits passed against that output.
- Focused headless Edge tests passed for continuous expansion values, a stationary frame after scroll stops, reverse scrubbing, all four sticky chapters, hero reversal, runtime reduced-motion fallback, mobile fallback, JavaScript-disabled fallback, and browser back/forward. No page errors occurred.
- Desktop viewport captures of the expanded pool and Skywalk chapter were visually reviewed for composition and text readability.
- Responsive regression: all ten public routes passed at 360, 375, 390, 430, 768, 1024, 1440, and 1920px (80 combinations), with successful responses, one H1, no horizontal document overflow, and no failed completed photo requests.
- Gallery filtering, keyboard next/previous, synthetic touch swipe, Escape, focus containment/restoration, mobile menu Escape and route navigation, reduced-motion behavior, and visible JavaScript-disabled headings across all ten routes passed. The homepage scan recorded 44 entrance starts, no invisible checked headings/media/figures afterward, and no replay when revisiting sections. No page errors occurred.
- Hash comparison against the checkpoint found no changed or missing original public assets; booking configuration and package dependencies were unchanged.

QA files: `.local/cinematic-scenes-qa.cjs`, `.local/cinematic-scenes-qa.json`, `.local/cinematic-regression-qa.cjs`, and screenshot captures. These use the existing local Playwright/Edge tooling; no dependencies were added. The clean static preview is served at `http://127.0.0.1:3102`. The user's development preview continues to use port 3000. Original project `out/` is not the clean-copy build output.

Reference pages reviewed: [Apple homepage](https://www.apple.com/), [iPhone](https://www.apple.com/iphone/), and [MacBook Pro](https://www.apple.com/macbook-pro/). These were used as broad presentation references. Their assets, branding, typography, code, and exact sequences were not copied; extracted page content alone does not establish timing or performance equivalence.
