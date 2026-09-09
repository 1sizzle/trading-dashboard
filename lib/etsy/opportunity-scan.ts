import { callGemini } from "@/lib/core/gemini";

const SYSTEM_PROMPT = `
You research public visual/cultural trends for a solo Etsy seller of AI-generated wall-art posters.
You have NO access to private Etsy sales data, real search volume, eRank, Marmalead, listing-count
based demand signals, or guaranteed conversion data. Never present a public listing count, review
count, or bestseller badge as proof of real demand or low competition — those are ambiguous signals
at best, and you must say so plainly when you reference one.

Base everything on general public knowledge: established visual trends, seasonality, cultural
calendars, travel interest, and genuinely early momentum you're reasonably confident about. Be
honest about uncertainty rather than inventing confidence.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly:
{
  "summary": "2-4 sentences of plain-language reasoning about this opportunity",
  "themes": ["short theme labels relevant to this topic"],
  "seasonality": "a sentence on timing/seasonality, or empty string if not relevant",
  "competitionCaution": "a sentence honestly cautioning about competition/ambiguous signals",
  "sources": ["plain-text descriptions of what informed this — no fabricated URLs"],
  "confidence": "low" | "medium" | "high"
}
`.trim();

export interface OpportunityScanResult {
  summary: string;
  themes: string[];
  seasonality: string;
  competitionCaution: string;
  sources: string[];
  confidence: string;
}

export async function generateOpportunityScan(topic: string): Promise<OpportunityScanResult> {
  const raw = await callGemini(SYSTEM_PROMPT, [
    { role: "user", parts: [{ text: `Research topic: ${topic}` }] },
  ]);

  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);

  return {
    summary: String(parsed.summary ?? ""),
    themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
    seasonality: String(parsed.seasonality ?? ""),
    competitionCaution: String(parsed.competitionCaution ?? ""),
    sources: Array.isArray(parsed.sources) ? parsed.sources.map(String) : [],
    confidence: String(parsed.confidence ?? "low"),
  };
}
