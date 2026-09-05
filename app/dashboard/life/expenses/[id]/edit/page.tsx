import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { EditMoneyEntryForm } from "@/components/life/EditMoneyEntryForm";
import { updateExpense } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit expense</h1>
      <EditMoneyEntryForm
        kind="expense"
        id={expense.id}
        amount={Number(expense.amount)}
        label={expense.category}
        type={expense.type}
        note={expense.note}
        date={expense.date}
        action={updateExpense}
      />
    </div>
  );
}
