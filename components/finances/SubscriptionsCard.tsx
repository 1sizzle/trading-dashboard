import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SubscriptionForm } from "@/components/finances/SubscriptionForm";
import { formatCurrency, formatDateOnly } from "@/lib/finances/format";
import { monthlyEquivalent, sumMonthlyEquivalent } from "@/lib/finances/subscriptions";

export type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  cycle: "MONTHLY" | "YEARLY";
  type: "PERSONAL" | "BUSINESS";
  category: string | null;
  nextBillingDate: Date | null;
  note: string | null;
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

export function SubscriptionsCard({
  subscriptions,
  personalCategories,
  businessCategories,
  addSubscription,
  deleteSubscription,
}: {
  subscriptions: SubscriptionRow[];
  personalCategories: string[];
  businessCategories: string[];
  addSubscription: (formData: FormData) => Promise<void>;
  deleteSubscription: (formData: FormData) => Promise<void>;
}) {
  const totalMonthly = sumMonthlyEquivalent(subscriptions);

  const sorted = [...subscriptions].sort((a, b) => {
    if (a.nextBillingDate && b.nextBillingDate) {
      return a.nextBillingDate.getTime() - b.nextBillingDate.getTime();
    }
    if (a.nextBillingDate) return -1;
    if (b.nextBillingDate) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Subscriptions &amp; recurring payments</h2>
        <p className="text-sm text-neutral-400">
          <span className="font-mono text-neutral-50">{formatCurrency(totalMonthly)}</span> / month across{" "}
          {subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </p>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        On its next billing date, each of these automatically posts as a real expense below — appears in Recent
        entries, counts toward the totals and charts above — then the date rolls forward a cycle on its own.
      </p>

      <SubscriptionForm
        personalCategories={personalCategories}
        businessCategories={businessCategories}
        action={addSubscription}
      />

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No subscriptions logged yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Per month</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Next billing</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub) => (
                <tr key={sub.id} className="border-b border-neutral-900 last:border-0">
                  <td className="px-4 py-2 font-medium text-neutral-100">{sub.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{sub.category ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-300">
                    {formatCurrency(sub.amount)} {sub.cycle === "YEARLY" ? "/yr" : "/mo"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-red-400">
                    {formatCurrency(monthlyEquivalent(sub))}
                  </td>
                  <td className="px-4 py-2">
                    <TypePill type={sub.type} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-400">
                    {sub.nextBillingDate ? formatDateOnly(sub.nextBillingDate) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/finances/subscriptions/${sub.id}/edit`}
                        className="text-neutral-400 hover:text-neutral-50"
                      >
                        Edit
                      </Link>
                      <form action={deleteSubscription}>
                        <input type="hidden" name="id" value={sub.id} />
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
      )}
    </Card>
  );
}
