export const SOURCE = {
  name: "杭州市数据开放平台 · 商品住房一房一价信息",
  provider: "杭州市住房保障和房产管理局",
  apiPage:
    "https://data.hangzhou.gov.cn/dop/tpl/dataOpen/apiDetail.html?source_id=12831",
  interfaceId: "331111zjhzFN3mq20201024152710137829SynReq",
  gateway: "https://data.zjzwfw.gov.cn/interface/gateway.do",
  signUrl: "https://data.zjzwfw.gov.cn/jimp/sign/createsign.do",
  appId: "hzssjkfpt",
  version: "1.0.0",
} as const;

export const PRICE_NOTICE =
  "备案总价，单位是元。这条数据没有建筑面积，不能换算成单价，也不是网签成交价或二手房挂牌价。";
