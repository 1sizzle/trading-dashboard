"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, get, put } from "@vercel/blob";
import { db } from "@/lib/core/db";
import { newYorkWallTimeToUtc } from "@/lib/trading/calc";
import { GeminiConfigError, GeminiRateLimitError } from "@/lib/core/gemini";
import { analyzeMentorNoteImages } from "@/lib/trading/mentor-note-analysis";

const PATH = "/dashboard/trading/mentor-notes";
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES_PER_ANALYSIS = 4;

export async function saveMentorNote(formData: FormData) {
  const note = formData.get("note")?.toString().trim() || null;
  const postedAtRaw = formData.get("postedAt")?.toString().trim();
  const postedAt = postedAtRaw ? newYorkWallTimeToUtc(postedAtRaw) : new Date();

  const files = formData
    .getAll("screenshots")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0 && !note) {
    // Nothing to save — paste failed or the form was submitted empty.
    redirect(`${PATH}?error=empty`);
  }

  const entry = await db.mentorNote.create({ data: { note, postedAt } });

  let skipped = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_SCREENSHOT_BYTES) {
      skipped++;
      continue;
    }
    const blob = await put(`mentor-notes/${entry.id}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "private",
    });
    await db.mentorNoteScreenshot.create({ data: { mentorNoteId: entry.id, url: blob.url } });
  }

  revalidatePath(PATH);
  redirect(skipped > 0 ? `${PATH}?screenshotsSkipped=${skipped}` : PATH);
}

export async function analyzeMentorNote(formData: FormData) {
  const id = String(formData.get("id"));
  const note = await db.mentorNote.findUnique({
    where: { id },
    include: { screenshots: { take: MAX_IMAGES_PER_ANALYSIS, orderBy: { createdAt: "asc" } } },
  });
  if (!note) redirect(PATH);
  if (note.screenshots.length === 0) redirect(`${PATH}?error=no_screenshot`);

  try {
    const images = await Promise.all(
      note.screenshots.map(async (s) => {
        const blob = await get(s.url, { access: "private" });
        if (!blob?.stream) throw new Error(`Couldn't read stored screenshot ${s.id}`);
        const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
        return { mimeType: blob.blob.contentType || "image/png", data: buffer.toString("base64") };
      }),
    );

    const analysis = await analyzeMentorNoteImages(images, note.note);
    await db.mentorNote.update({ where: { id }, data: { analysis } });
  } catch (err) {
    // The friendly redirect param hides the real reason — log it server-side so
    // a genuine bug doesn't just look like "AI flaked" forever.
    console.error("analyzeMentorNote failed:", err);
    const message =
      err instanceof GeminiConfigError
        ? "ai_config"
        : err instanceof GeminiRateLimitError
          ? "ai_rate_limit"
          : "ai_failed";
    revalidatePath(PATH);
    redirect(`${PATH}?error=${message}`);
  }

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteMentorNote(formData: FormData) {
  const id = String(formData.get("id"));

  // Cascade removes the MentorNoteScreenshot rows, but not the underlying Blob
  // files — clean those up explicitly first or they become orphaned storage.
  const screenshots = await db.mentorNoteScreenshot.findMany({ where: { mentorNoteId: id } });
  await db.mentorNote.delete({ where: { id } });
  await Promise.all(screenshots.map((screenshot) => del(screenshot.url).catch(() => {})));

  revalidatePath(PATH);
  redirect(PATH);
}
