import { mcpResourceUrl, MENTOR_SCOPE } from "@/lib/mentor/oauth";

// The OAuth/MCP endpoints are called server-to-server by Claude, but browser-based
// tools (e.g. the MCP Inspector) need CORS to reach them.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...init.headers } });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function oauthError(error: string, description: string, status = 400): Response {
  return json({ error, error_description: description }, { status });
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [MENTOR_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Trading dashboard mentor",
  };
}
