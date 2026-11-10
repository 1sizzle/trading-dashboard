"use client";

import { useEffect, useRef, useState } from "react";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";
import {
  BLOCK_COLORS,
  EVERY_DAY,
  WEEKDAYS,
  WEEKDAYS_ONLY,
  WEEKENDS_ONLY,
  type BlockColor,
} from "@/lib/timetable/constants";

export type BlockFormValues = {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  days: number[];
  date: string | null;
  color: BlockColor;
  note: string | null;
};

type Repeat = "weekly" | "once";

const PRESETS = [
  { label: "Every day", days: EVERY_DAY },
  { label: "Weekdays", days: WEEKDAYS_ONLY },
  { label: "Weekends", days: WEEKENDS_ONLY },
];

export function BlockForm({
  action,
  initial,
  defaultDay,
  defaultDate,
  defaultStart,
  defaultEnd,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: BlockFormValues;
  defaultDay?: number;
  defaultDate?: string;
  defaultStart?: string;
  defaultEnd?: string;
  submitLabel: string;
  cancelHref?: string;
}) {
  const startDays = initial?.days ?? (defaultDay !== undefined ? [defaultDay] : WEEKDAYS_ONLY);
  const [days, setDays] = useState<number[]>(startDays);
  // New blocks start as one-off plans; switch to "Repeats weekly" for the routine.
  const [repeat, setRepeat] = useState<Repeat>(initial && !initial.date ? "weekly" : "once");
  const [color, setColor] = useState<BlockColor>(initial?.color ?? "violet");
  const formRef = useRef<HTMLFormElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const daysErrorRef = useRef<HTMLInputElement>(null);

  function toggleDay(value: number) {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  // Native validation messages for the two rules a time input can't express:
  // end after start, and at least one day picked (for weekly blocks). Set ahead of submit (on
  // change, and on the Add button's click) because the browser checks
  // validity before the form's submit event fires.
  function validate() {
    const start = startRef.current?.value ?? "";
    const end = endRef.current?.value ?? "";
    endRef.current?.setCustomValidity(start && end && end <= start ? "End time must be after the start time." : "");
    daysErrorRef.current?.setCustomValidity(repeat === "weekly" && days.length === 0 ? "Pick at least one day." : "");
  }

  useEffect(validate, [days, repeat]);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    if (!initial) {
      formRef.current?.reset();
      setColor("violet");
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {days.map((d) => (
        <input key={d} type="hidden" name="days" value={d} />
      ))}
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="repeat" value={repeat} />

      <Field label="What">
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Pre-market prep"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <input
            ref={startRef}
            type="time"
            name="startTime"
            required
            defaultValue={initial?.startTime ?? defaultStart}
            onChange={validate}
            className={inputClass}
          />
        </Field>
        <Field label="End">
          <input
            ref={endRef}
            type="time"
            name="endTime"
            required
            defaultValue={initial?.endTime ?? defaultEnd}
            onChange={validate}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-neutral-800 text-sm font-medium">
        {(
          [
            { value: "weekly", label: "Repeats weekly" },
            { value: "once", label: "One-off date" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRepeat(option.value)}
            className={`flex-1 px-3 py-2 transition ${
              repeat === option.value ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-neutral-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {repeat === "once" ? (
        <Field label="Date">
          <input type="date" name="date" required defaultValue={initial?.date ?? defaultDate} className={inputClass} />
        </Field>
      ) : (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-neutral-300">Days</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`w-11 rounded-lg border py-1.5 text-xs font-medium transition ${
                  days.includes(d.value)
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setDays(p.days)}
                className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 transition hover:border-violet-500 hover:text-violet-300"
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Carries the "pick at least one day" validation message. */}
          <input ref={daysErrorRef} tabIndex={-1} aria-hidden className="pointer-events-none h-0 w-0 opacity-0" />
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-neutral-300">Colour</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_COLORS) as BlockColor[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={BLOCK_COLORS[key].label}
              title={BLOCK_COLORS[key].label}
              className={`h-7 w-7 rounded-full ${BLOCK_COLORS[key].bar} transition ${
                color === key
                  ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-950"
                  : "opacity-60 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      </div>

      <Field label="Note" hint="Optional — shown on the dashboard, not the lock screen">
        <input type="text" name="note" defaultValue={initial?.note ?? ""} className={inputClass} />
      </Field>

      <div className="flex gap-3">
        <button type="submit" onClick={validate} className={primaryButtonClass}>
          {submitLabel}
        </button>
        {cancelHref && (
          <a href={cancelHref} className={secondaryButtonClass}>
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}
