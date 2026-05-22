/**
 * 美客多广告管理系统 - 前端逻辑
 * 视图切换、API调用、Dashboard、SKU明细、周报分析、数据管理
 */

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const API = '/api';

const profitColumns = [
  { label: '\u65e5\u671f', render: r => `<td><strong>${Utils.fmtDate(r.date)}</strong></td>` },
  { label: 'SKU', render: r => `<td><strong>${r.sku}</strong></td>` },
  { label: '\u603b\u8ba2\u5355\u91cf', className: 'num-cell', render: r => `<td class="num-cell">${Utils.fmtNum(r.quantity)}</td>` },
  { label: '\u5355\u4ef6\u5229\u6da6', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="unit_profit"><span class="cell-value">${Number(r.unit_profit || 0).toFixed(4)}</span></td>` },
  { label: '\u5229\u6da6\u603b\u989d(US)', className: 'num-cell', render: r => `<td class="num-cell">${Utils.fmtNum(r.gross_profit, 2)}</td>` },
  { label: '\u5e7f\u544a\u8d39(US)', className: 'num-cell', render: r => `<td class="num-cell">${Utils.fmtNum(r.ad_spend, 2)}</td>` },
  { label: '\u76c8\u4e8f(US)', className: 'num-cell', render: r => `<td class="num-cell ${Number(r.net_profit || 0) < 0 ? 'danger-text' : ''}">${Utils.fmtNum(r.net_profit, 2)}</td>` },
];

const detailColumns = [
  { label: '\u65e5\u671f', render: r => `<td><strong>${Utils.fmtDate(r.date)}</strong></td>` },
  { label: '\u66dd\u5149', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="impressions"><span class="cell-value">${Utils.fmtNum(r.impressions)}</span></td>` },
  { label: '\u70b9\u51fb', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="clicks"><span class="cell-value">${Utils.fmtNum(r.clicks)}</span></td>` },
  { label: '\u70b9\u51fb\u7387', className: 'num-cell calc-cell', render: r => `<td class="num-cell calc-cell metric-cell good-metric">${Utils.fmtPct(Utils.calcCTR(r.clicks, r.impressions))}</td>` },
  { label: '\u8f6c\u5316\u7387', className: 'num-cell calc-cell', render: r => `<td class="num-cell calc-cell metric-cell good-metric">${Utils.fmtPct(Utils.calcCVR(r.ad_sales, r.clicks))}</td>` },
  { label: 'CPC(USD)', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="cpc_usd"><span class="cell-value">${Number(r.cpc_usd || 0).toFixed(4)}</span></td>` },
  { label: 'CPC(RMB)', className: 'num-cell calc-cell', render: r => `<td class="num-cell calc-cell">${Utils.calcCpcRmb(r.cpc_usd).toFixed(4)}</td>` },
  { label: '\u9884\u7b97', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="budget_usd"><span class="cell-value">${r.budget_usd || '0'}</span></td>` },
  { label: '\u81ea\u7136\u9500\u91cf', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="organic_sales"><span class="cell-value">${Utils.fmtNum(r.organic_sales)}</span></td>` },
  { label: '\u5e7f\u544a\u9500\u91cf', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="ad_sales"><span class="cell-value">${Utils.fmtNum(r.ad_sales)}</span></td>` },
  { label: '\u82b1\u8d39(US)', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="spend"><span class="cell-value">${Number(r.spend || 0).toFixed(4)}</span></td>` },
  { label: '\u6536\u5165(US)', className: 'num-cell', render: r => `<td class="num-cell editable" data-field="revenue"><span class="cell-value">${Number(r.revenue || 0).toFixed(2)}</span></td>` },
  { label: 'ACOS', className: 'num-cell calc-cell', render: r => { const acos = Utils.calcACOS(r.spend, r.revenue); return `<td class="num-cell calc-cell metric-cell ${acos > 0.3 ? 'bad-metric' : 'good-metric'}">${Utils.fmtPct(acos)}</td>`; } },
  { label: '\u95ee\u9898', className: 'text-cell', render: r => `<td class="text-cell editable" data-field="problem"><span class="cell-value">${r.problem || ''}</span></td>` },
  { label: '\u8c03\u6574\u52a8\u4f5c', className: 'text-cell', render: r => `<td class="text-cell editable" data-field="action"><span class="cell-value">${r.action || ''}</span></td>` },
  { label: '\u8fd0\u8425\u611f\u53d7', className: 'text-cell', render: r => `<td class="text-cell editable" data-field="note"><span class="cell-value">${r.note || ''}</span></td>` },
];
const renderTableHead = (columns) => `<thead><tr>${columns.map(col => `<th${col.className ? ` class="${col.className}"` : ''}>${col.label}</th>`).join('')}</tr></thead>`;
const renderTableRow = (columns, row, attrs = '') => `<tr${attrs}>${columns.map(col => col.render(row)).join('')}</tr>`;
/* ═══════════════════════════════════════════════════════
   工具函数
   ═══════════════════════════════════════════════════════ */
const Utils = {
  // 数字格式化
  fmtNum(n, d = 0) {
    if (n == null || isNaN(n)) return '-';
    return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: d });
  },

  fmtMoney(n, prefix = 'US$') {
    if (n == null || isNaN(n)) return '-';
    return `${prefix}${Number(n).toFixed(2)}`;
  },

  fmtPct(n) {
    if (n == null || isNaN(n)) return '-';
    return `${(Number(n) * 100).toFixed(2)}%`;
  },

  // 日期格式化 YYYY-MM-DD → M.D
  fmtDate(d) {
    if (!d) return '-';
    const parts = d.split('-');
    return `${parseInt(parts[1])}.${parseInt(parts[2])}`;
  },

  // 日期格式化 YYYY-MM-DD → YYYY年M月D日
  fmtDateFull(d) {
    if (!d) return '-';
    const parts = d.split('-');
    return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  },

  // 月份格式化 YYYY-MM → YYYY.M
  fmtMonth(m) {
    if (!m) return '-';
    const parts = m.split('-');
    return `${parts[0]}.${parseInt(parts[1])}`;
  },

  toDate(d) {
    if (!d) return null;
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  },

  isoDate(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  },

  endOfMonth(month) {
    if (!month) return '';
    const [y, m] = month.split('-').map(Number);
    return Utils.isoDate(new Date(y, m, 0));
  },

  mexicoToday() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  },


  // 计算列
  calcCTR(clicks, impressions) {
    return impressions > 0 ? clicks / impressions : 0;
  },

  calcCVR(adSales, clicks) {
    return clicks > 0 ? adSales / clicks : 0;
  },

  calcCpcRmb(cpcUsd) {
    return cpcUsd * 0.38;
  },

  calcACOS(spend, revenue) {
    return revenue > 0 ? spend / revenue : 0;
  },

  // 数组求和
  sum(arr, key) {
    return arr.map(r => Number(r[key] || 0)).reduce((a, b) => a + b, 0);
  }
};

/* ═══════════════════════════════════════════════════════
   API封装
   ═══════════════════════════════════════════════════════ */
async function apiGet(path) {
  if (isStaticApiPath(path)) return staticApiGet(path);
  try {
    const res = await fetch(`${API}${path}`);
    if (res.ok) return res.json();
  } catch (e) {
    // Static public deployment falls back to generated JSON files below.
  }
  return staticApiGet(path);
}

function isStaticApiPath(path) {
  return [
    '/ads',
    '/ads/skus',
    '/ads/months',
    '/ad-records',
    '/ad-records/stores',
    '/ad-records/skus',
  ].some(route => path === route || path.startsWith(`${route}?`));
}

async function staticApiGet(path) {
  const [route, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);
  const loadJson = async (file, fallback) => {
    const res = await fetch(`./static-api/${file}?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return res.json();
  };
  if (route === '/ads') {
    let data = await loadJson('ads.json', []);
    const sku = params.get('sku');
    const month = params.get('month');
    if (sku) data = data.filter(r => r.sku === sku);
    if (month) data = data.filter(r => r.year_month === month);
    return data;
  }
  if (route === '/ads/skus') return loadJson('ads-skus.json', []);
  if (route === '/ads/months') return loadJson('ads-months.json', []);
  if (route === '/weekly') return [];
  if (route === '/profit') return [];
  if (route === '/ad-records') {
    const data = await loadJson('ad-records.json', { records: [], summary: {} });
    let records = data.records || [];
    const start = params.get('start');
    const end = params.get('end');
    const sku = params.get('sku');
    const store = params.get('store');
    if (start) records = records.filter(r => r.date >= start);
    if (end) records = records.filter(r => r.date <= end);
    if (sku) records = records.filter(r => r.product_sku === sku);
    if (store) records = records.filter(r => r.store === store);
    return { records, summary: summarizeAdRecords(records) };
  }
  if (route === '/ad-records/stores') return loadJson('ad-records-stores.json', []);
  if (route === '/ad-records/skus') return loadJson('ad-records-skus.json', []);
  return [];
}

function summarizeAdRecords(records) {
  const uniq = (field) => new Set(records.map(r => r[field]).filter(Boolean)).size;
  return {
    total_records: records.length,
    days: uniq('date'),
    skus: uniq('product_sku'),
    total_impressions: Utils.sum(records, 'impressions'),
    total_clicks: Utils.sum(records, 'clicks'),
    total_spend: Utils.sum(records, 'spend'),
    total_orders: Utils.sum(records, 'orders'),
    total_sales: Utils.sum(records, 'sales'),
  };
}

async function apiPut(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`服务器错误(${res.status}): ${text.slice(0, 100)}`);
  }
  return res.json();
}

async function apiPostForm(path, formData) {
  const res = await fetch(`${API}${path}`, { method: 'POST', body: formData });
  const raw = await res.text().catch(() => '');
  const data = raw ? (() => {
    try { return JSON.parse(raw); } catch { return {}; }
  })() : {};
  if (!res.ok || data.error) {
    if (res.status === 413) {
      throw new Error('上传文件过大，服务器 nginx 需要调高 client_max_body_size');
    }
    throw new Error(data.error || `服务器错误(${res.status})${raw ? `: ${raw.slice(0, 120)}` : ''}`);
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  return res.json();
}


async function createMonthTab(owner) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = prompt('Input month, format YYYY-MM', App.state.currentMonth || defaultMonth);
  if (!month) return;
  const clean = month.trim();
  if (!/^\d{4}-\d{2}$/.test(clean)) {
    showToast('Month format must be YYYY-MM', 'error');
    return;
  }
  const res = await apiPost('/ads/months', { month: clean });
  if (res.error) {
    showToast(res.error, 'error');
    return;
  }
  App.state.currentMonth = clean;
  await App.loadMetadata();
  await App.loadAllData();
  owner.render();
  showToast(`Created ${Utils.fmtMonth(clean)}`, 'success');
}

async function deleteCurrentMonthTab(owner) {
  const month = App.state.currentMonth;
  if (!month) {
    showToast('Select a month first', 'error');
    return;
  }
  if (!confirm(`Delete ${Utils.fmtMonth(month)}? Daily data and weekly summaries for this month will also be deleted.`)) return;
  const res = await apiDelete(`/ads/months/${month}`);
  if (res.error) {
    showToast(res.error, 'error');
    return;
  }
  await App.loadMetadata();
  await App.loadAllData();
  App.state.currentMonth = App.state.months[App.state.months.length - 1] || '';
  owner.render();
  showToast(`Deleted ${Utils.fmtMonth(month)}`, 'success');
}


async function createSku(owner) {
  const sku = prompt('\u8bf7\u8f93\u5165\u65b0\u589e\u578b\u53f7');
  if (!sku || !sku.trim()) return;
  const res = await apiPost('/ads/skus', { sku: sku.trim() });
  if (res.error) {
    showToast(res.error, 'error');
    return;
  }
  App.state.currentSku = res.sku;
  await App.loadMetadata();
  await App.loadAllData();
  owner.render();
  showToast(`\u5df2\u65b0\u589e\u578b\u53f7\uff1a${res.sku}`, 'success');
}

async function deleteCurrentSku(owner) {
  const sku = App.state.currentSku;
  if (!sku) {
    showToast('\u8bf7\u5148\u9009\u62e9\u578b\u53f7', 'error');
    return;
  }
  if (!confirm(`\u786e\u5b9a\u5220\u9664\u578b\u53f7 ${sku}\uff1f\u8be5\u578b\u53f7\u5e7f\u544a\u6570\u636e\u3001\u5468\u62a5\u548c\u76c8\u5229\u6570\u636e\u90fd\u4f1a\u5220\u9664\u3002`)) return;
  const res = await apiDelete(`/ads/skus/${encodeURIComponent(sku)}`);
  if (res.error) {
    showToast(res.error, 'error');
    return;
  }
  await App.loadMetadata();
  App.state.currentSku = App.state.skus[0] || '';
  await App.loadAllData();
  owner.render();
  showToast(`\u5df2\u5220\u9664\u578b\u53f7\uff1a${sku}`, 'success');
}

function renderSkuTabs(containerId, owner, actions = false) {
  const container = $(`#${containerId}`);
  if (!container) return;
  const skus = App.state.skus;

  if (owner.multiSku) {
    const selected = App.getSelectedSkus();
    const isAll = selected.length === skus.length;
    container.innerHTML = `<div class="selection-summary">${isAll ? '\u5168\u90e8SKU' : `\u5df2\u9009\u62e9 ${selected.length}/${skus.length || 0} SKU`}</div>`;
    return;
  }

  const actionHtml = actions ? `
    <button class="tab-btn month-action" data-sku-action="add">+ \u578b\u53f7</button>
    <button class="tab-btn month-action danger" data-sku-action="delete">\u5220\u9664\u578b\u53f7</button>` : '';

  container.innerHTML = `<label class="field-select"><span>\u578b\u53f7</span><select class="tab-select" data-sku-select aria-label="SKU">
    ${skus.map(s => `<option value="${s}" ${s === App.state.currentSku ? 'selected' : ''}>${s}</option>`).join('')}
  </select></label>${actionHtml}`;

  const select = container.querySelector('[data-sku-select]');
  select?.addEventListener('change', () => {
    App.state.currentSku = select.value;
    App.syncGlobalSkuSelection([select.value]);
    owner.render();
  });

  const addBtn = container.querySelector('[data-sku-action="add"]');
  const deleteBtn = container.querySelector('[data-sku-action="delete"]');
  if (addBtn) addBtn.addEventListener('click', () => createSku(owner));
  if (deleteBtn) deleteBtn.addEventListener('click', () => deleteCurrentSku(owner));
}

function renderMonthTabs(containerId, owner, actions = true) {
  const container = $(`#${containerId}`);
  if (!container) return;
  const months = App.state.months;
  const actionHtml = actions ? `
    <button class="tab-btn month-action" data-month-action="add">+ Month</button>
    <button class="tab-btn month-action danger" data-month-action="delete">Delete Month</button>` : '';

  container.innerHTML = `<label class="field-select"><span>\u6708\u4efd</span><select class="tab-select" data-month-select aria-label="Month">
    ${months.map(m => `<option value="${m}" ${m === App.state.currentMonth ? 'selected' : ''}>${Utils.fmtMonth(m)}</option>`).join('')}
  </select></label>${actionHtml}`;

  const select = container.querySelector('[data-month-select]');
  select?.addEventListener('change', () => {
    App.state.currentMonth = select.value;
    App.syncGlobalMonth(select.value);
    owner.render();
  });

  const addBtn = container.querySelector('[data-month-action="add"]');
  const deleteBtn = container.querySelector('[data-month-action="delete"]');
  if (addBtn) addBtn.addEventListener('click', () => createMonthTab(owner));
  if (deleteBtn) deleteBtn.addEventListener('click', () => deleteCurrentMonthTab(owner));
}

/* Toast */
function showToast(msg, type = '') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

/* ═══════════════════════════════════════════════════════
   主应用
   ═══════════════════════════════════════════════════════ */
const App = {
  state: {
    currentView: 'ad-dashboard',
    skus: [],
    stores: [],
    months: [],
    allData: [],
    currentSku: '',
    currentStore: '',
    currentMonth: '',
    selectedSkus: [],
    dateRangeMode: '7',
    customStart: '',
    customEnd: '',
  },

  titles: {
    'ad-dashboard': '广告总览',
    'ad-profit': '每日盈利表',
    'ad-detail': '单品广告诊断',
    'ad-weekly': '周报分析',
    'ad-manage': '数据管理',
  },

  async init() {
    this.bindNav();
    this.bindGlobalFilters();
    this.bindRefresh();
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);
    await this.loadMetadata();
    await this.loadAllData();
    this.applyViewDefaultRange(this.state.currentView);
    this.renderCurrentView();
  },

  updateTime() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    $('#header-time').textContent = now.toLocaleDateString('zh-CN', options);
  },

  bindNav() {
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === this.state.currentView) return;
        $$('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.view').forEach(v => v.classList.remove('active'));
        $(`#${view}`).classList.add('active');
        $('#view-title').textContent = this.titles[view] || '';
        this.state.currentView = view;
        this.applyViewDefaultRange(view);
        this.renderCurrentView();
      });
    });
  },

  applyViewDefaultRange(view) {
    const defaultRange = view === 'ad-dashboard' ? '7' : (view === 'ad-profit' ? 'today' : null);
    if (!defaultRange) return;
    this.state.dateRangeMode = defaultRange;
    const rangeSelect = $('#filter-range');
    if (rangeSelect) rangeSelect.value = defaultRange;
    this.toggleCustomDates();
  },
  bindGlobalFilters() {
    const storeSelect = $('#filter-store');
    const skuSelect = $('#filter-sku');
    const rangeSelect = $('#filter-range');
    const monthSelect = $('#filter-month');
    const startInput = $('#filter-start');
    const endInput = $('#filter-end');

    storeSelect?.addEventListener('change', () => {
      this.state.currentStore = storeSelect.value;
      this.renderCurrentView();
    });

    skuSelect?.addEventListener('change', () => {
      const selected = skuSelect.value && skuSelect.value !== '__all__' ? [skuSelect.value] : [];
      this.state.selectedSkus = selected;
      if (selected.length === 1) this.state.currentSku = selected[0];
      this.syncGlobalSkuSelection(selected);
      this.renderCurrentView();
    });

    rangeSelect?.addEventListener('change', () => {
      this.state.dateRangeMode = rangeSelect.value;
      this.toggleCustomDates();
      this.renderCurrentView();
    });

    [startInput, endInput].filter(Boolean).forEach(input => input.addEventListener('change', () => {
      this.state.customStart = startInput?.value || '';
      this.state.customEnd = endInput?.value || '';
      this.renderCurrentView();
    }));

    monthSelect?.addEventListener('change', () => {
      this.state.currentMonth = monthSelect.value || this.state.currentMonth;
      if (rangeSelect && rangeSelect.value !== 'month') {
        rangeSelect.value = 'month';
        this.state.dateRangeMode = 'month';
        this.toggleCustomDates();
      }
      this.renderCurrentView();
    });
  },

  toggleCustomDates() {
    const isCustom = ($('#filter-range')?.value || this.state.dateRangeMode) === 'custom';
    $('#filter-start')?.toggleAttribute('hidden', !isCustom);
    $('#filter-end')?.toggleAttribute('hidden', !isCustom);
  },

  bindRefresh() {
    $('#refresh-data').addEventListener('click', async () => {
      showToast('正在刷新数据...');
      await this.loadAllData();
      this.renderCurrentView();
      showToast('数据已刷新', 'success');
    });
  },

  async loadMetadata() {
    this.state.skus = await apiGet('/ads/skus');
    this.state.months = await apiGet('/ads/months');
    const skuSelect = $('#filter-sku');
    const selected = new Set(this.state.selectedSkus);
    skuSelect.innerHTML = `<option value="__all__" ${selected.size ? '' : 'selected'}>\u5168\u90e8SKU</option>` + this.state.skus.map(s =>
      `<option value="${s}" ${selected.has(s) ? 'selected' : ''}>${s}</option>`
    ).join('');
    const monthSelect = $('#filter-month');
    monthSelect.innerHTML = '<option value="">全部月份</option>' + this.state.months.map(m =>
      `<option value="${m}">${Utils.fmtMonth(m)}</option>`
    ).join('');
    if (this.state.currentMonth) monthSelect.value = this.state.currentMonth;
    this.toggleCustomDates();
  },

  async loadAllData() {
    this.state.allData = await apiGet('/ads');
    this.populateStoreFilter();
    if (this.state.months.length && !this.state.currentMonth) {
      this.state.currentMonth = this.state.months[this.state.months.length - 1];
      const monthSelect = $('#filter-month');
      if (monthSelect) monthSelect.value = this.state.currentMonth;
    }
    if (this.state.skus.length && (!this.state.currentSku || !this.state.skus.includes(this.state.currentSku))) {
      this.state.currentSku = this.state.skus[0];
    }
  },

  getRowStore(row) {
    return row.store || row.shop || row.store_name || row.shop_name || row.account || '\u9ed8\u8ba4\u5e97\u94fa';
  },

  populateStoreFilter() {
    const storeSelect = $('#filter-store');
    if (!storeSelect) return;
    this.state.stores = [...new Set(this.state.allData.map(row => this.getRowStore(row)).filter(Boolean))].sort();
    storeSelect.innerHTML = '<option value="">\u5168\u90e8\u5e97\u94fa</option>' + this.state.stores.map(store =>
      `<option value="${store}">${store}</option>`
    ).join('');
    storeSelect.value = this.state.currentStore || '';
  },

  getSelectedSkus() {
    const value = $('#filter-sku')?.value;
    return value && value !== '__all__' ? [value] : this.state.skus.slice();
  },

  syncGlobalSkuSelection(skus) {
    this.state.selectedSkus = skus.filter(Boolean).filter(v => v !== '__all__');
    const select = $('#filter-sku');
    if (select) select.value = this.state.selectedSkus[0] || '__all__';
  },

  syncGlobalMonth(month) {
    this.state.currentMonth = month;
    const rangeSelect = $('#filter-range');
    const monthSelect = $('#filter-month');
    if (rangeSelect) rangeSelect.value = 'month';
    if (monthSelect) monthSelect.value = month;
    this.state.dateRangeMode = 'month';
    this.toggleCustomDates();
  },

  getEffectiveTodayDate() {
    const mexicoToday = Utils.mexicoToday();
    const dates = [...new Set(this.state.allData.map(r => r.date).filter(Boolean))].sort();
    if (dates.includes(mexicoToday)) return mexicoToday;
    const latestAvailable = [...dates].reverse().find(date => date <= mexicoToday);
    return latestAvailable || dates[dates.length - 1] || mexicoToday;
  },

  getDateBounds(monthOverride) {
    const mode = $('#filter-range')?.value || this.state.dateRangeMode || 'month';
    if (mode === 'custom') {
      const start = $('#filter-start')?.value || this.state.customStart;
      const end = $('#filter-end')?.value || this.state.customEnd;
      return { start, end };
    }
    const effectiveToday = this.getEffectiveTodayDate();
    if (mode === 'today') return { start: effectiveToday, end: effectiveToday };
    if (['7', '15', '30', 'recent30'].includes(mode)) {
      const days = mode === 'recent30' ? 30 : Number(mode);
      const start = Utils.isoDate(Utils.addDays(Utils.toDate(effectiveToday), -(days - 1)));
      return { start, end: effectiveToday };
    }
    const month = monthOverride || $('#filter-month')?.value || this.state.currentMonth;
    if (!month) return { start: '', end: '' };
    return { start: `${month}-01`, end: Utils.endOfMonth(month) };
  },

  isDateInRange(date, monthOverride) {
    const { start, end } = this.getDateBounds(monthOverride);
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  },

  getFilteredData(sku, month) {
    let data = this.state.allData;
    const mode = $('#filter-range')?.value || this.state.dateRangeMode || 'month';
    const store = $('#filter-store')?.value || this.state.currentStore;
    if (store) data = data.filter(d => this.getRowStore(d) === store);
    const skuList = Array.isArray(sku) ? sku : (sku ? [sku] : this.getSelectedSkus());
    if (skuList.length && skuList.length < this.state.skus.length) data = data.filter(d => skuList.includes(d.sku));
    if (mode === 'month' && month) data = data.filter(d => d.year_month === month);
    data = data.filter(d => this.isDateInRange(d.date, month));
    return data;
  },

  renderCurrentView() {
    const view = this.state.currentView;
    const month = $('#filter-month')?.value || this.state.currentMonth;
    switch (view) {
      case 'ad-dashboard': Dashboard.render(null, month); break;
      case 'ad-profit': Profit.render(); break;
      case 'ad-detail': Detail.render(); break;
      case 'ad-weekly': Weekly.render(); break;
      case 'ad-manage': DataManager.render(); break;
    }
  }
};

const Dashboard = {
  spendTrendField: 'revenue',

  render(sku, month) {
    const data = App.getFilteredData(sku, month);

    // KPI汇总
    const totalImpressions = Utils.sum(data, 'impressions');
    const totalClicks = Utils.sum(data, 'clicks');
    const totalSpend = Utils.sum(data, 'spend');
    const totalRevenue = Utils.sum(data, 'revenue');
    const totalOrganic = Utils.sum(data, 'organic_sales');
    const totalAdSales = Utils.sum(data, 'ad_sales');
    const totalSales = totalOrganic + totalAdSales;
    const overallACOS = totalRevenue > 0 ? totalSpend / totalRevenue : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // 渲染KPI
    const kpiData = [
      { icon: '&#x1F4B3;', label: '\u603b\u9500\u552e\u989d', value: Utils.fmtMoney(totalRevenue) },
      { icon: '&#x1F4B0;', label: '\u603b\u82b1\u8d39', value: Utils.fmtMoney(totalSpend), sub: `Avg CPC ${Utils.fmtMoney(avgCPC)}` },
      { icon: '&#x1F4C8;', label: 'ACOS', value: Utils.fmtPct(overallACOS), isACOS: true, good: overallACOS < 0.3 },
      { icon: '&#x1F4CA;', label: '\u603b\u66dd\u5149', value: Utils.fmtNum(totalImpressions) },
      { icon: '&#x1F5B1;', label: '\u603b\u70b9\u51fb', value: Utils.fmtNum(totalClicks), sub: `CTR ${Utils.fmtPct(Utils.calcCTR(totalClicks, totalImpressions))}` },
      { icon: '&#x1F6D2;', label: '\u603b\u9500\u91cf', value: Utils.fmtNum(totalSales), sub: `\u81ea\u7136 ${Utils.fmtNum(totalOrganic)} / \u5e7f\u544a ${Utils.fmtNum(totalAdSales)}` },
    ];

    const kpiGrid = $('#dashboard-kpis');
    kpiGrid.innerHTML = kpiData.map(k => `
      <div class="kpi ${k.isACOS ? (k.good ? 'acos-kpi' : 'acos-kpi') : ''}">
        <div class="kpi-icon">${k.icon}</div>
        <div class="kpi-copy">
          <span>${k.label}</span>
          <strong ${k.isACOS && !k.good ? 'class="danger"' : ''}>${k.value}</strong>
          ${k.sub ? `<small>${k.sub}</small>` : ''}
        </div>
      </div>
    `).join('');

    // 每日收入/花费趋势柱状图
    this.renderSkuChart('sku-spend-chart', data);
    // SKU销量对比柱状图
    this.renderSalesChart('sku-sales-chart', data);

    // 最新数据速览
    this.renderLatestTable(data);
  },

  renderSkuChart(containerId, data) {
    const container = $(`#${containerId}`);
    const field = this.spendTrendField || 'revenue';
    const metric = field === 'spend'
      ? { label: '\u82b1\u8d39', unit: 'US', className: 'spend-metric', fillClass: 'bar-fill' }
      : { label: '\u6536\u5165', unit: 'US', className: 'revenue-metric', fillClass: 'revenue-fill' };
    const byDate = {};
    data.forEach(d => { byDate[d.date] = (byDate[d.date] || 0) + Number(d[field] || 0); });
    const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
    const max = sorted.length ? Math.max(...sorted.map(([, v]) => v), 1) : 1;

    const toggleHtml = `<div class="segmented-toggle compact-toggle" role="group" aria-label="\u8d8b\u52bf\u6307\u6807\u5207\u6362">
      <button type="button" data-spend-trend="revenue" class="${field === 'revenue' ? 'active' : ''}">\u6536\u5165</button>
      <button type="button" data-spend-trend="spend" class="${field === 'spend' ? 'active' : ''}">\u82b1\u8d39</button>
    </div>`;
    const headerToggle = $('#sku-spend-toggle');
    const inlineToggle = `<div class="chart-mode-row">${toggleHtml}</div>`;
    if (headerToggle) headerToggle.innerHTML = toggleHtml;

    if (!sorted.length) {
      container.innerHTML = `${headerToggle ? '' : inlineToggle}<p style="color:var(--muted);text-align:center;padding:32px">\u6682\u65e0\u6570\u636e</p>`;
      this.bindSpendTrendToggle(headerToggle || container, data, container.id);
      return;
    }

    container.innerHTML = `${headerToggle ? '' : inlineToggle}<div class="tree-bars day-bars">${sorted.map(([date, val]) => {
      const height = Math.max(val / max * 100, 6);
      return `<div class="tree-bar-card" title="${Utils.fmtDate(date)} ${metric.label}: ${Utils.fmtNum(val, 2)} ${metric.unit}">
        <div class="tree-bar-shell"><div class="tree-bar ${metric.fillClass}" style="height:${height}%"></div></div>
        <div class="bar-value-label">
          <strong>${Utils.fmtDate(date)}</strong>
          <span class="chart-metric ${metric.className}">${Utils.fmtNum(val, 2)}</span>
        </div>
      </div>`;
    }).join('')}</div>`;
    this.bindSpendTrendToggle(headerToggle || container, data, container.id);
  },

  bindSpendTrendToggle(container, data, chartId = container.id) {
    container.querySelectorAll('[data-spend-trend]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.spendTrendField === btn.dataset.spendTrend) return;
        this.spendTrendField = btn.dataset.spendTrend;
        this.renderSkuChart(chartId, data);
      });
    });
  },

  renderSalesChart(containerId, data) {
    const container = $(`#${containerId}`);
    const byDate = {};
    data.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = { organic: 0, ad: 0 };
      byDate[d.date].organic += Number(d.organic_sales || 0);
      byDate[d.date].ad += Number(d.ad_sales || 0);
    });

    const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
    const max = sorted.length ? Math.max(...sorted.map(([, v]) => v.organic + v.ad), 1) : 1;

    if (!sorted.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">\u6682\u65e0\u6570\u636e</p>';
      return;
    }

    container.innerHTML = `<div class="tree-bars day-bars">${sorted.map(([date, v]) => {
      const total = v.organic + v.ad;
      const height = Math.max(total / max * 100, 6);
      const adPct = total > 0 ? v.ad / total * 100 : 0;
      const organicPct = total > 0 ? v.organic / total * 100 : 0;
      return `<div class="tree-bar-card" title="${Utils.fmtDate(date)} \u603b\u8ba2\u5355${Utils.fmtNum(total)} / \u81ea\u7136\u8ba2\u5355${Utils.fmtNum(v.organic)} / \u5e7f\u544a\u8ba2\u5355${Utils.fmtNum(v.ad)}">
        <div class="tree-bar-shell"><div class="tree-bar tree-bar-stack sales-gradient" style="height:${height}%">
          <span class="tree-seg organic" style="height:${organicPct}%"></span>
          <span class="tree-seg ad" style="height:${adPct}%"></span>
        </div></div>
        <div class="bar-value-label">
          <strong>${Utils.fmtDate(date)}</strong>
          <span class="chart-metric sales-metric">${Utils.fmtNum(total)}</span>
        </div>
      </div>`;
    }).join('')}</div>`;
  },
  renderLatestTable(data) {
    const table = $('#latest-table');
    const byDate = {};
    data.forEach(d => {
      if (!byDate[d.date]) {
        byDate[d.date] = { date: d.date, impressions: 0, clicks: 0, organic_sales: 0, ad_sales: 0, spend: 0, revenue: 0 };
      }
      byDate[d.date].impressions += Number(d.impressions || 0);
      byDate[d.date].clicks += Number(d.clicks || 0);
      byDate[d.date].organic_sales += Number(d.organic_sales || 0);
      byDate[d.date].ad_sales += Number(d.ad_sales || 0);
      byDate[d.date].spend += Number(d.spend || 0);
      byDate[d.date].revenue += Number(d.revenue || 0);
    });

    const rows = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));

    table.innerHTML = `
      <thead><tr>
        <th>日期</th><th class="num-cell">曝光</th><th class="num-cell">点击</th><th class="num-cell">点击率</th>
        <th class="num-cell">CPC(US)</th><th class="num-cell">自然销量</th><th class="num-cell">广告销量</th>
        <th class="num-cell">花费(US)</th><th class="num-cell">收入(US)</th><th class="num-cell">ACOS</th>
      </tr></thead>
      <tbody>${rows.map(r => {
        const ctr = Utils.calcCTR(r.clicks, r.impressions);
        const cpc = r.clicks > 0 ? r.spend / r.clicks : 0;
        const acos = Utils.calcACOS(r.spend, r.revenue);
        return `<tr>
          <td><strong>${Utils.fmtDate(r.date)}</strong></td>
          <td class="num-cell">${Utils.fmtNum(r.impressions)}</td>
          <td class="num-cell">${Utils.fmtNum(r.clicks)}</td>
          <td class="num-cell metric-cell good-metric">${Utils.fmtPct(ctr)}</td>
          <td class="num-cell">${Utils.fmtNum(cpc, 4)}</td>
          <td class="num-cell">${Utils.fmtNum(r.organic_sales)}</td>
          <td class="num-cell">${Utils.fmtNum(r.ad_sales)}</td>
          <td class="num-cell">${Utils.fmtNum(r.spend, 2)}</td>
          <td class="num-cell">${Utils.fmtNum(r.revenue, 2)}</td>
          <td class="num-cell metric-cell ${acos > 0.3 ? 'bad-metric' : 'good-metric'}">${Utils.fmtPct(acos)}</td>
        </tr>`;
      }).join('')}</tbody>`;
  }
};

/* Daily profit table */
const Profit = {
  rows: [],
  multiSku: true,
  chartMode: 'summary',

  async render() {
    await this.loadRows();
    this.bindChartToggle();
    this.renderKpis();
    this.renderChart();
    this.renderTopChart();
    this.renderTable();
  },

  bindChartToggle() {
    const toggle = $('#profit-chart-toggle');
    if (!toggle) return;
    toggle.querySelectorAll('button[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.chartMode);
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        this.chartMode = btn.dataset.mode;
        this.renderChart();
        this.updateChartToggle();
      });
    });
    this.updateChartToggle();
  },

  updateChartToggle() {
    const toggle = $('#profit-chart-toggle');
    if (!toggle) return;
    toggle.querySelectorAll('button[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.chartMode);
    });
    const note = $('#profit-chart-note');
    if (note) {
      const mode = $('#filter-range')?.value || App.state.dateRangeMode;
      note.textContent = this.chartMode === 'summary'
        ? (mode === 'today' ? '按SKU汇总展示今日盈亏(US)' : '按日期汇总展示最终盈亏(US)')
        : '按日期分组展示SKU盈利明细(US)';
    }
  },

  async loadRows() {
    const filtered = App.getFilteredData(null, App.state.currentMonth);
    const selectedSkus = App.getSelectedSkus();
    const pairs = new Map();
    filtered.forEach(r => pairs.set(`${r.sku}|${r.year_month}`, { sku: r.sku, month: r.year_month }));
    if (!pairs.size && App.state.currentMonth) {
      selectedSkus.forEach(sku => pairs.set(`${sku}|${App.state.currentMonth}`, { sku, month: App.state.currentMonth }));
    }

    const batches = await Promise.all([...pairs.values()].map(p =>
      apiGet(`/profit?sku=${encodeURIComponent(p.sku)}&month=${encodeURIComponent(p.month)}`)
    ));
    this.rows = batches.flat()
      .filter(r => selectedSkus.includes(r.sku))
      .filter(r => App.isDateInRange(r.date, r.date?.slice(0, 7)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.sku.localeCompare(b.sku));
  },

  renderKpis() {
    const qty = Utils.sum(this.rows, 'quantity');
    const gross = Utils.sum(this.rows, 'gross_profit');
    const spend = Utils.sum(this.rows, 'ad_spend');
    const net = Utils.sum(this.rows, 'net_profit');
    const kpiBox = $('#profit-kpis');
    if (!kpiBox) return;
    kpiBox.innerHTML = [
      { icon: '&#x1F4B5;', label: '利润总额(US)', value: Utils.fmtNum(gross, 2) },
      { icon: '&#x1F4B0;', label: '广告费(US)', value: Utils.fmtNum(spend, 2) },
      { icon: '&#x1F4C8;', label: '最终盈亏(US)', value: Utils.fmtNum(net, 2), danger: net < 0 },
      { icon: '&#x1F6D2;', label: '总订单量', value: Utils.fmtNum(qty) },
    ].map(k => `<div class="kpi profit-kpi-card"><div class="kpi-icon">${k.icon}</div><div class="kpi-copy"><span>${k.label}</span><strong class="${k.danger ? 'danger' : ''}">${k.value}</strong></div></div>`).join('');
  },

  renderChart() {
    if (this.chartMode === 'summary') this.renderSummaryChart();
    else this.renderDetailChart();
  },

  renderSummaryChart() {
    const container = $('#profit-chart');
    if (!container) return;
    if (!this.rows.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:44px">暂无盈利数据。请先导入该型号的广告数据。</p>';
      return;
    }

    const mode = $('#filter-range')?.value || App.state.dateRangeMode;
    const isToday = mode === 'today';
    const groupedMap = {};
    this.rows.forEach(r => {
      const key = isToday ? r.sku : r.date;
      groupedMap[key] = (groupedMap[key] || 0) + Number(r.net_profit || 0);
    });

    const grouped = Object.entries(groupedMap)
      .map(([key, net]) => ({ key, net }))
      .sort((a, b) => isToday ? b.net - a.net : a.key.localeCompare(b.key));
    const maxAbs = Math.max(...grouped.map(r => Math.abs(r.net)), 1);

    container.innerHTML = `<div class="tree-bars profit-bars ${isToday ? '' : 'day-bars'}">${grouped.map(r => {
      const height = Math.max(Math.abs(r.net) / maxAbs * 100, 6);
      const label = isToday ? r.key : Utils.fmtDate(r.key);
      return `<div class="tree-bar-card profit-bar-card" title="${label}: ${Utils.fmtNum(r.net, 2)}">
        <div class="tree-bar-shell"><div class="tree-bar profit-fill" style="height:${height}%"></div></div>
        <div class="bar-value-label">
          <strong>${label}</strong>
          <span class="chart-metric profit-metric">${Utils.fmtNum(r.net, 2)}</span>
        </div>
      </div>`;
    }).join('')}</div>`;
  },

  renderDetailChart() {
    const container = $('#profit-chart');
    if (!container) return;
    if (!this.rows.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:44px">暂无盈利数据。请先导入该型号的广告数据。</p>';
      return;
    }

    const byDate = {};
    this.rows.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, total: 0, skus: [] };
      const net = Number(r.net_profit || 0);
      byDate[r.date].total += net;
      byDate[r.date].skus.push({ sku: r.sku, net });
    });

    const days = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    const maxAbs = Math.max(...days.flatMap(day => day.skus.map(item => Math.abs(item.net))), 1);

    container.innerHTML = `<div class="profit-day-groups">${days.map(day => {
      const rows = day.skus.sort((a, b) => b.net - a.net);
      return `<section class="profit-day-card">
        <header><strong>${Utils.fmtDate(day.date)}</strong><span>${Utils.fmtNum(day.total, 2)}</span></header>
        <div class="profit-day-skus">${rows.map(item => {
          const width = Math.max(Math.abs(item.net) / maxAbs * 100, 5);
          return `<div class="profit-day-row" title="${item.sku}: ${Utils.fmtNum(item.net, 2)}">
            <b>${item.sku}</b>
            <div class="profit-day-track"><i style="width:${width}%"></i></div>
            <em>${Utils.fmtNum(item.net, 2)}</em>
          </div>`;
        }).join('')}</div>
      </section>`;
    }).join('')}</div>`;
  },

  renderTopChart() {
    const container = $('#profit-top-chart');
    if (!container) return;
    if (!this.rows.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:44px">暂无盈利数据。</p>';
      return;
    }
    const bySku = {};
    this.rows.forEach(r => { bySku[r.sku] = (bySku[r.sku] || 0) + Number(r.net_profit || 0); });
    const top = Object.entries(bySku).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxAbs = Math.max(...top.map(([, v]) => Math.abs(v)), 1);
    container.innerHTML = `<div class="top-profit-list">${top.map(([sku, val], i) => {
      const width = Math.max(Math.abs(val) / maxAbs * 100, 5);
      return `<div class="top-profit-row">
        <b>${String(i + 1).padStart(2, '0')}</b><strong>${sku}</strong>
        <div class="top-profit-track"><span style="width:${width}%"></span></div>
        <em>${Utils.fmtNum(val, 2)}</em>
      </div>`;
    }).join('')}</div>`;
  },

  renderTable() {
    const table = $('#profit-table');
    if (!table) return;
    table.innerHTML = `
      ${renderTableHead(profitColumns)}
      <tbody>${this.rows.map(r => renderTableRow(profitColumns, r, ` data-sku="${r.sku}" data-date="${r.date}"`)).join('')}</tbody>`;
    table.querySelectorAll('td.editable').forEach(td => td.addEventListener('dblclick', () => this.editProfit(td)));
  },

  editProfit(td) {
    const currentValue = td.querySelector('.cell-value').textContent;
    td.classList.add('editing');
    td.innerHTML = `<input type="number" step="any" value="${currentValue.replace(/,/g, '')}" />`;
    const input = td.querySelector('input');
    input.focus();
    input.select();
    const save = async () => {
      const row = td.closest('tr');
      const date = row.dataset.date;
      const sku = row.dataset.sku || App.state.currentSku;
      const unitProfit = input.value.trim() === '' ? 0 : parseFloat(input.value);
      try {
        await apiPut('/profit', { sku, date, unit_profit: unitProfit });
        showToast('已保存', 'success');
      } catch (e) {
        showToast('保存失败', 'error');
      }
      await this.render();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') this.render();
    });
  },
};

const Detail = {
  render() {
    this.renderSkuTabs();
    this.renderMonthTabs();
    this.renderTable();
  },

  renderSkuTabs() {
    renderSkuTabs('sku-tabs', this, true);
  },

  renderMonthTabs() {
    renderMonthTabs('detail-month-tabs', this, true);
  },

  renderTable() {
    const data = App.getFilteredData(App.state.currentSku, App.state.currentMonth)
      .sort((a, b) => a.date.localeCompare(b.date));
    const table = $('#detail-table');
    if (!table) return;
    table.innerHTML = `
      ${renderTableHead(detailColumns)}
      <tbody>${data.map(r => this.renderRow(r)).join('')}</tbody>`;
    this.bindEditing(table);
  },

  renderRow(r) {
    return renderTableRow(detailColumns, r, ` data-id="${r.id}"`);
  },

  bindEditing(table) {
    table.querySelectorAll('td.editable').forEach(td => {
      td.addEventListener('dblclick', () => {
        const field = td.dataset.field;
        const isText = ['problem', 'action', 'note'].includes(field);
        const currentValue = td.querySelector('.cell-value').textContent;
        td.classList.add('editing');
        td.innerHTML = isText
          ? `<textarea class="weekly-input" data-field="${field}">${currentValue}</textarea>`
          : `<input type="number" step="any" value="${currentValue.replace(/,/g, '')}" data-field="${field}" />`;
        const input = td.querySelector('input, textarea');
        input.focus();
        input.select();
        const save = async () => {
          const newVal = input.value.trim();
          td.classList.remove('editing');
          const rowId = td.closest('tr').dataset.id;
          const updateData = {};
          updateData[field] = isText ? newVal : (newVal === '' ? 0 : parseFloat(newVal));
          try {
            await apiPut(`/ads/${rowId}`, updateData);
            const cached = App.state.allData.find(d => d.id == rowId);
            if (cached) Object.assign(cached, updateData);
            showToast('已保存', 'success');
          } catch (e) {
            showToast('保存失败', 'error');
          }
          this.renderTable();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !isText) { e.preventDefault(); input.blur(); }
          if (e.key === 'Escape') {
            input.removeEventListener('blur', save);
            this.renderTable();
          }
        });
      });
    });
  }
};

const Weekly = {
  render() {
    this.renderSkuTabs();
    this.renderMonthTabs();
    this.renderKpis();
    this.renderTable();
    this.renderTrendChart();
  },

  renderSkuTabs() {
    renderSkuTabs('weekly-sku-tabs', this, true);
  },

  renderMonthTabs() {
    renderMonthTabs('weekly-month-tabs', this, true);
  },

  renderKpis() {
    const data = App.getFilteredData(App.state.currentSku, App.state.currentMonth);
    const totalSpend = Utils.sum(data, 'spend');
    const totalRevenue = Utils.sum(data, 'revenue');
    const totalOrganic = Utils.sum(data, 'organic_sales');
    const totalAdSales = Utils.sum(data, 'ad_sales');
    const totalSales = totalOrganic + totalAdSales;
    const acos = totalRevenue > 0 ? totalSpend / totalRevenue : 0;
    const box = $('#weekly-kpis');
    if (!box) return;
    box.innerHTML = [
      { icon: '&#x1F6D2;', label: '月总销量', value: Utils.fmtNum(totalSales) },
      { icon: '&#x1F4B0;', label: '月总花费', value: Utils.fmtMoney(totalSpend) },
      { icon: '&#x1F4C8;', label: '月ACOS', value: Utils.fmtPct(acos) },
    ].map(k => `<div class="kpi"><div class="kpi-icon">${k.icon}</div><div class="kpi-copy"><span>${k.label}</span><strong>${k.value}</strong></div></div>`).join('');
  },

  async renderTable() {
    const sku = App.state.currentSku;
    const month = App.state.currentMonth;
    const table = $('#weekly-table');
    if (!table) return;
    const weeklyData = await apiGet(`/weekly?sku=${encodeURIComponent(sku)}&month=${encodeURIComponent(month)}`);
    if (!weeklyData.length) {
      table.innerHTML = '<tbody><tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px">暂无周汇总数据</td></tr></tbody>';
      return;
    }
    table.innerHTML = `
      <thead><tr>
        <th>周次</th><th>日期范围</th><th class="num-cell">周销量</th>
        <th class="num-cell">周广告预算</th><th class="num-cell">周销售额</th>
        <th class="num-cell">周ACOS</th><th>关键词排名</th><th>周评论</th>
      </tr></thead>
      <tbody>${weeklyData.map(w => {
        const acosClass = w.weekly_acos > 0.3 ? 'danger-text' : '';
        return `<tr data-week-id="${w.id}">
          <td><strong>第${w.week_num}周</strong></td>
          <td>${Utils.fmtDate(w.week_start)} ~ ${Utils.fmtDate(w.week_end)}</td>
          <td class="num-cell">${Utils.fmtNum(w.weekly_sales)}</td>
          <td class="num-cell">${Utils.fmtMoney(w.weekly_budget)}</td>
          <td class="num-cell">${Utils.fmtMoney(w.weekly_revenue)}</td>
          <td class="num-cell ${acosClass}">${Utils.fmtPct(w.weekly_acos)}</td>
          <td><textarea class="weekly-input" data-field="keywords_ranking" placeholder="输入关键词排名...">${w.keywords_ranking || ''}</textarea></td>
          <td><textarea class="weekly-input" data-field="weekly_comments" placeholder="输入周评论...">${w.weekly_comments || ''}</textarea></td>
        </tr>`;
      }).join('')}</tbody>`;
    table.querySelectorAll('.weekly-input').forEach(textarea => {
      let debounce;
      textarea.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          const weekId = textarea.closest('tr').dataset.weekId;
          try { await apiPut(`/weekly/${weekId}`, { [textarea.dataset.field]: textarea.value }); }
          catch (e) { showToast('保存失败', 'error'); }
        }, 800);
      });
    });
  },

  renderTrendChart() {
    const container = $('#trend-chart');
    if (!container) return;
    const data = App.getFilteredData(App.state.currentSku, App.state.currentMonth)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (data.length < 2) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:60px">需要至少2天数据才能生成趋势图</p>';
      return;
    }
    const impressions = data.map(d => Number(d.impressions || 0));
    const clicks = data.map(d => Number(d.clicks || 0));
    const spends = data.map(d => Number(d.spend || 0));
    const dates = data.map(d => Utils.fmtDate(d.date));
    const n = data.length;
    const W = 800, H = 300;
    const pad = { top: 20, right: 70, bottom: 50, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const leftMax = Math.max(...impressions, ...clicks, 1);
    const rightMax = Math.max(...spends, 1);
    const xScale = i => pad.left + (i / (n - 1)) * chartW;
    const yLeft = v => pad.top + chartH - (v / leftMax) * chartH;
    const yRight = v => pad.top + chartH - (v / rightMax) * chartH;
    const makePath = (values, yFn) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ');
    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const y = pad.top + (chartH / 4) * i;
      return `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#e8eef6" stroke-dasharray="4,4" />`;
    }).join('');
    const xLabels = dates.map((d, i) => `<text x="${xScale(i)}" y="${H - pad.bottom + 20}" text-anchor="middle" fill="#94a3b8" font-size="11">${d}</text>`).join('');
    container.innerHTML = `
      <div class="trend-legend">
        <span><span class="legend-dot" style="background:#7c3aed"></span> 曝光</span>
        <span><span class="legend-dot" style="background:#2563eb"></span> 点击</span>
        <span><span class="legend-dot" style="background:#059669"></span> 花费</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${gridLines}${xLabels}
        <path d="${makePath(impressions, yLeft)}" fill="none" stroke="#7c3aed" stroke-width="2.5" />
        ${impressions.map((v, i) => `<circle cx="${xScale(i)}" cy="${yLeft(v)}" r="3.5" fill="#7c3aed" />`).join('')}
        <path d="${makePath(clicks, yLeft)}" fill="none" stroke="#2563eb" stroke-width="2.5" />
        ${clicks.map((v, i) => `<circle cx="${xScale(i)}" cy="${yLeft(v)}" r="3.5" fill="#2563eb" />`).join('')}
        <path d="${makePath(spends, yRight)}" fill="none" stroke="#059669" stroke-width="2.5" />
        ${spends.map((v, i) => `<circle cx="${xScale(i)}" cy="${yRight(v)}" r="3.5" fill="#059669" />`).join('')}
      </svg>`;
  }
};

const DataManager = {
  render() {
    this.renderSelects();
    this.renderTable();
    this.bindActions();
  },

  renderSelects() {
    const exportSel = $('#export-month');
    if (exportSel) exportSel.innerHTML = App.state.months.map(m => `<option value="${m}">${Utils.fmtMonth(m)}</option>`).join('');
    const calcSel = $('#calc-month');
    if (calcSel) calcSel.innerHTML = App.state.months.map(m => `<option value="${m}">${Utils.fmtMonth(m)}</option>`).join('');
  },

  renderTable() {
    const data = App.getFilteredData(App.state.currentSku, App.state.currentMonth)
      .sort((a, b) => a.date.localeCompare(b.date));
    const count = $('#data-count');
    if (count) count.textContent = `共 ${data.length} 条记录`;
    const table = $('#manage-table');
    if (!table) return;
    table.innerHTML = `
      ${renderTableHead(detailColumns)}
      <tbody>${data.map(r => Detail.renderRow(r)).join('')}</tbody>`;
    Detail.bindEditing(table);
  },

  bindActions() {
    const importBtn = $('#btn-import');
    if (importBtn && importBtn.dataset.bound !== '1') {
      importBtn.dataset.bound = '1';
      importBtn.addEventListener('click', async () => {
        const fileInput = $('#import-file');
        const file = fileInput?.files?.[0];
        const path = $('#import-path')?.value.trim();
        if (!file && !path) { showToast('请选择Excel文件或输入服务器可访问的文件路径', 'error'); return; }
        importBtn.textContent = '导入中...';
        importBtn.disabled = true;
        try {
          let res;
          if (file) {
            const formData = new FormData();
            formData.append('file', file);
            res = await apiPostForm('/sync/excel-file', formData);
          } else {
            res = await apiPost('/sync/excel', { path });
          }
          if (res.error) { showToast(res.error, 'error'); return; }
          showToast(`导入成功：${res.file}，${res.records} 条记录`, 'success');
          if (fileInput) fileInput.value = '';
          await App.loadMetadata();
          await App.loadAllData();
          this.render();
        } catch (e) {
          showToast('导入失败: ' + (e.message || '未知错误'), 'error');
        } finally {
          importBtn.textContent = '导入数据';
          importBtn.disabled = false;
        }
      });
    }

    const exportBtn = $('#btn-export');
    if (exportBtn && exportBtn.dataset.bound !== '1') {
      exportBtn.dataset.bound = '1';
      exportBtn.addEventListener('click', () => {
        const month = $('#export-month')?.value || '';
        window.open(`${API}/export/excel?month=${month}`, '_blank');
        showToast('正在导出...', 'success');
      });
    }

    const calcBtn = $('#btn-calc');
    if (calcBtn && calcBtn.dataset.bound !== '1') {
      calcBtn.dataset.bound = '1';
      calcBtn.addEventListener('click', async () => {
        const month = $('#calc-month')?.value || '';
        calcBtn.textContent = '计算中...';
        calcBtn.disabled = true;
        try {
          await apiPost('/weekly/calculate', { month });
          showToast(`已重算 ${Utils.fmtMonth(month)} 周汇总`, 'success');
        } catch (e) {
          showToast('计算失败', 'error');
        } finally {
          calcBtn.textContent = '重新计算';
          calcBtn.disabled = false;
        }
      });
    }
  }
};
/* ═══════════════════════════════════════════════════════
   启动
   ═══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => App.init());












