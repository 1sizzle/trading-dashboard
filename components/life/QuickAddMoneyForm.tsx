"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";

type EntryType = "PERSONAL" | "BUSINESS";

export function QuickAddMoneyForm({
  kind,
  personalOptions,
  businessOptions,
  action,
}: {
  kind: "expense" | "income";
  personalOptions: string[];
  businessOptions: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [type, setType] = useState<EntryType>("PERSONAL");
  const [labelValue, setLabelValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Set directly on the DOM node (not via setState) so today's date is
  // computed in the browser's own timezone, without a hydration mismatch
  // against the server-rendered (UTC) markup.
  useEffect(() => {
    if (dateInputRef.current && !dateInputRef.current.value) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
  }, []);

  const options = type === "PERSONAL" ? personalOptions : businessOptions;
  const labelText = kind === "expense" ? "Category" : "Source";
  const fieldName = kind === "expense" ? "category" : "source";

  function selectOption(value: string) {
    setLabelValue(value);
    setDropdownOpen(false);
  }

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setLabelValue("");
    if (dateInputRef.current) {
      dateInputRef.current.value = new Date().toLocaleDateString("en-CA");
    }
    setType("PERSONAL");
    amountInputRef.current?.focus();
  }

  return (
    <Card accent>
      <h2 className="mb-3 text-lg font-semibold">
        Add {kind === "expense" ? "an expense" : "income"}
      </h2>
      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <input type="hidden" name="type" value={type} />

        <div className="flex flex-wrap items-end gap-3">
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
                autoFocus
                className={inputClass}
              />
            </Field>
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

          <div className="min-w-[180px] flex-1">
            <Field label={labelText}>
              <div className="relative">
                <input
                  type="text"
                  name={fieldName}
                  autoComplete="off"
                  required
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  placeholder={options[0]}
                  className={inputClass}
                />
                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onMouseDown={() => selectOption(opt)}
                        className={`block w-full px-3 py-2 text-left text-sm transition ${
                          opt === labelValue
                            ? "bg-violet-600/20 text-violet-300"
                            : "text-neutral-200 hover:bg-neutral-800"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
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
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Field label="Note" hint="Optional">
              <input type="text" name="note" className={inputClass} />
            </Field>
            <Field label="Date">
              <input ref={dateInputRef} type="date" name="date" className={inputClass} />
            </Field>
          </div>
        </details>
      </form>
    </Card>
  );
}
