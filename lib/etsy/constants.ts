import type { EtsyProductStatus } from "@/lib/generated/prisma/client";

export const PRODUCT_STATUS_LABELS: Record<EtsyProductStatus, string> = {
  WORKING: "Working",
  REVIEW: "Review",
  READY: "Ready",
  LISTED: "Listed",
  ARCHIVED: "Archived",
};

export const PRODUCT_STATUS_BADGE_CLASSES: Record<EtsyProductStatus, string> = {
  WORKING: "border-neutral-700 bg-neutral-800 text-neutral-300",
  REVIEW: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  READY: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  LISTED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  ARCHIVED: "border-neutral-800 bg-neutral-900 text-neutral-500",
};
