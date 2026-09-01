// Dollar value of a $1 (one point) move for one contract, by futures symbol.
// Add new contracts here as you trade them. Any symbol not listed below
// defaults to a point value of 1 (correct for crypto/stocks, wrong for an
// unlisted futures contract — the journal form warns when this happens).
export const CONTRACT_POINT_VALUES: Record<string, number> = {
  NQ: 20,
  MNQ: 2,
  ES: 50,
  MES: 5,
  GC: 100,
  MGC: 10,
  SI: 5000,
  SIL: 1000,
};

export const KNOWN_FUTURES_SYMBOLS = Object.keys(CONTRACT_POINT_VALUES);

export function getPointValue(symbol: string): { pointValue: number; isKnown: boolean } {
  const normalized = symbol.trim().toUpperCase();
  const pointValue = CONTRACT_POINT_VALUES[normalized];
  if (pointValue === undefined) {
    return { pointValue: 1, isKnown: false };
  }
  return { pointValue, isKnown: true };
}

// Strips a trailing futures month-code + year suffix (e.g. "U6" = September
// 2026) from a broker's dated contract symbol, e.g. "NQU6" -> "NQ",
// "MNQU6" -> "MNQ". Matches the standard CME month codes.
const CONTRACT_MONTH_YEAR_SUFFIX = /[FGHJKMNQUVXZ]\d{1,2}$/i;

export function normalizeFuturesSymbol(rawSymbol: string): string {
  return rawSymbol.trim().toUpperCase().replace(CONTRACT_MONTH_YEAR_SUFFIX, "");
}
