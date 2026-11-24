import { marked } from "marked";
import { db } from "@/lib/core/db";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Field";
import { TradeScreenshotFields } from "@/components/trading/TradeScreenshotFields";
import { formatNewYorkDateTime, utcToNewYorkDateTimeLocalValue } from "@/lib/trading/calc";
import { analyzeMentorNote, deleteMentorNote, saveMentorNote } from "./actions";

export const dynamic = "force-dynamic";

const cardClass = "rounded-xl border border-neutral-800 bg-neutral-900/50";
const labelClass = "text-xs uppercase tracking-wider text-neutral-500";

const ANALYZE_ERRORS: Record<string, string> = {
  no_screenshot: "Can't analyze a call with no screenshot attached.",
  ai_config: "AI analysis isn't configured yet.",
  ai_rate_limit: "Hit the free-tier AI usage limit — try again in a minute or two.",
  ai_failed: "Couldn't analyze that screenshot — try again shortly.",
};

export default async function MentorNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ screenshotsSkipped?: string; error?: string }>;
}) {
  const params = await searchParams;
  const notes = await db.mentorNote.findMany({
    orderBy: { postedAt: "desc" },
    include: { screenshots: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mentor Calls</h1>
        <p className="mt-1 text-neutral-400">
          Paste the screenshot the moment your mentor posts it — note optional, saved in a couple of seconds.
        </p>
      </div>

      {params.error === "empty" && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          Nothing to save — paste a screenshot or write a note first.
        </div>
      )}
      {params.error && ANALYZE_ERRORS[params.error] && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {ANALYZE_ERRORS[params.error]}
        </div>
      )}
      {params.screenshotsSkipped && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-2 text-sm text-amber-300">
          {params.screenshotsSkipped} screenshot{params.screenshotsSkipped === "1" ? "" : "s"} skipped — not an
          image, or over the 8MB limit.
        </div>
      )}

      <form action={saveMentorNote} className={`${cardClass} space-y-4 p-5`}>
        <h2 className={labelClass}>Log a call</h2>
        <TradeScreenshotFields imageBaseUrl="/api/screenshots/mentor" />
        <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
          <Field label="Note (optional)">
            <textarea
              name="note"
              rows={2}
              placeholder="e.g. Bearish below 24,900, watching for a retest"
              className={inputClass}
            />
          </Field>
          <Field label="Posted at" hint="Eastern (NY) time">
            <input
              type="datetime-local"
              name="postedAt"
              defaultValue={utcToNewYorkDateTimeLocalValue(new Date())}
              className={inputClass}
            />
          </Field>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Save
        </button>
      </form>

      {notes.length === 0 ? (
        <div className={`${cardClass} p-6 text-sm text-neutral-500`}>No mentor calls logged yet.</div>
      ) : (
        <div className="space-y-4">
          {notes.map((n) => (
            <div key={n.id} className={`${cardClass} space-y-3 p-5`}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-neutral-400">{formatNewYorkDateTime(n.postedAt)}</p>
                <form action={deleteMentorNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" className="text-xs text-neutral-500 hover:text-red-400">
                    Delete
                  </button>
                </form>
              </div>
              {n.note && <p className="whitespace-pre-wrap text-sm text-neutral-200">{n.note}</p>}
              {n.screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {n.screenshots.map((s) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={s.id}
                      src={`/api/screenshots/mentor/${s.id}`}
                      alt=""
                      className="aspect-video w-full rounded-lg border border-neutral-800 object-cover"
                    />
                  ))}
                </div>
              )}

              {n.analysis ? (
                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  <p className={labelClass}>AI read of this chart</p>
                  <div
                    className="prose prose-invert prose-sm max-w-none text-neutral-200"
                    dangerouslySetInnerHTML={{ __html: marked.parse(n.analysis, { async: false }) as string }}
                  />
                  <form action={analyzeMentorNote}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="text-xs text-neutral-500 hover:text-violet-300">
                      Re-analyze
                    </button>
                  </form>
                </div>
              ) : (
                n.screenshots.length > 0 && (
                  <form action={analyzeMentorNote} className="border-t border-neutral-800 pt-3">
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className={secondaryButtonClass}>
                      Analyze with AI
                    </button>
                  </form>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
