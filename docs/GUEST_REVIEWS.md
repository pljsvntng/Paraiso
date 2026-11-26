# Guest reviews and Google Maps

Reviews are manually maintained in `src/data/reviews.ts`. The homepage carousel and `/guest-reviews/` grid display only genuine, approved entries. The collection is intentionally empty until permission-cleared reviews are supplied. No samples, star averages or invented review counts are published.

The implementation is free and uses existing dependencies: no Maps/Places APIs, API keys, Google Cloud billing, paid widgets, scraping, automatic review retrieval, database, custom form or submission endpoint. Guests submit directly to Google, which handles sign-in and storage. A review written on Google does not automatically appear on this site.

## Add or update a review

1. Open the official resort listing on Google Maps and find its review section.
2. Select a genuine review that may be republished with appropriate permission and attribution. Keep permission evidence private.
3. Open `src/data/reviews.ts` and add the actual guest's chosen public name, original words, genuine 1–5 rating and source. Use a unique `id` and `source: "Google Maps"`.
4. Add the original `reviewDate` (`YYYY-MM-DD`), `visitType`, and original review's Google share URL only when available. Dates and categories can be omitted.
5. Mark the reviewed entry `approved: true`. Leave it `false` to keep it off the public site. Never add private email addresses, booking details or private verification evidence; check the review text itself for sensitive information.
6. Save, run `npm run build`, and redeploy `out/` through the normal hosting workflow. To remove a testimonial, delete its entry or set `approved: false`, rebuild and redeploy.

Record shape (field names only; supply real values rather than publishing placeholders):

```ts
type GuestReview = {
  id: string;
  guestName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  message: string;
  source: "Google Maps";
  approved: boolean;
  reviewDate?: string;
  visitType?:
    | "Family Vacation"
    | "Staycation"
    | "Day Tour"
    | "Special Occasion"
    | "Group Outing"
    | "Resort Experience";
  originalReviewUrl?: string;
};
```

Malformed required fields are skipped gracefully: a nonempty ID, name (up to 80 characters), message (up to 6,000 characters), integer rating 1–5, Google Maps attribution and explicit approval are required. Invalid optional dates, categories and unsafe URLs are omitted. Duplicate IDs or matching guest-name/message pairs appear once. Public output uses an explicit field list, excluding unexpected private properties. Reviews render as plain text.

## Configure Google links

1. Open `src/config/google-reviews.ts`. `mapsUrl` is the exact official listing supplied by the owner; `site.mapUrl` reuses this configuration for existing location links.
2. Confirm the listing opens **Paraiso de June Quixote Ecofarm Resort**.
3. Leave `writeReviewUrl: null` until the owner supplies a verified direct link from Google Business Profile. Never derive or guess a Google Place ID or review URL.
4. When available, paste that verified HTTPS Google link into `writeReviewUrl`. Invalid or unsafe optional links fall back to the official listing.
5. Rebuild/redeploy and test both buttons. “View All Reviews on Google” always opens the official listing. “Write a Google Review” uses the verified direct link when configured; otherwise its helper text tells visitors to continue to Google Maps and choose **Write a review**. Both open a new tab with `noopener noreferrer`.

No additional setup is needed for the listing fallback. The live Google interface may ask the guest to sign in; the website never shows a submission confirmation or claims to know whether a review was submitted.

## Interaction and maintenance

The homepage shows up to six newest selected reviews in a native, swipeable 3/2/1-card carousel. Fewer reviews fill available slots naturally; controls disappear when there is nothing to scroll. There is no autoplay. Arrows, position indicators, Left/Right and Home/End support keyboard browsing. Long messages have native **Read More / Read Less** controls that also work without JavaScript.

The dedicated page supports star filters, category filters only when categories exist, newest/highest sorting and six-at-a-time loading. Counts refer only to the selected local collection. Empty collections and empty filter results have distinct states. Existing reveal motion is reused with 550ms entrances and reduced-motion support.

Run `npm run lint`, `npm run typecheck`, `npm run build`, then `npm test`. Browser checks should include 320, 375, 390, 430, 768 and 1440px, keyboard focus, native swipe, long text, single/few/many reviews, empty results, original links, and both Google actions. Test fictional data only in a disposable checkout, never in this project's public data file.

## Files changed for the Google integration

Created `src/config/google-reviews.ts`, `src/components/reviews/google-review-actions.tsx`, and `src/components/reviews/reviews-empty.tsx`.

Updated the existing review data/types/utilities, card/carousel/grid/section/styles, guest reviews page, site map-link configuration, contact privacy notice, README and static audits. Removed the previous `src/components/reviews/review-form.tsx` and all sample cards/form-only styles. Homepage placement, navigation, accommodation features, booking links, Facebook link and the existing free map embed remain in place.

Updated files:

- `src/data/reviews.ts`, `src/types/reviews.ts`, `src/lib/reviews.ts`
- `src/components/reviews/review-card.tsx`, `review-carousel.tsx`, `reviews-grid.tsx`, `reviews-section.tsx`, `reviews.css`
- `src/app/guest-reviews/page.tsx`, `src/app/contact/page.tsx`, `src/config/site.ts`
- `scripts/legacy/static-audit.test.mjs`, `README.md`, `docs/GUEST_REVIEWS.md`

## Verification — 20 November 2026

- `npm run build`, `npm run lint`, `npm run typecheck` and all **18** `npm test` audits passed. Existing routes, booking links, room pages, promotions, media and map regression audits passed.
- Installed Edge/Chromium checks covered empty and populated collections at **320, 375, 390, 430, 700, 768, 1024, 1051 and 1440px**. There was no horizontal page overflow. Arrows, dots, keyboard navigation, native touch-emulated swipe, reduced motion, long-message expansion, filtering, sorting, loading more and focus on newly loaded content passed.
- Isolated fixtures verified one/two/three/four-card layouts, hidden controls when unnecessary, optional category controls, original attribution, and native Read More without JavaScript. Unapproved/private content was absent from all **151** text/code files in the fixture export. No fictional reviews entered this project's actual data file.
- Both Google actions opened the exact owner-supplied listing in separate tabs without an opener. External destinations were captured for navigation testing; Google's live sign-in/submission flow was not automated and no review was submitted. No browser console errors or failed same-origin requests were observed.
- Remaining content setup: add genuine, permission-cleared reviews. A verified direct `writeReviewUrl` is optional; the existing Maps listing fallback already works without it. Rebuild and redeploy through the usual hosting workflow after content changes.
