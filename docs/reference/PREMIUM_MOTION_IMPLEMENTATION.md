# Premium motion implementation

The existing Next.js 16.4.6 / React 19 static-export website was enhanced in place. The installed Next.js navigation, CSS, image and template guides were reviewed first. The existing responsive layouts, copy, photography, room routes, navigation, maps, booking destinations, gallery, promotions and reviews remain intact.

There was already a shared IntersectionObserver reveal controller and accessible native dialogs. Extending those components avoids competing animation systems. No Motion, GSAP, Lenis, video, 3D library or application dependency was added. CSS animations and the browser's Web Animations API provide the required effects.

## Shared motion language

Timing is centralized in `src/app/globals.css`:

| Token | Duration | Purpose |
| --- | --- | --- |
| `--motion-ui` | 220ms | Controls, arrows, focus and press feedback |
| `--motion-hover` | 300ms | Cards, dialogs and photograph changes |
| `--motion-section` | 640ms | One-time section entrances |
| `--motion-image` | 820ms | Masked hero lines, curtain reveals and image hover |
| `--motion-page` | 400ms | Committed route entrance |
| `--motion-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Shared easing |

Nearby section siblings use a 90ms stagger capped at 270ms. The hero uses six ordered steps, from 0ms to 450ms. Mobile menu links use 65ms steps capped at 325ms. Desktop text rises 18px, while phone text rises 12px. Base HTML is visible; only active entrances get animation classes, which are removed on completion.

## Implemented behavior

- **Hero:** the original heading is split into two clipped line wrappers for masked reveals. Eyebrow, heading lines, description and actions enter in order. The existing photograph and readable gradient remain. A single 16-second desktop Ken Burns movement finishes at 1.045 scale. It pauses outside the viewport and in background tabs, and is disabled on tablets, phones, touch devices and reduced-motion profiles. The scroll cue moves on interaction rather than looping.
- **Sections and photography:** existing copy groups reveal once. The full-width pool and dining feature use restrained curtain reveals. Accommodations and promotion introductions use the same controller. Existing story chapter copy can enter independently while all chapters remain in normal document flow. No pinned timelines, artificial scroll distance or scroll interception was introduced.
- **Navigation:** the original transparent-to-solid observer header remains. Native dialogs gain a horizontal mobile-menu entrance, staggered links and coordinated backdrop transitions. The Accommodations link stays active on its detail pages. Route changes close an open menu; Escape and native focus containment remain available.
- **Cards and controls:** accommodation cards lift 3px with a subtle border/shadow response on desktop, retaining their existing image zoom and complete visible content. Promotion cards receive the same restrained lift. Arrows move in their intended direction; scroll arrows move down and accommodation arrows move right. Footer links and existing form controls receive short feedback. The previously undefined focus color now has an explicit accessible value.
- **Page changes:** a 400ms opacity entrance starts only after the new page commits, with no outgoing delay, loader or navigation interception. New-page focus moves to the existing main landmark using `preventScroll`. Next.js still handles forward scrolling and history restoration. History changes skip the page fade and first-viewport entrances. CSS time values are converted from either milliseconds or seconds, including production-minified `.4s`, before passing them to Web Animations.
- **Galleries:** native lightbox entrances/exits and image changes share the motion tokens. The duplicate accommodation photograph animation was removed. The resort viewer explicitly restores thumbnail focus, ignores predominantly vertical swipes, and resets canceled gestures. Existing original-photo links, contain-fit lightboxes, filtering, pagination, arrow keys and touch controls are retained.
- **Reviews:** the existing manual, touch-scrollable carousel retains its controls and stable card layout. Position indicators now animate with transforms instead of width changes. There is no auto-rotation to interrupt reading or require pausing.
- **Image delivery:** mobile size hints now describe the actual viewport instead of requesting 800px or 1200px layouts on narrow screens. Existing WebP source sets, originals, aspect ratios, focal positions and loading priorities remain. The three existing WOFF2 fonts are preloaded to reduce late discovery and font changes.

## Accessibility and lifecycle

Reduced motion is respected initially and when changed during a visit. Active entrances, dialog transitions and desktop image movement are canceled. Section and route motion use opacity/transforms, with no per-frame JavaScript, wheel interception or continuous geometry measurements. Hover image treatments are restricted to fine-pointer devices.

One observer handles entrances and hero visibility. Completed elements are remembered in a WeakSet. A focused control is made immediately visible. Gallery/review mutation handling is scoped to their grids, and removed nodes are unobserved. Observers, visibility/media/history/focus listeners and page animations are released on cleanup. JavaScript-disabled pages and missing observer support retain readable static content.

## Modified source files

| File | Changes |
| --- | --- |
| `src/components/motion-experience.tsx` | Shared targets, hero order, curtains, visibility lifecycle, page fade, focus, history and cleanup |
| `src/app/globals.css` | Motion tokens, masks, curtains, desktop zoom, menu/dialog sequences and shared interactions |
| `src/app/page.tsx` | Hero line wrappers and viewport-based pool image size hint |
| `src/app/layout.tsx` | Preload the three existing font files |
| `src/components/layout/header.tsx` | Menu order, route close/focus and accommodation parent indicator |
| `src/app/accommodations/accommodations.css` | Card hover, shared image timing and removal of the duplicate photograph entrance |
| `src/components/gallery/resort-gallery.tsx` | Explicit thumbnail focus return and direction-aware touch handling |
| `src/components/reviews/reviews.css` | Shared timing and transform-based carousel indicators |
| `src/components/media.tsx` | Correct mobile responsive-image size hint |

`README.md` links this report. Next.js also regenerated `next-env.d.ts` to reference production build types instead of development types. All 171 existing public assets, all content/configuration catalogs, `package.json` and `package-lock.json` match the pre-task snapshot. Existing uncommitted work was preserved. No commit, remote push, hosting change or external booking submission was performed.

## Validation evidence

- `npm run lint`: passed.
- `npm run typecheck`: passed, including a fresh check after the final build.
- `npm run build`: passed with the installed Next.js/Turbopack builder. All 16 visitor pages, five of which are accommodation details, exported successfully along with framework/support output. The existing export finalizer normalized 16 Windows navigation payload paths.
- `npm test`: all 18 existing audits passed. They cover routes, links/fragments/media, static navigation payloads, accommodation/photo associations, maps, booking destinations, fonts, responsive sources, promotions and review publication/filter/link safety.
- **48 browser layout combinations passed:** all 16 visitor routes at 390px, 768px and 1440px. Each had one H1, no horizontal document overflow, no broken completed images, no hidden checked content and no lingering entrance classes after traversal. The final automated browser run captured no console errors, page errors or failed local HTTP responses.
- Hero events confirmed two 820ms masked lines, 90ms sequence steps, and a finite 16-second desktop zoom. The zoom paused when scrolled away; phones used a static hero photograph. Revisited elements did not replay their entrances.
- Same-document route navigation used an actual 400ms entrance and focused the main landmark. Browser Back skipped the fade and restored the preceding scroll position.
- Resort gallery filtering, incremental loading, keyboard arrows, Escape and focus return passed. Accommodation card navigation, the active parent indicator and its photo viewer passed.
- Mobile menu sequencing, route close, Escape and trigger focus passed. FAQ disclosure passed.
- A separate touch-enabled mobile run verified native document scrolling through browser touch events. Synthetic gallery gestures verified that vertical movement leaves the current photograph in place while a horizontal swipe advances it.
- Review carousel arrows and keyboard Home/End passed; the carousel remained stationary without input. Promotion poster opening, uncropped contain fit, Escape and focus return passed. Desktop accommodation hover computed a 3px lift.
- Live and initial reduced-motion checks passed. All 16 routes remained readable without JavaScript. A missing IntersectionObserver left the homepage visible.
- Desktop, tablet and phone hero screenshots, a desktop accommodation card, dining photography and the phone promotion viewer were visually reviewed.
- Source snapshots/hashes confirm that only the nine listed source files changed among the 241 source, public and configuration files captured before implementation. All 171 public assets remain byte-for-byte identical.

Reproducible local browser scripts, captures, source snapshots and JSON measurements are stored under ignored `.local/premium-motion-20261120/`; they use the existing isolated Playwright installation in `.local/browser-qa/` and headless Microsoft Edge. Run the static preview on port 3125, then `node .local/premium-motion-20261120/qa.cjs` and `node .local/premium-motion-20261120/interactions.cjs` to repeat these checks.

## Performance limitations

The final isolated **Lighthouse 13.6.0 mobile performance score was 60/100** against the uncompressed local static preview. **The requested 90+ target was not reached.** The raw measurement is recorded in `.local/premium-motion-20261120/lighthouse-mobile-final.json`. Lighthouse is an audit-only tool, installed through the package runner's cache; application dependencies were not changed.

| Metric | Final local mobile audit |
| --- | --- |
| First Contentful Paint | 1.9s |
| Largest Contentful Paint | 8.8s |
| Total Blocking Time | 540ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 2.1s |
| Transferred resources | 1,715KiB |

The audit still identifies 174KiB of potentially unused JavaScript and 25KiB of potentially unused CSS. Image transfer, the existing application payload and hydration remain performance work beyond the motion refinements. Corrected image sizing and font preloads are included, but this report does not claim those changes meet the requested performance target. Further payload splitting and production delivery measurements are needed. The final browser traversal independently measured approximately 0.00046 cumulative layout shift; that is a local observation, not a field guarantee.

Physical Android/iPhone frame rates and Safari/Firefox-specific rendering remain untested. Browser viewport and touch emulation are not physical-device performance guarantees. The current preview server serves uncompressed static assets; production CDN compression/caching and deployed-network performance require separate verification.
