import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { redirect } from "next/navigation";

const scopeLabels: Record<string, string> = {
  openid: "确认你的身份",
  email: "读取邮箱",
  profile: "读取昵称",
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const authorizationId = (await searchParams).authorization_id;
  if (!authorizationId) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16 text-sm">
        缺少授权请求。请从 Cursor 或其他 MCP 客户端重新连接。
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16 text-sm">
        {error?.message ?? "这个授权请求已经失效，请从客户端重新连接。"}
      </main>
    );
  }
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const scopes = data.scope?.split(" ").filter(Boolean) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">允许访问备案价数据</h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {data.client.name || "这个客户端"} 想以 {data.user.email || userData.user.email} 的身份调用 MCP。
        </p>
      </header>
      {scopes.length > 0 ? (
        <ul className="list-disc pl-5 text-sm leading-7">
          {scopes.map((scope) => (
            <li key={scope}>{scopeLabels[scope] ?? scope}</li>
          ))}
        </ul>
      ) : null}
      <form action="/api/oauth/decision" method="post" className="flex gap-3">
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-zinc-950"
        >
          允许
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="rounded-full border border-black/10 px-4 py-2.5 text-sm dark:border-white/15"
        >
          拒绝
        </button>
      </form>
    </main>
  );
}
