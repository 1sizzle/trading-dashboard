import Link from "next/link";
import { deleteExpense, deleteIncome } from "@/app/dashboard/life/actions";
import { formatCurrency, formatDateOnly } from "@/lib/life/format";

export type MoneyEntryRow = {
  id: string;
  kind: "expense" | "income";
  amount: number;
  label: string;
  type: "PERSONAL" | "BUSINESS";
  note: string | null;
  date: Date;
};

function TypePill({ type }: { type: "PERSONAL" | "BUSINESS" }) {
  const isBusiness = type === "BUSINESS";
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${
        isBusiness
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          : "border-violet-500/30 bg-violet-500/10 text-violet-300"
      }`}
    >
      {isBusiness ? "Business" : "Personal"}
    </span>
  );
}

export function MoneyEntryTable({ entries }: { entries: MoneyEntryRow[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">No entries logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Category / Source</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Note</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={`${entry.kind}-${entry.id}`} className="border-b border-neutral-900 last:border-0">
              <td className="whitespace-nowrap px-4 py-2 text-neutral-300">
                {formatDateOnly(entry.date)}
              </td>
              <td
                className={`px-4 py-2 font-medium ${
                  entry.kind === "income" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {entry.kind === "income" ? "+" : "-"}
                {formatCurrency(entry.amount)}
              </td>
              <td className="px-4 py-2">{entry.label}</td>
              <td className="px-4 py-2">
                <TypePill type={entry.type} />
              </td>
              <td className="max-w-[16rem] truncate px-4 py-2 text-neutral-400">
                {entry.note ?? "—"}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/life/${entry.kind === "expense" ? "expenses" : "income"}/${entry.id}/edit`}
                    className="text-neutral-400 hover:text-neutral-50"
                  >
                    Edit
                  </Link>
                  <form action={entry.kind === "expense" ? deleteExpense : deleteIncome}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="text-neutral-400 hover:text-red-400">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
