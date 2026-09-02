"use client";

import { useState } from "react";
import { saveTradingRulesNote } from "@/app/dashboard/trading/playbook/actions";

export function TradingRulesNoteCard({ content }: { content: string }) {
  const [editing, setEditing] = useState(false);
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);

  if (editing) {
    return (
      <div className="w-72 shrink-0 rounded-lg border border-violet-500/30 bg-neutral-900/70 p-4">
        <form
          action={async (formData) => {
            await saveTradingRulesNote(formData);
            setEditing(false);
          }}
          className="space-y-2"
        >
          <textarea
            name="content"
            defaultValue={content}
            rows={5}
            autoFocus
            placeholder="One rule per line"
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-xs text-neutral-200 focus:border-violet-500 focus:outline-none"
          />
          <div className="flex justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button type="submit" className="font-medium text-violet-400 hover:text-violet-300">
              Save
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border border-violet-500/20 bg-neutral-900/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
          <span aria-hidden>📓</span> Trading Rules
        </span>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit trading rules"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition hover:border-violet-500 hover:text-violet-400"
        >
          +
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs text-neutral-500">No rules yet — click + to add some.</p>
      ) : (
        <ul className="space-y-1.5 text-xs text-neutral-300">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-violet-400">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
