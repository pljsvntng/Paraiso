# Resort logo update

## Cause and source

The old header did not load a logo file. `Brand` in `src/components/layout/header.tsx` drew an inline botanical leaf SVG beside the resort name. The footer reused that component; mobile used the same responsive header. Replacing `public/branding/icon.svg` therefore only changed the favicon source. The favicon also used an unversioned URL that browsers could cache independently.

The supplied emblem is a 1254 × 1254 SVG with a windmill, palm trees, horse rider, leaf, and hills. At the owner's request, `public/branding/icon.svg` now uses pure white (`#FFFFFF`) artwork with a fully transparent background. The green background rectangle and both gradients were removed. All artwork path coordinates, the even-odd fill rule, dimensions, and viewBox remain exactly the same. No CSS filter or generated artwork is used.

`public/branding/icon-on-light.svg` contains the identical path in the existing forest green (`#193F32`), also transparent. This keeps the logo readable on the site's existing cream headers after scrolling and on inner pages. The photograph header and dark footer use white; adjacent wordmark text is also pure white there. The SVG favicon uses the dark transparent variant so it remains visible on light browser chrome.

## Implementation

- `src/config/branding.ts` statically imports both transparent SVG variants. Next.js gives each a content-hashed URL; editing an SVG changes its URL on rebuild, preventing reuse of the old colored image.
- `src/components/layout/header.tsx` renders `Brand` using `next/image` and selects white on the photograph or dark on the existing cream background using the existing header observer state. `src/components/layout/footer.tsx` selects white on its dark background. Text, home links, booking buttons, and mobile navigation are retained.
- `src/app/layout.tsx` uses the versioned dark transparent SVG favicon.
- `src/app/globals.css` keeps the existing square dimensions: 44px desktop/tablet, 36px phone, 32px below 374px. `object-fit: contain` preserves the artwork without cropping, stretching, or filters. Only brand text on dark backgrounds is explicitly set to `#FFFFFF`.
- `README.md` and `docs/CONTENT-CHECKLIST.md` now document the supplied emblem instead of describing the old botanical mark as the active logo.
- `scripts/legacy/static-audit.test.mjs` checks both versioned branding variants, original dimensions, exact exported SVG contents, white/dark fills, absence of backgrounds/gradients/filters, and the favicon on every route. Responsive hero preload checks remain in place.

## Updating later

Keep both transparent variants' artwork paths and dimensions in sync when changing the design, then rebuild with `npm run build`. Deploy the complete new `out/` directory, including its generated `_next/static/media` assets. Generated `out/` files are deployment copies, not additional branding sources.

## Verification

Development and production browser checks cover all 10 public routes and widths 320, 360, 390, 700, 768, 1024, 1051, 1200, 1440, and 1920px. Checks confirm white logo/text on the photograph, a dark transparent mark when the cream header appears, a white footer mark, square dimensions, no CSS filters, and no navigation overlap or horizontal overflow. Mobile navigation still opens, follows About, and closes. Both served SVGs are compared with their exact source contents. Raster inspection checks that every nontransparent white-logo pixel has RGB 255/255/255 and that the background is transparent; path strings are compared with the original gold/green source to prove the design is unchanged.

ESLint, TypeScript, the production build/static export, and the existing static audit suite are also run. Current browser reports, original backups, and screenshots are stored in ignored `.local/logo-white/`.
