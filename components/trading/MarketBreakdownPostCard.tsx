import { Card } from "@/components/ui/Card";
import { formatNewYorkDateTime } from "@/lib/trading/calc";
import type { MarketBreakdownPost, MarketBreakdownPostType } from "@/lib/generated/prisma/client";

const POST_TYPE_LABEL: Record<MarketBreakdownPostType, { emoji: string; title: string }> = {
  NY_OPEN: { emoji: "📐", title: "NY Open Brief" },
  FIRST_HOUR: { emoji: "🕘", title: "First Hour Update" },
  MIDDAY: { emoji: "🕐", title: "Midday Update" },
  DAILY_RECAP: { emoji: "🌙", title: "Daily Recap" },
};

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
  keyContext?: string;
  gameplan?: string;
  lineInSand?: string;
  tradeLocation?: string;
  whatNotToDo?: string;
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NarrativeSection({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-violet-400">{label}</p>
      <p className="mt-0.5 text-sm text-neutral-300">{text}</p>
    </div>
  );
}

const STRUCTURE_ROWS: { key: keyof Structure; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "h4", label: "4H" },
  { key: "h1", label: "1H" },
  { key: "m5", label: "5M" },
];

function StructureTable({ structure }: { structure: Structure | null }) {
  if (!structure) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-violet-400">Structure</p>
      <div className="mt-0.5 space-y-0.5 text-sm text-neutral-300">
        {STRUCTURE_ROWS.map(({ key, label }) => {
          const tf = structure[key];
          return (
            <div key={key}>
              {label} {tf.bias === "bullish" ? "🟢" : "🔴"} {tf.bias} · {tf.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MarketBreakdownPostCard({ post }: { post: MarketBreakdownPost }) {
  const { emoji, title } = POST_TYPE_LABEL[post.postType];
  const keyLevels = (post.keyLevelsData as unknown as KeyLevel[] | null) ?? [];
  const narrative = post.narrative as unknown as Narrative | null;
  const structure = post.structureData as unknown as Structure | null;
  const price = Number(post.price);
  const vix = post.vix !== null ? Number(post.vix) : null;
  const ibHigh = post.ibHigh !== null ? Number(post.ibHigh) : null;
  const ibLow = post.ibLow !== null ? Number(post.ibLow) : null;
  const sessionVolumePct = post.sessionVolumePct !== null ? Number(post.sessionVolumePct) : null;

  return (
    <Card accent>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {emoji} {title} — {post.symbol}
        </h3>
        <span className="text-sm text-neutral-400">{formatNewYorkDateTime(post.postedAt)}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-400">
        <span>
          Price <span className="font-medium text-neutral-100">{formatPrice(price)}</span>
        </span>
        {vix !== null && (
          <span>
            VIX <span className="font-medium text-neutral-100">{vix.toFixed(2)}</span>
          </span>
        )}
        {sessionVolumePct !== null && (
          <span>
            Session volume{" "}
            <span className="font-medium text-neutral-100">{sessionVolumePct.toFixed(0)}% of 30-day avg</span>
          </span>
        )}
        {ibHigh !== null && ibLow !== null && (
          <span>
            IB{" "}
            <span className="font-medium text-neutral-100">
              {formatPrice(ibHigh)} / {formatPrice(ibLow)}
            </span>
          </span>
        )}
      </div>

      {narrative ? (
        <div className="mt-4 space-y-3">
          <NarrativeSection label="Headline" text={narrative.headline} />
          <StructureTable structure={structure} />
          <NarrativeSection label="Alignment" text={narrative.alignment} />
          <NarrativeSection label="Bias" text={narrative.bias} />
          <NarrativeSection label="Key context" text={narrative.keyContext} />
          <NarrativeSection label="Gameplan" text={narrative.gameplan} />
          <NarrativeSection label="Line in the sand" text={narrative.lineInSand} />
          <NarrativeSection label="Trade location" text={narrative.tradeLocation} />
          <NarrativeSection label="What not to do" text={narrative.whatNotToDo} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">AI summary hasn&apos;t been generated for this post yet.</p>
      )}

      {keyLevels.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Key levels</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {keyLevels.map((level) => (
              <span
                key={level.name}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  level.tapped
                    ? "border-neutral-700 bg-neutral-800/60 text-neutral-400"
                    : "border-violet-500/30 bg-violet-500/10 text-violet-300"
                }`}
                title={level.tapped ? "Tapped" : "Untapped"}
              >
                {level.name} {formatPrice(level.price)} ({level.distanceFromPrice >= 0 ? "+" : ""}
                {level.distanceFromPrice.toFixed(1)})
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
