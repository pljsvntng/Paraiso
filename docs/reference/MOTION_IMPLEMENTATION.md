# Paraiso motion implementation

> Historical implementation. The current CSS reveal system and native scrolling behavior are documented in [Native scrolling and lightweight motion](NATIVE_SCROLL_PERFORMANCE.md). The Motion entrances and parallax described below have been replaced.

> The later [cinematic scroll upgrade](CINEMATIC_SCROLL_GUIDE.md) extends this implementation with continuous hero, expansion, and sticky-story timelines and connects the pool aerial. Statements below about null hero/pool sources describe the earlier implementation snapshot.

Implemented 17 November 2026. Existing layouts, branding, content, photograph URLs, and booking configuration are preserved. No dependencies were added.

## Reversible checkpoint

Branch `codex/pre-motion-20261117`, commit `a8b5d1ee50d38f2fc119e7ae891d1750dc95f01e`, captures the existing tracked and untracked project files before motion changes. It was made using a temporary Git index; the user's active index and branch were not switched or committed.

## Changed files

| File | Purpose |
|---|---|
| `src/components/motion-experience.tsx` (new) | Shared progressive enhancement using the installed Motion package's small `motion/mini` DOM animation API, one IntersectionObserver, route cleanup, dynamic gallery discovery, and conditional desktop parallax. |
| `src/components/reveal.tsx` | Preserves the existing Reveal API as static readable markup with a reveal marker. Its old separate animation implementation is now handled by the shared observer. |
| `src/app/layout.tsx` | Mounts one motion controller; public pages remain server components. |
| `src/app/globals.css` | Motion timings, hover/focus/press treatment, native dialog transitions, gallery overlays, limited scroll cue, and reduced-motion rules. Replaces the old menu keyframe/underline treatment. |
| `src/components/gallery/resort-gallery.tsx` | Keys the lightbox photograph by its existing ID, allowing a short fade when changing photographs. Preserves filtering, captions, next/previous, keyboard, Escape, touch, and native dialog focus management. |
| `docs/reference/MOTION_IMPLEMENTATION.md` (new) | This implementation and validation report. |

## Motion by area

| Area | Treatment |
|---|---|
| Home hero | Label, masked heading, description, and two actions enter with a short 65ms stagger. The scroll cue runs only three gentle cycles. A configured hero image fades/scales 1.04→1.00. |
| Home introduction / About | Text rises 10–20px. Editorial media gets a shallow bottom-edge mask reveal. About copy and quote enter separately. |
| Adventures | Short directional media entrances on desktop, shortened rises on phones, independent copy reveals, subtle existing photo zoom, overlay transition, and arrow response. Actual eight activities and images are preserved. |
| Accommodation | Slower 850ms opacity/scale treatment for warm overview media and Home stay imagery, accompanied by quieter text reveals. No room categories added. |
| Swimming | Pool media reveal plus conditional desktop image drift; overview text enters independently. No pool image was substituted. |
| Dining | Editorial image reveal, heading/copy entrance, controlled desktop image hover. No food cards or photographs invented. |
| Gallery | Nearby figures receive a bounded 60ms stagger, opacity/scale entrance, gentle hover overlay, and the existing zoom. Lightbox open/close uses native discrete transitions where supported; photograph changes fade briefly. |
| Packages / Contact / FAQ | Shared intro reveals; packages' overview, contact panels, and visit notes use light entrances. FAQ controls/content remain usable. |
| Footer / navigation | Footer columns reveal independently. Header transitions color/background, links use a scale underline, buttons have restrained arrows/press states, and the mobile menu uses the same short dialog transition language. |

Sources for hero, pool, accommodation overview, dining, grounds, and facilities are still null in the existing media configuration. Their existing placeholders remain. Conditional photo-specific motion will activate when the client supplies and connects those photos. It cannot be visually approved against missing photography today.

## Accessibility and performance

- Static HTML is visible by default. No opacity-zero CSS gate or JavaScript requirement hides essential text. Reveals start only when a target intersects the viewport, then it is unobserved.
- Reduced-motion preference prevents Motion animations and parallax. Preference changes clean up observers, listeners, pending frames, and active animation controls. CSS suppresses nonessential animation and uses native non-smooth scrolling in this mode.
- Desktop parallax requires both a viewport above 1050px and a fine pointer. It uses a single requestAnimationFrame per scroll event and at most ±12px translation; no React state changes run per scroll. Resizing to mobile resets image offsets.
- Most motion uses opacity and transforms. A small clip-path inset is reserved for editorial image entrances; there are no blur effects, scroll locks, scroll snapping, or layout-size animations.
- Existing native dialog focus trapping and Escape remain intact. Discrete CSS transitions progressively enhance opening/closing; unsupported browsers retain immediate native behavior. Focus outlines and information remain available without hover.
- Mobile entrance distance is 10px and duration 450ms. Hover embellishments are gated to fine pointers; touch does not depend on hover to reveal information.
- MutationObserver only watches child-list changes in main, allowing gallery filters to introduce new figures. It does not observe animated style changes. Seen elements use WeakSet/WeakMap storage.
- Image loading priorities and lazy loading are preserved. The existing large PNG payload is unchanged; this work does not claim to optimize photograph transfer sizes.

## Validation environment

The existing OneDrive `.next/static/` generated directory caused `EPERM` during the in-place build cleanup. Validation therefore uses a fresh source/public/config copy at `%TEMP%/paraiso-motion-validation-20261117`, with a junction to the installed dependencies. Only that temporary copy's Turbopack root is widened to the user directory so dependencies outside the copy can resolve. Project build configuration was not changed.

The clean copy uses the normal `npm run build` command and static export. Its output is served locally at `http://127.0.0.1:3101` for browser QA. The user's development server at port 3000 remains available. The project's original `out/` should not be treated as the freshly validated output.

Tests and screenshots are recorded under ignored `.local/` (`motion-qa.cjs`, `motion-qa.json`, `motion-home-mobile.png`, `motion-adventures-desktop.png`). Browser QA uses the existing local Playwright installation and headless Edge; no package install is needed. See the completion report for executed results. Browser emulation does not establish frame-rate performance on a physical ordinary Android phone.

## Executed results

- `npm run lint`: passed in the project.
- `npm run typecheck`: passed in the project; clean production build also passed TypeScript validation.
- `npm run build`: passed in the clean validation copy with Turbopack; all public routes statically exported. In-place build remains subject to the generated-directory EPERM described above.
- `npm test`: all six existing static-export audits passed against the fresh validation export.
- Headless Edge responsive matrix: all ten public pages passed at 360, 375, 390, 430, 768, 1024, 1440, and 1920px (80 combinations), with one H1, successful responses, no horizontal document overflow, and no failed completed image requests.
- Homepage scroll: 47 animation starts observed while moving through the page, including mask and scale variants; zero invisible checked headings/media/figures after completion. Revisiting the same sections did not replay reveals.
- Gallery filtering, lightbox keyboard arrows, synthetic touch swipe, Escape, dialog focus containment, and focus return: passed. Mobile menu Escape and navigation to About: passed.
- Reduced motion: zero running animations, native `auto` scroll behavior, visible heading. JavaScript-disabled checks found visible headings on all ten public routes.
- No browser page errors during the interaction checks. Touch test events were synthetic; this is not physical-device testing.
