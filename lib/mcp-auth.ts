import { createSupabaseAuthClient } from "./supabase-auth";

export function authorizationServerIssuer() {
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/auth/v1`;
}

export function protectedResourceMetadata(origin: string) {
  const issuer = authorizationServerIssuer();
  if (!issuer) return null;
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile"],
    resource_name: "杭州商品住房备案价",
  };
}

export function resourceMetadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource/mcp`;
}

function authenticateHeader(origin: string, description: string) {
  return `Bearer error="invalid_token", error_description="${description}", resource_metadata="${resourceMetadataUrl(origin)}"`;
}

export function unauthorized(origin: string, description: string) {
  return Response.json(
    { error: "invalid_token", error_description: description },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": authenticateHeader(origin, description),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "WWW-Authenticate, mcp-session-id, mcp-protocol-version",
      },
    },
  );
}

export async function requireMcpUser(request: Request) {
  const origin = new URL(request.url).origin;
  const header = request.headers.get("authorization");
  if (!header) return { user: null, response: unauthorized(origin, "Missing Authorization header") };

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { user: null, response: unauthorized(origin, "Invalid Authorization header") };
  }

  const supabase = createSupabaseAuthClient();
  if (!supabase) {
    return {
      user: null,
      response: Response.json({ error: "auth_not_configured" }, { status: 503 }),
    };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, response: unauthorized(origin, "Invalid or expired token") };
    }
    return { user: data.user, response: null };
  } catch {
    return {
      user: null,
      response: Response.json({ error: "auth_unavailable" }, { status: 503 }),
    };
  }
}
