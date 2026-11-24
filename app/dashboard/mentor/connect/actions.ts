"use server";

import { redirect } from "next/navigation";
import { issueCode } from "@/lib/mentor/oauth";
import { parseAuthorizeRequest } from "./request";

export async function decide(formData: FormData) {
  const parsed = await parseAuthorizeRequest((key) => formData.get(key)?.toString());
  if (!parsed.ok) {
    redirect(`/dashboard/mentor/connect?error=${encodeURIComponent(parsed.error)}`);
  }
  const { request } = parsed;
  const target = new URL(request.redirectUri);
  if (formData.get("decision") === "allow") {
    target.searchParams.set(
      "code",
      await issueCode({
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        challenge: request.challenge,
        resource: request.resource,
      }),
    );
  } else {
    target.searchParams.set("error", "access_denied");
  }
  if (request.state) target.searchParams.set("state", request.state);
  redirect(target.toString());
}
