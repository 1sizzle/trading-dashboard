import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { timingSafeEqual } from "@/lib/core/auth";
import { getNewYorkDateValue } from "@/lib/trading/calc";
import { generateBreakdownNarrative, StructureData, StructureTimeframe } from "@/lib/trading/market-breakdown-narrative";

const POST_TYPES = new Set(["NY_OPEN", "FIRST_HOUR", "MIDDAY", "DAILY_RECAP"]);

function isStructureTimeframe(value: unknown): value is StructureTimeframe {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v.bias === "bullish" || v.bias === "bearish") && typeof v.label === "string";
}

// Loose validation, not strict parsing: an unrecognized shape is treated the
// same as "not sent yet" (structureData stays null) rather than rejecting
// the whole webhook request over one malformed field.
function parseStructureData(value: unknown): StructureData | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    isStructureTimeframe(v.daily) &&
    isStructureTimeframe(v.h4) &&
    isStructureTimeframe(v.h1) &&
    isStructureTimeframe(v.m5)
  ) {
    return { daily: v.daily, h4: v.h4, h1: v.h1, m5: v.m5 };
  }
  return null;
}

// Pushed to by the user's own TradingView Pine indicator (NOT a Discord
// integration — see the plan's explicit note that the third-party Discord
// channel is never read by this app). Same shared-secret-in-body auth as
// app/api/trading/setup-occurrences/route.ts, since TradingView alerts can't
// send cookies, and the same log-before-validate durability discipline,
// since TradingView does not retry failed webhook deliveries.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  await db.signalLogEntry.create({
    data: { rawText: rawBody, source: "tradingview_webhook_market_breakdown" },
  });

  const body = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const secret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook isn't configured yet." }, { status: 500 });
  }
  if (typeof body.secret !== "string" || !timingSafeEqual(body.secret, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postType = String(body.postType ?? "");
  if (!POST_TYPES.has(postType)) {
    return NextResponse.json({ error: `Unknown postType "${postType}".` }, { status: 400 });
  }

  const price = Number(body.price);
  const postedAt = new Date(body.time);
  if (!Number.isFinite(price) || Number.isNaN(postedAt.getTime())) {
    return NextResponse.json({ error: "Invalid price or time." }, { status: 400 });
  }

  const symbol = String(body.symbol ?? "NQ").toUpperCase();
  const tradingDateValue = getNewYorkDateValue(postedAt);
  const tradingDate = new Date(`${tradingDateValue}T00:00:00.000Z`);
  const keyLevels = Array.isArray(body.keyLevels) ? body.keyLevels : [];
  const vix = body.vix !== undefined && body.vix !== null ? Number(body.vix) : null;
  const sessionVolumePct =
    body.sessionVolumePct !== undefined && body.sessionVolumePct !== null ? Number(body.sessionVolumePct) : null;
  const ibHigh = body.ibHigh !== undefined && body.ibHigh !== null ? Number(body.ibHigh) : null;
  const ibLow = body.ibLow !== undefined && body.ibLow !== null ? Number(body.ibLow) : null;
  const structureData = parseStructureData(body.structureData);

  const post = await db.marketBreakdownPost.upsert({
    where: { externalId: `nqbreakdown-${postType.toLowerCase()}-${tradingDateValue}` },
    create: {
      symbol,
      postType: postType as "NY_OPEN" | "FIRST_HOUR" | "MIDDAY" | "DAILY_RECAP",
      tradingDate,
      postedAt,
      price,
      vix,
      sessionVolumePct,
      ibHigh,
      ibLow,
      keyLevelsData: keyLevels,
      structureData: structureData as unknown as object,
      rawPayload: body,
      externalId: `nqbreakdown-${postType.toLowerCase()}-${tradingDateValue}`,
    },
    update: {
      postedAt,
      price,
      vix,
      sessionVolumePct,
      ibHigh,
      ibLow,
      keyLevelsData: keyLevels,
      structureData: structureData as unknown as object,
      rawPayload: body,
    },
  });

  // Narrative generation is best-effort: the numeric data is already durably
  // stored above, so a Gemini failure (rate limit, misconfigured key) never
  // loses the underlying post — it just leaves narrative null for now,
  // regenerable later rather than blocking the webhook response.
  let narrativeError: string | null = null;
  try {
    const narrative = await generateBreakdownNarrative({
      postType: postType as "NY_OPEN" | "FIRST_HOUR" | "MIDDAY" | "DAILY_RECAP",
      symbol,
      price,
      vix,
      sessionVolumePct,
      ibHigh,
      ibLow,
      keyLevels,
      structureData,
      valueAreaData: null,
      historicalStatsData: null,
    });
    await db.marketBreakdownPost.update({
      where: { id: post.id },
      data: { narrative: narrative as unknown as object },
    });
  } catch (err) {
    narrativeError = err instanceof Error ? err.message : "Narrative generation failed.";
  }

  return NextResponse.json({ id: post.id, status: "recorded", narrativeError });
}
