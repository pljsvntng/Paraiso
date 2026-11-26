# Homepage Promotions restoration

## Root cause

The component, imports, promotion records and all three original posters were still present. The homepage refinement introduced this rule in `src/app/home.css`:

```css
.home-page .promotions-section:has(.promotions-empty) {
  display: none;
}
```

The existing date filter correctly found no current promotions on 22 November 2026: the saved offer periods ended on 31 May, 21 June and 11 July 2026. That produced `.promotions-empty`, which caused the CSS to hide the **entire section**. Broken asset paths and entrance animations were not the cause. The earlier homepage report also recorded the decision to hide empty announcement blocks. Git has only the initial checkpoints; these promotion files remain in the working tree and did not require recovery.

## Changes

- Removed the visibility rule. The noticeboard stays present even when there are no current offers.
- Placed Promotions immediately after the existing interactive Featured Experiences. Preserved gathering information, FAQs, reviews, location/contact and the final reservation action. FAQs precede reviews so the requested final section sequence is maintained.
- Retained every original promotion record, date, description and image unchanged. Expired, previously published posters appear under **Past promotions**, with explicit ended labels and no current-offer booking action. This disclosure starts expanded when no current offers exist. Draft, disabled, explicitly archived and invalid entries remain excluded.
- Preserved original-poster links, native preview dialogs, keyboard/Escape/focus behavior and manual carousel controls. Current offers retain their configured links and the existing reservation inquiry action, including the offer subject.
- Added forest-green/cream styling scoped to `#promotions`, contained poster images, readable typography, restrained hover effects and mobile spacing. Reused the existing shared entrance observer; reduced motion and JavaScript-disabled content remain supported. No CSS hides pending reveals.
- Updated promotion maintenance guidance and added date-boundary and browser regression checks.

No booking, tracking, payment, PostgreSQL, permission, category-page or interactive-showcase implementation was changed. No migration or dependency installation is required.

## Files changed for this fix

- `src/app/page.tsx` — section order and gathering section number.
- `src/app/home.css` — removed the hiding rule.
- `src/components/promotions/promotions-section.tsx` — section heading, number and scoped stylesheet.
- `src/components/promotions/promotion-cards.tsx` — persistent empty state and past-poster access using the existing cards and dialogs.
- `src/components/promotions/promotions.css` — scoped presentation and responsive refinements.
- `src/lib/promotions.ts` — past-promotion selection using existing publication/date rules.
- `tests/promotions.test.ts` — expiry boundaries, publication exclusions and original-record preservation.
- `scripts/promotions-verify.ts` — real-content browser verification at current and historical offer dates.
- `docs/HOW_TO_ADD_PROMOTIONS.md`, `docs/reports/HOMEPAGE_FEATURED_EXPERIENCES.md`, and this report — accurate maintenance and root-cause documentation.

## Verification

- `npm run lint` — passed. The final browser-check script also passed a targeted lint run after its screenshot refinements.
- `npm run typecheck` — passed, including a final run after the verification script was updated.
- `npm run build` — passed, including responsive-image preparation, TypeScript and all 22 prerendered pages.
- `npm test` — **54 passed, 0 failed**. Includes the three new promotion checks and existing real, isolated PostgreSQL booking/status/tracking/permission/history regressions. The initial concurrent build/test attempt failed because the build temporarily removed `.next/BUILD_ID`; rerunning the complete suite after the build passed. Existing optional admin/booking browser suites were not enabled; Promotions browser verification was run separately.
- `npx tsx scripts/promotions-verify.ts http://127.0.0.1:3033` — passed against the production build, including a final run with explicit checks that card opacity returns to 1 after entrance animations.
  - Homepage ordering and preservation checked at **320, 375, 390, 430, 768, 1024 and 1440px**; no horizontal page overflow.
  - All three original posters decoded successfully and their original URLs returned HTTP 200. Images use `object-fit: contain` so printed terms remain visible.
  - Each poster preview opened, displayed the original content and expired notice, retained the original-poster link, excluded expired booking actions, closed with Escape and restored focus. The close button was also exercised on current previews.
  - Mobile carousel Home/End and next control worked.
  - At the actual date, the section and all past posters stayed visible. A browser-only historical clock separately exercised each **real** offer during its original May/June date range; current cards, preview dialogs and the existing reservation links with the correct offer subject worked. No promotion data or database records were rewritten for these checks.
  - Reduced-motion and JavaScript-disabled visits retained the section and original-poster fallback.
  - No uncaught exceptions or application console errors. The existing external Google Maps iframe was excluded from local checks.
  - SHA-256 comparisons confirmed the original promotion data/images, all interactive-showcase files and the Adventures, Accommodations, Swimming and Dining page files were unchanged.
- Visually reviewed final desktop and mobile screenshots in `.local/promotions-review/`; structured browser results are saved there as `results.json`. The screenshot capture hides unrelated fixed navigation only while taking the image; the site itself is unchanged by that test setting.

The homepage noticeboard contains no currently valid saved promotion on 22 November 2026. New resort-approved offers will use the existing active/publication/date rules. Expired offer dates were deliberately preserved rather than extended or presented as current.
