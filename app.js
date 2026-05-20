const baseShipments = [
  { id: "base-1", orderDate: "2026-01-22", platform: "美客多", store: "跨境1店", provider: "墨航", trackingNo: "MH26030216802", warehouseDate: "2026-01-22", departureDate: "2026-01-30", portArrivalDate: "2026-02-15", truckDate: "", overseasArrivalDate: "", promisedDays: 40, platformShipmentNo: "62495798", channel: "美转墨经济线 II类", pieces: 78, quantity: null, volume: 5.45, weight: 5.45, fee: null, remark: "" },
  { id: "base-2", orderDate: "2026-01-30", platform: "沃尔玛", store: "沃尔玛1店", provider: "纽酷国际", trackingNo: "20260130001", warehouseDate: "2026-01-31", departureDate: "", portArrivalDate: "2026-02-22", truckDate: "", overseasArrivalDate: "", promisedDays: 28, platformShipmentNo: "", channel: "全美25日达海派", pieces: 42, quantity: 504, volume: null, weight: null, fee: null, remark: "" },
  { id: "base-3", orderDate: "2026-01-22", platform: "美客多", store: "本土2店", provider: "铁盒子", trackingNo: "THZ26012169554", warehouseDate: "2026-01-22", departureDate: "2026-01-30", portArrivalDate: "2026-02-27", truckDate: "2026-02-28", overseasArrivalDate: "2026-03-09", promisedDays: 40, platformShipmentNo: "/", channel: "美转墨-普线S2", pieces: 84, volume: 5.45, weight: 1358.06, fee: 17985, remark: "" },
  { id: "base-4", orderDate: "2026-01-21", platform: "美客多", store: "本土2店", provider: "墨航", trackingNo: "MH26012067270", warehouseDate: "2026-01-21", departureDate: "2026-02-06", portArrivalDate: "2026-02-23", truckDate: "2026-03-09", overseasArrivalDate: "", promisedDays: 45, platformShipmentNo: "/", channel: "美转墨经济线 II类", pieces: 87, volume: 5.53, weight: 1462.99, fee: null, remark: "更换船司，晚一周开船，海运时效16-18天，整体时效不变" },
  { id: "base-5", orderDate: "2025-12-24", platform: "沃尔玛", store: "沃尔玛1店", provider: "皓鹏", trackingNo: "4447418WFA", warehouseDate: "2025-12-24", departureDate: "2026-01-01", portArrivalDate: "2026-01-15", truckDate: "2026-01-17", overseasArrivalDate: "2026-01-23", promisedDays: 27, platformShipmentNo: "/", channel: "合德海派限时达", pieces: 38, volume: 3.324, weight: 449.21, fee: 7270.5, remark: "" },
  { id: "base-6", orderDate: "2025-12-05", platform: "美客多", store: "/", provider: "铁盒子", trackingNo: "20251205001", warehouseDate: "2025-12-05", departureDate: "2025-12-11", portArrivalDate: "2025-12-27", truckDate: "2026-01-07", overseasArrivalDate: "2026-02-10", promisedDays: 40, platformShipmentNo: "/", channel: "美转墨-普线S2", pieces: 40, volume: 2.289, weight: 702.6, fee: 7488, remark: "圣诞节放假，时效延误7天\n转关后尾程派送预计15天到仓" },
  { id: "base-7", orderDate: "2025-11-25", platform: "美客多", store: "/", provider: "铁盒子", trackingNo: "55794052", warehouseDate: "2025-11-25", departureDate: "2025-12-06", portArrivalDate: "2025-12-26", truckDate: "2025-12-29", overseasArrivalDate: "2026-01-26", promisedDays: 40, platformShipmentNo: "/", channel: "美转墨-普线S2", pieces: 11, volume: 0.8, weight: 172.43, fee: 2680, remark: "圣诞节放假，时效延误7天\n转关后尾程派送预计15天到仓\n到仓时间预计2026/1/22已延误" },
  { id: "base-8", orderDate: "2025-10-16", platform: "沃尔玛", store: "沃尔玛1店", provider: "皓鹏", trackingNo: "2563903WFA", warehouseDate: "2025-10-16", departureDate: "2025-10-22", portArrivalDate: "2025-11-06", truckDate: "2025-11-12", overseasArrivalDate: "2025-11-18", promisedDays: 25, platformShipmentNo: "/", channel: "以星海派限时达", pieces: 9, volume: 1.135, weight: 161.88, fee: 2703, remark: "" },
  { id: "base-9", orderDate: "2025-10-15", platform: "美客多", store: "/", provider: "铁盒子", trackingNo: "53093833", warehouseDate: "2025-10-15", departureDate: "2025-10-24", portArrivalDate: "2025-11-04", truckDate: "2025-11-05", overseasArrivalDate: "2025-11-11", promisedDays: 18, platformShipmentNo: "/", channel: "美转墨-限时达S2", pieces: 10, volume: 0.66, weight: 154.69, fee: null, remark: "" },
  { id: "base-10", orderDate: "2025-10-03", platform: "沃尔玛", store: "/", provider: "皓鹏", trackingNo: "2248754WFA", warehouseDate: "2025-10-03", departureDate: "2025-10-08", portArrivalDate: "2025-10-21", truckDate: "2025-10-24", overseasArrivalDate: "2025-10-30", promisedDays: 31, platformShipmentNo: "/", channel: "COSCO海派经济线", pieces: 10, volume: 1.14, weight: 119.53, fee: 2392, remark: "" },
  { id: "base-11", orderDate: "2025-09-30", platform: "沃尔玛", store: "/", provider: "皓鹏", trackingNo: "2177626WFA", warehouseDate: "2025-09-30", departureDate: "2025-10-05", portArrivalDate: "2025-10-06", truckDate: "2025-10-09", overseasArrivalDate: "2025-10-11", promisedDays: null, platformShipmentNo: "/", channel: "美国空运带电/敏感-UPS派", pieces: 5, volume: 0.621, weight: 66.4, fee: 4720, remark: "" },
  { id: "base-12", orderDate: "2025-09-21", platform: "美客多", store: "/", provider: "墨航", trackingNo: "51783544", warehouseDate: "2025-09-21", departureDate: "2025-09-30", portArrivalDate: "2025-10-13", truckDate: "2025-10-23", overseasArrivalDate: "2025-11-14", promisedDays: 45, platformShipmentNo: "/", channel: "海派-美转墨", pieces: 42, volume: 2.2, weight: 570.7, fee: null, remark: "9月受台风影响，大船晚靠盐田\n11月墨西哥示威游行" },
  { id: "base-13", orderDate: "2025-09-12", platform: "美客多", store: "/", provider: "墨航", trackingNo: "51207489", warehouseDate: "2025-09-12", departureDate: "2025-09-26", portArrivalDate: "2025-10-14", truckDate: "2025-10-20", overseasArrivalDate: "2025-12-02", promisedDays: 45, platformShipmentNo: "/", channel: "海派-美转墨", pieces: 20, volume: 1.006, weight: 23, fee: null, remark: "9月受台风影响，大船晚靠盐田\n11月墨西哥示威游行" }
];

const costRows = [
  { platform: "沃尔玛", provider: "纽酷国际", channel: "全美25日达海派", no: "20260130001", boxes: 42, chargeWeight: 920, qty: 504, totalCost: 9146, avgCost: 18.1468253968254, usd: 2.59240362811791, status: "在途" },
  { platform: "沃尔玛", provider: "皓鹏", channel: "合德海派限时达", no: "HPT11718880", boxes: 38, chargeWeight: 555, qty: 304, totalCost: 7270.5, avgCost: 23.9161184210526, usd: 3.41658834586466, status: "完成" },
  { platform: "沃尔玛", provider: "皓鹏", channel: "以星海派限时达", no: "HPT11609979", boxes: 9, chargeWeight: 190, qty: 125, totalCost: 2703, avgCost: 21.624, usd: 3.08914285714286, status: "完成" },
  { platform: "沃尔玛", provider: "皓鹏", channel: "COSCO海派经济线", no: "HPT11594356", boxes: 10, chargeWeight: 191, qty: 90, totalCost: 2392, avgCost: 26.5777777777778, usd: 3.7968253968254, status: "完成" },
  { platform: "沃尔玛", provider: "皓鹏", channel: "美国空运带电/敏感-UPS派", no: "2177626WFA", boxes: 5, chargeWeight: 100, qty: 70, totalCost: 4720, avgCost: 67.4285714285714, usd: 9.63265306122449, status: "完成" },
  { platform: "美客多", provider: "邑通达", channel: "墨西哥-空运", no: "K2025090902", boxes: 22, chargeWeight: 22, qty: 70, totalCost: 2306, avgCost: 32.9428571428571, usd: 4.70612244897959, status: "完成" },
  { platform: "美客多", provider: "墨航", channel: "墨西哥-空运", no: "51207489", boxes: 23, chargeWeight: 23, qty: 77, totalCost: 2415.9, avgCost: 31.3753246753247, usd: 4.4821892393321, status: "完成" },
  { platform: "美客多", provider: "墨航", channel: "普线", no: "MH25091365466", boxes: 20, chargeWeight: 1.06, qty: 150, totalCost: 3606, avgCost: 24.04, usd: 3.43428571428571, status: "完成" },
  { platform: "美客多", provider: "墨航", channel: "普线", no: "MH25092281016", boxes: 42, chargeWeight: 2.26, qty: 244, totalCost: 7708, avgCost: 31.5901639344262, usd: 4.51288056206089, status: "完成" },
  { platform: "美客多", provider: "墨航", channel: "普线", no: "MH26012067270", boxes: 87, chargeWeight: 5.53, qty: 1030, totalCost: 18802, avgCost: 18.2543689320388, usd: 2.60776699029126, status: "在途" },
  { platform: "美客多", provider: "铁盒子", channel: "普线", no: "THZ26012169554", boxes: 84, chargeWeight: 5.45, qty: 638, totalCost: 17985, avgCost: 28.1896551724138, usd: 4.02709359605911, status: "在途" },
  { platform: "美客多", provider: "铁盒子", channel: "普线", no: "THZ25112598159", boxes: 11, chargeWeight: 0.8, qty: 816, totalCost: 2640, avgCost: 3.23529411764706, usd: 0.46218487394958, status: "在途" },
  { platform: "美客多", provider: "铁盒子", channel: "普线", no: "THZ25120553209", boxes: 40, chargeWeight: 2.34, qty: 532, totalCost: 7722, avgCost: 14.515037593985, usd: 2.07357679914071, status: "在途" },
  { platform: "美客多", provider: "铁盒子", channel: "限时达", no: "THZ25101529287", boxes: 10, chargeWeight: 0.66, qty: 520, totalCost: 3300, avgCost: 6.34615384615385, usd: 0.906593406593407, status: "完成" }
];

const storageKey = "logistics.customShipments.v2";
const editedBaseKey = "logistics.editedBaseShipments.v1";
const deletedBaseKey = "logistics.deletedBaseShipments.v1";
const $ = (selector) => document.querySelector(selector);
const keyOf = (value) => String(value ?? "").trim().toLowerCase();
const fmtMoney = (value) => value == null || value === "" ? "-" : `¥${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
const fmtNum = (value, digits = 1) => value == null || Number.isNaN(Number(value)) ? "-" : Number(value).toFixed(digits);
const fmtDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN") : "-";
const sum = (items) => items.map(Number).filter(Number.isFinite).reduce((a, b) => a + b, 0);
const avg = (items) => {
  const nums = items.map(Number).filter(Number.isFinite);
  return nums.length ? sum(nums) / nums.length : null;
};
const dayDiff = (start, end) => {
  if (!start || !end) return null;
  const diff = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
};

let customShipments = JSON.parse(localStorage.getItem(storageKey) || "[]");
let editedBaseShipments = JSON.parse(localStorage.getItem(editedBaseKey) || "[]");
let deletedBaseShipments = JSON.parse(localStorage.getItem(deletedBaseKey) || "[]");
const costByNo = new Map(costRows.map((row) => [keyOf(row.no), row]));

function rawShipments() {
  const deletedIds = new Set(deletedBaseShipments);
  const editedMap = new Map(editedBaseShipments.map((row) => [row.id, row]));
  return [...baseShipments.filter((row) => !deletedIds.has(row.id)).map((row) => editedMap.get(row.id) || row), ...customShipments];
}

function enrich(row) {
  const cost = costByNo.get(keyOf(row.trackingNo));
  const waitDays = dayDiff(row.warehouseDate, row.departureDate);
  const firstLegDays = dayDiff(row.departureDate, row.portArrivalDate);
  const transferDays = dayDiff(row.portArrivalDate, row.truckDate);
  const lastMileDays = dayDiff(row.truckDate, row.overseasArrivalDate);
  const fromDepartureDays = dayDiff(row.departureDate, row.overseasArrivalDate);
  const totalDays = dayDiff(row.warehouseDate, row.overseasArrivalDate);
  const promisedDays = row.promisedDays === "" || row.promisedDays == null ? null : Number(row.promisedDays);
  const diff = totalDays != null && Number.isFinite(promisedDays) ? totalDays - promisedDays : null;
  let status = "normal";
  if (diff != null && diff > 0) status = "delayed";
  if (!row.overseasArrivalDate && Number.isFinite(promisedDays)) status = "risk";
  const costTotal = cost?.totalCost ?? row.fee;
  const quantity = row.quantity ?? cost?.qty ?? null;
  const avgCost = costTotal != null && quantity ? costTotal / quantity : null;
  return { ...row, waitDays, firstLegDays, transferDays, lastMileDays, fromDepartureDays, totalDays, promisedDays, diff, status, cost, costTotal, avgCost };
}

function shipments() {
  return rawShipments().map(enrich);
}

function filterState() {
  return {
    platform: $("#platform-filter").value,
    store: $("#store-filter").value,
    provider: $("#provider-filter").value,
    status: $("#status-filter").value,
    search: keyOf($("#global-search").value),
  };
}

function searchContext() {
  const search = filterState().search;
  if (!search) return { search, shipmentMatches: [], costMatches: [], shipmentIds: new Set(), costNos: new Set() };
  const allShipments = shipments();
  const directShipment = allShipments.filter((row) => keyOf(row.trackingNo).includes(search));
  const directCost = costRows.filter((row) => keyOf(row.no).includes(search));
  const isRelated = (shipment, cost) => {
    const exactNo = keyOf(shipment.trackingNo) === keyOf(cost.no);
    const sameProvider = keyOf(shipment.provider) === keyOf(cost.provider);
    const sameCost = shipment.costTotal != null && Number(shipment.costTotal) === Number(cost.totalCost);
    const channelA = keyOf(shipment.channel);
    const channelB = keyOf(cost.channel);
    const closeChannel = channelA && channelB && (channelA.includes(channelB) || channelB.includes(channelA));
    const sameBoxes = shipment.pieces != null && Number(shipment.pieces) === Number(cost.boxes);
    return exactNo || (sameProvider && (sameCost || (closeChannel && sameBoxes)));
  };
  const relatedShipments = [
    ...directShipment,
    ...allShipments.filter((shipment) => directCost.some((cost) => isRelated(shipment, cost))),
  ];
  const relatedCosts = [
    ...directCost,
    ...costRows.filter((cost) => directShipment.some((shipment) => isRelated(shipment, cost))),
  ];
  return {
    search,
    shipmentMatches: relatedShipments,
    costMatches: relatedCosts,
    shipmentIds: new Set(relatedShipments.map((row) => row.id)),
    costNos: new Set(relatedCosts.map((row) => keyOf(row.no))),
  };
}

function rowTextMatch(row, search, fields) {
  if (!search) return true;
  return fields.some((field) => keyOf(row[field]).includes(search));
}

function filteredShipments() {
  const state = filterState();
  const ctx = searchContext();
  return shipments().filter((row) => {
    const searchMatch = !state.search
      || (ctx.shipmentIds.size ? ctx.shipmentIds.has(row.id) : rowTextMatch(row, state.search, ["trackingNo", "platform", "provider", "channel", "store"]));
    return searchMatch
      && (state.platform === "all" || row.platform === state.platform || row.cost?.platform === state.platform)
      && (state.store === "all" || row.store === state.store)
      && (state.provider === "all" || row.provider === state.provider)
      && (state.status === "all" || row.status === state.status);
  });
}

function filteredCosts() {
  const state = filterState();
  const ctx = searchContext();
  const shipmentNosForStore = state.store === "all" ? null : new Set(shipments().filter((row) => row.store === state.store).map((row) => keyOf(row.trackingNo)));
  return costRows.filter((row) => {
    const searchMatch = !state.search
      || (ctx.costNos.size ? ctx.costNos.has(keyOf(row.no)) : rowTextMatch(row, state.search, ["no", "platform", "provider", "channel"]));
    const statusMatch = state.status === "all"
      || (state.status === "risk" && row.status === "在途")
      || (state.status === "normal" && row.status === "完成")
      || (state.status === "delayed" && false);
    return searchMatch
      && (state.platform === "all" || row.platform === state.platform)
      && (state.provider === "all" || row.provider === state.provider)
      && (shipmentNosForStore == null || shipmentNosForStore.has(keyOf(row.no)))
      && statusMatch;
  });
}

function costRecordsFromShipments(rows) {
  return rows.map((shipment) => {
    const totalCost = shipment.costTotal;
    const quantity = shipment.quantity ?? shipment.cost?.qty ?? null;
    const avgCost = totalCost != null && quantity ? totalCost / quantity : null;
    return {
      status: shipment.overseasArrivalDate ? "完成" : shipment.status === "delayed" ? "延误" : "在途",
      no: shipment.trackingNo,
      platform: shipment.platform,
      provider: shipment.provider,
      channel: shipment.channel || shipment.cost?.channel || "-",
      pieces: shipment.pieces ?? shipment.cost?.boxes ?? null,
      qty: quantity,
      volume: shipment.volume,
      weight: shipment.weight,
      totalCost,
      avgCost,
      usd: shipment.cost?.usd ?? (avgCost == null ? null : avgCost / 7),
      source: shipment.cost ? "费用表匹配" : shipment.fee != null ? "物流时效费用" : "待补费用",
    };
  });
}

function statusPill(status) {
  if (status === "delayed") return `<span class="pill danger">已延误</span>`;
  if (status === "risk") return `<span class="pill warn">在途风险</span>`;
  return `<span class="pill ok">正常</span>`;
}

function renderTable(target, headers, rows) {
  const head = `<thead><tr>${headers.map((h) => `<th>${h.label}</th>`).join("")}</tr></thead>`;
  const body = rows.map((row) => `<tr>${headers.map((h) => `<td>${h.render(row)}</td>`).join("")}</tr>`).join("");
  $(target).innerHTML = `${head}<tbody>${body || `<tr><td colspan="${headers.length}" class="muted">没有符合条件的数据</td></tr>`}</tbody>`;
}

function groupBy(items, keyFn) {
  return items.reduce((map, item) => {
    const key = keyFn(item) || "未填写";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
}

function providerStats(rows = shipments()) {
  return [...groupBy(rows, (r) => r.provider).entries()].map(([name, list]) => ({
    name,
    count: list.length,
    avgDays: avg(list.map((r) => r.totalDays)),
    avgCost: avg(list.map((r) => r.avgCost)),
    delayed: list.filter((r) => r.status === "delayed").length,
    risk: list.filter((r) => r.status === "risk").length,
    onTimeRate: list.length ? list.filter((r) => r.status === "normal").length / list.length * 100 : 0,
  }));
}

function channelStats(rows = filteredCosts()) {
  return [...groupBy(rows, (r) => r.channel).entries()].map(([name, list]) => ({ name, avgCost: avg(list.map((r) => r.avgCost)), totalCost: sum(list.map((r) => r.totalCost)), count: list.length })).sort((a, b) => b.avgCost - a.avgCost);
}

function renderBars(target, rows, valueKey, suffix, className = "") {
  const max = Math.max(...rows.map((r) => r[valueKey] || 0), 1);
  $(target).innerHTML = rows.length ? rows.map((row, index) => `
    <div class="bar-row">
      <div class="bar-meta"><strong><i class="rank-dot">${index + 1}</i>${row.name}</strong><span class="bar-value">${fmtNum(row[valueKey])}<small>${suffix}</small></span></div>
      <div class="bar-track"><div class="bar-fill ${className}" style="width:${Math.max(5, (row[valueKey] || 0) / max * 100)}%"></div></div>
    </div>
  `).join("") : `<p class="muted">没有符合条件的数据</p>`;
}

function renderKpis(rows, costs) {
  const completed = rows.filter((r) => r.overseasArrivalDate);
  $("#kpi-grid").innerHTML = [
    ["▦", "物流票数", rows.length, `完成 ${completed.length} 票，在途 ${rows.length - completed.length} 票`],
    ["◷", "平均全链路时效", `${fmtNum(avg(completed.map((r) => r.totalDays)))} 天`, "按已到仓票计算"],
    ["¥", "头程费用合计", fmtMoney(sum(rows.map((r) => r.costTotal))), `匹配费用 ${rows.filter((r) => r.costTotal != null).length} 票`],
    ["!", "延误/风险", `${rows.filter((r) => r.status === "delayed").length}/${rows.filter((r) => r.status === "risk").length}`, "超承诺为延误，未到仓为风险"],
  ].map(([icon, label, value, note]) => `
    <div class="kpi">
      <div class="kpi-icon" aria-hidden="true">${icon}</div>
      <div class="kpi-copy">
        <span>${label}</span>
        <strong>${value}</strong>
        <small>${note}</small>
      </div>
    </div>
  `).join("");

  $("#cost-kpis").innerHTML = [
    ["头程总费用", fmtMoney(sum(costs.map((r) => r.totalCost))), "当前筛选下的费用"],
    ["平均单件头程费", `¥${fmtNum(avg(costs.map((r) => r.avgCost)), 2)}`, "当前筛选下的均值"],
    ["在途费用", fmtMoney(sum(costs.filter((r) => r.status === "在途").map((r) => r.totalCost))), "状态为在途的费用"],
  ].map(([label, value, note]) => `<div class="kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
}

function timelineCell(row) {
  const box = (label, value, extra = "") => `<div class="time-box ${extra}"><strong>${value == null ? "--" : value}</strong><span>${label}</span></div>`;
  return `<div class="timeline-cell"><div class="timeline-grid">
    ${box("等船", row.waitDays)}
    ${box("头程", row.firstLegDays)}
    ${box("转换", row.transferDays)}
    ${box("尾程", row.lastMileDays)}
    ${box("开船后", row.fromDepartureDays)}
    ${box("全链路", row.totalDays, `total ${row.status === "delayed" ? "delayed" : ""}`)}
  </div></div>`;
}

function platformStoreCell(row) {
  return `<div class="platform-store-cell stack-cell"><strong>${row.platform || "-"}</strong><span>${row.store || "-"}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function dateRangeCell(row) {
  return `<div class="date-stack-cell stack-cell"><span>${fmtDate(row.warehouseDate)}</span><span class="muted">${fmtDate(row.overseasArrivalDate)}</span></div>`;
}

function promiseDiffCell(row) {
  const promise = row.promisedDays == null ? "-" : `${row.promisedDays} 天`;
  const diff = row.diff == null ? "-" : `${row.diff > 0 ? "+" : ""}${row.diff} 天`;
  const diffClass = row.diff > 0 ? "pill danger" : "diff-muted";
  return `<div class="promise-diff-cell stack-cell"><span>${promise}</span><span class="${diffClass}">${diff}</span></div>`;
}

function remarkCell(row) {
  const remark = String(row.remark ?? "").trim();
  if (!remark) return "-";
  const safe = escapeHtml(remark);
  return `<span class="remark-cell" tabindex="0"><span class="remark-preview">${safe}</span><span class="remark-pop">${safe.replace(/\n/g, "<br>")}</span></span>`;
}

const shipmentHeaders = [
  { label: "状态", render: (r) => statusPill(r.status) },
  { label: "单号", render: (r) => `<button class="link-btn" type="button" data-edit-id="${r.id}">${r.trackingNo}</button>` },
  { label: "平台/店铺", render: platformStoreCell },
  { label: "服务商", render: (r) => r.provider },
  { label: "渠道", render: (r) => r.channel || "-" },
  { label: "时间链路(天)", render: timelineCell },
  { label: "送仓/到仓", render: dateRangeCell },
  { label: "承诺/差异", render: promiseDiffCell },
  { label: "费用", render: (r) => fmtMoney(r.costTotal) },
];

function renderAll() {
  const rows = filteredShipments();
  const costs = costRecordsFromShipments(rows);
  renderKpis(rows, costs);
  renderBars("#provider-bars", providerStats(rows).filter((r) => r.avgDays != null).sort((a, b) => a.avgDays - b.avgDays), "avgDays", " 天");
  renderBars("#channel-bars", channelStats(costs).slice(0, 6), "avgCost", " 元/件", "cost");

  const priority = [...rows].sort((a, b) => ((b.status === "delayed" ? 3 : b.status === "risk" ? 2 : 0) * 1000 + (b.costTotal || 0) / 100) - ((a.status === "delayed" ? 3 : a.status === "risk" ? 2 : 0) * 1000 + (a.costTotal || 0) / 100)).slice(0, 8);
  renderTable("#priority-table", shipmentHeaders, priority);
  renderTable("#tracking-table", shipmentHeaders.concat([
    { label: "备注", render: remarkCell },
    { label: "操作", render: (r) => `<button class="danger-link-btn" type="button" data-delete-id="${r.id}" data-delete-no="${r.trackingNo}">删除</button>` },
  ]), rows);
  bindEditButtons();
  bindDeleteButtons();

  renderTable("#cost-table", [
    { label: "状态", render: (r) => `<span class="pill ${r.status === "完成" ? "ok" : "warn"}">${r.status}</span>` },
    { label: "单号", render: (r) => r.no },
    { label: "平台", render: (r) => r.platform },
    { label: "服务商", render: (r) => r.provider },
    { label: "渠道", render: (r) => r.channel },
    { label: "送仓件数", render: (r) => r.pieces ?? "-" },
    { label: "总数量", render: (r) => r.qty },
    { label: "体积(CBM)", render: (r) => r.volume ?? "-" },
    { label: "实重(KG)", render: (r) => r.weight ?? "-" },
    { label: "头程费用", render: (r) => fmtMoney(r.totalCost) },
    { label: "平均头程费", render: (r) => `¥${fmtNum(r.avgCost, 2)}` },
    { label: "美金", render: (r) => `$${fmtNum(r.usd, 2)}` },
    { label: "费用来源", render: (r) => r.source },
  ], costs);

  renderTable("#provider-table", [
    { label: "服务商", render: (r) => r.name },
    { label: "票数", render: (r) => r.count },
    { label: "平均时效", render: (r) => r.avgDays == null ? "-" : `${fmtNum(r.avgDays)} 天` },
    { label: "平均单件费", render: (r) => r.avgCost == null ? "-" : `¥${fmtNum(r.avgCost, 2)}` },
    { label: "延误票", render: (r) => r.delayed },
    { label: "在途风险", render: (r) => r.risk },
    { label: "正常率", render: (r) => `${fmtNum(r.onTimeRate)}%` },
  ], providerStats(rows).sort((a, b) => (a.avgDays ?? 999) - (b.avgDays ?? 999)));

  const alerts = rows.filter((r) => r.status !== "normal");
  $("#alert-list").innerHTML = alerts.length ? alerts.map((r) => `
    <article class="alert-card ${r.status === "delayed" ? "danger" : ""}">
      <h4>${r.provider} · ${r.trackingNo} · ${r.channel || "-"}</h4>
      <p>${r.status === "delayed" ? `全链路实际 ${r.totalDays} 天，服务商承诺 ${r.promisedDays} 天，超出 ${r.diff} 天。` : `该票尚未海外仓到货，服务商承诺 ${r.promisedDays ?? "-"} 天，需要继续跟进节点。`}</p>
      <p class="muted">送仓 ${fmtDate(r.warehouseDate)}，到港 ${fmtDate(r.portArrivalDate)}，费用 ${fmtMoney(r.costTotal)}</p>
      ${r.remark ? `<p>${r.remark.replace(/\n/g, "<br>")}</p>` : ""}
    </article>
  `).join("") : `<p class="muted">当前筛选下没有延误或风险票。</p>`;
}

function updateDatalists() {
  const allShipments = shipments();
  const setOptions = (id, values) => {
    $(id).innerHTML = [...new Set(values.filter(Boolean))].sort().map((value) => `<option value="${value}"></option>`).join("");
  };
  setOptions("#platform-options", [...allShipments.map((r) => r.platform), ...costRows.map((r) => r.platform)]);
  setOptions("#provider-options", [...allShipments.map((r) => r.provider), ...costRows.map((r) => r.provider)]);
  setOptions("#store-options", allShipments.map((r) => r.store));
  setOptions("#channel-options", [...allShipments.map((r) => r.channel), ...costRows.map((r) => r.channel)]);
}

function initFilters() {
  const allShipments = shipments();
  const platforms = [...new Set([...allShipments.map((r) => r.platform), ...costRows.map((r) => r.platform)].filter(Boolean))].sort();
  const providers = [...new Set([...allShipments.map((r) => r.provider), ...costRows.map((r) => r.provider)].filter(Boolean))].sort();
  const currentPlatform = $("#platform-filter").value || "all";
  const currentStore = $("#store-filter").value || "all";
  const currentProvider = $("#provider-filter").value || "all";
  $("#platform-filter").innerHTML = `<option value="all">全部平台</option>${platforms.map((p) => `<option value="${p}">${p}</option>`).join("")}`;
  $("#platform-filter").value = platforms.includes(currentPlatform) ? currentPlatform : "all";
  const storeSource = allShipments.filter((row) => $("#platform-filter").value === "all" || row.platform === $("#platform-filter").value || row.cost?.platform === $("#platform-filter").value);
  const stores = [...new Set(storeSource.map((r) => r.store).filter(Boolean))].sort();
  $("#store-filter").innerHTML = `<option value="all">全部店铺</option>${stores.map((s) => `<option value="${s}">${s}</option>`).join("")}`;
  $("#provider-filter").innerHTML = `<option value="all">全部服务商</option>${providers.map((p) => `<option value="${p}">${p}</option>`).join("")}`;
  $("#store-filter").value = stores.includes(currentStore) ? currentStore : "all";
  $("#provider-filter").value = providers.includes(currentProvider) ? currentProvider : "all";
  updateDatalists();
}

function computedFromData(data) {
  const result = {
    waitDays: dayDiff(data.warehouseDate, data.departureDate),
    firstLegDays: dayDiff(data.departureDate, data.portArrivalDate),
    transferDays: dayDiff(data.portArrivalDate, data.truckDate),
    lastMileDays: dayDiff(data.truckDate, data.overseasArrivalDate),
    fromDepartureDays: dayDiff(data.departureDate, data.overseasArrivalDate),
    totalDays: dayDiff(data.warehouseDate, data.overseasArrivalDate),
  };
  const promised = data.promisedDays === "" ? null : Number(data.promisedDays);
  result.diff = result.totalDays != null && Number.isFinite(promised) ? result.totalDays - promised : null;
  return result;
}

function formDataObject() {
  return Object.fromEntries(new FormData($("#shipment-form")).entries());
}

function formValues() {
  const data = formDataObject();
  return {
    id: data.recordId || `custom-${Date.now()}`,
    orderDate: data.orderDate,
    platform: data.platform.trim(),
    store: data.store.trim(),
    provider: data.provider.trim(),
    trackingNo: data.trackingNo.trim(),
    platformShipmentNo: data.platformShipmentNo.trim(),
    channel: data.channel.trim(),
    shipmentStatus: data.shipmentStatus,
    warehouseDate: data.warehouseDate,
    departureDate: data.departureDate,
    portArrivalDate: data.portArrivalDate,
    truckDate: data.truckDate,
    overseasArrivalDate: data.overseasArrivalDate,
    promisedDays: data.promisedDays === "" ? null : Number(data.promisedDays),
    pieces: data.pieces === "" ? null : Number(data.pieces),
    quantity: data.quantity === "" ? null : Number(data.quantity),
    volume: data.volume === "" ? null : Number(data.volume),
    weight: data.weight === "" ? null : Number(data.weight),
    fee: data.fee === "" ? null : Number(data.fee),
    remark: data.remark,
  };
}

function renderFormCalc() {
  const calc = computedFromData(formDataObject());
  const put = (id, value) => { $(id).textContent = value == null ? "--" : `${value}天`; };
  put("#calc-wait", calc.waitDays);
  put("#calc-first", calc.firstLegDays);
  put("#calc-transfer", calc.transferDays);
  put("#calc-last", calc.lastMileDays);
  put("#calc-from-departure", calc.fromDepartureDays);
  put("#calc-total", calc.totalDays);
  $("#calc-diff").textContent = calc.diff == null ? "--" : `${calc.diff > 0 ? "+" : ""}${calc.diff}天`;
}

function fillForm(row) {
  const form = $("#shipment-form");
  Object.entries(row).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value ?? "";
  });
  form.elements.recordId.value = row.id;
  $("#save-btn").textContent = "保存修改";
  $("#cancel-edit").style.display = "inline-flex";
  renderFormCalc();
  switchView("create");
}

function resetEditMode() {
  $("#shipment-form").reset();
  $("#shipment-form").elements.recordId.value = "";
  $("#save-btn").textContent = "保存记录";
  $("#cancel-edit").style.display = "none";
  renderFormCalc();
}

function setupInlineClearButtons() {
  document.querySelectorAll("#shipment-form label > input:not([type='hidden']), #shipment-form label > select, #shipment-form label > textarea").forEach((field) => {
    if (field.closest(".date-control") || field.closest(".inline-clear")) return;
    const wrap = document.createElement("span");
    wrap.className = "inline-clear";
    field.parentNode.insertBefore(wrap, field);
    wrap.appendChild(field);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "×";
    button.dataset.clear = field.name;
    button.setAttribute("aria-label", `清空${field.name}`);
    wrap.appendChild(button);
  });
}

let activeDateInput = null;
let pickerMonth = new Date();

function dateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function setupDatePicker() {
  const popover = document.createElement("div");
  popover.className = "date-popover";
  popover.hidden = true;
  document.body.appendChild(popover);

  function renderPicker() {
    if (!activeDateInput) return;
    const selected = activeDateInput.value ? new Date(`${activeDateInput.value}T00:00:00`) : null;
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    popover.innerHTML = `
      <div class="date-popover-head">
        <strong>${year}年${month + 1}月</strong>
        <div class="date-nav">
          <button type="button" data-month="-1">‹</button>
          <button type="button" data-month="1">›</button>
        </div>
      </div>
      <div class="date-week">${["日", "一", "二", "三", "四", "五", "六"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="date-grid">
        ${days.map((day) => {
          const value = dateValue(day);
          const muted = day.getMonth() !== month ? "is-muted" : "";
          const picked = selected && value === dateValue(selected) ? "is-selected" : "";
          return `<button type="button" class="date-day ${muted} ${picked}" data-date="${value}">${day.getDate()}</button>`;
        }).join("")}
      </div>
      <div class="date-actions">
        <button type="button" data-date-clear>清空</button>
        <button type="button" data-date-today>今天</button>
      </div>
    `;
  }

  function openPicker(input) {
    activeDateInput = input;
    pickerMonth = input.value ? new Date(`${input.value}T00:00:00`) : new Date();
    renderPicker();
    const rect = input.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 380);
    popover.style.left = `${Math.max(12, left)}px`;
    popover.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 360)}px`;
    popover.hidden = false;
  }

  document.querySelectorAll("[data-date-input]").forEach((input) => {
    input.addEventListener("click", () => openPicker(input));
    input.addEventListener("focus", () => openPicker(input));
  });

  popover.addEventListener("click", (event) => {
    const monthChange = event.target.dataset.month;
    const pickedDate = event.target.dataset.date;
    if (monthChange) {
      pickerMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + Number(monthChange), 1);
      renderPicker();
      return;
    }
    if (pickedDate && activeDateInput) {
      activeDateInput.value = pickedDate;
      popover.hidden = true;
      renderFormCalc();
      return;
    }
    if (event.target.dataset.dateToday !== undefined && activeDateInput) {
      activeDateInput.value = dateValue(new Date());
      popover.hidden = true;
      renderFormCalc();
      return;
    }
    if (event.target.dataset.dateClear !== undefined && activeDateInput) {
      activeDateInput.value = "";
      popover.hidden = true;
      renderFormCalc();
    }
  });

  document.addEventListener("click", (event) => {
    if (!popover.hidden && !popover.contains(event.target) && !event.target.matches("[data-date-input]")) {
      popover.hidden = true;
    }
  });
}

function bindEditButtons() {
  document.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rawShipments().find((item) => item.id === button.dataset.editId);
      if (row) fillForm(row);
    });
  });
}

function bindDeleteButtons() {
  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const no = button.dataset.deleteNo || "该记录";
      if (!window.confirm(`确认删除 ${no} 吗？`)) return;
      deleteRecord(button.dataset.deleteId);
      resetEditMode();
      initFilters();
      renderAll();
    });
  });
}

function saveRecord(record) {
  if (record.id.startsWith("base-")) {
    editedBaseShipments = editedBaseShipments.filter((row) => row.id !== record.id).concat(record);
    localStorage.setItem(editedBaseKey, JSON.stringify(editedBaseShipments));
  } else {
    const exists = customShipments.some((row) => row.id === record.id);
    customShipments = exists ? customShipments.map((row) => row.id === record.id ? record : row) : [record, ...customShipments];
    localStorage.setItem(storageKey, JSON.stringify(customShipments));
  }
}

function deleteRecord(id) {
  if (id.startsWith("base-")) {
    if (!deletedBaseShipments.includes(id)) deletedBaseShipments = deletedBaseShipments.concat(id);
    editedBaseShipments = editedBaseShipments.filter((row) => row.id !== id);
    localStorage.setItem(deletedBaseKey, JSON.stringify(deletedBaseShipments));
    localStorage.setItem(editedBaseKey, JSON.stringify(editedBaseShipments));
  } else {
    customShipments = customShipments.filter((row) => row.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(customShipments));
  }
}

function switchView(view) {
  document.querySelectorAll(".nav-btn").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".view").forEach((item) => item.classList.toggle("active", item.id === view));
  $("#back-to-list").hidden = view !== "create";
  $("#view-title").textContent = {
    dashboard: "全链路经营总览",
    create: "创建货件",
    tracking: "物流时效追踪",
    costs: "头程费用核算",
    providers: "服务商表现分析",
    alerts: "延误预警中心",
  }[view];
}

document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => {
  if (btn.dataset.view === "create" && !$("#shipment-form").elements.recordId.value) resetEditMode();
  switchView(btn.dataset.view);
}));
document.querySelectorAll("[data-view-target]").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.viewTarget)));
["#store-filter", "#provider-filter", "#status-filter"].forEach((id) => {
  $(id).addEventListener("input", renderAll);
  $(id).addEventListener("change", renderAll);
});
$("#platform-filter").addEventListener("input", () => {
  initFilters();
  renderAll();
});
$("#platform-filter").addEventListener("change", () => {
  initFilters();
  renderAll();
});
$("#global-search").addEventListener("input", renderAll);
$("#shipment-form").addEventListener("input", renderFormCalc);
$("#shipment-form").addEventListener("reset", () => setTimeout(renderFormCalc, 0));
$("#shipment-form").addEventListener("click", (event) => {
  const todayName = event.target.dataset.today;
  const clearName = event.target.dataset.clear;
  if (todayName) $("#shipment-form").elements[todayName].value = new Date().toISOString().slice(0, 10);
  if (clearName) {
    const field = $("#shipment-form").elements[clearName];
    if (field.tagName === "SELECT") field.selectedIndex = 0;
    else field.value = "";
  }
  if (todayName || clearName) renderFormCalc();
});
$("#cancel-edit").addEventListener("click", resetEditMode);
$("#shipment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveRecord(formValues());
  resetEditMode();
  initFilters();
  renderAll();
  switchView("tracking");
});

setupInlineClearButtons();
setupDatePicker();
initFilters();
resetEditMode();
renderAll();









