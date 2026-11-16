# Content and asset approval checklist

## Research status

The supplied official reference is https://www.facebook.com/paraisodejunequixote.111 . Direct access returned a Facebook temporary-block page; no restrictions were bypassed and no protected media was scraped. Public Google Travel listings corroborate the resort name and reported Maragondon / Mabacao Tulay B location, but do not establish an exact verified pin or current operations. The source of the reported attraction list is the user's project brief. This site does not convert those reports into claims of current availability.

## Needed from the client

- Official logo in SVG or high-resolution PNG, and approved brand colors. The current botanical wordmark is proposed design work.
- Authorized landscape hero photograph with room for a left-positioned heading; mobile crop and descriptive alt text.
- Resort, greenery, wooden architecture, pool, cottage, activity, accommodation, restaurant, and dining photographs; permission to publish identifiable guests.
- Approved accommodation categories, capacities, bed configurations, amenities, and current rates if public display is wanted.
- Confirmed currently operating attractions, schedules, prices, participation requirements, and current guest guidance.
- Cottage names, capacities, rates, swimming access, operating hours, and guest guidelines.
- Restaurant introduction, actual menu, hours, prices, and dietary inquiry arrangements.
- Approved packages, inclusions, prices, valid dates, and complete terms. None are currently asserted.
- Verified exact business address, Google Maps pin/embed, preferred directions URL, contact number, and email.
- Verified history, business copy, accessibility information, and approval of the privacy notice and proposed visual identity.
- Final website domain and a separate reservation URL from the development partner.

## Add photographs

Place authorized, resized assets in `public/images/<category>/`. Keep descriptive filenames, sensible compression, and adequate resolution; avoid shipping camera originals. Add the relevant `/images/...` path to `site.heroImage`, a page's `Media` component, or the typed content record. The homepage uses the configured hero automatically when available.

For the gallery, set a real `src`, accurate `alt`, and `approved: true` in `src/data/gallery.ts`. Only approved real sources open in the lightbox. Do not set `approved: true` for the existing layout placeholders. No resort photographs have been supplied or removed during this conversion.

For accommodations and packages, add records in their typed data files and publish only approved records. For adventures, set `confirmed` after current operations are approved, add authorized images, and revise copy/status to match the verified information.

## Before public launch

Review every page, replace or deliberately retain labeled placeholders, verify link destinations and location, set `site.url`, then set `site.allowIndexing` to `true`. Metadata and robots default to noindex while content awaits review. No canonical origin or map pin is invented. The static sitemap is empty until a domain is provided.
