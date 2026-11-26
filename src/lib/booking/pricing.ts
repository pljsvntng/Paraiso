import type { Product } from "./db";
import { centavos } from "./money";
export function estimate(
  p: Product,
  input: {
    checkIn: string;
    checkOut?: string;
    units: number;
    adults: number;
    children: number;
  },
  addons: (number | null)[] = [],
) {
  if (p.price === null || addons.some((v) => v === null)) return null;
  const nights = p.overnight
    ? (Date.parse(input.checkOut || "") - Date.parse(input.checkIn)) / 86400000
    : 1;
  if (!Number.isFinite(nights) || nights < 1) return null;
  return (
    (nights *
      (p.price_basis === "PERSON"
        ? centavos(p.price) * input.adults +
          centavos(p.child_price ?? p.price) * input.children
        : centavos(p.price) * input.units) +
      addons.reduce<number>((sum, price) => sum + centavos(price ?? 0), 0)) /
    100
  );
}
