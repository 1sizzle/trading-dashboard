import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/core/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/core/auth";

// Same private-Blob authenticated-proxy pattern as app/api/screenshots/[id]/route.ts,
// just pointed at MissedSetupScreenshot instead of TradeScreenshot.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(token);
  if (!isValid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const screenshot = await db.missedSetupScreenshot.findUnique({ where: { id } });
  if (!screenshot) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await get(screenshot.url, { access: "private" });
  if (!blob || !blob.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
