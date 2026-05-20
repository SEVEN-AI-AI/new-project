const API = "/api/ad-table";
const $ = (selector, parent = document) => parent.querySelector(selector);

const state = {
  products: [],
  months: [],
  product: "",
  month: "",
  columns: [],
  rows: [],
  dailyProfit: { products: [], rows: [] },
};

function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add("hidden"), 2800);
}

async function getJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function postForm(url, formData) {
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toNumber(value) {
  const n = Number(String(value || "").replace(/,/g, "").replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

function findColumn(names) {
  const keys = names.map(name => name.toLowerCase());
  return state.columns.find(col => {
    const header = String(col.header || "").toLowerCase();
    return keys.some(key => header.includes(key));
  });
}

function valueOf(row, col) {
  if (!col) return "";
  return row.values[String(col.index)] || "";
}

function isTextColumn(header) {
  return /问题|调整|动作|运营|感受|记录|关键词|排名|评论|备注|note|action|problem/i.test(header);
}

function isNumericLike(text) {
  return /^-?\d+(\.\d+)?%?$/.test(String(text || "").replace(/,/g, "").trim());
}

function renderTabs() {
  $("#product-tabs").innerHTML = state.products.length
    ? state.products.map(product =>
      `<button class="tab ${product === state.product ? "active" : ""}" data-product="${escapeHtml(product)}">${escapeHtml(product)}</button>`
    ).join("")
    : `<p class="hint">暂无产品型号。请先导入历史 Excel，或等待外部软件写入数据库。</p>`;

  $("#month-tabs").innerHTML = state.months.map(month =>
    `<button class="tab ${month === state.month ? "active" : ""}" data-month="${month}">${month}</button>`
  ).join("");

  $("#product-tabs").querySelectorAll("[data-product]").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.product = btn.dataset.product;
      await loadData();
    });
  });

  $("#month-tabs").querySelectorAll("[data-month]").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.month = btn.dataset.month;
      await loadData();
    });
  });
}

function renderSummary() {
  const spendCol = findColumn(["花费", "spend", "广告总和", "实际广告"]);
  const revenueCol = findColumn(["销售额", "收入", "revenue"]);
  const organicCol = findColumn(["自然销量"]);
  const adSalesCol = findColumn(["广告销量"]);

  const spend = state.rows.reduce((sum, row) => sum + toNumber(valueOf(row, spendCol)), 0);
  const revenue = state.rows.reduce((sum, row) => sum + toNumber(valueOf(row, revenueCol)), 0);
  const organic = state.rows.reduce((sum, row) => sum + toNumber(valueOf(row, organicCol)), 0);
  const adSales = state.rows.reduce((sum, row) => sum + toNumber(valueOf(row, adSalesCol)), 0);
  const acos = revenue > 0 ? spend / revenue : 0;

  $("#summary").innerHTML = [
    ["总广告花费", spend.toFixed(2)],
    ["总销售额", revenue.toFixed(2)],
    ["总销量", String(organic + adSales)],
    ["ACOS", `${(acos * 100).toFixed(2)}%`],
  ].map(([label, val]) => `<div class="kpi"><span>${label}</span><strong>${val}</strong></div>`).join("");
}

function renderDailyProfit() {
  const table = $("#daily-profit-table");
  const products = state.dailyProfit.products || [];
  const rows = state.dailyProfit.rows || [];

  if (!products.length || !rows.length) {
    table.innerHTML = `<tbody><tr><td class="empty">暂无每日盈利数据。需要各型号广告表中包含“自然销量”和“广告销量”字段。</td></tr></tbody>`;
    return;
  }

  const head = `<thead><tr><th>日期</th>${products.map(product => `<th>${escapeHtml(product)}</th>`).join("")}<th>合计</th></tr></thead>`;
  const body = `<tbody>${rows.map(row => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      ${products.map(product => `<td class="num">${toNumber(row.values?.[product]).toFixed(0)}</td>`).join("")}
      <td class="num"><strong>${toNumber(row.total).toFixed(0)}</strong></td>
    </tr>
  `).join("")}</tbody>`;
  table.innerHTML = head + body;
}

function renderTable() {
  $("#title").textContent = state.product && state.month
    ? `${state.product} / ${state.month} 月度广告数据表`
    : "月度广告数据表";
  $("#table-title").textContent = state.product || "广告表";
  $("#row-count").textContent = `${state.rows.length} 行`;

  if (!state.columns.length) {
    $("#ad-table").innerHTML = `<tbody><tr><td class="empty">暂无数据。请先导入历史 Excel，或由外部软件写入数据库。</td></tr></tbody>`;
    renderSummary();
    return;
  }

  const head = `<thead><tr>${state.columns.map(col => `<th>${escapeHtml(col.header)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${state.rows.map(row => `
    <tr data-id="${row.id}">
      ${state.columns.map(col => {
        const raw = row.values[String(col.index)] || "";
        const cls = `${isTextColumn(col.header) ? "text-col" : ""} ${isNumericLike(raw) ? "num" : ""}`.trim();
        return `<td class="${cls}" contenteditable="true" data-col="${col.index}">${escapeHtml(raw)}</td>`;
      }).join("")}
    </tr>
  `).join("")}</tbody>`;
  $("#ad-table").innerHTML = head + body;

  $("#ad-table").querySelectorAll("td[contenteditable]").forEach(td => {
    td.addEventListener("blur", async () => {
      const rowId = td.closest("tr").dataset.id;
      try {
        await getJson(`${API}/rows/${rowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ col: td.dataset.col, value: td.textContent.trim() }),
        });
      } catch (err) {
        toast(`保存失败：${err.message}`);
      }
    });
  });

  renderSummary();
}

async function loadMeta() {
  const meta = await getJson(`${API}/meta`);
  state.products = meta.products || [];
  state.months = meta.months || [];
  if (!state.product && state.products.length) state.product = state.products[0];
  if (!state.month && state.months.length) state.month = state.months[state.months.length - 1];
  renderTabs();
}

async function loadData() {
  renderTabs();
  if (!state.product || !state.month) {
    state.columns = [];
    state.rows = [];
    state.dailyProfit = { products: [], rows: [] };
    renderTable();
    renderDailyProfit();
    return;
  }

  const data = await getJson(`${API}/data?product=${encodeURIComponent(state.product)}&month=${encodeURIComponent(state.month)}`);
  state.columns = data.columns || [];
  state.rows = data.rows || [];
  state.dailyProfit = await getJson(`${API}/daily-profit?month=${encodeURIComponent(state.month)}`);
  renderTable();
  renderDailyProfit();
}

async function importExcel() {
  const btn = $("#import-btn");
  const file = $("#import-file").files[0];
  const path = $("#import-path").value.trim();
  if (!file && !path) {
    toast("请选择 Excel 文件，或填写完整路径");
    return;
  }

  btn.disabled = true;
  btn.textContent = "导入中...";
  try {
    let res;
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      res = await postForm(`${API}/import-file`, formData);
    } else {
      res = await getJson(`${API}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ path }),
      });
    }
    toast(`导入完成：${res.products.length} 个型号，${res.rows} 行`);
    state.product = "";
    state.month = res.month;
    await loadMeta();
    await loadData();
  } catch (err) {
    toast(`导入失败：${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "导入历史数据";
  }
}

$("#browse-file-btn").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", () => {
  const file = $("#import-file").files[0];
  $("#import-file-name").value = file ? file.name : "";
});
$("#import-btn").addEventListener("click", importExcel);

async function addProduct() {
  const fallbackMonth = state.month || state.months[state.months.length - 1] || new Date().toISOString().slice(0, 7);
  const product = prompt("请输入新增产品型号");
  if (!product || !product.trim()) return;
  const month = prompt("请输入要创建的月份，格式 YYYY-MM", fallbackMonth);
  if (!month || !/^\d{4}-\d{2}$/.test(month.trim())) {
    toast("月份格式必须是 YYYY-MM");
    return;
  }

  try {
    const res = await getJson(`${API}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ product: product.trim(), month: month.trim() }),
    });
    state.product = res.product;
    state.month = res.month;
    await loadMeta();
    await loadData();
    toast(`已新增型号：${res.product}`);
  } catch (err) {
    toast(`新增失败：${err.message}`);
  }
}

async function deleteProduct() {
  if (!state.product) {
    toast("请先选择要删除的产品型号");
    return;
  }
  if (!confirm(`确定删除型号 ${state.product}？该型号所有月份的广告表都会删除。`)) return;

  try {
    await getJson(`${API}/products/${encodeURIComponent(state.product)}`, { method: "DELETE" });
    const deleted = state.product;
    state.product = "";
    await loadMeta();
    await loadData();
    toast(`已删除型号：${deleted}`);
  } catch (err) {
    toast(`删除失败：${err.message}`);
  }
}

$("#add-product-btn").addEventListener("click", addProduct);
$("#delete-product-btn").addEventListener("click", deleteProduct);

(async function init() {
  try {
    await loadMeta();
    await loadData();
  } catch (err) {
    toast(err.message);
    renderTable();
  }
})();
