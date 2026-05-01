(() => {
  const STORAGE = {
    settings: 'flowdesk-v19-settings',
    modules: 'flowdesk-v19-module-order',
    purchases: 'flowdesk-v19-purchases',
    stages: 'flowdesk-v19-purchase-stages',
    history: 'flowdesk-v19-purchase-history',
  };

  const themeCatalog = {
    ocean: { name: '海洋藍綠', primary: '#2563eb', primaryDark: '#1d4ed8', accent: '#14b8a6', sidebar: '#0f172a', sidebar2: '#172554', bg: '#f6f8fb' },
    violet: { name: '紫羅蘭', primary: '#7c3aed', primaryDark: '#6d28d9', accent: '#ec4899', sidebar: '#1e1b4b', sidebar2: '#312e81', bg: '#faf7ff' },
    emerald: { name: '森林綠', primary: '#059669', primaryDark: '#047857', accent: '#84cc16', sidebar: '#052e2b', sidebar2: '#064e3b', bg: '#f4fbf7' },
    amber: { name: '琥珀橘', primary: '#f59e0b', primaryDark: '#b45309', accent: '#ef4444', sidebar: '#2a1706', sidebar2: '#78350f', bg: '#fff9ed' },
    rose: { name: '玫瑰紅', primary: '#e11d48', primaryDark: '#be123c', accent: '#f97316', sidebar: '#3f0715', sidebar2: '#881337', bg: '#fff5f7' },
    slate: { name: '沉穩灰藍', primary: '#475569', primaryDark: '#334155', accent: '#0ea5e9', sidebar: '#0f172a', sidebar2: '#1e293b', bg: '#f7f9fc' },
  };

  const initialModules = [
    { id: 'home', name: '總覽', icon: 'overview' },
    { id: 'board', name: '工作看板', icon: 'kanban' },
    { id: 'base', name: '紀錄中心', icon: 'records' },
    { id: 'desk', name: '事件追蹤', icon: 'issue' },
    { id: 'roadmap', name: '專案追蹤', icon: 'project' },
    { id: 'docs', name: '知識庫', icon: 'knowledge' },
    { id: 'flow', name: '流程自動化', icon: 'automation' },
    { id: 'insight', name: '報表分析', icon: 'report' },
    { id: 'settings', name: '系統設定', icon: 'settings' },
  ];

  const workItems = [
    { id: 'FD-241', title: 'Adobe 授權續約確認', type: '授權', channel: '郵件', lane: '待分類', owner: 'Kyle', requester: '使用單位', due: '4/29', priority: '高', health: 86, relation: '採購 / 授權', tags: ['續約', '使用者確認', '發票資料'], note: '確認是否續約、離職人員是否轉移授權，後續提供報價單。' },
    { id: 'FD-242', title: '桃園廠警衛室交換器更換', type: '網路', channel: '現場處理', lane: '處理中', owner: 'Kyle', requester: '桃園廠', due: '今日', priority: '緊急', health: 94, relation: '設備 / 保固', tags: ['交換器', '備品', '保固'], note: '原交換器異常，先以備品更換，送修回來後再評估是否換回。' },
    { id: 'FD-243', title: 'hiHosting 舊主機停用文件', type: '主機服務', channel: '廠商聯繫', lane: '等待回覆', owner: 'Kyle', requester: '官網', due: '今日', priority: '高', health: 71, relation: '官網 / 中華電信', tags: ['停用', '文件', '公司資料'], note: '待最新版公司變更登記表與負責人身分證影本。' },
    { id: 'FD-244', title: 'Nutanix Demo 腳本與評估表', type: '專案', channel: '會議', lane: '已排程', owner: 'Kyle', requester: '資訊處', due: '5/02', priority: '中', health: 63, relation: '專案 / 虛擬化', tags: ['Nutanix', 'Demo', '報價'], note: '整理展示重點、主機移轉情境、備援與報價假設。' },
    { id: 'FD-245', title: '高雄營業所 Wi‑Fi AP 報價', type: '採購', channel: '使用者需求', lane: '處理中', owner: 'Kyle', requester: '陳政暉', due: '4/30', priority: '中', health: 66, relation: '採購 / 網路', tags: ['AP', '報價', '安裝'], note: '確認型號、現場網路、安裝方式與後續設定。' },
    { id: 'FD-246', title: 'NCG-Mobile 連線 BPM 規則驗證', type: '資安', channel: '防火牆', lane: '已完成', owner: 'Kyle', requester: '行動使用者', due: '4/24', priority: '高', health: 100, relation: '防火牆 / BPM', tags: ['BPM', '防火牆', '行動網路'], note: '已新增 NCG-Mobile 防火牆規則，測試可以連線。' },
  ];

  const baseTables = [
    { name: '採購紀錄', rows: 40, fields: ['廠商', '金額', '流程', '多品項'], color: 'violet' },
    { name: '廠商資料', rows: 31, fields: ['類型', '聯絡人', '合約', '最近聯繫'], color: 'green' },
    { name: '資產清冊', rows: 256, fields: ['序號', '位置', '保固', '使用人'], color: 'amber' },
    { name: '授權清單', rows: 18, fields: ['授權名稱', '到期日', '數量', '使用部門'], color: 'blue' },
  ];

  const tickets = [
    { id: 'SD-101', title: 'ERP 報表執行時連線中斷', type: '事件', impact: '高', status: '調查中', requester: 'ERP 使用者', sla: 78, eta: '2 小時 15 分', runbook: ['檢查 CPU / RAM / Disk I/O', '比對報表執行時間', '檢查網路與資料庫連線', '整理回覆與改善建議'] },
    { id: 'SD-102', title: '新人帳號與權限建立', type: '申請', impact: '中', status: '等待核准', requester: '人資', sla: 36, eta: '1 天', runbook: ['確認申請單位', '建立 AD / M365 帳號', '套用群組權限', '通知申請人'] },
    { id: 'SD-103', title: 'Webex 設備註冊異常', type: '問題', impact: '中', status: '排隊中', requester: '會議室', sla: 58, eta: '4 小時', runbook: ['確認設備 IP', '檢查註冊狀態', '確認網路規則', '聯絡維護廠商'] },
  ];

  const projects = [
    { id: 'PJ-01', name: 'Nutanix 平台導入評估', phase: '評估中', owner: 'Kyle', progress: 38, risk: '中風險', start: 8, length: 39, next: 'Demo 腳本與報價假設確認', milestones: ['資源清單', 'Demo', '報價', 'POC'] },
    { id: 'PJ-02', name: '官網平台遷移與舊主機停用', phase: '遷移中', owner: 'Kyle', progress: 67, risk: '高風險', start: 2, length: 44, next: 'SSL / DNS / 停用文件確認', milestones: ['新站驗證', 'DNS', 'SSL', '舊站停用'] },
    { id: 'PJ-03', name: '中壢廠 NAS 備份計畫', phase: '規劃中', owner: 'Kyle', progress: 24, risk: '中風險', start: 18, length: 54, next: '容量、權限與備份週期盤點', milestones: ['盤點', '採購', '資料轉移', '還原測試'] },
  ];

  const docs = [
    { id: 'DOC-01', icon: '🛡️', title: 'FortiGate VIP / IP Pool 操作筆記', folder: '網路', type: '操作手冊', updated: '今日', links: ['防火牆', 'NAT', 'VIP'] },
    { id: 'DOC-02', icon: '🔌', title: 'Cisco / Juniper 交換器指令速查', folder: '網路', type: '指令速查', updated: '昨日', links: ['Switch', 'CLI'] },
    { id: 'DOC-03', icon: '🌐', title: '網站移轉驗證清單', folder: '網站', type: '檢查清單', updated: '4/24', links: ['SSL', 'DNS', '主機'] },
    { id: 'DOC-04', icon: '💾', title: 'BESR + ABB 備份策略', folder: '備份', type: '標準作業流程', updated: '4/20', links: ['NAS', '備份', '還原測試'] },
  ];

  const rules = [
    { id: 'AUTO-01', title: '等待回覆超過 3 天', when: '狀態為等待回覆且超過 3 天', then: '建立追蹤任務並提高風險分數', status: '啟用' },
    { id: 'AUTO-02', title: 'SLA 剩餘低於 30 分鐘', when: 'SLA 剩餘時間低於 30 分鐘', then: '標記高風險並釘選到總覽', status: '啟用' },
    { id: 'AUTO-03', title: '採購到貨後', when: '採購階段變更為已到貨', then: '建立驗收檢查清單', status: '草稿' },
  ];

  const lanes = ['待分類', '已排程', '處理中', '等待回覆', '已完成'];

  const initialPurchaseStages = [
    { id: 'stage-1', name: '需求確認', tone: 'blue', enabled: true, locked: true },
    { id: 'stage-2', name: '詢價中', tone: 'violet', enabled: true },
    { id: 'stage-3', name: '待簽核', tone: 'amber', enabled: true },
    { id: 'stage-4', name: '已下單', tone: 'blue', enabled: true },
    { id: 'stage-5', name: '已到貨', tone: 'green', enabled: true },
    { id: 'stage-6', name: '已完成', tone: 'green', enabled: true, done: true },
    { id: 'stage-7', name: '已取消', tone: 'slate', enabled: false, cancel: true },
  ];

  const toneMap = {
    待分類: 'blue', 已排程: 'slate', 處理中: 'violet', 等待回覆: 'amber', 已完成: 'green',
    高: 'red', 緊急: 'red', 中: 'amber', 低: 'green', 啟用: 'green', 草稿: 'slate',
    已下單: 'violet', 待簽核: 'amber', 待確認: 'blue', 廠商展示: 'blue', 調查中: 'violet', 等待文件: 'amber', 詢價中: 'violet',
    排隊中: 'blue', 等待核准: 'amber', 高風險: 'red', 中風險: 'amber', 低風險: 'green', 已到貨: 'green', 需求確認: 'blue', 已取消: 'slate',
  };

  const catalog = [
    ['24 吋螢幕', '硬體設備', 3900], ['27 吋螢幕', '硬體設備', 5200], ['商務筆電', '電腦設備', 32500], ['桌上型電腦', '電腦設備', 28500],
    ['無線鍵鼠組', '周邊設備', 1200], ['USB-C Dock', '周邊設備', 4600], ['Wi‑Fi AP', '網路設備', 6800], ['8 Port 交換器', '網路設備', 2400],
    ['24 Port 交換器', '網路設備', 18500], ['Webex 會議鏡頭', '會議設備', 12800], ['會議室聲霸', '會議設備', 4200], ['UPS 1500VA', '電力設備', 9800],
    ['NAS 硬碟 8TB', '儲存設備', 7800], ['SSD 1TB', '儲存設備', 3200], ['Adobe 授權', '軟體授權', 16800], ['Veeam 續約', '軟體授權', 86000],
  ];
  const vendors = ['昌達資訊', '群環科技', '精誠資訊', '聯強國際', '欣南系統', '中華電信', '藍新科技', '原廠授權中心'];
  const departments = ['資訊處', '皇家可口桃園二廠', '南僑油脂', '高雄營業所', '台南廠', '中央廚房', '蛋糕中心', '其志樓會議室'];
  const requesters = ['Kyle', '黃瑋婷', '陳政暉', '黃雅玲', '郭淑鐘', 'Sami', '蕭勝展', '莊幃竣'];
  const priorities = ['低', '中', '高', '緊急'];

  const state = {
    active: 'home',
    query: '',
    view: '看板',
    selected: workItems[1],
    sidebarOpen: false,
    modal: null,
    modalData: null,
    draggingModule: null,
    activeTable: '採購紀錄',
    purchaseKeyword: '',
    stageFilter: '全部',
    vendorFilter: '全部',
    monthFilter: '全部',
    categoryFilter: '全部',
    priorityFilter: '全部',
    currentPage: 1,
    pageSize: 10,
    modules: loadModules(),
    settings: loadSettings(),
    purchases: loadList(STORAGE.purchases, makePurchases()),
    stages: loadList(STORAGE.stages, initialPurchaseStages),
    history: loadList(STORAGE.history, []),
  };

  function loadSettings() {
    const fallback = { appName: 'FlowDesk', theme: 'ocean', density: 'comfortable' };
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(STORAGE.settings)) || {}) }; } catch { return fallback; }
  }

  function loadModules() {
    try {
      const ids = JSON.parse(localStorage.getItem(STORAGE.modules) || '[]');
      if (!Array.isArray(ids) || !ids.length) return initialModules;
      const ordered = ids.map(id => initialModules.find(item => item.id === id)).filter(Boolean);
      const missing = initialModules.filter(item => !ids.includes(item.id));
      return [...ordered, ...missing];
    } catch { return initialModules; }
  }

  function loadList(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(parsed) && parsed.length ? parsed : fallback;
    } catch { return fallback; }
  }

  function persist() {
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE.modules, JSON.stringify(state.modules.map(item => item.id)));
    localStorage.setItem(STORAGE.purchases, JSON.stringify(state.purchases));
    localStorage.setItem(STORAGE.stages, JSON.stringify(state.stages));
    localStorage.setItem(STORAGE.history, JSON.stringify(state.history.slice(0, 100)));
  }

  function makePurchases() {
    const list = [];
    for (let i = 1; i <= 40; i += 1) {
      const count = (i % 4) + 1;
      const items = [];
      for (let j = 0; j < count; j += 1) {
        const base = catalog[(i + j * 3) % catalog.length];
        items.push({
          name: base[0],
          category: base[1],
          qty: ((i + j) % 3) + 1,
          unitPrice: base[2] + (i % 5) * 150,
          unit: base[0].includes('授權') || base[0].includes('續約') ? '套' : '台',
        });
      }
      const stage = initialPurchaseStages[(i - 1) % 6];
      const month = i <= 22 ? '04' : '03';
      const day = String(((i * 3) % 27) + 1).padStart(2, '0');
      const requestDate = `2026-${month}-${day}`;
      list.push({
        id: `PO-${String(i).padStart(3, '0')}`,
        title: items.map(item => item.name).slice(0, 2).join('、') + (items.length > 2 ? ` 等 ${items.length} 項` : ''),
        department: departments[i % departments.length],
        requester: requesters[i % requesters.length],
        vendor: vendors[i % vendors.length],
        priority: priorities[i % priorities.length],
        stageId: stage.id,
        requestDate,
        orderDate: ['stage-4', 'stage-5', 'stage-6'].includes(stage.id) ? requestDate : '',
        arrivalDate: ['stage-5', 'stage-6'].includes(stage.id) ? `2026-${month}-${String(Math.min(28, Number(day) + 4)).padStart(2, '0')}` : '',
        taxRate: 5,
        note: i % 5 === 0 ? '含多品項採購，測試統計、篩選與分頁。' : '測試資料，可直接編輯流程與品項。',
        items,
      });
    }
    return list;
  }

  function applyTheme() {
    const theme = themeCatalog[state.settings.theme] || themeCatalog.ocean;
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--sidebar', theme.sidebar);
    root.style.setProperty('--sidebar-2', theme.sidebar2);
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--primary-soft', hexToRgba(theme.primary, .12));
    document.body.classList.toggle('density-compact', state.settings.density === 'compact');
    document.body.classList.toggle('density-comfortable', state.settings.density !== 'compact');
  }

  function hexToRgba(hex, alpha) {
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  function render() {
    applyTheme();
    persist();
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="product-shell ${state.sidebarOpen ? 'sidebar-open' : ''} ${state.active === 'board' ? 'has-context' : ''}">
        ${renderSidebar()}
        <main class="main-canvas">
          ${renderTopbar()}
          ${renderActivePage()}
        </main>
        ${state.active === 'board' ? renderContextPanel() : ''}
        ${state.modal ? renderModal() : ''}
      </div>`;
  }

  function renderSidebar() {
    return `
      <aside class="workspace-sidebar" aria-label="側邊選單" data-sidebar>
        <div class="workspace-card">
          <div class="brand-mark">F</div>
          <div class="sidebar-copy"><strong>${esc(state.settings.appName || 'FlowDesk')}</strong><small>工作流管理平台</small></div>
        </div>
        <nav class="module-list">
          ${state.modules.map(item => `
            <button class="module ${state.active === item.id ? 'active' : ''}" draggable="true" data-module="${item.id}" title="${esc(item.name)}（可拖曳排序）">
              <span class="module-icon">${icon(item.icon)}</span><strong>${esc(item.name)}</strong><i class="drag-dot" aria-hidden="true"><span></span><span></span><span></span></i>
            </button>`).join('')}
        </nav>
        <button class="reset-order-btn" type="button" data-action="reset-module-order">恢復排序</button>
        <div class="mini-dashboard">
          <div class="mini-dashboard-top"><span>健康度</span><strong>${metrics().pulse}%</strong></div>
          <div class="pulse-bar"><span style="width:${metrics().pulse}%"></span></div>
        </div>
      </aside>`;
  }

  function renderTopbar() {
    return `
      <header class="app-topbar">
        <div><p class="eyebrow">今日工作狀態</p><h1>${pageTitle()}</h1></div>
        <div class="topbar-actions">
          <label class="global-search"><span>⌕</span><input data-input="query" value="${esc(state.query)}" placeholder="搜尋任務、事件、採購、文件..."></label>
          <button class="ghost-btn" type="button">邀請成員</button>
          <button class="primary-btn" type="button" data-action="open-launcher">新增</button>
        </div>
      </header>`;
  }

  function renderActivePage() {
    const pages = {
      home: renderHome,
      board: renderBoard,
      base: renderBase,
      desk: renderDesk,
      roadmap: renderRoadmap,
      docs: renderDocs,
      flow: renderFlow,
      insight: renderInsight,
      settings: renderSettings,
    };
    return (pages[state.active] || renderHome)();
  }

  function metrics() {
    const open = workItems.filter(item => item.lane !== '已完成').length;
    const waiting = workItems.filter(item => item.lane === '等待回覆').length;
    const urgent = workItems.filter(item => item.priority === '緊急' || item.priority === '高').length;
    const pulse = Math.round(workItems.reduce((sum, item) => sum + item.health, 0) / workItems.length);
    const spend = sum(state.purchases.map(purchaseTotal));
    return { open, waiting, urgent, pulse, spend };
  }

  function pageTitle() {
    return state.modules.find(item => item.id === state.active)?.name || 'FlowDesk';
  }

  function filteredWorkItems() {
    const keyword = state.query.trim().toLowerCase();
    if (!keyword) return workItems;
    return workItems.filter(item => [item.id, item.title, item.type, item.channel, item.relation, item.owner, item.note, ...item.tags].join(' ').toLowerCase().includes(keyword));
  }

  function renderHome() {
    const m = metrics();
    const focus = filteredWorkItems().slice(0, 4);
    const purchaseWaitingQuote = state.purchases.filter(row => stageName(row.stageId).includes('詢價')).length;
    const purchasePendingApproval = state.purchases.filter(row => stageName(row.stageId).includes('簽核')).length;
    const purchaseNotArrived = state.purchases.filter(row => !/已到貨|已完成|取消/.test(stageName(row.stageId))).length;
    return `
      <div class="home-layout">
        <section class="command-hero compact-hero">
          <div>
            <p class="eyebrow hero-eyebrow">今日焦點</p>
            <h2>優先處理佇列</h2>
            <p>保留原本 FlowDesk 工作台版型，把任務、事件、採購與專案集中在同一個作戰畫面。</p>
            <div class="hero-actions"><button data-page="board">工作看板</button><button data-page="desk">事件追蹤</button><button data-page="base">採購紀錄</button></div>
          </div>
          <div class="hero-metrics">${metric('未完成', m.open, 'blue')}${metric('等待回覆', m.waiting, 'amber')}${metric('高風險', m.urgent, 'red')}</div>
        </section>
        <section class="metric-strip">
          ${metric('整體健康度', `${m.pulse}%`, 'violet')}
          ${metric('開啟項目', m.open, 'blue')}
          ${metric('等待回覆', m.waiting, 'amber')}
          ${metric('採購金額', money(m.spend), 'green')}
        </section>
        <section class="panel wide purchase-home">
          ${panelTitle('採購處理', '採購流程總覽', '紀錄中心')}
          <div class="purchase-home-grid">
            <article><span>測試採購</span><strong>${state.purchases.length}</strong></article>
            <article><span>詢價中</span><strong>${purchaseWaitingQuote}</strong></article>
            <article><span>待簽核</span><strong>${purchasePendingApproval}</strong></article>
            <article><span>未到貨</span><strong>${purchaseNotArrived}</strong></article>
          </div>
          <div class="purchase-home-list">
            ${state.purchases.slice(0, 4).map(row => `<button type="button" data-page="base"><div><strong>${esc(row.title)}</strong><small>${esc(row.department)} · ${esc(row.vendor)} · ${row.items.length} 項</small></div>${badge(stageName(row.stageId), stageTone(row.stageId))}</button>`).join('')}
          </div>
        </section>
        <section class="panel wide">
          ${panelTitle('今日焦點', '優先處理佇列', '依風險排序')}
          <div class="focus-queue">
            ${focus.map(item => `<button class="focus-row" type="button" data-select-work="${item.id}"><span class="score-chip">${item.health}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.relation)} · ${esc(item.channel)} · ${esc(item.due)}</small></div>${badge(item.lane)}</button>`).join('')}
          </div>
        </section>
        <section class="panel wide">
          ${panelTitle('近期動態', '工作狀態流')}
          <div class="pulse-feed">
            ${filteredWorkItems().map(item => `<article class="pulse-item"><span class="dot ${toneMap[item.lane] || 'blue'}"></span><div><strong>${esc(item.title)}</strong><small>${esc(item.type)} · ${esc(item.owner)} · ${esc(item.note)}</small></div>${badge(item.priority)}</article>`).join('')}
          </div>
        </section>
      </div>`;
  }

  function renderBoard() {
    const items = filteredWorkItems();
    return `
      <div class="page-stack">
        <section class="surface-toolbar">
          <div><p class="eyebrow">工作管理</p><h2>工作看板</h2></div>
          <div class="segmented">${['看板','表格','卡片'].map(name => `<button class="${state.view === name ? 'active' : ''}" data-view="${name}">${name}</button>`).join('')}</div>
        </section>
        ${state.view === '看板' ? `<section class="kanban">${lanes.map(lane => renderLane(lane, items)).join('')}</section>` : ''}
        ${state.view === '表格' ? renderWorkTable(items) : ''}
        ${state.view === '卡片' ? `<section class="card-wall">${items.map(renderWorkCard).join('')}</section>` : ''}
      </div>`;
  }

  function renderLane(lane, items) {
    const laneItems = items.filter(item => item.lane === lane);
    return `<article class="lane"><div class="lane-title"><strong>${lane}</strong><span>${laneItems.length}</span></div><div class="lane-cards">${laneItems.map(renderWorkCard).join('')}</div></article>`;
  }

  function renderWorkCard(item) {
    return `<button class="work-card" type="button" data-select-work="${item.id}">
      <div class="card-meta"><span class="record-id">${item.id}</span>${badge(item.priority)}</div>
      <h3>${esc(item.title)}</h3><p>${esc(item.note)}</p>
      <div class="tag-row">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
      <div class="card-meta"><span>${esc(item.owner)}</span><span>${esc(item.due)}</span></div>
    </button>`;
  }

  function renderWorkTable(items) {
    return `<div class="table-wrap"><table><thead><tr><th>編號</th><th>項目</th><th>類型</th><th>負責人</th><th>狀態</th><th>優先</th><th>期限</th></tr></thead><tbody>${items.map(item => `<tr data-select-work="${item.id}"><td class="record-id">${item.id}</td><td><strong>${esc(item.title)}</strong><br><small>${esc(item.note)}</small></td><td>${esc(item.type)}</td><td>${esc(item.owner)}</td><td>${badge(item.lane)}</td><td>${badge(item.priority)}</td><td>${esc(item.due)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderBase() {
    return `
      <div class="base-layout">
        <section class="panel">
          ${panelTitle('資料庫', '紀錄中心')}
          <div class="table-menu">
            ${baseTables.map(table => `<button class="${state.activeTable === table.name ? 'active' : ''}" data-table="${esc(table.name)}"><strong>${esc(table.name)}</strong><small>${table.rows} 筆 · ${table.fields.join(' / ')}</small></button>`).join('')}
          </div>
        </section>
        <section class="panel">
          ${state.activeTable === '採購紀錄' ? renderPurchaseTable() : renderGenericTable()}
        </section>
      </div>`;
  }

  function renderGenericTable() {
    const table = baseTables.find(item => item.name === state.activeTable) || baseTables[0];
    return `<div class="empty-state"><h2>${esc(table.name)}</h2><p>此區先保留原本 FlowDesk 資料庫卡片樣式，後續可依實際欄位擴充。</p><div class="tag-row">${table.fields.map(field => `<span>${esc(field)}</span>`).join('')}</div></div>`;
  }

  function renderPurchaseTable() {
    const filtered = filteredPurchases();
    const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.currentPage = Math.min(Math.max(1, state.currentPage), pageCount);
    const start = (state.currentPage - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    const cats = unique(state.purchases.flatMap(p => p.items.map(item => item.category)));
    const months = unique(state.purchases.map(row => (row.requestDate || '').slice(0,7)).filter(Boolean)).sort().reverse();
    const activeStages = state.stages.filter(stage => stage.enabled);
    const totals = purchaseTotals(filtered);
    return `
      ${panelTitle('採購管理', '採購紀錄', `${filtered.length} / ${state.purchases.length} 筆`)}
      <div class="purchase-tools">
        <label class="table-search"><span>⌕</span><input data-input="purchaseKeyword" value="${esc(state.purchaseKeyword)}" placeholder="搜尋案號、品項、廠商、請購人..."></label>
        ${selectHtml('stageFilter', ['全部', ...activeStages.map(stage => stage.id)], state.stageFilter, value => value === '全部' ? '全部流程' : stageName(value))}
        ${selectHtml('vendorFilter', ['全部', ...unique(state.purchases.map(row => row.vendor))], state.vendorFilter)}
        ${selectHtml('monthFilter', ['全部', ...months], state.monthFilter, value => value === '全部' ? '全部月份' : value)}
        ${selectHtml('categoryFilter', ['全部', ...cats], state.categoryFilter, value => value === '全部' ? '全部類別' : value)}
        ${selectHtml('priorityFilter', ['全部', ...priorities], state.priorityFilter, value => value === '全部' ? '全部優先' : value)}
      </div>
      <div class="topbar-actions" style="justify-content:flex-start;margin-bottom:12px">
        <button class="primary-btn" type="button" data-action="new-purchase">新增採購</button>
        <button class="soft-btn" type="button" data-action="export-purchases">匯出 CSV</button>
        <button class="ghost-btn" type="button" data-page="settings">流程與主題設定</button>
        <button class="ghost-btn" type="button" data-action="reset-test-purchases">重置 40 筆測試資料</button>
      </div>
      <div class="purchase-kpis">
        <article><span>篩選筆數</span><strong>${filtered.length}</strong></article>
        <article><span>品項數量</span><strong>${sum(filtered.flatMap(row => row.items.map(item => Number(item.qty) || 0)))}</strong></article>
        <article><span>未稅小計</span><strong>${money(totals.beforeTax)}</strong></article>
        <article><span>稅額</span><strong>${money(totals.tax)}</strong></article>
        <article><span>含稅合計</span><strong>${money(totals.total)}</strong></article>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>案號</th><th>採購內容</th><th>需求單位</th><th>廠商</th><th>流程</th><th>優先</th><th>金額</th><th>申請日</th><th>操作</th></tr></thead>
          <tbody>${pageRows.map(renderPurchaseRow).join('') || `<tr><td colspan="9"><div class="empty-state">沒有符合條件的採購資料</div></td></tr>`}</tbody>
        </table>
      </div>
      <div class="pagination"><span>第 ${state.currentPage} / ${pageCount} 頁，每頁 ${state.pageSize} 筆</span><div class="pagination-controls"><button class="ghost-btn" data-action="prev-page">上一頁</button>${selectHtml('pageSize', [10,20,40], state.pageSize, v => `${v} 筆`)}<button class="ghost-btn" data-action="next-page">下一頁</button></div></div>`;
  }

  function renderPurchaseRow(row) {
    const total = purchaseTotal(row);
    return `<tr>
      <td><span class="record-id">${esc(row.id)}</span></td>
      <td><strong>${esc(row.title)}</strong><div class="items-preview">${row.items.slice(0,3).map(item => `<span class="mini-tag">${esc(item.name)} × ${esc(item.qty)}</span>`).join('')}${row.items.length > 3 ? `<span class="mini-tag">+${row.items.length - 3}</span>` : ''}</div></td>
      <td><strong>${esc(row.department)}</strong><br><small>${esc(row.requester)}</small></td>
      <td>${esc(row.vendor)}</td>
      <td>${badge(stageName(row.stageId), stageTone(row.stageId))}</td>
      <td>${badge(row.priority)}</td>
      <td><strong>${money(total)}</strong><br><small>${row.items.length} 項</small></td>
      <td>${esc(row.requestDate || '-')}</td>
      <td><div class="row-actions"><button data-action="edit-purchase" data-id="${row.id}">編輯</button><button data-action="duplicate-purchase" data-id="${row.id}">複製</button></div></td>
    </tr>`;
  }

  function renderDesk() {
    return `<div class="page-stack"><section class="surface-toolbar"><div><p class="eyebrow">事件追蹤</p><h2>服務台工單</h2></div></section><section class="card-wall">${tickets.map(t => `<article class="doc-card"><span class="record-id">${t.id}</span><h3>${esc(t.title)}</h3><p>${esc(t.requester)} · ${esc(t.eta)}</p>${badge(t.status)}<div class="tag-row">${t.runbook.map(step => `<span>${esc(step)}</span>`).join('')}</div></article>`).join('')}</section></div>`;
  }

  function renderRoadmap() {
    return `<div class="page-stack"><section class="surface-toolbar"><div><p class="eyebrow">專案追蹤</p><h2>專案路線圖</h2></div></section><section class="panel"><div class="timeline">${projects.map(p => `<article class="project-row"><div><strong>${esc(p.name)}</strong><small style="display:block;color:var(--muted)">${esc(p.phase)} · ${esc(p.owner)}</small></div><div><div class="progress-line"><span style="width:${p.progress}%"></span></div><div class="tag-row">${p.milestones.map(m => `<span>${esc(m)}</span>`).join('')}</div></div><div>${badge(p.risk)}<small style="display:block;color:var(--muted);margin-top:6px">${p.progress}%</small></div></article>`).join('')}</div></section></div>`;
  }

  function renderDocs() {
    return `<div class="page-stack"><section class="surface-toolbar"><div><p class="eyebrow">知識庫</p><h2>文件中心</h2></div></section><section class="doc-grid">${docs.map(d => `<article class="doc-card"><div class="doc-icon">${d.icon}</div><h3>${esc(d.title)}</h3><p>${esc(d.folder)} · ${esc(d.type)} · ${esc(d.updated)}</p><div class="tag-row">${d.links.map(link => `<span>${esc(link)}</span>`).join('')}</div></article>`).join('')}</section></div>`;
  }

  function renderFlow() {
    return `<div class="page-stack"><section class="surface-toolbar"><div><p class="eyebrow">流程自動化</p><h2>規則與採購流程</h2></div><button class="primary-btn" data-page="settings">調整採購流程</button></section><section class="rule-grid">${rules.map(r => `<article class="rule-card"><span class="record-id">${r.id}</span><h3>${esc(r.title)}</h3><p>如果：${esc(r.when)}</p><p>執行：${esc(r.then)}</p>${badge(r.status)}</article>`).join('')}</section><section class="panel wide">${panelTitle('採購流程', '目前啟用流程')}<div class="tag-row">${state.stages.filter(s => s.enabled).map(s => `<span class="badge ${s.tone}">${esc(s.name)}</span>`).join('')}</div></section></div>`;
  }

  function renderInsight() {
    const byVendor = groupTotals(state.purchases, row => row.vendor).slice(0, 6);
    const byCategory = groupCategoryTotals(state.purchases).slice(0, 6);
    const maxVendor = Math.max(1, ...byVendor.map(x => x.total));
    const maxCat = Math.max(1, ...byCategory.map(x => x.total));
    return `<div class="page-stack"><section class="surface-toolbar"><div><p class="eyebrow">報表分析</p><h2>採購與工作統計</h2></div></section><section class="metric-strip">${metric('採購總額', money(sum(state.purchases.map(purchaseTotal))), 'green')}${metric('採購筆數', state.purchases.length, 'blue')}${metric('品項總數', sum(state.purchases.flatMap(p => p.items.map(i => Number(i.qty) || 0))), 'violet')}${metric('高優先', state.purchases.filter(p => ['高','緊急'].includes(p.priority)).length, 'red')}</section><section class="insight-grid"><article class="panel">${panelTitle('廠商統計', '依金額排行')}<div class="bar-list">${byVendor.map(row => barRow(row.name, row.total, maxVendor)).join('')}</div></article><article class="panel">${panelTitle('品項統計', '依類別排行')}<div class="bar-list">${byCategory.map(row => barRow(row.name, row.total, maxCat)).join('')}</div></article></section></div>`;
  }

  function renderSettings() {
    return `<div class="settings-layout">
      <section class="panel">
        ${panelTitle('系統設定', 'UI 主題與顯示')}
        <div class="settings-grid">
          <div class="settings-field"><label>系統名稱</label><input data-setting="appName" value="${esc(state.settings.appName)}"></div>
          <div class="settings-field"><label>列表密度</label>${selectHtml('densitySetting', ['comfortable','compact'], state.settings.density, v => v === 'compact' ? '緊湊' : '舒適')}</div>
        </div>
        <h3 style="margin-top:20px">主題配色</h3>
        <div class="theme-options">${Object.entries(themeCatalog).map(([key, t]) => `<button class="theme-card ${state.settings.theme === key ? 'active' : ''}" data-theme="${key}"><div class="swatch"><span style="background:${t.primary}"></span><span style="background:${t.accent}"></span><span style="background:${t.sidebar}"></span></div><strong>${esc(t.name)}</strong></button>`).join('')}</div>
      </section>
      <section class="panel">
        ${panelTitle('採購流程自訂', '名稱、顏色、啟用與順序', `<button class="soft-btn" data-action="add-stage">新增流程</button>`)}
        <div class="stage-editor">${state.stages.map((stage, index) => renderStageRow(stage, index)).join('')}</div>
        <div class="topbar-actions" style="justify-content:flex-start;margin-top:14px"><button class="ghost-btn" data-action="reset-stages">恢復預設流程</button><button class="ghost-btn" data-action="reset-test-purchases">重置 40 筆測試資料</button></div>
      </section>
    </div>`;
  }

  function renderStageRow(stage, index) {
    return `<div class="stage-row" data-stage-row="${stage.id}"><input data-stage-name="${stage.id}" value="${esc(stage.name)}" ${stage.locked ? 'title="預設流程仍可改名"' : ''}>${selectHtml(`stageTone:${stage.id}`, ['blue','violet','amber','green','red','slate'], stage.tone, toneLabel)}<label style="display:flex;align-items:center;gap:6px;font-weight:800;color:var(--muted)"><input type="checkbox" data-stage-enabled="${stage.id}" ${stage.enabled ? 'checked' : ''}>啟用</label><div class="stage-buttons"><button data-action="stage-up" data-id="${stage.id}" ${index === 0 ? 'disabled' : ''}>↑</button><button data-action="stage-down" data-id="${stage.id}" ${index === state.stages.length - 1 ? 'disabled' : ''}>↓</button><button data-action="delete-stage" data-id="${stage.id}" ${stage.locked ? 'disabled' : ''}>刪</button></div></div>`;
  }

  function renderContextPanel() {
    const item = state.selected || workItems[0];
    return `<aside class="context-panel"><p class="eyebrow">快速檢視</p><h2>${esc(item.title)}</h2><p>${esc(item.note)}</p>${badge(item.lane)}<div class="context-section"><dl><div><dt>編號</dt><dd>${item.id}</dd></div><div><dt>負責人</dt><dd>${esc(item.owner)}</dd></div><div><dt>期限</dt><dd>${esc(item.due)}</dd></div><div><dt>健康度</dt><dd>${item.health}%</dd></div></dl></div><div class="context-section"><strong>標籤</strong><div class="tag-row">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></div></aside>`;
  }

  function renderModal() {
    if (state.modal === 'launcher') return renderLauncher();
    if (state.modal === 'purchase') return renderPurchaseModal(state.modalData);
    return '';
  }

  function renderLauncher() {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" data-modal-card><div class="modal-header"><div><p class="eyebrow">新增</p><h2>快速新增</h2></div><button class="icon-btn" data-action="close-modal">✕</button></div><div class="launcher-grid">${['新增任務','新增工單','新增採購','新增專案','新增文件','新增廠商'].map((name, idx) => `<button data-action="${name === '新增採購' ? 'new-purchase-from-launcher' : 'close-modal'}"><strong>${name}</strong><small>${idx === 2 ? '可建立多品項採購' : '保留原本 FlowDesk 快速入口'}</small></button>`).join('')}</div></section></div>`;
  }

  function renderPurchaseModal(row) {
    const data = row || blankPurchase();
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" data-modal-card><div class="modal-header"><div><p class="eyebrow">採購管理</p><h2>${row ? '編輯採購' : '新增採購'}</h2></div><button class="icon-btn" data-action="close-modal">✕</button></div>
      <form id="purchaseForm" data-id="${esc(data.id || '')}">
        <div class="form-grid">
          <div class="field"><label>案號</label><input name="id" value="${esc(data.id || nextPurchaseId())}" ${row ? 'readonly' : ''}></div>
          <div class="field"><label>需求單位</label><input name="department" value="${esc(data.department || '')}"></div>
          <div class="field"><label>請購人</label><input name="requester" value="${esc(data.requester || '')}"></div>
          <div class="field"><label>廠商</label><input name="vendor" value="${esc(data.vendor || '')}"></div>
          <div class="field"><label>流程</label>${selectHtml('modalStageId', state.stages.filter(s => s.enabled).map(s => s.id), data.stageId, stageName, 'stageId')}</div>
          <div class="field"><label>優先度</label>${selectHtml('modalPriority', priorities, data.priority || '中', v => v, 'priority')}</div>
          <div class="field"><label>申請日</label><input type="date" name="requestDate" value="${esc(data.requestDate || today())}"></div>
          <div class="field"><label>下單日</label><input type="date" name="orderDate" value="${esc(data.orderDate || '')}"></div>
          <div class="field"><label>到貨日</label><input type="date" name="arrivalDate" value="${esc(data.arrivalDate || '')}"></div>
          <div class="field full"><label>備註</label><textarea name="note" rows="2">${esc(data.note || '')}</textarea></div>
        </div>
        <h3 style="margin-top:16px">採購品項</h3>
        <div id="modalItems">${(data.items || []).map((item, idx) => itemEditor(item, idx)).join('')}</div>
        <button class="soft-btn" type="button" data-action="modal-add-item">新增品項</button>
        <div class="modal-footer"><span id="modalTotal">目前合計：${money(purchaseTotal(data))}</span><div class="modal-actions"><button class="ghost-btn" type="button" data-action="close-modal">取消</button>${row ? `<button class="danger-btn" type="button" data-action="delete-purchase" data-id="${row.id}">刪除</button>` : ''}<button class="primary-btn" type="submit">儲存</button></div></div>
      </form></section></div>`;
  }

  function itemEditor(item, idx) {
    return `<div class="item-editor" data-item-index="${idx}"><div class="item-editor-grid"><div class="field"><label>品項名稱</label><input name="itemName" value="${esc(item.name || '')}"></div><div class="field"><label>類別</label><input name="itemCategory" value="${esc(item.category || '')}"></div><div class="field"><label>數量</label><input name="itemQty" type="number" min="0" value="${esc(item.qty || 1)}"></div><div class="field"><label>單位</label><input name="itemUnit" value="${esc(item.unit || '台')}"></div><div class="field"><label>單價</label><input name="itemPrice" type="number" min="0" value="${esc(item.unitPrice || 0)}"></div><button class="icon-btn" type="button" data-action="modal-remove-item" data-index="${idx}">✕</button></div></div>`;
  }

  function blankPurchase() {
    return { id: nextPurchaseId(), department: '資訊處', requester: 'Kyle', vendor: '', priority: '中', stageId: state.stages.find(s => s.enabled)?.id || 'stage-1', requestDate: today(), orderDate: '', arrivalDate: '', note: '', items: [{ name: '', category: '硬體設備', qty: 1, unit: '台', unitPrice: 0 }] };
  }

  function filteredPurchases() {
    const keyword = state.purchaseKeyword.trim().toLowerCase();
    return state.purchases.filter(row => {
      const haystack = [row.id, row.title, row.department, row.requester, row.vendor, row.priority, row.note, stageName(row.stageId), ...row.items.flatMap(item => [item.name, item.category, item.unit])].join(' ').toLowerCase();
      const byKeyword = !keyword || haystack.includes(keyword);
      const byStage = state.stageFilter === '全部' || row.stageId === state.stageFilter;
      const byVendor = state.vendorFilter === '全部' || row.vendor === state.vendorFilter;
      const byMonth = state.monthFilter === '全部' || (row.requestDate || '').startsWith(state.monthFilter);
      const byCategory = state.categoryFilter === '全部' || row.items.some(item => item.category === state.categoryFilter);
      const byPriority = state.priorityFilter === '全部' || row.priority === state.priorityFilter;
      return byKeyword && byStage && byVendor && byMonth && byCategory && byPriority;
    });
  }

  function purchaseTotal(row) {
    return Math.round(sum((row.items || []).map(item => (Number(item.qty) || 0) * (Number(item.unitPrice) || 0))) * (1 + (Number(row.taxRate ?? 5) / 100)));
  }

  function purchaseTotals(rows) {
    const beforeTax = sum(rows.map(row => sum((row.items || []).map(item => (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)))));
    const total = sum(rows.map(purchaseTotal));
    return { beforeTax, tax: total - beforeTax, total };
  }

  function stageName(id) {
    return state.stages.find(stage => stage.id === id)?.name || id || '未設定';
  }

  function stageTone(id) {
    return state.stages.find(stage => stage.id === id)?.tone || toneMap[stageName(id)] || 'blue';
  }

  function nextPurchaseId() {
    const max = Math.max(0, ...state.purchases.map(row => Number(String(row.id || '').replace(/\D/g, '')) || 0));
    return `PO-${String(max + 1).padStart(3, '0')}`;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function collectPurchaseForm() {
    const form = document.getElementById('purchaseForm');
    const fd = new FormData(form);
    const itemRows = [...form.querySelectorAll('[data-item-index]')];
    const items = itemRows.map(row => ({
      name: row.querySelector('[name="itemName"]').value.trim() || '未命名品項',
      category: row.querySelector('[name="itemCategory"]').value.trim() || '未分類',
      qty: Number(row.querySelector('[name="itemQty"]').value) || 0,
      unit: row.querySelector('[name="itemUnit"]').value.trim() || '件',
      unitPrice: Number(row.querySelector('[name="itemPrice"]').value) || 0,
    })).filter(item => item.name || item.qty || item.unitPrice);
    const title = items.map(item => item.name).slice(0, 2).join('、') + (items.length > 2 ? ` 等 ${items.length} 項` : '');
    return {
      id: String(fd.get('id') || '').trim() || nextPurchaseId(),
      title: title || '未命名採購',
      department: String(fd.get('department') || '').trim(),
      requester: String(fd.get('requester') || '').trim(),
      vendor: String(fd.get('vendor') || '').trim(),
      stageId: String(fd.get('stageId') || ''),
      priority: String(fd.get('priority') || '中'),
      requestDate: String(fd.get('requestDate') || ''),
      orderDate: String(fd.get('orderDate') || ''),
      arrivalDate: String(fd.get('arrivalDate') || ''),
      note: String(fd.get('note') || '').trim(),
      taxRate: 5,
      items: items.length ? items : [{ name: '未命名品項', category: '未分類', qty: 1, unit: '件', unitPrice: 0 }],
    };
  }

  function savePurchase(row) {
    const exists = state.purchases.some(item => item.id === row.id);
    if (exists) {
      state.purchases = state.purchases.map(item => item.id === row.id ? row : item);
      writeHistory(row.id, row.title, `更新採購，流程為「${stageName(row.stageId)}」。`);
    } else {
      state.purchases = [row, ...state.purchases];
      writeHistory(row.id, row.title, `新增採購，流程為「${stageName(row.stageId)}」。`);
    }
    closeModal();
  }

  function writeHistory(id, title, message) {
    state.history = [{ id: `H-${Date.now()}`, purchaseId: id, title, message, time: new Date().toLocaleString('zh-TW', { hour12: false }) }, ...state.history].slice(0, 100);
  }

  function addModalItem() {
    const container = document.getElementById('modalItems');
    const idx = container.querySelectorAll('[data-item-index]').length;
    container.insertAdjacentHTML('beforeend', itemEditor({ name: '', category: '硬體設備', qty: 1, unit: '台', unitPrice: 0 }, idx));
  }

  function removeModalItem(index) {
    const rows = [...document.querySelectorAll('[data-item-index]')];
    if (rows.length <= 1) return;
    rows[index]?.remove();
  }

  function closeModal() {
    state.modal = null;
    state.modalData = null;
    render();
  }

  function exportCsv() {
    const rows = filteredPurchases();
    const header = ['案號','標題','需求單位','請購人','廠商','流程','優先','申請日','品項','類別','數量','單位','單價','含稅總額','備註'];
    const lines = [header, ...rows.flatMap(row => row.items.map(item => [row.id, row.title, row.department, row.requester, row.vendor, stageName(row.stageId), row.priority, row.requestDate, item.name, item.category, item.qty, item.unit, item.unitPrice, purchaseTotal(row), row.note]))]
      .map(cols => cols.map(csvCell).join(','));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowDesk_採購紀錄_${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function groupTotals(rows, pick) {
    const map = new Map();
    rows.forEach(row => map.set(pick(row), (map.get(pick(row)) || 0) + purchaseTotal(row)));
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total);
  }

  function groupCategoryTotals(rows) {
    const map = new Map();
    rows.forEach(row => row.items.forEach(item => map.set(item.category, (map.get(item.category) || 0) + ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)))));
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total);
  }

  function barRow(label, value, max) {
    return `<div class="bar-row"><strong>${esc(label)}</strong><div class="bar"><span style="width:${Math.max(4, Math.round(value / max * 100))}%"></span></div><span>${money(value)}</span></div>`;
  }

  function metric(label, value, tone) {
    return `<article class="metric ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  }

  function panelTitle(eyebrow, title, action = '') {
    return `<div class="panel-title"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div>${typeof action === 'string' && action.includes('<') ? action : `<small>${esc(action)}</small>`}</div>`;
  }

  function badge(value, tone) {
    const t = tone || toneMap[value] || 'blue';
    return `<span class="badge ${t}">${esc(value)}</span>`;
  }

  function selectHtml(key, options, selected, labeler = v => v, nameAttr = '') {
    return `<select data-select="${esc(key)}" ${nameAttr ? `name="${nameAttr}"` : ''}>${options.map(option => `<option value="${esc(option)}" ${String(option) === String(selected) ? 'selected' : ''}>${esc(labeler(option))}</option>`).join('')}</select>`;
  }

  function toneLabel(value) {
    return ({ blue: '藍色', violet: '紫色', amber: '橘色', green: '綠色', red: '紅色', slate: '灰色' })[value] || value;
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function sum(items) {
    return items.reduce((a, b) => a + (Number(b) || 0), 0);
  }

  function money(value) {
    return `NT$${Math.round(Number(value) || 0).toLocaleString('zh-TW')}`;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function icon(name) {
    const common = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      overview: `<svg ${common}><path d="M4 13.5 12 5l8 8.5"/><path d="M6.5 12.5V20h11v-7.5"/><path d="M10 20v-4.5h4V20"/></svg>`,
      kanban: `<svg ${common}><rect x="4" y="4" width="4.5" height="15.5" rx="1.6"/><rect x="10" y="4" width="10" height="6" rx="1.6"/><rect x="10" y="11.5" width="10" height="8" rx="1.6"/></svg>`,
      records: `<svg ${common}><path d="M5 6.5h14"/><path d="M5 12h14"/><path d="M5 17.5h14"/><circle cx="7.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/><circle cx="7.5" cy="12" r=".75" fill="currentColor" stroke="none"/><circle cx="7.5" cy="17.5" r=".75" fill="currentColor" stroke="none"/></svg>`,
      issue: `<svg ${common}><circle cx="12" cy="12" r="8"/><path d="M12 8v5"/><circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none"/></svg>`,
      project: `<svg ${common}><path d="M4 19.5h16"/><path d="M7 17.5V9"/><path d="M12 17.5V5.5"/><path d="M17 17.5V11"/><circle cx="7" cy="9" r="1.5"/><circle cx="12" cy="5.5" r="1.5"/><circle cx="17" cy="11" r="1.5"/></svg>`,
      knowledge: `<svg ${common}><path d="M6.5 5.5h9.5a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5H8a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 5.5v12a2 2 0 0 0 2 2"/><path d="M10.5 9.5h5"/><path d="M10.5 13h5"/></svg>`,
      automation: `<svg ${common}><path d="M7 5.5h5.5a2.5 2.5 0 1 1 0 5H9.5a2.5 2.5 0 1 0 0 5H17"/><path d="m14.5 18 2.5 2.5L19.5 18"/><path d="m9.5 3L7 5.5 4.5 3"/></svg>`,
      report: `<svg ${common}><path d="M5 19.5V11"/><path d="M10 19.5V6"/><path d="M15 19.5v-4.5"/><path d="M20 19.5V8.5"/></svg>`,
      settings: `<svg ${common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2.05 2.05 0 0 1-2.9 2.9l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2.05 2.05 0 0 1-4.1 0v-.08A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.05.05a2.05 2.05 0 0 1-2.9-2.9l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2.05 2.05 0 0 1 0-4.1h.08A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2.05 2.05 0 0 1 2.9-2.9l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2.05 2.05 0 0 1 4.1 0v.08A1.7 1.7 0 0 0 16 4.6a1.7 1.7 0 0 0 1.88-.34l.05-.05a2.05 2.05 0 0 1 2.9 2.9l-.05.05A1.7 1.7 0 0 0 19.4 9c.2.37.56.6 1 .6h.08a2.05 2.05 0 0 1 0 4.1h-.08a1.7 1.7 0 0 0-1 .6Z"/></svg>`,
    };
    return icons[name] || `<svg ${common}><circle cx="12" cy="12" r="8"/></svg>`;
  }

  document.addEventListener('click', event => {
    const card = event.target.closest('[data-modal-card]');
    const action = event.target.closest('[data-action]')?.dataset.action;
    const page = event.target.closest('[data-page]')?.dataset.page;
    const moduleBtn = event.target.closest('[data-module]');
    const tableBtn = event.target.closest('[data-table]');
    const selectWork = event.target.closest('[data-select-work]')?.dataset.selectWork;
    const theme = event.target.closest('[data-theme]')?.dataset.theme;

    if (theme) { state.settings.theme = theme; render(); return; }
    if (page) { state.active = page; state.modal = null; render(); return; }
    if (selectWork) { state.selected = workItems.find(item => item.id === selectWork) || state.selected; state.active = 'board'; render(); return; }
    if (tableBtn) { state.activeTable = tableBtn.dataset.table; state.currentPage = 1; render(); return; }
    if (moduleBtn && !action) { state.active = moduleBtn.dataset.module; render(); return; }
    if (!action) return;

    if (action === 'close-modal' && !card) closeModal();
    if (action === 'close-modal' && event.target.dataset.action === 'close-modal') closeModal();
    if (action === 'open-launcher') { state.modal = 'launcher'; state.modalData = null; render(); }
    if (action === 'new-purchase' || action === 'new-purchase-from-launcher') { state.modal = 'purchase'; state.modalData = null; render(); }
    if (action === 'edit-purchase') { state.modal = 'purchase'; state.modalData = structuredClone(state.purchases.find(row => row.id === event.target.closest('[data-id]').dataset.id)); render(); }
    if (action === 'duplicate-purchase') {
      const source = state.purchases.find(row => row.id === event.target.closest('[data-id]').dataset.id);
      if (source) { const copy = structuredClone(source); copy.id = nextPurchaseId(); copy.title = `${copy.title} 副本`; state.purchases = [copy, ...state.purchases]; writeHistory(copy.id, copy.title, '複製採購紀錄。'); render(); }
    }
    if (action === 'delete-purchase') { state.purchases = state.purchases.filter(row => row.id !== event.target.closest('[data-id]').dataset.id); closeModal(); }
    if (action === 'modal-add-item') addModalItem();
    if (action === 'modal-remove-item') removeModalItem(Number(event.target.closest('[data-index]').dataset.index));
    if (action === 'export-purchases') exportCsv();
    if (action === 'prev-page') { state.currentPage -= 1; render(); }
    if (action === 'next-page') { state.currentPage += 1; render(); }
    if (action === 'reset-test-purchases') { state.purchases = makePurchases(); state.currentPage = 1; writeHistory('SYSTEM', '測試資料', '重置 40 筆採購測試資料。'); render(); }
    if (action === 'reset-module-order') { state.modules = initialModules; render(); }
    if (action === 'add-stage') { state.stages.push({ id: `stage-${Date.now()}`, name: '新流程', tone: 'blue', enabled: true }); render(); }
    if (action === 'reset-stages') { state.stages = structuredClone(initialPurchaseStages); render(); }
    if (action === 'stage-up' || action === 'stage-down') {
      const id = event.target.closest('[data-id]').dataset.id;
      const idx = state.stages.findIndex(stage => stage.id === id);
      const target = action === 'stage-up' ? idx - 1 : idx + 1;
      if (idx >= 0 && target >= 0 && target < state.stages.length) { const [moved] = state.stages.splice(idx, 1); state.stages.splice(target, 0, moved); render(); }
    }
    if (action === 'delete-stage') {
      const id = event.target.closest('[data-id]').dataset.id;
      const fallback = state.stages.find(stage => stage.id !== id && stage.enabled)?.id || 'stage-1';
      state.purchases = state.purchases.map(row => row.stageId === id ? { ...row, stageId: fallback } : row);
      state.stages = state.stages.filter(stage => stage.id !== id);
      render();
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.id === 'purchaseForm') {
      event.preventDefault();
      savePurchase(collectPurchaseForm());
    }
  });

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.input) {
      state[input.dataset.input] = input.value;
      if (input.dataset.input === 'purchaseKeyword') state.currentPage = 1;
      render();
    }
    if (input.dataset.setting) {
      state.settings[input.dataset.setting] = input.value;
      render();
    }
    if (input.dataset.stageName) {
      const stage = state.stages.find(s => s.id === input.dataset.stageName);
      if (stage) stage.name = input.value;
      render();
    }
  });

  document.addEventListener('change', event => {
    const select = event.target.closest('[data-select]');
    if (select) {
      const key = select.dataset.select;
      if (key.startsWith('modal')) return;
      if (key === 'densitySetting') state.settings.density = select.value;
      else if (key.startsWith('stageTone:')) {
        const id = key.split(':')[1];
        const stage = state.stages.find(s => s.id === id);
        if (stage) stage.tone = select.value;
      } else if (key === 'pageSize') { state.pageSize = Number(select.value); state.currentPage = 1; }
      else if (Object.prototype.hasOwnProperty.call(state, key)) { state[key] = select.value; state.currentPage = 1; }
      return render();
    }
    const enabled = event.target.closest('[data-stage-enabled]');
    if (enabled) {
      const stage = state.stages.find(s => s.id === enabled.dataset.stageEnabled);
      if (stage) stage.enabled = enabled.checked;
      render();
    }
  });

  document.addEventListener('dragstart', event => {
    const module = event.target.closest('[data-module]');
    if (module) state.draggingModule = module.dataset.module;
  });
  document.addEventListener('dragover', event => {
    if (event.target.closest('[data-module]')) event.preventDefault();
  });
  document.addEventListener('drop', event => {
    const target = event.target.closest('[data-module]');
    if (!target || !state.draggingModule) return;
    const from = state.modules.findIndex(item => item.id === state.draggingModule);
    const to = state.modules.findIndex(item => item.id === target.dataset.module);
    if (from >= 0 && to >= 0 && from !== to) {
      const [moved] = state.modules.splice(from, 1);
      state.modules.splice(to, 0, moved);
      state.draggingModule = null;
      render();
    }
  });

  document.addEventListener('mouseover', event => {
    if (event.target.closest('[data-sidebar]')) {
      if (!state.sidebarOpen) { state.sidebarOpen = true; render(); }
    }
  });
  document.addEventListener('mouseleave', event => {
    if (event.target.matches('[data-sidebar]')) {
      if (state.sidebarOpen) { state.sidebarOpen = false; render(); }
    }
  }, true);
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

  render();
})();
