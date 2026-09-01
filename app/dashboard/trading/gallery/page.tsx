import { db } from "@/lib/core/db";
import { Field, inputClass, secondaryButtonClass } from "@/components/ui/Field";
import { ScreenshotGalleryGrid, type GalleryScreenshot } from "@/components/trading/ScreenshotGalleryGrid";
import { formatNewYorkDateTime } from "@/lib/trading/calc";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; outcome?: string; tag?: string }>;
}) {
  const params = await searchParams;

  const filterableTrades = await db.trade.findMany({
    where: { screenshots: { some: {} } },
    select: { symbol: true, tags: { include: { tag: true } } },
  });
  const availableSymbols = Array.from(new Set(filterableTrades.map((t) => t.symbol))).sort();
  const availableTags = Array.from(
    new Set(filterableTrades.flatMap((t) => t.tags.map((tt) => tt.tag.name))),
  ).sort();

  const screenshots = await db.tradeScreenshot.findMany({
    where: {
      trade: {
        ...(params.symbol ? { symbol: params.symbol } : {}),
        ...(params.outcome === "win" ? { pnl: { gt: 0 } } : {}),
        ...(params.outcome === "loss" ? { pnl: { lt: 0 } } : {}),
        ...(params.tag ? { tags: { some: { tag: { name: params.tag } } } } : {}),
      },
    },
    include: { trade: { include: { tags: { include: { tag: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const galleryItems: GalleryScreenshot[] = screenshots.map((screenshot) => ({
    id: screenshot.id,
    trade: {
      id: screenshot.trade.id,
      symbol: screenshot.trade.symbol,
      direction: screenshot.trade.direction,
      pnl: Number(screenshot.trade.pnl),
      entryTimeFormatted: formatNewYorkDateTime(screenshot.trade.entryTime),
      tags: screenshot.trade.tags.map((tt) => tt.tag.name),
    },
  }));

  const hasFilters = Boolean(params.symbol || params.outcome || params.tag);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Screenshot Gallery</h1>
        <p className="mt-1 text-neutral-400">Every chart screenshot you&apos;ve attached to a trade.</p>
      </div>

      <form
        action="/dashboard/trading/gallery"
        method="get"
        className="flex flex-wrap items-end gap-3"
      >
        <Field label="Symbol">
          <select name="symbol" defaultValue={params.symbol ?? ""} className={inputClass}>
            <option value="">All</option>
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Outcome">
          <select name="outcome" defaultValue={params.outcome ?? ""} className={inputClass}>
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
          </select>
        </Field>

        <Field label="Tag">
          <select name="tag" defaultValue={params.tag ?? ""} className={inputClass}>
            <option value="">All</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className={secondaryButtonClass}>
          Filter
        </button>

        {hasFilters && (
          <a
            href="/dashboard/trading/gallery"
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Clear filters
          </a>
        )}
      </form>

      <ScreenshotGalleryGrid screenshots={galleryItems} />
    </div>
  );
}
