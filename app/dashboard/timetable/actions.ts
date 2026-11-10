"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { dateInputToUtcMidnight } from "@/lib/finances/dates";
import { isDateString, parseColor, timeToMinutes } from "@/lib/timetable/constants";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Returns null when the submission is invalid. The form validates the same
// rules in the browser, so this only guards against hand-crafted requests.
function parseBlock(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const oneOff = formData.get("repeat") === "once";
  const dateValue = String(formData.get("date") ?? "").trim();
  const days = [
    ...new Set(
      formData
        .getAll("days")
        .map(Number)
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  ].sort();

  if (!title || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return null;
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return null;
  if (oneOff ? !isDateString(dateValue) : days.length === 0) return null;

  return {
    title,
    startTime,
    endTime,
    // A one-off block lives on its date alone; a weekly one has no date.
    days: oneOff ? [] : days,
    date: oneOff ? dateInputToUtcMidnight(dateValue) : null,
    note,
    color: parseColor(formData.get("color")),
  };
}

export async function addBlock(formData: FormData) {
  const data = parseBlock(formData);
  if (!data) return;
  await db.timetableBlock.create({ data });
  revalidatePath("/dashboard/timetable");
}

export async function updateBlock(formData: FormData) {
  const id = String(formData.get("id"));
  const data = parseBlock(formData);
  if (!data) return;
  await db.timetableBlock.update({ where: { id }, data });
  revalidatePath("/dashboard/timetable");
  redirect("/dashboard/timetable");
}

export async function deleteBlock(formData: FormData) {
  const id = String(formData.get("id"));
  await db.timetableBlock.delete({ where: { id } });
  revalidatePath("/dashboard/timetable");
  redirect("/dashboard/timetable");
}
