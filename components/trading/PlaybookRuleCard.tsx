import { marked } from "marked";
import { Card } from "@/components/ui/Card";
import type { PlaybookRule } from "@/lib/generated/prisma/client";

export function PlaybookRuleCard({ rule }: { rule: PlaybookRule }) {
  const html = marked.parse(rule.content, { async: false }) as string;

  return (
    <Card>
      <div className="mb-1 flex items-center gap-3">
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
          {rule.setupGrade}
        </span>
        <h2 className="text-lg font-semibold">{rule.title}</h2>
      </div>
      <div
        className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-p:text-neutral-300 prose-li:text-neutral-300"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
}
