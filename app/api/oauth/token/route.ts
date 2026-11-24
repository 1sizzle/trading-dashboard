import { json, oauthError, preflight } from "@/lib/mentor/http";
import { issueTokens, mcpResourceUrl, originOf, pkceMatches, readClient, readCode, readRefresh } from "@/lib/mentor/oauth";

async function readParams(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return new URLSearchParams(Object.entries(body ?? {}).map(([k, v]) => [k, String(v)]));
  }
  return new URLSearchParams(await request.text());
}

export async function POST(request: Request) {
  const params = await readParams(request);
  const clientId = params.get("client_id");
  const client = await readClient(clientId);
  if (!client || !clientId) {
    return oauthError("invalid_client", "Unknown client", 401);
  }
  const aud = mcpResourceUrl(originOf(request));

  switch (params.get("grant_type")) {
    case "authorization_code": {
      const code = await readCode(params.get("code"));
      if (!code || code.clientId !== clientId) {
        return oauthError("invalid_grant", "Authorization code is invalid or expired");
      }
      if (params.get("redirect_uri") !== code.redirectUri) {
        return oauthError("invalid_grant", "redirect_uri does not match");
      }
      const verifier = params.get("code_verifier");
      if (!verifier || !(await pkceMatches(verifier, code.challenge))) {
        return oauthError("invalid_grant", "PKCE verification failed");
      }
      return json(await issueTokens(clientId, code.resource || aud));
    }
    case "refresh_token": {
      const refresh = await readRefresh(params.get("refresh_token"));
      if (!refresh || refresh.clientId !== clientId) {
        return oauthError("invalid_grant", "Refresh token is invalid or expired");
      }
      return json(await issueTokens(clientId, refresh.aud));
    }
    default:
      return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
  }
}

export const OPTIONS = preflight;
