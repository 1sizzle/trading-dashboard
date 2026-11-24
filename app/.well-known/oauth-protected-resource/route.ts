import { json, preflight, protectedResourceMetadata } from "@/lib/mentor/http";
import { originOf } from "@/lib/mentor/oauth";

export async function GET(request: Request) {
  return json(protectedResourceMetadata(originOf(request)));
}

export const OPTIONS = preflight;
