const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatCurrency(value: number): string {
  return gbp.format(value);
}

export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
