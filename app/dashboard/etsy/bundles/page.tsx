import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { createBundle, deleteBundle } from "./actions";

export const dynamic = "force-dynamic";

export default async function EtsyBundlesPage() {
  const [bundles, products] = await Promise.all([
    db.etsyBundle.findMany({
      orderBy: { createdAt: "desc" },
      include: { products: { include: { } } },
    }),
    db.etsyProduct.findMany({ orderBy: { sku: "asc" } }),
  ]);

  // EtsyBundleProduct has no relation back to EtsyProduct in the schema yet
  // (kept minimal in Stage 1 — see plan notes) so titles are joined here.
  const productById = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bundle Builder</h1>
        <p className="mt-1 text-neutral-400">Group compatible products into a saved bundle draft — never published automatically.</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">New bundle</h2>
        {products.length < 2 ? (
          <p className="text-sm text-neutral-500">You need at least 2 products to build a bundle.</p>
        ) : (
          <form action={createBundle} className="space-y-4">
            <Field label="Title">
              <input type="text" name="title" required className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea name="description" rows={3} className={inputClass} />
            </Field>
            <Field label="Suggested price" hint="Optional">
              <input type="number" name="suggestedPrice" step="any" className={inputClass} />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-300">Products</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm text-neutral-300">
                    <input type="checkbox" name="productIds" value={product.id} className="accent-violet-500" />
                    {product.sku} — {product.title}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className={primaryButtonClass}>
                Create bundle
              </button>
            </div>
          </form>
        )}
      </Card>

      {bundles.length === 0 ? (
        <p className="text-sm text-neutral-500">No bundles yet.</p>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle) => (
            <Card key={bundle.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{bundle.title}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{bundle.description}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {bundle.products
                      .map((bp) => productById.get(bp.productId)?.sku)
                      .filter(Boolean)
                      .join(", ")}
                    {bundle.suggestedPrice !== null && ` · Suggested price: ${bundle.suggestedPrice}`}
                  </p>
                </div>
                <form action={deleteBundle}>
                  <input type="hidden" name="id" value={bundle.id} />
                  <button type="submit" className="text-sm text-neutral-500 hover:text-red-400">
                    Delete
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
