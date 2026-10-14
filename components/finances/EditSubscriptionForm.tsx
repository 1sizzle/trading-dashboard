import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { utcMidnightToDateInputValue } from "@/lib/finances/dates";

export function EditSubscriptionForm({
  id,
  name,
  amount,
  cycle,
  type,
  category,
  note,
  nextBillingDate,
  action,
}: {
  id: string;
  name: string;
  amount: number;
  cycle: "MONTHLY" | "YEARLY";
  type: "PERSONAL" | "BUSINESS";
  category: string | null;
  note: string | null;
  nextBillingDate: Date | null;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card className="max-w-md">
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <Field label="Name">
          <input type="text" name="name" defaultValue={name} required className={inputClass} />
        </Field>
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
        <Field label="Cycle">
          <select name="cycle" defaultValue={cycle} className={inputClass}>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={type} className={inputClass}>
            <option value="PERSONAL">Personal</option>
            <option value="BUSINESS">Business</option>
          </select>
        </Field>
        <Field label="Category" hint="Optional">
          <input type="text" name="category" defaultValue={category ?? ""} className={inputClass} />
        </Field>
        <Field label="Next billing date" hint="Auto-posts as an expense on this date, then rolls forward a cycle">
          <input
            type="date"
            name="nextBillingDate"
            defaultValue={nextBillingDate ? utcMidnightToDateInputValue(nextBillingDate) : ""}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Note" hint="Optional">
          <input type="text" name="note" defaultValue={note ?? ""} className={inputClass} />
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
