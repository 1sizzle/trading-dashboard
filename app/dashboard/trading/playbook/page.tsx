import { db } from "@/lib/core/db";
import { PlaybookRuleForm } from "@/components/trading/PlaybookRuleForm";
import { PlaybookRuleCard } from "@/components/trading/PlaybookRuleCard";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const rules = await db.playbookRule.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const nextOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.order)) + 1 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Playbook</h1>
        <p className="mt-1 text-neutral-400">
          Your trading rules and setup-quality definitions. Edit freely as your rules evolve.
        </p>
      </div>

      <PlaybookRuleForm nextOrder={nextOrder} />

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
