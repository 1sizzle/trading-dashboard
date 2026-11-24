import { marked } from "marked";
import { Card } from "@/components/ui/Card";

// Markdown written by the Claude mentor connector (reviews, premarket plans, pattern notes).
export function MentorCard({ title, markdown }: { title: string; markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string;
  return (
    <Card accent>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div
        className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-p:text-neutral-300 prose-li:text-neutral-300"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
}
