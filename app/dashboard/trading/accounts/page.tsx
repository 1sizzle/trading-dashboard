import { db } from "@/lib/core/db";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/trading/calc";
import { computeJournalStats } from "@/lib/trading/journal-stats";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES, ACTIVE_STATUSES } from "@/lib/trading/accounts";
import { addAccounts, deleteAccount, updateAccount } from "./actions";

export const dynamic = "force-dynamic";

const cardClass = "rounded-xl border border-neutral-800 bg-neutral-900/50";
const labelClass = "text-xs uppercase tracking-wider text-neutral-500";

const typeLabel = (v: string) => ACCOUNT_TYPES.find((t) => t.value === v)?.label ?? v;

export default async function AccountsPage() {
  const [accounts, groups, trades] = await Promise.all([
    db.tradingAccount.findMany({ include: { group: true }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] }),
    db.tradingAccountGroup.findMany({ orderBy: { name: "asc" } }),
    db.trade.findMany({ select: { outcome: true, rMultiple: true } }),
  ]);

  const active = accounts.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const inactive = accounts.filter((a) => !ACTIVE_STATUSES.includes(a.status));
  const totalBalance = active.reduce((sum, a) => sum + Number(a.currentBalance), 0);
  const inEvaluation = active.filter((a) => a.status === "EVALUATION").length;
  const netR = computeJournalStats(
    trades.map((t) => ({ outcome: t.outcome, rMultiple: t.rMultiple !== null ? Number(t.rMultiple) : null })),
  ).netR;

  const renderRows = (list: typeof accounts) =>
    list.map((a) => {
      const balance = Number(a.currentBalance);
      const change = balance - Number(a.startingBalance);
      const formId = `account-${a.id}`;
      return (
        <tr key={a.id} className="border-b border-neutral-900 last:border-0">
          <td className="px-4 py-2.5 font-medium">{a.name}</td>
          <td className="px-4 py-2.5 text-neutral-300">{typeLabel(a.type)}</td>
          <td className="px-4 py-2.5 text-neutral-300">{a.firm ?? "—"}</td>
          <td className="px-4 py-2.5 text-neutral-300">{a.group?.name ?? "—"}</td>
          <td className="px-4 py-2.5 font-mono text-neutral-300">{formatCurrency(Number(a.accountSize))}</td>
          <td className="px-4 py-2.5">
            <input
              form={formId}
              type="number"
              name="currentBalance"
              step="any"
              required
              defaultValue={balance}
              className={`${inputClass} w-32 font-mono`}
            />
          </td>
          <td
            className={`px-4 py-2.5 font-mono ${
              change === 0 ? "text-neutral-500" : change > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {change === 0 ? "—" : formatCurrency(change)}
          </td>
          <td className="px-4 py-2.5">
            <select form={formId} name="status" defaultValue={a.status} className={`${inputClass} w-44`}>
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <form id={formId} action={updateAccount}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-violet-400 hover:text-violet-300">
                  Save
                </button>
              </form>
              <form action={deleteAccount}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-neutral-400 hover:text-red-400">
                  Delete
                </button>
              </form>
            </div>
          </td>
        </tr>
      );
    });

  const table = (list: typeof accounts) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
            {["Account", "Type", "Firm", "Group", "Size", "Current balance", "P&L", "Status", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderRows(list)}</tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="mt-1 text-neutral-400">Every account you&apos;re trading, in one place.</p>
        </div>
        <a href="#add-account" className={primaryButtonClass}>
          + Add Account
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={`${cardClass} p-4`}>
          <p className={labelClass}>Total current balance</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{formatCurrency(totalBalance)}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className={labelClass}>Net R (all accounts)</p>
          <p className={`mt-2 font-mono text-2xl font-semibold ${netR < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {netR > 0 ? "+" : ""}
            {netR.toFixed(1)}R
          </p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className={labelClass}>Accounts in evaluation</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{inEvaluation}</p>
        </div>
      </div>

      <div className={active.length === 0 ? `${cardClass} p-6` : `${cardClass} overflow-hidden`}>
        {active.length === 0 ? <p className="text-sm text-neutral-500">No active accounts yet.</p> : table(active)}
      </div>

      {inactive.length > 0 && (
        <div className="space-y-2">
          <h2 className={labelClass}>Failed &amp; closed</h2>
          <div className={`${cardClass} overflow-hidden`}>{table(inactive)}</div>
        </div>
      )}

      <form id="add-account" action={addAccounts} className={`${cardClass} scroll-mt-6 space-y-4 p-6`}>
        <h2 className={labelClass}>Add account</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Account name">
            <input name="name" required placeholder="e.g. Bulenox 50k" className={inputClass} />
          </Field>
          <Field label="Type">
            <select name="type" className={inputClass}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" className={inputClass}>
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Firm (optional)">
            <input name="firm" placeholder="e.g. Bulenox" className={inputClass} />
          </Field>
          <Field label="Group (optional)">
            <select name="groupId" className={inputClass}>
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account size ($)">
            <input type="number" name="accountSize" step="any" min="0" required placeholder="50000" className={inputClass} />
          </Field>
          <Field label="Starting balance ($, if different)">
            <input type="number" name="startingBalance" step="any" placeholder="defaults to account size" className={inputClass} />
          </Field>
          <Field
            label="How many? (optional)"
            hint={`More than 1 creates that many accounts in one go — all the same type/firm/size/status/group — numbered "#1", "#2", etc. after the name (e.g. 20× "Apex 50k" → "Apex 50k #1" … "Apex 50k #20").`}
          >
            <input type="number" name="count" min="1" max="50" defaultValue={1} className={inputClass} />
          </Field>
          <Field label="New group (optional)" hint="Type a name to create a group and put these accounts in it.">
            <input name="newGroup" placeholder="e.g. Apex batch" className={inputClass} />
          </Field>
        </div>
        <button type="submit" className={primaryButtonClass}>
          + Add Account(s)
        </button>
      </form>
    </div>
  );
}

