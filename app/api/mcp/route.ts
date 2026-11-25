import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SERVER_INSTRUCTIONS } from "@/lib/mentor/brief";
import { CORS_HEADERS, json, preflight } from "@/lib/mentor/http";
import { mcpResourceUrl, originOf, readAccessToken, resourceMetadataUrl } from "@/lib/mentor/oauth";
import { registerMentorTools } from "@/lib/mentor/tools";

// Remote MCP server for the Claude mentor connector (Streamable HTTP, stateless:
// a fresh server per request, JSON responses, no sessions).
export const maxDuration = 60;

async function authorized(request: Request): Promise<Response | null> {
  const origin = originOf(request);
  if (await readAccessToken(request.headers.get("authorization"), mcpResourceUrl(origin))) {
    return null;
  }
  return json(
    { error: "invalid_token", error_description: "Sign in to the trading dashboard to use this connector." },
    {
      status: 401,
      headers: { "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl(origin)}"` },
    },
  );
}

export async function POST(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;

  const server = new McpServer(
    { name: "trading-dashboard-mentor", title: "Trading mentor", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerMentorTools(server, origin);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

// Stateless server: no server-initiated SSE stream and no sessions to delete.
async function notAllowed(request: Request) {
  const denied = await authorized(request);
  if (denied) return denied;
  return new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

export const GET = notAllowed;
export const DELETE = notAllowed;
export const OPTIONS = preflight;
