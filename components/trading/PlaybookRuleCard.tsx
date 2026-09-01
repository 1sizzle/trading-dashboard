import Link from "next/link";
import { marked } from "marked";
import { Card } from "@/components/ui/Card";
import { deleteRule } from "@/app/dashboard/trading/playbook/actions";
import type { PlaybookRule } from "@/lib/generated/prisma/client";

export function PlaybookRuleCard({ rule }: { rule: PlaybookRule }) {
  const html = marked.parse(rule.content, { async: false }) as string;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs font-medium text-neutral-300">
            {rule.setupGrade}
          </span>
          <h2 className="text-lg font-semibold">{rule.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={`/dashboard/trading/playbook/${rule.id}/edit`}
            className="text-neutral-400 hover:text-neutral-50"
          >
            Edit
          </Link>
          <form action={deleteRule}>
            <input type="hidden" name="id" value={rule.id} />
            <button type="submit" className="text-neutral-400 hover:text-red-400">
              Delete
            </button>
          </form>
        </div>
      </div>
      <div
        className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-p:text-neutral-300 prose-li:text-neutral-300"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
}
