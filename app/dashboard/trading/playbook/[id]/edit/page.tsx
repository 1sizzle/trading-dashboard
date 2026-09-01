import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { PlaybookRuleForm } from "@/components/trading/PlaybookRuleForm";

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rule = await db.playbookRule.findUnique({ where: { id } });

  if (!rule) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit rule</h1>
      <PlaybookRuleForm rule={rule} />
    </div>
  );
}
