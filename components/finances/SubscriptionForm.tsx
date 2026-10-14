"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";

type EntryType = "PERSONAL" | "BUSINESS";
type Cycle = "MONTHLY" | "YEARLY";

export function SubscriptionForm({
  personalCategories,
  businessCategories,
  action,
}: {
  personalCategories: string[];
  businessCategories: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [type, setType] = useState<EntryType>("PERSONAL");
  const [cycle, setCycle] = useState<Cycle>("MONTHLY");
  const [filterText, setFilterText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Defaults to today so the common case (just subscribed, or backfilling
  // an existing one) needs no extra tap — computed client-side to match the
  // browser's own timezone, same as the main quick-add form's date.
  useEffect(() => {
    if (dateInputRef.current && !dateInputRef.current.value) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
  }, []);

  const options = type === "PERSONAL" ? personalCategories : businessCategories;
  const filteredOptions = filterText
    ? options.filter((opt) => opt.toLowerCase().includes(filterText.toLowerCase()))
    : options;
  const trimmedFilter = filterText.trim();
  const showAddNew =
    trimmedFilter.length > 0 && !options.some((opt) => opt.toLowerCase() === trimmedFilter.toLowerCase());

  // A category pick is usually the last thing tapped — if everything else
  // required is already filled in, submit immediately instead of making one
  // more click; otherwise send focus to whichever field is still missing.
  function selectOption(value: string) {
    if (categoryInputRef.current) categoryInputRef.current.value = value;
    setFilterText("");
    setDropdownOpen(false);
    const name = nameInputRef.current?.value.trim();
    const amount = Number(amountInputRef.current?.value);
    const hasDate = Boolean(dateInputRef.current?.value);
    if (name && amount > 0 && hasDate) {
      formRef.current?.requestSubmit();
    } else if (!name) {
      nameInputRef.current?.focus();
    } else if (!(amount > 0)) {
      amountInputRef.current?.focus();
    } else {
      dateInputRef.current?.focus();
    }
  }

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setFilterText("");
    if (dateInputRef.current) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
    setType("PERSONAL");
    setCycle("MONTHLY");
    nameInputRef.current?.focus();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="cycle" value={cycle} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <Field label="Name">
            <input
              ref={nameInputRef}
              type="text"
              name="name"
              required
              autoComplete="off"
              placeholder="Netflix"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="w-28">
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
          <span className="mb-1.5 block text-sm font-medium text-neutral-300">Cycle</span>
          <div className="flex overflow-hidden rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setCycle("MONTHLY")}
              className={`px-3 py-2 text-sm font-medium transition ${
                cycle === "MONTHLY" ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("YEARLY")}
              className={`px-3 py-2 text-sm font-medium transition ${
                cycle === "YEARLY" ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              Yearly
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
                type === "PERSONAL" ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setType("BUSINESS")}
              className={`px-3 py-2 text-sm font-medium transition ${
                type === "BUSINESS" ? "bg-cyan-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
              }`}
            >
              Business
            </button>
          </div>
        </div>

        <div className="min-w-[160px] flex-1">
          <Field label="Category" hint="Optional">
            <div className="relative">
              <input
                ref={categoryInputRef}
                type="text"
                name="category"
                autoComplete="off"
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
                      + Add &quot;{trimmedFilter}&quot; as a new category
                    </button>
                  )}
                </div>
              )}
            </div>
          </Field>
        </div>

        <div className="w-40">
          <Field label="Next billing" hint="Auto-posts as an expense then">
            <input
              ref={dateInputRef}
              type="date"
              name="nextBillingDate"
              required
              className={inputClass}
            />
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
  );
}
