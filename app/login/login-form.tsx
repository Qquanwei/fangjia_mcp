"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";

export function LoginForm({
  url,
  anonKey,
  nextPath,
  initialError,
}: {
  url: string;
  anonKey: string;
  nextPath: string;
  initialError?: string;
}) {
  const supabase = createBrowserClient(url, anonKey);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);

  function readable(error: { message: string }) {
    const message = error.message.toLowerCase();
    if (message.includes("provider") || message.includes("not enabled")) {
      return "Google 登录还没在 Supabase 里打开。可以先用邮箱，或先配好 Google 客户端。";
    }
    return error.message;
  }

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }

  async function signInWithGoogle() {
    setPending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setMessage(readable(error));
      setPending(false);
    }
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setPending(false);
    if (error) {
      setMessage(readable(error));
      return;
    }
    setSent(true);
    setMessage("邮件已发出。点邮件里的链接继续；如果邮件里有 6 位验证码，填在下面。");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setPending(false);
    if (error) {
      setMessage(readable(error));
      return;
    }
    window.location.assign(nextPath);
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="rounded-full bg-zinc-950 px-4 py-2.5 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
      >
        使用 Google 登录
      </button>

      <form onSubmit={sent ? verifyCode : sendCode} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          邮箱
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            autoComplete="email"
          />
        </label>
        {sent ? (
          <label className="flex flex-col gap-1 text-sm">
            验证码
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded-xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-black/10 px-4 py-2.5 text-sm disabled:opacity-60 dark:border-white/15"
        >
          {sent ? "验证并继续" : "发送邮箱验证码"}
        </button>
      </form>

      {message ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p> : null}
    </div>
  );
}
