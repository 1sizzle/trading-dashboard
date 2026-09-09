import { db } from "@/lib/core/db";
import { EtsySettingsForm } from "@/components/etsy/EtsySettingsForm";

export const dynamic = "force-dynamic";

export default async function EtsySettingsPage() {
  const settings = await db.etsySettings.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Etsy settings</h1>
        <p className="mt-1 text-neutral-400">
          Currency, fulfilment provider, SKU format, and artwork ratios — used across the Etsy workspace.
        </p>
      </div>
      <EtsySettingsForm settings={settings} />
    </div>
  );
}
