import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { timingSafeEqual } from "@/lib/core/auth";
import { utcMidnightToDateInputValue } from "@/lib/finances/dates";

// Read by the Scriptable lock-screen widget. A widget can't hold the
// dashboard's session cookie, so it authenticates with a bearer token
// (TIMETABLE_WIDGET_TOKEN) instead — the same shared-secret pattern as the
// cron and TradingView routes.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = process.env.TIMETABLE_WIDGET_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Widget isn't configured yet." }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!timingSafeEqual(provided, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Weekly blocks, plus one-off blocks from yesterday onwards. The widget
  // decides which apply to "today" using the phone's own date, so a day
  // either side covers any timezone offset from the server's UTC clock.
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const rows = await db.timetableBlock.findMany({
    where: { OR: [{ date: null }, { date: { gte: yesterday } }] },
    orderBy: { startTime: "asc" },
    select: { title: true, startTime: true, endTime: true, days: true, date: true, color: true },
  });
  const blocks = rows.map((b) => ({ ...b, date: b.date ? utcMidnightToDateInputValue(b.date) : null }));

  return NextResponse.json({ blocks }, { headers: { "Cache-Control": "no-store" } });
}
