import { getPointValue, normalizeFuturesSymbol } from "@/lib/trading/contracts";
import { wallTimeComponentsToUtc } from "@/lib/trading/calc";
import type { TradeDirection } from "@/lib/generated/prisma/client";

// Tradovate's Performance-tab export displays trade times in whatever
// timezone the platform is configured to (confirmed UK time for this
// account), not necessarily New York — unlike manual journal entries, which
// always assume Eastern.
const TRADOVATE_EXPORT_TIMEZONE = "Europe/London";

export interface ParsedCsvTrade {
  externalId: string;
  symbol: string;
  rawSymbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnl: number;
  entryTime: Date;
  exitTime: Date;
  isKnownSymbol: boolean;
}

export interface ParseCsvResult {
  trades: ParsedCsvTrade[];
  errors: string[];
}

// Minimal RFC4180-style CSV parser: handles quoted fields (needed here since
// large P&L values are quoted, e.g. "$1,990.00", to escape the comma inside).
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// Handles Tradovate's currency format: "$60.00", "$(175.00)" for negative,
// and "$1,990.00" for thousands (quoting already stripped by the CSV parser).
export function parseCurrencyValue(raw: string): number {
  const trimmed = raw.trim();
  // Tradovate wraps negatives in parens after the currency symbol, e.g.
  // "$(175.00)" — the "(" is not the first character, so check anywhere.
  const negative = trimmed.includes("(");
  const cleaned = trimmed.replace(/[()$,]/g, "");
  const value = Number(cleaned);
  return negative ? -Math.abs(value) : value;
}

// Tradovate timestamps are "MM/DD/YYYY HH:mm:ss" in whatever timezone the
// platform display is set to.
export function parseTradovateTimestamp(raw: string): Date {
  const [datePart, timePart] = raw.trim().split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return wallTimeComponentsToUtc(year, month, day, hour, minute, second, TRADOVATE_EXPORT_TIMEZONE);
}

const REQUIRED_COLUMNS = [
  "symbol",
  "qty",
  "buyprice",
  "sellprice",
  "pnl",
  "boughttimestamp",
  "soldtimestamp",
] as const;

export function parseTradovatePerformanceCsv(text: string): ParseCsvResult {
  const rows = parseCsvRows(text.trim());
  if (rows.length === 0) {
    return { trades: [], errors: ["The file is empty."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);

  const idx = {
    symbol: colIndex("symbol"),
    qty: colIndex("qty"),
    buyPrice: colIndex("buyprice"),
    sellPrice: colIndex("sellprice"),
    pnl: colIndex("pnl"),
    boughtTimestamp: colIndex("boughttimestamp"),
    soldTimestamp: colIndex("soldtimestamp"),
    buyFillId: colIndex("buyfillid"),
    sellFillId: colIndex("sellfillid"),
  };

  const missing = REQUIRED_COLUMNS.filter((name) => colIndex(name) === -1);
  if (missing.length > 0) {
    return {
      trades: [],
      errors: [
        `Missing expected column(s): ${missing.join(", ")}. This doesn't look like a Tradovate Performance export.`,
      ],
    };
  }

  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((cell) => cell.trim() === "")) continue;

    try {
      const rawSymbol = row[idx.symbol].trim();
      const symbol = normalizeFuturesSymbol(rawSymbol);
      const qty = Number(row[idx.qty]);
      const buyPrice = Number(row[idx.buyPrice]);
      const sellPrice = Number(row[idx.sellPrice]);
      const pnl = parseCurrencyValue(row[idx.pnl]);
      const boughtTime = parseTradovateTimestamp(row[idx.boughtTimestamp]);
      const soldTime = parseTradovateTimestamp(row[idx.soldTimestamp]);

      // The "buy"/"sell" columns are legs, not entry/exit — whichever
      // happened first is the entry (a short opens by selling first).
      const direction: TradeDirection = boughtTime < soldTime ? "LONG" : "SHORT";
      const entryTime = direction === "LONG" ? boughtTime : soldTime;
      const exitTime = direction === "LONG" ? soldTime : boughtTime;
      const entryPrice = direction === "LONG" ? buyPrice : sellPrice;
      const exitPrice = direction === "LONG" ? sellPrice : buyPrice;

      const buyFillId = idx.buyFillId !== -1 ? row[idx.buyFillId].trim() : "";
      const sellFillId = idx.sellFillId !== -1 ? row[idx.sellFillId].trim() : "";
      const externalId =
        buyFillId && sellFillId
          ? `tradovate-${buyFillId}-${sellFillId}`
          : `tradovate-row-${i}-${rawSymbol}-${row[idx.boughtTimestamp]}`;

      const { isKnown } = getPointValue(symbol);

      trades.push({
        externalId,
        symbol,
        rawSymbol,
        direction,
        entryPrice,
        exitPrice,
        positionSize: qty,
        pnl,
        entryTime,
        exitTime,
        isKnownSymbol: isKnown,
      });
    } catch (error) {
      errors.push(`Row ${i + 1}: could not parse (${(error as Error).message}).`);
    }
  }

  return { trades, errors };
}
