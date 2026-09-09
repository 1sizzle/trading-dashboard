import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { EtsyArtworkUploadForm } from "@/components/etsy/EtsyArtworkUploadForm";
import { EtsyArtworkGrid } from "@/components/etsy/EtsyArtworkGrid";

export const dynamic = "force-dynamic";

export default async function EtsyUploadCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;
  const products = await db.etsyProduct.findMany({ orderBy: { sku: "asc" }, include: { prompt: true } });

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Upload Centre</h1>
        <p className="text-sm text-neutral-500">
          No products yet — create one in Products or Prompt Studio first.
        </p>
      </div>
    );
  }

  const currentIndex = params.product ? products.findIndex((p) => p.id === params.product) : 0;
  const product = products[currentIndex >= 0 ? currentIndex : 0];
  const index = currentIndex >= 0 ? currentIndex : 0;

  const assets = await db.etsyArtworkAsset.findMany({
    where: { productId: product.id },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Upload Centre</h1>
          <p className="mt-1 text-neutral-400">
            {product.sku} — {product.title}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {index > 0 ? (
            <Link href={`/dashboard/etsy/upload?product=${products[index - 1].id}`} className="text-violet-400 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-neutral-700">← Previous</span>
          )}
          <span className="text-neutral-500">
            {index + 1} of {products.length}
          </span>
          {index < products.length - 1 ? (
            <Link href={`/dashboard/etsy/upload?product=${products[index + 1].id}`} className="text-violet-400 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-neutral-700">Next →</span>
          )}
        </div>
      </div>

      <form action="/dashboard/etsy/upload" method="get" className="flex items-center gap-2 text-sm">
        <label htmlFor="jump-to-product" className="text-neutral-400">
          Jump to:
        </label>
        <select
          id="jump-to-product"
          name="product"
          defaultValue={product.id}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-50"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.title}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-neutral-800 px-3 py-1 text-neutral-300 hover:bg-neutral-900">
          Go
        </button>
      </form>

      {product.prompt && (
        <Card>
          <h2 className="mb-1 text-sm font-medium text-violet-300">Source prompt</h2>
          <p className="text-sm text-neutral-300">{product.prompt.promptText}</p>
        </Card>
      )}

      <EtsyArtworkUploadForm productId={product.id} />

      {assets.length > 0 && <EtsyArtworkGrid productId={product.id} assets={assets} />}
    </div>
  );
}
