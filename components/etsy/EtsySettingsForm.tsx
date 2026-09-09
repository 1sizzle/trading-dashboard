import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { saveEtsySettings } from "@/app/dashboard/etsy/actions";
import type { EtsySettings } from "@/lib/generated/prisma/client";

export function EtsySettingsForm({ settings }: { settings: EtsySettings | null }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Etsy settings</h2>
      <form action={saveEtsySettings} className="grid grid-cols-2 gap-4">
        <Field label="Currency" hint="e.g. GBP, USD">
          <input
            type="text"
            name="currency"
            required
            defaultValue={settings?.currency ?? "GBP"}
            className={inputClass}
          />
        </Field>

        <Field label="Fulfilment provider" hint="Optional — e.g. Printify, Printful">
          <input
            type="text"
            name="fulfillmentProvider"
            defaultValue={settings?.fulfillmentProvider ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="SKU digits" hint="Permanent SKU length, e.g. 3 → 001-999">
          <input
            type="number"
            name="skuDigits"
            min={1}
            max={10}
            required
            defaultValue={settings?.skuDigits ?? 3}
            className={inputClass}
          />
        </Field>

        <Field label="Artwork ratios" hint="Comma-separated, e.g. 2:3, 5:6">
          <input
            type="text"
            name="artworkRatios"
            required
            defaultValue={settings?.artworkRatios?.join(", ") ?? "2:3, 5:6"}
            className={inputClass}
          />
        </Field>

        <div className="col-span-2 flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Save settings
          </button>
        </div>
      </form>
    </Card>
  );
}
