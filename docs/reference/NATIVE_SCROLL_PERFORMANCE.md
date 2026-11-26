# Native scrolling and lightweight motion — 18 November 2026

> The reveal configuration below has been superseded by [Restored premium motion](../archive/PREMIUM_MOTION.md). Hardware-based motion suppression was removed, development initialization was fixed, and individual entrances and image hovers were restored. The native scrolling improvements remain in place.

This report records the earlier native-scroll optimization that replaced the continuous timelines in `CINEMATIC_SCROLL_GUIDE.md` and the Motion-based entrances in `MOTION_IMPLEMENTATION.md`.

## What made scrolling feel slow

The project uses Next.js 16.4.6 App Router, React 19, TypeScript, Tailwind 4, a shared global stylesheet, and a static HTML export. The installed Next.js guides for client/server components, CSS, and static exports were reviewed before implementation. Existing components and pages were modified in place.

There was no wheel/touch interception, Lenis-style smoothing library, or actual scroll-speed multiplier. The main problems were visual scroll effects and work performed during scrolling:

- `scroll-scenes.ts` scheduled a JavaScript update for each scroll frame, read element rectangles, and wrote transforms, opacity, scale, border radius, and stacking order across the hero, pool, chapters, and secondary photographs.
- The desktop pool used a 185svh track and sticky image expansion. The story used a 310svh track with sticky, overlapping chapters. The scroll position advanced while much of the visible content remained pinned.
- The hero zoomed to 1.07 scale while its copy moved up by as much as 70px and faded. Secondary images changed scale while scrolling. The hero also had a separate scale entrance and oversized image bounds.
- Entrance effects added image masking, directional movement, scale variants, per-card staggering, and multiple hero animation starts.
- A MutationObserver rescanned the main content when gallery or FAQ markup changed. The header also registered a scroll listener that called a React state setter on every scroll event.
- Global `scroll-behavior: smooth` animated anchor navigation. It did not control ordinary wheel scrolling, but it added delay to jumping between sections.

The [Tanza Oasis contact page](https://www.tanzaoasis.com/tanza-oasis-contact-one-of-the-best-hotels-in-cavite) was reviewed as the requested browsing reference. No reference assets, colors, content, or layouts were copied, and no timing or performance equivalence is claimed.

## Resulting behavior

- Native `scroll-behavior: auto` applies throughout. There are no application scroll/wheel/touchmove listeners, scroll-progress calculations, animation frame loops, or scroll-linked image transformations.
- Hero and pool photographs remain stable. All four experience chapters remain visible in normal document flow at every breakpoint. Existing text, photographs, links, and section order are retained.
- A shared IntersectionObserver triggers one-time CSS animations: a 750ms ease-out opacity fade for image groups and the hero headline, or a 750ms ease-out rise of 16px for selected text groups. Both meet the requested timing/distance ranges.
- Gallery and promotion grids reveal as groups. Individual cards, buttons, hero actions, and footer columns do not receive separate staggered sequences. Filtering and loading more photos keep new content immediately visible.
- No image zoom, reveal mask, parallax, animated progress indicator, or bouncing scroll cue remains. Existing small button/arrow feedback and short native dialog transitions remain; button transitions use 200–280ms timings.
- Animation classes are removed when animations finish or are canceled. Targets are remembered in a WeakSet and unobserved on entry, avoiding replay, persistent animation fill, and permanent `will-change` layers.
- Keyboard focus immediately cancels a reveal so a focused control remains readable. Losing focus does not restart it.
- A 1px, noninteractive document sentinel lets the header change appearance only when crossing its original 30px threshold. The default solid header remains readable without JavaScript or working observer support.

## Images, accessibility, and device support

The image pipeline already generates responsive WebP delivery variants with explicit dimensions, native srcset, lazy loading below the fold, and exclusive mobile/desktop hero preloads. Those optimizations were retained. Original photos, delivery URLs, focal positions, aspect ratios, and the hero's high loading priority were preserved. No image recompression, replacement, or claimed additional transfer-size reduction was needed for this change.

Reveals never hide pending content in base CSS. Pages remain readable without JavaScript, without IntersectionObserver, and if animation observer initialization throws. Motion is disabled for reduced-motion preferences, slow-update displays, Data Saver, devices reporting four or fewer CPU threads, or devices reporting 4GB or less memory. Missing hardware hints do not prevent normal browsing. Preference and connection changes are handled, and route changes clean up observers, event listeners, and running classes.

Static image frames retain their existing dimensions. No animation changes layout dimensions or uses blur, filtering, clip-path, scroll locks outside existing modal dialogs, or continuous geometry measurements. The original mobile menu, gallery lightbox, poster viewer, FAQ, and centralized booking integration remain intact.

## Files changed for this task

| File | Change |
| --- | --- |
| `src/components/motion-experience.tsx` | Replaced Motion and scroll-scene orchestration with one-time CSS reveal enhancement, cleanup, and device/accessibility fallbacks. |
| `src/components/scroll-scenes.ts` | Removed the unused continuous scroll controller. A pre-change copy remains in ignored `.local/native-scroll-before/`. |
| `src/components/layout/header.tsx` | Replaced the scroll listener with an observer sentinel and a readable failure fallback. |
| `src/components/experience-story.tsx` | Removed the scroll-scene marker and animated progress indicator; retained every chapter and photograph. |
| `src/app/page.tsx` | Removed the pool scroll-scene marker; retained the homepage composition and content. |
| `src/app/globals.css` | Native anchor scrolling; lightweight reveal keyframes; removed sticky timelines, hero overscan, image zooms, and the animated scroll cue; accessibility rules. |
| `package.json`, `package-lock.json` | Removed the unused `motion` dependency and its now-unused `framer-motion`, `motion-dom`, and `motion-utils` packages. No packages were added or upgraded. |
| `README.md` | Linked this current implementation report. |
| `docs/reference/MOTION_IMPLEMENTATION.md`, `docs/reference/CINEMATIC_SCROLL_GUIDE.md` | Marked the previous implementations as historical. |
| `docs/reference/NATIVE_SCROLL_PERFORMANCE.md` | Current implementation and validation report. |

The existing working tree contained substantial uncommitted work before this task. That work was preserved; this file list describes this task's changes only. No commit, remote push, hosting change, or booking configuration change was made.

## Validation

- `npm run lint`: passed in the workspace.
- `npm run typecheck`: passed; the final production build also passed TypeScript validation.
- `npm run build`: passed using the default Turbopack builder in a clean temporary validation copy. All public pages, the 404, robots, and sitemap exported successfully; the existing export finalizer normalized the ten Windows client-navigation payload paths.
- `npm test`: all 11 existing static-export audits passed. These include internal links and fragments, exported media and responsive source candidates, client-navigation payloads, booking fallback and destination safety, fonts, and promotions.
- Browser QA used the existing isolated Playwright installation with headless Microsoft Edge. All ten public pages passed at 360, 375, 390, 430, 768, 1024, 1440, and 1920px: 80 route/viewport combinations, one H1 each, native auto scrolling, no horizontal document overflow, and no failed completed image loads.
- The homepage traversal recorded 26 reveal starts: 13 fades and 13 rises. Revisiting the same sections did not replay them; classes were removed after completion. No section, checked heading, or checked media frame remained invisible. All four chapters occupied consecutive normal-flow positions.
- The hero retained its dimensions while scrolling and moved with the document. Browser inspection found no window scroll, wheel, or touchmove listeners. Wheel input moved the document and programmatic scrolling updated the position immediately.
- Desktop and mobile navigation, browser back/forward, homepage anchor navigation, header threshold behavior, FAQ categories/disclosure, and the existing promotion poster viewer were exercised.
- Gallery filtering, 12/24/36 incremental loading, keyboard arrows, touch-swipe handling, Escape, focus containment, and focus restoration were exercised against the actual resort photographs.
- A touch-enabled mobile context scrolled the document using a sequence of native touch events and navigated through menu taps. These were browser-emulated gestures, not physical-device tests.
- Initial and live reduced-motion changes, low CPU/memory hints, Data Saver, missing observer support, simulated animation initialization failure, and JavaScript-disabled readability on all ten routes were checked. No browser page errors occurred.
- Desktop and phone hero/story captures, the pool section, and the mobile gallery were visually reviewed. All four chapter photographs were decoded after entering the viewport. The measured homepage layout-shift sum in the automated run was approximately 0.003. This is a local observation, not a Lighthouse score or field performance guarantee.
- Hash comparisons confirmed that all 141 existing public assets, the booking configuration, site configuration, photo catalog, and responsive image mappings were unchanged. All source files in the build copy matched the workspace.

The existing development server and OneDrive-generated `.next` files were left in place. Validation used `%TEMP%/paraiso-native-scroll-validation-20261118-184310`, with a junction to installed dependencies. Only that temporary copy's Turbopack root was widened to resolve the junction; the project's Next configuration was not changed. The validated export is copied back to the workspace `out/`; the previous generated export is preserved under `.local/native-scroll-before/out/`.

QA scripts, results, and screenshots are under ignored `.local/native-scroll-*`. The tests use the existing `.local/browser-qa/node_modules/playwright`; no browser testing dependency was added to the application.

## Remaining manual verification

Physical iPhone/Android scrolling, Safari/Firefox-specific behavior, actual low-end-device frame rates, and production-network performance still need device testing. Browser viewport and touch emulation cannot establish those results. No external booking, inquiry, or payment was submitted during verification.
