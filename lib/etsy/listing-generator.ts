import { callGemini } from "@/lib/core/gemini";

const TITLE_MAX_LENGTH = 140; // Etsy's current title character limit
const REQUIRED_TAG_COUNT = 13; // Etsy's current tag limit

const SYSTEM_PROMPT = `
You write Etsy listing copy for a solo seller's AI-generated wall-art poster prints, fulfilled by a
print-on-demand partner. The seller is the designer; the fulfilment partner only prints and ships —
never describe the fulfilment partner as the seller or the artist.

You do NOT know the real paper stock, exact sizes offered, frame options, processing times, shipping
times, or return policy — never invent any of these. If the description needs to reference them,
use generic, non-committal phrasing (e.g. "available in multiple sizes" rather than a specific list)
and leave specifics for the seller to fill in by hand.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly:
{
  "title": "a search-friendly title, under ${TITLE_MAX_LENGTH} characters",
  "description": "a substantial description with this structure: a short intro specific to this piece, then a 'Poster Quality' section, a 'Poster Sizing' section, a 'Shipping' section, and a 'Questions and Satisfaction' section — all generic/non-committal on specifics the seller must fill in",
  "tags": ["exactly ${REQUIRED_TAG_COUNT} short search tags"],
  "suggestedCategory": "a plausible Etsy category name",
  "suggestedMaterials": "comma-separated plausible materials, e.g. Paper, Ink",
  "altText": "a plain accessibility description of the artwork",
  "aiDisclosure": "one honest sentence disclosing the artwork was AI-generated",
  "pricingNotes": "1-2 sentences of pricing considerations, no invented numbers"
}
`.trim();

export interface GeneratedListing {
  title: string;
  description: string;
  tags: string[];
  suggestedCategory: string;
  suggestedMaterials: string;
  altText: string;
  aiDisclosure: string;
  pricingNotes: string;
}

export async function generateListingCopy(promptText: string): Promise<GeneratedListing> {
  const raw = await callGemini(SYSTEM_PROMPT, [
    { role: "user", parts: [{ text: `Artwork prompt this listing is for:\n${promptText}` }] },
  ]);

  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);

  let title = String(parsed.title ?? "").trim();
  if (title.length > TITLE_MAX_LENGTH) {
    title = title.slice(0, TITLE_MAX_LENGTH).trim();
  }

  let tags: string[] = Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [];
  // Server-side enforcement, never trusting the model to have counted correctly.
  tags = tags.slice(0, REQUIRED_TAG_COUNT);
  while (tags.length < REQUIRED_TAG_COUNT) {
    tags.push(`wall art ${tags.length + 1}`);
  }

  return {
    title: title || "Untitled poster",
    description: String(parsed.description ?? ""),
    tags,
    suggestedCategory: String(parsed.suggestedCategory ?? ""),
    suggestedMaterials: String(parsed.suggestedMaterials ?? ""),
    altText: String(parsed.altText ?? ""),
    aiDisclosure: String(parsed.aiDisclosure ?? "This artwork was created with AI image generation."),
    pricingNotes: String(parsed.pricingNotes ?? ""),
  };
}
