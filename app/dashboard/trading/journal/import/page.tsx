import Link from "next/link";
import { CsvImportForm } from "@/components/trading/CsvImportForm";
import { BitunixImportForm } from "@/components/trading/BitunixImportForm";

export const dynamic = "force-dynamic";

export default function ImportTradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/trading/journal" className="text-sm text-neutral-400 hover:text-violet-400">
          ← Back to journal
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Import trades</h1>
      </div>
      <CsvImportForm />
      <BitunixImportForm />
    </div>
  );
}
