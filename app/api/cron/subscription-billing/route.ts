import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "@/lib/core/auth";
import { postDueSubscriptions } from "@/lib/finances/subscription-billing";

// Called on a schedule by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await postDueSubscriptions();
  return NextResponse.json(result, { status: 200 });
}
