import { db } from "@/lib/core/db";

// Previously used values that feed the Add/Edit trade chip pickers. Pairs are
// deliberately not listed — the Pair picker starts empty and you add your own.
export async function getTradeFormOptions() {
  const [models, tags] = await Promise.all([
    db.trade.findMany({
      where: { entryModel: { not: null } },
      distinct: ["entryModel"],
      select: { entryModel: true },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    entryModelOptions: models.map((m) => m.entryModel!).sort(),
    setupOptions: tags.map((t) => t.name),
  };
}
