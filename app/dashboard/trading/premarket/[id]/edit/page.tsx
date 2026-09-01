import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { PremarketChecklistForm } from "@/components/trading/PremarketChecklistForm";

export const dynamic = "force-dynamic";

export default async function EditChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checklist = await db.premarketChecklist.findUnique({ where: { id } });

  if (!checklist) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit checklist</h1>
      <PremarketChecklistForm checklist={checklist} />
    </div>
  );
}
