import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { saveRiskSettings } from "@/app/dashboard/trading/risk/actions";
import type { RiskSettings } from "@/lib/generated/prisma/client";

export function RiskSettingsForm({ settings }: { settings: RiskSettings | null }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Risk settings</h2>
      <form action={saveRiskSettings} className="grid grid-cols-3 gap-4">
        <Field label="Account size ($)">
          <input
            type="number"
            step="any"
            name="accountSize"
            required
            defaultValue={settings?.accountSize?.toString()}
            className={inputClass}
          />
        </Field>

        <Field label="Daily loss limit ($)">
          <input
            type="number"
            step="any"
            name="dailyLossLimit"
            required
            defaultValue={settings?.dailyLossLimit?.toString()}
            className={inputClass}
          />
        </Field>

        <Field label="Max risk per trade ($)">
          <input
            type="number"
            step="any"
            name="maxRiskPerTrade"
            required
            defaultValue={settings?.maxRiskPerTrade?.toString()}
            className={inputClass}
          />
        </Field>

        <div className="col-span-3 flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Save settings
          </button>
        </div>
      </form>
    </Card>
  );
}
