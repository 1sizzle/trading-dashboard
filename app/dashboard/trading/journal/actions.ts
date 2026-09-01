"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { TradeDirection } from "@/lib/generated/prisma/client";
import { getPointValue } from "@/lib/trading/contracts";
import {
  calculateDurationMinutes,
  calculateFuturesMetalsPnl,
  calculateFuturesMetalsRisk,
  calculateRMultiple,
  detectSession,
  newYorkWallTimeToUtc,
} from "@/lib/trading/calc";
import { parseTradovatePerformanceCsv } from "@/lib/trading/csv";
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

export async function saveFuturesMetalsTrade(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction")) as TradeDirection;
  const entryPrice = Number(formData.get("entryPrice"));
  const exitPrice = Number(formData.get("exitPrice"));
  const positionSize = Number(formData.get("positionSize"));
  const stopLossRaw = formData.get("stopLoss")?.toString().trim();
  const stopLoss = stopLossRaw ? Number(stopLossRaw) : null;
  const notes = formData.get("notes")?.toString().trim() || null;

  const entryTime = newYorkWallTimeToUtc(String(formData.get("entryTime")));
  const exitTime = newYorkWallTimeToUtc(String(formData.get("exitTime")));

  const { pointValue, isKnown } = getPointValue(symbol);
  const pnl = calculateFuturesMetalsPnl(direction, entryPrice, exitPrice, positionSize, pointValue);
  const riskDollars =
    stopLoss !== null ? calculateFuturesMetalsRisk(entryPrice, stopLoss, positionSize, pointValue) : null;
  const rMultiple = calculateRMultiple(pnl, riskDollars);
  const durationMinutes = calculateDurationMinutes(entryTime, exitTime);
  const session = detectSession(entryTime);

  const data = {
    symbol,
    direction,
    assetClass: "FUTURES_METALS" as const,
    entryPrice,
    exitPrice,
    positionSize,
    stopLoss,
    riskDollars,
    entryTime,
    exitTime,
    pnl,
    rMultiple,
    durationMinutes,
    session,
    notes,
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
  const { skipped: screenshotsSkipped } = await syncTradeScreenshots(trade.id, formData);

  revalidatePath("/dashboard/trading/journal");

  const params = new URLSearchParams({ tab: "futures" });
  if (!isKnown) {
    params.set("warning", "unknown_symbol");
    params.set("symbol", symbol);
  }
  if (screenshotsSkipped > 0) params.set("screenshotsSkipped", String(screenshotsSkipped));

  redirect(`/dashboard/trading/journal?${params.toString()}`);
}

export async function saveCryptoTrade(formData: FormData) {
  const id = formData.get("id")?.toString() || null;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction")) as TradeDirection;
  const pnl = Number(formData.get("pnl"));
  const riskDollarsRaw = formData.get("riskDollars")?.toString().trim();
  const riskDollars = riskDollarsRaw ? Number(riskDollarsRaw) : null;
  const notes = formData.get("notes")?.toString().trim() || null;

  const entryTime = newYorkWallTimeToUtc(String(formData.get("entryTime")));
  const exitTime = newYorkWallTimeToUtc(String(formData.get("exitTime")));

  const rMultiple = calculateRMultiple(pnl, riskDollars);
  const durationMinutes = calculateDurationMinutes(entryTime, exitTime);
  const session = detectSession(entryTime);

  const data = {
    symbol,
    direction,
    assetClass: "CRYPTO" as const,
    entryPrice: null,
    exitPrice: null,
    positionSize: null,
    stopLoss: null,
    riskDollars,
    entryTime,
    exitTime,
    pnl,
    rMultiple,
    durationMinutes,
    session,
    notes,
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
  const { skipped: screenshotsSkipped } = await syncTradeScreenshots(trade.id, formData);

  revalidatePath("/dashboard/trading/journal");

  const params = new URLSearchParams({ tab: "crypto" });
  if (screenshotsSkipped > 0) params.set("screenshotsSkipped", String(screenshotsSkipped));

  redirect(`/dashboard/trading/journal?${params.toString()}`);
}

export async function importTradovateCsv(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/trading/journal?tab=futures&importError=no_file");
  }

  const text = await file.text();
  const { trades, errors } = parseTradovatePerformanceCsv(text);

  if (trades.length === 0) {
    const message = errors[0] ?? "No trade rows found in that file.";
    redirect(
      `/dashboard/trading/journal?tab=futures&importError=bad_format&importErrorMessage=${encodeURIComponent(message)}`,
    );
  }

  const unknownSymbols = Array.from(
    new Set(trades.filter((trade) => !trade.isKnownSymbol).map((trade) => trade.symbol)),
  );

  const data = trades.map((trade) => ({
    symbol: trade.symbol,
    direction: trade.direction,
    assetClass: "FUTURES_METALS" as const,
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
    tab: "futures",
    imported: String(result.count),
    skipped: String(trades.length - result.count),
  });
  if (unknownSymbols.length > 0) params.set("unknownSymbols", unknownSymbols.join(","));
  if (errors.length > 0) params.set("parseErrors", String(errors.length));

  redirect(`/dashboard/trading/journal?${params.toString()}`);
}

export async function deleteTrade(formData: FormData) {
  const id = String(formData.get("id"));
  const tab = String(formData.get("tab") ?? "futures");

  // Cascade removes the TradeScreenshot rows, but not the underlying Blob
  // files — clean those up explicitly first or they become orphaned storage.
  const screenshots = await db.tradeScreenshot.findMany({ where: { tradeId: id } });
  await db.trade.delete({ where: { id } });
  await Promise.all(screenshots.map((screenshot) => del(screenshot.url).catch(() => {})));

  revalidatePath("/dashboard/trading/journal");
  redirect(`/dashboard/trading/journal?tab=${tab}`);
}
