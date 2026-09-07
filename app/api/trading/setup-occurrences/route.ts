import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { timingSafeEqual } from "@/lib/core/auth";
import { calculateSetupPnlDollars, classifySetupOutcome } from "@/lib/trading/setup-occurrences";

// Pushed to by TradingView Pine strategy alerts (entry/exit), one per
// playbook rule. TradingView can't send cookies or (reliably) custom
// headers, so auth is a shared secret embedded in the JSON body instead of
// the session-cookie pattern the rest of the API uses.
//
// TradingView does not retry failed webhook deliveries, so every inbound
// body is logged to SignalLogEntry before anything else is validated — an
// unparseable or rejected request is still recoverable by hand afterward
// instead of being silently lost forever.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  await db.signalLogEntry.create({
    data: { rawText: rawBody, source: "tradingview_webhook" },
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

  const strategyKey = String(body.strategyKey ?? "").trim().toLowerCase();
  if (!strategyKey) {
    return NextResponse.json({ error: "Missing strategyKey." }, { status: 400 });
  }

  if (body.event === "entry") {
    const rule = await db.playbookRule.findUnique({ where: { strategyKey } });
    if (!rule) {
      return NextResponse.json({ error: `Unknown strategyKey "${strategyKey}".` }, { status: 400 });
    }

    const direction = body.direction === "SHORT" ? "SHORT" : "LONG";
    const entryPrice = Number(body.entryPrice);
    const entryTime = new Date(body.time);
    if (!Number.isFinite(entryPrice) || Number.isNaN(entryTime.getTime())) {
      return NextResponse.json({ error: "Invalid entryPrice or time." }, { status: 400 });
    }

    const occurrence = await db.setupOccurrence.create({
      data: {
        playbookRuleId: rule.id,
        symbol: String(body.symbol ?? "NQ").toUpperCase(),
        direction,
        status: "PENDING",
        entryPrice,
        stopPrice: body.stopPrice !== undefined ? Number(body.stopPrice) : null,
        targetPrice: body.targetPrice !== undefined ? Number(body.targetPrice) : null,
        contracts: body.contracts !== undefined ? Number(body.contracts) : 1,
        entryTime,
        source: "WEBHOOK",
        externalId: `webhook-${strategyKey}-${entryTime.toISOString()}`,
        entryRawPayload: body,
      },
    });

    return NextResponse.json({ id: occurrence.id, status: "recorded" });
  }

  if (body.event === "exit") {
    const rule = await db.playbookRule.findUnique({ where: { strategyKey } });
    if (!rule) {
      return NextResponse.json({ error: `Unknown strategyKey "${strategyKey}".` }, { status: 400 });
    }

    // Matches the most recent open occurrence for this strategy. Only
    // correct as long as each Pine strategy holds at most one open position
    // at a time (pyramiding = 0) — see the plan's note on this before
    // wiring up a strategy that might hold concurrent positions.
    const openOccurrence = await db.setupOccurrence.findFirst({
      where: { playbookRuleId: rule.id, status: "PENDING" },
      orderBy: { entryTime: "desc" },
    });

    if (!openOccurrence) {
      return NextResponse.json(
        { error: `No open occurrence found for strategyKey "${strategyKey}".` },
        { status: 404 },
      );
    }

    const exitPrice = Number(body.exitPrice);
    const pnlPoints = Number(body.pnlPoints);
    const exitTime = new Date(body.time);
    if (!Number.isFinite(exitPrice) || !Number.isFinite(pnlPoints) || Number.isNaN(exitTime.getTime())) {
      return NextResponse.json({ error: "Invalid exitPrice, pnlPoints, or time." }, { status: 400 });
    }

    const updated = await db.setupOccurrence.update({
      where: { id: openOccurrence.id },
      data: {
        exitPrice,
        exitTime,
        pnlPoints,
        pnlDollars: calculateSetupPnlDollars(openOccurrence.symbol, pnlPoints, openOccurrence.contracts),
        status: classifySetupOutcome(pnlPoints),
        exitRawPayload: body,
      },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  return NextResponse.json({ error: `Unknown event "${body.event}".` }, { status: 400 });
}
