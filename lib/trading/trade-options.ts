import { db } from "@/lib/core/db";
import { ACTIVE_STATUSES } from "@/lib/trading/accounts";

// Previously used values that feed the Add/Edit trade chip pickers. Only pairs
// you've actually traded appear (no seeded examples), so a new pair saved on a
// trade is offered again next time.
export async function getTradeFormOptions() {
  const [models, pairs, tags, accounts] = await Promise.all([
    db.trade.findMany({
      where: { entryModel: { not: null } },
      distinct: ["entryModel"],
      select: { entryModel: true },
    }),
    db.trade.findMany({
      where: { symbol: { not: null } },
      distinct: ["symbol"],
      select: { symbol: true },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
    // Only accounts still being traded — a failed/closed one isn't a sensible
    // choice for a *new* trade (the edit page adds the trade's own account
    // back in separately, so editing an old trade never loses its selection).
    db.tradingAccount.findMany({
      where: { status: { in: ACTIVE_STATUSES as ("EVALUATION" | "FUNDED")[] } },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return {
    pairOptions: pairs.map((p) => p.symbol!).sort(),
    entryModelOptions: models.map((m) => m.entryModel!).sort(),
    setupOptions: tags.map((t) => t.name),
    accountOptions: accounts,
  };
}
