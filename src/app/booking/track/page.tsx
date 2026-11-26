import { BookingTracker } from "@/components/booking/booking-tracker";
import "../reservation.css";
export const metadata = {
  title: "Track your reservation",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function TrackerPage() {
  return <BookingTracker />;
}
