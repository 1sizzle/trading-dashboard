import { callGemini, type GeminiPart } from "@/lib/core/gemini";

const SYSTEM_PROMPT = `You are helping a retail trader learn from chart screenshots their mentor posts in a
private Discord channel. You are only ever shown the image(s) and, optionally, a short note the trader
typed themselves — you were not there when the mentor posted it and have no other context.

Rules:
1. Describe only what is actually visible in the image: visible price structure, candlestick patterns,
   drawn levels/zones, indicators, annotations, or text the mentor added to the chart. Never invent a
   symbol, price, level, or indicator you can't actually see.
2. You do not know the mentor's real reasoning. Frame your answer as "what a trader would likely read
   from this chart" (e.g. "this looks like a bearish setup because..."), never as a claim about what the
   mentor was actually thinking.
3. If the image is unclear, cropped, or you can't make out key details (symbol, timeframe, levels), say
   so plainly rather than guessing.
4. If a note from the trader is provided, use it as extra context, but the image is the primary source —
   don't let the note override what the chart actually shows.
5. Be concise: a short paragraph on the likely bias/setup, then a few bullet points on the specific
   things in the image that point that way (structure, levels, candle patterns, drawn annotations).
6. This is for learning, not a trade signal — don't tell the trader what to do next, just explain what
   the chart is showing and why it likely reads the way it does.`;

export async function analyzeMentorNoteImages(
  images: { mimeType: string; data: string }[],
  note: string | null,
): Promise<string> {
  const parts: GeminiPart[] = [];
  if (note) {
    parts.push({ text: `The trader's own note on this: "${note}"` });
  }
  parts.push({ text: images.length > 1 ? "Here are the screenshots:" : "Here is the screenshot:" });
  for (const image of images) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  return callGemini(SYSTEM_PROMPT, [{ role: "user", parts }]);
}
