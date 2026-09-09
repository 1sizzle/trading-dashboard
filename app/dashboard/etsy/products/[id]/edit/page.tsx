import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { EtsyProductEditForm } from "@/components/etsy/EtsyProductEditForm";
import { EtsyListingDraftForm } from "@/components/etsy/EtsyListingDraftForm";

export const dynamic = "force-dynamic";

export default async function EditEtsyProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.etsyProduct.findUnique({ where: { id }, include: { listingDraft: true } });

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit product</h1>
      <EtsyProductEditForm product={product} />
      <EtsyListingDraftForm productId={product.id} draft={product.listingDraft} />
    </div>
  );
}
