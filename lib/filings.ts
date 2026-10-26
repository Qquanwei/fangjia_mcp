import { PRICE_NOTICE, SOURCE } from "./source";
import { getSupabase } from "./supabase";

export type DatasetStatus = {
  configured: boolean;
  rowCount: number | null;
  syncStatus: string | null;
  nextPage: number | null;
  rowsUpserted: number | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  notice: string;
  source: string;
  provider: string;
  apiPage: string;
};

export type FilingRow = {
  id: string;
  presale_permit: string;
  building_no: string | null;
  unit_no: string | null;
  room_no: string | null;
  filing_price_cny: number | null;
  house_code: string | null;
  source_loaded_at: string | null;
};

const emptyStatus = (lastError: string | null, configured: boolean): DatasetStatus => ({
  configured,
  rowCount: null,
  syncStatus: null,
  nextPage: null,
  rowsUpserted: null,
  lastSuccessAt: null,
  lastError,
  notice: PRICE_NOTICE,
  source: SOURCE.name,
  provider: SOURCE.provider,
  apiPage: SOURCE.apiPage,
});

export async function getDatasetStatus(): Promise<DatasetStatus> {
  const supabase = getSupabase();
  if (!supabase) return emptyStatus(null, false);

  const [countResult, stateResult] = await Promise.all([
    supabase.from("housing_filings").select("id", { count: "exact", head: true }),
    supabase
      .from("sync_state")
      .select("status,next_page,rows_upserted,last_success_at,last_error")
      .eq("interface_id", SOURCE.interfaceId)
      .maybeSingle(),
  ]);

  const error = countResult.error?.message ?? stateResult.error?.message ?? null;
  const state = stateResult.data;
  return {
    configured: true,
    rowCount: countResult.count,
    syncStatus: state?.status ?? null,
    nextPage: state?.next_page ?? null,
    rowsUpserted: state?.rows_upserted ?? null,
    lastSuccessAt: state?.last_success_at ?? null,
    lastError: error ?? state?.last_error ?? null,
    notice: PRICE_NOTICE,
    source: SOURCE.name,
    provider: SOURCE.provider,
    apiPage: SOURCE.apiPage,
  };
}

export async function searchFilings(input: {
  presalePermit?: string;
  houseCode?: string;
  buildingNo?: string;
  unitNo?: string;
  roomNo?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}): Promise<{ total: number | null; rows: FilingRow[] }> {
  const presalePermit = input.presalePermit?.trim();
  const houseCode = input.houseCode?.trim();
  if (!presalePermit && !houseCode) {
    throw new Error("请提供预售证号或房屋编码。");
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error("数据库还没有配置。");

  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const offset = Math.max(input.offset ?? 0, 0);
  let query = supabase
    .from("housing_filings")
    .select(
      "id,presale_permit,building_no,unit_no,room_no,filing_price_cny,house_code,source_loaded_at",
      { count: "exact" },
    );

  if (presalePermit) query = query.eq("presale_permit", presalePermit);
  if (houseCode) query = query.eq("house_code", houseCode);
  if (input.buildingNo?.trim()) query = query.eq("building_no", input.buildingNo.trim());
  if (input.unitNo?.trim()) query = query.eq("unit_no", input.unitNo.trim());
  if (input.roomNo?.trim()) query = query.eq("room_no", input.roomNo.trim());
  if (input.priceMin != null) query = query.gte("filing_price_cny", input.priceMin);
  if (input.priceMax != null) query = query.lte("filing_price_cny", input.priceMax);

  const { data, count, error } = await query
    .order("filing_price_cny", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { total: count, rows: (data ?? []) as FilingRow[] };
}

export async function summarizePermit(presalePermit: string): Promise<{
  presalePermit: string;
  unitCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
}> {
  const permit = presalePermit.trim();
  if (!permit) throw new Error("请提供预售证号。");
  const supabase = getSupabase();
  if (!supabase) throw new Error("数据库还没有配置。");

  const { data, error } = await supabase.rpc("summarize_presale_permit", {
    permit,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    presalePermit: permit,
    unitCount: Number(row?.unit_count ?? 0),
    minPrice: row?.min_price ?? null,
    maxPrice: row?.max_price ?? null,
    avgPrice: row?.avg_price ?? null,
  };
}
