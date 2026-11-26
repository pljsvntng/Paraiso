# Historical static-export tools

These three scripts supported the former static-only deployment and are retained for reference:

- `preview-static.mjs`: serves a manually supplied old `out` artifact.
- `finalize-export.mjs`: normalizes old exported route-payload filenames.
- `static-audit.test.mjs`: assertions for the former static architecture, including conditions incompatible with the current integrated reservation backend.

They are intentionally absent from active package commands and the current test suite. `npm run preview` and `npm start` run the Next.js Node server. Do not use these historical scripts to deploy or validate the reservation backend.

The previous generated `out` directory was preserved under `.local/archive/static-export-before-cleanup-20261122`. No source photos or old artifact contents were deleted. For current commands, see [the setup guide](../../docs/SETUP_GUIDE.md).
