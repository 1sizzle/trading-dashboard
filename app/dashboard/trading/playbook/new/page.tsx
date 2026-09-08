import { db } from "@/lib/core/db";
import { PlaybookRuleForm } from "@/components/trading/PlaybookRuleForm";

export const dynamic = "force-dynamic";

export default async function NewRulePage() {
  const lastRule = await db.playbookRule.findFirst({ orderBy: { order: "desc" } });
  const nextOrder = (lastRule?.order ?? -1) + 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add a rule</h1>
      <PlaybookRuleForm nextOrder={nextOrder} />
    </div>
  );
}
