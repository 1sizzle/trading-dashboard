import { db } from "@/lib/core/db";
import { ACTIVE_STATUSES } from "@/lib/trading/accounts";

// Previously used values that feed the Add/Edit trade chip pickers. Pairs are
// deliberately not listed — the Pair picker starts empty and you add your own.
export async function getTradeFormOptions() {
  const [models, tags, accounts] = await Promise.all([
    db.trade.findMany({
      where: { entryModel: { not: null } },
      distinct: ["entryModel"],
      select: { entryModel: true },
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
    entryModelOptions: models.map((m) => m.entryModel!).sort(),
    setupOptions: tags.map((t) => t.name),
    accountOptions: accounts,
  };
}
