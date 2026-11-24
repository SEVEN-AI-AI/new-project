/* 模块一：店铺经营总览 */
(function () {
  'use strict';
  var C = window.DashCommon;
  var state = C.state;

  function load() {
    var p = ['period=' + state.period, 'date=' + state.date];
    if (state.store) p.push('store=' + encodeURIComponent(state.store));
    C.fetchJson(C.API + '/overview?' + p.join('&')).then(function (d) {
      renderKpis(d);
      renderChart(d);
      renderCompare(d);
    }).catch(function (e) { C.toast('加载失败：' + e.message, true); });
  }

  function renderKpis(d) {
    var c = d.current || {};
    var delta = (d.delta || {})[state.compare] || {};
    document.getElementById('overview-range').textContent = d.start + ' ~ ' + d.end;
    var items = [
      { label: 'GMV ($)', value: C.fmtMoney(c.gmv), delta: delta.gmv },
      { label: '订单数', value: C.fmtNum(c.orders), delta: delta.orders },
      { label: '广告花费 ($)', value: C.fmtMoney(c.ad_spend), delta: delta.ad_spend },
      { label: 'ROI', value: c.roi === null ? '--' : C.fmtNum(c.roi, 2), delta: delta.roi },
      { label: 'TACOS', value: C.fmtPct(c.tacos), delta: delta.tacos, invert: true },
    ];
    document.getElementById('overview-kpis').innerHTML = items.map(function (it) {
      var h = C.deltaHtml(it.delta, state.compare);
      if (it.invert && it.delta !== null && it.delta !== undefined) {
        h = h.replace('delta-up', 'tmp-x').replace('delta-down', 'delta-up').replace('tmp-x', 'delta-down');
      }
      return '<div class="kpi"><div class="kpi-copy"><span>' + it.label + '</span><strong>' + it.value + '</strong>' + h + '</div></div>';
    }).join('');
  }

  function renderChart(d) {
    var pts = d.daily || [];
    var box = document.getElementById('overview-chart');
    if (!pts.length) { box.innerHTML = '<div class="empty-cell">暂无数据，请先在「数据导入中心」导入订单报表</div>'; return; }
    var W = 1000, H = 260, padL = 55, padR = 20, padT = 20, padB = 45;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = Math.max.apply(null, pts.map(function (p) { return Math.max(p.gmv || 0, p.ad_spend || 0); }).concat([1]));
    var slot = iw / pts.length;
    var bw = Math.max(4, Math.min(38, slot * 0.55));
    var y = function (v) { return padT + ih - (v / maxV) * ih; };
    var parts = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'];
    for (var i = 0; i <= 4; i++) {
      var gy = padT + ih - ih / 4 * i;
      parts.push('<line class="chart-grid-line" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>');
      parts.push('<text class="chart-label" x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + C.fmtNum(maxV / 4 * i, 0) + '</text>');
    }
    var linePts = [];
    pts.forEach(function (p, idx) {
      var cx = padL + slot * idx + slot / 2;
      var bh = Math.max(0, (p.gmv || 0) / maxV * ih);
      parts.push('<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + y(p.gmv || 0) + '" width="' + bw + '" height="' + bh + '" rx="2"><title>' + p.date + ' GMV $' + C.fmtNum(p.gmv, 2) + '</title></rect>');
      linePts.push([cx, y(p.ad_spend || 0), p.date, p.ad_spend]);
      var step = pts.length > 20 ? Math.ceil(pts.length / 10) : 1;
      if (idx % step === 0 || idx === pts.length - 1) {
        parts.push('<text class="chart-label" x="' + cx + '" y="' + (H - 16) + '" text-anchor="middle">' + p.date.slice(5) + '</text>');
      }
    });
    if (linePts.length > 1) parts.push('<polyline class="chart-line" points="' + linePts.map(function (a) { return a[0] + ',' + a[1]; }).join(' ') + '"/>');
    linePts.forEach(function (a) {
      parts.push('<circle class="chart-dot" cx="' + a[0] + '" cy="' + a[1] + '" r="3"><title>' + a[2] + ' 广告花费 $' + C.fmtNum(a[3], 2) + '</title></circle>');
    });
    parts.push('</svg>');
    box.innerHTML = '<div class="chart-legend"><span><i class="legend-swatch" style="background:#7c3aed"></i>GMV</span><span><i class="legend-swatch" style="background:#f59e0b"></i>广告花费</span></div>' + parts.join('');
  }

  function renderCompare(d) {
    var cur = d.current || {};
    var prev = (d[state.compare] || {});
    var delta = (d.delta || {})[state.compare] || {};
    document.getElementById('compare-col-title').textContent = state.compare === 'mom' ? '上期' : '去年同期';
    var rows = [
      ['GMV', C.fmtMoney(cur.gmv), C.fmtMoney(prev.gmv), delta.gmv],
      ['订单数', C.fmtNum(cur.orders), C.fmtNum(prev.orders), delta.orders],
      ['广告花费', C.fmtMoney(cur.ad_spend), C.fmtMoney(prev.ad_spend), delta.ad_spend],
      ['广告销售额', C.fmtMoney(cur.ad_gmv), C.fmtMoney(prev.ad_gmv), null],
      ['ROI', cur.roi === null ? '--' : C.fmtNum(cur.roi, 2), prev.roi === null ? '--' : C.fmtNum(prev.roi, 2), delta.roi],
      ['TACOS', C.fmtPct(cur.tacos), C.fmtPct(prev.tacos), delta.tacos],
      ['动销 SKU 数', C.fmtNum(cur.skus), C.fmtNum(prev.skus), null],
    ];
    document.getElementById('compare-tbody').innerHTML = rows.map(function (r) {
      return '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + C.deltaHtml(r[3], state.compare) + '</td></tr>';
    }).join('');
  }

  function init() {
    C.bindSeg('period-seg', 'period', load);
    C.bindSeg('compare-seg', 'compare', load);
    C.bindCommonFilters(function () { C.loadMeta().then(load); });
    C.loadMeta().then(load);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
