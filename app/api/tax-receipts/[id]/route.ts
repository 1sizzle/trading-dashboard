import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/core/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/core/auth";

// Receipts live in the private Blob store, so every view goes through this authenticated proxy.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const receipt = await db.taxReceipt.findUnique({ where: { id } });
  if (!receipt) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await get(receipt.url, { access: "private" });
  if (!blob || !blob.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": receipt.mimeType || blob.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
