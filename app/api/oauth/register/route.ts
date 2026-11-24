import { json, oauthError, preflight } from "@/lib/mentor/http";
import { isAllowedRedirect, registerClient } from "@/lib/mentor/oauth";

// Dynamic Client Registration (RFC 7591). Claude registers itself here when the
// connector is added; only Claude's callback URLs are accepted.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const redirectUris: unknown = body?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string")) {
    return oauthError("invalid_redirect_uri", "redirect_uris is required");
  }
  const rejected = redirectUris.filter((u) => !isAllowedRedirect(u));
  if (rejected.length > 0) {
    return oauthError("invalid_redirect_uri", `Redirect URI not allowed: ${rejected.join(", ")}`);
  }
  const name = typeof body?.client_name === "string" ? body.client_name.slice(0, 100) : "Claude";
  const clientId = await registerClient(name, redirectUris);
  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}

export const OPTIONS = preflight;
