import { Card } from "@/components/ui/Card";
import { primaryButtonClass } from "@/components/ui/Field";
import { generateListingsFromPrompts, retryMissingPrompts } from "@/app/dashboard/etsy/prompt-studio/actions";
import type { EtsyPrompt, EtsyProduct } from "@/lib/generated/prisma/client";

type PromptWithProduct = EtsyPrompt & { product: EtsyProduct | null };

export function EtsyPromptList({
  workspaceId,
  prompts,
  missingCount,
  aspectRatio,
}: {
  workspaceId: string;
  prompts: PromptWithProduct[];
  missingCount: number;
  aspectRatio: string;
}) {
  return (
    <div className="space-y-4">
      {missingCount > 0 && (
        <Card className="border-amber-500/30">
          <p className="text-sm text-amber-300">
            {missingCount} of the requested prompts are missing (a chunk may have failed).
          </p>
          <form action={retryMissingPrompts} className="mt-2">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="aspectRatio" value={aspectRatio} />
            <button type="submit" className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-500/10">
              Retry missing prompts
            </button>
          </form>
        </Card>
      )}

      {prompts.length === 0 ? (
        <p className="text-sm text-neutral-500">No prompts generated yet.</p>
      ) : (
        <form action={generateListingsFromPrompts}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <Card key={prompt.id}>
                <div className="flex items-start gap-3">
                  {prompt.product ? (
                    <span className="mt-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      Product {prompt.product.sku}
                    </span>
                  ) : (
                    <input type="checkbox" name="promptIds" value={prompt.id} className="mt-1.5 accent-violet-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-neutral-300">{prompt.promptText}</p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Aspect {prompt.aspectRatio} · Confidence: {prompt.confidence ?? "unknown"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className={primaryButtonClass}>
              Generate listing(s) from selected
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
