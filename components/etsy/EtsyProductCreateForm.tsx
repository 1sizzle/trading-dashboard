import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { createProduct } from "@/app/dashboard/etsy/products/actions";

export function EtsyProductCreateForm() {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">New product</h2>
      <form action={createProduct} className="flex items-end gap-4">
        <div className="flex-1">
          <Field label="Title" hint="A permanent SKU is allocated automatically">
            <input type="text" name="title" required className={inputClass} />
          </Field>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Create
        </button>
      </form>
    </Card>
  );
}
