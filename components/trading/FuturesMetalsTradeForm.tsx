import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { saveFuturesMetalsTrade } from "@/app/dashboard/trading/journal/actions";
import { KNOWN_FUTURES_SYMBOLS } from "@/lib/trading/contracts";
import { utcToNewYorkDateTimeLocalValue } from "@/lib/trading/calc";
import { TradeTagsAndPsychologyFields, type TradeWithExtras } from "@/components/trading/TradeTagsAndPsychologyFields";
import { TradeScreenshotFields } from "@/components/trading/TradeScreenshotFields";

export function FuturesMetalsTradeForm({
  trade,
  tagSuggestions = [],
}: {
  trade?: TradeWithExtras;
  tagSuggestions?: string[];
}) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">
        {trade ? "Edit trade" : "Log a futures / metals trade"}
      </h2>
      <form action={saveFuturesMetalsTrade} className="grid grid-cols-2 gap-4">
        {trade && <input type="hidden" name="id" value={trade.id} />}

        <Field label="Symbol" hint="e.g. NQ, MNQ, ES, MES, GC, MGC, SI, SIL">
          <input
            type="text"
            name="symbol"
            list="futures-symbols"
            required
            defaultValue={trade?.symbol}
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
            defaultValue={trade?.direction ?? "LONG"}
            className={inputClass}
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </Field>

        <Field label="Entry price">
          <input
            type="number"
            step="any"
            name="entryPrice"
            required
            defaultValue={trade?.entryPrice?.toString()}
            className={inputClass}
          />
        </Field>

        <Field label="Exit price">
          <input
            type="number"
            step="any"
            name="exitPrice"
            required
            defaultValue={trade?.exitPrice?.toString()}
            className={inputClass}
          />
        </Field>

        <Field label="Position size (contracts)">
          <input
            type="number"
            step="any"
            name="positionSize"
            required
            defaultValue={trade?.positionSize?.toString()}
            className={inputClass}
          />
        </Field>

        <Field label="Stop loss price" hint="Optional — enables R multiple">
          <input
            type="number"
            step="any"
            name="stopLoss"
            defaultValue={trade?.stopLoss?.toString() ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Entry time" hint="Eastern (NY) time">
          <input
            type="datetime-local"
            name="entryTime"
            required
            defaultValue={trade ? utcToNewYorkDateTimeLocalValue(trade.entryTime) : undefined}
            className={inputClass}
          />
        </Field>

        <Field label="Exit time" hint="Eastern (NY) time">
          <input
            type="datetime-local"
            name="exitTime"
            required
            defaultValue={trade ? utcToNewYorkDateTimeLocalValue(trade.exitTime) : undefined}
            className={inputClass}
          />
        </Field>

        <div className="col-span-2">
          <Field label="Notes" hint="Optional">
            <textarea
              name="notes"
              rows={2}
              defaultValue={trade?.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <TradeTagsAndPsychologyFields trade={trade} tagSuggestions={tagSuggestions} />
        <TradeScreenshotFields trade={trade} />

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            {trade ? "Save changes" : "Add trade"}
          </button>
        </div>
      </form>
    </Card>
  );
}
