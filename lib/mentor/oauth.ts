// Minimal OAuth 2.1 authorization server for the Claude mentor connector (MCP).
//
// Single-user and stateless: client registrations, authorization codes, and
// access/refresh tokens are all HMAC-signed JSON, keyed off SESSION_SECRET (via a
// separate derived key, so none of them can ever pass as a dashboard session
// cookie). Nothing is stored in the database. To revoke every connector token at
// once, bump TOKEN_KEY_VERSION and redeploy.
//
// Only Claude's own OAuth callback URLs may register, so a token can't be
// phished out to some other client, and PKCE (S256) is required on every code.

const TOKEN_KEY_VERSION = "mcp-oauth-v1";
const ACCESS_TTL_S = 60 * 60; // 1 hour
const REFRESH_TTL_S = 90 * 24 * 60 * 60; // 90 days
const CODE_TTL_S = 5 * 60;

export const MENTOR_SCOPE = "mentor";

const ALLOWED_REDIRECTS = new Set([
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
]);

export function isAllowedRedirect(uri: string): boolean {
  if (ALLOWED_REDIRECTS.has(uri)) return true;
  // Local MCP Inspector / testing only.
  return process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(uri);
}

type TokenType = "client" | "code" | "access" | "refresh";

interface BasePayload {
  typ: TokenType;
  exp?: number; // unix seconds
}

export interface ClientPayload extends BasePayload {
  typ: "client";
  name: string;
  redirectUris: string[];
}

export interface CodePayload extends BasePayload {
  typ: "code";
  clientId: string;
  redirectUri: string;
  challenge: string;
  resource: string;
}

export interface AccessPayload extends BasePayload {
  typ: "access";
  aud: string;
  scope: string;
}

export interface RefreshPayload extends BasePayload {
  typ: "refresh";
  clientId: string;
  aud: string;
}

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

let keyPromise: Promise<CryptoKey> | null = null;

async function signingKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const secret = process.env.SESSION_SECRET;
      if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
      const master = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const derived = await crypto.subtle.sign("HMAC", master, encoder.encode(TOKEN_KEY_VERSION));
      return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    })();
  }
  return keyPromise;
}

async function sign<T extends BasePayload>(payload: T, ttlSeconds?: number): Promise<string> {
  const body = ttlSeconds ? { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds } : payload;
  const data = base64url(encoder.encode(JSON.stringify(body)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(data)));
  return `${data}.${base64url(sig)}`;
}

async function verify<T extends BasePayload>(token: string | null | undefined, typ: TokenType): Promise<T | null> {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    Buffer.from(sig, "base64url"),
    encoder.encode(data),
  );
  if (!ok) return null;
  let payload: T;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.typ !== typ) return null;
  if (payload.exp !== undefined && payload.exp < Date.now() / 1000) return null;
  return payload;
}

export const registerClient = (name: string, redirectUris: string[]) =>
  sign<ClientPayload>({ typ: "client", name, redirectUris });
export const readClient = (clientId: string | null | undefined) => verify<ClientPayload>(clientId, "client");

export const issueCode = (p: Omit<CodePayload, "typ" | "exp">) => sign<CodePayload>({ typ: "code", ...p }, CODE_TTL_S);
export const readCode = (code: string | null | undefined) => verify<CodePayload>(code, "code");

export async function issueTokens(clientId: string, aud: string) {
  return {
    access_token: await sign<AccessPayload>({ typ: "access", aud, scope: MENTOR_SCOPE }, ACCESS_TTL_S),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_S,
    refresh_token: await sign<RefreshPayload>({ typ: "refresh", clientId, aud }, REFRESH_TTL_S),
    scope: MENTOR_SCOPE,
  };
}
export const readRefresh = (token: string | null | undefined) => verify<RefreshPayload>(token, "refresh");

export async function readAccessToken(authorization: string | null, aud: string): Promise<AccessPayload | null> {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  const payload = await verify<AccessPayload>(match?.[1], "access");
  return payload && payload.aud === aud ? payload : null;
}

export async function pkceMatches(verifier: string, challenge: string): Promise<boolean> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)));
  return base64url(digest) === challenge;
}

// The public origin the request came in on (Vercel sets x-forwarded-* headers).
export function originOf(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export const mcpResourceUrl = (origin: string) => `${origin}/api/mcp`;
export const resourceMetadataUrl = (origin: string) => `${origin}/.well-known/oauth-protected-resource/api/mcp`;
