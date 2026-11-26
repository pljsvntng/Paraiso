# Content and asset approval checklist

## Research status

The supplied official reference is https://www.facebook.com/paraisodejunequixote.111 . Earlier direct access returned a Facebook temporary-block page; no restrictions were bypassed and no protected media was scraped. On 18 November 2026, the exact Google Maps listing was verified against its name, Mabacao / Tulay B address, and matching official Facebook website link. Its official Share > Embed a map URL and directions destination are now configured; see [the map integration report](LOCATION_MAP.md). This verification does not establish current operations. The source of the reported attraction list is the user's project brief. This site does not convert those reports into claims of current availability.

## Needed from the client

- The supplied emblem is integrated as transparent white in `public/branding/icon.svg`, with identical forest-green artwork in `icon-on-light.svg` for cream headers and the favicon. Keep both variants' geometry in sync and rebuild for future updates; see [the logo report](reports/LOGO_UPDATE.md). The surrounding design remains subject to owner approval.
- Uploaded resort photography is integrated; see [the image integration report](reports/IMAGE-INTEGRATION.md). Permission to publish identifiable guests remains the owner's responsibility.
- Approved accommodation categories, capacities, bed configurations, amenities, and current rates if public display is wanted.
- Confirmed currently operating attractions, schedules, prices, participation requirements, and current guest guidance.
- Cottage names, capacities, rates, swimming access, operating hours, and guest guidelines.
- Restaurant introduction, actual menu, hours, prices, and dietary inquiry arrangements.
- Approved packages, inclusions, prices, valid dates, and complete terms. None are currently asserted.
- Verified contact number and email. The published address, Google Maps pin/embed, and directions destination are configured; confirm any future listing or arrival-route changes before updating them.
- Verified history, business copy, accessibility information, and approval of the privacy notice and proposed visual identity.
- Final website domain and a separate reservation URL from the development partner.

## Add photographs

Preserve authorized originals in `public/images/<category>/`. Add visually verified subjects and accurate alt text to `src/data/photo-catalog.json`, then run `npm run images:prepare` (also runs before production builds). This generates smaller delivery copies without modifying the originals. `src/config/media.ts` shares the catalog across page sections and the gallery. The legacy `site.heroImage` is still supported and takes precedence over the centralized hero source.

The gallery collection in `src/data/gallery.ts` derives sources from the reviewed catalog. Keep uncertain photos outside that catalog until their subjects are identified. All uploaded originals were preserved during integration. Check image loading, crops, alt text, and file size after adding photographs.

For accommodations and packages, add records in their typed data files and publish only approved records. For adventures, set `confirmed` after current operations are approved, add authorized images, and revise copy/status to match the verified information.

## Before public launch

Review every page, replace or deliberately retain labeled placeholders, verify link destinations and location, set `site.url`, then set `site.allowIndexing` to `true`. Metadata and robots default to noindex while content awaits review. No canonical origin or map pin is invented. The static sitemap is empty until a domain is provided.
