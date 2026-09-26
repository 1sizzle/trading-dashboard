import Link from "next/link";
import { db } from "@/lib/core/db";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { PrintButton } from "@/components/trading/PrintButton";
import { getTodayNewYorkDateValue } from "@/lib/trading/calc";
import {
  UK_TAX,
  formatGbp,
  summarizeTax,
  taxYearLabel,
  taxYearRange,
  taxYearStartYear,
} from "@/lib/tax/uk";
import {
  deleteExpense,
  deleteIncome,
  deletePayout,
  deleteReceipt,
  logExpense,
  logIncome,
  logPayout,
  saveTaxSettings,
  uploadReceipt,
} from "./actions";

export const dynamic = "force-dynamic";

const INCOME_CATEGORIES = ["Affiliate", "Coaching", "Other"];
const EXPENSE_CATEGORIES = [
  "Prop-firm evaluation",
  "Account reset",
  "Software & subscriptions",
  "Data feeds",
  "Education",
  "Equipment",
  "Other",
];

const cardClass = "rounded-xl border border-neutral-800 bg-neutral-900/50";
const labelClass = "text-xs uppercase tracking-wider text-neutral-500";
const deleteClass = "text-neutral-500 hover:text-red-400 print:hidden";

const dateText = (d: Date) => d.toISOString().slice(0, 10);

function StatCard({ label, value, className = "text-neutral-50" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className={labelClass}>{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}

function CategorySelect({ options }: { options: string[] }) {
  return (
    <select name="category" required defaultValue="" className={inputClass}>
      <option value="" disabled>
        Select…
      </option>
      {options.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export default async function BudgetingTaxPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const today = getTodayNewYorkDateValue();
  const currentYear = taxYearStartYear(new Date(`${today}T00:00:00.000Z`));
  const year = /^\d{4}$/.test(params.year ?? "") ? Number(params.year) : currentYear;
  const { start, end } = taxYearRange(year);
  const inYear = { date: { gte: start, lt: end } };

  const [settings, accounts, payouts, income, expenses, receipts, allDates] = await Promise.all([
    db.taxSettings.findFirst(),
    db.tradingAccount.findMany({ orderBy: [{ createdAt: "asc" }, { name: "asc" }] }),
    db.taxPayout.findMany({ where: inYear, orderBy: { date: "desc" } }),
    db.taxIncomeEntry.findMany({ where: inYear, orderBy: { date: "desc" } }),
    db.taxExpenseEntry.findMany({ where: inYear, orderBy: { date: "desc" } }),
    db.taxReceipt.findMany({ where: inYear, orderBy: { date: "desc" } }),
    Promise.all([
      db.taxPayout.findMany({ select: { date: true } }),
      db.taxIncomeEntry.findMany({ select: { date: true } }),
      db.taxExpenseEntry.findMany({ select: { date: true } }),
    ]),
  ]);

  const overridePct = settings?.overrideRatePct != null ? Number(settings.overrideRatePct) : null;
  const payoutsGross = payouts.reduce((s, p) => s + Number(p.grossAmount), 0);
  const setAside = payouts.reduce((s, p) => s + (Number(p.grossAmount) * Number(p.setAsidePct)) / 100, 0);
  const summary = summarizeTax({
    payoutsGross,
    otherIncome: income.reduce((s, i) => s + Number(i.amount), 0),
    expenses: expenses.reduce((s, e) => s + Number(e.amount), 0),
    setAside,
    overridePct,
  });

  const years = new Set<number>([currentYear, year]);
  for (const rows of allDates) for (const r of rows) years.add(taxYearStartYear(r.date));
  const yearList = [...years].sort((a, b) => b - a);

  const progress = summary.taxOwed > 0 ? Math.min(100, (summary.setAside / summary.taxOwed) * 100) : summary.setAside > 0 ? 100 : 0;
  const yearHidden = <input type="hidden" name="year" value={year} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Budgeting &amp; Tax</h1>
        <p className="mt-1 text-neutral-400">Every payout gets a set-aside recommendation the moment it lands.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total income YTD" value={formatGbp(summary.income)} className="text-emerald-400" />
        <StatCard label="Est. tax owed YTD" value={formatGbp(summary.taxOwed)} />
        <StatCard label="Set aside so far" value={formatGbp(summary.setAside)} />
        <StatCard
          label="Shortfall"
          value={formatGbp(summary.shortfall)}
          className={summary.shortfall > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <StatCard label="Blended rate" value={summary.blendedRate === null ? "—" : `${summary.blendedRate.toFixed(1)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <form action={saveTaxSettings} className={`${cardClass} space-y-4 p-5 lg:col-span-1`}>
          {yearHidden}
          <h2 className={labelClass}>Tax settings</h2>
          <p className="text-sm text-neutral-300">United Kingdom · tax year {taxYearLabel(year)}</p>
          <Field label="Override rate (%) — optional">
            <input
              type="number"
              name="overrideRate"
              step="any"
              min="0"
              max="100"
              defaultValue={overridePct ?? ""}
              placeholder="auto"
              className={inputClass}
            />
          </Field>
          <button type="submit" className={`${primaryButtonClass} w-full`}>
            Save settings
          </button>
          <p className="text-xs text-neutral-500">
            Log a payout to see your tax auto-calculate: income tax bands (personal allowance{" "}
            {formatGbp(UK_TAX.personalAllowance)}, 20% / 40% / 45%) plus Class 4 National Insurance (6% / 2%) on your profit.
          </p>
          <p className="border-t border-neutral-800 pt-3 text-xs text-neutral-500">
            Estimate only, not tax advice — the calculation is simplified (it ignores the £1,000 trading allowance, losses
            carried forward and other reliefs) and any override rate is your own placeholder. Confirm with a qualified
            accountant before relying on these numbers.
          </p>
        </form>

        <div className="space-y-6 lg:col-span-3">
          <div className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <h2 className={labelClass}>Set-aside progress</h2>
              <p className="font-mono text-xs text-neutral-400">
                {formatGbp(summary.setAside)} / {formatGbp(summary.taxOwed)} owed
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className={payouts.length === 0 ? `${cardClass} p-5` : `${cardClass} overflow-x-auto`}>
            {payouts.length === 0 ? (
              <p className="text-sm text-neutral-500">No payouts logged yet.</p>
            ) : (
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 text-right font-medium">Gross</th>
                    <th className="px-4 py-3 text-right font-medium">Set aside</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-neutral-900 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-neutral-300">{dateText(p.date)}</td>
                      <td className="px-4 py-2.5 text-neutral-300">{p.accountName}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{formatGbp(Number(p.grossAmount))}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-neutral-300">{Number(p.setAsidePct).toFixed(2)}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-neutral-300">
                        {formatGbp((Number(p.grossAmount) * Number(p.setAsidePct)) / 100)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={deletePayout}>
                          <input type="hidden" name="id" value={p.id} />
                          {yearHidden}
                          <button type="submit" className={deleteClass}>
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form action={logPayout} className={`${cardClass} space-y-4 p-5`}>
            {yearHidden}
            <h2 className={labelClass}>Log a payout</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Date">
                <input type="date" name="date" required defaultValue={today} className={inputClass} />
              </Field>
              <Field label="Account">
                <select name="accountId" defaultValue="" className={inputClass}>
                  <option value="">Other / not listed</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gross amount (£)">
                <input type="number" name="grossAmount" step="any" min="0" required className={inputClass} />
              </Field>
              <Field label="Set-aside %" hint="Leave blank for the recommended amount.">
                <input type="number" name="setAsidePct" step="any" min="0" max="100" placeholder="auto" className={inputClass} />
              </Field>
            </div>
            <button type="submit" className={primaryButtonClass}>
              + Log Payout
            </button>
          </form>
        </div>
      </div>

      <section className={`${cardClass} space-y-5 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={labelClass}>Tax year summary</h2>
            <p className="mt-2 text-xs text-neutral-400">Every pound in, every write-off out, for one tax year (6 April – 5 April).</p>
          </div>
          <PrintButton />
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {yearList.map((y) => (
            <Link
              key={y}
              href={`/dashboard/trading/budgeting-tax?year=${y}`}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                y === year
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                  : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {taxYearLabel(y)}
            </Link>
          ))}
        </div>

        <p className="text-xs text-neutral-500">
          {taxYearLabel(year)} — income &amp; write-off summary. Generated {today}.
        </p>

        <div>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-semibold">Income</h3>
            <p className="font-mono text-sm text-emerald-400">{formatGbp(summary.income)}</p>
          </div>
          {payouts.length + income.length === 0 ? (
            <p className="py-3 text-xs text-neutral-500">No income logged for {taxYearLabel(year)} yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-900 text-sm">
              {payouts.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-2 text-neutral-300">
                  <span>
                    <span className="font-mono text-neutral-500">{dateText(p.date)}</span> Payout — {p.accountName}
                  </span>
                  <span className="font-mono">{formatGbp(Number(p.grossAmount))}</span>
                </li>
              ))}
              {income.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2 text-neutral-300">
                  <span>
                    <span className="font-mono text-neutral-500">{dateText(i.date)}</span> {i.category}
                    {i.description ? ` — ${i.description}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono">{formatGbp(Number(i.amount))}</span>
                    <form action={deleteIncome}>
                      <input type="hidden" name="id" value={i.id} />
                      {yearHidden}
                      <button type="submit" className={deleteClass}>
                        Delete
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-semibold">Expenses / Write-offs</h3>
            <p className="font-mono text-sm text-red-400">{formatGbp(summary.expenses)}</p>
          </div>
          {expenses.length === 0 ? (
            <p className="py-3 text-xs text-neutral-500">No expenses logged for {taxYearLabel(year)} yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-900 text-sm">
              {expenses.map((e) => (
                <li key={e.id} className="flex justify-between gap-4 py-2 text-neutral-300">
                  <span>
                    <span className="font-mono text-neutral-500">{dateText(e.date)}</span> {e.category}
                    {e.description ? ` — ${e.description}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono">{formatGbp(Number(e.amount))}</span>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      {yearHidden}
                      <button type="submit" className={deleteClass}>
                        Delete
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1 border-t border-neutral-800 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Net ({taxYearLabel(year)})</h3>
            <p className={`font-mono ${summary.profit < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatGbp(summary.profit)}</p>
          </div>
          <div className="flex items-center justify-between text-neutral-400">
            <span>Estimated tax on that profit</span>
            <span className="font-mono">{formatGbp(summary.taxOwed)}</span>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          This is a summary ledger built from what you&apos;ve logged here — it is not tax advice and not an official HMRC
          form. Use it as the source numbers when you (or your accountant) fill out your actual return, and confirm
          categorisation and totals with a qualified tax professional before filing.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 print:hidden">
        <form action={logIncome} className={`${cardClass} space-y-4 p-5`}>
          {yearHidden}
          <div>
            <h2 className={labelClass}>Log income</h2>
            <p className="mt-2 text-xs text-neutral-500">Anything that isn&apos;t an account payout — affiliate, coaching, whatever you name it.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date">
              <input type="date" name="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Category">
              <CategorySelect options={INCOME_CATEGORIES} />
            </Field>
            <Field label="Amount (£)">
              <input type="number" name="amount" step="any" min="0" required className={inputClass} />
            </Field>
            <Field label="Description (optional)">
              <input name="description" placeholder="e.g. Affiliate payout" className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={primaryButtonClass}>
            + Log Income
          </button>
        </form>

        <form action={logExpense} className={`${cardClass} space-y-4 p-5`}>
          {yearHidden}
          <div>
            <h2 className={labelClass}>Log an expense / write-off</h2>
            <p className="mt-2 text-xs text-neutral-500">Prop-firm evaluations, account resets, software, data feeds — anything you&apos;d write off.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date">
              <input type="date" name="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Category">
              <CategorySelect options={EXPENSE_CATEGORIES} />
            </Field>
            <Field label="Amount (£)">
              <input type="number" name="amount" step="any" min="0" required className={inputClass} />
            </Field>
            <Field label="Description (optional)">
              <input name="description" placeholder="e.g. Apex 150k eval reset" className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={primaryButtonClass}>
            + Log Expense
          </button>
        </form>
      </div>

      <section className={`${cardClass} space-y-4 p-5 print:hidden`}>
        <div>
          <h2 className={labelClass}>Receipts</h2>
          <p className="mt-2 text-xs text-neutral-500">
            Keep every receipt/invoice here as you get it — a photo or a PDF. Fill in the amount to also log it as an expense.
          </p>
        </div>
        <form action={uploadReceipt} className="space-y-4">
          {yearHidden}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="File (photo or PDF)">
              <input
                type="file"
                name="file"
                required
                accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-neutral-200`}
              />
            </Field>
            <Field label="Date">
              <input type="date" name="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Amount (£, optional)">
              <input type="number" name="amount" step="any" min="0" className={inputClass} />
            </Field>
            <Field label="Category">
              <select name="category" defaultValue="Other" className={inputClass}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description (optional)">
              <input name="description" placeholder="e.g. TradingView subscription" className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={primaryButtonClass}>
            + Add Receipt
          </button>
        </form>

        {receipts.length === 0 ? (
          <p className="text-xs text-neutral-500">No receipts stored for {taxYearLabel(year)} yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-900 text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-2">
                <span className="text-neutral-300">
                  <span className="font-mono text-neutral-500">{dateText(r.date)}</span>{" "}
                  <a href={`/api/tax-receipts/${r.id}`} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300">
                    {r.fileName}
                  </a>
                </span>
                <form action={deleteReceipt}>
                  <input type="hidden" name="id" value={r.id} />
                  {yearHidden}
                  <button type="submit" className={deleteClass}>
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
