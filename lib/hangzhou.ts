import { SOURCE } from "./source";

export type HousingRecord = {
  id: string;
  presalePermit: string;
  buildingNo: string | null;
  unitNo: string | null;
  roomNo: string | null;
  filingPriceCny: number | null;
  houseCode: string | null;
  sourceLoadedAt: string | null;
};

export class HangzhouApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "HangzhouApiError";
    this.code = code;
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function text(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function money(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function loadedAt(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(" ", "T").replace(/\.0$/, "");
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}+08:00`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function findArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record || depth > 3) return null;
  for (const key of ["data", "datas", "list", "records", "rows", "result"]) {
    const found = findArray(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function mapHousingRecord(value: unknown): HousingRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = text(row.ID ?? row.id);
  const presalePermit = text(row.YSZBH ?? row.presale_permit);
  if (!id || !presalePermit) return null;
  return {
    id,
    presalePermit,
    buildingNo: text(row.ZH ?? row.building_no),
    unitNo: text(row.DYH ?? row.unit_no),
    roomNo: text(row.FH ?? row.room_no),
    filingPriceCny: money(row.BAJG ?? row.filing_price_cny),
    houseCode: text(row.fwcode ?? row.house_code),
    sourceLoadedAt: loadedAt(row.load_time ?? row.source_loaded_at),
  };
}

export function parseGatewayPayload(payload: unknown): {
  records: HousingRecord[];
  total: number | null;
} {
  const root = asRecord(payload);
  let inner: unknown = root?.data ?? payload;
  if (typeof inner === "string") {
    try {
      inner = JSON.parse(inner) as unknown;
    } catch {
      throw new HangzhouApiError("网关 data 字段不是合法 JSON");
    }
  }

  const body = asRecord(inner) ?? root;
  if (!body) throw new HangzhouApiError("网关返回无法解析");

  const code = body.code == null ? undefined : String(body.code);
  const msg =
    text(body.msg) ?? text(body.message) ?? text(body.subMsg) ?? "";
  if (
    body.success === false ||
    code === "-2" ||
    msg.includes("没有此资源的权限")
  ) {
    throw new HangzhouApiError(msg || "没有此资源的权限，请申请", code);
  }

  const list = findArray(body) ?? [];
  return {
    records: list
      .map(mapHousingRecord)
      .filter((row): row is HousingRecord => row !== null),
    total:
      typeof body.total === "number"
        ? body.total
        : typeof body.totalCount === "number"
          ? body.totalCount
          : null,
  };
}

function secretBody(): JsonRecord {
  if (process.env.HZ_APP_SECRET) return { appSecret: process.env.HZ_APP_SECRET };
  if (process.env.HZ_USER_SECRET) {
    return { userSecret: process.env.HZ_USER_SECRET };
  }
  throw new HangzhouApiError(
    "未配置 HZ_APP_SECRET 或 HZ_USER_SECRET。请先在杭州市数据开放平台申请该接口。",
  );
}

export async function fetchHousingPage(
  pageNumber: number,
  pageSize: number,
): Promise<{ records: HousingRecord[]; total: number | null }> {
  const bizContent = JSON.stringify({
    ...secretBody(),
    pageNumber,
    pageSize,
  });
  const params = new URLSearchParams({
    app_id: SOURCE.appId,
    interface_id: SOURCE.interfaceId,
    version: SOURCE.version,
    charset: "utf-8",
    timestamp: Date.now().toString(),
    origin: "0",
    biz_content: bizContent,
  });

  const signResponse = await fetch(`${SOURCE.signUrl}?${params}`, {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!signResponse.ok) {
    throw new HangzhouApiError(`验签接口 HTTP ${signResponse.status}`);
  }
  const sign = (await signResponse.text()).trim().replace(/^"|"$/g, "");
  if (!sign) throw new HangzhouApiError("验签接口没有返回 sign");
  params.set("sign", sign);

  const gatewayResponse = await fetch(`${SOURCE.gateway}?${params}`, {
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!gatewayResponse.ok) {
    throw new HangzhouApiError(`数据接口 HTTP ${gatewayResponse.status}`);
  }
  return parseGatewayPayload((await gatewayResponse.json()) as unknown);
}
