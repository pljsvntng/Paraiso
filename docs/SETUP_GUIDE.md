# Setup and startup

The frontend and backend run together in one Next.js Node application. Use the project root `C:\projects\Paraiso` for every command. There is no separate backend package to start.

## Normal website

Use Node.js 22+ and npm; Node 24 is used for project verification. Install locked dependencies with `npm ci`.

If `.env.local` is not already configured, copy the placeholder-only `.env.example` and supply your server-side settings. Preserve an existing environment file instead of overwriting it.

```dotenv
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/DATABASE_NAME
APP_URL=http://127.0.0.1:3000
```

Use a dedicated development database locally. Use the deployment provider's certificate-verifying PostgreSQL connection for a hosted application. Keep all actual credentials in private environment settings, never source code or documentation.

If using the installed Windows PostgreSQL service, inspect it with `Get-Service postgresql*`. Start the correct configured service through Windows Services if it is stopped. This setup does not create or reset the normal resort database automatically.

```powershell
cd C:\projects\Paraiso
npm run db:check
npm run db:migrate
npm run db:seed
npm run dev
```

`db:check` is read-only. `db:migrate` applies pending migrations to the configured database; verify the target first. `db:seed` imports original accommodation/adventure names inactive and does not invent rates or physical room inventory. Configure verified services and a separately created administrator using the [reservation guide](RESERVATION-SYSTEM.md).

The normal site opens at **http://127.0.0.1:3000**. Public pages, booking, tracking and `/api/reservations/` run in this same server. Staff sign in at `/admin/login/`.

## Existing isolated client presentation

```powershell
npm run demo:check
npm run demo:start
```

The optimized demo opens at **http://127.0.0.1:3001** and starts its verified separate PostgreSQL cluster automatically. If a demo server is already running, use its existing URL. Rebuild using `npm run demo:build` when source changes; `npm run demo:dev` provides development mode instead.

The existing `.env.demo.local`, demo identity manifest, private login file and sample data remain in place. Never overwrite them while following normal setup. For fresh provisioning, labelled catalog information, login instructions, guard requirements and reset commands, use [CLIENT-DEMO-GUIDE.md](CLIENT-DEMO-GUIDE.md). Demo initialization/reset are explicit data-management commands, not cleanup steps.

## Build, test and deploy

```powershell
npm run lint
npm run typecheck
npm run build
$env:BOOKING_BROWSER_TESTS='1'
npm test
npm start
```

Build before running the test suites: they launch optimized servers against disposable PostgreSQL clusters. Browser checks use Edge on Windows or Chromium where configured. They do not need the real resort database.

Deploy the normal application with `npm run build` and `npm start` on a Next.js-capable Node host. The retired static `out` deployment is not the active architecture. Configure private environment settings and migrations as described in the reservation guide. Real guest email delivery requires separately configured SMTP and private worker settings; the demo deliberately suppresses external delivery. No online payment integration is part of this application.
