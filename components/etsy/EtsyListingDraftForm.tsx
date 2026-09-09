import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { saveListingDraft } from "@/app/dashboard/etsy/products/actions";
import type { EtsyListingDraft } from "@/lib/generated/prisma/client";

export function EtsyListingDraftForm({ productId, draft }: { productId: string; draft: EtsyListingDraft | null }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Listing draft</h2>
      <form action={saveListingDraft} className="space-y-4">
        <input type="hidden" name="productId" value={productId} />

        <Field label="Title">
          <input type="text" name="title" required defaultValue={draft?.title} className={inputClass} />
        </Field>

        <Field label="Description">
          <textarea name="description" rows={8} defaultValue={draft?.description} className={inputClass} />
        </Field>

        <Field label="Tags" hint="Exactly 13, comma-separated">
          <input
            type="text"
            name="tags"
            required
            defaultValue={draft?.tags.join(", ")}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Suggested category">
            <input
              type="text"
              name="suggestedCategory"
              defaultValue={draft?.suggestedCategory ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Suggested materials">
            <input
              type="text"
              name="suggestedMaterials"
              defaultValue={draft?.suggestedMaterials ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Alt text">
          <input type="text" name="altText" defaultValue={draft?.altText ?? ""} className={inputClass} />
        </Field>

        <Field label="AI disclosure">
          <input type="text" name="aiDisclosure" defaultValue={draft?.aiDisclosure ?? ""} className={inputClass} />
        </Field>

        <Field label="Pricing notes">
          <textarea name="pricingNotes" rows={2} defaultValue={draft?.pricingNotes ?? ""} className={inputClass} />
        </Field>

        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Save listing draft
          </button>
        </div>
      </form>
    </Card>
  );
}
