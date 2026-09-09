import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { EtsyPromptList } from "@/components/etsy/EtsyPromptList";

export const dynamic = "force-dynamic";

export default async function EtsyPromptWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await db.etsyPromptWorkspace.findUnique({
    where: { id },
    include: { prompts: { orderBy: { order: "asc" }, include: { product: true } } },
  });

  if (!workspace) {
    notFound();
  }

  const missingCount = workspace.requestedCount - workspace.prompts.length;
  const aspectRatio = workspace.prompts[0]?.aspectRatio ?? "2:3";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{workspace.collectionRequest}</h1>
        <p className="mt-1 text-neutral-400">
          {workspace.prompts.length} of {workspace.requestedCount} prompts
        </p>
      </div>

      {workspace.researchSummary && (
        <Card>
          <h2 className="mb-1 text-sm font-medium text-violet-300">Research summary</h2>
          <p className="text-sm text-neutral-300">{workspace.researchSummary}</p>
          <p className="mt-2 text-xs text-neutral-500">
            Public-evidence research only — not a measure of real Etsy demand or competition.
          </p>
        </Card>
      )}

      <EtsyPromptList
        workspaceId={workspace.id}
        prompts={workspace.prompts}
        missingCount={missingCount}
        aspectRatio={aspectRatio}
      />
    </div>
  );
}
