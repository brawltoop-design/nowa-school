export function roundCurrencyAmount(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePlatformFee(amount: number) {
  return roundCurrencyAmount(amount * 0.15);
}

export function calculateAuthorRevenue(amount: number) {
  return roundCurrencyAmount(amount * 0.85);
}
