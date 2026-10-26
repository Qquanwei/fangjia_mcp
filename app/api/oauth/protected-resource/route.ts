import { protectedResourceMetadata } from "@/lib/mcp-auth";
import { requestOrigin } from "@/lib/site";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

export function GET(request: Request) {
  const metadata = protectedResourceMetadata(requestOrigin(request));
  if (!metadata) {
    return Response.json({ error: "auth_not_configured" }, { status: 503 });
  }
  return Response.json(metadata, { headers });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, mcp-protocol-version",
    },
  });
}
