export class GeminiConfigError extends Error {}
export class GeminiRateLimitError extends Error {}
export class GeminiRequestError extends Error {}

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 503 ("model overloaded") is explicitly described by Google as usually transient —
// already seen in practice during this project's own testing, where a plain retry
// succeeded. Worth a couple of automatic retries before surfacing it as a real
// failure, rather than making every caller build its own retry loop.
const RETRYABLE_STATUS = 503;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1500, 3000];

export async function callGemini(systemInstruction: string, contents: GeminiContent[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError("GEMINI_API_KEY environment variable is not set");
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

  let lastError: Error = new GeminiRequestError("Gemini request failed");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        // gemini-3.6-flash is a "thinking" model — its internal reasoning
        // tokens draw from the same maxOutputTokens budget as the visible
        // answer, so this needs real headroom or the response gets cut off
        // with no text at all before it ever gets to answering.
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
      }),
    });

    if (res.status === 429) {
      throw new GeminiRateLimitError("Gemini free-tier rate limit hit");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      lastError = new GeminiRequestError(`Gemini request failed (${res.status}): ${body}`);
      if (res.status === RETRYABLE_STATUS && attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw lastError;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string" || text.trim() === "") {
      const blockReason = data.promptFeedback?.blockReason;
      throw new GeminiRequestError(blockReason ? `Blocked: ${blockReason}` : "Gemini returned no answer");
    }

    return text;
  }

  throw lastError;
}
