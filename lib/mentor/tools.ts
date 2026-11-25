import { get } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "@/lib/core/db";
import { calculateDurationMinutes, detectSession, getNewYorkDayRangeUtc, shiftDateValue, wallTimeComponentsToUtc } from "@/lib/trading/calc";
import { revalidatePath } from "next/cache";
import { ANGUS_RECAPS, ANGUS_RULES, COACHING } from "@/lib/mentor/brief";
import { getBars, getLevels, MarketDataError, nyParts, tradeDate } from "@/lib/mentor/market-data";
import { isFutures, outcomeFromR, planLine, tradeMaths } from "@/lib/mentor/log-trade";

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

export function registerMentorTools(server: McpServer, origin: string) {
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
        ANGUS_RECAPS,
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

  const editLink = (id: string) => `${origin}/dashboard/trading/journal/${id}/edit`;
  const toUtc = (date: string, time: string, zone: "London" | "New_York") => {
    const [y, m, d] = date.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);
    return wallTimeComponentsToUtc(y, m, d, h, mi, 0, zone === "London" ? "Europe/London" : "America/New_York");
  };
  const PRICE = z.number().positive();
  const refreshJournal = () => {
    try {
      revalidatePath("/dashboard/trading/journal");
    } catch {
      // Outside a Next request (scripts/tests) there is no cache to refresh.
    }
  };

  server.registerTool(
    "log_trade",
    {
      title: "Log a trade to the journal",
      description:
        "Add a trade to the trader's journal from what they send you (usually a position/chart screenshot " +
        "showing entry, stop and take-profit). Fills the numbers, the plan line, setup and thesis; leaves " +
        "emotions for the trader to add. Exit/outcome are optional - log at entry and use update_trade " +
        "when it closes. Times are New York time by default (their TradingView is set to NY). One trade per account " +
        "listed. Returns the trade id and an edit link (they attach the screenshot and feelings there). " +
        "Refuses a likely duplicate unless force is true.",
      inputSchema: {
        symbol: z.string().default("MNQ").describe("Contract, e.g. MNQ, NQ, MES"),
        direction: z.enum(["LONG", "SHORT"]),
        date: DATE.describe("Calendar date of the entry, in the zone below"),
        time: TIME.describe("Entry time HH:MM, in the zone below"),
        timezone: z.enum(["London", "New_York"]).default("New_York"),
        entry: PRICE,
        stop: PRICE,
        target: PRICE.optional().describe("Take-profit (first target if several)"),
        contracts: z.number().int().positive().optional(),
        exit: PRICE.optional().describe("Exit price, if already closed"),
        exitTime: TIME.optional().describe("Exit time HH:MM, same date and zone"),
        outcome: z.enum(["WIN", "LOSS", "BREAKEVEN"]).optional().describe("Defaults from exit vs entry"),
        pnl: z.number().optional().describe("Dollar P&L if shown (signed); otherwise worked out from contracts"),
        setup: z.string().max(200).optional().describe("Entry model, e.g. Golden Pocket, IB rejection"),
        thesis: z.string().max(5000).optional().describe("Why they took it, as they told you"),
        management: z.string().max(5000).optional().describe("Anything about management beyond the plan line"),
        accounts: z.array(z.string()).optional().describe("Account names to log it on (case-insensitive)"),
        tags: z.array(z.string()).optional(),
        force: z.boolean().default(false),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (a) => {
      const symbol = a.symbol.trim().toUpperCase();
      if ((a.direction === "LONG") !== (a.stop < a.entry)) {
        return failure(
          `A ${a.direction.toLowerCase()} needs the stop ${a.direction === "LONG" ? "below" : "above"} entry - check direction, entry and stop.`,
        );
      }
      const entryTime = toUtc(a.date, a.time, a.timezone);
      let exitTime = a.exitTime ? toUtc(a.date, a.exitTime, a.timezone) : null;
      if (exitTime && exitTime < entryTime) exitTime = new Date(exitTime.getTime() + 86_400_000); // closed after midnight

      const wanted = (a.accounts ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean);
      let accounts: { id: string; name: string }[] = [];
      if (wanted.length) {
        const all = await db.tradingAccount.findMany({ select: { id: true, name: true } });
        const missing = wanted.filter((n) => !all.some((acc) => acc.name.toLowerCase() === n));
        if (missing.length) {
          return failure(`No account called ${missing.join(", ")}. Accounts: ${all.map((x) => x.name).join(", ") || "none"}.`);
        }
        accounts = all.filter((acc) => wanted.includes(acc.name.toLowerCase()));
      }

      if (!a.force) {
        const dupe = await db.trade.findFirst({
          where: {
            direction: a.direction,
            entryTime: { gte: new Date(entryTime.getTime() - 5 * 60_000), lte: new Date(entryTime.getTime() + 5 * 60_000) },
          },
        });
        if (dupe) {
          return failure(
            `Looks already logged: trade ${dupe.id} (${a.direction} at ${nyTime(dupe.entryTime)} NY). Use update_trade on it, or force=true if it's a separate trade.`,
          );
        }
      }

      const levels = { symbol, direction: a.direction, entry: a.entry, stop: a.stop, target: a.target, exit: a.exit, contracts: a.contracts };
      const m = tradeMaths(levels);
      const outcome = a.outcome ?? (m.resultR != null ? outcomeFromR(m.resultR) : null);
      const pnl = a.pnl ?? m.pnl ?? 0;
      const plan = planLine(levels);
      const session = detectSession(entryTime);

      const tagIds: string[] = [];
      for (const name of [...new Set((a.tags ?? []).map((t) => t.trim()).filter(Boolean))]) {
        tagIds.push((await db.tag.upsert({ where: { name }, update: {}, create: { name } })).id);
      }

      const created = [];
      for (const acc of accounts.length ? accounts : [null]) {
        const trade = await db.trade.create({
          data: {
            symbol,
            direction: a.direction,
            assetClass: isFutures(symbol) ? "FUTURES_METALS" : "CRYPTO",
            accountId: acc?.id ?? null,
            accountName: acc?.name ?? null,
            outcome,
            entryModel: a.setup?.trim() || null,
            preTradeThesis: a.thesis?.trim() || null,
            management: [plan, a.management?.trim()].filter(Boolean).join("\n"),
            entryPrice: a.entry,
            stopLoss: a.stop,
            exitPrice: a.exit ?? null,
            positionSize: a.contracts ?? null,
            riskDollars: m.riskDollars,
            entryTime,
            exitTime,
            durationMinutes: exitTime ? calculateDurationMinutes(entryTime, exitTime) : null,
            pnl,
            rMultiple: m.resultR != null ? Math.abs(m.resultR) : null, // stored positive; outcome gives the sign
            session,
            notes: "Logged by the mentor from a screenshot.",
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          },
        });
        created.push({ id: trade.id, account: acc?.name ?? null, edit: editLink(trade.id) });
      }
      refreshJournal();

      return text({
        logged: created,
        plan,
        session,
        entryNY: nyTime(entryTime),
        entryUK: ukTime(entryTime),
        outcome: outcome ?? "open (no exit yet)",
        resultR: m.resultR,
        pnl,
        stillToAdd: "screenshot and emotions (pre/post) - on the edit link",
      });
    },
  );

  server.registerTool(
    "update_trade",
    {
      title: "Update a journal trade",
      description:
        "Add the result or fix numbers on a trade already in the journal (id from log_trade or " +
        "get_journal): exit, outcome, P&L, stop, target, setup, thesis, management, review. Recomputes R " +
        "and the plan line. Never touches emotions or screenshots.",
      inputSchema: {
        id: z.string().min(1),
        exit: PRICE.optional(),
        exitDate: DATE.optional().describe("Defaults to the entry date in the zone below"),
        exitTime: TIME.optional(),
        timezone: z.enum(["London", "New_York"]).default("New_York"),
        stop: PRICE.optional(),
        entry: PRICE.optional(),
        target: PRICE.optional(),
        contracts: z.number().int().positive().optional(),
        outcome: z.enum(["WIN", "LOSS", "BREAKEVEN"]).optional(),
        pnl: z.number().optional(),
        setup: z.string().max(200).optional(),
        thesis: z.string().max(5000).optional(),
        management: z.string().max(5000).optional().describe("Extra management notes (kept under the plan line)"),
        review: z.string().max(10000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async (a) => {
      const trade = await db.trade.findUnique({ where: { id: a.id } });
      if (!trade) return failure(`No trade with id ${a.id}. Use get_journal to find it.`);

      const symbol = trade.symbol ?? "MNQ";
      const entry = a.entry ?? num(trade.entryPrice);
      const stop = a.stop ?? num(trade.stopLoss);
      const exit = a.exit ?? num(trade.exitPrice);
      const contracts = a.contracts ?? num(trade.positionSize);
      const oldTarget = trade.management?.split("\n")[0].match(/TP ([\d.]+)/)?.[1];
      const target = a.target ?? (oldTarget ? Number(oldTarget) : null);
      const hasPlanLine = trade.notes?.startsWith("Logged by the mentor") ?? false;
      const oldExtra = (hasPlanLine ? trade.management?.split("\n").slice(1).join("\n") : trade.management)?.trim() || null;

      const data: Record<string, unknown> = {};
      if (a.setup !== undefined) data.entryModel = a.setup.trim() || null;
      if (a.thesis !== undefined) data.preTradeThesis = a.thesis.trim() || null;
      if (a.review !== undefined) data.review = a.review.trim() || null;
      if (a.entry !== undefined) data.entryPrice = a.entry;
      if (a.stop !== undefined) data.stopLoss = a.stop;
      if (a.exit !== undefined) data.exitPrice = a.exit;
      if (a.contracts !== undefined) data.positionSize = a.contracts;

      if (a.exitTime) {
        const zone = a.timezone === "London" ? "Europe/London" : "America/New_York";
        const entryDate = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(trade.entryTime);
        let exitTime = toUtc(a.exitDate ?? entryDate, a.exitTime, a.timezone);
        if (!a.exitDate && exitTime < trade.entryTime) exitTime = new Date(exitTime.getTime() + 86_400_000);
        data.exitTime = exitTime;
        data.durationMinutes = calculateDurationMinutes(trade.entryTime, exitTime);
      }

      let resultR: number | null = null;
      if (entry != null && stop != null) {
        const levels = { symbol, direction: trade.direction, entry, stop, target, exit, contracts };
        const m = tradeMaths(levels);
        resultR = m.resultR;
        data.management = [planLine(levels), a.management?.trim() ?? oldExtra].filter(Boolean).join("\n");
        data.riskDollars = m.riskDollars;
        if (m.resultR != null) data.rMultiple = Math.abs(m.resultR);
        if (a.pnl === undefined && m.pnl != null && (a.exit !== undefined || a.contracts !== undefined)) data.pnl = m.pnl;
        if (a.outcome === undefined && m.resultR != null && a.exit !== undefined) data.outcome = outcomeFromR(m.resultR);
        if (!hasPlanLine) data.notes = [trade.notes, "Logged by the mentor from a screenshot."].filter(Boolean).join("\n");
      } else if (a.management !== undefined) {
        data.management = a.management.trim() || null;
      }
      if (a.pnl !== undefined) data.pnl = a.pnl;
      if (a.outcome !== undefined) data.outcome = a.outcome;

      const updated = await db.trade.update({ where: { id: a.id }, data });
      refreshJournal();
      return text({
        updated: a.id,
        management: updated.management,
        outcome: updated.outcome,
        resultR,
        pnl: num(updated.pnl),
        edit: editLink(a.id),
      });
    },
  );
}
