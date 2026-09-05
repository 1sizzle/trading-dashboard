import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { EditMoneyEntryForm } from "@/components/life/EditMoneyEntryForm";
import { updateIncome } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const income = await db.incomeEntry.findUnique({ where: { id } });
  if (!income) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit income</h1>
      <EditMoneyEntryForm
        kind="income"
        id={income.id}
        amount={Number(income.amount)}
        label={income.source}
        type={income.type}
        note={income.note}
        date={income.date}
        action={updateIncome}
      />
    </div>
  );
}
