import { CURRENCY_DECIMALS } from "./constants";

// Money is stored as integer hundredths ("minor units") for every currency,
// so 12.50 USD is 1250 and 250000 IQD is 25000000. No floating-point drift.

/** Parse user text like "1,250.5" into minor units, or null if invalid. */
export function toMinor(text: string | number): number | null {
  const s = String(text).replace(/,/g, "").trim();
  if (s === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Minor units back to a plain editable string, e.g. 1250 -> "12.5". */
export function minorToInput(minor: number): string {
  return String(minor / 100);
}

export function formatMoney(minor: number, currency: string): string {
  const d = CURRENCY_DECIMALS[currency] ?? 2;
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(minor / 100);
  return `${n} ${currency}`;
}

/** Line total in minor units: quantity x unit price, rounded. */
export function lineTotal(quantity: number, unitPriceMinor: number): number {
  return Math.round(quantity * unitPriceMinor);
}

export type Totals = Record<string, number>;

export function addTo(totals: Totals, currency: string, minor: number) {
  totals[currency] = (totals[currency] ?? 0) + minor;
}

export function formatTotals(totals: Totals): string[] {
  return Object.keys(totals)
    .sort()
    .filter((c) => totals[c] !== 0)
    .map((c) => formatMoney(totals[c], c));
}
