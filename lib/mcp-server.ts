import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getDatasetStatus, searchFilings, summarizePermit } from "./filings";
import { PRICE_NOTICE, SOURCE } from "./source";

function textResult(value: unknown, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "查询失败";
  return textResult({ error: message, notice: PRICE_NOTICE }, true);
}

export function createMcpServer() {
  const server = new McpServer(
    { name: "fangjia-mcp", version: "0.1.0" },
    {
      instructions: `查询${SOURCE.name}。${PRICE_NOTICE} 数据由服务端同步进数据库后再查询，回答时带上 dataset_status 里的同步时间。`,
    },
  );

  server.registerTool(
    "dataset_status",
    {
      title: "数据集状态",
      description:
        "查看杭州商品住房一房一价数据是否已配置、已同步多少套、最近一次同步时间和来源说明。",
      inputSchema: {},
    },
    async () => textResult(await getDatasetStatus()),
  );

  server.registerTool(
    "search_filings",
    {
      title: "查询备案房源",
      description:
        "按预售证号或房屋编码查询商品住房备案记录。价格是备案总价（元），不是单价，也不是成交价。预售证号和房屋编码至少填一个。",
      inputSchema: {
        presale_permit: z.string().optional().describe("预售证号，例如 2014000026"),
        house_code: z.string().optional().describe("房屋编码"),
        building_no: z.string().optional().describe("幢号"),
        unit_no: z.string().optional().describe("单元号"),
        room_no: z.string().optional().describe("房号"),
        price_min: z.number().optional().describe("备案总价下限，单位元"),
        price_max: z.number().optional().describe("备案总价上限，单位元"),
        limit: z.number().int().min(1).max(50).optional().describe("返回条数，最多 50"),
        offset: z.number().int().min(0).optional().describe("偏移量"),
      },
    },
    async (input) => {
      try {
        const result = await searchFilings({
          presalePermit: input.presale_permit,
          houseCode: input.house_code,
          buildingNo: input.building_no,
          unitNo: input.unit_no,
          roomNo: input.room_no,
          priceMin: input.price_min,
          priceMax: input.price_max,
          limit: input.limit,
          offset: input.offset,
        });
        return textResult({ notice: PRICE_NOTICE, source: SOURCE.name, ...result });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "summarize_permit",
    {
      title: "汇总预售证备案价",
      description:
        "统计一个预售证下的套数，以及备案总价的最低、最高和平均。平均的是每套备案总价，不是每平方米单价。",
      inputSchema: {
        presale_permit: z.string().describe("预售证号"),
      },
    },
    async ({ presale_permit }) => {
      try {
        const summary = await summarizePermit(presale_permit);
        return textResult({ notice: PRICE_NOTICE, source: SOURCE.name, ...summary });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
