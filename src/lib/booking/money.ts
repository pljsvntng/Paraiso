export const peso = (centavos: number | null) =>
  centavos === null
    ? "Price to be confirmed by resort staff"
    : new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(centavos / 100);
export function centavos(value: string | number): number {
  const normalized = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error(
      "Use a non-negative peso amount with at most two decimal places.",
    );
  const [whole, fractional = ""] = normalized.split(".");
  const result = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, "0"));
  if (result > 1000000000000n)
    throw new Error("Amount exceeds the supported limit.");
  return Number(result);
}
export function deposit(
  total: number | null,
  mode: string,
  value: number | null,
): number | null {
  if (mode === "NONE") return 0;
  if (total === null || mode === "UNCONFIGURED") return null;
  if (mode === "FULL") return total;
  if (mode === "FIXED") return Math.min(total, value ?? 0);
  if (mode === "PERCENT" && value !== null && value <= 10000)
    return Number((BigInt(total) * BigInt(value) + 9999n) / 10000n);
  throw new Error("Invalid deposit configuration.");
}
