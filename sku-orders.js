/* 模块二：订单明细（日期柱状图 + SKU 筛选） */
(function () {
  'use strict';
  var C = window.DashCommon;
  var state = C.state;

  function load() {
    var sku = (document.getElementById('order-sku-filter') || {}).value || '';
    var days = (document.getElementById('order-days') || {}).value || '30';
    var p = ['days=' + days];
    if (sku) p.push('sku=' + encodeURIComponent(sku));
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    C.fetchJson(C.API + '/order-history?' + p.join('&')).then(function (d) {
      document.getElementById('order-summary').textContent =
        '统计范围 ' + d.start + ' ~ ' + d.end + ' · 共 ' + C.fmtNum(d.summary.days) + ' 天 · ' +
        C.fmtNum(d.summary.orders) + ' 单 · ' + C.fmtMoney(d.summary.gmv) +
        (sku ? ' · 当前 SKU：' + sku : ' · 全部 SKU');
      renderChart(d);
      renderTable(d);
    }).catch(function (e) { C.toast('加载失败：' + e.message, true); });
  }

  function renderChart(d) {
    var pts = d.daily || [];
    var metric = (document.getElementById('order-metric') || {}).value || 'orders';
    var box = document.getElementById('order-chart');
    if (!pts.length) { box.innerHTML = '<div class="empty-cell">暂无订单数据，请先在「订单明细导入」上传报表</div>'; return; }

    var W = 1200, H = 300, padL = 60, padR = 24, padT = 20, padB = 60;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max.apply(null, pts.map(function (p) { return Number(p[metric]) || 0; }).concat([1]));
    var slot = iw / pts.length;
    var bw = Math.max(5, Math.min(44, slot * 0.62));
    var y = function (v) { return padT + ih - (v / maxV) * ih; };
    var isGmv = metric === 'gmv';
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];

    for (var i = 0; i <= 4; i++) {
      var gy = padT + ih - ih / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' +
        (isGmv ? '$' + C.fmtNum(maxV / 4 * i, 0) : C.fmtNum(maxV / 4 * i, 0)) + '</text>');
    }

    pts.forEach(function (p, idx) {
      var v = Number(p[metric]) || 0;
      var cx = padL + slot * idx + slot / 2;
      var bh = Math.max(0, v / maxV * ih);
      var tip = p.date + ' · ' + C.fmtNum(p.orders) + ' 单 · GMV ' + C.fmtMoney(p.gmv) + ' · ' + C.fmtNum(p.skus) + ' SKU';
      parts.push('<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + y(v) + '" width="' + bw + '" height="' + bh + '" rx="3"><title>' + tip + '</title></rect>');
      if (v > 0) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (y(v) - 6) + '" text-anchor="middle">' +
          (isGmv ? '$' + C.fmtNum(v, 0) : C.fmtNum(v, 0)) + '</text>');
      }
      var step = pts.length > 20 ? Math.ceil(pts.length / 12) : 1;
      if (idx % step === 0 || idx === pts.length - 1) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 22) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
      }
    });
    parts.push('</svg>');
    box.innerHTML = parts.join('');
  }

  function renderTable(d) {
    var rows = d.details || [];
    var box = document.getElementById('order-detail-tbody');
    document.getElementById('detail-count').textContent = C.fmtNum(rows.length) + ' 条记录';
    if (!rows.length) {
      box.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无数据</td></tr>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var o = parseInt(r.orders) || 0;
      var g = parseFloat(r.gmv) || 0;
      return '<tr>' +
        '<td>' + esc(r.date) + '</td>' +
        '<td class="sku-cell">' + esc(r.sku) + '</td>' +
        '<td class="title-cell" title="' + esc(r.product_name) + '">' + esc(r.product_name) + '</td>' +
        '<td>' + esc(r.store) + '</td>' +
        '<td class="num">' + C.fmtNum(o) + '</td>' +
        '<td class="num">' + C.fmtMoney(g) + '</td>' +
        '<td class="num">' + (o > 0 ? C.fmtMoney(g / o) : '--') + '</td>' +
        '</tr>';
    }).join('');
  }

  function esc(s) { return C.esc(s); }

  function init() {
    C.bindCommonFilters(function () { C.loadMeta().then(function () { fillSkus(); load(); }); });
    var sf = document.getElementById('order-sku-filter');
    if (sf) sf.addEventListener('change', load);
    var dd = document.getElementById('order-days');
    if (dd) dd.addEventListener('change', load);
    var m = document.getElementById('order-metric');
    if (m) m.addEventListener('change', function () { load(); });
    C.loadMeta().then(function () { fillSkus(); load(); });
  }

  function fillSkus() {
    var sf = document.getElementById('order-sku-filter');
    if (!sf) return;
    var current = sf.value;
    sf.innerHTML = '<option value="">全部 SKU</option>' + (C.state.meta.skus || []).map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(s) + '</option>';
    }).join('');
    sf.value = current;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
