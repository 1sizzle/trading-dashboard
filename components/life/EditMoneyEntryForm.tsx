import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { utcMidnightToDateInputValue } from "@/lib/life/dates";

export function EditMoneyEntryForm({
  kind,
  id,
  amount,
  label,
  type,
  note,
  date,
  action,
}: {
  kind: "expense" | "income";
  id: string;
  amount: number;
  label: string;
  type: "PERSONAL" | "BUSINESS";
  note: string | null;
  date: Date;
  action: (formData: FormData) => Promise<void>;
}) {
  const fieldName = kind === "expense" ? "category" : "source";
  const labelText = kind === "expense" ? "Category" : "Source";

  return (
    <Card className="max-w-md">
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <Field label="Amount">
          <input
            type="number"
            step="0.01"
            min="0"
            name="amount"
            defaultValue={amount}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={type} className={inputClass}>
            <option value="PERSONAL">Personal</option>
            <option value="BUSINESS">Business</option>
          </select>
        </Field>
        <Field label={labelText}>
          <input type="text" name={fieldName} defaultValue={label} required className={inputClass} />
        </Field>
        <Field label="Note" hint="Optional">
          <input type="text" name="note" defaultValue={note ?? ""} className={inputClass} />
        </Field>
        <Field label="Date">
          <input
            type="date"
            name="date"
            defaultValue={utcMidnightToDateInputValue(date)}
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Save changes
          </button>
        </div>
      </form>
    </Card>
  );
}
