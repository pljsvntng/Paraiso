# Paraiso de June Quixote — static resort website

A Next.js App Router, React, TypeScript, and Tailwind CSS public website. It exports ordinary HTML, CSS, JavaScript, and local assets to `out/`. There is **no backend, database, authentication, admin dashboard, reservation processing, or payment integration** in this application.

## Run

Use Node.js 20.9+ and npm (Node 24 used for verification).

```sh
npm ci
npm run dev
```

For the deployment artifact and its local preview:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run preview
```

Preview opens at `http://127.0.0.1:3000`. `npm test` audits the built export, so run the build first. `npm run preview` serves only `out/`; it is a development utility, not an application backend. The default production output does not need Node.js or environment variables.

## Public pages

`/`, `/about/`, `/accommodations/`, `/adventures/`, `/pool-cottages/`, `/dining/`, `/gallery/`, `/packages/`, `/contact/`, `/faq/`, plus the static 404 page.

## Edit content

- `src/config/site.ts`: business information, verified map, hero photo, domain, indexing.
- `src/config/booking.ts`: all reservation/contact destinations.
- `src/data/`: typed accommodation, activity, gallery, package, and FAQ content.
- `public/images/`: approved local photographs. Use optimized WebP or AVIF where practical.
- `src/app/globals.css`: responsive design system and page compositions.
- `src/styles/fonts.css` and `public/fonts/`: self-hosted Fraunces and Manrope, with OFL licenses.

No official photos, logo, current rates, operating hours, room categories, or exact map pin were supplied. Media placeholders are labeled; conceptual graphics are not represented as resort photographs. The botanical wordmark is a proposed identity, pending approval. Reported adventures are explicitly inquiry topics, and accommodation/package collections remain empty until approved.

The gallery filters work with local content. Its native dialog lightbox opens only approved entries with a real image source, supports next/previous buttons and arrow keys, closes with Escape, traps focus through the browser, and restores focus on close. Placeholder panels are intentionally not clickable.

## Deploy

Set the final HTTPS domain in `src/config/site.ts`; verify business content before setting `allowIndexing: true`. Canonical URLs and sitemap entries are generated only when a domain is configured. Rebuild after content or integration configuration changes.

For Vercel, import the repository, select Next.js, run `npm run build`, and serve its static output. For a generic static host use **`out`** as the publish directory. Keep the exported folder structure: `trailingSlash: true` emits route directories containing `index.html`. Configure your host’s 404 handling to use `404.html`. No server functions, environment secrets, database setup, or migrations are needed.

Host security headers are provided as a suggested `_headers` file in the exported assets for hosts that support that convention; other hosts must configure equivalent headers in their dashboard. Do not use `next start` with an exported application. Build once and serve files.

## Handoff and audit

- [Partner booking integration](docs/BOOKING-INTEGRATION.md)
- [Client assets and information](docs/CONTENT-CHECKLIST.md)
- [Conversion inventory and final structure](docs/STATIC-CONVERSION.md)
- [Verification results](docs/VERIFICATION.md)

The original full-stack scaffold is preserved in Git commit `30db04f`. Inspect it with `git show 30db04f:path/to/file`. Do not restore the full scaffold into this static application to integrate a separate reservation website; update the central link configuration instead.
