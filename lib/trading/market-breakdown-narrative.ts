import { callGemini } from "@/lib/core/gemini";

export interface KeyLevelField {
  name: string;
  price: number;
  distanceFromPrice: number;
  tapped: boolean;
}

export interface StructureTimeframe {
  bias: "bullish" | "bearish";
  label: string; // e.g. "bullish BOS" or "bearish CHoCH"
}

export interface StructureData {
  daily: StructureTimeframe;
  h4: StructureTimeframe;
  h1: StructureTimeframe;
  m5: StructureTimeframe;
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
  // Phase 2 — real once the Pine structure-detection change is live; null
  // before then or if a payload omits it. Phases 3-4 stay permanently
  // unknown for now. Passed through so the prompt can honestly acknowledge
  // what's not available yet rather than silently omitting mention of it.
  structureData: StructureData | null;
  valueAreaData: unknown;
  historicalStatsData: unknown;
}

export interface BreakdownNarrative {
  headline: string;
  alignment: string;
  bias: string;
  keyContext: string;
  gameplan: string;
  lineInSand: string;
  tradeLocation: string;
  whatNotToDo: string;
}

// Fixed, deterministic thresholds — not asked of Gemini, since a
// classification like this should never be able to drift from the real
// number due to model guessing.
export function classifyVix(vix: number): "low" | "normal" | "elevated" | "high" | "extreme" {
  if (vix < 15) return "low";
  if (vix < 20) return "normal";
  if (vix < 25) return "elevated";
  if (vix < 35) return "high";
  return "extreme";
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
2. The input may include a real "structureData" object (per-timeframe bias/label
   for Daily, 4H, 1H, and 5M) or null. When it is present, use it — write the
   "alignment" field synthesizing how the 4 timeframes relate (e.g. how many agree,
   which ones diverge, what that implies). When "structureData" is null, leave
   "alignment" as an empty string and do not mention multi-timeframe structure at
   all. "valueAreaData" and "historicalStatsData" are always null right now — never
   mention value area (POC/VAH/VAL) or historical base-rate statistics under any
   circumstance. Do not apologize for anything's absence either — just write the
   briefing using only what's actually there.
3. Write in a terse, professional day-trading-desk tone: short sentences, level
   names and prices stated plainly, no hedging filler, no generic disclaimers.
4. Return ONLY a single JSON object, no markdown fences, no commentary, matching
   exactly this shape (all values are strings, 1-3 sentences each, "alignment" and
   "tradeLocation" may be empty strings when not applicable):

{
  "headline": "one line stating where price is relative to the most important nearby levels",
  "alignment": "synthesis of the 4 timeframes' structure readings, e.g. how many agree vs. diverge and what that implies — empty string if structureData is null",
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
    alignment: String(parsed.alignment ?? ""),
    bias: String(parsed.bias ?? ""),
    keyContext: String(parsed.keyContext ?? ""),
    gameplan: String(parsed.gameplan ?? ""),
    lineInSand: String(parsed.lineInSand ?? ""),
    tradeLocation: String(parsed.tradeLocation ?? ""),
    whatNotToDo: String(parsed.whatNotToDo ?? ""),
  };
}
