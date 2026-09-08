import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { saveMissedSetup } from "@/app/dashboard/trading/journal/actions";
import { KNOWN_FUTURES_SYMBOLS } from "@/lib/trading/contracts";
import { utcToNewYorkDateTimeLocalValue } from "@/lib/trading/calc";
import { MissedSetupScreenshotFields } from "@/components/trading/MissedSetupScreenshotFields";
import type { MissedSetup, MissedSetupScreenshot } from "@/lib/generated/prisma/client";

const REASON_SUGGESTIONS = [
  "Hesitated",
  "Away from desk",
  "Didn't trust it",
  "Missed the entry",
  "Already used daily risk",
  "Wasn't at the right level yet",
];

type MissedSetupWithScreenshots = MissedSetup & { screenshots: MissedSetupScreenshot[] };

export function MissedSetupForm({ missedSetup }: { missedSetup?: MissedSetupWithScreenshots }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">
        {missedSetup ? "Edit potential setup" : "Potential setups"}
      </h2>
      <form action={saveMissedSetup} className="grid grid-cols-2 gap-4">
        {missedSetup && <input type="hidden" name="id" value={missedSetup.id} />}

        <Field label="Symbol" hint="e.g. NQ, MNQ, ES, MES, GC, MGC, SI, SIL">
          <input
            type="text"
            name="symbol"
            list="futures-symbols"
            required
            defaultValue={missedSetup?.symbol}
            className={inputClass}
          />
          <datalist id="futures-symbols">
            {KNOWN_FUTURES_SYMBOLS.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>
        </Field>

        <Field label="Direction">
          <select
            name="direction"
            required
            defaultValue={missedSetup?.direction ?? "LONG"}
            className={inputClass}
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field label="Setup" hint="What you saw, e.g. golden pocket retracement into daily open">
            <input
              type="text"
              name="setupDescription"
              required
              defaultValue={missedSetup?.setupDescription}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="Reason skipped">
            <input
              type="text"
              name="reasonSkipped"
              list="reason-suggestions"
              required
              defaultValue={missedSetup?.reasonSkipped}
              className={inputClass}
            />
            <datalist id="reason-suggestions">
              {REASON_SUGGESTIONS.map((reason) => (
                <option key={reason} value={reason} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Seen at" hint="Eastern (NY) time">
          <input
            type="datetime-local"
            name="seenAt"
            required
            defaultValue={missedSetup ? utcToNewYorkDateTimeLocalValue(missedSetup.seenAt) : undefined}
            className={inputClass}
          />
        </Field>

        <div className="col-span-2">
          <Field label="Notes" hint="Optional — what happened afterward, would it have worked?">
            <textarea
              name="notes"
              rows={2}
              defaultValue={missedSetup?.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <MissedSetupScreenshotFields missedSetup={missedSetup} />

        <div className="col-span-2 flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            {missedSetup ? "Save changes" : "Log potential setup"}
          </button>
        </div>
      </form>
    </Card>
  );
}
