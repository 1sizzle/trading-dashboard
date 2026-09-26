import Link from "next/link";
import { db } from "@/lib/core/db";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { getNewYorkDateValue, getTodayNewYorkDateValue } from "@/lib/trading/calc";
import {
  ANALYTICS_RANGES,
  getAnalyticsRangeStart,
  parseAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/trading/analytics-range";
import {
  BIAS_DIRECTIONS,
  BIAS_SESSIONS,
  analyzeCorrelation,
  summarizeSession,
  type BiasRow,
} from "@/lib/trading/market-bias";
import { deleteBiasEntry, saveBiasEntry } from "./actions";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

const RANGE_SUBTITLES: Record<AnalyticsRange, string> = {
  daily: "Every session you've logged today.",
  weekly: "Every session you've logged this week.",
  monthly: "Every session you've logged this month.",
  yearly: "Every session you've logged this year.",
  lifetime: "Every session you've ever logged.",
};

const BIAS_STYLES: Record<string, string> = {
  BULLISH: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  BEARISH: "border-red-500/30 bg-red-500/10 text-red-300",
  NEUTRAL: "border-neutral-600 bg-neutral-800 text-neutral-300",
};

const sessionLabel = (value: string) => BIAS_SESSIONS.find((s) => s.value === value)?.label ?? value;
const biasLabel = (value: string) => BIAS_DIRECTIONS.find((d) => d.value === value)?.label ?? value;
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
const pointsClass = (n: number) => (n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-neutral-300");

const cardClass = "rounded-xl border border-neutral-800 bg-neutral-900/50 p-5";
const labelClass = "text-xs uppercase tracking-wider text-neutral-500";

export default async function MarketBiasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; cs?: string; cd?: string; ct?: string; cr?: string }>;
}) {
  const params = await searchParams;
  const range = parseAnalyticsRange(params.range);
  const start = getAnalyticsRangeStart(range);
  const startDate = start ? new Date(`${getNewYorkDateValue(start)}T00:00:00.000Z`) : null;

  const all = await db.marketBiasEntry.findMany({ orderBy: [{ date: "desc" }, { session: "asc" }] });
  const toRow = (e: (typeof all)[number]): BiasRow & { id: string; note: string | null } => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    session: e.session,
    bias: e.bias,
    points: Number(e.points),
    note: e.note,
  });
  const allRows = all.map(toRow);
  const rows = startDate ? all.filter((e) => e.date >= startDate).map(toRow) : allRows;

  // Correlation analyzer — always uses the full history, regardless of the period filter.
  const trigger = BIAS_SESSIONS.find((s) => s.value === params.cs)?.value ?? "LONDON";
  const reaction = BIAS_SESSIONS.find((s) => s.value === params.cr)?.value ?? "NEW_YORK";
  const direction = params.cd === "pump" ? "pump" : "dump";
  const threshold = Math.abs(Number(params.ct)) || 50;
  const corr = analyzeCorrelation(allRows, trigger, direction, threshold, reaction);
  const verb = direction === "pump" ? "pumped" : "dumped";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Market Bias</h1>
          <p className="mt-1 text-neutral-400">{RANGE_SUBTITLES[range]}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900/50 p-1">
          {ANALYTICS_RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard/trading/market-bias?range=${r}`}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                r === range ? "bg-violet-600 text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      <form action={saveBiasEntry} className={`${cardClass} space-y-4`}>
        <div>
          <h2 className={labelClass}>Log a session</h2>
          <p className="mt-2 text-xs text-neutral-500">
            One entry per day per session — re-entering the same date and session just updates it, so it&apos;s safe to fix a
            mistake by logging it again.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Date">
            <input type="date" name="date" required defaultValue={getTodayNewYorkDateValue()} className={inputClass} />
          </Field>
          <Field label="Session">
            <select name="session" className={inputClass}>
              {BIAS_SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bias">
            <select name="bias" className={inputClass}>
              {BIAS_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Points moved">
            <input type="number" name="points" step="any" placeholder="e.g. 85 or -40" className={inputClass} />
          </Field>
          <Field label="Note (optional)">
            <input type="text" name="note" placeholder="e.g. FOMC, NFP, range day" className={inputClass} />
          </Field>
        </div>
        <div className="space-y-2">
          <button type="submit" className={primaryButtonClass}>
            Save entry
          </button>
          <p className="text-xs text-neutral-500">Points moved: positive for a push up that session, negative for a dump down.</p>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {BIAS_SESSIONS.map((s) => {
          const sum = summarizeSession(rows, s.value);
          return (
            <div key={s.value} className={cardClass}>
              <h2 className={labelClass}>{s.label}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full border px-2 py-0.5 ${BIAS_STYLES.BULLISH}`}>{sum.bullish} Bullish</span>
                <span className={`rounded-full border px-2 py-0.5 ${BIAS_STYLES.BEARISH}`}>{sum.bearish} Bearish</span>
                <span className={`rounded-full border px-2 py-0.5 ${BIAS_STYLES.NEUTRAL}`}>{sum.neutral} Neutral</span>
              </div>
              <p className={`mt-5 ${labelClass}`}>Net points</p>
              <p
                className={`mt-1 font-mono text-2xl font-semibold ${
                  sum.netPoints === 0 ? "text-neutral-50" : pointsClass(sum.netPoints)
                }`}
              >
                {sum.netPoints.toFixed(2)}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {sum.days} day{sum.days === 1 ? "" : "s"} logged
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/30">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Bias</th>
              <th className="px-4 py-3 text-right font-medium">Points</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No sessions logged yet for this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-900 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-300">{r.date}</td>
                  <td className="px-4 py-2.5 text-neutral-300">{sessionLabel(r.session)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${BIAS_STYLES[r.bias]}`}>{biasLabel(r.bias)}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${pointsClass(r.points)}`}>{signed(r.points)}</td>
                  <td className="px-4 py-2.5 text-neutral-400">{r.note ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <form action={deleteBiasEntry}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-neutral-400 hover:text-red-400">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form method="get" className={`${cardClass} space-y-4`}>
        <input type="hidden" name="range" value={range} />
        <div>
          <h2 className={labelClass}>Session correlation</h2>
          <p className="mt-2 text-xs text-neutral-500">
            How often does one session reverse after another makes a big move — e.g. &quot;after London dumps 50+ points, how
            often does New York come back bullish?&quot; Uses your full logged history regardless of the period filter above,
            since this needs as many days as possible to mean anything.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="When this session">
            <select name="cs" defaultValue={trigger} className={inputClass}>
              {BIAS_SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="moves this way">
            <select name="cd" defaultValue={direction} className={inputClass}>
              <option value="pump">Pumped (bullish)</option>
              <option value="dump">Dumped (bearish)</option>
            </select>
          </Field>
          <Field label="by at least this many points">
            <input type="number" name="ct" min="0" step="any" defaultValue={threshold} className={inputClass} />
          </Field>
          <Field label="how does this session react?">
            <select name="cr" defaultValue={reaction} className={inputClass}>
              {BIAS_SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button type="submit" className={primaryButtonClass}>
              Analyze
            </button>
          </div>
        </div>

        {trigger === reaction ? (
          <p className="text-xs text-neutral-500">Pick two different sessions to compare.</p>
        ) : corr.matchingDays === 0 ? (
          <p className="text-xs text-neutral-500">
            No {sessionLabel(trigger)} days in your log {verb} {threshold}+ points yet — log more history or lower the threshold.
          </p>
        ) : corr.withReaction === 0 ? (
          <p className="text-xs text-neutral-500">
            {sessionLabel(trigger)} {verb} {threshold}+ points on {corr.matchingDays} day{corr.matchingDays === 1 ? "" : "s"}, but{" "}
            {sessionLabel(reaction)} wasn&apos;t logged on any of them.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-neutral-300">
              {sessionLabel(trigger)} {verb} {threshold}+ points on {corr.matchingDays} day{corr.matchingDays === 1 ? "" : "s"};{" "}
              {sessionLabel(reaction)} was logged on {corr.withReaction} of them:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {(
                [
                  ["BULLISH", corr.bullish],
                  ["BEARISH", corr.bearish],
                  ["NEUTRAL", corr.neutral],
                ] as const
              ).map(([bias, count]) => (
                <span key={bias} className={`rounded-full border px-2 py-0.5 ${BIAS_STYLES[bias]}`}>
                  {biasLabel(bias)} {count} ({Math.round((count / corr.withReaction) * 100)}%)
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Average {sessionLabel(reaction)} move on those days:{" "}
              <span className={`font-mono ${pointsClass(corr.avgPoints)}`}>{signed(corr.avgPoints)} pts</span>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
