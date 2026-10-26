import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");
  if (typeof authorizationId !== "string" || !authorizationId) {
    return NextResponse.json({ error: "缺少 authorization_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const result =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        });

  if (result.error || !result.data?.redirect_url) {
    return NextResponse.json(
      { error: result.error?.message ?? "没有拿到跳转地址" },
      { status: 400 },
    );
  }

  // 303 把同意表单的 POST 改成 GET。默认 307 会把表单原样 POST 到客户端回调，回调只接受 GET。
  return NextResponse.redirect(result.data.redirect_url, 303);
}
