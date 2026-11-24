/* 店铺管理 - 单页三 tab（参考广告模块 section 架构） */
(function () {
  'use strict';

  var API = '/api/dashboard';
  var state = {
    meta: { stores: [], skus: [], dates: [], latest_date: '' },
    store: '', date: '', period: 'day', compare: 'mom',
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
    var p = ['days=' + days];
    if (sku) p.push('sku=' + encodeURIComponent(sku));
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    fetchJson(API + '/order-history?' + p.join('&')).then(function (d) {
      $('#order-summary').textContent = '统计范围 ' + d.start + ' ~ ' + d.end + ' · 共 ' + fmtNum(d.summary.days) + ' 天 · ' +
        fmtNum(d.summary.orders) + ' 单 · ' + fmtMoney(d.summary.gmv) + (sku ? ' · 当前 SKU：' + sku : ' · 全部 SKU');
      renderOrderChart(d);
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
    var pts = d.daily || [];
    var metric = ($('#order-metric') || {}).value || 'orders';
    var box = $('#order-chart');
    if (!pts.length) { box.innerHTML = '<div class="empty-cell">暂无订单数据，请先在「订单明细导入」上传报表</div>'; return; }
    var W = 1200, H = 300, padL = 60, padR = 24, padT = 20, padB = 60;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max.apply(null, pts.map(function (p) { return Number(p[metric]) || 0; }).concat([1]));
    var slot = iw / pts.length, bw = Math.max(5, Math.min(44, slot * 0.62));
    var y = function (v) { return padT + ih - (v / maxV) * ih; };
    var isGmv = metric === 'gmv';
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];
    for (var i = 0; i <= 4; i++) {
      var gy = padT + ih - ih / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + (isGmv ? '$' : '') + fmtNum(maxV / 4 * i, 0) + '</text>');
    }
    pts.forEach(function (p, idx) {
      var v = Number(p[metric]) || 0, cx = padL + slot * idx + slot / 2, bh = Math.max(0, v / maxV * ih);
      var tip = p.date + ' · ' + fmtNum(p.orders) + ' 单 · GMV ' + fmtMoney(p.gmv) + ' · ' + fmtNum(p.skus) + ' SKU';
      parts.push('<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + bh + '" rx="3"><title>' + tip + '</title></rect>');
      if (v > 0) parts.push('<text class="chart-label" x="' + cx + '" y="' + (y(v) - 6) + '" text-anchor="middle">' + (isGmv ? '$' : '') + fmtNum(v, 0) + '</text>');
      var step = pts.length > 20 ? Math.ceil(pts.length / 12) : 1;
      if (idx % step === 0 || idx === pts.length - 1) parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 22) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
    });
    parts.push('</svg>');
    box.innerHTML = parts.join('');
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
        return '<tr><td>' + r.id + '</td><td>' + esc(r.import_time) + '</td><td>' + esc(r.source_file) + '</td>' +
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
    $('#dash-date').addEventListener('change', function () { state.date = this.value; loadOverview(); });
    $('#dash-store').addEventListener('change', function () {
      state.store = this.value;
      if (state.currentView === 'store-overview') loadOverview();
      else if (state.currentView === 'store-orders') loadOrders();
    });
    $('#order-sku-filter').addEventListener('change', loadOrders);
    $('#order-days').addEventListener('change', loadOrders);
    $('#order-metric').addEventListener('change', loadOrders);
    $('#dash-refresh').addEventListener('click', function () { refreshAll(); toast('已刷新'); });

    var fileInput = $('#import-file');
    $('#btn-import').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0]; if (!f) return;
      var fd = new FormData(); fd.append('file', f);
      var log = $('#import-log');
      log.innerHTML = '<div>正在解析 ' + esc(f.name) + ' ...</div>';
      fetch(API + '/import-file', { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res.ok) { log.innerHTML = '<div class="log-err">导入失败：' + esc(res.error) + '</div>'; toast('导入失败：' + res.error, true); return; }
        log.innerHTML = '<div class="log-ok">✓ 导入成功：' + esc(f.name) + ' · 明细 ' + res.detail_rows + ' 行 → SKU 汇总 ' + res.imported + ' 条 · 日期 ' + res.date_from + ' ~ ' + res.date_to + '</div>' +
          '<div>最新日汇总：' + fmtNum(res.summary.orders) + ' 单 / ' + fmtMoney(res.summary.gmv) + ' / ' + fmtNum(res.summary.skus) + ' 个SKU</div>';
        toast('导入成功，已自动汇总');
        loadImportMeta(); loadHistory(); state.loaded = {};
      }).catch(function (e) { log.innerHTML = '<div class="log-err">请求失败：' + esc(e.message) + '</div>'; toast('请求失败', true); });
      fileInput.value = '';
    });
    $('#btn-template').addEventListener('click', function () {
      var csv = '\uFEFF日期,SKU,商品标题,销量,产品收入(USD),订单号\n' +
        '2026-11-23,KJC005,Large Dildo Realistic Brown,1,37.50,2000019742984844\n' +
        '2026-11-23,MM100,Muscular Sex Doll 3.8kg,1,69.00,2000019742510428\n';
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '订单导入模板.csv'; a.click();
      URL.revokeObjectURL(a.href);
    });
    $('#btn-demo').addEventListener('click', function () {
      fetch(API + '/demo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (res) {
        toast(res.ok ? ('已生成 ' + res.count + ' 条演示数据') : '生成失败', !res.ok);
        if (res.ok) { loadImportMeta(); loadHistory(); state.loaded = {}; }
      });
    });
    $('#btn-clear-demo').addEventListener('click', function () {
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
