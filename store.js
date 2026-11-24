/* 店铺管理 - 单页三 tab（参考广告模块 section 架构） */
(function () {
  'use strict';

  var API = '/api/dashboard';
  var state = {
    meta: { stores: [], skus: [], dates: [], latest_date: '' },
    store: '', date: '', period: 'day', compare: 'mom',
    orderDate: '', orderViewMode: 'chart',
    currentView: 'store-overview',
    loaded: {},
  };
  var titles = {
    'store-overview': '整体店铺数据',
    'store-orders': '订单明细',
    'store-import': '订单明细导入',
  };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  // 安全绑定：元素不存在时静默跳过，避免中断后续所有事件绑定
  function on(sel, evt, fn) {
    var el = $(sel);
    if (el) el.addEventListener(evt, fn);
  }

  function fmtNum(n, d) {
    if (n === null || n === undefined || n === '') return '--';
    var v = parseFloat(n); if (isNaN(v)) return '--';
    return v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function fmtMoney(n) { return '$' + fmtNum(n, 2); }
  function fmtPct(n) { return (n === null || n === undefined) ? '--' : fmtNum(n, 1) + '%'; }
  function deltaHtml(v, invert) {
    if (v === null || v === undefined) return '<small style="color:var(--muted)">对比期无数据</small>';
    var up = v > 0;
    var cls = up ? 'delta-up' : (v < 0 ? 'delta-down' : 'delta-flat');
    if (invert) cls = up ? 'delta-down' : (v < 0 ? 'delta-up' : 'delta-flat');
    var arrow = v > 0 ? '↑' : (v < 0 ? '↓' : '—');
    return '<small class="' + cls + '">' + arrow + ' ' + fmtNum(Math.abs(v), 1) + '% ' + (state.compare === 'mom' ? '环比' : '同比') + '</small>';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg, isErr) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.className = 'toast ' + (isErr ? 'error' : '');
    setTimeout(function () { el.className = 'toast hidden'; }, 3200);
  }
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ── Tab 切换 ──
  function switchView(viewId) {
    state.currentView = viewId;
    $$('.store-nav-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.view === viewId); });
    $$('.store-module .view').forEach(function (v) { v.classList.toggle('active', v.id === viewId); });
    $('#view-title').textContent = titles[viewId] || '';
    if (!state.loaded[viewId]) {
      state.loaded[viewId] = true;
      if (viewId === 'store-overview') loadOverview();
      else if (viewId === 'store-orders') loadOrders();
      else if (viewId === 'store-import') { loadImportMeta(); loadHistory(); }
    }
  }

  // ── 元信息 ──
  function loadMeta() {
    return fetchJson(API + '/meta').then(function (m) {
      state.meta = m;
      if (!state.date) state.date = m.latest_date || new Date().toISOString().slice(0, 10);
      var d = $('#dash-date'); if (d) d.value = state.date;
      var s = $('#dash-store');
      if (s) {
        s.innerHTML = '<option value="">全部店铺</option>' + (m.stores || []).map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join('');
        s.value = state.store;
      }
      var sf = $('#order-sku-filter');
      if (sf) {
        var cur = sf.value;
        sf.innerHTML = '<option value="">全部 SKU</option>' + (m.skus || []).map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join('');
        sf.value = cur;
      }
      // 订单明细：店铺 / 日期（与总览店铺联动）
      var os = $('#order-store-filter');
      if (os) {
        os.innerHTML = '<option value="">全部店铺</option>' + (m.stores || []).map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join('');
        os.value = state.store;
      }
      var od = $('#order-date');
      if (od && !state.orderDate) state.orderDate = m.latest_date || new Date().toISOString().slice(0, 10);
      if (od) od.value = state.orderDate;
      // 导入页：归属店铺（默认跨境1店）
      var ims = $('#import-store');
      if (ims) {
        var stores = (m.stores || []).slice();
        if (stores.indexOf('跨境1店') < 0) stores.unshift('跨境1店');
        var keep = ims.value || '跨境1店';
        ims.innerHTML = stores.map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join('');
        ims.value = keep;
      }
      return m;
    });
  }

  // ── 模块1：整体店铺数据 ──
  function loadOverview() {
    var p = ['period=' + state.period, 'date=' + state.date];
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    fetchJson(API + '/overview?' + p.join('&')).then(function (d) {
      var c = d.current || {};
      var delta = (d.delta || {})[state.compare] || {};
      $('#overview-range').textContent = d.start + ' ~ ' + d.end;
      var items = [
        { l: 'GMV ($)', v: fmtMoney(c.gmv), d: delta.gmv },
        { l: '订单数', v: fmtNum(c.orders), d: delta.orders },
        { l: '广告花费 ($)', v: fmtMoney(c.ad_spend), d: delta.ad_spend },
        { l: 'ROI', v: c.roi === null ? '--' : fmtNum(c.roi, 2), d: delta.roi },
        { l: 'TACOS', v: fmtPct(c.tacos), d: delta.tacos, inv: true },
      ];
      $('#overview-kpis').innerHTML = items.map(function (it) {
        return '<div class="kpi"><div class="kpi-copy"><span>' + it.l + '</span><strong>' + it.v + '</strong>' + deltaHtml(it.d, it.inv) + '</div></div>';
      }).join('');
      renderOverviewChart(d);
      var prev = d[state.compare] || {};
      $('#compare-col-title').textContent = state.compare === 'mom' ? '上期' : '去年同期';
      var rows = [
        ['GMV', fmtMoney(c.gmv), fmtMoney(prev.gmv), delta.gmv],
        ['订单数', fmtNum(c.orders), fmtNum(prev.orders), delta.orders],
        ['广告花费', fmtMoney(c.ad_spend), fmtMoney(prev.ad_spend), delta.ad_spend],
        ['广告销售额', fmtMoney(c.ad_gmv), fmtMoney(prev.ad_gmv), null],
        ['ROI', c.roi === null ? '--' : fmtNum(c.roi, 2), prev.roi === null ? '--' : fmtNum(prev.roi, 2), delta.roi],
        ['TACOS', fmtPct(c.tacos), fmtPct(prev.tacos), delta.tacos],
        ['动销 SKU 数', fmtNum(c.skus), fmtNum(prev.skus), null],
      ];
      $('#compare-tbody').innerHTML = rows.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + deltaHtml(r[3]) + '</td></tr>';
      }).join('');
    }).catch(function (e) { toast('加载失败：' + e.message, true); });
  }

  function renderOverviewChart(d) {
    var pts = d.daily || [];
    var box = $('#overview-chart');
    if (!pts.length) { box.innerHTML = '<div class="empty-cell">暂无数据，请先在「订单明细导入」上传报表</div>'; return; }
    var W = 1000, H = 260, padL = 55, padR = 20, padT = 20, padB = 45;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max.apply(null, pts.map(function (p) { return Math.max(p.gmv || 0, p.ad_spend || 0); }).concat([1]));
    var slot = iw / pts.length, bw = Math.max(4, Math.min(38, slot * 0.55));
    var y = function (v) { return padT + ih - (v / maxV) * ih; };
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];
    for (var i = 0; i <= 4; i++) {
      var gy = padT + ih - ih / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + fmtNum(maxV / 4 * i, 0) + '</text>');
    }
    var linePts = [];
    pts.forEach(function (p, idx) {
      var cx = padL + slot * idx + slot / 2;
      var bh = Math.max(0, (p.gmv || 0) / maxV * ih);
      parts.push('<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + y(p.gmv || 0) + '" width="' + bw + '" height="' + bh + '" rx="2"><title>' + p.date + ' GMV $' + fmtNum(p.gmv, 2) + '</title></rect>');
      linePts.push([cx, y(p.ad_spend || 0), p.date, p.ad_spend]);
      var step = pts.length > 20 ? Math.ceil(pts.length / 10) : 1;
      if (idx % step === 0 || idx === pts.length - 1) parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 16) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
    });
    if (linePts.length > 1) parts.push('<polyline class="chart-line" points="' + linePts.map(function (a) { return a[0] + ',' + a[1]; }).join(' ') + '"/>');
    linePts.forEach(function (a) { parts.push('<circle class="chart-dot" cx="' + a[0] + '" cy="' + a[1] + '" r="3"><title>' + a[2] + ' 广告花费 $' + fmtNum(a[3], 2) + '</title></circle>'); });
    parts.push('</svg>');
    box.innerHTML = '<div class="chart-legend"><span><i class="legend-swatch" style="background:#7c3aed"></i>GMV</span><span><i class="legend-swatch" style="background:#f59e0b"></i>广告花费</span></div>' + parts.join('');
  }

  // ── 模块2：订单明细 ──
  function loadOrders() {
    var sku = ($('#order-sku-filter') || {}).value || '';
    var days = ($('#order-days') || {}).value || '30';
    var p = ['days=' + days, 'date=' + encodeURIComponent(state.orderDate || state.date || '')];
    if (sku) p.push('sku=' + encodeURIComponent(sku));
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    fetchJson(API + '/order-chart?' + p.join('&')).then(function (d) {
      var bySku = d.axis === 'sku';
      $('#order-chart-title').textContent = bySku
        ? ('当日各 SKU 订单 · ' + d.date)
        : (sku + ' 每日订单 · 近 ' + days + ' 天');
      $('#order-chart-hint').textContent = '横轴=' + (bySku ? 'SKU' : '日期') + '，鼠标悬停查看型号 / 订单数量 / GMV';
      $('#order-summary').textContent = (bySku ? '日期 ' + d.date : '统计范围 ' + d.start + ' ~ ' + d.end) +
        ' · ' + fmtNum(d.summary.skus) + ' 个 SKU · ' + fmtNum(d.summary.orders) + ' 单 · ' + fmtMoney(d.summary.gmv) +
        (sku ? ' · 当前 SKU：' + sku : ' · 全部 SKU') + (state.store ? ' · 店铺：' + state.store : ' · 全部店铺');
      if (state.orderViewMode === 'list') {
        renderOrderList(d);
        $('#order-chart').classList.add('hidden');
        $('#order-list').classList.remove('hidden');
      } else {
        renderOrderChart(d);
        $('#order-chart').classList.remove('hidden');
        $('#order-list').classList.add('hidden');
      }
      // 底部明细表
      var rows = d.details || [];
      $('#detail-count').textContent = fmtNum(rows.length) + ' 条记录';
      var box = $('#order-detail-tbody');
      if (!rows.length) { box.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无数据</td></tr>'; return; }
      box.innerHTML = rows.map(function (r) {
        var o = parseInt(r.orders) || 0, g = parseFloat(r.gmv) || 0;
        return '<tr><td>' + esc(r.date) + '</td><td class="sku-cell">' + esc(r.sku) + '</td>' +
          '<td class="title-cell" title="' + esc(r.product_name) + '">' + esc(r.product_name) + '</td>' +
          '<td>' + esc(r.store) + '</td><td class="num">' + fmtNum(o) + '</td><td class="num">' + fmtMoney(g) + '</td>' +
          '<td class="num">' + (o > 0 ? fmtMoney(g / o) : '--') + '</td></tr>';
      }).join('');
    }).catch(function (e) { toast('加载失败：' + e.message, true); });
  }

  function renderOrderChart(d) {
    var bars = d.bars || [];
    var metric = ($('#order-metric') || {}).value || 'orders';
    var box = $('#order-chart');
    if (!bars.length) { box.innerHTML = '<div class="empty-cell">暂无订单数据，请先在「订单明细导入」上传报表</div>'; return; }
    var W = 1200, H = 320, padL = 62, padR = 24, padT = 26, padB = 78;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max.apply(null, bars.map(function (p) { return Number(p[metric]) || 0; }).concat([1]));
    var slot = iw / bars.length, bw = Math.max(5, Math.min(46, slot * 0.62));
    var y = function (v) { return padT + ih - (v / maxV) * ih; };
    var isGmv = metric === 'gmv';
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];
    for (var i = 0; i <= 4; i++) {
      var gy = padT + ih - ih / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + (isGmv ? '$' : '') + fmtNum(maxV / 4 * i, 0) + '</text>');
    }
    var step = bars.length > 16 ? Math.ceil(bars.length / 12) : 1;
    bars.forEach(function (p, idx) {
      var v = Number(p[metric]) || 0, cx = padL + slot * idx + slot / 2, bh = Math.max(0, v / maxV * ih);
      var tipObj = { sku: p.sku || '-', name: p.product_name || '', date: p.date, orders: p.orders, gmv: p.gmv };
      var tipText = '型号：' + tipObj.sku + ' · 订单数量：' + fmtNum(p.orders) + ' · GMV：' + fmtMoney(p.gmv);
      parts.push('<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + bh + '" rx="3"' +
        ' data-tip="' + esc(JSON.stringify(tipObj)) + '"><title>' + esc(tipText) + '</title></rect>');
      if (v > 0) parts.push('<text class="chart-label" x="' + cx + '" y="' + (y(v) - 6) + '" text-anchor="middle">' + (isGmv ? '$' : '') + fmtNum(v, 0) + '</text>');
      var raw = String(p.label || '');
      var lab = raw.length > 11 ? raw.slice(0, 10) + '\u2026' : raw;
      if (idx % step === 0 || idx === bars.length - 1) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 26) + '" text-anchor="middle">' + esc(lab) + '</text>');
      }
    });
    parts.push('</svg>');
    box.innerHTML = parts.join('');
  }

  function renderOrderList(d) {
    var bars = d.bars || [], box = $('#order-list');
    if (!bars.length) { box.innerHTML = '<div class="empty-cell">暂无订单数据</div>'; return; }
    var bySku = d.axis === 'sku';
    var head = bySku
      ? '<tr><th>型号(SKU)</th><th>商品名称</th><th class="num">订单数量</th><th class="num">GMV ($)</th><th class="num">客单价</th></tr>'
      : '<tr><th>日期</th><th>型号(SKU)</th><th>商品名称</th><th class="num">订单数量</th><th class="num">GMV ($)</th><th class="num">客单价</th></tr>';
    var rows = bars.map(function (p) {
      var o = parseInt(p.orders) || 0, g = parseFloat(p.gmv) || 0;
      var lead = bySku
        ? '<td class="sku-cell">' + esc(p.sku) + '</td><td class="title-cell" title="' + esc(p.product_name) + '">' + esc(p.product_name) + '</td>'
        : '<td>' + esc(p.date) + '</td><td class="sku-cell">' + esc(p.sku) + '</td><td class="title-cell" title="' + esc(p.product_name) + '">' + esc(p.product_name) + '</td>';
      return '<tr>' + lead + '<td class="num">' + fmtNum(o) + '</td><td class="num">' + fmtMoney(g) +
        '</td><td class="num">' + (o > 0 ? fmtMoney(g / o) : '--') + '</td></tr>';
    }).join('');
    box.innerHTML = '<table class="dash-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>';
  }

  // ── 模块3：导入 ──
  function loadImportMeta() {
    return loadMeta().then(function (m) {
      var ds = m.dates || [];
      $('#data-overview').textContent = ds.length ? (ds[ds.length - 1] + ' ~ ' + ds[0]) : '暂无数据';
      $('#data-kpis').innerHTML = [
        { l: '已导入天数', v: fmtNum(ds.length) },
        { l: 'SKU 数', v: fmtNum((m.skus || []).length) },
        { l: '店铺数', v: fmtNum((m.stores || []).length) },
        { l: '最新数据日期', v: m.latest_date || '--' },
      ].map(function (it) { return '<div class="kpi"><div class="kpi-copy"><span>' + it.l + '</span><strong>' + it.v + '</strong></div></div>'; }).join('');
      return m;
    });
  }
  function loadHistory() {
    fetchJson(API + '/imports').then(function (rows) {
      var box = $('#import-history-tbody');
      if (!rows.length) { box.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无导入记录</td></tr>'; return; }
      box.innerHTML = rows.map(function (r) {
        return '<tr><td class="num">' + r.id + '</td><td>' + esc(r.import_time) + '</td><td>' + esc(r.source_file) + '</td>' +
          '<td class="num">' + fmtNum(r.record_count) + '</td><td>' + esc(r.date_from) + ' ~ ' + esc(r.date_to) + '</td>' +
          '<td>' + esc(r.status) + '</td><td class="title-cell">' + esc(r.note) + '</td></tr>';
      }).join('');
    }).catch(function (e) { toast('加载历史失败：' + e.message, true); });
  }

  function refreshAll() {
    loadMeta().then(function () {
      state.loaded = {};
      state.loaded[state.currentView] = true;
      if (state.currentView === 'store-overview') loadOverview();
      else if (state.currentView === 'store-orders') loadOrders();
      else if (state.currentView === 'store-import') { loadImportMeta(); loadHistory(); }
    });
  }

  // ── 事件 ──
  function bind() {
    $$('.store-nav-btn').forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.dataset.view); });
    });
    $$('#period-seg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#period-seg .seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); state.period = b.dataset.period; loadOverview();
      });
    });
    $$('#compare-seg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#compare-seg .seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); state.compare = b.dataset.compare; loadOverview();
      });
    });
    on('#dash-date', 'change', function () { state.date = this.value; loadOverview(); });
    on('#dash-store', 'change', function () {
      state.store = this.value;
      var os = $('#order-store-filter'); if (os) os.value = state.store;
      if (state.currentView === 'store-overview') loadOverview();
      else if (state.currentView === 'store-orders') loadOrders();
    });
    on('#order-store-filter', 'change', function () {
      state.store = this.value;
      var ds = $('#dash-store'); if (ds) ds.value = state.store;
      loadOrders();
    });
    on('#order-date', 'change', function () { state.orderDate = this.value; loadOrders(); });
    on('#order-sku-filter', 'change', loadOrders);
    on('#order-days', 'change', loadOrders);
    on('#order-metric', 'change', loadOrders);
    $$('#order-view-seg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#order-view-seg .seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); state.orderViewMode = b.dataset.viewmode; loadOrders();
      });
    });
    // 柱状图悬浮提示
    var tip = document.createElement('div');
    tip.className = 'chart-tooltip hidden'; document.body.appendChild(tip);
    on('#order-chart', 'mousemove', function (e) {
      var t = e.target;
      if (!t || t.tagName.toLowerCase() !== 'rect' || !t.classList.contains('chart-bar')) {
        tip.classList.add('hidden'); return;
      }
      var raw = t.getAttribute('data-tip'); if (!raw) { tip.classList.add('hidden'); return; }
      try {
        var info = JSON.parse(raw);
        tip.innerHTML = '<div><b>型号：' + esc(info.sku) + '</b></div>' +
          (info.name ? '<div>商品：' + esc(info.name) + '</div>' : '') +
          '<div>订单数量：' + fmtNum(info.orders) + '</div>' +
          '<div>GMV：' + fmtMoney(info.gmv) + '</div>';
        tip.classList.remove('hidden');
        tip.style.left = Math.min(e.clientX + 16, window.innerWidth - 240) + 'px';
        tip.style.top = Math.max(e.clientY - 12, 8) + 'px';
      } catch (err) { tip.classList.add('hidden'); }
    });
    on('#order-chart', 'mouseleave', function () { tip.classList.add('hidden'); });
    on('#dash-refresh', 'click', function () { refreshAll(); toast('已刷新'); });

    var fileInput = $('#import-file');
    on('#btn-import', 'click', function () { if (fileInput) fileInput.click(); });
    on('#import-file', 'change', function () {
      var f = fileInput.files && fileInput.files[0]; if (!f) return;
      var fd = new FormData(); fd.append('file', f);
      var impStore = ($('#import-store') || {}).value || '';
      if (impStore) fd.append('store', impStore);
      var log = $('#import-log');
      log.innerHTML = '<div>正在解析 ' + esc(f.name) + ' ...</div>';
      fetch(API + '/import-file', { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res.ok) { log.innerHTML = '<div class="log-err">导入失败：' + esc(res.error) + '</div>'; toast('导入失败：' + res.error, true); return; }
        log.innerHTML = '<div class="log-ok">✓ 导入成功：' + esc(f.name) + ' · 店铺 ' + esc(impStore || '跨境1店') + ' · 明细 ' + res.detail_rows + ' 行 → SKU 汇总 ' + res.imported + ' 条 · 日期 ' + res.date_from + ' ~ ' + res.date_to + '</div>' +
          '<div>最新日汇总：' + fmtNum(res.summary.orders) + ' 单 / ' + fmtMoney(res.summary.gmv) + ' / ' + fmtNum(res.summary.skus) + ' 个SKU</div>';
        toast('导入成功，已自动汇总');
        loadImportMeta(); loadHistory(); state.loaded = {};
      }).catch(function (e) { log.innerHTML = '<div class="log-err">请求失败：' + esc(e.message) + '</div>'; toast('请求失败', true); });
      fileInput.value = '';
    });
    on('#btn-template', 'click', function () {
      var csv = '\uFEFF日期,SKU,商品标题,销量,产品收入(USD),订单号\n' +
        '2026-11-23,KJC005,Large Dildo Realistic Brown,1,37.50,2000019742984844\n' +
        '2026-11-23,MM100,Muscular Sex Doll 3.8kg,1,69.00,2000019742510428\n';
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '订单导入模板.csv'; a.click();
      URL.revokeObjectURL(a.href);
    });
    on('#btn-demo', 'click', function () {
      fetch(API + '/demo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (res) {
        toast(res.ok ? ('已生成 ' + res.count + ' 条演示数据') : '生成失败', !res.ok);
        if (res.ok) { loadImportMeta(); loadHistory(); state.loaded = {}; }
      });
    });
    on('#btn-clear-demo', 'click', function () {
      if (!confirm('确定清除所有演示数据？导入的真实数据不会受影响。')) return;
      fetch(API + '/orders?source=demo', { method: 'DELETE' }).then(function (r) { return r.json(); }).then(function (res) {
        toast('已清除 ' + res.deleted + ' 条演示数据'); loadImportMeta(); loadHistory(); state.loaded = {};
      });
    });
  }

  function init() {
    var n = new Date();
    var z = function (x) { return String(x).padStart(2, '0'); };
    $('#dash-time').textContent = n.getFullYear() + '-' + z(n.getMonth() + 1) + '-' + z(n.getDate()) + ' ' + z(n.getHours()) + ':' + z(n.getMinutes());
    bind();
    loadMeta().then(function () { switchView('store-overview'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
