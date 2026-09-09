import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";
import { addKeyword, importTagsFromDrafts } from "./actions";

export const dynamic = "force-dynamic";

export default async function EtsyKeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; niche?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const nicheFilter = params.niche?.trim() ?? "";

  const [keywords, drafts, niches] = await Promise.all([
    db.etsyKeyword.findMany({
      where: {
        ...(q ? { term: { contains: q, mode: "insensitive" } } : {}),
        ...(nicheFilter ? { niche: nicheFilter } : {}),
      },
      orderBy: { term: "asc" },
    }),
    db.etsyListingDraft.findMany({ select: { tags: true } }),
    db.etsyKeyword.findMany({ select: { niche: true }, distinct: ["niche"] }),
  ]);

  const usageByTerm = new Map<string, number>();
  for (const draft of drafts) {
    for (const tag of draft.tags) {
      usageByTerm.set(tag, (usageByTerm.get(tag) ?? 0) + 1);
    }
  }

  const nicheOptions = niches.map((n) => n.niche).filter((n): n is string => Boolean(n));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Keyword Library</h1>
        <p className="mt-1 text-neutral-400">Search-tag research, grouped by niche.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add keyword</h2>
        <form action={addKeyword} className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Term">
              <input type="text" name="term" required className={inputClass} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Niche" hint="Optional">
              <input type="text" name="niche" className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
        </form>
        <form action={importTagsFromDrafts} className="mt-3">
          <button type="submit" className={secondaryButtonClass}>
            Import unique tags from listing drafts
          </button>
        </form>
      </Card>

      <form className="flex flex-wrap items-end gap-4">
        <Field label="Search">
          <input type="text" name="q" defaultValue={q} className={inputClass} />
        </Field>
        <Field label="Niche">
          <select name="niche" defaultValue={nicheFilter} className={inputClass}>
            <option value="">All niches</option>
            {nicheOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={secondaryButtonClass}>
          Filter
        </button>
        {(q || nicheFilter) && (
          <Link href="/dashboard/etsy/keywords" className="text-sm text-neutral-400 hover:text-violet-400">
            Clear filters
          </Link>
        )}
      </form>

      {keywords.length === 0 ? (
        <p className="text-sm text-neutral-500">No keywords yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="px-4 py-2 font-medium">Term</th>
                <th className="px-4 py-2 font-medium">Niche</th>
                <th className="px-4 py-2 font-medium">Used in drafts</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((keyword) => (
                <tr key={keyword.id} className="border-b border-neutral-900 last:border-0">
                  <td className="px-4 py-2 font-medium">{keyword.term}</td>
                  <td className="px-4 py-2 text-neutral-400">{keyword.niche ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">{usageByTerm.get(keyword.term) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
