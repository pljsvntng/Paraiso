"use client";
import { CartCheckout } from "./cart-checkout";
export { api } from "@/lib/api/reservations";
// Keep the original component entry point on the shared reservation workflow.
export function BookingForm({
  manual = false,
  onCreated,
}: {
  manual?: boolean;
  onCreated?: (reference: string) => void;
}) {
  return <CartCheckout manual={manual} onCreated={onCreated} />;
}
