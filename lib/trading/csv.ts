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

export interface ParsedBitunixTrade {
  externalId: string;
  symbol: string;
  direction: TradeDirection;
  pnl: number;
  entryTime: Date;
  exitTime: Date;
  notes: string | null;
}

export interface ParseBitunixResult {
  trades: ParsedBitunixTrade[];
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

// Bitunix's own export column names aren't confirmed against a real sample
// file (unlike Tradovate's, which was verified against a real 47-row
// export) — this matches against several plausible header spellings per
// field rather than one exact name, and fails loudly with a clear "missing
// expected column" error if none of them are found, so a genuine mismatch
// against the user's real file surfaces as an obvious error rather than
// silently wrong trade data.
const BITUNIX_COLUMN_ALIASES = {
  symbol: ["symbol", "pair", "contract", "trading pair", "coin", "market"],
  side: ["side", "direction", "position side", "position direction", "type"],
  pnl: [
    "realized pnl",
    "realised pnl",
    "realizedpnl",
    "pnl",
    "profit",
    "net profit",
    "closed pnl",
    "total pnl",
  ],
  openTime: ["open time", "opentime", "entry time", "start time", "create time", "createtime", "ctime"],
  closeTime: ["close time", "closetime", "exit time", "end time", "update time", "updatetime"],
  time: ["time", "date", "datetime", "trade time"],
  fee: ["fee", "fees", "total fee", "trading fee", "commission"],
  id: ["position id", "order id", "id", "trade id"],
} as const;

function findColumn(header: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = header.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Lenient numeric parser covering the formats a broker export might use for
// a signed dollar amount: "$12.34", "(12.34)" or "-12.34" for negative,
// "1,234.56" thousands separators, and a leading "+".
export function parseBitunixAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const negativeParens = trimmed.includes("(");
  const cleaned = trimmed.replace(/[()$,+]/g, "");
  const value = Number(cleaned);
  if (Number.isNaN(value)) throw new Error(`invalid number "${raw}"`);
  return negativeParens ? -Math.abs(value) : value;
}

// Handles both epoch timestamps (seconds or milliseconds, as Bitunix's
// REST API uses) and human-readable date/time strings a UI CSV export is
// more likely to contain. Bitunix's CSV export has no confirmed display
// timezone setting (unlike Tradovate's, which was confirmed as UK time for
// this account) — date/time strings are treated as UTC, which is the
// common default for crypto exchanges; this may need adjusting once
// checked against a real export.
export function parseBitunixTimestamp(raw: string): Date {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    const ms = trimmed.length >= 13 ? num : num * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) throw new Error(`invalid epoch timestamp "${raw}"`);
    return date;
  }

  const isoish = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(isoish);
  const date = new Date(hasZone ? isoish : `${isoish}Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid timestamp "${raw}"`);
  return date;
}

function parseBitunixDirection(raw: string): TradeDirection {
  const value = raw.trim().toLowerCase();
  if (value.includes("short") || value.includes("sell")) return "SHORT";
  return "LONG";
}

export function parseBitunixCsv(text: string): ParseBitunixResult {
  const rows = parseCsvRows(text.trim());
  if (rows.length === 0) {
    return { trades: [], errors: ["The file is empty."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());

  const idx = {
    symbol: findColumn(header, BITUNIX_COLUMN_ALIASES.symbol),
    side: findColumn(header, BITUNIX_COLUMN_ALIASES.side),
    pnl: findColumn(header, BITUNIX_COLUMN_ALIASES.pnl),
    openTime: findColumn(header, BITUNIX_COLUMN_ALIASES.openTime),
    closeTime: findColumn(header, BITUNIX_COLUMN_ALIASES.closeTime),
    time: findColumn(header, BITUNIX_COLUMN_ALIASES.time),
    fee: findColumn(header, BITUNIX_COLUMN_ALIASES.fee),
    id: findColumn(header, BITUNIX_COLUMN_ALIASES.id),
  };

  const missingConcepts: string[] = [];
  if (idx.symbol === -1) missingConcepts.push("symbol");
  if (idx.side === -1) missingConcepts.push("side/direction");
  if (idx.pnl === -1) missingConcepts.push("realized PNL");
  if (idx.openTime === -1 && idx.time === -1) missingConcepts.push("open/entry time");

  if (missingConcepts.length > 0) {
    return {
      trades: [],
      errors: [
        `Couldn't find a column for: ${missingConcepts.join(", ")}. This doesn't look like a Bitunix trade history export — column names weren't confirmed against a real file, so if this is genuinely a Bitunix export, share it so the importer can be adjusted.`,
      ],
    };
  }

  const trades: ParsedBitunixTrade[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((cell) => cell.trim() === "")) continue;

    try {
      const symbol = row[idx.symbol].trim().toUpperCase();
      const direction = parseBitunixDirection(row[idx.side]);
      const pnl = parseBitunixAmount(row[idx.pnl]);

      const openRaw = idx.openTime !== -1 ? row[idx.openTime] : row[idx.time];
      const closeRaw = idx.closeTime !== -1 ? row[idx.closeTime] : idx.time !== -1 ? row[idx.time] : openRaw;
      const entryTime = parseBitunixTimestamp(openRaw);
      const exitTime = parseBitunixTimestamp(closeRaw);

      const idValue = idx.id !== -1 ? row[idx.id].trim() : "";
      const externalId = idValue
        ? `bitunix-${idValue}`
        : `bitunix-row-${i}-${symbol}-${openRaw.trim()}`;

      const fee = idx.fee !== -1 ? parseBitunixAmount(row[idx.fee]) : 0;
      const notes = fee !== 0 ? `Fee: $${Math.abs(fee).toFixed(2)}` : null;

      trades.push({ externalId, symbol, direction, pnl, entryTime, exitTime, notes });
    } catch (error) {
      errors.push(`Row ${i + 1}: could not parse (${(error as Error).message}).`);
    }
  }

  return { trades, errors };
}
