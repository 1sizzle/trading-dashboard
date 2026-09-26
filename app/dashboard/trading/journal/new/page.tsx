import { TradeForm } from "@/components/trading/TradeForm";
import { getTradeFormOptions } from "@/lib/trading/trade-options";

export const dynamic = "force-dynamic";

export default async function NewTradePage() {
  const options = await getTradeFormOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Trade</h1>
        <p className="mt-1 text-neutral-400">
          Log a trade — pick every confluence that applied, not just one.
        </p>
      </div>
      <TradeForm {...options} />
    </div>
  );
}
