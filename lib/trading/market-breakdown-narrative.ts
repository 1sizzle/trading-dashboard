import { callGemini } from "@/lib/core/gemini";

export interface KeyLevelField {
  name: string;
  price: number;
  distanceFromPrice: number;
  tapped: boolean;
}

export interface BreakdownNarrativeInput {
  postType: "NY_OPEN" | "FIRST_HOUR" | "MIDDAY" | "DAILY_RECAP";
  symbol: string;
  price: number;
  vix: number | null;
  sessionVolumePct: number | null;
  ibHigh: number | null;
  ibLow: number | null;
  keyLevels: KeyLevelField[];
  // Phases 2-4 — always null in the Phase 1 build. Passed through so the
  // prompt can honestly acknowledge what's not available yet rather than
  // silently omitting mention of it.
  structureData: unknown;
  valueAreaData: unknown;
  historicalStatsData: unknown;
}

export interface BreakdownNarrative {
  headline: string;
  bias: string;
  keyContext: string;
  gameplan: string;
  lineInSand: string;
  tradeLocation: string;
  whatNotToDo: string;
}

const SYSTEM_PROMPT = `
You are a market-session analyst writing a short structured NQ (Nasdaq-100 futures)
briefing for a personal trading dashboard. You are given real, precomputed numbers —
price, VIX, session volume, Initial Balance, and a list of key levels with their
distance from current price — for one checkpoint of the trading day (NY Open Brief,
First Hour Update, Midday Update, or Daily Recap).

Rules:
1. Base every sentence strictly on the numbers provided. Never invent a level, a
   price, a distance, a structure/trend read, a volume-profile value, or a
   historical statistic that isn't in the data given to you.
2. The input may include null fields for "structureData", "valueAreaData", and
   "historicalStatsData" — these features aren't built yet. Do not mention
   multi-timeframe structure (BOS/CHoCH), value area (POC/VAH/VAL), or historical
   base-rate statistics at all when those fields are null. Do not apologize for
   their absence either — just write the briefing using only what's actually there.
3. Write in a terse, professional day-trading-desk tone: short sentences, level
   names and prices stated plainly, no hedging filler, no generic disclaimers.
4. Return ONLY a single JSON object, no markdown fences, no commentary, matching
   exactly this shape (all values are strings, 1-3 sentences each, "tradeLocation"
   may be an empty string for the Daily Recap checkpoint where it doesn't apply):

{
  "headline": "one line stating where price is relative to the most important nearby levels",
  "bias": "directional lean and the concrete reason for it, from the given numbers only",
  "keyContext": "framing appropriate to the checkpoint: relation to prior value for NY Open, the Initial Balance read for First Hour, a thesis-check for Midday, or how the session actually played out for Daily Recap",
  "gameplan": "forward-looking plan (or, for Daily Recap, the one takeaway) grounded in the given levels",
  "lineInSand": "the single most important nearby level/zone from the data and what holding or losing it would mean",
  "tradeLocation": "where a long or short would have decent location right now, based on proximity to the given levels — empty string for Daily Recap",
  "whatNotToDo": "one concrete thing to avoid, e.g. chasing a level with no room, grounded in the actual distances given"
}
`.trim();

export async function generateBreakdownNarrative(input: BreakdownNarrativeInput): Promise<BreakdownNarrative> {
  const dataBlock = JSON.stringify(input, null, 2);
  const raw = await callGemini(SYSTEM_PROMPT, [
    { role: "user", parts: [{ text: `Checkpoint data:\n${dataBlock}` }] },
  ]);

  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);

  return {
    headline: String(parsed.headline ?? ""),
    bias: String(parsed.bias ?? ""),
    keyContext: String(parsed.keyContext ?? ""),
    gameplan: String(parsed.gameplan ?? ""),
    lineInSand: String(parsed.lineInSand ?? ""),
    tradeLocation: String(parsed.tradeLocation ?? ""),
    whatNotToDo: String(parsed.whatNotToDo ?? ""),
  };
}
