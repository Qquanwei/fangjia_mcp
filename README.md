# fangjia_mcp

杭州商品住房一房一价的免费 MCP。数据来自[杭州市数据开放平台](https://data.hangzhou.gov.cn/dop/tpl/dataOpen/apiDetail.html?source_id=12831)，由杭州市住保房管局提供。

价格字段是**备案总价（元）**。数据集没有建筑面积，不能换算成单价，也不是网签成交价。

## 架构

Agent 只访问本服务的 `/mcp`。浙江政务网关的密钥留在服务端，同步程序把分页结果写入 Supabase，查询不再打政务接口。

全量约 220 万条。首次同步在本机跑，靠 `sync_state.next_page` 断点续传。部署到 Vercel 之后，每天 UTC 18:00 的 Cron 只补 2 页。

## 准备

1. 在 Supabase 执行 `supabase/migrations/20261026160000_housing_filings.sql`。
2. 复制 `.env.example` 为 `.env.local`，填入 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。
3. 在杭州数据开放平台申请接口 `331111zjhzFN3mq20201024152710137829SynReq`，把 `HZ_APP_SECRET` 或 `HZ_USER_SECRET` 写入环境变量。未获批时网关返回「没有此资源的权限，请申请」。

## 命令

```bash
npm run dev
npm run check
npm run sync
npm run sync -- --from-start
```

`SYNC_MAX_PAGES` 默认 20，`SYNC_PAGE_SIZE` 默认 100。重复执行 `npm run sync`，直到状态变成 `caught_up`。

## 接入

```json
{
  "mcpServers": {
    "fangjia": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

工具：`dataset_status`、`search_filings`、`summarize_permit`。

## 上架

部署到 Vercel 后，把 `server.json` 里的远程地址改成线上 `/mcp`，再用官方 MCP Registry 的发布工具提交。命名空间 `cn.fangjia/housing-filings` 需要换成你已认领的发布者名称。
