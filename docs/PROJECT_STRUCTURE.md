# Project structure

Paraiso is one Next.js 16 App Router application. The public website and staff dashboard are the frontend; route handlers and `src/lib/booking` are the backend. They share one `package.json`, Node process, build and environment. No second frontend/backend application or duplicate startup command is needed.

```text
Paraiso/
├── src/
│   ├── app/                       # Framework entry points and co-located styles
│   │   ├── admin/                 # Staff login/dashboard routes and admin CSS
│   │   ├── api/reservations/       # Existing reservation API route handler
│   │   ├── booking/               # Guest checkout, confirmation and tracking routes
│   │   └── ...                    # Existing public pages, policies, metadata
│   ├── components/
│   │   ├── admin/                 # Staff-only views, drawers, forms, calendar, types
│   │   ├── booking/               # Guest checkout/tracking, availability, demo notice
│   │   ├── shared/                # Public shared components, booking-cta.tsx
│   │   ├── accommodations/        # Accommodation cards and gallery
│   │   ├── gallery/, layout/      # Public gallery, navigation and footer
│   │   ├── promotions/, reviews/  # Existing public feature components
│   │   └── ui/                    # Reusable UI primitives
│   ├── hooks/                     # Date, carousel and admin-resource client hooks
│   ├── lib/
│   │   ├── api/reservations.ts     # Shared browser fetch helper
│   │   ├── booking/               # PostgreSQL, validation, inventory, staff operations
│   │   └── ...                    # Shared metadata/content/date utilities
│   ├── config/                    # Site, booking links, branding, photos, review config
│   ├── data/                      # Typed content and image catalogs
│   ├── styles/                    # Self-hosted font declarations
│   ├── types/                     # Public content types
│   └── instrumentation.ts         # Existing demo runtime verification
├── public/                        # Original photographs, branding, fonts, derivatives
├── db/
│   ├── migrations/                # Ten immutable, ordered SQL migrations
│   └── README.md
├── scripts/
│   ├── booking-admin.ts           # Stable database/admin CLI entry point
│   ├── booking-demo.ts            # Stable guarded demo CLI entry point
│   ├── private-prompt.ts          # Hidden administrator password input
│   ├── assets/                    # Image preparation and optional font maintenance
│   ├── demo/                      # Demo catalog, seed/reset and browser verification
│   └── legacy/                    # Historical static-export tools, not active commands
├── tests/
│   ├── *.test.ts                  # Active content, PostgreSQL and guard tests
│   └── helpers/                   # Browser workflow helper imported by the tests
├── docs/
│   ├── README.md                  # Documentation index
│   ├── SETUP_GUIDE.md             # Normal and isolated demo startup
│   ├── PROJECT_STRUCTURE.md
│   ├── CLEANUP_AUDIT.md           # Initial audit, recorded before moves
│   ├── CLEANUP_REPORT.md          # Relocations, review list and validation
│   ├── RESERVATION-SYSTEM.md       # Current reservation/staff integration guide
│   ├── CLIENT-DEMO-GUIDE.md        # Current presentation guide; private credentials excluded
│   ├── ...                       # Active content and asset maintenance guides
│   ├── reports/                  # Implementation, QA and readiness reports
│   ├── reference/                # Detailed motion/interaction implementation references
│   ├── archive/                  # Superseded static/inquiry/payment instructions
│   └── screenshots/              # Existing documentation evidence, preserved
├── package.json / package-lock.json
├── next.config.ts / tsconfig.json / eslint.config.mjs
├── .env.example / .env.demo.example # Placeholder-only examples
├── README.md / AGENTS.md
└── .gitignore
```

## Ownership and conventions

Use `src/components/admin` for staff interface work, `src/components/booking` for the guest reservation flow, `src/components/shared` for reusable public components and `src/hooks` for client hooks. Type-only references to server-side product/staff types remain type-only. `src/lib/api/reservations.ts` is a browser fetch helper; database operations remain in server-side `src/lib/booking`.

Keep Next.js `page.tsx`, `layout.tsx`, `route.ts`, error boundaries, metadata files and CSS entry imports where they are. This cleanup does not change URLs, API contracts, stylesheet ordering, selectors, presentation or authorization. Component filenames use kebab-case; named React exports retain their existing names.

Backend filenames containing historical commerce/payment terminology still support archived data and protected compatibility behavior. They were not deleted or renamed as cosmetic cleanup. Active reservations remain payment-free.

## Generated and private state

`.next` is the normal server build; `.next-demo` is the isolated presentation build; `node_modules` contains installed dependencies. All are ignored. The TypeScript incremental cache now lives under `.local/cache` instead of the project root.

`.local` is intentionally private and ignored. It includes the guarded demo database and identity manifest, private login details, browser evidence, existing database test clusters, backups, the cleanup checkpoint and the archived old static `out` artifact. Do not move or delete those databases, credentials or backups as cosmetic cleanup. The demo guard relies on its existing approved paths.

All original photos and exact duplicate photo variants remain under `public` with their existing URLs. Content/image catalogs are unchanged. Asset preparation still runs from the project root through `npm run images:prepare`.
