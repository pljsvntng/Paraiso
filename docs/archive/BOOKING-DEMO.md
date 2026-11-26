# Local booking practice

> Historical reference. Use the current [reservation guide](../RESERVATION-SYSTEM.md) and [isolated client demo guide](../CLIENT-DEMO-GUIDE.md) for the running application. Older static-export, inquiry-provider and payment instructions below are not the active architecture.

**Historical reference.** The current guarded, isolated demonstration is documented in [Client demo guide](../CLIENT-DEMO-GUIDE.md). The `demo:setup` command now requires the separate `.env.demo.local` and verified demo cluster; it no longer adds data to the normal development database. Use the current guide for the client presentation.

Run `npm run demo:setup` from `C:\projects\Paraiso` while using a local development/test database and a local `APP_URL`.

This adds one enabled **TEST ONLY - Reservation Demo** under **Dining**. Its price is PHP 0, with no deposit or payment connection needed. Demo sessions are 09:00, 12:00 and 15:00, with a one-hour duration. These are synthetic test settings, not real resort offerings. Existing services and their owner-entered rates/capacities stay unchanged. Rerunning setup reuses the same test service.

The normal checkout requires policy text. Setup fills only empty policy fields with explicit **TEST ONLY - LOCAL BOOKING DEMO** text, preserving nonempty text and recording the original empty fields in `.local/booking-demo/policies-before-demo.json`. These demonstration policies must be replaced with resort-approved text before real bookings open.

1. Open the booking URL printed by the command, or choose **Dining → TEST ONLY - Reservation Demo**.
2. Choose a date and session; use one or two fictitious guests.
3. Acknowledge the test service restrictions and click **Check availability & add service**.
4. Fill in fictitious guest details, accept the displayed test policies, and submit the reservation.
5. Open **Admin → Reservations** to find the reference and **Calendar** to see it on its selected date. Free demo reservations start pending staff approval.
6. Open **Reports → Download reservation & financial Excel**, or export from Reservations. These downloads contain saved database bookings and work without a Microsoft account.

Automatic updates to an existing Excel Online workbook require the separate Microsoft connection, workbook/table destination and scheduled worker under **Settings**. Setup does not run delivery jobs, send emails or initiate payments.

When practice is complete, cancel unwanted **TEST ONLY** reservations and disable the demo service through **Inventory → Manage**. Keep real service configuration separate from the demonstration values.

## Verified local example

On 22 November 2026, a reservation was submitted through the public guest form for **TEST ONLY - Demo Guest**, reference **PDJ-2026-000001**, visiting **29 November 2026 at 12:00**. It was saved as **PENDING_APPROVAL** with a zero price and no payment required.

The authenticated calendar API and calendar UI both displayed this reservation. The real Excel export endpoint returned a valid six-sheet workbook whose Reservations sheet contained the same reference. The workbook is saved at `.local/booking-demo/reservation-demo.xlsx`, with calendar and guest confirmation screenshots beside it.

Setup was run twice and retained one demo service without duplicating it or replacing nonempty policy text. The command refused a remote website URL. Lint and type checking passed. No email, payment or external delivery job was run. The thirteen real catalog services remain disabled pending owner-approved configuration.
