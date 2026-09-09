import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { EtsyPromptWorkspaceForm } from "@/components/etsy/EtsyPromptWorkspaceForm";

export const dynamic = "force-dynamic";

export default async function EtsyPromptStudioPage() {
  const [settings, workspaces] = await Promise.all([
    db.etsySettings.findFirst(),
    db.etsyPromptWorkspace.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { prompts: true } } },
    }),
  ]);

  const artworkRatios = settings?.artworkRatios ?? ["2:3", "5:6"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prompt Studio</h1>
        <p className="mt-1 text-neutral-400">Research-informed Midjourney prompts for your next poster batch.</p>
      </div>

      <EtsyPromptWorkspaceForm artworkRatios={artworkRatios} />

      {workspaces.length === 0 ? (
        <p className="text-sm text-neutral-500">No prompt batches yet.</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Past batches</h2>
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/dashboard/etsy/prompt-studio/${workspace.id}`}>
              <Card className="transition hover:border-violet-500/50">
                <p className="font-medium">{workspace.collectionRequest}</p>
                <p className="mt-1 text-sm text-neutral-400">
                  {workspace._count.prompts} of {workspace.requestedCount} prompts generated
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
