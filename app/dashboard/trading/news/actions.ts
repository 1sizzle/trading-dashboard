"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncNewsEvents } from "@/lib/trading/news-sync";

export async function syncNews(formData: FormData) {
  const result = await syncNewsEvents();
  const back = String(formData.get("back") ?? "/dashboard/trading/news");
  revalidatePath("/dashboard/trading/news");
  const target = back.startsWith("/dashboard/trading/news") ? back : "/dashboard/trading/news";
  const sep = target.includes("?") ? "&" : "?";
  redirect(result.ok ? `${target}${sep}synced=${result.synced}` : `${target}${sep}syncError=1`);
}
