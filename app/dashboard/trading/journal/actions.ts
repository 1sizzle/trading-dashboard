"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import type {
  AssetClass,
  TradeDirection,
  TradeOutcome,
  TradingSession,
} from "@/lib/generated/prisma/client";
import { calculateDurationMinutes, detectSession, newYorkWallTimeToUtc } from "@/lib/trading/calc";
import { KNOWN_FUTURES_SYMBOLS } from "@/lib/trading/contracts";
import { parseBitunixCsv, parseTradovatePerformanceCsv } from "@/lib/trading/csv";
import { del, put } from "@vercel/blob";

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

function parseTagNames(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index);
}

async function syncTradeTags(tradeId: string, tagNames: string[]) {
  const tagIds: string[] = [];
  for (const name of tagNames) {
    const tag = await db.tag.upsert({ where: { name }, update: {}, create: { name } });
    tagIds.push(tag.id);
  }

  await db.tradeTag.deleteMany({ where: { tradeId } });
  if (tagIds.length > 0) {
    await db.tradeTag.createMany({
      data: tagIds.map((tagId) => ({ tradeId, tagId })),
      skipDuplicates: true,
    });
  }
}

async function syncPsychology(
  tradeId: string,
  preEmotion: string | null,
  postEmotion: string | null,
  notes: string | null,
) {
  if (!preEmotion && !postEmotion && !notes) {
    await db.psychologyEntry.deleteMany({ where: { tradeId } });
    return;
  }

  await db.psychologyEntry.upsert({
    where: { tradeId },
    update: { preEmotion, postEmotion, notes },
    create: { tradeId, preEmotion, postEmotion, notes },
  });
}

async function syncTradeScreenshots(tradeId: string, formData: FormData): Promise<{ skipped: number }> {
  const deleteIds = formData.getAll("deleteScreenshotIds").map(String);
  if (deleteIds.length > 0) {
    const toDelete = await db.tradeScreenshot.findMany({ where: { id: { in: deleteIds }, tradeId } });
    await db.tradeScreenshot.deleteMany({ where: { id: { in: deleteIds }, tradeId } });
    await Promise.all(toDelete.map((screenshot) => del(screenshot.url).catch(() => {})));
  }

  const files = formData
    .getAll("screenshots")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let skipped = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_SCREENSHOT_BYTES) {
      skipped++;
      continue;
    }
    const blob = await put(`trade-screenshots/${tradeId}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "private",
    });
    await db.tradeScreenshot.create({ data: { tradeId, url: blob.url } });
  }

  return { skipped };
}

// Crypto pairs end in a quote currency; anything else (NQ, ES, GC...) is futures.
function inferAssetClass(pair: string | null, fallback: AssetClass): AssetClass {
  if (!pair) return fallback;
  if (KNOWN_FUTURES_SYMBOLS.includes(pair)) return "FUTURES_METALS";
  return /(USDT|USDC|USD|PERP|BTC|ETH)$/.test(pair) ? "CRYPTO" : "FUTURES_METALS";
}

function optionalText(formData: FormData, key: string) {
  return formData.has(key) ? formData.get(key)?.toString().trim() || null : undefined;
}

// R:R is entered as a positive number and Outcome decides whether it counts for
// or against you. P&L is optional: blank stores 0 (tracked in R only).
function buildTradeData(formData: FormData, existingAssetClass: AssetClass) {
  const direction = String(formData.get("direction")) as TradeDirection;
  const session = String(formData.get("session")) as TradingSession;
  const outcome = String(formData.get("outcome")) as TradeOutcome;
  const pnlRaw = formData.get("pnl")?.toString().trim();
  const pnl = pnlRaw ? Number(pnlRaw) : 0;
  const rMultipleRaw = formData.get("rMultiple")?.toString().trim();
  const rMultiple = rMultipleRaw ? Number(rMultipleRaw) : null;
  const symbol = formData.get("pair")?.toString().trim().toUpperCase() || null;
  const entryTime = newYorkWallTimeToUtc(String(formData.get("tradeTime")));

  return {
    symbol,
    assetClass: inferAssetClass(symbol, existingAssetClass),
    direction,
    session,
    outcome,
    pnl,
    rMultiple,
    entryModel: formData.get("entryModel")?.toString().trim() || null,
    preTradeThesis: optionalText(formData, "preTradeThesis"),
    management: optionalText(formData, "management"),
    review: optionalText(formData, "review"),
    notes: optionalText(formData, "notes"),
    entryTime,
  };
}

export async function saveTrade(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const accountIds = formData.getAll("accountIds").map(String).filter(Boolean);
  const existing = id ? await db.trade.findUnique({ where: { id } }) : null;
  const base = buildTradeData(formData, existing?.assetClass ?? "FUTURES_METALS");

  // One trade per selected account (logging across several firms at once);
  // editing always updates the single trade, using its selected account.
  const targets: (string | null)[] = id
    ? [accountIds[0] ?? existing?.accountId ?? null]
    : accountIds.length > 0
      ? accountIds
      : [null];

  const accountRows = await db.tradingAccount.findMany({
    where: { id: { in: targets.filter((t): t is string => t !== null) } },
    select: { id: true, name: true },
  });
  const accountNameById = new Map(accountRows.map((a) => [a.id, a.name]));

  let screenshotsSkipped = 0;
  for (const accountId of targets) {
    const data = {
      ...base,
      accountId,
      // A real linked account always gets a fresh name snapshot; with no account
      // selected, keep whatever snapshot already existed (e.g. from a deleted
      // account) rather than wiping it on an unrelated edit save.
      accountName: accountId ? (accountNameById.get(accountId) ?? null) : (existing?.accountName ?? null),
    };
    const trade = id
      ? await db.trade.update({ where: { id }, data })
      : await db.trade.create({ data });

    await syncTradeTags(trade.id, parseTagNames(formData.get("tags")));
    await syncPsychology(
      trade.id,
      formData.get("preEmotion")?.toString().trim() || null,
      formData.get("postEmotion")?.toString().trim() || null,
      formData.get("psychologyNotes")?.toString().trim() || null,
    );
    const { skipped } = await syncTradeScreenshots(trade.id, formData);
    screenshotsSkipped = Math.max(screenshotsSkipped, skipped);
  }

  revalidatePath("/dashboard/trading/journal");

  const params = new URLSearchParams();
  if (screenshotsSkipped > 0) params.set("screenshotsSkipped", String(screenshotsSkipped));
  const query = params.toString();

  redirect(`/dashboard/trading/journal${query ? `?${query}` : ""}`);
}

export async function importTradovateCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/trading/journal?importError=no_file");
  }

  const text = await file.text();
  const { trades, errors } = parseTradovatePerformanceCsv(text);

  if (trades.length === 0) {
    const message = errors[0] ?? "No trade rows found in that file.";
    redirect(
      `/dashboard/trading/journal?importError=bad_format&importErrorMessage=${encodeURIComponent(message)}`,
    );
  }

  const unknownSymbols = Array.from(
    new Set(trades.filter((trade) => !trade.isKnownSymbol).map((trade) => trade.symbol)),
  );

  const data = trades.map((trade) => ({
    symbol: trade.symbol,
    direction: trade.direction,
    assetClass: "FUTURES_METALS" as const,
    accountId: null,
    accountName: null,
    outcome: trade.pnl > 0 ? ("WIN" as const) : trade.pnl < 0 ? ("LOSS" as const) : ("BREAKEVEN" as const),
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    positionSize: trade.positionSize,
    stopLoss: null,
    riskDollars: null,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
    pnl: trade.pnl,
    rMultiple: null,
    durationMinutes: calculateDurationMinutes(trade.entryTime, trade.exitTime),
    session: detectSession(trade.entryTime),
    source: "CSV_IMPORT" as const,
    externalId: trade.externalId,
    notes: trade.rawSymbol !== trade.symbol ? `Contract: ${trade.rawSymbol}` : null,
  }));

  const result = await db.trade.createMany({ data, skipDuplicates: true });

  revalidatePath("/dashboard/trading/journal");

  const params = new URLSearchParams({
    imported: String(result.count),
    skipped: String(trades.length - result.count),
  });
  if (unknownSymbols.length > 0) params.set("unknownSymbols", unknownSymbols.join(","));
  if (errors.length > 0) params.set("parseErrors", String(errors.length));

  redirect(`/dashboard/trading/journal?${params.toString()}`);
}

export async function importBitunixCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/trading/journal?importError=no_file");
  }

  const text = await file.text();
  const { trades, errors } = parseBitunixCsv(text);

  if (trades.length === 0) {
    const message = errors[0] ?? "No trade rows found in that file.";
    redirect(
      `/dashboard/trading/journal?importError=bad_format&importErrorMessage=${encodeURIComponent(message)}`,
    );
  }

  const data = trades.map((trade) => ({
    symbol: trade.symbol,
    direction: trade.direction,
    assetClass: "CRYPTO" as const,
    accountId: null,
    accountName: null,
    outcome: trade.pnl > 0 ? ("WIN" as const) : trade.pnl < 0 ? ("LOSS" as const) : ("BREAKEVEN" as const),
    entryPrice: null,
    exitPrice: null,
    positionSize: null,
    stopLoss: null,
    riskDollars: null,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
    pnl: trade.pnl,
    rMultiple: null,
    durationMinutes: calculateDurationMinutes(trade.entryTime, trade.exitTime),
    session: detectSession(trade.entryTime),
    source: "CSV_IMPORT" as const,
    externalId: trade.externalId,
    notes: trade.notes,
  }));

  const result = await db.trade.createMany({ data, skipDuplicates: true });

  revalidatePath("/dashboard/trading/journal");

  const params = new URLSearchParams({
    imported: String(result.count),
    skipped: String(trades.length - result.count),
  });
  if (errors.length > 0) params.set("parseErrors", String(errors.length));

  redirect(`/dashboard/trading/journal?${params.toString()}`);
}

async function syncMissedSetupScreenshots(missedSetupId: string, formData: FormData): Promise<{ skipped: number }> {
  const deleteIds = formData.getAll("deleteScreenshotIds").map(String);
  if (deleteIds.length > 0) {
    const toDelete = await db.missedSetupScreenshot.findMany({ where: { id: { in: deleteIds }, missedSetupId } });
    await db.missedSetupScreenshot.deleteMany({ where: { id: { in: deleteIds }, missedSetupId } });
    await Promise.all(toDelete.map((screenshot) => del(screenshot.url).catch(() => {})));
  }

  const files = formData
    .getAll("screenshots")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let skipped = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_SCREENSHOT_BYTES) {
      skipped++;
      continue;
    }
    const blob = await put(`missed-setup-screenshots/${missedSetupId}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "private",
    });
    await db.missedSetupScreenshot.create({ data: { missedSetupId, url: blob.url } });
  }

  return { skipped };
}

export async function saveMissedSetup(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction")) as TradeDirection;
  const setupDescription = String(formData.get("setupDescription") ?? "").trim();
  const reasonSkipped = String(formData.get("reasonSkipped") ?? "").trim();
  const notes = formData.get("notes")?.toString().trim() || null;
  const seenAt = newYorkWallTimeToUtc(String(formData.get("seenAt")));

  const data = { symbol, direction, setupDescription, reasonSkipped, notes, seenAt };

  const missedSetup = id
    ? await db.missedSetup.update({ where: { id }, data })
    : await db.missedSetup.create({ data });

  await syncMissedSetupScreenshots(missedSetup.id, formData);

  revalidatePath("/dashboard/trading/journal");
  redirect("/dashboard/trading/journal?tab=potential");
}

export async function deleteMissedSetup(formData: FormData) {
  const id = String(formData.get("id"));

  // Cascade removes the MissedSetupScreenshot rows, but not the underlying
  // Blob files — clean those up explicitly first or they become orphaned
  // storage, same pattern as deleteTrade below.
  const screenshots = await db.missedSetupScreenshot.findMany({ where: { missedSetupId: id } });
  await db.missedSetup.delete({ where: { id } });
  await Promise.all(screenshots.map((screenshot) => del(screenshot.url).catch(() => {})));

  revalidatePath("/dashboard/trading/journal");
  redirect("/dashboard/trading/journal?tab=potential");
}

export async function deleteTrade(formData: FormData) {
  const id = String(formData.get("id"));

  // Cascade removes the TradeScreenshot rows, but not the underlying Blob
  // files — clean those up explicitly first or they become orphaned storage.
  const screenshots = await db.tradeScreenshot.findMany({ where: { tradeId: id } });
  await db.trade.delete({ where: { id } });
  await Promise.all(screenshots.map((screenshot) => del(screenshot.url).catch(() => {})));

  revalidatePath("/dashboard/trading/journal");
  redirect("/dashboard/trading/journal");
}
