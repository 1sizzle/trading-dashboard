import { headers } from "next/headers";
import { isAllowedRedirect, mcpResourceUrl, readClient, type ClientPayload } from "@/lib/mentor/oauth";

export interface AuthorizeRequest {
  clientId: string;
  client: ClientPayload;
  redirectUri: string;
  state: string | null;
  challenge: string;
  resource: string;
}

export async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Validates an OAuth authorize request. Used both to render the consent page and
// again when the form is submitted - the submitted values are never trusted as-is.
export async function parseAuthorizeRequest(
  get: (key: string) => string | null | undefined,
): Promise<{ ok: true; request: AuthorizeRequest } | { ok: false; error: string }> {
  if (get("response_type") !== "code") return { ok: false, error: "Unsupported response_type." };
  const clientId = get("client_id") ?? "";
  const client = await readClient(clientId);
  if (!client) return { ok: false, error: "Unknown client - remove the connector in Claude and add it again." };
  const redirectUri = get("redirect_uri") ?? client.redirectUris[0];
  if (!redirectUri || !client.redirectUris.includes(redirectUri) || !isAllowedRedirect(redirectUri)) {
    return { ok: false, error: "That redirect address isn't allowed." };
  }
  const challenge = get("code_challenge");
  if (!challenge || get("code_challenge_method") !== "S256") {
    return { ok: false, error: "PKCE (S256) is required." };
  }
  const expected = mcpResourceUrl(await currentOrigin());
  const resource = get("resource") || expected;
  if (resource !== expected) return { ok: false, error: "This sign-in is for a different server." };
  return { ok: true, request: { clientId, client, redirectUri, state: get("state") ?? null, challenge, resource } };
}
