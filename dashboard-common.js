/* 店铺数据看板 - 公共工具与元信息加载 */
(function () {
  'use strict';

  var API = '/api/dashboard';

  var state = {
    meta: { stores: [], skus: [], dates: [], latest_date: '' },
    store: '',
    date: '',
    period: 'day',
    compare: 'mom',
  };

  function fmtNum(n, d) {
    if (n === null || n === undefined || n === '') return '--';
    var v = parseFloat(n);
    if (isNaN(v)) return '--';
    return v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function fmtMoney(n) { return '$' + fmtNum(n, 2); }
  function fmtPct(n) { return (n === null || n === undefined) ? '--' : fmtNum(n, 1) + '%'; }

  function deltaHtml(v, compare) {
    if (v === null || v === undefined) return '<small style="color:var(--muted)">对比期无数据</small>';
    var cls = v > 0 ? 'delta-up' : (v < 0 ? 'delta-down' : 'delta-flat');
    var arrow = v > 0 ? '↑' : (v < 0 ? '↓' : '—');
    var label = (compare || state.compare) === 'mom' ? '环比' : '同比';
    return '<small class="' + cls + '">' + arrow + ' ' + fmtNum(Math.abs(v), 1) + '% ' + label + '</small>';
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(msg, isErr) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (isErr ? 'error' : '');
    setTimeout(function () { el.className = 'toast hidden'; }, 3200);
  }
  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function setHeaderTime() {
    var el = document.getElementById('dash-time');
    if (!el) return;
    var n = new Date();
    var z = function (x) { return String(x).padStart(2, '0'); };
    el.textContent = n.getFullYear() + '-' + z(n.getMonth() + 1) + '-' + z(n.getDate()) + ' ' + z(n.getHours()) + ':' + z(n.getMinutes());
  }

  function loadMeta() {
    return fetchJson(API + '/meta').then(function (m) {
      state.meta = m;
      if (!state.date) state.date = m.latest_date || new Date().toISOString().slice(0, 10);
      var d = document.getElementById('dash-date');
      if (d) d.value = state.date;
      var s = document.getElementById('dash-store');
      if (s) {
        s.innerHTML = '<option value="">全部店铺</option>' + (m.stores || []).map(function (x) {
          return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
        }).join('');
        s.value = state.store;
      }
      var od = document.getElementById('sku-order-date');
      if (od) {
        var ds = m.dates || [];
        od.innerHTML = ds.map(function (x) { return '<option value="' + x + '">' + x + '</option>'; }).join('') || '<option value="">暂无数据</option>';
        od.value = state.date && ds.indexOf(state.date) >= 0 ? state.date : (ds[0] || '');
        state.date = od.value || state.date;
      }
      return m;
    });
  }

  function bindSeg(segId, key, onChange) {
    var box = document.getElementById(segId);
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.seg-btn'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(box.querySelectorAll('.seg-btn'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        state[key] = b.getAttribute('data-' + key);
        if (onChange) onChange();
      });
    });
  }

  function bindCommonFilters(onChange) {
    var d = document.getElementById('dash-date');
    if (d) d.addEventListener('change', function () { state.date = this.value; onChange(); });
    var s = document.getElementById('dash-store');
    if (s) s.addEventListener('change', function () { state.store = this.value; onChange(); });
    var od = document.getElementById('sku-order-date');
    if (od) od.addEventListener('change', function () { state.date = this.value; onChange(); });
    var r = document.getElementById('dash-refresh');
    if (r) r.addEventListener('click', function () { loadMeta().then(onChange); toast('已刷新'); });
  }

  function init() {
    setHeaderTime();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.DashCommon = {
    API: API, state: state,
    fmtNum: fmtNum, fmtMoney: fmtMoney, fmtPct: fmtPct,
    deltaHtml: deltaHtml, esc: esc, toast: toast,
    fetchJson: fetchJson, loadMeta: loadMeta,
    bindSeg: bindSeg, bindCommonFilters: bindCommonFilters,
  };
})();
