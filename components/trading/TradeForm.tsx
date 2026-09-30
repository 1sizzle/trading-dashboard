import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { saveTrade } from "@/app/dashboard/trading/journal/actions";
import { ChipPicker } from "@/components/trading/ChipPicker";
import { TradeScreenshotFields } from "@/components/trading/TradeScreenshotFields";
import type { TradeWithExtras } from "@/components/trading/TradeTagsAndPsychologyFields";
import { utcToNewYorkDateTimeLocalValue } from "@/lib/trading/calc";

const sectionLabel = "text-xs uppercase tracking-wider text-neutral-500";

export function TradeForm({
  trade,
  pairOptions = [],
  entryModelOptions = [],
  setupOptions = [],
  accountOptions = [],
}: {
  trade?: TradeWithExtras;
  pairOptions?: string[];
  entryModelOptions?: string[];
  setupOptions?: string[];
  accountOptions?: { id: string; name: string }[];
}) {
  // Editing a trade whose account is no longer in the active list (failed/closed,
  // or deleted) — keep it selectable/shown rather than silently dropping it.
  const linkedAccountMissing = Boolean(trade?.accountId) && !accountOptions.some((a) => a.id === trade?.accountId);
  const fullAccountOptions =
    linkedAccountMissing && trade
      ? [...accountOptions, { id: trade.accountId!, name: trade.accountName ?? "Unnamed account" }]
      : accountOptions;
  const dateValue = utcToNewYorkDateTimeLocalValue(trade ? trade.entryTime : new Date());
  const pnlValue = trade && Number(trade.pnl) !== 0 ? trade.pnl.toString() : "";

  return (
    <form action={saveTrade} className="grid gap-6 lg:grid-cols-2">
      {trade && <input type="hidden" name="id" value={trade.id} />}

      <Card>
        <h2 className={`mb-4 ${sectionLabel}`}>Trade details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date & time" hint="Eastern (NY) time">
              <input
                type="datetime-local"
                name="tradeTime"
                required
                defaultValue={dateValue}
                className={inputClass}
              />
            </Field>

            <Field label="Position">
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
              <select name="session" required defaultValue={trade?.session ?? ""} className={inputClass}>
                <option value="" disabled>
                  –
                </option>
                <option value="NEW_YORK_AM">New York AM</option>
                <option value="NEW_YORK_PM">New York PM</option>
                <option value="LONDON">London</option>
                <option value="ASIA">Asia</option>
              </select>
            </Field>

            <Field label="R:R">
              <input
                type="number"
                step="any"
                name="rMultiple"
                defaultValue={trade?.rMultiple?.toString() ?? "1.0"}
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

            <Field label="P&L ($, optional)">
              <input
                type="number"
                step="any"
                name="pnl"
                placeholder="e.g. -450 for a loss"
                defaultValue={pnlValue}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            R:R is stored as a positive number, and Outcome decides whether it counts for or against you in
            Net R. Enter the real dollar result if you know it; leave it blank to track this trade in R only.
          </p>

          <ChipPicker
            name="accountIds"
            label={trade ? "Account" : "Account(s) — select one or more to log this trade across several accounts"}
            options={fullAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
            initialSelected={trade?.accountId ? [trade.accountId] : []}
            multiple={!trade}
            allowAdd={false}
            emptyText="No accounts yet — add one in the Accounts tab first."
          />
          {!trade?.accountId && trade?.accountName && (
            <p className="text-xs text-neutral-500">
              Originally logged against &ldquo;{trade.accountName}&rdquo;, which has since been deleted.
            </p>
          )}

          <ChipPicker
            name="pair"
            label="Pair (pick one — add your own below)"
            options={pairOptions}
            initialSelected={trade?.symbol ? [trade.symbol] : []}
            emptyText="No pairs yet — add the ones you actually trade below (e.g. NQ, GC)."
            addPlaceholder="New pair (e.g. NQ)"
            uppercase
          />

          <ChipPicker
            name="entryModel"
            label="Entry model (pick one — add your own below)"
            options={entryModelOptions}
            initialSelected={trade?.entryModel ? [trade.entryModel] : []}
            emptyText="No entry models yet — add your first one below."
            addPlaceholder="New entry model name"
          />

          <ChipPicker
            name="tags"
            label="Setups / confluences (select all that apply — add your own below)"
            options={setupOptions}
            initialSelected={trade?.tags.map((tt) => tt.tag.name) ?? []}
            multiple
            joined
            emptyText="No confluences yet — add your first one below."
            addPlaceholder="New confluence / strategy name"
          />

          <TradeScreenshotFields screenshots={trade?.screenshots} />
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h2 className={`mb-4 ${sectionLabel}`}>Trade narrative</h2>
          <div className="space-y-4">
            <Field label="Pre-trade thesis">
              <textarea
                name="preTradeThesis"
                rows={4}
                placeholder="What's the setup, and why are you taking it?"
                defaultValue={trade?.preTradeThesis ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Management">
              <textarea
                name="management"
                rows={4}
                placeholder="Entry, stop, targets, BE logic — how it was actually managed."
                defaultValue={trade?.management ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Review">
              <textarea
                name="review"
                rows={4}
                placeholder="Post-trade reflection."
                defaultValue={trade?.review ?? ""}
                className={inputClass}
              />
            </Field>

            <details className="rounded-lg border border-neutral-800 p-3">
              <summary className="cursor-pointer text-sm text-neutral-400">Emotions (optional)</summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Field label="Pre-trade emotion">
                  <input
                    type="text"
                    name="preEmotion"
                    defaultValue={trade?.psychology?.preEmotion ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Post-trade emotion">
                  <input
                    type="text"
                    name="postEmotion"
                    defaultValue={trade?.psychology?.postEmotion ?? ""}
                    className={inputClass}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Psychology notes">
                    <textarea
                      name="psychologyNotes"
                      rows={2}
                      defaultValue={trade?.psychology?.notes ?? ""}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </details>

            <button type="submit" className={`${primaryButtonClass} w-full`}>
              {trade ? "Save changes" : "Save trade"}
            </button>
          </div>
        </Card>
      </div>
    </form>
  );
}
