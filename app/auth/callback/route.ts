import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { safeNextPath } from "@/lib/site";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const login = new URL("/login", url.origin);
  login.searchParams.set("next", next);
  login.searchParams.set("error", "登录没有完成，请重试。");
  return NextResponse.redirect(login);
}
