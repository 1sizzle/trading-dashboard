"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/trading/calc";

export interface GalleryScreenshot {
  id: string;
  trade: {
    id: string;
    symbol: string;
    direction: "LONG" | "SHORT";
    pnl: number;
    entryTimeFormatted: string;
    tags: string[];
  };
}

export function ScreenshotGalleryGrid({ screenshots }: { screenshots: GalleryScreenshot[] }) {
  const [selected, setSelected] = useState<GalleryScreenshot | null>(null);

  if (screenshots.length === 0) {
    return <p className="text-sm text-neutral-500">No screenshots match these filters.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {screenshots.map((screenshot) => (
          <button
            key={screenshot.id}
            type="button"
            onClick={() => setSelected(screenshot)}
            className="group relative block overflow-hidden rounded-xl border border-neutral-800 text-left transition hover:border-neutral-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/screenshots/${screenshot.id}`}
              alt=""
              className="aspect-video w-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-50">{screenshot.trade.symbol}</span>
                <span className={screenshot.trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatCurrency(screenshot.trade.pnl)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-full max-w-3xl overflow-auto rounded-xl border border-neutral-800 bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/screenshots/${selected.id}`}
              alt=""
              className="max-h-[70vh] w-full object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">
                  {selected.trade.symbol} ·{" "}
                  {selected.trade.direction === "LONG" ? "Long" : "Short"}{" "}
                  <span className={selected.trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatCurrency(selected.trade.pnl)}
                  </span>
                </p>
                <p className="text-sm text-neutral-400">{selected.trade.entryTimeFormatted}</p>
                {selected.trade.tags.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">{selected.trade.tags.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/trading/journal/${selected.trade.id}/edit`}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                  View trade
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
