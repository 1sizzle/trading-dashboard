import { Card } from "@/components/ui/Card";
import { importBitunixCsv } from "@/app/dashboard/trading/journal/actions";

export function BitunixImportForm() {
  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold">Import from Bitunix</h2>
      <p className="mb-3 text-sm text-neutral-400">
        Upload a Bitunix trade/position history CSV export. Trades already imported are
        skipped automatically, so it&apos;s safe to re-upload an overlapping date range.
        This importer hasn&apos;t been verified against a real Bitunix export yet — if it
        rejects your file with a &ldquo;doesn&apos;t look like a Bitunix export&rdquo;
        error, let me know what columns your file has so it can be fixed.
      </p>
      <form action={importBitunixCsv} className="flex items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-50 hover:file:bg-neutral-700"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-50 transition hover:bg-neutral-700"
        >
          Import
        </button>
      </form>
    </Card>
  );
}
