/**
 * 美客多ERP系统 - 统一逻辑层
 * 模块路由切换、广告模块动态加载、文件选择器、一级菜单折叠
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     状态
     ═══════════════════════════════════════════════════════ */
  const state = {
    currentModule: 'logistics',  // 'logistics' | 'ads'
    currentView: 'dashboard',    // active view id
    adLoaded: false,
    adInitDone: false,
    pendingAdView: null,         // 广告模块加载期间记住用户要看的 view
  };

  /* ═══════════════════════════════════════════════════════
     标题映射
     ═══════════════════════════════════════════════════════ */
  const logisticsTitles = {
    'dashboard': '全链路经营总览',
    'create': '创建货件',
    'tracking': '物流时效追踪',
    'costs': '头程费用核算',
    'providers': '服务商表现分析',
    'alerts': '延误预警',
  };

  const adTitles = {
    'ad-dashboard': '店铺经营总览',
    'ad-profit': '每日盈利表',
    'ad-detail': '单品广告诊断',
    'ad-manage': '数据导入',
  };

  const logisticsEyebrows = {
    'dashboard': '平均头程费.xlsx',
    'create': '新建记录',
    'tracking': '物流时效',
    'costs': '费用核算',
    'providers': '服务商',
    'alerts': '预警中心',
  };

  /* ═══════════════════════════════════════════════════════
     工具函数
     ═══════════════════════════════════════════════════════ */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  /* ═══════════════════════════════════════════════════════
     一级菜单折叠
     ═══════════════════════════════════════════════════════ */
  function initMenuGroups() {
    $$('.nav-group-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const groupName = toggle.dataset.group;
        const items = toggle.nextElementSibling;
        if (!items) return;

        const isCollapsed = items.classList.contains('collapsed');

        if (groupName === 'ads') {
          switchView('ad-dashboard');
        } else if (groupName === 'logistics') {
          switchView('dashboard');
        }

        // 点击时：如果已展开则折叠，如果已折叠则展开并激活第一个子项
        if (isCollapsed) {
          // 展开当前分组
          items.classList.remove('collapsed');
          toggle.classList.add('active');

          // 如果是广告分组且广告模块还没加载，不自动激活子项
          // 等用户自己点子项
        } else {
          // 折叠当前分组
          items.classList.add('collapsed');
          toggle.classList.remove('active');
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     模块路由
     ═══════════════════════════════════════════════════════ */
  function switchView(viewId) {
    const isAdView = viewId.startsWith('ad-');
    const adModule = $('#ad-module');
    const logFilters = $('#logistics-filters');
    const adFilters = $('#ad-filters');
    const headerAvatar = $('#header-avatar');
    const sidebar = document.querySelector('.sidebar');

    state.currentView = viewId;

    // 展开对应的一级菜单分组
    expandMenuGroup(isAdView ? 'ads' : 'logistics');

    // 切换模块
    if (isAdView && state.currentModule !== 'ads') {
      state.currentModule = 'ads';
      // 隐藏所有物流 view
      $$('.logistics-module').forEach(v => v.classList.remove('active'));
      // 显示广告模块容器
      adModule.classList.add('active');
      // 筛选器切换
      if (logFilters) logFilters.style.display = 'none';
      if (adFilters) adFilters.style.display = '';
      // 头像颜色
      headerAvatar.style.background = 'var(--ad-gradient)';
      headerAvatar.style.boxShadow = '0 10px 22px rgba(124, 58, 237, 0.28)';
      headerAvatar.textContent = 'A';
      // sidebar flex 布局（广告模块需要）
      // 隐藏物流返回按钮
      const backBtn = $('#back-to-list');
      if (backBtn) backBtn.hidden = true;

      // 首次切换到广告，加载广告模块
      if (!state.adLoaded) {
        // 记住用户真正想看的 view（而不是默认的 ad-dashboard）
        state.pendingAdView = viewId;
        // 先激活目标 view
        $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
        const targetView = $(`#${viewId}`);
        if (targetView) targetView.classList.add('active');
        // 异步加载（加载完成后会检查 pendingAdView）
        loadAdModule();
      } else if (state.adInitDone && window._adApp) {
        // 广告已加载，切换子 view
        $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
        window._adApp.state.currentView = viewId;
        if (window._adApp.applyViewDefaultRange) window._adApp.applyViewDefaultRange(viewId);
        window._adApp.renderCurrentView();
        const target = $(`#${viewId}`);
        if (target) target.classList.add('active');
      } else if (state.adInitDone === false && state.adLoaded) {
        // 加载中或加载失败，仍需激活 view 显示占位
        $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
        const targetView = $(`#${viewId}`);
        if (targetView) targetView.classList.add('active');
        // 如果之前失败了，重试加载
        if (state.adLoadFailed) {
          state.pendingAdView = viewId;
          loadAdModule();
        }
      }

    } else if (!isAdView && state.currentModule !== 'logistics') {
      state.currentModule = 'logistics';
      // 隐藏广告模块
      adModule.classList.remove('active');
      $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
      // 筛选器切换
      if (logFilters) logFilters.style.display = '';
      if (adFilters) adFilters.style.display = 'none';
      // 头像恢复
      headerAvatar.style.background = '';
      headerAvatar.style.boxShadow = '';
      headerAvatar.textContent = 'E';
      // sidebar 恢复
    }

    // 处理物流模块的 view 切换
    // Route inside the ads module.
    if (isAdView && state.currentModule === 'ads') {
      if (logFilters) logFilters.style.display = 'none';
      if (adFilters) adFilters.style.display = '';
      if (!state.adLoaded || !state.adInitDone || !window._adApp) {
        state.pendingAdView = viewId;
      } else {
        $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
        const target = $(`#${viewId}`);
        if (target) target.classList.add('active');
        window._adApp.state.currentView = viewId;
        if (window._adApp.applyViewDefaultRange) window._adApp.applyViewDefaultRange(viewId);
        window._adApp.renderCurrentView();
      }
    }

    if (!isAdView) {
      // 物流 view 切换（不调用 app.js 的 switchView，因为它会影响广告 view）
      $$('.logistics-module').forEach(v => v.classList.remove('active'));
      const target = $(`#${viewId}`);
      if (target) target.classList.add('active');

      // 更新物流相关的 UI
      const backBtn = $('#back-to-list');
      if (backBtn) backBtn.hidden = viewId !== 'create';

      // 如果切换到 create 且表单为空，重置表单
      if (viewId === 'create' && typeof resetEditMode === 'function') {
        const form = $('#shipment-form');
        if (form && !form.elements.recordId.value) resetEditMode();
      }

      // 触发物流系统的 renderAll
      if (typeof renderAll === 'function') renderAll();
    }

    // 导航按钮激活
    $$('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = $(`.nav-btn[data-view="${viewId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // 更新标题
    const title = isAdView ? adTitles[viewId] : logisticsTitles[viewId];
    const eyebrow = isAdView ? 'Mercado Libre Ads' : (logisticsEyebrows[viewId] || '美客多ERP');
    $('#view-title').textContent = title || '';
    $('#page-eyebrow').textContent = eyebrow;
  }

  /**
   * 展开指定的一级菜单分组，折叠另一个
   */
  function expandMenuGroup(groupName) {
    $$('.nav-group').forEach(group => {
      const toggle = group.querySelector('.nav-group-toggle');
      const items = group.querySelector('.nav-group-items');
      if (!toggle || !items) return;

      if (group.dataset.group === groupName) {
        items.classList.remove('collapsed');
        toggle.classList.add('active');
      } else {
        items.classList.add('collapsed');
        toggle.classList.remove('active');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     广告模块动态加载
     ═══════════════════════════════════════════════════════ */
  async function loadAdModule() {
    if (state.adLoaded && !state.adLoadFailed) return;
    state.adLoaded = true;
    state.adLoadFailed = false;

    try {
      // 1. 动态加载广告CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = './ad-system.css?v=2026052001';
      document.head.appendChild(cssLink);

      // 2. 动态加载广告JS（做 $ 函数隔离）
      const resp = await fetch('./ad-system.js?v=2026052001', { cache: 'no-store' });
      if (!resp.ok) throw new Error('加载广告JS失败');
      let code = await resp.text();

      // 先替换方法体（在 $ 替换之前）
      // 使用行级花括号计数来精确匹配方法边界
      const lines = code.split('\n');
      const result = [];
      let i = 0;
      const methodsToStub = ['bindNav', 'bindRefresh'];

      while (i < lines.length) {
        let stubbed = false;
        for (const methodName of methodsToStub) {
          const methodStart = new RegExp(`^\\s+${methodName}\\(\\)\\s*\\{\\s*$`);
          if (methodStart.test(lines[i])) {
            // Found method start, stub it
            result.push(lines[i].replace('{', '{ /* ERP nav */ },'));
            i++;
            // Skip entire method body (until the closing },)
            let braceCount = 1;
            while (i < lines.length && braceCount > 0) {
              braceCount += (lines[i].match(/\{/g) || []).length;
              braceCount -= (lines[i].match(/\}/g) || []).length;
              i++;
            }
            stubbed = true;
            break;
          }
        }
        if (!stubbed) {
          result.push(lines[i]);
          i++;
        }
      }
      code = result.join('\n');

      // 替换 DOMContentLoaded 监听（已过时，ERP 会手动 init）
      code = code.replace(
        /document\.addEventListener\('DOMContentLoaded'\s*,\s*\(\)\s*=>\s*App\.init\(\)\)/,
        '/* DOMContentLoaded 由 ERP 统一管理 */'
      );

      // 替换 $ 函数声明，避免与 app.js 的 const $ 冲突
      code = code.replace(/^const \$ = /m, () => 'const _ad$ = ');
      code = code.replace(/^const \$\$ = /m, () => 'const _ad$$ = ');
      // 替换所有 $(... 调用为 _ad$(...
      code = code.replace(/(?<![a-zA-Z0-9_])\$\$\(/g, () => '_ad$$(');
      code = code.replace(/(?<![a-zA-Z0-9_])\$\(/g, () => '_ad$(');

      const script = document.createElement('script');
      script.textContent = code;
      document.body.appendChild(script);

      // Initialize the embedded ads app after ERP has loaded.
      const targetAdView = state.pendingAdView || state.currentView || 'ad-dashboard';
      if (typeof App !== 'undefined' && App.init) {
        App.state.currentView = targetAdView;
        await App.init();
        window._adApp = App;
        App.loadEverything = async () => {
          await App.loadMetadata();
          await App.loadAllData();
        };
      }
      $$('#ad-module > .view').forEach(v => v.classList.remove('active'));
      const targetAdSection = $(`#${targetAdView}`);
      if (targetAdSection) targetAdSection.classList.add('active');
      if (window._adApp) {
        window._adApp.state.currentView = targetAdView;
        if (window._adApp.applyViewDefaultRange) window._adApp.applyViewDefaultRange(targetAdView);
        window._adApp.renderCurrentView();
      }

      state.adInitDone = true;
      state.pendingAdView = null;
      console.log('[ERP] 广告模块加载完成');
    } catch (e) {
      console.error('[ERP] 广告模块加载失败:', e);
      state.adLoaded = false;
      state.adLoadFailed = true;
      showToast('广告模块加载失败，请确认Flask服务正在运行', 'error');
    }
  }

  /* ═══════════════════════════════════════════════════════
     文件选择器
     ═══════════════════════════════════════════════════════ */
  function initFilePicker() {
    const browseBtn = $('#btn-browse');
    const fileInput = $('#import-file');
    const pathInput = $('#import-path');

    if (!browseBtn || !fileInput || !pathInput) return;

    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fullPath = file.path || file.name;
        if (fullPath.includes(':') || fullPath.includes('/')) {
          pathInput.value = fullPath;
        } else {
          const dir = pathInput.value.trim();
          if (dir && (dir.endsWith('\\') || dir.endsWith('/'))) {
            pathInput.value = dir + file.name;
          } else {
            pathInput.value = file.name;
          }
        }
        showToast(`已选择: ${pathInput.value}`, 'success');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     刷新按钮
     ═══════════════════════════════════════════════════════ */
  function initRefreshBtn() {
    const refreshBtn = $('#refresh-data');
    if (!refreshBtn) return;

    // 移除原有事件（物流系统的刷新按钮可能没有，但广告的有）
    const newBtn = refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);

    newBtn.addEventListener('click', () => {
      if (state.currentModule === 'ads' && window._adApp) {
        showToast('正在刷新广告数据...');
        (window._adApp.loadEverything || window._adApp.loadAllData).call(window._adApp).then(() => {
          window._adApp.renderCurrentView();
          showToast('广告数据已刷新', 'success');
        });
      } else {
        // 物流系统刷新（重新渲染当前 view）
        const activeView = document.querySelector('.logistics-module.active');
        if (activeView && typeof renderAll === 'function') {
          renderAll();
        }
        showToast('物流数据已刷新', 'success');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     Toast 通知（广告模块需要的全局 showToast）
     ═══════════════════════════════════════════════════════ */
  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type || ''}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  // 暴露到全局（广告模块需要调用 showToast）
  window.showToast = showToast;

  /* ═══════════════════════════════════════════════════════
     更新 header 时间
     ═══════════════════════════════════════════════════════ */
  function updateHeaderTime() {
    const el = document.getElementById('header-time');
    if (!el) return;
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    el.textContent = now.toLocaleDateString('zh-CN', options);
  }

  /* ═══════════════════════════════════════════════════════
     初始化
     ═══════════════════════════════════════════════════════ */
  function init() {
    // 初始化一级菜单折叠
    initMenuGroups();

    // 默认展开物流分组
    expandMenuGroup('logistics');

    // 绑定二级导航按钮（子菜单项）
    $$('.nav-btn').forEach(btn => {
      // 移除 app.js 可能绑定的事件（cloneNode 清除）
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        const view = newBtn.dataset.view;
        if (view) switchView(view);
      });
    });

    // 初始化文件选择器
    initFilePicker();

    // 初始化刷新按钮
    initRefreshBtn();

    // 更新时间
    updateHeaderTime();
    setInterval(updateHeaderTime, 60000);

    // 隐藏广告筛选器（初始状态）
    const adFilters = $('#ad-filters');
    if (adFilters) adFilters.style.display = 'none';

    // 确保初始只显示物流模块
    const adModule = $('#ad-module');
    if (adModule) adModule.classList.remove('active');
    $$('#ad-module > .view').forEach(v => v.classList.remove('active'));

    console.log('[ERP] 统一系统初始化完成');
  }

  // DOMContentLoaded 时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();




