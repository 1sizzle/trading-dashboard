"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";

type Kind = "expense" | "income";
type EntryType = "PERSONAL" | "BUSINESS";

export function QuickAddMoneyForm({
  expenseOptions,
  incomeOptions,
  addExpense,
  addIncome,
}: {
  expenseOptions: { personal: string[]; business: string[] };
  incomeOptions: { personal: string[]; business: string[] };
  addExpense: (formData: FormData) => Promise<void>;
  addIncome: (formData: FormData) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>("expense");
  const [type, setType] = useState<EntryType>("PERSONAL");
  const [filterText, setFilterText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Set directly on the DOM node (not via setState) so today's date is
  // computed in the browser's own timezone, without a hydration mismatch
  // against the server-rendered (UTC) markup.
  useEffect(() => {
    if (dateInputRef.current && !dateInputRef.current.value) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
    // Focus Amount on mount for fast entry, but deferred and guarded so it
    // can't steal focus from a field the user already clicked into. A plain
    // mount-time focus() (or a declarative `autoFocus` prop) runs on React's
    // own commit timing, which can land a beat before the browser has
    // finished applying an early click's own focus change — so checking
    // document.activeElement synchronously at mount can still see "nothing
    // focused yet" and grab focus anyway, right out from under a field the
    // user just clicked, making whatever they typed next vanish into Amount
    // instead. Deferring one tick lets any in-flight click settle first.
    const focusTimer = setTimeout(() => {
      if (amountInputRef.current && document.activeElement === document.body) {
        amountInputRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(focusTimer);
  }, []);

  const kindOptions = kind === "expense" ? expenseOptions : incomeOptions;
  const options = type === "PERSONAL" ? kindOptions.personal : kindOptions.business;
  const labelText = kind === "expense" ? "Category" : "Source";
  const fieldName = kind === "expense" ? "category" : "source";
  const filteredOptions = filterText
    ? options.filter((opt) => opt.toLowerCase().includes(filterText.toLowerCase()))
    : options;
  const trimmedFilter = filterText.trim();
  const showAddNew =
    trimmedFilter.length > 0 && !options.some((opt) => opt.toLowerCase() === trimmedFilter.toLowerCase());

  // Writes straight to the DOM (not via setState) so the value is already
  // there the instant requestSubmit reads the form — logging a common entry
  // is then just "type amount, pick a category," no extra Add click.
  function selectOption(value: string) {
    if (labelInputRef.current) labelInputRef.current.value = value;
    setFilterText("");
    setDropdownOpen(false);
    const amount = Number(amountInputRef.current?.value);
    if (amount > 0) {
      formRef.current?.requestSubmit();
    } else {
      amountInputRef.current?.focus();
    }
  }

  async function handleSubmit(formData: FormData) {
    await (kind === "expense" ? addExpense : addIncome)(formData);
    formRef.current?.reset();
    setFilterText("");
    if (dateInputRef.current) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
    setType("PERSONAL");
    amountInputRef.current?.focus();
  }

  return (
    <Card accent>
      <h2 className="mb-3 text-lg font-semibold">Quick add</h2>
      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <input type="hidden" name="type" value={type} />

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Field label="Amount">
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                name="amount"
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-300">Kind</span>
            <div className="flex overflow-hidden rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setKind("expense")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  kind === "expense" ? "bg-red-600/80 text-white" : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setKind("income")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  kind === "income" ? "bg-emerald-600/80 text-white" : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-300">Type</span>
            <div className="flex overflow-hidden rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setType("PERSONAL")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  type === "PERSONAL"
                    ? "bg-violet-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setType("BUSINESS")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  type === "BUSINESS"
                    ? "bg-cyan-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                Business
              </button>
            </div>
          </div>

          <div className="w-40">
            <Field label="Date">
              <input ref={dateInputRef} type="date" name="date" required className={inputClass} />
            </Field>
          </div>

          <div className="min-w-[180px] flex-1">
            <Field label={labelText}>
              <div className="relative">
                <input
                  ref={labelInputRef}
                  type="text"
                  name={fieldName}
                  autoComplete="off"
                  required
                  defaultValue=""
                  onChange={(e) => setFilterText(e.target.value)}
                  onFocus={() => {
                    setFilterText("");
                    setDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  placeholder={options[0]}
                  className={inputClass}
                />
                {dropdownOpen && (filteredOptions.length > 0 || showAddNew) && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
                    {filteredOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onMouseDown={() => selectOption(opt)}
                        className="block w-full px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
                      >
                        {opt}
                      </button>
                    ))}
                    {showAddNew && (
                      <button
                        type="button"
                        onMouseDown={() => selectOption(trimmedFilter)}
                        className="block w-full border-t border-neutral-800 px-3 py-2 text-left text-sm text-violet-300 transition hover:bg-neutral-800"
                      >
                        + Add &quot;{trimmedFilter}&quot; as a new {labelText.toLowerCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Field>
          </div>

          <button type="submit" className={primaryButtonClass}>
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => selectOption(opt)}
              className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 transition hover:border-violet-500 hover:text-violet-300"
            >
              {opt}
            </button>
          ))}
        </div>

        <details className="text-sm text-neutral-400">
          <summary className="cursor-pointer select-none">More options</summary>
          <div className="mt-2">
            <Field label="Note" hint="Optional">
              <input type="text" name="note" className={inputClass} />
            </Field>
          </div>
        </details>
      </form>
    </Card>
  );
}
