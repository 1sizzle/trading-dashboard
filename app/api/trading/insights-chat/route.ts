import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/core/auth";
import {
  callGemini,
  GeminiConfigError,
  GeminiRateLimitError,
  GeminiRequestError,
  type GeminiContent,
} from "@/lib/core/gemini";
import { buildTradeContext, SYSTEM_PROMPT } from "@/lib/trading/chat-context";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const trades = await db.trade.findMany({
    where: { assetClass: "FUTURES_METALS" },
    include: { tags: { include: { tag: true } }, psychology: true },
  });

  if (trades.length === 0) {
    return NextResponse.json({
      reply: "There aren't any Futures & Metals trades logged yet, so there's nothing for me to analyze.",
    });
  }

  const context = buildTradeContext(
    trades.map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      entryTime: t.entryTime,
      exitTime: t.exitTime,
      pnl: Number(t.pnl),
      rMultiple: t.rMultiple !== null ? Number(t.rMultiple) : null,
      session: t.session,
      tags: t.tags,
      notes: t.notes,
      psychology: t.psychology,
    })),
  );

  const contents: GeminiContent[] = messages.map((m: { role: string; text: string }) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text ?? "") }],
  }));

  try {
    const reply = await callGemini(`${SYSTEM_PROMPT}\n\n${context}`, contents);
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof GeminiConfigError) {
      return NextResponse.json({ error: "AI insights aren't configured yet." }, { status: 500 });
    }
    if (error instanceof GeminiRateLimitError) {
      return NextResponse.json(
        { error: "Hit the free-tier AI usage limit — try again in a minute or two." },
        { status: 429 },
      );
    }
    if (error instanceof GeminiRequestError) {
      return NextResponse.json(
        { error: "The AI couldn't produce an answer for that — try rephrasing." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Couldn't reach the AI service. Try again shortly." }, { status: 502 });
  }
}
