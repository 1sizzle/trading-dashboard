import Link from "next/link";
import { db } from "@/lib/core/db";
import { EtsyProductCreateForm } from "@/components/etsy/EtsyProductCreateForm";
import { EtsyProductTable } from "@/components/etsy/EtsyProductTable";
import { PRODUCT_STATUS_LABELS } from "@/lib/etsy/constants";
import type { EtsyProductStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: (EtsyProductStatus | "ALL")[] = ["ALL", "WORKING", "REVIEW", "READY", "LISTED", "ARCHIVED"];

export default async function EtsyProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = FILTERS.includes(params.status as EtsyProductStatus)
    ? (params.status as EtsyProductStatus | "ALL")
    : "ALL";

  const products = await db.etsyProduct.findMany({
    where: statusFilter === "ALL" ? {} : { status: statusFilter },
    orderBy: { sku: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-1 text-neutral-400">Every wall-art product, from idea through to a live Etsy listing.</p>
      </div>

      <EtsyProductCreateForm />

      <div className="flex flex-wrap gap-2 border-b border-neutral-800">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={filter === "ALL" ? "/dashboard/etsy/products" : `/dashboard/etsy/products?status=${filter}`}
            className={`px-3 py-2 text-sm font-medium ${
              statusFilter === filter
                ? "border-b-2 border-violet-500 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {filter === "ALL" ? "All" : PRODUCT_STATUS_LABELS[filter]}
          </Link>
        ))}
      </div>

      <EtsyProductTable products={products} />
    </div>
  );
}
