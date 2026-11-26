# Restored premium motion — 18 November 2026

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

This is the current motion implementation, replacing the over-restrictive reveal configuration described in `NATIVE_SCROLL_PERFORMANCE.md`. Native scrolling and the stable hero image are preserved.

## Why the website appeared static

The previous controller treated four or fewer CPU threads, 4GB or less memory, Data Saver, and slow-update display hints as reasons to disable all motion. Its global CSS override also disabled hover and dialog transitions. The default QA browser reports **four CPU threads and no reduced-motion preference**, so it fell directly into that cutoff.

The entrance lifecycle also marked an element as played before its animation finished. React's development Strict Mode can run effect setup, cleanup, and setup again. Cleanup canceled the entrance, but the remembered flag prevented the second setup from playing it. Whole-grid fades and removed photo hovers further reduced the visible motion.

The current files, the previous local motion snapshots, Git history, and the `codex/pre-cinematic-20261117` checkpoint were reviewed. No unrelated changes or old scroll timelines were reverted.

## Restored effects

| Area | Motion |
| --- | --- |
| Home hero | Eyebrow, headline, supporting text, and the two buttons enter with 100ms stagger steps. The headline rises gently; supporting elements fade. The background photograph stays still. |
| About | Heading and description entrances, a soft photograph fade, and separate body-copy reveals. |
| Adventures | Individual experience rows fade up, with bounded stagger when nearby siblings enter together. Cover photographs have a subtle hover zoom. |
| Accommodations | Individual photograph cards fade up; overview images and text reveal softly. Existing contain-fit photographs retain their framing. |
| Swimming and dining | Headings rise; photographs fade; dining imagery has a gentle desktop hover response. |
| Gallery | Each photograph fades independently. Filters and pagination initialize entrances for newly mounted cards. Cover images have subtle desktop hover zoom. |
| Contact | Contact panels, their details, and booking/contact controls fade in together. |
| Other sections | Existing promotion cards, story chapters, selected headings, visit notes, FAQ introductions, and footer retain restrained entrances. |

All entrances last **900ms**, use **`cubic-bezier(0.22, 1, 0.36, 1)`**, and fade from opacity 0 to 1. Rise distance is **20px on desktop** and **16px on phones**. Sibling stagger steps are **100ms**, capped at 300ms for collections and 400ms for the five hero elements. This avoids a long animation queue. Image hover zoom is **1.025**, with the same 900ms easing, only for devices with a fine pointer and hover support. Existing short button feedback remains responsive.

## Initialization, accessibility, and performance

- CPU, memory, and Data Saver hints no longer suppress animations. The explicit `prefers-reduced-motion` setting remains respected, including live changes.
- A shared IntersectionObserver triggers entrances as targets enter the viewport. Observed targets are unobserved on entry. No scroll event handler, scroll-position calculation, animation frame loop, artificial scrolling delay, parallax, sticky timeline, or scroll-linked zoom was added.
- Completed entrances are remembered separately from active ones. Development effect cleanup can retry interrupted entrances; completed ones do not replay when scrolling back.
- Only direct child insertions/removals in gallery grids are watched. New cards are discovered locally, without rescanning the whole document. Removed cards and route changes release active animation references and observers.
- Base HTML is visible. Backwards animation fill applies only during an active, bounded stagger delay; no pending content is permanently hidden. Finite CSS animations return to the visible base style even if the completion handler fails. Missing or failed observer setup leaves content readable.
- Completed classes and temporary delay properties are removed. Focusing an entering control immediately cancels its animation and keeps it visible without replaying on blur.
- Motion uses opacity and transforms. Existing image sizes, source sets, lazy loading, hero priority, layout, colors, typography, navigation, and booking integration are unchanged. No dependency was added or restored.

## Files modified

- `src/components/motion-experience.tsx`: lifecycle fix, removal of hardware-based suppression, individual card/image/hero targets, stagger, focused gallery discovery, and cleanup.
- `src/app/globals.css`: 900ms easing, 20px/16px rises, active stagger support, subtle image hover, and removal of the blanket suppression rules.
- `README.md`: link to this current report.
- `docs/reference/NATIVE_SCROLL_PERFORMANCE.md`: marked the earlier reveal configuration as superseded.
- `docs/archive/PREMIUM_MOTION.md`: this implementation and verification report.

Only the two motion source files changed among the 188 source/public files recorded before this task. All images, content, other components, navigation, and booking files remain byte-for-byte unchanged. Existing uncommitted project work was preserved; no commit, remote push, or deployment was performed.

## Verification

- `npm run lint` and `npm run typecheck` passed. The final production build also passed TypeScript validation.
- `npm run build` passed with the default Turbopack builder in a clean temporary copy, leaving the running development server and OneDrive `.next` files in place. Only the temporary configuration's Turbopack root was widened to resolve a junction to installed dependencies; the repository's Next configuration was unchanged.
- All 11 existing static-export audits passed, including routes, links, fragments, media sources, booking destinations, fonts, and promotions.
- Browser QA uses the existing isolated Playwright installation and headless Microsoft Edge. All ten public routes were traversed at desktop 1440px and phone 390px widths. Each route produced actual entrance animation events, all measured durations were 900ms, and completed sections remained visible without horizontal overflow, broken completed images, or repeated entrances.
- The headline was sampled during its entrance with intermediate opacity and translation, demonstrating visible interpolation rather than an instant transition. Browser-computed easing and 100ms stagger steps were checked.
- Gallery pagination/filtering, individual newly added card reveals, hover zoom, lightbox keyboard controls, focus handling, mobile navigation, and browser back navigation were exercised.
- Low-resource mobile profiles were checked with two CPU threads/2GB memory and four CPU threads/4GB memory plus Data Saver. Entrances remained enabled, and native touch-event scrolling moved the document.
- Initial and live reduced-motion preferences, missing/failed IntersectionObserver setup, and readable JavaScript-disabled content on all ten routes were checked.
- The existing development server was checked separately to confirm the hero headline plays once with development lifecycle behavior.
- A final console check across all ten production pages and the development homepage found zero console errors or page errors. Desktop and mobile hero captures were visually reviewed for design preservation.

Browser scripts, measurements, results, and captures are in ignored `.local/premium-motion-*`; the existing test runtime is `.local/browser-qa/node_modules/playwright`. The validated static export is copied into the workspace `out/`, with the previous export preserved in `.local/premium-motion-before/out/`.

Physical iPhone/Android frame rates and Safari/Firefox-specific behavior still need manual device checks. Browser emulation is not a physical-device performance guarantee. No booking or external inquiry was submitted.
