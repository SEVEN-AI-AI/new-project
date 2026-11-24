/* 模块三：订单明细导入 */
(function () {
  'use strict';
  var C = window.DashCommon;

  function loadMeta() {
    return C.loadMeta().then(function (m) {
      var ds = m.dates || [];
      document.getElementById('data-overview').textContent =
        ds.length ? (ds[ds.length - 1] + ' ~ ' + ds[0]) : '暂无数据';
      document.getElementById('data-kpis').innerHTML = [
        { label: '已导入天数', value: C.fmtNum(ds.length) },
        { label: 'SKU 数', value: C.fmtNum((m.skus || []).length) },
        { label: '店铺数', value: C.fmtNum((m.stores || []).length) },
        { label: '最新数据日期', value: m.latest_date || '--' },
      ].map(function (it) {
        return '<div class="kpi"><div class="kpi-copy"><span>' + it.label + '</span><strong>' + it.value + '</strong></div></div>';
      }).join('');
      return m;
    });
  }

  function loadHistory() {
    C.fetchJson(C.API + '/imports').then(function (rows) {
      var box = document.getElementById('import-history-tbody');
      if (!rows.length) { box.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无导入记录</td></tr>'; return; }
      box.innerHTML = rows.map(function (r) {
        return '<tr><td>' + r.id + '</td><td>' + esc(r.import_time) + '</td><td>' + esc(r.source_file) + '</td>' +
          '<td class="num">' + C.fmtNum(r.record_count) + '</td><td>' + esc(r.date_from) + ' ~ ' + esc(r.date_to) + '</td>' +
          '<td>' + esc(r.status) + '</td><td class="title-cell">' + esc(r.note) + '</td></tr>';
      }).join('');
    }).catch(function (e) { C.toast('加载历史失败：' + e.message, true); });
  }

  function esc(s) { return C.esc(s); }

  function init() {
    loadMeta();
    loadHistory();

    var fileInput = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('file', f);
      var log = document.getElementById('import-log');
      log.innerHTML = '<div>正在解析 ' + C.esc(f.name) + ' ...</div>';
      fetch(C.API + '/import-file', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) {
            log.innerHTML = '<div class="log-err">导入失败：' + C.esc(res.error) + '</div>';
            C.toast('导入失败：' + res.error, true);
            return;
          }
          log.innerHTML = '<div class="log-ok">✓ 导入成功：' + C.esc(f.name) + ' · 明细 ' + res.detail_rows + ' 行 → SKU 汇总 ' + res.imported + ' 条 · 日期 ' + res.date_from + ' ~ ' + res.date_to + '</div>' +
            '<div>最新日汇总：' + C.fmtNum(res.summary.orders) + ' 单 / ' + C.fmtMoney(res.summary.gmv) + ' / ' + C.fmtNum(res.summary.skus) + ' 个SKU</div>';
          C.toast('导入成功，已自动汇总');
          loadMeta();
          loadHistory();
        })
        .catch(function (e) { log.innerHTML = '<div class="log-err">请求失败：' + C.esc(e.message) + '</div>'; C.toast('请求失败', true); });
      fileInput.value = '';
    });

    document.getElementById('btn-template').addEventListener('click', function () {
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

    document.getElementById('btn-demo').addEventListener('click', function () {
      fetch(C.API + '/demo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (res) {
        C.toast(res.ok ? ('已生成 ' + res.count + ' 条演示数据') : '生成失败', !res.ok);
        if (res.ok) { loadMeta(); loadHistory(); }
      });
    });
    document.getElementById('btn-clear-demo').addEventListener('click', function () {
      if (!confirm('确定清除所有演示数据？导入的真实数据不会受影响。')) return;
      fetch(C.API + '/orders?source=demo', { method: 'DELETE' }).then(function (r) { return r.json(); }).then(function (res) {
        C.toast('已清除 ' + res.deleted + ' 条演示数据');
        loadMeta();
        loadHistory();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
