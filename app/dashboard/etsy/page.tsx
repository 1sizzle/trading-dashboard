import Link from "next/link";
import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { PRODUCT_STATUS_LABELS } from "@/lib/etsy/constants";
import type { EtsyProductStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const WORKFLOW_STATUSES: EtsyProductStatus[] = ["WORKING", "REVIEW", "READY", "LISTED", "ARCHIVED"];

const QUICK_ACTIONS = [
  { label: "Create poster", description: "Describe it and automate the setup", href: "/dashboard/etsy/prompt-studio" as string | undefined },
  { label: "View products", description: "Review active poster work", href: "/dashboard/etsy/products" as string | undefined },
  { label: "Upload artwork", description: "Attach finished files", href: "/dashboard/etsy/upload" as string | undefined },
  { label: "Review settings", description: "Currency, fulfilment, SKU format", href: "/dashboard/etsy/settings" },
];

export default async function EtsyOverviewPage() {
  const [settings, statusCounts] = await Promise.all([
    db.etsySettings.findFirst(),
    db.etsyProduct.groupBy({ by: ["status"], _count: true }),
  ]);

  const countByStatus = Object.fromEntries(
    WORKFLOW_STATUSES.map((status) => [
      status,
      statusCounts.find((row) => row.status === status)?._count ?? 0,
    ])
  ) as Record<EtsyProductStatus, number>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Etsy</h1>
      <p className="mt-2 text-neutral-400">
        Seller workspace for wall-art products — research through to a reviewed, unpublished Etsy draft. Final
        publication always stays a manual step on Etsy itself.
      </p>

      <div className="mt-6 space-y-6">
        {!settings && (
          <Card accent>
            <p className="text-sm font-medium text-violet-300">Your next move</p>
            <h2 className="mt-1 text-lg font-semibold">Set up your Etsy workspace</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Set your currency, fulfilment provider, SKU format, and artwork ratios before anything else — every
              later stage reads these.
            </p>
            <Link
              href="/dashboard/etsy/settings"
              className="mt-3 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Go to settings →
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {QUICK_ACTIONS.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href}>
                <Card className="h-full transition hover:border-violet-500/50">
                  <h3 className="font-medium">{action.label}</h3>
                  <p className="mt-1 text-sm text-neutral-400">{action.description}</p>
                </Card>
              </Link>
            ) : (
              <Card key={action.label} className="h-full opacity-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{action.label}</h3>
                  <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                    Later stage
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">{action.description}</p>
              </Card>
            )
          )}
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Product workflow</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {WORKFLOW_STATUSES.map((status) => (
              <StatTile key={status} label={PRODUCT_STATUS_LABELS[status]} value={String(countByStatus[status])} />
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Finance</h2>
            <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
              Not tracked yet
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Etsy revenue and expenses will show here once Etsy sync (a later stage) can pull real, proven figures —
            no placeholder numbers shown in the meantime.
          </p>
        </Card>
      </div>
    </div>
  );
}
