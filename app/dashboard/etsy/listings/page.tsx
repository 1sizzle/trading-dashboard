import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { PRODUCT_STATUS_LABELS, PRODUCT_STATUS_BADGE_CLASSES } from "@/lib/etsy/constants";

export const dynamic = "force-dynamic";

export default async function EtsyListingsPage() {
  const drafts = await db.etsyListingDraft.findMany({
    include: { product: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Listing drafts</h1>
        <p className="mt-1 text-neutral-400">Editable Etsy copy generated for each product.</p>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No listing drafts yet — generate one by selecting a prompt in Prompt Studio, or add one from a
          product&apos;s edit page.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Link key={draft.id} href={`/dashboard/etsy/products/${draft.productId}/edit`}>
              <Card className="transition hover:border-violet-500/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-neutral-400">{draft.product.sku}</span>
                  <h2 className="font-medium">{draft.title}</h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${PRODUCT_STATUS_BADGE_CLASSES[draft.product.status]}`}
                  >
                    {PRODUCT_STATUS_LABELS[draft.product.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">{draft.tags.length} tags</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
