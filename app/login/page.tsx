import { LoginForm } from "./login-form";
import { supabasePublicConfig } from "@/lib/supabase-auth";
import { safeNextPath } from "@/lib/site";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "/");
  const config = supabasePublicConfig();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">登录后才能使用这个 MCP</h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          使用 Google 或邮箱。登录完成后会回到授权页面。
        </p>
      </header>
      {config ? (
        <LoginForm
          url={config.url}
          anonKey={config.key}
          nextPath={nextPath}
          initialError={params.error}
        />
      ) : (
        <p className="text-sm text-red-600">Supabase 公开密钥还没有配置。</p>
      )}
    </main>
  );
}
