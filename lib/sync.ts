import { fetchHousingPage, HangzhouApiError, type HousingRecord } from "./hangzhou";
import { SOURCE } from "./source";
import { requireSupabase } from "./supabase";

export type SyncReport = {
  status: "advanced" | "caught_up" | "error";
  pages: number;
  rows: number;
  nextPage: number;
  message: string;
};

function rowForInsert(record: HousingRecord) {
  return {
    id: record.id,
    presale_permit: record.presalePermit,
    building_no: record.buildingNo,
    unit_no: record.unitNo,
    room_no: record.roomNo,
    filing_price_cny: record.filingPriceCny,
    house_code: record.houseCode,
    source_loaded_at: record.sourceLoadedAt,
    synced_at: new Date().toISOString(),
  };
}

export async function syncBatch(options?: {
  maxPages?: number;
  fromStart?: boolean;
}): Promise<SyncReport> {
  const supabase = requireSupabase();
  const maxPages = options?.maxPages ?? Number(process.env.SYNC_MAX_PAGES ?? 20);
  const pageSize = Number(process.env.SYNC_PAGE_SIZE ?? 100);
  if (!Number.isFinite(maxPages) || maxPages < 1) {
    throw new Error("SYNC_MAX_PAGES 需要是正整数。");
  }
  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("SYNC_PAGE_SIZE 需要在 1 到 1000 之间。");
  }

  const existing = await supabase
    .from("sync_state")
    .select("next_page,rows_upserted,status")
    .eq("interface_id", SOURCE.interfaceId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  if (existing.data?.status === "caught_up" && !options?.fromStart) {
    return {
      status: "caught_up",
      pages: 0,
      rows: 0,
      nextPage: existing.data.next_page,
      message: "已经同步到最后一页。要重头刷新，请加上 --from-start。",
    };
  }

  let nextPage = options?.fromStart ? 1 : (existing.data?.next_page ?? 1);
  let rowsUpserted = options?.fromStart ? 0 : (existing.data?.rows_upserted ?? 0);
  let pages = 0;
  let rows = 0;

  const save = async (patch: {
    status: string;
    lastError?: string | null;
    lastSuccessAt?: string;
  }) => {
    const { error } = await supabase.from("sync_state").upsert(
      {
        interface_id: SOURCE.interfaceId,
        next_page: nextPage,
        page_size: pageSize,
        rows_upserted: rowsUpserted,
        status: patch.status,
        last_error: patch.lastError ?? null,
        last_success_at: patch.lastSuccessAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "interface_id" },
    );
    if (error) throw new Error(error.message);
  };

  try {
    while (pages < maxPages) {
      const page = await fetchHousingPage(nextPage, pageSize);
      if (page.records.length === 0) {
        await save({
          status: "caught_up",
          lastError: null,
          lastSuccessAt: new Date().toISOString(),
        });
        return {
          status: "caught_up",
          pages,
          rows,
          nextPage,
          message: "这一页没有记录，同步已到末尾。",
        };
      }

      const { error } = await supabase
        .from("housing_filings")
        .upsert(page.records.map(rowForInsert), { onConflict: "id" });
      if (error) throw new Error(error.message);

      pages += 1;
      rows += page.records.length;
      rowsUpserted += page.records.length;
      nextPage += 1;
      const caughtUp = page.records.length < pageSize;
      await save({
        status: caughtUp ? "caught_up" : "idle",
        lastError: null,
        lastSuccessAt: new Date().toISOString(),
      });
      if (caughtUp) {
        return {
          status: "caught_up",
          pages,
          rows,
          nextPage,
          message: `本页不足 ${pageSize} 条，同步已到末尾。`,
        };
      }
    }

    return {
      status: "advanced",
      pages,
      rows,
      nextPage,
      message: `本轮写入 ${rows} 条，下次从第 ${nextPage} 页继续。`,
    };
  } catch (error) {
    const message =
      error instanceof HangzhouApiError || error instanceof Error
        ? error.message
        : "同步失败";
    await save({ status: "error", lastError: message }).catch(() => undefined);
    return { status: "error", pages, rows, nextPage, message };
  }
}
