import Link from "next/link";
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_BADGE_CLASSES } from "@/lib/etsy/constants";
import type { EtsyProduct } from "@/lib/generated/prisma/client";

export function EtsyProductTable({ products }: { products: EtsyProduct[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-neutral-500">No products yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-2 font-medium">SKU</th>
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Listing</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-neutral-900 last:border-0">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-neutral-300">{product.sku}</td>
              <td className="px-4 py-2 font-medium">{product.title}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${PRODUCT_STATUS_BADGE_CLASSES[product.status]}`}
                >
                  {PRODUCT_STATUS_LABELS[product.status]}
                </span>
              </td>
              <td className="px-4 py-2">
                {product.etsyListingUrl ? (
                  <a
                    href={product.etsyListingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline"
                  >
                    View on Etsy →
                  </a>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                <Link
                  href={`/dashboard/etsy/products/${product.id}/edit`}
                  className="text-neutral-400 hover:text-neutral-50"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
