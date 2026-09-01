import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { saveChecklist } from "@/app/dashboard/trading/premarket/actions";
import { dateToDateInputValue, getTodayNewYorkDateValue } from "@/lib/trading/calc";
import type { PremarketChecklist } from "@/lib/generated/prisma/client";

const BIAS_SUGGESTIONS = ["Bullish", "Bearish", "Neutral", "Range-bound"];

export function PremarketChecklistForm({ checklist }: { checklist?: PremarketChecklist }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">
        {checklist ? "Edit checklist" : "Today's pre-market checklist"}
      </h2>
      <form action={saveChecklist} className="grid grid-cols-2 gap-4">
        {checklist && <input type="hidden" name="id" value={checklist.id} />}

        <Field label="Date">
          <input
            type="date"
            name="date"
            required
            defaultValue={
              checklist ? dateToDateInputValue(checklist.date) : getTodayNewYorkDateValue()
            }
            className={inputClass}
          />
        </Field>

        <Field label="Bias" hint="e.g. Bullish, Bearish, Neutral">
          <input
            type="text"
            name="bias"
            list="bias-suggestions"
            required
            defaultValue={checklist?.bias}
            className={inputClass}
          />
          <datalist id="bias-suggestions">
            {BIAS_SUGGESTIONS.map((bias) => (
              <option key={bias} value={bias} />
            ))}
          </datalist>
        </Field>

        <div className="col-span-2">
          <Field label="Key levels">
            <textarea
              name="keyLevels"
              rows={3}
              required
              defaultValue={checklist?.keyLevels}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="Notes" hint="Optional">
            <textarea
              name="notes"
              rows={2}
              defaultValue={checklist?.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            {checklist ? "Save changes" : "Save checklist"}
          </button>
        </div>
      </form>
    </Card>
  );
}
