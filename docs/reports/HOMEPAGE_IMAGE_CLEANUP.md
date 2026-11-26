# Homepage image cleanup — 18 November 2026

The homepage now uses **six unique resort photographs**, down from 14 resort-photo placements. The three promotion posters remain unchanged, so the total number of homepage image elements falls from 17 to 9. Every original file, responsive delivery variant, and dedicated-page photo collection is preserved.

## Retained photographs

| Homepage section | Retained photo | Reason |
| --- | --- | --- |
| Hero | Resort aerial overview | Strongest single introduction to the pools, greenery, and buildings; original priority loading and phone crop are preserved. |
| Adventures | Skywalk entrance | Clear architectural focal point and a preview of the elevated attractions. |
| Adventures | ATV riders on the hillside trail | Shows guests participating in an outdoor activity, complementing the Skywalk view. |
| Swimming | Main pool at ground level | Adds a useful visitor-level perspective rather than another aerial overview. |
| Accommodations | Hillside cabins | One clear overnight-stay preview, with the detailed collection on Accommodations. |
| Dining | Dining pavilion entrance | A distinct facility preview, with dining details and further photos on Dining. |

These are the same existing files and quality settings. The hero remains eagerly loaded with high priority; every below-the-fold photograph and promotion poster retains native lazy loading, dimensions/frame sizing, responsive sources, and existing motion.

## Removed homepage displays

- **The second aerial image in the welcome section.** It showed the pools and grounds from another angle shortly after the main aerial hero. The introduction and About link remain, arranged in a balanced text-only composition that stacks on phones.
- **The extra four-photo experience showcase.** Its pool, Skywalk, and ATV shots repeated the main category previews. The Cable Jeep chapter is also omitted from the homepage to keep the adventure selection focused. Cable Jeep remains on Adventures and in the full Gallery; the reusable showcase component and all its image files remain in the project.
- **The three-photo mini-gallery.** It repeated the hero and main pool, plus another bridge view. The Gallery heading and direct link remain as a compact invitation to explore the full collection. The full Gallery's filtering, pagination, original-photo links, and lightbox remain unchanged.

The welcome/About, Adventures, Swimming, Promotions, Accommodations, Dining, Gallery invitation, experience links, FAQ, location/map, final booking call to action, navigation, and footer all remain. Activity availability guidance remains in the main Adventures/Swimming copy and dedicated pages.

## Files modified

- `src/app/page.tsx`: removed the redundant photo displays and their unused component imports; grouped the existing introduction copy into heading/description columns.
- `src/app/globals.css`: homepage-scoped introduction layout and compact Gallery invitation spacing. No image frame, typography family, theme color, animation setting, or dedicated-page collection was changed.
- `README.md`: linked this report.
- `docs/reports/HOMEPAGE_IMAGE_CLEANUP.md`: this inventory and verification report.

No image files or reusable components were deleted. No dependencies, booking destinations, promotion content, navigation, map configuration, or motion controller were modified. Hash verification found **zero changed or missing files among the 141 existing public assets**, and no changes to other source files outside the homepage and its stylesheet.

## Validation

- Production build and lint passed. The build's TypeScript validation passed, and all **12 existing static-export audits** passed, including booking destinations, promotions, responsive sources, route links, and the verified location map.
- The default Turbopack build used the existing clean temporary workspace, leaving the running development server and OneDrive `.next` directory intact. Only that temporary copy's filesystem root is widened for its dependency junction; the project's Next configuration is unchanged.
- Desktop and phone browser checks traversed the entire homepage and confirmed six distinct resort images, three unchanged posters, successful completed image loads, all main section anchors, a working Gallery link, working promotion preview, and no lingering reveal classes or replayed entrances.
- Responsive checks passed at **360, 390, 700, 768, 1024, 1050, 1051, 1440, and 1920px**, with no horizontal overflow. The introduction stacks correctly on phones, and the Gallery invitation has no leftover image grid or empty spacer.
- The unchanged full Gallery was opened through the homepage link and its 12-to-24-photo pagination was exercised at desktop and phone sizes. No browser page errors occurred.
- Desktop and phone captures of the introduction and Gallery invitation were visually reviewed. The hero, selected photographs, and image quality were also reviewed without modifying their files.

### Local before/after measurements

Fresh browser contexts, device scale factor 1, identical viewport sizes, and a full-page traversal were used for each version. Image requests/bytes include same-origin photographs and the unchanged promotion posters; they exclude Google's map tiles, JavaScript, fonts, and HTTP overhead. These are local observations rather than a Lighthouse score or physical-device performance guarantee.

| Measurement | Desktop 1440px: before → after | Phone 390px: before → after |
| --- | --- | --- |
| Resort photo placements | 14 → 6 | 14 → 6 |
| All homepage image elements | 17 → 9 | 17 → 9 |
| Local image requests | 16 → 9 | 16 → 9 |
| Encoded image body bytes | 4,680,018 → 2,963,142 | 3,968,682 → 2,251,806 |
| Document height | 14,319 → 9,737px | 15,723 → 11,705px |

That is approximately **37% less image payload and a 32% shorter page on desktop**, and **43% less image payload and a 26% shorter page on phone** in this run. The improvement comes from removing displays and their requests, not reducing photo quality or changing original files.

QA inventories, results, screenshots, and the pre-change source snapshot are in ignored `.local/homepage-*`. The validated static export is copied back into `out/`; the previous generated export is preserved in `.local/homepage-images-before/out/`. Existing uncommitted project work is preserved; no commit, push, or external deployment was performed.
