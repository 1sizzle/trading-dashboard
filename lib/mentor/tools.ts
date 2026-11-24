import { get } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "@/lib/core/db";
import { getNewYorkDayRangeUtc, shiftDateValue, wallTimeComponentsToUtc } from "@/lib/trading/calc";
import { ANGUS_RULES, COACHING } from "@/lib/mentor/brief";
import { getBars, getLevels, MarketDataError, nyParts, tradeDate } from "@/lib/mentor/market-data";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const TIME = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM (New York)");
const MAX_IMAGES = 4;

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
const text = (value: unknown): { content: Content[] } => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 1) }],
});
const failure = (message: string) => ({ ...text(message), isError: true });

// Playbook and rules notes are stored as HTML with inline SVG diagrams: keep the words.
function plain(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<svg[\s\S]*?<\/svg>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

const fmt = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "medium", timeStyle: "short" });
const ukTime = (d: Date | null) => (d ? fmt("Europe/London").format(d) : null);
const nyTime = (d: Date | null) => (d ? fmt("America/New_York").format(d) : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function ukDayRangeUtc(dateValue: string) {
  const [y, m, d] = dateValue.split("-").map(Number);
  const next = shiftDateValue(dateValue, 1).split("-").map(Number);
  return {
    start: wallTimeComponentsToUtc(y, m, d, 0, 0, 0, "Europe/London"),
    end: wallTimeComponentsToUtc(next[0], next[1], next[2], 0, 0, 0, "Europe/London"),
  };
}

const ukToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

async function loadImage(url: string): Promise<Content | null> {
  const blob = await get(url, { access: "private" });
  if (!blob?.stream) return null;
  const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
  // Keep chart screenshots readable but small enough to send.
  const jpeg = await sharp(buffer).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { type: "image", data: jpeg.toString("base64"), mimeType: "image/jpeg" };
}

export function registerMentorTools(server: McpServer) {
  server.registerTool(
    "mentor_brief",
    {
      title: "Mentor brief",
      description:
        "Call this first in every conversation. Coaching rules and workflows (premarket / check / review / " +
        "week), the trader's schedule, Angus' rules, the trader's own playbook, trading rules and risk " +
        "settings, their recurring-pattern notes, and the current time and trade date.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [playbook, rules, risk, memory] = await Promise.all([
        db.playbookRule.findMany({ orderBy: { order: "asc" } }),
        db.tradingRulesNote.findFirst({ orderBy: { updatedAt: "desc" } }),
        db.riskSettings.findFirst(),
        db.mentorMemory.findFirst({ orderBy: { updatedAt: "desc" } }),
      ]);
      const now = new Date();
      const sections = [
        COACHING,
        ANGUS_RULES,
        `# The trader's playbook\n${playbook
          .map((r) => `## ${r.title} (${r.setupGrade})\n${plain(r.content)}`)
          .join("\n\n") || "(empty)"}`,
        `# The trader's trading rules\n${plain(rules?.content) || "(none written)"}`,
        `# Risk settings\n${
          risk
            ? `Account size $${num(risk.accountSize)}, daily loss limit $${num(risk.dailyLossLimit)}, max risk per trade $${num(risk.maxRiskPerTrade)}`
            : "(not set)"
        }`,
        `# Recurring patterns (your notes, last updated ${ukTime(memory?.updatedAt ?? null) ?? "never"})\n${
          memory?.content ?? "(none yet - start after the first review)"
        }`,
        `# Now\nUK: ${ukTime(now)} | New York: ${nyTime(now)} | current futures trade date: ${tradeDate(now)}`,
      ];
      return text(sections.join("\n\n"));
    },
  );

  server.registerTool(
    "get_journal",
    {
      title: "Get journal trades",
      description:
        "Journal trades with thesis, management, review, emotions, tags, account, R and P&L, plus missed " +
        "setups. Dates are UK calendar days (a 23:00 UK Asia-open trade counts on that UK day). Give " +
        "from/to, or last for the most recent N trades. Default: today (UK).",
      inputSchema: {
        from: DATE.optional().describe("First UK date, inclusive"),
        to: DATE.optional().describe("Last UK date, inclusive (default: same as from)"),
        last: z.number().int().min(1).max(100).optional().describe("Most recent N trades instead of a date range"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, last }) => {
      const include = { tags: { include: { tag: true } }, psychology: true, screenshots: true } as const;
      let where = {};
      let missed: Awaited<ReturnType<typeof db.missedSetup.findMany<{ include: { screenshots: true } }>>> = [];
      if (!last) {
        const start = ukDayRangeUtc(from ?? ukToday()).start;
        const end = ukDayRangeUtc(to ?? from ?? ukToday()).end;
        where = { entryTime: { gte: start, lt: end } };
        missed = await db.missedSetup.findMany({
          where: { seenAt: { gte: start, lt: end } },
          include: { screenshots: true },
          orderBy: { seenAt: "asc" },
        });
      }
      const trades = await db.trade.findMany({
        where,
        include,
        orderBy: { entryTime: last ? "desc" : "asc" },
        take: last ?? 500,
      });
      return text({
        trades: trades.map((t) => ({
          id: t.id,
          entryUK: ukTime(t.entryTime),
          entryNY: nyTime(t.entryTime),
          exitNY: nyTime(t.exitTime),
          tradeDate: tradeDate(t.entryTime),
          symbol: t.symbol,
          direction: t.direction,
          session: t.session,
          account: t.accountName,
          outcome: t.outcome,
          entryModel: t.entryModel,
          entryPrice: num(t.entryPrice),
          exitPrice: num(t.exitPrice),
          stopLoss: num(t.stopLoss),
          positionSize: num(t.positionSize),
          riskDollars: num(t.riskDollars),
          pnl: num(t.pnl),
          rMultiple: num(t.rMultiple),
          durationMinutes: t.durationMinutes,
          preTradeThesis: t.preTradeThesis,
          management: t.management,
          review: t.review,
          notes: t.notes,
          emotions: t.psychology
            ? { before: t.psychology.preEmotion, after: t.psychology.postEmotion, notes: t.psychology.notes }
            : null,
          tags: t.tags.map((x) => x.tag.name),
          screenshots: t.screenshots.length,
        })),
        missedSetups: missed.map((m) => ({
          id: m.id,
          seenUK: ukTime(m.seenAt),
          seenNY: nyTime(m.seenAt),
          symbol: m.symbol,
          direction: m.direction,
          setup: m.setupDescription,
          reasonSkipped: m.reasonSkipped,
          notes: m.notes,
          screenshots: m.screenshots.length,
        })),
      });
    },
  );

  server.registerTool(
    "get_trade_images",
    {
      title: "Get screenshots",
      description:
        `Screenshots attached to a journal trade, a missed setup, or a mentor call (Discord post), as images ` +
        `(up to ${MAX_IMAGES}). Use the id from get_journal or get_day_context.`,
      inputSchema: {
        kind: z.enum(["trade", "missed_setup", "mentor_call"]),
        id: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ kind, id }) => {
      const rows =
        kind === "trade"
          ? await db.tradeScreenshot.findMany({ where: { tradeId: id } })
          : kind === "missed_setup"
            ? await db.missedSetupScreenshot.findMany({ where: { missedSetupId: id } })
            : await db.mentorNoteScreenshot.findMany({ where: { mentorNoteId: id } });
      if (rows.length === 0) return failure("No screenshots for that id.");
      const images = (await Promise.all(rows.slice(0, MAX_IMAGES).map((r) => loadImage(r.url)))).filter(
        (x): x is Content => x !== null,
      );
      const note = rows.length > MAX_IMAGES ? [{ type: "text" as const, text: `Showing ${MAX_IMAGES} of ${rows.length}.` }] : [];
      return { content: [...images, ...note] };
    },
  );

  server.registerTool(
    "get_levels",
    {
      title: "Get key levels",
      description:
        "Key levels for a futures trade date (starts 18:00 New York the evening before): yearly/monthly/" +
        "weekly/daily opens, midnight/9:30/10:00 opens, previous day/week/month high-low-EQ, Asia/London/" +
        "NY AM/IB/NY PM ranges, last price. Free feed, ~10 minutes delayed. Default: current trade date.",
      inputSchema: {
        symbol: z.enum(["NQ", "ES"]).default("NQ"),
        date: DATE.optional().describe("Trade date (YYYY-MM-DD)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol, date }) => {
      try {
        return text(await getLevels(symbol, date));
      } catch (err) {
        return failure(err instanceof MarketDataError ? err.message : `Price feed failed: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    "get_bars",
    {
      title: "Get price bars",
      description:
        "OHLC bars (New York times) for a window of a trade date, e.g. around a trade's entry and exit. " +
        "1-minute bars exist for about the last week, 5-minute for about two months.",
      inputSchema: {
        symbol: z.enum(["NQ", "ES"]).default("NQ"),
        date: DATE.describe("Trade date (YYYY-MM-DD)"),
        start: TIME,
        end: TIME,
        timeframe_minutes: z.number().int().min(1).max(60).default(5),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ symbol, date, start, end, timeframe_minutes }) => {
      try {
        const bars = await getBars(symbol, date, start, end, timeframe_minutes);
        return bars.bars.length ? text(bars) : failure("No bars in that window (market closed, or too far back).");
      } catch (err) {
        return failure(err instanceof MarketDataError ? err.message : `Price feed failed: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    "get_day_context",
    {
      title: "Get day context",
      description:
        "Everything the dashboard holds for a New York calendar day: red/orange-folder news, the trader's " +
        "premarket checklist and market bias, TradingView market-breakdown posts, mentor calls (Discord " +
        "posts they saved, with any AI read), TradingView setup occurrences, and their daily review.",
      inputSchema: { date: DATE.optional().describe("New York date (default: today in New York)") },
      annotations: { readOnlyHint: true },
    },
    async ({ date }) => {
      const day = date ?? nyParts(new Date()).date;
      const label = new Date(`${day}T00:00:00.000Z`);
      const { start, end } = getNewYorkDayRangeUtc(day);
      // News from the previous evening's Asia open through this day's close.
      const newsFrom = new Date(start.getTime() - 6 * 60 * 60 * 1000);
      const [news, premarket, bias, breakdowns, calls, setups, review] = await Promise.all([
        db.newsEvent.findMany({ where: { eventTime: { gte: newsFrom, lt: end } }, orderBy: { eventTime: "asc" } }),
        db.premarketChecklist.findUnique({ where: { date: label } }),
        db.marketBiasEntry.findMany({ where: { date: label } }),
        db.marketBreakdownPost.findMany({ where: { tradingDate: label }, orderBy: { postedAt: "asc" } }),
        db.mentorNote.findMany({
          where: { postedAt: { gte: newsFrom, lt: end } },
          include: { screenshots: true },
          orderBy: { postedAt: "asc" },
        }),
        db.setupOccurrence.findMany({
          where: { entryTime: { gte: newsFrom, lt: end } },
          include: { playbookRule: { select: { title: true } } },
          orderBy: { entryTime: "asc" },
        }),
        db.dailyReview.findUnique({ where: { date: label } }),
      ]);
      return text({
        date: day,
        news: news.map((n) => ({ timeNY: nyTime(n.eventTime), timeUK: ukTime(n.eventTime), title: n.title, currency: n.currency, impact: n.impact, forecast: n.forecast, previous: n.previous })),
        premarket: premarket && { bias: premarket.bias, keyLevels: premarket.keyLevels, notes: premarket.notes, mentorPlan: premarket.mentorPlan },
        marketBias: bias.map((b) => ({ session: b.session, bias: b.bias, points: num(b.points), note: b.note })),
        marketBreakdowns: breakdowns.map((p) => ({ type: p.postType, postedNY: nyTime(p.postedAt), price: num(p.price), ibHigh: num(p.ibHigh), ibLow: num(p.ibLow), keyLevels: p.keyLevelsData, structure: p.structureData, valueArea: p.valueAreaData, narrative: p.narrative })),
        mentorCalls: calls.map((c) => ({ id: c.id, postedUK: ukTime(c.postedAt), note: c.note, aiRead: c.analysis, screenshots: c.screenshots.length })),
        setupOccurrences: setups.map((s) => ({ setup: s.playbookRule.title, direction: s.direction, status: s.status, entryNY: nyTime(s.entryTime), entry: num(s.entryPrice), stop: num(s.stopPrice), target: num(s.targetPrice), exit: num(s.exitPrice), pnlPoints: num(s.pnlPoints) })),
        dailyReview: review && { reflection: review.reflection, aiCommentary: review.aiCommentary, mentorReview: review.mentorReview },
      });
    },
  );

  server.registerTool(
    "save_premarket_plan",
    {
      title: "Save premarket plan",
      description:
        "Save your premarket plan (markdown) to the trader's premarket checklist for a New York date, shown " +
        "on their dashboard. Doesn't overwrite their own bias, levels or notes.",
      inputSchema: { date: DATE.describe("New York date the plan is for"), plan: z.string().min(1).max(20000) },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ date, plan }) => {
      const label = new Date(`${date}T00:00:00.000Z`);
      await db.premarketChecklist.upsert({
        where: { date: label },
        update: { mentorPlan: plan },
        create: { date: label, bias: "", keyLevels: "", mentorPlan: plan },
      });
      return text(`Saved the plan for ${date}.`);
    },
  );

  server.registerTool(
    "save_review",
    {
      title: "Save review",
      description:
        "Save your session or weekly review (markdown) to the trader's dashboard, in its own 'Mentor review' " +
        "field (doesn't touch their reflection or the Gemini take). period=day takes the New York date; " +
        "period=week takes any date in the week (stored on that week's Monday).",
      inputSchema: {
        period: z.enum(["day", "week"]),
        date: DATE,
        review: z.string().min(1).max(30000),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ period, date, review }) => {
      if (period === "day") {
        const label = new Date(`${date}T00:00:00.000Z`);
        await db.dailyReview.upsert({ where: { date: label }, update: { mentorReview: review }, create: { date: label, mentorReview: review } });
        return text(`Saved the review for ${date}.`);
      }
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      const monday = shiftDateValue(date, weekday === 0 ? -6 : 1 - weekday);
      const label = new Date(`${monday}T00:00:00.000Z`);
      await db.weeklyReview.upsert({ where: { weekStart: label }, update: { mentorReview: review }, create: { weekStart: label, mentorReview: review } });
      return text(`Saved the review for the week of ${monday}.`);
    },
  );

  server.registerTool(
    "update_patterns",
    {
      title: "Update pattern notes",
      description:
        "Rewrite your running notes on the trader's recurring patterns (markdown, the whole note - read it " +
        "in mentor_brief first). One line per pattern: date first seen, count, evidence, what to do instead.",
      inputSchema: { content: z.string().min(1).max(20000) },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ content }) => {
      const existing = await db.mentorMemory.findFirst({ orderBy: { updatedAt: "desc" } });
      if (existing) {
        await db.mentorMemory.update({ where: { id: existing.id }, data: { content } });
      } else {
        await db.mentorMemory.create({ data: { content } });
      }
      return text("Pattern notes saved.");
    },
  );
}
