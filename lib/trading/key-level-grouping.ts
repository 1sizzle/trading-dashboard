import type { KeyLevelField } from "@/lib/trading/market-breakdown-narrative";

export interface KeyLevelGroups {
  confluence: KeyLevelField[][];
  closest: KeyLevelField[];
}

// Calibrated against the real reference example (Weekly Open 29392.2 / PDL
// 29401.8 — a 9.6pt gap — were grouped as confluence there), not guessed.
const CONFLUENCE_TOLERANCE_POINTS = 10;
const MAX_CLOSEST = 4;

// Deterministic clustering, no AI involved. "Confluence" and "closest" are
// two independent views over the same level set (verified against the real
// reference example, where levels appeared in both lists at once) — not a
// partition, so no exclusion between them.
export function groupKeyLevels(levels: KeyLevelField[]): KeyLevelGroups {
  const sortedByPrice = [...levels].sort((a, b) => a.price - b.price);

  const groups: KeyLevelField[][] = [];
  let current: KeyLevelField[] = [];
  for (const level of sortedByPrice) {
    if (current.length === 0 || level.price - current[current.length - 1].price <= CONFLUENCE_TOLERANCE_POINTS) {
      current.push(level);
    } else {
      groups.push(current);
      current = [level];
    }
  }
  if (current.length > 0) groups.push(current);

  const confluence = groups.filter((g) => g.length >= 2);
  const closest = [...levels]
    .sort((a, b) => Math.abs(a.distanceFromPrice) - Math.abs(b.distanceFromPrice))
    .slice(0, MAX_CLOSEST);

  return { confluence, closest };
}
