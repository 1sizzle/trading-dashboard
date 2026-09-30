"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/Field";

export type ChipOption = string | { value: string; label: string };

function normalize(option: ChipOption): { value: string; label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

// Pick-from-chips control with an "add your own" box. `multiple` allows several
// selections; `joined` submits them as one comma-separated value, otherwise each
// selected value is submitted under the same name. `options` accepts plain
// strings (value == label) or `{value, label}` pairs when the submitted value
// (e.g. a database id) shouldn't be the same as the displayed text.
export function ChipPicker({
  name,
  label,
  options,
  initialSelected = [],
  multiple = false,
  joined = false,
  allowAdd = true,
  emptyText,
  addPlaceholder,
  uppercase = false,
}: {
  name: string;
  label: string;
  options: ChipOption[];
  initialSelected?: string[];
  multiple?: boolean;
  joined?: boolean;
  allowAdd?: boolean;
  emptyText: string;
  addPlaceholder?: string;
  uppercase?: boolean;
}) {
  const [items, setItems] = useState(() => {
    const normalized = options.map(normalize);
    const known = new Set(normalized.map((o) => o.value));
    const extra = initialSelected.filter((v) => !known.has(v)).map((v) => ({ value: v, label: v }));
    return [...normalized, ...extra];
  });
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [draft, setDraft] = useState("");

  function toggle(value: string) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return multiple ? [...prev, value] : [value];
    });
  }

  function addNew() {
    const raw = draft.trim();
    const value = uppercase ? raw.toUpperCase() : raw;
    if (!value) return;
    setItems((prev) => (prev.some((i) => i.value === value) ? prev : [...prev, { value, label: value }]));
    setSelected((prev) => (multiple ? (prev.includes(value) ? prev : [...prev, value]) : [value]));
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-300">{label}</span>

      {joined ? (
        <input type="hidden" name={name} value={selected.join(",")} />
      ) : (
        selected.map((value) => <input key={value} type="hidden" name={name} value={value} />)
      )}

      <div className="flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        {items.length === 0 ? (
          <span className="text-xs text-neutral-500">{emptyText}</span>
        ) : (
          items.map((item) => {
            const active = selected.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggle(item.value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-violet-500 bg-violet-500/20 text-violet-200"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {item.label}
              </button>
            );
          })
        )}
      </div>

      {allowAdd && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNew();
              }
            }}
            placeholder={addPlaceholder}
            className={inputClass}
          />
          <button
            type="button"
            onClick={addNew}
            className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
          >
            + Add
          </button>
        </div>
      )}
    </div>
  );
}
