import { syncBatch } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const report = await syncBatch({ maxPages: 2 });
    const status = report.status === "error" ? 502 : 200;
    return Response.json(report, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    return Response.json({ status: "error", message }, { status: 500 });
  }
}
