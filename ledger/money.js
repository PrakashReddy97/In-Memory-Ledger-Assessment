export const PRECISION = { AED: 2, BHD: 3 };
export const OVERDRAFT_FEE = { AED: 2500 };
export const INTEREST_NUMERATOR = 4;
export const INTEREST_DENOMINATOR = 10000;

export function parseMoney(value, currency) {
  const places = PRECISION[currency];
  if (places === undefined)
    throw new Error(`Unsupported currency: ${currency}`);
  const text = String(value);
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  if (fraction.length > places) {
    throw new Error(`${value} has too many decimal places for ${currency}`);
  }
  const units =
    Number(whole) * 10 ** places + Number(fraction.padEnd(places, "0") || 0);
  return text.startsWith("-") ? -units : units;
}

export function formatMoney(units, currency) {
  const places = PRECISION[currency];
  const scale = 10 ** places;
  const sign = units < 0 ? "-" : "";
  const value = Math.abs(units);
  return `${sign}${Math.floor(value / scale)}.${String(value % scale).padStart(places, "0")}`;
}

export function roundHalfUp(numerator, denominator) {
  return Math.floor((numerator + denominator / 2) / denominator);
}

export function dailyInterest(balanceUnits) {
  if (balanceUnits <= 0) return 0;
  return roundHalfUp(balanceUnits * INTEREST_NUMERATOR, INTEREST_DENOMINATOR);
}

export function splitEqual(totalUnits, count) {
  const base = Math.floor(totalUnits / count);
  const parts = new Array(count).fill(base);
  parts[count - 1] += totalUnits - base * count;
  return parts;
}
