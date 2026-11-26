# How to add promotions and announcements

The homepage noticeboard follows the interactive Featured Experiences showcase. You manage it with image files and one TypeScript file. No account or admin screen is needed. The section always remains visible: current offers appear first; previously published, expired posters remain under **Past promotions**, clearly labeled as ended. When no current offers exist, the past posters are expanded by default alongside an honest current-offers notice.

## 1. Upload your approved poster

Copy the image into **`public/images/promotions/`** in this project.

- Prefer **WebP** for a small download with clear text. PNG and JPG/JPEG also work.
- A portrait poster around **1200 × 1500 pixels (4:5)** works particularly well. A square **1200 × 1200** poster also works; landscape and other proportions are supported.
- Preserve the original proportions. Do not stretch or crop a poster to meet those suggestions. Cards and previews use `object-fit: contain`, leaving space around the poster when necessary.
- Keep small print legible; aim for a file under 500 KB when possible, but prioritize readable text. Visitors can open the original poster from the preview for a closer look.
- Use a simple lowercase filename with hyphens, such as `your-approved-poster.webp`. Match spelling, capitalization, and extension exactly. Hosts may be case-sensitive even if your Windows computer is not.
- Upload only resort-approved posters. Do not reuse another resort's promotions, unverified discounts, prices, dates, or claims.

## 2. Add the content entry

Open **`src/data/promotions.ts`**. It contains the existing resort posters; their dates are transcribed from the artwork. Keep previous entries as records or deactivate them. An empty collection can also be used:

```ts
export const promotions: Promotion[] = [];
```

Replace that line with the following structure, then replace every `REPLACE` value with approved content. This is a template, **not an actual promotion**. Keep `active: false` until the content and matching image are ready.

```ts
export const promotions: Promotion[] = [
  {
    id: "replace-with-a-unique-id",
    title: "REPLACE with the approved announcement title",
    description: "REPLACE with a short, approved description.",
    image: "/images/promotions/your-approved-poster.webp",
    imageAlt:
      "REPLACE with a useful description of the poster and its key information.",
    active: false,
    displayOrder: 1,
  },
];
```

The website image path begins with `/images/promotions/`; **do not include `public`** in the `image` value. Keep the brackets and commas. To add another poster, copy an entire `{ ... },` entry inside the array and give it a different ID.

After reviewing your content and image, change `active: false` to `active: true` to publish the card in your next build, subject to its status and verified date range.

## 3. Optional information

Add any of these properties inside an entry, followed by a comma. Omit properties that are not relevant or verified.

| Property          | What to enter                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`        | A short approved label, such as `Announcement` or `Event`.                                                                                                                |
| `startDate`       | Verified first day in `YYYY-MM-DD` format. The announcement stays hidden before this date. |
| `endDate`         | Verified final day in `YYYY-MM-DD` format. The whole day is included in Asia/Manila; afterwards, a published poster moves to Past promotions. |
| `status`          | `published`, `draft` or `archived`. Only published entries appear; an omitted value preserves the existing `active` behavior. |
| `featured`        | Set `false` to omit an entry from the homepage. Omitted or `true` includes it when active and in date. |
| `verifiedPrice`   | Optional owner-confirmed price text. Never infer a current price from an expired poster. |
| `promotionalDate` | A human-readable, verified event or announcement date.                                                                                                                    |
| `validityPeriod`  | The verified validity period. The website adds the label `Valid:`.                                                                                                        |
| `details`         | Additional approved information displayed in the preview. Use `\n` inside the string for a line break.                                                                    |
| `ctaLabel`        | The button text. Without a link, this opens the preview and defaults to `View details`.                                                                                   |
| `ctaLink`         | An existing local page (for example `/contact/`), verified HTTPS destination, `mailto:` address, or `tel:` number. With a valid link, the label defaults to `Learn more`. |

For an optional Facebook inquiry link, use the resort's verified destination already recorded in `src/config/site.ts`. Confirm it is still correct before publishing. HTTPS links open in a new tab; local pages, phone numbers, and email links use their normal behavior. Do not create booking or payment destinations as part of this feature.

The poster itself always opens the full-poster preview. Visitors can close it with the close button or Escape. On phones, they can scroll the preview and use **Open original poster** to inspect small print. Keyboard focus stays inside the preview and returns to the opening control when closed.

## 4. Update, deactivate, remove, or reorder

- **Update:** edit the entry's text or point `image` to the new file. If replacing a poster, a new filename helps avoid an older image remaining in a visitor's cache.
- **Deactivate:** set `active: false`. This removes the card from the next exported homepage while keeping the entry for future use.
- **Keep a past poster visible:** retain its verified `endDate` and published/active state. After expiry it appears only under Past promotions, without a current-offer booking action.
- **Hide a promotion entirely:** set `status: "archived"`, `active: false`, or `featured: false`. Draft, disabled and explicitly archived entries do not appear in either homepage list. Public image files remain directly accessible even when their card is hidden.
- **Reorder:** edit `displayOrder`. Smaller numbers appear first; equal numbers keep their order in the file. The source array is not rearranged.

`startDate` and `endDate` control visibility. `promotionalDate` and `validityPeriod` remain descriptive labels and are never parsed or guessed. Invalid dates or reversed date ranges hide the entry. Do not add an expiry without a verified source.

The prerendered homepage uses the build date for its initial HTML. After hydration, visibility follows the visitor device's current date in Asia/Manila, with a midnight refresh and updates when the tab becomes visible. Rebuild/redeploy still applies when adding or editing content; rebuild at promotion boundaries for accurate dates in JavaScript-disabled visits and crawlers. An empty, inactive or future-only collection shows the neutral current-offers notice without hiding the section. The three original posters expired in May–July 2026; their original content, dates and images remain preserved in Past promotions.

Multiple current announcements use a manual scroll-snap carousel with touch, arrow buttons and keyboard Left/Right/Home/End navigation. It never auto-rotates. A single announcement needs no carousel controls.

## 5. Preview locally

Open a terminal in the project folder. If dependencies have not been installed, first run `npm ci`. Then run:

```sh
npm run dev
```

Visit `http://127.0.0.1:3000/#promotions`. If port 3000 is already occupied, use the address printed by the terminal. Save your edits and inspect the poster, descriptions, dates, and links. Try a phone-sized window. Click the poster, check the full preview, and close it with both the button and Escape.

For the production version, stop the development server with Ctrl+C, then run:

```sh
npm run typecheck
npm run build
npm test
npm run preview
```

The production preview uses the existing Next.js server build at `http://127.0.0.1:3000`. Stop it with Ctrl+C when finished. Do not deploy output from a failed build.

Run `npx tsx scripts/promotions-verify.ts http://127.0.0.1:3000` against a production preview to check homepage placement, all original posters, preview dialogs, mobile carousel controls, reduced motion, JavaScript-disabled fallback, and current offers at their original verified dates. Historical dates are simulated only in the test browser; promotion records and the database are never modified.

## 6. Deploy the updated static website

**Uploading a poster or changing this file alone does not update an already deployed website. Every change requires a successful rebuild and redeployment.**

Use your existing hosting workflow:

1. Save the updated `src/data/promotions.ts` and matching files in `public/images/promotions/`.
2. Run the checks and production build above.
3. With Git-connected hosting, commit/push those source changes through your normal release process. Ensure the host runs `npm run build` and publishes **`out`**.
4. With manual static hosting, upload the **complete contents of the freshly generated `out/` folder**, preserving its directories. Use the host's replace/deploy process so deleted content is removed too.
5. Open your live homepage and verify the poster preview, optional links, and mobile layout. Refresh the page if an earlier version is cached.

Deploy only the generated static files. No server, database, Facebook API, credentials, CMS, or authentication is required.
