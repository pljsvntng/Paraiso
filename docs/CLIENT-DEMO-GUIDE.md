# Paraiso client demonstration guide

Prepared for **23 November 2026**, using an isolated local PostgreSQL cluster. Every rate, capacity, room count, schedule, bed arrangement and demo policy below is a **presentation placeholder**, not a verified resort fact. Existing resort names, photographs, branding and reservation architecture are retained.

## Open the prepared demo

From PowerShell:

```powershell
cd C:\projects\Paraiso
npm run demo:dev
```

Keep that terminal open. Visit **http://127.0.0.1:3001** and **http://127.0.0.1:3001/admin/login/**. The demo command starts the separate PostgreSQL cluster automatically and shuts down the cluster it owns when the command stops. Data persists on disk. Do not start two demo setup/build commands simultaneously. Reset/check commands can connect to the cluster while the demo website owns it.

The normal website at port **3000** and its `.env.local` database remain separate. Demo login and private guest cookies use different names so signing into the demo does not replace the normal website's session.

Private demo administrator and staff credentials are in **`.local/client-demo/LOGIN.txt`**. Open this file locally; do not share it with the client, commit it, or put its passwords in slides. `demo-admin@example.test` is the administrator, and `demo-staff@example.test` has approval and Excel-export permissions. The passwords are randomly generated, separate from existing website accounts. No actual passwords appear in this guide.

For a smoother presentation, use the optimized build after stopping the development demo:

```powershell
npm run demo:build
npm run demo:start
```

Both commands load the private `.env.demo.local`. Do not use ordinary `npm start` for the demo: it uses the normal environment/build. Demo output is isolated under `.next-demo`; normal builds use `.next`.

## Initialize on a fresh local checkout

This machine is already provisioned. On a fresh checkout only:

```powershell
npm install
npm run demo:provision
npm run demo:setup
npm run demo:check
npm run demo:dev
```

`demo:provision` creates a brand-new cluster under `.local/client-demo/postgres`, a randomly chosen loopback PostgreSQL port, a restricted `paraiso_demo_app` login, database `paraiso_client_demo`, a private identity manifest and `.env.demo.local`. It does **not** connect to or create tables in the normal website database. Re-provisioning refuses to overwrite an existing target. The project already includes the PostgreSQL runtime dependency; no separate database service or extension installation is required for this demo.

`demo:check` starts/verifies the cluster if necessary and checks its restricted database role and identity marker. It prints no credentials. The cluster is not the existing `postgresql-x64-18` Windows service; that original service remains untouched.

`.env.demo.example` documents configuration names only. The private generated `.env.demo.local`, manifest, credentials, database files and exports are ignored by Git.

## Sample catalog

All **16 offerings** are active in the isolated demo, with **13 physical units**: 10 accommodation units and 3 cottages. Physical unit names begin `DEMO-`; they are fictional inventory, not verified room numbers.

| Accommodation name retained from source | DEMO nightly rate | DEMO total guests/unit | DEMO units |
| --- | ---: | ---: | ---: |
| Family Deluxe | PHP 3,500 | 6 | 2 |
| Igloo | PHP 2,500 | 4 | 2 |
| Wooden & Brick | PHP 2,800 | 4 | 2 |
| Standard Cabin | PHP 1,800 | 2 | 3 |
| Bunkhouse | PHP 4,500 | 10 | 1 |

The source catalog calls the first option **Family Deluxe**; it was not renamed into a new accommodation. Existing exterior/interior photos are reused. Descriptions and amenities explicitly label sample beds, room counts, check-in **14:00**, check-out **12:00** and guest arrangements. Adult/child group examples are illustrative; the existing capacity engine enforces the combined maximum per unit, not a newly invented age-specific room quota.

| Other DEMO services | Illustrative configuration |
| --- | --- |
| Day Swimming | PHP 250/adult, PHP 150/child; 09:00 and 13:00; 180 minutes; 40 guests/session; up to 20/request |
| Cottage Reservation | PHP 800/unit/session; 3 physical cottages; up to 6 guests/unit; 09:00 and 13:00; 180 minutes |
| Dining Reservation | Seat request only, no menu/food package; illustrative rate PHP 0; 40 seats/session, up to 20/request; 11:00, 12:30, 14:00, 17:00, 18:30; 90 minutes |

There is no verified cottage-specific photo in the source catalog. The existing real pool-area photo is labelled contextual imagery in the cottage description; it does not claim to show a specific cottage or prove its inventory.

| Existing adventure retained | DEMO rate/participant |
| --- | ---: |
| Skywalk Hanging Bridge | PHP 150 |
| ATV Riding | PHP 500 |
| Zipline | PHP 250 |
| Zip Bike | PHP 250 |
| Cable Jeep | PHP 300 |
| Crystal Kayaking | PHP 350 |
| Rainbow Bridge | PHP 100 |
| Cavite Swing | PHP 200 |

All eight adventures retain their existing names and photos. Each has illustrative 60-minute sessions at **09:00, 10:30, 13:00, 15:00**, 12 participant/equipment places, and a sample minimum age of 10. The description explicitly states that current resort operation and safety requirements remain unconfirmed. These values are not safety recommendations for actual guests.

The existing public service cards and booking options display **DEMO DATA**. Public pages, guest tracking and the staff dashboard display **DEMO MODE — Sample information for presentation only**. Sample policies are not presented as approved resort policies.

## Suggested presentation sequence

1. Open an accommodation, Swimming & Cottages, Adventures or Dining page. Use its existing booking link; it opens the matching demo offering in the reservation form.
2. Choose a future date. For accommodation, choose a checkout after check-in. Choose a session for swimming, cottages, adventure and dining. Enter valid guest/unit quantities and acknowledge restrictions.
3. Click **Check availability & add service**. Missing fields show a reason below the disabled button. Inventory remains validated by PostgreSQL; the interface does not bypass unavailable capacity.
4. To demonstrate a combined reservation, add **Family Deluxe**, **DEMO Day Swimming**, **Skywalk Hanging Bridge**, and **DEMO Dining Reservation**. Use compatible dates/sessions. All four remain in one request with one reference. Two different adventures can also be added to one request.
5. Enter a fictitious name beginning **DEMO**, an email ending **@example.test**, and the synthetic phone **09170000000**. Example: `DEMO Presentation Guest`, `demo-presentation@example.test`. Do not enter real customer details. A normal email/name is rejected by the demo backend.
6. Accept the sample policies and submit. The confirmation page shows the reference and **Pending Approval**. Open **Track Reservation** in the same browser to retain private guest access. Normal anti-abuse limits remain active: use different fictitious @example.test emails when repeating many submissions rather than repeatedly using one address.
7. In another browser/profile or the staff tab, log into `/admin/login/`. Open **Pending requests**, then **View & manage**. Review all services together.
8. Approve and confirm. The server rechecks every service atomically and allocates actual demo units/capacity. Alternatively decline with a meaningful reason of at least 10 characters.
9. Refresh the guest tracker to see the updated decision and decline response. Use the same browser/profile used to submit. Email access links are intentionally not delivered in demo mode.
10. Open the booking calendar and switch day/week/month. Download **Reservation Excel** from reports/export. It contains reservation columns only and does not need Microsoft 365.

No card, wallet, GCash, Maya, PayMongo, proof upload, deposit verification or financial transaction is part of this flow. Pricing is illustrative information; approval does not mark anything paid.

## Starting dashboard scenarios

After setup/reset, the database has five labelled reservations for the next Manila calendar day:

| Fictional guest | Starting status |
| --- | --- |
| DEMO Guest — Accommodation | Pending Approval |
| DEMO Guest — Swimming | Confirmed |
| DEMO Guest — Adventure | Declined, with a sample response |
| DEMO Guest — Combined Reservation | Confirmed, four services under one reference |
| DEMO Guest — Dining | Pending Approval |

The overview therefore starts with **5 total, 2 pending, 2 confirmed, 1 declined**, all from PostgreSQL. The sample date is tomorrow relative to reset time; reset on the presentation morning if desired. Upcoming visits show the two confirmed sample requests. Pending requests do not hold inventory. Use another future date when demonstrating full allocation of every unit.

## Reset safely

```powershell
npm run demo:reset
```

Reset checks **all** of the following before deleting anything: explicit demo flag, `local-demo` environment, loopback URL, exact approved database connection/port/directory, private manifest token, restricted non-superuser role, and matching database identity marker. Hosted deployment variables and production deployment settings are rejected. A database name containing “demo” is insufficient.

Only reservation IDs explicitly registered in `paraiso_demo.records` are deleted, along with their dependent sample items/allocations/history/notes. Unmarked records remain. Existing schema and migrations remain. Owned sample catalog records and physical units are restored without duplication, and the five scenarios are recreated through the existing reservation/decision logic. Any attached historical financial rows cause reset to refuse and preserve them. Reference counters are not rewound, so references may be higher after resets.

Setup is idempotent: `npm run demo:setup` restores owned catalog values and missing scenarios without duplicating units or resetting staff decisions on existing scenarios. Unmarked identity collisions are rejected rather than overwritten. Newly entered demo reservations are registered atomically during submission so reset can identify them precisely.

## Verification and evidence

With the demo website running:

```powershell
npm run demo:verify
```

This command uses only fictitious data in the verified isolated demo database. It exercises public service links, every main booking category, cottages, combined and multiple-adventure requests, staff approval/decline, private tracking, calendar, XLSX parsing, fully booked inventory, delivery suppression, guard rejection, idempotency, reset preservation and mobile/desktop layouts. A successful run restores the five sample scenarios. Run it before the presentation, not while someone is entering a request.

Evidence is saved privately under `.local/client-demo-audit/`, including browser screenshots, a sample XLSX, verification results and build/test logs. The final verified results are recorded in the companion [demo readiness report](reports/CLIENT-DEMO-READINESS.md).

Project-wide checks:

```powershell
npm run lint
npm run typecheck
npm run build
$env:BOOKING_BROWSER_TESTS='1'
npm test
```

The project-wide integration tests create their own disposable PostgreSQL databases; they do not test by deleting normal website data.

## Values still requiring client approval

All demo rates, adult/child arrangements, total capacities, beds, room/cottage identifiers and counts, equipment quantities, activity operation/age restrictions, session durations/times, operating/check-in/out hours, policies and amenities remain unapproved. Dining has no invented official menu or package. Do not copy the demo database into production. The actual resort database and verified public source files remain separate.

Emails, remote spreadsheet synchronization and payment providers are blocked by demo application code. Direct XLSX downloads and private guest tracking in the submitting browser continue to work. No live deployment or real email delivery is required for this demonstration.
