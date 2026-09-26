import { Field, inputClass } from "@/components/ui/Field";
import { utcToNewYorkDateTimeLocalValue } from "@/lib/trading/calc";
import type { TradeWithExtras } from "@/components/trading/TradeTagsAndPsychologyFields";

// Shared by both FuturesMetalsTradeForm and CryptoTradeForm — every field a
// trade needs regardless of asset class: account/session/R:R/outcome/P&L are
// all entered directly rather than calculated, to keep logging fast.
export function TradeFormFields({ trade }: { trade?: TradeWithExtras }) {
  return (
    <>
      <Field label="Date & time" hint="Eastern (NY) time">
        <input
          type="datetime-local"
          name="tradeTime"
          required
          defaultValue={trade ? utcToNewYorkDateTimeLocalValue(trade.entryTime) : undefined}
          className={inputClass}
        />
      </Field>

      <Field label="Account">
        <select name="account" required defaultValue={trade?.account ?? "LIVE"} className={inputClass}>
          <option value="LIVE">Live</option>
          <option value="EVAL">Eval</option>
          <option value="FUNDED">Funded</option>
        </select>
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

      <Field label="Session">
        <select name="session" required defaultValue={trade?.session ?? "NEW_YORK_AM"} className={inputClass}>
          <option value="NEW_YORK_AM">New York AM</option>
          <option value="NEW_YORK_PM">New York PM</option>
          <option value="LONDON">London</option>
          <option value="ASIA">Asia</option>
        </select>
      </Field>

      <Field label="R:R" hint="Optional — e.g. 2.5 for 2.5R">
        <input
          type="number"
          step="any"
          name="rMultiple"
          defaultValue={trade?.rMultiple?.toString() ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Outcome">
        <select name="outcome" required defaultValue={trade?.outcome ?? "WIN"} className={inputClass}>
          <option value="WIN">Win</option>
          <option value="LOSS">Loss</option>
          <option value="BREAKEVEN">Breakeven</option>
        </select>
      </Field>

      <Field label="P&L ($)" hint="Enter the dollar result directly">
        <input
          type="number"
          step="any"
          name="pnl"
          required
          defaultValue={trade?.pnl?.toString()}
          className={inputClass}
        />
      </Field>
    </>
  );
}
