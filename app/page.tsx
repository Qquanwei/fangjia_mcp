import { connection } from "next/server";
import { getDatasetStatus } from "@/lib/filings";
import { PRICE_NOTICE } from "@/lib/source";

const cursorConfig = `{
  "mcpServers": {
    "fangjia": {
      "type": "http",
      "url": "https://你的域名.vercel.app/mcp"
    }
  }
}`;

export default async function Home() {
  await connection();
  const status = await getDatasetStatus();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-zinc-500">免费 MCP · 杭州开放数据</p>
        <h1 className="text-3xl font-semibold tracking-tight">杭州商品住房备案价</h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          把杭州市住保房管局公开的一房一价数据同步到数据库，再通过 MCP 按预售证号查询和汇总。
          {PRICE_NOTICE}
        </p>
      </header>

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-base font-medium">当前数据</h2>
        <dl className="mt-3 grid gap-2 text-sm leading-6">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">数据库</dt>
            <dd>{status.configured ? "已配置" : "还没有配置 Supabase"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">已入库套数</dt>
            <dd>{status.rowCount ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">同步状态</dt>
            <dd>{status.syncStatus ?? "尚未同步"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">最近成功</dt>
            <dd>{status.lastSuccessAt ?? "—"}</dd>
          </div>
        </dl>
        {status.lastError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{status.lastError}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Agent 里的三个工具</h2>
        <ul className="list-disc pl-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          <li><code>dataset_status</code>：同步进度和来源说明</li>
          <li><code>search_filings</code>：按预售证号或房屋编码查备案记录</li>
          <li><code>summarize_permit</code>：一个预售证的套数和备案总价区间</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">接到 Cursor</h2>
        <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
          <code>{cursorConfig}</code>
        </pre>
        <p className="text-sm leading-6 text-zinc-500">
          本地调试把地址换成 <code>http://localhost:3000/mcp</code>。接口说明见{" "}
          <a className="underline" href={status.apiPage}>
            杭州市数据开放平台
          </a>
          。
        </p>
      </section>
    </main>
  );
}
