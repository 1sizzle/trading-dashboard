import {
  groupPnlByDayOfWeek,
  groupPnlBySession,
  groupPnlByTag,
  groupPnlByTimeWindow,
  summarizeTrades,
  type PnlBucket,
} from "@/lib/trading/analytics";
import { rankBuckets } from "@/lib/trading/insights";
import { formatNewYorkDateTime } from "@/lib/trading/calc";

export const SYSTEM_PROMPT = `You are a trading-performance analyst embedded in a personal trading journal app.
You answer questions about the user's own historical Futures & Metals trades using
ONLY the trade data provided below — you have no other source of information about
this trader and no memory beyond what's given here.

Rules:
1. Base every claim strictly on the provided data. Never invent tags, sessions,
   dates, or patterns that aren't present in the data given to you.
2. Whenever you describe a pattern (e.g. "trades tagged Breakout tend to lose" or
   "Mondays are weak"), state the sample size (number of trades) behind it. If a
   pattern rests on fewer than about 5 trades, say so explicitly and note it may be
   noise rather than a real edge — but still report it. Never hide or suppress a
   low-sample pattern; flag its confidence honestly instead.
3. If the data doesn't support an answer (not enough trades, no matching tag,
   session, or day), say that plainly instead of guessing or extrapolating.
4. Prefer correlational language ("trades tagged X tended to lose") over causal
   claims ("X causes losses").
5. Stay scoped to analyzing this trader's performance data — tags, sessions, time
   of day, day of week, P&L, R-multiple, notes, and pre/post-trade psychology.
   Politely decline unrelated requests (general trading advice not grounded in this
   data, unrelated chit-chat, coding help, etc.) and redirect back to what the data
   shows.
6. Be concise and direct — this is a working analysis tool, not a conversation
   partner. Use short paragraphs or bullet points, and markdown where it aids
   scanning.
7. Dollar figures are USD. All times/dates are US Eastern (America/New_York),
   matching how this trader's sessions and day-of-week labels are defined.`;

const MAX_TRADES = 500;
const MAX_TEXT_LENGTH = 500;

function truncate(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

function formatBuckets(buckets: PnlBucket[]): string {
  if (buckets.length === 0) return "(no data)";
  return buckets
    .map((b) => `- ${b.label}: $${b.pnl.toFixed(2)} total over ${b.count} trade${b.count === 1 ? "" : "s"}`)
    .join("\n");
}

export interface ChatTrade {
  symbol: string;
  direction: string;
  entryTime: Date;
  exitTime: Date;
  pnl: number;
  rMultiple: number | null;
  session: string;
  tags: { tag: { name: string } }[];
  notes: string | null;
  psychology: { preEmotion: string | null; postEmotion: string | null; notes: string | null } | null;
}

export function buildTradeContext(trades: ChatTrade[]): string {
  const normalized = trades.map((t) => ({
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    session: t.session,
    entryTime: t.entryTime,
    tags: t.tags,
  }));

  const summary = summarizeTrades(normalized);
  const byDay = rankBuckets(groupPnlByDayOfWeek(normalized));
  const byTime = rankBuckets(groupPnlByTimeWindow(normalized));
  const byTag = rankBuckets(groupPnlByTag(normalized));
  const bySession = rankBuckets(groupPnlBySession(normalized));

  let scoped = trades;
  let cappedNote = "";
  if (trades.length > MAX_TRADES) {
    scoped = [...trades].sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime()).slice(0, MAX_TRADES);
    cappedNote = ` (showing most recent ${MAX_TRADES} of ${trades.length} total trades — older trades omitted)`;
  }

  const rawTrades = scoped.map((t) => ({
    symbol: t.symbol,
    direction: t.direction,
    entryTime: formatNewYorkDateTime(t.entryTime),
    exitTime: formatNewYorkDateTime(t.exitTime),
    session: t.session,
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    tags: t.tags.map((tt) => tt.tag.name),
    notes: truncate(t.notes),
    preEmotion: t.psychology?.preEmotion ?? null,
    postEmotion: t.psychology?.postEmotion ?? null,
    psychologyNotes: truncate(t.psychology?.notes),
  }));

  return `=== AGGREGATE SUMMARY (precomputed — trust these numbers over your own mental math) ===
Total trades: ${summary.count}, wins: ${summary.wins}, losses: ${summary.losses}, win rate: ${
    summary.winRate !== null ? summary.winRate.toFixed(1) + "%" : "n/a"
  }, total P&L: $${summary.totalPnl.toFixed(2)}, avg R multiple: ${
    summary.avgRMultiple !== null ? summary.avgRMultiple.toFixed(2) : "n/a"
  }

P&L by day of week (worst to best avg):
${formatBuckets(byDay)}

P&L by time window (worst to best avg):
${formatBuckets(byTime)}

P&L by tag / setup (worst to best avg):
${formatBuckets(byTag)}

P&L by session (worst to best avg):
${formatBuckets(bySession)}

=== RAW TRADE LOG (${scoped.length} trades)${cappedNote} ===
${JSON.stringify(rawTrades, null, 2)}`;
}
