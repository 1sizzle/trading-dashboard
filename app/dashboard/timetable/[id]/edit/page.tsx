import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { BlockForm } from "@/components/timetable/BlockForm";
import { utcMidnightToDateInputValue } from "@/lib/finances/dates";
import { describeDays, formatDate, parseColor } from "@/lib/timetable/constants";
import { deleteBlock, updateBlock } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = await db.timetableBlock.findUnique({ where: { id } });
  if (!block) notFound();
  const date = block.date ? utcMidnightToDateInputValue(block.date) : null;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit block</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {block.startTime}–{block.endTime} ·{" "}
          {date
            ? formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : describeDays(block.days)}
        </p>
      </div>
      <Card>
        <BlockForm
          action={updateBlock}
          initial={{
            id: block.id,
            title: block.title,
            startTime: block.startTime,
            endTime: block.endTime,
            days: block.days,
            date,
            color: parseColor(block.color),
            note: block.note,
          }}
          submitLabel="Save"
          cancelHref="/dashboard/timetable"
        />
      </Card>
      <form action={deleteBlock}>
        <input type="hidden" name="id" value={block.id} />
        <button type="submit" className="text-sm text-neutral-400 hover:text-red-400">
          Delete this block
        </button>
      </form>
    </div>
  );
}
