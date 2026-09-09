import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { createPromptWorkspace } from "@/app/dashboard/etsy/prompt-studio/actions";

export function EtsyPromptWorkspaceForm({ artworkRatios }: { artworkRatios: string[] }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">New prompt batch</h2>
      <form action={createPromptWorkspace} className="space-y-4">
        <Field label="Describe the collection" hint="Free text — the theme, mood, or subject you want posters for">
          <textarea name="collectionRequest" rows={3} required className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="How many prompts" hint="1-10">
            <input type="number" name="count" min={1} max={10} defaultValue={5} required className={inputClass} />
          </Field>

          <Field label="Aspect ratio">
            <select name="aspectRatio" defaultValue={artworkRatios[0] ?? "2:3"} className={inputClass}>
              {artworkRatios.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-xs text-neutral-500">
          Research is cautious and public-evidence only — no private Etsy sales data, search volume, or
          guaranteed-demand claims. Confidence and sources are shown with the results.
        </p>

        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Generate prompts
          </button>
        </div>
      </form>
    </Card>
  );
}
