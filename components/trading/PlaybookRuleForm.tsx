import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { saveRule } from "@/app/dashboard/trading/playbook/actions";
import type { PlaybookRule } from "@/lib/generated/prisma/client";

export function PlaybookRuleForm({
  rule,
  nextOrder,
}: {
  rule?: PlaybookRule;
  nextOrder?: number;
}) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{rule ? "Edit rule" : "Add a rule"}</h2>
      <form action={saveRule} className="space-y-4">
        {rule && <input type="hidden" name="id" value={rule.id} />}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Title">
              <input
                type="text"
                name="title"
                required
                defaultValue={rule?.title}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Grade / category" hint="e.g. S+, A, General">
            <input
              type="text"
              name="setupGrade"
              required
              defaultValue={rule?.setupGrade}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Content" hint="Markdown supported — headers, bold, lists">
          <textarea
            name="content"
            rows={6}
            required
            defaultValue={rule?.content}
            className={`${inputClass} font-mono`}
          />
        </Field>

        <input type="hidden" name="order" value={rule?.order ?? nextOrder ?? 0} />

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            {rule ? "Save changes" : "Add rule"}
          </button>
        </div>
      </form>
    </Card>
  );
}
