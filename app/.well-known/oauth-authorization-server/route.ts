import { json, preflight } from "@/lib/mentor/http";
import { MENTOR_SCOPE, originOf } from "@/lib/mentor/oauth";

export async function GET(request: Request) {
  const origin = originOf(request);
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/dashboard/mentor/connect`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [MENTOR_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export const OPTIONS = preflight;
