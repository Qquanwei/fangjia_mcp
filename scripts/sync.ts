import { syncBatch } from "../lib/sync";

const fromStart = process.argv.includes("--from-start");

const report = await syncBatch({ fromStart });
console.log(JSON.stringify(report, null, 2));
if (report.status === "error") process.exitCode = 1;
