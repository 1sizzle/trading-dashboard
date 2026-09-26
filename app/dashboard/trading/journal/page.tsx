import Link from "next/link";
import { db } from "@/lib/core/db";
import { JournalStats } from "@/components/trading/JournalStats";
import { JournalTable } from "@/components/trading/JournalTable";
import { MissedSetupForm } from "@/components/trading/MissedSetupForm";
import { MissedSetupTable } from "@/components/trading/MissedSetupTable";
import { computeJournalStats } from "@/lib/trading/journal-stats";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    imported?: string;
    skipped?: string;
    unknownSymbols?: string;
    parseErrors?: string;
    importError?: string;
    importErrorMessage?: string;
    screenshotsSkipped?: string;
  }>;
}) {
  const params = await searchParams;
  const tab: "trades" | "potential" = params.tab === "potential" ? "potential" : "trades";

  const [trades, missedSetups] = await Promise.all([
    tab === "trades"
      ? db.trade.findMany({
          orderBy: { entryTime: "desc" },
          include: { tags: { include: { tag: true } } },
        })
      : Promise.resolve([]),
    tab === "potential" ? db.missedSetup.findMany({ orderBy: { seenAt: "desc" } }) : Promise.resolve([]),
  ]);

  const stats = computeJournalStats(
    trades.map((trade) => ({
      outcome: trade.outcome,
      rMultiple: trade.rMultiple !== null ? Number(trade.rMultiple) : null,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="mt-1 text-neutral-400">Every trade, every confluence, in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/trading/journal/import" className={secondaryButtonClass}>
            Import trades
          </Link>
          <Link href="/dashboard/trading/journal/new" className={primaryButtonClass}>
            + Add Trade
          </Link>
        </div>
      </div>

      {params.imported !== undefined && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
          Imported {params.imported} trade{params.imported === "1" ? "" : "s"}
          {params.skipped && Number(params.skipped) > 0
            ? `, skipped ${params.skipped} already-imported duplicate${params.skipped === "1" ? "" : "s"}`
            : ""}
          .{" "}
          {params.unknownSymbols && (
            <>
              Unrecognized symbol(s) used $1/point: {params.unknownSymbols}. Add them to{" "}
              <code>lib/trading/contracts.ts</code> if correct.{" "}
            </>
          )}
          {params.parseErrors && <>{params.parseErrors} row(s) couldn&apos;t be parsed and were skipped.</>}
        </div>
      )}

      {params.importError === "no_file" && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          Please choose a CSV file to import.
        </div>
      )}

      {params.importError === "bad_format" && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {params.importErrorMessage ?? "Couldn't parse that file."}
        </div>
      )}

      {params.screenshotsSkipped && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-2 text-sm text-amber-300">
          {params.screenshotsSkipped} screenshot{params.screenshotsSkipped === "1" ? "" : "s"}{" "}
          skipped — not an image, or over the 8MB limit.
        </div>
      )}

      <div className="flex gap-2 border-b border-neutral-800">
        <Link
          href="/dashboard/trading/journal"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "trades"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Trades
        </Link>
        <Link
          href="/dashboard/trading/journal?tab=potential"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "potential"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Potential setups
        </Link>
      </div>

      {tab === "trades" && (
        <>
          <JournalStats stats={stats} />
          <JournalTable trades={trades} />
        </>
      )}

      {tab === "potential" && (
        <div className="space-y-4">
          <MissedSetupForm />
          <MissedSetupTable missedSetups={missedSetups} />
        </div>
      )}
    </div>
  );
}
