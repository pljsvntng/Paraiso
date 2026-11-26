import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/booking/db";
import { hash } from "@/lib/booking/security";
import { guestBooking, guestCookie } from "@/lib/booking/guest-access";
import { ensureTrackingReference } from "@/lib/booking/public-tracking";
import { ReferenceConfirmation } from "@/components/booking/reference-confirmation";
import "../../reservation.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your reservation request",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Confirmation({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  if (/^PDJT-[A-F0-9]{48}$/.test(reference))
    return <ReferenceConfirmation reference={reference} />;
  // Previously issued confirmation URLs remain useful only with their private receipt/session.
  let trackingReference: string | undefined;
  if (/^PDJ-(?:\d{4}-\d{6,}|\d{8}-[A-F0-9]{12})$/.test(reference)) {
    try {
      const store = await cookies();
      let id: string | undefined;
      if (store.get(guestCookie(reference))?.value)
        id = await guestBooking(reference);
      else {
        const receipt = store.get("receipt_" + reference)?.value;
        if (receipt)
          id = (
            await db().query(
              "SELECT id FROM bookings WHERE reference_number=$1 AND receipt_hash=$2 AND receipt_expires_at>now()",
              [reference, hash(receipt)],
            )
          ).rows[0]?.id;
      }
      if (id) trackingReference = await ensureTrackingReference(db(), id);
    } catch {
      /* Never reveal database or private-session errors in public pages. */
    }
  }
  if (trackingReference)
    return <ReferenceConfirmation reference={trackingReference} />;
  return (
    <div className="reservation-page container">
      <section className="reservation-receipt reservation-panel">
        <p className="eyebrow">PARAISO DE JUNE QUIXOTE</p>
        <h1>Your reservation, kept private.</h1>
        <p>
          Use your public tracking reference on Track Reservation. For an older
          booking, contact the resort to obtain one after confirming your
          booking details.
        </p>
        <div className="receipt-actions">
          <Link className="reservation-button" href="/booking/track/">
            Track Reservation
          </Link>
          <Link href="/contact/">Contact the resort</Link>
        </div>
      </section>
    </div>
  );
}
