import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { deleteChecklist } from "@/app/dashboard/trading/premarket/actions";
import { formatDateOnly } from "@/lib/trading/calc";
import type { PremarketChecklist } from "@/lib/generated/prisma/client";

export function PremarketChecklistCard({ checklist }: { checklist: PremarketChecklist }) {
  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">{formatDateOnly(checklist.date)}</h3>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            {checklist.bias}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={`/dashboard/trading/premarket/${checklist.id}/edit`}
            className="text-neutral-400 hover:text-neutral-50"
          >
            Edit
          </Link>
          <form action={deleteChecklist}>
            <input type="hidden" name="id" value={checklist.id} />
            <button type="submit" className="text-neutral-400 hover:text-red-400">
              Delete
            </button>
          </form>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-300">{checklist.keyLevels}</p>
      {checklist.notes && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-500">{checklist.notes}</p>
      )}
    </Card>
  );
}
