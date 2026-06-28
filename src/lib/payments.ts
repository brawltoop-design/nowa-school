export function roundCurrencyAmount(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePlatformFee(amount: number) {
  return roundCurrencyAmount(amount * 0.15);
}

export function calculateAuthorRevenue(amount: number) {
  return roundCurrencyAmount(amount * 0.85);
}

export function toMinorUnits(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromMinorUnits(amountMinor: number) {
  return amountMinor / 100;
}

export function calculatePlatformFeeMinor(amountMinor: number) {
  return Math.round(amountMinor * 0.15);
}

export function calculateAuthorRevenueMinor(amountMinor: number) {
  return amountMinor - calculatePlatformFeeMinor(amountMinor);
}
