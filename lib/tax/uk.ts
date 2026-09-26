// UK tax estimate for self-employed trading profit. Figures are for the 2026/27 tax year and are
// deliberately kept in one place so they're easy to update when the rates change.
// Estimate only — not tax advice; ignores the £1,000 trading allowance, losses carried forward, etc.

export const UK_TAX = {
  personalAllowance: 12570,
  taperStart: 100000, // allowance falls by £1 for every £2 above this
  basicBandSize: 37700, // taxable income taxed at the basic rate
  additionalThreshold: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  class4Lower: 12570,
  class4Upper: 50270,
  class4MainRate: 0.06,
  class4UpperRate: 0.02,
} as const;

export interface TaxBreakdown {
  incomeTax: number;
  class4: number;
  total: number;
}

export function computeUkTax(profit: number): TaxBreakdown {
  if (profit <= 0) return { incomeTax: 0, class4: 0, total: 0 };
  const t = UK_TAX;

  const allowance = Math.max(0, t.personalAllowance - Math.max(0, (profit - t.taperStart) / 2));
  const taxable = Math.max(0, profit - allowance);

  const basic = Math.min(taxable, t.basicBandSize);
  const higher = Math.max(0, Math.min(taxable, t.additionalThreshold) - t.basicBandSize);
  const additional = Math.max(0, taxable - t.additionalThreshold);
  const incomeTax = basic * t.basicRate + higher * t.higherRate + additional * t.additionalRate;

  const class4 =
    Math.max(0, Math.min(profit, t.class4Upper) - t.class4Lower) * t.class4MainRate +
    Math.max(0, profit - t.class4Upper) * t.class4UpperRate;

  return { incomeTax, class4, total: incomeTax + class4 };
}

// Tax estimate for a profit figure, honouring an optional flat override rate (%).
export function estimateTax(profit: number, overridePct: number | null): number {
  if (profit <= 0) return 0;
  return overridePct !== null ? (profit * overridePct) / 100 : computeUkTax(profit).total;
}

// The UK tax year runs 6 April – 5 April. Dates are UTC-midnight day labels.
export function taxYearStartYear(date: Date): number {
  const year = date.getUTCFullYear();
  const beforeStart = date.getUTCMonth() < 3 || (date.getUTCMonth() === 3 && date.getUTCDate() < 6);
  return beforeStart ? year - 1 : year;
}

export function taxYearRange(startYear: number): { start: Date; end: Date } {
  return { start: new Date(Date.UTC(startYear, 3, 6)), end: new Date(Date.UTC(startYear + 1, 3, 6)) };
}

export function taxYearLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export interface TaxSummary {
  income: number;
  expenses: number;
  profit: number;
  taxOwed: number;
  setAside: number;
  shortfall: number;
  blendedRate: number | null; // % of income
}

export function summarizeTax(input: {
  payoutsGross: number;
  otherIncome: number;
  expenses: number;
  setAside: number;
  overridePct: number | null;
}): TaxSummary {
  const income = input.payoutsGross + input.otherIncome;
  const profit = income - input.expenses;
  const taxOwed = estimateTax(profit, input.overridePct);
  return {
    income,
    expenses: input.expenses,
    profit,
    taxOwed,
    setAside: input.setAside,
    shortfall: Math.max(0, taxOwed - input.setAside),
    blendedRate: income > 0 ? (taxOwed / income) * 100 : null,
  };
}

// Recommended set-aside % for a new payout: the extra tax it adds on top of what's already logged.
export function recommendSetAsidePct(profitSoFar: number, payout: number, overridePct: number | null): number {
  if (payout <= 0) return 0;
  const extra = estimateTax(profitSoFar + payout, overridePct) - estimateTax(profitSoFar, overridePct);
  // Rounded up to 2 decimal places so the set-aside never lands a few pence short of the tax owed.
  return Math.ceil((extra / payout) * 10000) / 100;
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
export const formatGbp = (value: number) => gbp.format(value);
