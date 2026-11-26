# Reservation database

`migrations/` contains eleven ordered PostgreSQL migrations, including additive public tracking migration `011_public_tracking.sql`. Existing migration files are unchanged. Applied migrations are tracked with checksums; add a new migration instead of editing an applied file.

Run commands from the project root:

```powershell
npm run db:check
npm run db:migrate
npm run db:seed
```

The connection comes from private server environment settings. Check the target before applying migrations or seeding. The standard seed imports genuine source catalog names inactive; it does not create fictitious prices, units or customer data. Do not drop, truncate or reset the normal resort database for cleanup.

`db:migrate` also issues a cryptographically random public tracking reference for any legacy reservation whose reference is missing, inside the migration transaction. Issuance is audited. Existing public references, internal numbers, statuses, relationships and prior history are preserved. Staff must verify booking details before sharing a legacy guest's public reference.

The demo has a separate guarded cluster and explicit commands. Its catalog/seed code is under `scripts/demo`, with the stable CLI entry `scripts/booking-demo.ts`. Its private data/identity paths remain unchanged. See [the demo guide](../docs/CLIENT-DEMO-GUIDE.md).

Active SQL, inventory validation, allocation, staff authorization, guest access, audit and Excel operations remain under `src/lib/booking`; the API route stays under `src/app/api/reservations`. Historical financial records remain protected; the active system does not process new payments.
