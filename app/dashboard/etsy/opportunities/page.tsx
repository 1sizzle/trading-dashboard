import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";
import { createOpportunityScan, confirmScanAsProduct } from "./actions";
import type { OpportunityScanResult } from "@/lib/etsy/opportunity-scan";

export const dynamic = "force-dynamic";

export default async function EtsyOpportunitiesPage() {
  const scans = await db.etsyOpportunityScan.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Opportunity Scan</h1>
        <p className="mt-1 text-neutral-400">
          Public-evidence trend research — never a substitute for real Etsy sales or search data.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">New scan</h2>
        <form action={createOpportunityScan} className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="What do you want researched?" hint="A theme, season, or subject to investigate">
              <input type="text" name="topic" required className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={primaryButtonClass}>
            Scan
          </button>
        </form>
      </Card>

      {scans.length === 0 ? (
        <p className="text-sm text-neutral-500">No scans yet.</p>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => {
            const result = scan.resultsJson as unknown as OpportunityScanResult;
            return (
              <Card key={scan.id}>
                <h2 className="font-medium">{scan.topic}</h2>
                <p className="mt-2 text-sm text-neutral-300">{result.summary}</p>
                {result.themes?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.themes.map((theme) => (
                      <span
                        key={theme}
                        className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
                {result.seasonality && <p className="mt-2 text-xs text-neutral-500">Seasonality: {result.seasonality}</p>}
                {result.competitionCaution && (
                  <p className="mt-1 text-xs text-amber-400">Caution: {result.competitionCaution}</p>
                )}
                <p className="mt-1 text-xs text-neutral-600">Confidence: {result.confidence}</p>

                <form action={confirmScanAsProduct} className="mt-3">
                  <input type="hidden" name="topic" value={scan.topic} />
                  <button type="submit" className={secondaryButtonClass}>
                    Turn into a product
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
