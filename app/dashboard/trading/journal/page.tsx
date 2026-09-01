import Link from "next/link";
import { db } from "@/lib/core/db";
import { FuturesMetalsTradeForm } from "@/components/trading/FuturesMetalsTradeForm";
import { CryptoTradeForm } from "@/components/trading/CryptoTradeForm";
import { CsvImportForm } from "@/components/trading/CsvImportForm";
import { TradeTable } from "@/components/trading/TradeTable";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    warning?: string;
    symbol?: string;
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
  const tab: "futures" | "crypto" = params.tab === "crypto" ? "crypto" : "futures";

  const [trades, tags] = await Promise.all([
    db.trade.findMany({
      where: { assetClass: tab === "crypto" ? "CRYPTO" : "FUTURES_METALS" },
      orderBy: { entryTime: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  const tagSuggestions = tags.map((tag) => tag.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trading Journal</h1>
        <p className="mt-1 text-neutral-400">Log trades and review your history.</p>
      </div>

      {params.warning === "unknown_symbol" && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-2 text-sm text-amber-300">
          Unrecognized symbol &ldquo;{params.symbol}&rdquo; — used $1/point since it isn&apos;t in the
          point-value table. Add it to <code>lib/trading/contracts.ts</code> if you&apos;ll trade it
          again.
        </div>
      )}

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
          href="/dashboard/trading/journal?tab=futures"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "futures"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Futures & Metals
        </Link>
        <Link
          href="/dashboard/trading/journal?tab=crypto"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "crypto"
              ? "border-b-2 border-violet-500 text-neutral-50"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Crypto
        </Link>
      </div>

      {tab === "futures" ? (
        <>
          <FuturesMetalsTradeForm tagSuggestions={tagSuggestions} />
          <CsvImportForm />
        </>
      ) : (
        <CryptoTradeForm tagSuggestions={tagSuggestions} />
      )}

      <TradeTable trades={trades} tab={tab} />
    </div>
  );
}
