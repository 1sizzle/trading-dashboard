export type SubscriptionLike = { amount: number; cycle: "MONTHLY" | "YEARLY" };

// A yearly subscription's cost spread evenly across 12 months, so it can be
// compared and summed alongside monthly ones on a single "per month" basis.
export function monthlyEquivalent(sub: SubscriptionLike): number {
  return sub.cycle === "YEARLY" ? sub.amount / 12 : sub.amount;
}

export function sumMonthlyEquivalent(subs: SubscriptionLike[]): number {
  return subs.reduce((total, sub) => total + monthlyEquivalent(sub), 0);
}
