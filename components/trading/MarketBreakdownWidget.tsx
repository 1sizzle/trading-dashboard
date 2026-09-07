import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { classifyVix } from "@/lib/trading/market-breakdown-narrative";
import { groupKeyLevels } from "@/lib/trading/key-level-grouping";
import type { MarketBreakdownPost } from "@/lib/generated/prisma/client";

interface KeyLevel {
  name: string;
  price: number;
  distanceFromPrice: number;
  tapped: boolean;
}

interface StructureTimeframe {
  bias: "bullish" | "bearish";
  label: string;
}

interface Structure {
  daily: StructureTimeframe;
  h4: StructureTimeframe;
  h1: StructureTimeframe;
  m5: StructureTimeframe;
}

interface Narrative {
  headline?: string;
  alignment?: string;
  bias?: string;
  gameplan?: string;
  lineInSand?: string;
  tradeLocation?: string;
  whatNotToDo?: string;
}

const STRUCTURE_ROWS: { key: keyof Structure; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "h4", label: "4H" },
  { key: "h1", label: "1H" },
  { key: "m5", label: "5M" },
];

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLevel(level: KeyLevel): string {
  const direction = level.distanceFromPrice >= 0 ? "above" : "below";
  return `${level.name} ${formatPrice(level.price)} (${level.distanceFromPrice >= 0 ? "+" : ""}${level.distanceFromPrice.toFixed(1)} ${direction}${level.tapped ? ", tapped" : ""})`;
}

function formatTimeET(date: Date): string {
  return `${new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeStyle: "short" }).format(date)} ET`;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-neutral-200">{label}</p>
      <div className="mt-0.5 text-neutral-400">{children}</div>
    </div>
  );
}

export function MarketBreakdownWidget({ post }: { post: MarketBreakdownPost | null }) {
  if (!post) {
    return (
      <Card>
        <h2 className="font-medium">Market Breakdown</h2>
        <p className="mt-2 text-sm text-neutral-500">No market breakdown posted yet today.</p>
        <Link href="/dashboard/trading/market-breakdown" className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300">
          View past recaps →
        </Link>
      </Card>
    );
  }

  const keyLevels = (post.keyLevelsData as unknown as KeyLevel[] | null) ?? [];
  const narrative = post.narrative as unknown as Narrative | null;
  const structure = post.structureData as unknown as Structure | null;
  const vix = post.vix !== null ? Number(post.vix) : null;
  const { confluence, closest } = groupKeyLevels(keyLevels);

  return (
    <Card accent>
      <div className="text-sm">
        <p className="text-base font-semibold text-neutral-100">
          {post.symbol}1! · {formatTimeET(post.postedAt)}
        </p>
        {vix !== null && (
          <p className="mt-0.5 text-neutral-400">
            VIX {vix.toFixed(2)} — {classifyVix(vix)}
          </p>
        )}

        {!narrative ? (
          <p className="mt-3 text-neutral-500">AI summary hasn&apos;t been generated for this post yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {structure && (
              <Section label="Structure">
                {STRUCTURE_ROWS.map(({ key, label }) => {
                  const tf = structure[key];
                  return (
                    <div key={key}>
                      {label} {tf.bias === "bullish" ? "🟢" : "🔴"} {tf.bias} · {tf.label}
                    </div>
                  );
                })}
              </Section>
            )}
            {narrative.alignment && <Section label="Alignment">{narrative.alignment}</Section>}
            {narrative.bias && <Section label="Bias">{narrative.bias}</Section>}
            {(confluence.length > 0 || closest.length > 0) && (
              <Section label="Key levels">
                {confluence.length > 0 && (
                  <div>
                    Confluence: {confluence.map((g) => g.map((l) => `${l.name} ${formatPrice(l.price)}`).join(" + ")).join(" · ")}
                  </div>
                )}
                {closest.length > 0 && <div>Closest levels: {closest.map(formatLevel).join(" · ")}</div>}
              </Section>
            )}
            {narrative.gameplan && <Section label="Gameplan">{narrative.gameplan}</Section>}
            {narrative.lineInSand && <Section label="Line in the sand">{narrative.lineInSand}</Section>}
            {narrative.tradeLocation && <Section label="Trade location">{narrative.tradeLocation}</Section>}
            {narrative.whatNotToDo && <Section label="What not to do">{narrative.whatNotToDo}</Section>}
          </div>
        )}
      </div>

      <Link href="/dashboard/trading/market-breakdown" className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300">
        View full recap →
      </Link>
    </Card>
  );
}
