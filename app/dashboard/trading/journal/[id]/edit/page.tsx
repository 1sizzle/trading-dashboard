import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { TradeForm } from "@/components/trading/TradeForm";
import { getTradeFormOptions } from "@/lib/trading/trade-options";

export const dynamic = "force-dynamic";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trade, options] = await Promise.all([
    db.trade.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, psychology: true, screenshots: true },
    }),
    getTradeFormOptions(),
  ]);

  if (!trade) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit trade</h1>
      <TradeForm trade={trade} {...options} />
    </div>
  );
}
