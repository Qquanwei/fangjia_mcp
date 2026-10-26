import assert from "node:assert/strict";
import { HangzhouApiError, parseGatewayPayload } from "../lib/hangzhou";

const denied = {
  code: 200,
  msg: "",
  data: JSON.stringify({
    msg: "没有此资源的权限，请申请",
    code: "-2",
    success: false,
  }),
};

assert.throws(
  () => parseGatewayPayload(denied),
  (error: unknown) =>
    error instanceof HangzhouApiError && error.message.includes("没有此资源的权限"),
);

const accepted = parseGatewayPayload({
  code: 200,
  data: JSON.stringify({
    success: true,
    code: "00",
    total: 1,
    data: [
      {
        YSZBH: "2014000026",
        ZH: "1",
        DYH: "1",
        FH: "302",
        BAJG: "894323",
        ID: 930567330100,
        load_time: "2025-11-02 18:28:18.0",
        fwcode: "10140256",
      },
    ],
  }),
});

assert.equal(accepted.records.length, 1);
assert.equal(accepted.records[0]?.presalePermit, "2014000026");
assert.equal(accepted.records[0]?.filingPriceCny, 894323);
assert.equal(accepted.records[0]?.sourceLoadedAt, "2025-11-02T10:28:18.000Z");
assert.equal(accepted.total, 1);
console.log("parse-check ok");
