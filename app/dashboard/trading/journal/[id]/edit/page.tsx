import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { FuturesMetalsTradeForm } from "@/components/trading/FuturesMetalsTradeForm";
import { CryptoTradeForm } from "@/components/trading/CryptoTradeForm";

export const dynamic = "force-dynamic";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trade, tags] = await Promise.all([
    db.trade.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, psychology: true, screenshots: true },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!trade) {
    notFound();
  }

  const tagSuggestions = tags.map((tag) => tag.name);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit trade</h1>
      {trade.assetClass === "CRYPTO" ? (
        <CryptoTradeForm trade={trade} tagSuggestions={tagSuggestions} />
      ) : (
        <FuturesMetalsTradeForm trade={trade} tagSuggestions={tagSuggestions} />
      )}
    </div>
  );
}
