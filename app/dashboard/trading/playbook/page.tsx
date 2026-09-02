import { db } from "@/lib/core/db";
import { PlaybookRuleCard } from "@/components/trading/PlaybookRuleCard";
import { TradingRulesNoteCard } from "@/components/trading/TradingRulesNoteCard";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const rules = await db.playbookRule.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  let rulesNote = await db.tradingRulesNote.findFirst();
  if (!rulesNote) {
    rulesNote = await db.tradingRulesNote.create({
      data: {
        content: "Max 2 losses a day of $200 each\nDon't trade on phone\nWait for confirmation",
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Playbook</h1>
          <p className="mt-1 text-neutral-400">
            Your trading rules and setup-quality definitions. Edit freely as your rules evolve.
          </p>
        </div>
        <TradingRulesNoteCard content={rulesNote.content} />
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-neutral-500">No rules written yet.</p>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <PlaybookRuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
