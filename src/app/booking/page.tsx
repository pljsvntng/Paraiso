import type { Metadata } from "next";
import { CartCheckout } from "@/components/booking/cart-checkout";
import "./reservation.css";
export const metadata: Metadata = {
  title: "Book your escape",
  description:
    "Request a stay or a day in nature at Paraiso de June Quixote Ecofarm Resort.",
};
export default function BookingPage() {
  return (
    <div className="reservation-page container">
      <header className="reservation-intro">
        <p className="eyebrow">A LITTLE NATURE. A LOT TO LOOK FORWARD TO.</p>
        <h1>
          Your next escape,
          <br />
          <em>beautifully simple.</em>
        </h1>
        <p>
          Choose your dates. Find your place. Let our team take care of the
          welcome.
        </p>
        <span className="reservation-pill">
          Reservation requests · No online payment · Staff approval
        </span>
      </header>
      <CartCheckout />
      <noscript>
        <p>
          Enable JavaScript to check the live calendar and request a
          reservation. You can also call the resort using our contact page.
        </p>
      </noscript>
    </div>
  );
}
