/* 店铺数据看板 - 前端逻辑 */
(function () {
  'use strict';

  var API = '/api/dashboard';
  var state = {
    period: 'day',
    compare: 'mom',
    date: '',
    store: '',
    selectedSku: '',
    skuDate: '',
    meta: { stores: [], skus: [], dates: [], latest_date: '' },
    overview: null,
    skuOrders: null,
    trend: null,
  };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function fmtNum(n, d) {
    if (n === null || n === undefined || n === '') return '--';
    var v = parseFloat(n);
    if (isNaN(v)) return '--';
    return v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function fmtMoney(n) { return '$' + fmtNum(n, 2); }
  function fmtPct(n) { return (n === null || n === undefined) ? '--' : fmtNum(n, 1) + '%'; }
  function deltaHtml(v) {
    if (v === null || v === undefined) return '<small>对比期无数据</small>';
    var cls = v > 0 ? 'delta-up' : (v < 0 ? 'delta-down' : 'delta-flat');
    var arrow = v > 0 ? '↑' : (v < 0 ? '↓' : '—');
    return '<small class="' + cls + '">' + arrow + ' ' + fmtNum(Math.abs(v), 1) + '% ' + (state.compare === 'mom' ? '环比' : '同比') + '</small>';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg, isErr) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (isErr ? 'error' : '');
    setTimeout(function () { el.className = 'toast hidden'; }, 3200);
  }

  // ── 数据加载 ──
  function loadMeta() {
    return fetch(API + '/meta').then(function (r) { return r.json(); }).then(function (m) {
      state.meta = m;
      var dSel = $('#dash-date');
      var sSel = $('#dash-store');
      var odSel = $('#sku-order-date');
      if (!state.date) state.date = m.latest_date || new Date().toISOString().slice(0, 10);
      if (dSel) dSel.value = state.date;

      if (sSel) {
        sSel.innerHTML = '<option value="">全部店铺</option>' + (m.stores || []).map(function (s) {
          return '<option value="' + esc(s) + '">' + esc(s) + '</option>';
        }).join('');
        sSel.value = state.store;
      }
      if (odSel) {
        var ds = m.dates || [];
        odSel.innerHTML = ds.map(function (d) {
          return '<option value="' + d + '">' + d + '</option>';
        }).join('') || '<option value="">暂无数据</option>';
        state.skuDate = state.skuDate && ds.indexOf(state.skuDate) >= 0 ? state.skuDate : (ds[0] || '');
        odSel.value = state.skuDate;
      }
      return m;
    });
  }

  function loadOverview() {
    var p = [];
    p.push('period=' + state.period);
    p.push('date=' + state.date);
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    return fetch(API + '/overview?' + p.join('&')).then(function (r) { return r.json(); }).then(function (d) {
      state.overview = d;
      renderOverview(d);
      renderOverviewChart(d);
    });
  }

  function loadSkuOrders() {
    var p = [];
    if (state.skuDate) p.push('date=' + state.skuDate);
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    return fetch(API + '/sku-orders' + (p.length ? '?' + p.join('&') : '')).then(function (r) { return r.json(); }).then(function (d) {
      state.skuOrders = d;
      renderSkuOrders(d);
    });
  }

  function loadSkuTrend(sku) {
    if (!sku) return Promise.resolve();
    var days = parseInt(($('#trend-days') || {}).value, 10) || 14;
    var p = ['sku=' + encodeURIComponent(sku), 'days=' + days];
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    return fetch(API + '/sku-trend?' + p.join('&')).then(function (r) { return r.json(); }).then(function (d) {
      state.trend = d;
      renderSkuTrend(d);
    });
  }

  function reloadAll() {
    loadMeta()
      .then(function () { return Promise.all([loadOverview(), loadSkuOrders()]); })
      .then(function () {
        if (state.selectedSku) return loadSkuTrend(state.selectedSku);
      })
      .catch(function (e) { toast('数据加载失败：' + e.message, true); });
  }

  // ── 渲染 ──
  function renderOverview(d) {
    var c = d.current || {};
    var delta = (d.delta || {})[state.compare] || {};
    $('#overview-range').textContent = d.start + ' ~ ' + d.end;
    var items = [
      { label: 'GMV ($)', value: fmtMoney(c.gmv), delta: delta.gmv },
      { label: '订单数', value: fmtNum(c.orders), delta: delta.orders },
      { label: '广告花费 ($)', value: fmtMoney(c.ad_spend), delta: delta.ad_spend },
      { label: 'ROI', value: c.roi === null ? '--' : fmtNum(c.roi, 2), delta: delta.roi },
      { label: 'TACOS', value: fmtPct(c.tacos), delta: delta.tacos, invert: true },
    ];
    $('#overview-kpis').innerHTML = items.map(function (it) {
      var dHtml = deltaHtml(it.delta);
      if (it.invert && it.delta !== null && it.delta !== undefined) {
        // TACOS 下降是好事，翻转颜色语义
        dHtml = dHtml.replace('delta-up', 'tmp').replace('delta-down', 'delta-up').replace('tmp', 'delta-down');
      }
      return '<div class="kpi"><div class="kpi-copy"><span>' + it.label + '</span><strong>' + it.value + '</strong>' + dHtml + '</div></div>';
    }).join('');
  }

  // 纯 SVG 柱状+折线图
  function renderOverviewChart(d) {
    var points = d.daily || [];
    var box = $('#overview-chart');
    if (!box) return;
    if (!points.length) { box.innerHTML = '<div class="empty-cell">暂无数据，请先导入订单报表</div>'; return; }
    var W = 1000, H = 260, padL = 55, padR = 20, padT = 20, padB = 45;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var maxVal = Math.max.apply(null, points.map(function (p) { return Math.max(p.gmv || 0, p.ad_spend || 0); }).concat([1]));
    var n = points.length;
    var slot = innerW / n;
    var barW = Math.max(4, Math.min(38, slot * 0.55));
    var y = function (v) { return padT + innerH - (v / maxVal) * innerH; };
    var parts = [];
    parts.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">');
    // 网格线
    for (var i = 0; i <= 4; i++) {
      var gy = padT + innerH - (innerH / 4) * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + fmtNum(maxVal / 4 * i, 0) + '</text>');
    }
    // 柱 + 点
    var linePts = [];
    points.forEach(function (p, idx) {
      var cx = padL + slot * idx + slot / 2;
      var bh = Math.max(0, (p.gmv || 0) / maxVal * innerH);
      parts.push('<rect class="chart-bar" x="' + (cx - barW / 2) + '" y="' + (y(p.gmv || 0)) + '" width="' + barW + '" height="' + bh + '" rx="2"><title>' + p.date + ' GMV $' + fmtNum(p.gmv, 2) + '</title></rect>');
      linePts.push([cx, y(p.ad_spend || 0), p.date, p.ad_spend]);
      // X 轴标签（按点数稀疏显示）
      var step = n > 20 ? Math.ceil(n / 10) : 1;
      if (idx % step === 0 || idx === n - 1) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 16) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
      }
    });
    if (linePts.length > 1) {
      parts.push('<polyline class="chart-line" points="' + linePts.map(function (a) { return a[0] + ',' + a[1]; }).join(' ') + '"/>');
    }
    linePts.forEach(function (a) {
      parts.push('<circle class="chart-dot" cx="' + a[0] + '" cy="' + a[1] + '" r="3"><title>' + a[2] + ' 广告花费 $' + fmtNum(a[3], 2) + '</title></circle>');
    });
    parts.push('</svg>');
    box.innerHTML = '<div class="chart-legend"><span><i class="legend-swatch" style="background:#7c3aed"></i>GMV</span><span><i class="legend-swatch" style="background:#f59e0b"></i>广告花费</span></div>' + parts.join('');
  }

  function renderSkuOrders(d) {
    var box = $('#sku-order-tbody');
    var list = d.records || [];
    var s = d.summary || {};
    $('#sku-order-summary').textContent = d.date + ' · ' + fmtNum(s.orders) + ' 单 · ' + fmtMoney(s.gmv) + ' · ' + fmtNum(s.skus) + ' 个SKU';
    var keyword = (($('#sku-search') || {}).value || '').trim().toLowerCase();
    var filtered = keyword ? list.filter(function (r) {
      return (r.sku || '').toLowerCase().indexOf(keyword) >= 0 || (r.product_name || '').toLowerCase().indexOf(keyword) >= 0;
    }) : list;
    if (!filtered.length) {
      box.innerHTML = '<tr><td colspan="8" class="empty-cell">' + (list.length ? '无匹配结果' : '暂无数据，请先导入订单报表') + '</td></tr>';
      return;
    }
    var totalGmv = s.gmv || 0;
    box.innerHTML = filtered.map(function (r) {
      var gmv = parseFloat(r.gmv) || 0;
      var orders = parseInt(r.orders) || 0;
      var po = parseInt(r.prev_orders) || 0;
      var pg = parseFloat(r.prev_gmv) || 0;
      var od = po > 0 ? (orders - po) / po * 100 : null;
      var gd = pg > 0 ? (gmv - pg) / pg * 100 : null;
      var share = totalGmv > 0 ? (gmv / totalGmv * 100) : 0;
      var cls = r.sku === state.selectedSku ? ' selected' : '';
      return '<tr class="' + cls + '" data-sku="' + esc(r.sku) + '">' +
        '<td class="sku-cell">' + esc(r.sku) + '</td>' +
        '<td class="title-cell" title="' + esc(r.product_name) + '">' + esc(r.product_name) + '</td>' +
        '<td class="num">' + fmtNum(orders) + '</td>' +
        '<td class="num">' + deltaHtml(od) + '</td>' +
        '<td class="num">' + fmtMoney(gmv) + '</td>' +
        '<td class="num">' + deltaHtml(gd) + '</td>' +
        '<td class="num">' + (orders > 0 ? fmtMoney(gmv / orders) : '--') + '</td>' +
        '<td class="num">' + fmtNum(share, 1) + '%</td>' +
        '</tr>';
    }).join('');
    $$('#sku-order-tbody tr[data-sku]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        state.selectedSku = tr.getAttribute('data-sku');
        $$('#sku-order-tbody tr').forEach(function (x) { x.classList.remove('selected'); });
        tr.classList.add('selected');
        var nameEl = $('#trend-sku-name');
        if (nameEl) { nameEl.textContent = state.selectedSku; nameEl.hidden = false; }
        loadSkuTrend(state.selectedSku).catch(function (e) { toast('加载失败：' + e.message, true); });
      });
    });
  }

  function renderSkuTrend(d) {
    var pts = d.points || [];
    var s = d.summary || {};
    $('#sku-trend-kpis').innerHTML = [
      { label: '累计订单', value: fmtNum(s.orders) },
      { label: '累计 GMV', value: fmtMoney(s.gmv) },
      { label: '广告花费', value: fmtMoney(s.ad_spend) },
      { label: 'ROI', value: s.roi === null ? '--' : fmtNum(s.roi, 2) },
      { label: 'TACOS', value: fmtPct(s.tacos) },
      { label: '客单价', value: s.avg_order_value === null ? '--' : fmtMoney(s.avg_order_value) },
    ].map(function (it) {
      return '<div class="kpi"><div class="kpi-copy"><span>' + it.label + '</span><strong>' + it.value + '</strong></div></div>';
    }).join('');

    var box = $('#sku-trend-chart');
    if (!pts.length) { box.innerHTML = '<div class="empty-cell">该 SKU 在所选周期内暂无出单</div>'; return; }
    var W = 1000, H = 220, padL = 50, padR = 20, padT = 18, padB = 40;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var maxVal = Math.max.apply(null, pts.map(function (p) { return Math.max(p.orders || 0, p.ad_orders || 0); }).concat([1]));
    var slot = innerW / pts.length;
    var barW = Math.max(4, Math.min(30, slot * 0.55));
    var y = function (v) { return padT + innerH - (v / maxVal) * innerH; };
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];
    for (var i = 0; i <= 4; i++) {
      var gy = padT + innerH - innerH / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + fmtNum(maxVal / 4 * i, 0) + '</text>');
    }
    var adPts = [];
    pts.forEach(function (p, idx) {
      var cx = padL + slot * idx + slot / 2;
      var bh = Math.max(0, (p.orders || 0) / maxVal * innerH);
      parts.push('<rect class="chart-bar" x="' + (cx - barW / 2) + '" y="' + y(p.orders || 0) + '" width="' + barW + '" height="' + bh + '" rx="2"><title>' + p.date + ' 订单 ' + p.orders + ' · GMV $' + fmtNum(p.gmv, 2) + '</title></rect>');
      adPts.push([cx, y(p.ad_orders || 0)]);
      var step = pts.length > 14 ? Math.ceil(pts.length / 10) : 1;
      if (idx % step === 0 || idx === pts.length - 1) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 14) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
      }
    });
    if (adPts.length > 1) parts.push('<polyline class="chart-line" points="' + adPts.map(function (a) { return a[0] + ',' + a[1]; }).join(' ') + '"/>');
    parts.push('</svg>');
    box.innerHTML = '<div class="chart-legend"><span><i class="legend-swatch" style="background:#7c3aed"></i>出单量</span><span><i class="legend-swatch" style="background:#f59e0b"></i>广告出单</span></div>' + parts.join('');
  }

  // ── 事件绑定 ──
  function bind() {
    $$('#period-seg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#period-seg .seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        state.period = b.getAttribute('data-period');
        loadOverview().catch(function (e) { toast(e.message, true); });
      });
    });
    $$('#compare-seg .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#compare-seg .seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        state.compare = b.getAttribute('data-compare');
        loadOverview().catch(function (e) { toast(e.message, true); });
      });
    });
    $('#dash-date').addEventListener('change', function () {
      state.date = this.value;
      loadOverview().catch(function (e) { toast(e.message, true); });
    });
    $('#dash-store').addEventListener('change', function () {
      state.store = this.value;
      Promise.all([loadOverview(), loadSkuOrders()]).then(function () {
        if (state.selectedSku) return loadSkuTrend(state.selectedSku);
      }).catch(function (e) { toast(e.message, true); });
    });
    $('#sku-order-date').addEventListener('change', function () {
      state.skuDate = this.value;
      loadSkuOrders().catch(function (e) { toast(e.message, true); });
    });
    $('#sku-search').addEventListener('input', function () { renderSkuOrders(state.skuOrders || { records: [] }); });
    $('#trend-days').addEventListener('change', function () {
      if (state.selectedSku) loadSkuTrend(state.selectedSku).catch(function (e) { toast(e.message, true); });
    });
    $('#dash-refresh').addEventListener('click', function () { reloadAll(); toast('已刷新'); });

    // 导入：文件上传到后端解析
    var fileInput = $('#import-file');
    $('#btn-import').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('file', f);
      if (state.store) fd.append('store', state.store);
      var log = $('#import-log');
      log.innerHTML = '<div>正在解析 ' + esc(f.name) + ' ...</div>';
      fetch(API + '/import-file', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) {
            log.innerHTML = '<div class="log-err">导入失败：' + esc(res.error) + '</div>';
            toast('导入失败：' + res.error, true);
            return;
          }
          log.innerHTML = '<div class="log-ok">✓ 导入成功：' + esc(f.name) + ' · 明细 ' + res.detail_rows + ' 行 → SKU 汇总 ' + res.imported + ' 条 · 日期 ' + res.date_from + ' ~ ' + res.date_to + '</div>' +
            '<div>当日汇总：' + fmtNum(res.summary.orders) + ' 单 / ' + fmtMoney(res.summary.gmv) + ' / ' + res.summary.skus + ' 个SKU</div>';
          state.date = res.latest_date;
          state.skuDate = res.latest_date;
          toast('导入成功，已自动汇总');
          reloadAll();
        })
        .catch(function (e) { log.innerHTML = '<div class="log-err">请求失败：' + esc(e.message) + '</div>'; toast('请求失败', true); });
      fileInput.value = '';
    });

    // 下载 CSV 模板
    $('#btn-template').addEventListener('click', function () {
      var csv = '\uFEFF日期,SKU,商品标题,销量,产品收入(USD),订单号\n' +
        '2026-11-23,KJC005,Large Dildo Realistic Brown,1,37.50,2000019742984844\n' +
        '2026-11-23,MM100,Muscular Sex Doll 3.8kg,1,69.00,2000019742510428\n';
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '订单导入模板.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // 演示数据 / 清理
    $('#btn-demo').addEventListener('click', function () {
      fetch(API + '/demo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (res) {
        toast(res.ok ? ('已生成 ' + res.count + ' 条演示数据') : '生成失败', !res.ok);
        if (res.ok) reloadAll();
      });
    });
    $('#btn-clear-demo').addEventListener('click', function () {
      if (!confirm('确定清除所有演示数据？导入的真实数据不会受影响。')) return;
      fetch(API + '/orders?source=demo', { method: 'DELETE' }).then(function (r) { return r.json(); }).then(function (res) {
        toast('已清除 ' + res.deleted + ' 条演示数据');
        reloadAll();
      });
    });
  }

  function init() {
    var now = new Date();
    $('#dash-time').textContent = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    bind();
    reloadAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
