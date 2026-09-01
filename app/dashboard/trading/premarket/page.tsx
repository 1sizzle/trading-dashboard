import { db } from "@/lib/core/db";
import { PremarketChecklistForm } from "@/components/trading/PremarketChecklistForm";
import { PremarketChecklistCard } from "@/components/trading/PremarketChecklistCard";

export const dynamic = "force-dynamic";

export default async function PremarketPage() {
  const checklists = await db.premarketChecklist.findMany({ orderBy: { date: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pre-Market Checklist</h1>
        <p className="mt-1 text-neutral-400">
          Log your bias and key levels before the session, then compare to what actually happened.
        </p>
      </div>

      <PremarketChecklistForm />

      {checklists.length === 0 ? (
        <p className="text-sm text-neutral-500">No checklists logged yet.</p>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => (
            <PremarketChecklistCard key={checklist.id} checklist={checklist} />
          ))}
        </div>
      )}
    </div>
  );
}
