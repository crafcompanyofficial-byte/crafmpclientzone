/** Display loyalty points: up to 1 decimal; whole numbers without “.0”. */
export function formatLoyaltyPoints(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  const t = Math.round(x * 10) / 10;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
}
