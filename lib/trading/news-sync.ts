import { db } from "@/lib/core/db";

// Public JSON mirror of ForexFactory's calendar. It only ever publishes the current
// week (and next week once available), so history builds up as weeks get synced.
const FEED_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
];

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

interface FeedEvent {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
}

export interface SyncResult {
  ok: boolean;
  synced: number;
  error?: string;
}

export async function syncNewsEvents(): Promise<SyncResult> {
  let synced = 0;
  let succeeded = 0;
  let lastError: string | undefined;

  for (const url of FEED_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        lastError = `Calendar feed returned ${res.status}`;
        continue; // next week's file isn't published until later in the week
      }
      const events = (await res.json()) as FeedEvent[];
      succeeded += 1;

      for (const e of events) {
        const impact = e.impact === "High" ? "HIGH" : e.impact === "Medium" ? "MEDIUM" : null;
        const eventTime = e.date ? new Date(e.date) : null;
        if (!impact || !eventTime || Number.isNaN(eventTime.getTime()) || !e.title || !e.country) continue;

        const data = {
          title: e.title,
          currency: e.country,
          impact: impact as "HIGH" | "MEDIUM",
          eventTime,
          forecast: e.forecast?.trim() || null,
          previous: e.previous?.trim() || null,
          syncedAt: new Date(),
        };
        const externalKey = `${e.title}|${e.country}|${eventTime.toISOString()}`;
        await db.newsEvent.upsert({ where: { externalKey }, update: data, create: { ...data, externalKey } });
        synced += 1;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Could not reach the calendar feed";
    }
  }

  return succeeded > 0 ? { ok: true, synced } : { ok: false, synced: 0, error: lastError ?? "Sync failed" };
}

export async function syncNewsIfStale(): Promise<void> {
  const latest = await db.newsEvent.findFirst({ orderBy: { syncedAt: "desc" }, select: { syncedAt: true } });
  if (latest && Date.now() - latest.syncedAt.getTime() < STALE_AFTER_MS) return;
  await syncNewsEvents();
}
