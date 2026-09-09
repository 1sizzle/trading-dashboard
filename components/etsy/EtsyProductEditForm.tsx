import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { updateProduct, deleteProduct } from "@/app/dashboard/etsy/products/actions";
import { PRODUCT_STATUS_LABELS } from "@/lib/etsy/constants";
import type { EtsyProduct } from "@/lib/generated/prisma/client";

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUS_LABELS) as [keyof typeof PRODUCT_STATUS_LABELS, string][];

export function EtsyProductEditForm({ product }: { product: EtsyProduct }) {
  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/etsy/upload?product=${product.id}`}
        className="text-sm text-neutral-400 hover:text-violet-400"
      >
        Manage artwork for {product.sku} →
      </Link>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          {product.sku} — {product.title}
        </h2>
        <form action={updateProduct} className="grid grid-cols-2 gap-4">
          <input type="hidden" name="id" value={product.id} />

          <div className="col-span-2">
            <Field label="Title">
              <input type="text" name="title" required defaultValue={product.title} className={inputClass} />
            </Field>
          </div>

          <Field label="Status">
            <select name="status" defaultValue={product.status} className={inputClass}>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="col-span-2">
            <Field
              label="Etsy listing URL"
              hint="Optional — saving a real https://www.etsy.com/listing/... URL marks this Listed automatically and clears the status dropdown's choice"
            >
              <input
                type="url"
                name="etsyListingUrl"
                defaultValue={product.etsyListingUrl ?? ""}
                placeholder="https://www.etsy.com/listing/1234567890/..."
                className={inputClass}
              />
            </Field>
          </div>

          <div className="col-span-2 flex justify-end">
            <button type="submit" className={primaryButtonClass}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-medium text-red-400">Delete product</h3>
        <p className="mb-3 text-sm text-neutral-400">
          Removes this product and its connected listing draft and artwork. This never deletes anything on Etsy
          itself.
        </p>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10">
            Delete {product.sku}
          </button>
        </form>
      </Card>
    </div>
  );
}
