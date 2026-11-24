import { marked } from "marked";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";

export function WeeklyReviewCard({
  weekStartValue,
  review,
  aiError,
  saveReflection,
  generateCommentary,
}: {
  weekStartValue: string;
  review: { reflection: string | null; aiCommentary: string | null } | null;
  aiError?: boolean;
  saveReflection: (formData: FormData) => Promise<void>;
  generateCommentary: (formData: FormData) => Promise<void>;
}) {
  const commentaryHtml = review?.aiCommentary
    ? (marked.parse(review.aiCommentary, { async: false }) as string)
    : null;

  return (
    <Card accent>
      <h2 className="mb-3 text-lg font-semibold">Week review</h2>

      <form action={saveReflection} className="space-y-3">
        <input type="hidden" name="weekStart" value={weekStartValue} />
        <Field label="How was the week overall?" hint="Optional">
          <textarea
            name="reflection"
            rows={5}
            defaultValue={review?.reflection ?? ""}
            placeholder="Patterns across the week, what worked, what to change going into next week..."
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Save reflection
          </button>
        </div>
      </form>

      <div className="mt-4 border-t border-neutral-800 pt-4">
        {commentaryHtml ? (
          <div
            className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-p:text-neutral-300 prose-li:text-neutral-300"
            dangerouslySetInnerHTML={{ __html: commentaryHtml }}
          />
        ) : aiError ? (
          <p className="text-sm text-red-400">
            Couldn&apos;t generate an AI take this time — your reflection is still saved. Try again.
          </p>
        ) : (
          <p className="text-sm text-neutral-500">
            No AI take yet — generate one grounded in this week&apos;s real trades and daily reflections.
          </p>
        )}
        <form action={generateCommentary} className="mt-3">
          <input type="hidden" name="weekStart" value={weekStartValue} />
          <button type="submit" className={secondaryButtonClass}>
            {commentaryHtml ? "Regenerate AI take" : "Get AI take"}
          </button>
        </form>
      </div>
    </Card>
  );
}
