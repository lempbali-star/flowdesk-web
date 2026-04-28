import { useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabaseClient.js'

const initialModules = [
  { id: 'home', name: '總覽', icon: 'overview' },
  { id: 'board', name: '工作看板', icon: 'kanban' },
  { id: 'base', name: '紀錄中心', icon: 'records' },
  { id: 'desk', name: '任務追蹤', icon: 'issue' },
  { id: 'roadmap', name: '專案管理', icon: 'project' },
  { id: 'docs', name: '知識庫', icon: 'knowledge' },
  { id: 'flow', name: '流程自動化', icon: 'automation' },
  { id: 'insight', name: '報表分析', icon: 'report' },
  { id: 'reminders', name: '提醒中心', icon: 'reminders' },
  { id: 'settings', name: '系統設定', icon: 'settings' },
]

const defaultModuleIcons = {
  home: '🏠',
  board: '🗂️',
  base: '🧾',
  desk: '🎯',
  roadmap: '📌',
  docs: '📋',
  flow: '🔀',
  insight: '📊',
  reminders: '🔔',
  settings: '⚙️',
}

const defaultBaseTableIcons = {
  '採購紀錄': '🧾',
  '廠商資料': '🏢',
}

const iconOptions = ['🏠', '🗂️', '🧾', '🎯', '📌', '📋', '🔀', '📊', '⚙️', '💼', '🛒', '🧰', '🖥️', '💻', '🖨️', '🛡️', '🌐', '📡', '🔌', '💾', '🗄️', '🏢', '👥', '📦', '📁', '📄', '📝', '✅', '⏱️', '🔔', '📮', '🔑', '🎫', '📈', '📉', '🧭', '🎨', '✨']

const iconStyleOptions = [
  { id: 'auto', name: '跟隨 UI 主題', description: '切換 UI 主題時，圖示風格會自動一起變更。' },
  { id: 'soft', name: '彩色柔和', description: '柔和卡片底色，適合清爽與日常工作台。' },
  { id: 'tech', name: '線條科技', description: '偏科技感的外框與高亮陰影。' },
  { id: 'minimal', name: '極簡單色', description: '低干擾、單色系，適合資料密集畫面。' },
  { id: 'card', name: '圓潤卡片', description: '圖示卡片感更明顯，視覺比較活潑。' },
]

const iconAutoStyleByTheme = {
  blue: 'soft',
  fresh: 'soft',
  tech: 'tech',
  ice: 'minimal',
  green: 'soft',
  purple: 'tech',
  amber: 'card',
  rose: 'card',
  slate: 'minimal',
}

const themeOptions = [
  { id: 'blue', name: '湖水藍', description: '原本 FlowDesk 的清爽藍紫主色' },
  { id: 'fresh', name: '清爽薄荷', description: '偏清新、明亮，適合長時間操作' },
  { id: 'tech', name: '科技極光', description: '帶有科技感的靛藍與電光青配色' },
  { id: 'ice', name: '冰川青', description: '淺冷色調，整體視覺更乾淨俐落' },
  { id: 'green', name: '森綠', description: '偏穩重的綠色系主題' },
  { id: 'purple', name: '霧感紫', description: '保留科技感但更偏紫色' },
  { id: 'amber', name: '暖陽橘', description: '適合較明亮、活潑的工作台' },
  { id: 'rose', name: '玫瑰粉', description: '提醒與重點感較強的主題' },
  { id: 'slate', name: '專業石墨', description: '偏沉穩專業，但仍維持乾淨明亮' },
]

const initialWorkItems = []

const collectionColorOptions = [
  { id: 'violet', name: '紫色' },
  { id: 'blue', name: '藍色' },
  { id: 'green', name: '綠色' },
  { id: 'amber', name: '琥珀' },
  { id: 'rose', name: '玫瑰' },
  { id: 'cyan', name: '水藍' },
  { id: 'slate', name: '石墨' },
]

const collectionViewOptions = [
  { id: 'list', name: '清單視圖' },
  { id: 'card', name: '卡片視圖' },
]

const collectionPageSizeOptions = [6, 12, 24]

const baseTables = [
  { id: 'purchase-records', name: '採購紀錄', rows: 0, fields: ['廠商', '金額', '階段', '到貨狀態'], color: 'violet', icon: 'purchase-record', visible: true, locked: true, order: 1, defaultView: 'list' },
  { id: 'vendors', name: '廠商資料', rows: 0, fields: ['類型', '聯絡人', '合約', '最近聯繫'], color: 'green', icon: 'vendor-record', visible: true, locked: true, order: 2, defaultView: 'card' },
]

const activeCollectionIds = ['purchase-records', 'vendors']

const records = []

const initialReminders = []

const reminderTypeOptions = ['到期提醒', '追蹤提醒', '廠商回覆提醒', '簽核提醒', '到貨提醒', '續約提醒', '會議提醒']
const reminderStatusOptions = ['待處理', '處理中', '已完成', '延後']
const reminderPriorityOptions = ['高', '中', '低']
const reminderSourceOptions = ['一般', '採購', '專案', '任務', '資料清單']


const purchaseBaseRows = []

const purchaseDemoCatalog = []

function buildInitialPurchases() {
  return []
}

const initialPurchases = buildInitialPurchases()

const initialPurchaseStages = [
  { id: 'stage-1', name: '需求確認', tone: 'blue', enabled: true, locked: true },
  { id: 'stage-2', name: '詢價中', tone: 'violet', enabled: true },
  { id: 'stage-3', name: '待簽核', tone: 'amber', enabled: true },
  { id: 'stage-4', name: '已下單', tone: 'blue', enabled: true },
  { id: 'stage-5', name: '已到貨', tone: 'green', enabled: true },
  { id: 'stage-6', name: '已完成', tone: 'green', enabled: true, done: true },
  { id: 'stage-7', name: '已取消', tone: 'slate', enabled: false, cancel: true },
]

const stageColorOptions = [
  { tone: 'blue', label: '藍色' },
  { tone: 'indigo', label: '靛藍' },
  { tone: 'violet', label: '紫色' },
  { tone: 'pink', label: '粉紅' },
  { tone: 'red', label: '紅色' },
  { tone: 'orange', label: '橘色' },
  { tone: 'amber', label: '黃色' },
  { tone: 'green', label: '綠色' },
  { tone: 'teal', label: '青綠' },
  { tone: 'cyan', label: '水藍' },
  { tone: 'slate', label: '灰色' },
]

const purchasePageSizeOptions = [5, 10, 20, 40]

const tickets = []

const projects = []

const docs = []

const rules = []

const lanes = [
  { id: '待分類', title: '待分類' },
  { id: '已排程', title: '已排程' },
  { id: '處理中', title: '處理中' },
  { id: '等待回覆', title: '等待回覆' },
  { id: '已完成', title: '已完成' },
]

const toneMap = {
  待分類: 'blue', 已排程: 'slate', 處理中: 'violet', 等待回覆: 'amber', 已完成: 'green',
  高: 'red', 緊急: 'red', 中: 'amber', 低: 'green', 啟用: 'green', 草稿: 'slate', 待跟進: 'blue', 跟進中: 'violet', 等回覆: 'amber', 卡關: 'red', 已收斂: 'green', 穩定推進: 'green', 待文件補齊: 'red', 待盤點: 'amber',
  已下單: 'violet', 待簽核: 'amber', 待確認: 'blue', 廠商展示: 'blue', 調查中: 'violet', 等待文件: 'amber',
  排隊中: 'blue', 等待核准: 'amber', 高風險: 'red', 中風險: 'amber', 低風險: 'green',
}


function normalizeModuleOrder(list) {
  const next = [...list]
  const reminderIndex = next.findIndex((item) => item.id === 'reminders')
  const settingsIndex = next.findIndex((item) => item.id === 'settings')
  if (reminderIndex !== -1 && settingsIndex !== -1 && reminderIndex > settingsIndex) {
    const [reminder] = next.splice(reminderIndex, 1)
    const nextSettingsIndex = next.findIndex((item) => item.id === 'settings')
    next.splice(nextSettingsIndex, 0, reminder)
  }
  return next
}

function FlowDeskShell({ authSession, onLogout }) {
  const [modules, setModules] = useState(() => {
    if (typeof window === 'undefined') return initialModules
    try {
      const saved = window.localStorage.getItem('flowdesk-module-order')
      if (!saved) return initialModules
      const ids = JSON.parse(saved)
      const ordered = ids.map((id) => initialModules.find((item) => item.id === id)).filter(Boolean)
      const missing = initialModules.filter((item) => !ids.includes(item.id))
      return normalizeModuleOrder([...ordered, ...missing])
    } catch {
      return initialModules
    }
  })
  const [draggingId, setDraggingId] = useState(null)
  const [active, setActive] = useState('home')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('看板')
  const [selected, setSelected] = useState(null)
  const [showLauncher, setShowLauncher] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uiTheme, setUiTheme] = useState(() => {
    if (typeof window === 'undefined') return 'blue'
    return window.localStorage.getItem('flowdesk-ui-theme') || 'blue'
  })
  const [iconStyleMode, setIconStyleMode] = useState(() => {
    if (typeof window === 'undefined') return 'auto'
    return window.localStorage.getItem('flowdesk-icon-style-mode') || 'auto'
  })
  const [activeBaseTable, setActiveBaseTable] = useState('採購紀錄')
  const [workItems, setWorkItems] = useState(() => {
    if (typeof window === 'undefined') return initialWorkItems
    try {
      const saved = window.localStorage.getItem('flowdesk-work-items-v196')
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) ? parsed : initialWorkItems
    } catch {
      return initialWorkItems
    }
  })

  const resolvedIconStyle = iconStyleMode === 'auto' ? (iconAutoStyleByTheme[uiTheme] || 'soft') : iconStyleMode

  const [moduleIcons, setModuleIcons] = useState(() => {
    if (typeof window === 'undefined') return defaultModuleIcons
    try {
      const saved = window.localStorage.getItem('flowdesk-module-icons')
      return { ...defaultModuleIcons, ...(saved ? JSON.parse(saved) : {}) }
    } catch {
      return defaultModuleIcons
    }
  })
  const [baseTableIcons, setBaseTableIcons] = useState(() => {
    if (typeof window === 'undefined') return defaultBaseTableIcons
    try {
      const saved = window.localStorage.getItem('flowdesk-base-table-icons')
      return { ...defaultBaseTableIcons, ...(saved ? JSON.parse(saved) : {}) }
    } catch {
      return defaultBaseTableIcons
    }
  })

  const [reminders, setReminders] = useState(() => {
    if (typeof window === 'undefined') return initialReminders
    try {
      const saved = window.localStorage.getItem('flowdesk-reminders-v193')
      return saved ? JSON.parse(saved) : initialReminders
    } catch {
      return initialReminders
    }
  })

  const [collections, setCollections] = useState(() => {
    if (typeof window === 'undefined') return baseTables
    try {
      const saved = window.localStorage.getItem('flowdesk-collections-v194')
      if (!saved) return baseTables
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed) || !parsed.length) return baseTables
      const patched = parsed.map((item, index) => ({
        id: item.id || `collection-${index + 1}`,
        name: item.name || '未命名資料集合',
        rows: Number.isFinite(Number(item.rows)) ? Number(item.rows) : 0,
        fields: Array.isArray(item.fields) ? item.fields : [],
        color: item.color || 'blue',
        icon: item.icon || 'custom-record',
        visible: item.visible !== false,
        locked: Boolean(item.locked),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
        defaultView: ['list', 'card'].includes(item.defaultView) ? item.defaultView : 'list',
      }))
      const missing = baseTables.filter((base) => !patched.some((item) => item.id === base.id))
      return [...patched, ...missing].sort((a, b) => (a.order || 0) - (b.order || 0))
    } catch {
      return baseTables
    }
  })

  const visibleCollections = useMemo(() => collections
    .filter((item) => item.visible !== false && activeCollectionIds.includes(item.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0)), [collections])

  useEffect(() => {
    const firstTable = visibleCollections[0]?.name || '採購紀錄'
    if (!visibleCollections.some((item) => item.name === activeBaseTable)) setActiveBaseTable(firstTable)
  }, [activeBaseTable, visibleCollections])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-work-items-v196', JSON.stringify(workItems))
  }, [workItems])

  useEffect(() => {
    if (!workItems.length) {
      if (selected) setSelected(null)
      return
    }
    if (!selected || !workItems.some((item) => item.id === selected.id)) {
      setSelected(workItems[0])
    }
  }, [selected, workItems])

  function addWorkItem() {
    const now = new Date()
    const nextId = `TASK-${String(workItems.length + 1).padStart(3, '0')}`
    const nextItem = {
      id: nextId,
      title: '未命名工作',
      type: '一般工作',
      lane: '待分類',
      priority: '中',
      channel: '手動新增',
      relation: '未設定',
      requester: 'Kyle',
      owner: 'Kyle',
      due: now.toISOString().slice(0, 10),
      health: 100,
      note: '',
      tags: [],
    }
    setWorkItems((current) => [nextItem, ...current])
    setSelected(nextItem)
    setView('看板')
  }

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return workItems
    return workItems.filter((item) => [item.id, item.title, item.type, item.channel, item.relation, item.owner, item.note, ...(Array.isArray(item.tags) ? item.tags : [])].join(' ').toLowerCase().includes(keyword))
  }, [query, workItems])

  const metrics = useMemo(() => {
    const open = workItems.filter((item) => item.lane !== '已完成').length
    const waiting = workItems.filter((item) => item.lane === '等待回覆').length
    const urgent = workItems.filter((item) => item.priority === '緊急' || item.priority === '高').length
    const pulse = workItems.length ? Math.round(workItems.reduce((sum, item) => sum + item.health, 0) / workItems.length) : 100
    const spend = initialPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
    const reminderOpen = reminders.filter((item) => item.status !== '已完成').length
    return { open, waiting, urgent, pulse, spend, reminderOpen }
  }, [reminders, workItems])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-module-order', JSON.stringify(modules.map((item) => item.id)))
  }, [modules])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.flowdeskTheme = uiTheme
    window.localStorage.setItem('flowdesk-ui-theme', uiTheme)
  }, [uiTheme])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.flowdeskIconStyle = resolvedIconStyle
    document.documentElement.dataset.flowdeskIconMode = iconStyleMode
    window.localStorage.setItem('flowdesk-icon-style-mode', iconStyleMode)
  }, [iconStyleMode, resolvedIconStyle])


  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-module-icons', JSON.stringify(moduleIcons))
  }, [moduleIcons])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-base-table-icons', JSON.stringify(baseTableIcons))
  }, [baseTableIcons])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-reminders-v193', JSON.stringify(reminders))
  }, [reminders])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-collections-v194', JSON.stringify(collections))
  }, [collections])

  function resetModuleOrder() {
    setModules(normalizeModuleOrder(initialModules))
    window.localStorage.removeItem('flowdesk-module-order')
  }

  function moveModule(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return
    const current = [...modules]
    const sourceIndex = current.findIndex((item) => item.id === sourceId)
    const targetIndex = current.findIndex((item) => item.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const [moved] = current.splice(sourceIndex, 1)
    current.splice(targetIndex, 0, moved)
    setModules(current)
  }

  return (
    <div className={`product-shell ${sidebarOpen ? 'sidebar-open' : ''} ${active === 'board' ? 'has-context' : ''}`}>
      <aside className="workspace-sidebar" aria-label="側邊選單" onMouseEnter={() => setSidebarOpen(true)} onMouseLeave={() => setSidebarOpen(false)}>
        <div className="workspace-card">
          <div className="brand-mark">F</div>
          <div className="sidebar-copy">
            <strong>FlowDesk</strong>
            <small>工作流管理平台</small>
          </div>
        </div>

        <nav className="module-list">
          {modules.map((item) => (
            <button
              key={item.id}
              draggable
              onDragStart={() => setDraggingId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                moveModule(draggingId, item.id)
                setDraggingId(null)
              }}
              onDragEnd={() => setDraggingId(null)}
              className={active === item.id ? 'module active' : 'module'}
              type="button"
              onClick={() => setActive(item.id)}
              title={`${item.name}（可拖曳排序）`}
            >
              <span className="module-icon" aria-hidden="true">{moduleIcons[item.id] || defaultModuleIcons[item.id] || "✨"}</span>
              <strong>{item.name}</strong>
              <i className="drag-dot" aria-hidden="true"><span /><span /><span /></i>
            </button>
          ))}
        </nav>

        <div className="mini-dashboard">
          <div className="mini-dashboard-top">
            <span>健康度</span>
            <strong>{metrics.pulse}%</strong>
          </div>
          <div className="pulse-bar"><span style={{ width: `${metrics.pulse}%` }} /></div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className={`app-topbar ${active === 'base' ? 'app-topbar-with-collections' : ''}`}>
          <div className="topbar-title">
            <p className="eyebrow">今日工作狀態</p>
            <h1>{pageTitle(active, modules)}</h1>
          </div>
          {active === 'base' && (
            <BaseCollectionSwitcher
              tables={visibleCollections}
              activeTable={activeBaseTable}
              setActiveTable={setActiveBaseTable}
              baseTableIcons={baseTableIcons}
            />
          )}
          <div className="topbar-actions">
            <label className="global-search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋任務、採購、專案、文件..." />
            </label>
            <button className="ghost-btn" type="button" onClick={onLogout}>登出</button>
            <button className="ghost-btn" type="button">邀請成員</button>
            <button className="primary-btn" type="button" onClick={() => setShowLauncher(true)}>新增</button>
          </div>
        </header>

        {active === 'home' && <HomePage metrics={metrics} items={filteredItems} reminders={reminders} setActive={setActive} setSelected={setSelected} />}
        {active === 'board' && <BoardPage items={filteredItems} view={view} setView={setView} selected={selected} setSelected={setSelected} onAddItem={addWorkItem} />}
        {active === 'base' && <BasePage tables={visibleCollections} records={records} activeTable={activeBaseTable} />}
        {active === 'desk' && <DeskPage tickets={tickets} />}
        {active === 'roadmap' && <RoadmapPage projects={projects} />}
        {active === 'docs' && <DocsPage docs={docs} />}
        {active === 'flow' && <FlowPage rules={rules} />}
        {active === 'insight' && <InsightPage metrics={metrics} records={records} tickets={tickets} />}
        {active === 'reminders' && <RemindersPage reminders={reminders} setReminders={setReminders} />}
        {active === 'settings' && <SettingsPage themeOptions={themeOptions} uiTheme={uiTheme} setUiTheme={setUiTheme} iconStyleMode={iconStyleMode} setIconStyleMode={setIconStyleMode} resolvedIconStyle={resolvedIconStyle} modules={modules} collections={visibleCollections} setCollections={setCollections} moduleIcons={moduleIcons} setModuleIcons={setModuleIcons} baseTableIcons={baseTableIcons} setBaseTableIcons={setBaseTableIcons} setReminders={setReminders} />}
      </main>

      {active === 'board' && (
        <aside className="context-panel">
          <ContextPanel selected={selected} />
        </aside>
      )}

      {showLauncher && <CreateLauncher onClose={() => setShowLauncher(false)} />}
      <ScrollTopButton />
    </div>
  )
}


const FLOWDESK_DATA_STORAGE_KEYS = [
  'flowdesk-reminders-v193',
  'flowdesk-purchases-v19',
  'flowdesk-purchase-history-v19',
  'flowdesk-collections-v194',
  'flowdesk-work-items-v196',
]

const FLOWDESK_DATA_CLEAN_MARK = 'flowdesk-data-cleaned-real-auth-v1'

function clearFlowDeskSeedData() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(FLOWDESK_DATA_CLEAN_MARK) === 'done') return
  FLOWDESK_DATA_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
  window.localStorage.setItem(FLOWDESK_DATA_CLEAN_MARK, 'done')
}

function App() {
  const [session, setSession] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setCheckingAuth(false)
      return undefined
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data?.session || null)
      setCheckingAuth(false)
    }).catch(() => {
      if (!mounted) return
      setSession(null)
      setCheckingAuth(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setDataReady(false)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setDataReady(false)
      return
    }
    clearFlowDeskSeedData()
    setDataReady(true)
  }, [session])

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setDataReady(false)
  }

  if (checkingAuth) return <LoginScreen mode="checking" />
  if (!hasSupabaseConfig || !supabase) return <LoginScreen configMissing />
  if (!session) return <LoginScreen />
  if (!dataReady) return <LoginScreen mode="checking" />

  return <FlowDeskShell authSession={session} onLogout={handleLogout} />
}

function LoginScreen({ mode, configMissing }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) setError('帳號或密碼不正確')
    setBusy(false)
  }

  return (
    <div className="flowdesk-login-page">
      <form className="flowdesk-login-card" onSubmit={handleSubmit}>
        <div className="flowdesk-login-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FlowDesk</strong>
            <span>登入</span>
          </div>
        </div>

        {mode === 'checking' ? (
          <div className="flowdesk-login-status">驗證中...</div>
        ) : configMissing ? (
          <div className="flowdesk-login-error">登入服務尚未設定</div>
        ) : (
          <>
            <label>
              <span>Email</span>
              <input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              <span>密碼</span>
              <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error && <div className="flowdesk-login-error">{error}</div>}
            <button className="primary-btn" type="submit" disabled={busy}>{busy ? '登入中...' : '登入'}</button>
          </>
        )}
      </form>
    </div>
  )
}

function BaseCollectionSwitcher({ tables, activeTable, setActiveTable, baseTableIcons }) {
  return (
    <nav className="topbar-collection-switcher" aria-label="紀錄分類">
      {tables.map((table) => (
        <button key={table.name} className={activeTable === table.name ? 'base-table active' : 'base-table'} type="button" onClick={() => setActiveTable(table.name)} title={table.name}>
          <span className={`table-icon ${table.color}`} aria-hidden="true">{baseTableIcons?.[table.id] || baseTableIcons?.[table.name] || defaultBaseTableIcons[table.name] || table.icon || "📄"}</span>
          <div><strong>{table.name}</strong><small>{table.rows} 筆資料</small></div>
        </button>
      ))}
    </nav>
  )
}

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'overview':
      return <svg {...common}><path d="M4 13.5 12 5l8 8.5" /><path d="M6.5 12.5V20h11v-7.5" /><path d="M10 20v-4.5h4V20" /></svg>
    case 'kanban':
      return <svg {...common}><rect x="4" y="4" width="4.5" height="15.5" rx="1.6" /><rect x="10" y="4" width="10" height="6" rx="1.6" /><rect x="10" y="11.5" width="10" height="8" rx="1.6" /></svg>
    case 'records':
      return <svg {...common}><path d="M5 6.5h14" /><path d="M5 12h14" /><path d="M5 17.5h14" /><circle cx="7.5" cy="6.5" r=".75" fill="currentColor" stroke="none" /><circle cx="7.5" cy="12" r=".75" fill="currentColor" stroke="none" /><circle cx="7.5" cy="17.5" r=".75" fill="currentColor" stroke="none" /></svg>
    case 'issue':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5" /><circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none" /></svg>
    case 'project':
      return <svg {...common}><path d="M4 19.5h16" /><path d="M7 17.5V9" /><path d="M12 17.5V5.5" /><path d="M17 17.5V11" /><circle cx="7" cy="9" r="1.5" /><circle cx="12" cy="5.5" r="1.5" /><circle cx="17" cy="11" r="1.5" /></svg>
    case 'knowledge':
      return <svg {...common}><path d="M6.5 5.5h9.5a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5H8a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M8 5.5v12a2 2 0 0 0 2 2" /><path d="M10.5 9.5h5" /><path d="M10.5 13h5" /></svg>
    case 'automation':
      return <svg {...common}><path d="M7 5.5h5.5a2.5 2.5 0 1 1 0 5H9.5a2.5 2.5 0 1 0 0 5H17" /><path d="m14.5 18 2.5 2.5L19.5 18" /><path d="m9.5 3L7 5.5 4.5 3" /></svg>
    case 'report':
      return <svg {...common}><path d="M5 19.5V11" /><path d="M10 19.5V6" /><path d="M15 19.5v-4.5" /><path d="M20 19.5V8.5" /></svg>
    case 'reminders':
      return <svg {...common}><path d="M18 8.5a6 6 0 0 0-12 0c0 7-2.5 7.5-2.5 7.5h17S18 15.5 18 8.5" /><path d="M9.8 19a2.4 2.4 0 0 0 4.4 0" /></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.09H3a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 4.7 8.62a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.1 2.1 0 1 1 7.27 3.6l.04.04a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.38 2.35V2.3a2.1 2.1 0 0 1 4.2 0v.06A1.8 1.8 0 0 0 15.67 4a1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09H22a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" /></svg>
    case 'purchase-record':
      return <svg {...common}><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M8 9.5h8" /><path d="M8 13h5" /><path d="M15.5 15.5h.01" /></svg>
    case 'vendor-record':
      return <svg {...common}><path d="M4.5 19.5h15" /><path d="M7 19.5v-10h10v10" /><path d="M9 9.5v-3h6v3" /><path d="M10 13h.01" /><path d="M14 13h.01" /><path d="M10 16h.01" /><path d="M14 16h.01" /></svg>
    case 'asset-record':
      return <svg {...common}><rect x="4.5" y="6" width="15" height="10" rx="2" /><path d="M8 19.5h8" /><path d="M12 16v3.5" /></svg>
    case 'license-record':
      return <svg {...common}><path d="M7 5.5h8a2 2 0 0 1 2 2v9l-3-1.7-3 1.7-3-1.7-3 1.7v-9a2 2 0 0 1 2-2Z" /><path d="M9 9.5h6" /></svg>
    case 'appearance-setting':
      return <svg {...common}><path d="M12 5.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" /><path d="M6.2 10.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" /><path d="M17.8 10.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" /><path d="M9.2 16.3a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" /><path d="M14.8 16.3a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z" /></svg>
    case 'purchase-setting':
      return <svg {...common}><path d="M6 7h12l-1.2 8H7.2L6 7Z" /><path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" /><path d="M10 11.5h4" /></svg>
    case 'sidebar-setting':
      return <svg {...common}><rect x="4.5" y="5" width="15" height="14" rx="2.4" /><path d="M9 5v14" /><path d="M12 9.5h4.5" /><path d="M12 14.5h4.5" /></svg>
    case 'system-setting':
      return <svg {...common}><rect x="5" y="5" width="14" height="14" rx="2.5" /><path d="M8.5 9.5h7" /><path d="M8.5 13h7" /><path d="M8.5 16.5h4" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}

function pageTitle(active, modules) {
  return modules.find((item) => item.id === active)?.name || 'FlowDesk'
}

function HomePage({ metrics, items, reminders, setActive, setSelected }) {
  const focusItems = items.slice(0, 4)
  const purchaseTotal = initialPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const purchaseWaitingQuote = initialPurchases.filter((row) => row.status === '詢價中').length
  const purchasePendingApproval = initialPurchases.filter((row) => row.status === '待簽核').length
  const purchaseNotArrived = initialPurchases.filter((row) => !['已到貨', '已完成'].includes(row.status)).length
  const reminderSummary = getReminderSummary(reminders)
  const reminderFocus = reminders.filter((item) => item.status !== '已完成').slice(0, 4)
  return (
    <div className="home-layout">
      <section className="command-hero compact-hero">
        <div>
          <p className="eyebrow hero-eyebrow">今日焦點</p>
          <h2>優先處理佇列</h2>
          <div className="hero-actions">
            <button type="button" onClick={() => setActive('board')}>工作看板</button>
            <button type="button" onClick={() => setActive('desk')}>任務追蹤</button>
          </div>
        </div>
        <div className="hero-metrics">
          <Metric label="未完成" value={metrics.open} tone="blue" />
          <Metric label="等待回覆" value={metrics.waiting} tone="amber" />
          <Metric label="高風險" value={metrics.urgent} tone="red" />
        </div>
      </section>

      <section className="metric-strip">
        <Metric label="整體健康度" value={`${metrics.pulse}%`} tone="violet" />
        <Metric label="開啟項目" value={metrics.open} tone="blue" />
        <Metric label="等待回覆" value={metrics.waiting} tone="amber" />
        <Metric label="採購金額" value={formatMoney(purchaseTotal)} tone="green" />
      </section>

      <section className="panel wide purchase-home">
        <PanelTitle eyebrow="採購處理" title="採購流程總覽" action="紀錄中心" />
        <div className="purchase-home-grid">
          <article><span>本月採購</span><strong>{formatMoney(purchaseTotal)}</strong></article>
          <article><span>詢價中</span><strong>{purchaseWaitingQuote}</strong></article>
          <article><span>待簽核</span><strong>{purchasePendingApproval}</strong></article>
          <article><span>未到貨</span><strong>{purchaseNotArrived}</strong></article>
        </div>
        <div className="purchase-home-list">
          {initialPurchases.slice(0, 5).map((row) => (
            <button key={row.id} type="button" onClick={() => setActive('base')}>
              <div><strong>{purchaseTitle(row)}</strong><small>{row.department} · {row.vendor} · {getPurchaseItems(row).length} 項</small></div>
              <Badge value={row.status} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel wide reminder-home-panel">
        <PanelTitle eyebrow="提醒中心" title="今日與本週提醒" action="提醒事項" />
        <div className="reminder-home-grid">
          <article className="danger"><span>逾期</span><strong>{reminderSummary.overdue}</strong></article>
          <article><span>今日</span><strong>{reminderSummary.today}</strong></article>
          <article><span>本週</span><strong>{reminderSummary.week}</strong></article>
          <article><span>未結</span><strong>{reminderSummary.open}</strong></article>
        </div>
        <div className="reminder-home-list">
          {reminderFocus.map((item) => {
            const due = getReminderDueInfo(item.dueDate)
            return (
              <button key={item.id} type="button" onClick={() => setActive('reminders')}>
                <div><strong>{item.title}</strong><small>{item.sourceType} · {item.type} · {due.label}</small></div>
                <Badge value={item.priority} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle eyebrow="今日焦點" title="優先處理佇列" action="依風險排序" />
        <div className="focus-queue">
          {focusItems.map((item) => (
            <button className="focus-row" key={item.id} type="button" onClick={() => setSelected(item)}>
              <span className="score-chip">{item.health}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.relation} · {item.channel} · {item.due}</small>
              </div>
              <Badge value={item.lane} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle eyebrow="快速入口" title="常用視圖" />
        <div className="view-launchers view-launchers-min">
          <button type="button" onClick={() => setActive('board')}><span><Icon name="kanban" /></span><strong>工作看板</strong></button>
          <button type="button" onClick={() => setActive('base')}><span><Icon name="records" /></span><strong>紀錄中心</strong></button>
          <button type="button" onClick={() => setActive('roadmap')}><span><Icon name="project" /></span><strong>專案管理</strong></button>
          <button type="button" onClick={() => setActive('flow')}><span><Icon name="automation" /></span><strong>流程自動化</strong></button>
          <button type="button" onClick={() => setActive('reminders')}><span>🔔</span><strong>提醒中心</strong></button>
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle eyebrow="近期動態" title="工作狀態流" />
        <div className="pulse-feed">
          {items.map((item) => (
            <article key={item.id} className="pulse-item">
              <span className={`dot ${toneMap[item.lane] || 'blue'}`} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.type} · {item.owner} · {item.note}</small>
              </div>
              <Badge value={item.priority} />
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BoardPage({ items, view, setView, selected, setSelected, onAddItem }) {
  return (
    <div className="page-stack board-page">
      <section className="surface-toolbar board-toolbar">
        <div>
          <p className="eyebrow">工作管理</p>
          <h2>工作看板</h2>
        </div>
        <div className="board-toolbar-actions">
          <div className="segmented board-view-switch">
            {['看板', '表格', '卡片'].map((name) => (
              <button key={name} className={view === name ? 'active' : ''} type="button" onClick={() => setView(name)}>{name}</button>
            ))}
          </div>
          <button className="primary-btn board-add-btn" type="button" onClick={onAddItem}>新增工作</button>
        </div>
      </section>

      {!items.length && (
        <section className="board-empty-state">
          <strong>目前沒有工作項目</strong>
          <span>可先新增一筆工作，或稍後從採購、專案流程建立追蹤項目。</span>
          <button type="button" className="primary-btn" onClick={onAddItem}>新增第一筆工作</button>
        </section>
      )}

      {selected && <BoardFloatingPreview selected={selected} />}

      {view === '看板' && (
        <section className="kanban board-kanban-view">
          {lanes.map((lane) => {
            const laneItems = items.filter((item) => item.lane === lane.id)
            return (
              <article className="lane" key={lane.id}>
                <div className="lane-title">
                  <strong>{lane.title}</strong>
                  <span>{laneItems.length}</span>
                </div>
                <div className="lane-cards">
                  {laneItems.length ? laneItems.map((item) => (
                    <WorkCard key={item.id} item={item} selected={selected} onSelect={() => setSelected(item)} />
                  )) : <div className="lane-empty">尚無項目</div>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {view === '表格' && <WorkGrid items={items} selected={selected} setSelected={setSelected} />}
      {view === '卡片' && <CardWall items={items} selected={selected} setSelected={setSelected} />}
    </div>
  )
}



function BoardFloatingPreview({ selected }) {
  return (
    <section className="board-floating-preview" aria-label="小桌機工作預覽">
      <div className="board-floating-main">
        <span>{selected.id} · 目前選取</span>
        <strong>{selected.title}</strong>
      </div>
      <div className="board-floating-detail">
        <span>負責人 {selected.owner}</span>
        <span>健康度 {selected.health}%</span>
        <span>{selected.channel}</span>
        <span>{(Array.isArray(selected.tags) ? selected.tags : []).slice(0, 2).join(' / ')}</span>
      </div>
    </section>
  )
}

function BoardInlinePreview({ selected }) {
  return (
    <section className="board-inline-preview" aria-label="手機工作詳細預覽">
      <div className="board-inline-head">
        <span>{selected.id}</span>
        <strong>詳細預覽</strong>
      </div>
      <p>{selected.note}</p>
      <div className="board-inline-grid">
        <span>狀態 <b>{selected.lane}</b></span>
        <span>優先級 <b>{selected.priority}</b></span>
        <span>關聯 <b>{selected.relation}</b></span>
        <span>到期 <b>{selected.due}</b></span>
        <span>負責 <b>{selected.owner}</b></span>
        <span>健康度 <b>{selected.health}%</b></span>
      </div>
      <div className="tag-list">{(Array.isArray(selected.tags) ? selected.tags : []).map((tag) => <span key={tag}>{tag}</span>)}</div>
    </section>
  )
}


function BasePage({ tables, records, activeTable }) {
  const [purchases, setPurchases] = useState(() => {
    if (typeof window === 'undefined') return initialPurchases
    try {
      const saved = window.localStorage.getItem('flowdesk-purchases-v19')
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length ? parsed : initialPurchases
    } catch {
      return initialPurchases
    }
  })
  const [purchaseHistory, setPurchaseHistory] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem('flowdesk-purchase-history-v19')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [showStageSettings, setShowStageSettings] = useState(false)
  const [stageDragId, setStageDragId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('全部')
  const [vendorFilter, setVendorFilter] = useState('全部')
  const [monthFilter, setMonthFilter] = useState('全部')
  const [purchaseKeyword, setPurchaseKeyword] = useState('')
  const [purchasePage, setPurchasePage] = useState(1)
  const [purchasePageSize, setPurchasePageSize] = useState(() => {
    if (typeof window === 'undefined') return 10
    const saved = Number(window.localStorage.getItem('flowdesk-purchase-page-size'))
    return purchasePageSizeOptions.includes(saved) ? saved : 10
  })
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [collectionViews, setCollectionViews] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = window.localStorage.getItem('flowdesk-collection-views-v195')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [collectionPageSize, setCollectionPageSize] = useState(() => {
    if (typeof window === 'undefined') return 12
    const saved = Number(window.localStorage.getItem('flowdesk-collection-page-size-v195'))
    return collectionPageSizeOptions.includes(saved) ? saved : 12
  })
  const [purchaseStages, setPurchaseStages] = useState(() => {
    if (typeof window === 'undefined') return initialPurchaseStages
    try {
      const saved = window.localStorage.getItem('flowdesk-purchase-stages')
      if (!saved) return initialPurchaseStages
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length ? parsed : initialPurchaseStages
    } catch {
      return initialPurchaseStages
    }
  })

  const activeStages = purchaseStages.filter((stage) => stage.enabled)
  const doneStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('完成')).map((stage) => stage.name)
  const arrivedStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('到貨') || stage.name.includes('完成')).map((stage) => stage.name)
  const activeCollection = tables.find((table) => table.name === activeTable) || tables[0]
  const collectionView = collectionViews[activeCollection?.id] || activeCollection?.defaultView || 'list'
  const vendors = ['全部', ...Array.from(new Set(purchases.map((row) => row.vendor).filter(Boolean)))]
  const months = ['全部', ...Array.from(new Set(purchases.map((row) => (row.requestDate || '').slice(0, 7)).filter(Boolean))).sort().reverse()]
  const filteredPurchases = purchases.filter((row) => {
    const keyword = purchaseKeyword.trim().toLowerCase()
    const searchText = [
      row.id,
      purchaseTitle(row),
      row.department,
      row.requester,
      row.vendor,
      row.status,
      row.note,
      ...getPurchaseItems(row).flatMap((item) => [item.name, item.note]),
    ].join(' ').toLowerCase()
    const byKeyword = !keyword || searchText.includes(keyword)
    const byStatus = statusFilter === '全部' || row.status === statusFilter
    const byVendor = vendorFilter === '全部' || row.vendor === vendorFilter
    const byMonth = monthFilter === '全部' || (row.requestDate || '').startsWith(monthFilter)
    return byKeyword && byStatus && byVendor && byMonth
  })
  const purchasePageCount = Math.max(1, Math.ceil(filteredPurchases.length / purchasePageSize))
  const safePurchasePage = Math.min(purchasePage, purchasePageCount)
  const pagedPurchases = filteredPurchases.slice((safePurchasePage - 1) * purchasePageSize, safePurchasePage * purchasePageSize)
  const totalUntaxed = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).untaxedAmount, 0)
  const totalTax = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxAmount, 0)
  const totalAmount = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const waitingQuote = purchases.filter((row) => row.status.includes('詢價') || row.status.includes('報價')).length
  const pendingApproval = purchases.filter((row) => row.status.includes('簽核') || row.status.includes('核准') || row.status.includes('確認')).length
  const notArrived = purchases.filter((row) => !arrivedStages.includes(row.status)).length

  function getPurchaseRelatedTasks(row) {
    if (!row) return []
    return tickets.filter((task) => {
      const purchaseMatched = task.relatedPurchase === row.id || (task.relatedPurchase && task.relatedPurchase !== '—' && purchaseTitle(row).includes(task.relatedPurchase))
      const vendorMatched = task.relatedVendor && task.relatedVendor !== '—' && row.vendor && task.relatedVendor === row.vendor
      const titleMatched = task.title.includes(purchaseTitle(row)) || task.tags?.some((tag) => purchaseTitle(row).includes(tag))
      return purchaseMatched || vendorMatched || titleMatched
    }).slice(0, 3)
  }

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchase-stages', JSON.stringify(purchaseStages))
  }, [purchaseStages])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchases-v19', JSON.stringify(purchases))
  }, [purchases])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchase-history-v19', JSON.stringify(purchaseHistory))
  }, [purchaseHistory])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchase-page-size', String(purchasePageSize))
  }, [purchasePageSize])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-collection-views-v195', JSON.stringify(collectionViews))
  }, [collectionViews])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-collection-page-size-v195', String(collectionPageSize))
  }, [collectionPageSize])

  useEffect(() => {
    if (!tables.some((table) => table.name === activeTable)) {
      setActiveTable(tables[0]?.name || '採購紀錄')
    }
  }, [tables, activeTable])

  useEffect(() => {
    setPurchasePage(1)
  }, [statusFilter, vendorFilter, monthFilter, purchaseKeyword, purchasePageSize])

  function updateCollectionView(viewId) {
    if (!activeCollection) return
    setCollectionViews((current) => ({ ...current, [activeCollection.id]: viewId }))
  }

  function writeHistory(purchaseId, title, message) {
    setPurchaseHistory((rows) => [{ id: `H-${Date.now()}`, purchaseId, title, message, time: new Date().toLocaleString('zh-TW', { hour12: false }) }, ...rows].slice(0, 80))
  }

  function addPurchase(form) {
    const next = normalizePurchase({
      id: `PO-${String(purchases.length + 1).padStart(3, '0')}`,
      ...form,
    })
    setPurchases((rows) => [next, ...rows])
    writeHistory(next.id, next.item, `新增採購，狀態為「${next.status}」。`)
    setShowPurchaseForm(false)
  }

  function savePurchase(form) {
    const next = normalizePurchase(form)
    const before = purchases.find((row) => row.id === next.id)
    setPurchases((rows) => rows.map((row) => row.id === next.id ? next : row))
    if (before?.status !== next.status) {
      writeHistory(next.id, next.item, `狀態由「${before?.status || '未設定'}」改為「${next.status}」。`)
    } else {
      writeHistory(next.id, next.item, '更新採購資料。')
    }
    setEditingPurchase(null)
  }

  function deletePurchase(id) {
    const target = purchases.find((row) => row.id === id)
    setPurchases((rows) => rows.filter((row) => row.id !== id))
    if (target) writeHistory(id, target.item, '刪除採購紀錄。')
    if (selectedPurchase?.id === id) setSelectedPurchase(null)
  }

  function cancelPurchase(row) {
    const cancelStage = purchaseStages.find((stage) => stage.cancel || stage.name.includes('取消'))?.name || '已取消'
    const next = { ...row, status: cancelStage }
    setPurchases((rows) => rows.map((item) => item.id === row.id ? next : item))
    writeHistory(row.id, purchaseTitle(row), `狀態改為「${cancelStage}」。`)
  }

  function updateStage(stageId, patch) {
    setPurchaseStages((stages) => stages.map((stage) => stage.id === stageId ? { ...stage, ...patch } : stage))
  }

  function addStage() {
    const nextId = `stage-${Date.now()}`
    setPurchaseStages((stages) => [...stages, { id: nextId, name: '新流程', tone: 'blue', enabled: true }])
  }

  function removeStage(stageId) {
    const target = purchaseStages.find((stage) => stage.id === stageId)
    if (target?.locked) return
    setPurchaseStages((stages) => stages.filter((stage) => stage.id !== stageId))
  }

  function resetStages() {
    setPurchaseStages(initialPurchaseStages)
    window.localStorage.removeItem('flowdesk-purchase-stages')
  }

  function resetPurchases() {
    setPurchases(initialPurchases)
    setSelectedPurchase(null)
    setPurchaseHistory([])
    window.localStorage.removeItem('flowdesk-purchases-v19')
    window.localStorage.removeItem('flowdesk-purchase-history-v19')
  }

  function moveStage(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return
    const current = [...purchaseStages]
    const sourceIndex = current.findIndex((stage) => stage.id === sourceId)
    const targetIndex = current.findIndex((stage) => stage.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const [moved] = current.splice(sourceIndex, 1)
    current.splice(targetIndex, 0, moved)
    setPurchaseStages(current)
  }

  return (
    <div className="base-layout base-layout-topbar-tabs">
      <section className="base-main">
        <div className="records-header">
          <div>
            <p className="eyebrow">{activeTable}</p>
            <h2>{activeTable === '採購紀錄' ? '採購流程追蹤' : activeTable}</h2>
          </div>
          <div className="record-actions collection-record-actions">
            <div className="collection-view-control" aria-label="資料集合視圖">
              <span className="collection-control-label">視圖</span>
              {collectionViewOptions.map((option) => (
                <button key={option.id} className={collectionView === option.id ? 'active' : ''} type="button" onClick={() => updateCollectionView(option.id)}>
                  <span aria-hidden="true">{option.id === 'list' ? '☰' : '▦'}</span>{option.name}
                </button>
              ))}
            </div>
            {activeTable !== '採購紀錄' && (
              <label className="collection-page-size-control"><span>每頁筆數</span>
                <select value={collectionPageSize} onChange={(event) => setCollectionPageSize(Number(event.target.value))}>
                  {collectionPageSizeOptions.map((size) => <option key={size} value={size}>{size} 筆</option>)}
                </select>
              </label>
            )}
            {activeTable === '採購紀錄' && (
              <>
                <button className="primary-btn" type="button" onClick={() => setShowPurchaseForm(true)}>新增採購</button>
                <details className="more-actions-menu">
                  <summary>更多操作</summary>
                  <div>
                    <button type="button" onClick={() => setShowStageSettings((value) => !value)}>採購流程設定</button>
                    <button type="button" onClick={resetPurchases}>重置資料</button>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>

        {activeTable === '採購紀錄' ? (
          <>
            {showStageSettings && (
              <PurchaseStageSettings
                stages={purchaseStages}
                stageDragId={stageDragId}
                setStageDragId={setStageDragId}
                moveStage={moveStage}
                updateStage={updateStage}
                addStage={addStage}
                removeStage={removeStage}
                resetStages={resetStages}
              />
            )}
            <div className="purchase-stage-line custom-stage-line">
              {activeStages.map((stage) => <span className={`stage-pill ${stage.tone}`} key={stage.id}>{stage.name}</span>)}
            </div>
            <div className="purchase-metrics v13-purchase-metrics">
              <Metric label="未稅金額" value={formatMoney(totalUntaxed)} tone="blue" />
              <Metric label="稅額" value={formatMoney(totalTax)} tone="amber" />
              <Metric label="含稅總額" value={formatMoney(totalAmount)} tone="green" />
              <Metric label="未到貨" value={notArrived} tone="red" />
            </div>
            <div className="purchase-filter-bar">
              <label className="purchase-search-field">搜尋<input value={purchaseKeyword} onChange={(event) => setPurchaseKeyword(event.target.value)} placeholder="編號、品項、廠商、申請人..." /></label>
              <label>狀態<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="全部">全部</option>{activeStages.map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
              <label>廠商<select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>{vendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}</select></label>
              <label>月份<select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select></label>
              <button type="button" className="ghost-btn" onClick={() => { setPurchaseKeyword(''); setStatusFilter('全部'); setVendorFilter('全部'); setMonthFilter('全部') }}>清除篩選</button>
            </div>
            <div className="purchase-v15-status-row">
              <article><span>等待報價</span><strong>{waitingQuote}</strong></article>
              <article><span>待確認 / 簽核</span><strong>{pendingApproval}</strong></article>
              <article><span>尚未到貨</span><strong>{notArrived}</strong></article>
            </div>

            <div className="purchase-workspace-layout">
              <section className="purchase-list-panel">
                <div className="purchase-list-headline">
                  <div>
                    <p className="eyebrow">採購清單</p>
                    <h3>{filteredPurchases.length} 筆採購單</h3>
                  </div>
                  <div className="purchase-list-head-actions">
                    <label className="purchase-page-size-control purchase-inline-page-size"><span>每頁筆數</span>
                      <select value={purchasePageSize} onChange={(event) => setPurchasePageSize(Number(event.target.value))}>
                        {purchasePageSizeOptions.map((size) => <option key={size} value={size}>{size} 筆</option>)}
                      </select>
                    </label>
                    <div className="purchase-page-size-control compact-page-indicator">
                      <span>第 {safePurchasePage} / {purchasePageCount} 頁</span>
                    </div>
                  </div>
                </div>
                <div className={collectionView === 'card' ? 'purchase-card-list purchase-card-grid' : 'purchase-card-list'}>
                  {pagedPurchases.map((row) => {
                    const amount = calculatePurchase(row)
                    const quoteAmount = Number(row.quoteAmount || 0)
                    const diff = quoteAmount ? amount.taxedTotal - quoteAmount : 0
                    return (
                      <article className={selectedPurchase?.id === row.id ? 'purchase-card-row purchase-card-compact active' : 'purchase-card-row purchase-card-compact'} key={row.id} onClick={() => setSelectedPurchase(row)}>
                        <div className="purchase-card-main">
                          <div className="purchase-card-topline">
                            <span className="record-id">{row.id}</span>
                            <StageBadge value={row.status} stages={purchaseStages} />
                          </div>
                          <strong>{purchaseTitle(row)}</strong>
                          <div className="purchase-card-meta-grid">
                            <span>廠商<b>{row.vendor || '—'}</b></span>
                            <span>申請人<b>{row.requester || '—'}</b></span>
                            <span>日期<b>{row.requestDate || '未填日期'}</b></span>
                            <span>品項<b>{getPurchaseItems(row).length} 項</b></span>
                          </div>
                          <div className="purchase-item-preview">
                            {getPurchaseItems(row).slice(0, 3).map((item) => (
                              <span key={item.id}>{item.name || '未命名'} × {item.quantity}</span>
                            ))}
                            {getPurchaseItems(row).length > 3 && <span>+{getPurchaseItems(row).length - 3}</span>}
                          </div>
                        </div>
                        <div className="purchase-card-money">
                          <span>含稅總額</span>
                          <strong>{formatMoney(amount.taxedTotal)}</strong>
                          <small>未稅 {formatMoney(amount.untaxedAmount)} · 稅額 {formatMoney(amount.taxAmount)}</small>
                          {quoteAmount > 0 && <em className={Math.abs(diff) > 1 ? 'has-diff' : ''}>報價差額 {formatMoney(diff)}</em>}
                        </div>
                        <div className="purchase-actions compact-actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => setEditingPurchase(row)}>編輯</button>
                          <button type="button" onClick={() => cancelPurchase(row)}>取消</button>
                          <button type="button" className="danger" onClick={() => deletePurchase(row.id)}>刪除</button>
                        </div>
                      </article>
                    )
                  })}
                  {!pagedPurchases.length && <div className="purchase-empty-state">沒有符合條件的採購資料</div>}
                </div>
                <div className="purchase-pagination">
                  <button type="button" onClick={() => setPurchasePage((page) => Math.max(1, page - 1))} disabled={safePurchasePage <= 1}>上一頁</button>
                  <span>{((safePurchasePage - 1) * purchasePageSize) + (filteredPurchases.length ? 1 : 0)} - {Math.min(safePurchasePage * purchasePageSize, filteredPurchases.length)} / {filteredPurchases.length}</span>
                  <button type="button" onClick={() => setPurchasePage((page) => Math.min(purchasePageCount, page + 1))} disabled={safePurchasePage >= purchasePageCount}>下一頁</button>
                </div>
              </section>

              <aside className="purchase-side-panel">
                <section className="purchase-detail-card compact-detail-card">
                  <PanelTitle eyebrow="採購明細" title={selectedPurchase ? purchaseTitle(selectedPurchase) : '請選擇採購項目'} />
                  {selectedPurchase ? <PurchaseDetail row={selectedPurchase} stages={purchaseStages} relatedTasks={getPurchaseRelatedTasks(selectedPurchase)} /> : <p>點選左側採購項目，可查看含稅、未稅與日期明細。</p>}
                </section>
                <section className="purchase-history-card compact-history-card">
                  <PanelTitle eyebrow="狀態歷程" title="最近變更" />
                  <div className="history-list">
                    {purchaseHistory.length ? purchaseHistory.slice(0, 6).map((entry) => <article key={entry.id}><strong>{entry.title}</strong><span>{entry.message}</span><small>{entry.time}</small></article>) : <p>尚無變更紀錄。</p>}
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : (
          <CollectionPreviewPanel collection={activeCollection} view={collectionView} pageSize={collectionPageSize} records={records} />
        )}
      </section>
      {showPurchaseForm && <PurchaseModal onClose={() => setShowPurchaseForm(false)} onSubmit={addPurchase} stages={activeStages} />}
      {editingPurchase && <PurchaseModal onClose={() => setEditingPurchase(null)} onSubmit={savePurchase} stages={activeStages} initial={editingPurchase} mode="edit" />}
    </div>
  )
}


function buildCollectionPreviewRows(collection, records) {
  const matchedRecords = records.filter((record) => record.table === collection?.name)
  if (matchedRecords.length) {
    return matchedRecords.map((record) => ({
      id: record.id,
      title: record.title,
      status: record.status || '未設定',
      owner: record.owner || '未指定',
      date: record.date || '未填日期',
      meta: [record.vendor, record.group].filter(Boolean).join(' · ') || collection?.name,
    }))
  }
  const fields = Array.isArray(collection?.fields) && collection.fields.length ? collection.fields : ['名稱', '狀態', '負責人', '備註']
  return Array.from({ length: Math.min(Math.max(Number(collection?.rows || 0), 3), 12) }, (_, index) => ({
    id: `${collection?.id || 'collection'}-${index + 1}`,
    title: `${collection?.name || '資料集合'} 範例 ${index + 1}`,
    status: index % 3 === 0 ? '待整理' : index % 3 === 1 ? '追蹤中' : '已歸檔',
    owner: index % 2 === 0 ? 'Kyle' : '未指定',
    date: `2026-04-${String(12 + index).padStart(2, '0')}`,
    meta: fields.slice(0, 3).join(' · '),
  }))
}

function CollectionPreviewPanel({ collection, view, pageSize, records }) {
  const matchedRecords = records.filter((record) => record.table === collection?.name)
  const isSamplePreview = matchedRecords.length === 0
  const rows = buildCollectionPreviewRows(collection, records).slice(0, pageSize)
  const fields = Array.isArray(collection?.fields) && collection.fields.length ? collection.fields : ['名稱', '狀態', '負責人', '備註']
  const isCard = view === 'card'
  return (
    <section className="collection-view-panel">
      <div className="collection-view-hero">
        <div>
          <p className="eyebrow">COLLECTION</p>
          <h3>{collection?.name || '資料集合'}</h3>
          <span>{isCard ? '卡片視圖' : '清單視圖'} · 顯示 {rows.length} 筆 · {fields.length} 個欄位</span>
        </div>
        <div className={`collection-view-mark ${collection?.color || 'blue'}`}>{fields[0]?.slice(0, 1) || '資'}</div>
      </div>

      <div className="collection-preview-note">
        <strong>{isSamplePreview ? '預覽模式' : '資料模式'}</strong>
        <span>{isSamplePreview ? '目前此集合尚未建立正式紀錄，先以欄位範例呈現未來資料樣貌。' : '目前顯示此資料集合已建立的紀錄。'}</span>
      </div>

      <div className="collection-field-strip">
        {fields.map((field) => <span key={field}>{field}</span>)}
      </div>

      {isCard ? (
        <div className="collection-card-grid">
          {rows.map((row) => (
            <article className="collection-preview-card" key={row.id}>
              <header>
                <span className={`collection-card-dot ${collection?.color || 'blue'}`} />
                <Badge value={row.status} />
              </header>
              <div><strong>{row.title}</strong><small>{row.meta}</small></div>
              <footer><span>{row.owner}</span><span>{row.date}</span></footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="collection-list-view">
          {rows.map((row) => (
            <article className="collection-list-row" key={row.id}>
              <span className="record-id">{row.id}</span>
              <div><strong>{row.title}</strong><small>{row.meta}</small></div>
              <Badge value={row.status} />
              <span>{row.owner}</span>
              <small>{row.date}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function PurchaseStageSettings({ stages, stageDragId, setStageDragId, moveStage, updateStage, addStage, removeStage, resetStages }) {
  return (
    <section className="stage-settings-panel">
      <div className="stage-settings-head">
        <div>
          <p className="eyebrow">採購流程</p>
          <h3>自訂流程名稱與順序</h3>
        </div>
        <div>
          <button className="ghost-btn" type="button" onClick={resetStages}>恢復預設</button>
          <button className="primary-btn" type="button" onClick={addStage}>新增狀態</button>
        </div>
      </div>
      <div className="stage-editor-list">
        {stages.map((stage) => (
          <article
            className={stageDragId === stage.id ? 'stage-editor is-dragging' : 'stage-editor'}
            key={stage.id}
            draggable
            onDragStart={() => setStageDragId(stage.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              moveStage(stageDragId, stage.id)
              setStageDragId(null)
            }}
            onDragEnd={() => setStageDragId(null)}
          >
            <span className="stage-handle">⋮⋮</span>
            <input value={stage.name} onChange={(event) => updateStage(stage.id, { name: event.target.value })} />
            <div className="stage-color-picker" aria-label="流程顏色">
              {stageColorOptions.map((color) => (
                <button
                  key={color.tone}
                  type="button"
                  className={'stage-color-dot ' + color.tone + (stage.tone === color.tone ? ' active' : '')}
                  title={color.label}
                  aria-label={'設定為' + color.label}
                  onClick={() => updateStage(stage.id, { tone: color.tone })}
                />
              ))}
            </div>
            <label className="stage-check"><input type="checkbox" checked={stage.enabled} onChange={(event) => updateStage(stage.id, { enabled: event.target.checked })} />啟用</label>
            <label className="stage-check"><input type="checkbox" checked={Boolean(stage.done)} onChange={(event) => updateStage(stage.id, { done: event.target.checked })} />視為完成</label>
            <button className="stage-remove" type="button" onClick={() => removeStage(stage.id)} disabled={stage.locked}>刪除</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function TaskTrackingPage({ tasks: sourceTasks }) {
  const [tasks, setTasks] = useState(sourceTasks)
  const [filter, setFilter] = useState('全部')
  const [selectedId, setSelectedId] = useState(sourceTasks[0]?.id)
  const statusOptions = ['全部', '待跟進', '跟進中', '等回覆', '卡關', '已收斂']
  const selectedTask = tasks.find((task) => task.id === selectedId) || tasks[0]
  const visibleTasks = filter === '全部' ? tasks : tasks.filter((task) => task.status === filter)
  const openCount = tasks.filter((task) => task.status !== '已收斂').length
  const waitingCount = tasks.filter((task) => ['等回覆', '卡關'].includes(task.status)).length
  const todayCount = tasks.filter((task) => task.due === '今日').length
  const avgProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(tasks.length, 1))

  function updateTaskStatus(id, status) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status, progress: status === '已收斂' ? 100 : task.progress } : task))
  }

  function statusCount(status) {
    return status === '全部' ? tasks.length : tasks.filter((task) => task.status === status).length
  }

  return (
    <div className="task-workspace page-stack flowdesk-module-shell">
      <section className="flow-toolbar flowdesk-toolbar-v2">
        <div>
          <p className="eyebrow">TASK FLOW</p>
          <h2>任務追蹤</h2>
          <span>用輕量清單整理日常待處理、等回覆、卡關與下一步。</span>
        </div>
        <div className="flow-toolbar-actions">
          <span className="toolbar-soft-chip">等待 / 卡關 {waitingCount}</span>
          <button className="ghost-btn" type="button">整理視圖</button>
          <button className="primary-btn" type="button">新增任務</button>
        </div>
      </section>

      <section className="task-summary-grid compact-flow-stats">
        <article><span>未收斂</span><strong>{openCount}</strong><small>需要持續跟進</small></article>
        <article><span>今日要看</span><strong>{todayCount}</strong><small>今日到期或需確認</small></article>
        <article><span>等待 / 卡關</span><strong>{waitingCount}</strong><small>優先確認回覆</small></article>
        <article><span>平均進度</span><strong>{avgProgress}%</strong><small>目前任務推進度</small></article>
      </section>

      <section className="task-filter-strip flow-pill-filter">
        {statusOptions.map((status) => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            <span>{status}</span><small>{statusCount(status)}</small>
          </button>
        ))}
      </section>

      <div className="task-board-layout task-board-layout-v2">
        <section className="task-feed-panel task-feed-panel-v2">
          <div className="task-panel-head">
            <div><strong>工作清單</strong><span>{visibleTasks.length} 筆符合條件</span></div>
            <small>點選卡片查看右側處理抽屜</small>
          </div>
          {visibleTasks.map((task) => (
            <button key={task.id} type="button" className={selectedTask?.id === task.id ? 'task-feed-card task-card-v2 active' : 'task-feed-card task-card-v2'} onClick={() => setSelectedId(task.id)}>
              <div className="task-card-mainline">
                <div>
                  <span className="record-id">{task.id}</span>
                  <strong>{task.title}</strong>
                </div>
                <Badge value={task.status} />
              </div>
              <p>{task.next}</p>
              <div className="task-card-footline">
                <span>{task.category}</span>
                <span>{task.relatedPurchase && task.relatedPurchase !== '—' ? task.relatedPurchase : task.source}</span>
                <span>{task.relatedVendor && task.relatedVendor !== '—' ? task.relatedVendor : '未指定廠商'}</span>
                <span>{task.relatedProject && task.relatedProject !== '—' ? task.relatedProject : task.due}</span>
              </div>
              <div className="task-progress-row">
                <div className="flow-progress"><span style={{ width: `${task.progress}%` }} /></div>
                <strong>{task.progress}%</strong>
              </div>
            </button>
          ))}
          {!visibleTasks.length && <div className="flow-empty-card">目前沒有符合條件的任務。</div>}
        </section>

        <aside className="task-detail-panel flow-detail-drawer">
          {selectedTask && (
            <>
              <div className="detail-hero-card task-drawer-hero">
                <div className="detail-hero-line">
                  <span className="record-id">{selectedTask.id}</span>
                  <Badge value={selectedTask.status} />
                </div>
                <h3>{selectedTask.title}</h3>
                <p>{selectedTask.source} · {selectedTask.category}</p>
                <div className="tag-list">{selectedTask.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="flow-progress big"><span style={{ width: `${selectedTask.progress}%` }} /></div>
              </div>
              <section className="detail-block next-action-card">
                <p className="eyebrow">下一步</p>
                <strong>{selectedTask.next}</strong>
              </section>
              <div className="detail-section-grid detail-section-grid-v2">
                <article><span>優先</span><strong>{selectedTask.priority}</strong></article>
                <article><span>負責</span><strong>{selectedTask.owner}</strong></article>
                <article><span>採購</span><strong>{selectedTask.relatedPurchase || '—'}</strong></article>
                <article><span>廠商</span><strong>{selectedTask.relatedVendor || '—'}</strong></article>
                <article><span>專案</span><strong>{selectedTask.relatedProject || '—'}</strong></article>
                <article><span>到期</span><strong>{selectedTask.due}</strong></article>
              </div>
              <section className="detail-block">
                <p className="eyebrow">處理紀錄</p>
                <div className="timeline-notes flow-timeline-notes">
                  {selectedTask.records.map((record, index) => <div key={record}><span>{index + 1}</span><p>{record}</p></div>)}
                </div>
              </section>
              <div className="task-action-row task-action-row-v2">
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '跟進中')}>跟進中</button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '等回覆')}>等回覆</button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '已收斂')}>收斂</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function ProjectManagementPage({ projects }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id)
  const [expandedProjects, setExpandedProjects] = useState(() => new Set())
  const [pinnedProjects, setPinnedProjects] = useState(() => new Set())
  const [previewProjectId, setPreviewProjectId] = useState(null)

  const isDesktopPointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const expandAllGanttProjects = () => {
    const all = new Set(projects.map((project) => project.id))
    setExpandedProjects(all)
    setPinnedProjects(all)
    setPreviewProjectId(null)
  }

  const compactAllGanttProjects = () => {
    setExpandedProjects(new Set())
    setPinnedProjects(new Set())
    setPreviewProjectId(null)
  }

  const previewGanttProject = (projectId) => {
    if (!isDesktopPointer()) return
    setSelectedId(projectId)
    setPreviewProjectId(projectId)
    setExpandedProjects((previous) => {
      const next = new Set(previous)
      next.add(projectId)
      return next
    })
  }

  const leaveGanttProject = (projectId) => {
    if (!isDesktopPointer()) return
    setPreviewProjectId((current) => current === projectId ? null : current)
    setExpandedProjects((previous) => {
      if (pinnedProjects.has(projectId)) return previous
      const next = new Set(previous)
      next.delete(projectId)
      return next
    })
  }

  const togglePinnedGanttProject = (projectId) => {
    setSelectedId(projectId)
    setPreviewProjectId(null)
    const wasPinned = pinnedProjects.has(projectId)
    setPinnedProjects((previous) => {
      const next = new Set(previous)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
    setExpandedProjects((previous) => {
      const next = new Set(previous)
      if (wasPinned) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const selectedProject = projects.find((project) => project.id === selectedId) || projects[0]
  const avgProgress = Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / Math.max(projects.length, 1))
  const riskCount = projects.filter((project) => project.tone === 'red' || project.health.includes('待')).length

  return (
    <div className="project-workspace page-stack flowdesk-module-shell project-responsive project-reflow project-compact-screen project-smallscreen-simple">
      <section className="flow-toolbar flowdesk-toolbar-v2 project-toolbar-v2">
        <div>
          <p className="eyebrow">PROJECT FLOW</p>
          <h2>專案管理</h2>
          <span>以專案抽屜、里程碑與輕量甘特圖整理時程，不做厚重管理平台。</span>
        </div>
        <div className="flow-toolbar-actions">
          <span className="toolbar-soft-chip">平均進度 {avgProgress}%</span>
          <button className="ghost-btn" type="button">清單</button>
          <button className="primary-btn" type="button">甘特圖</button>
        </div>
      </section>

      <section className="project-overview-strip">
        <article><span>專案數</span><strong>{projects.length}</strong></article>
        <article><span>需注意</span><strong>{riskCount}</strong></article>
        <article><span>目前焦點</span><strong>{selectedProject?.phase}</strong></article>
        <article><span>負責人</span><strong>{selectedProject?.owner}</strong></article>
      </section>

      <div className="project-layout-v2 project-layout-v3">
        <aside className="project-list-panel project-list-panel-v2">
          <div className="project-list-head"><div><strong>專案清單</strong><span>{projects.length} 件</span></div><small>選取後同步甘特與右側抽屜</small></div>
          {projects.map((project) => (
            <button key={project.id} type="button" className={selectedProject?.id === project.id ? 'project-list-card project-list-card-v2 active' : 'project-list-card project-list-card-v2'} onClick={() => setSelectedId(project.id)}>
              <div className="project-card-title"><strong>{project.name}</strong><Badge value={project.health} /></div>
              <small>{project.phase} · {project.owner}</small>
              <div className="project-card-dates"><span>{project.startDate}</span><span>{project.endDate}</span></div>
              <div className="task-progress-row">
                <div className="flow-progress"><span style={{ width: `${project.progress}%` }} /></div>
                <strong>{project.progress}%</strong>
              </div>
            </button>
          ))}
        </aside>

        <section className="gantt-panel-v2 gantt-panel-v3">
          <div className="gantt-head-v2 gantt-head-v3 gantt-head-compact">
            <div>
              <p className="eyebrow">GANTT</p>
              <h3>輕量時程</h3>
              <small>滑過專案可快速預覽並同步右側明細，點擊可固定展開。</small>
            </div>
            <div className="gantt-head-actions">
              <div className="legend"><span><i className="green" />完成</span><span><i className="amber" />進行</span><span><i className="red" />注意</span></div>
              <div className="gantt-toggle-group">
                <button type="button" onClick={expandAllGanttProjects}>展開全部</button>
                <button type="button" onClick={compactAllGanttProjects}>精簡全部</button>
              </div>
            </div>
          </div>
          <div className="gantt-project-stack">
            {projects.map((project) => {
              const projectTicks = buildGanttTicks(project.startDate, project.endDate)
              const relatedTasks = tickets.filter((task) => task.relatedProject === project.id)
              const expanded = expandedProjects.has(project.id)
              const pinned = pinnedProjects.has(project.id)
              const previewing = previewProjectId === project.id
              return (
                <article
                  key={project.id}
                  className={[
                    'gantt-project-group gantt-project-group-v3 gantt-project-card gantt-project-card-compact gantt-project-card-hoverable',
                    selectedProject?.id === project.id ? 'active' : '',
                    expanded ? 'expanded' : 'collapsed',
                    pinned ? 'pinned' : '',
                    previewing ? 'previewing' : ''
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => previewGanttProject(project.id)}
                  onMouseLeave={() => leaveGanttProject(project.id)}
                  onClick={() => togglePinnedGanttProject(project.id)}
                >
                  <div className="gantt-focus-card gantt-project-card-head gantt-project-card-head-compact">
                    <div>
                      <span>{project.id}</span>
                      <strong>{project.name}</strong>
                      <small>{project.startDate} → {project.endDate}</small>
                    </div>
                    <div className="gantt-card-meta gantt-card-meta-compact">
                      <Badge value={project.phase} />
                      <Badge value={`${project.progress}%`} />
                      <span className="gantt-mini-count">{project.tasks.length} 任務</span>
                      <span className="gantt-mini-count">{project.milestones.length} 里程碑</span>
                      {relatedTasks.length > 0 && <span className="gantt-mini-count">{relatedTasks.length} 關聯任務</span>}
                      <span className="gantt-click-hint">{pinned ? '已固定' : expanded ? '滑過預覽' : '滑過展開'}</span>
                    </div>
                  </div>
                  <div className="gantt-scroll gantt-scroll-v3 gantt-scroll-inline">
                    <div className="gantt-grid-head gantt-local-head" style={{ gridTemplateColumns: `210px repeat(${projectTicks.length}, minmax(86px, 1fr))` }}>
                      <span>項目</span>{projectTicks.map((tick) => <span key={tick}>{formatMonthDay(tick)}</span>)}
                    </div>
                    <div className="gantt-project-row gantt-project-row-v3">
                      <div className="gantt-row-label"><strong>專案總期程</strong><small>{project.phase}</small></div>
                      <div className="gantt-track-v2 gantt-track-v3">
                        <span className={`gantt-main-bar ${project.tone}`} style={ganttStyle(project.startDate, project.endDate, project.startDate, project.endDate)}>{project.progress}%</span>
                        {project.milestones.map((milestone) => <i key={milestone.name} className={milestone.done ? 'milestone-dot done' : 'milestone-dot'} style={{ left: `${ganttPoint(milestone.date, project.startDate, project.endDate)}%` }} title={milestone.name} />)}
                      </div>
                    </div>
                    {expanded && project.tasks.map((task) => (
                      <div className="gantt-task-row gantt-task-row-v3" key={task.name}>
                        <div className="gantt-row-label sub"><span>{task.name}</span><small>{task.owner}</small></div>
                        <div className="gantt-track-v2 soft gantt-track-soft-v3"><span className="gantt-task-bar" style={ganttStyle(task.start, task.end, project.startDate, project.endDate)}>{task.progress}%</span></div>
                      </div>
                    ))}
                  </div>
                  {expanded ? (
                    relatedTasks.length > 0 && <div className="gantt-linked-tasks">{relatedTasks.map((task) => <span key={task.id}>{task.id} · {task.next}</span>)}</div>
                  ) : (
                    <div className="gantt-compact-summary">
                      <span>精簡模式：保留此專案獨立時間軸與總進度。</span>
                      <strong>{project.tasks.length} 個任務 / {project.milestones.length} 個里程碑</strong>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <aside className="project-detail-panel flow-detail-drawer project-detail-panel-v2">
          {selectedProject && (
            <>
              <div className="detail-hero-card project-hero-card project-hero-card-v2">
                <div className="detail-hero-line"><span className="record-id">{selectedProject.id}</span><Badge value={selectedProject.health} /></div>
                <h3>{selectedProject.name}</h3>
                <p>{selectedProject.next}</p>
                <div className="flow-progress big"><span style={{ width: `${selectedProject.progress}%` }} /></div>
              </div>
              <div className="detail-section-grid project-fields detail-section-grid-v2">
                <article><span>階段</span><strong>{selectedProject.phase}</strong></article>
                <article><span>負責</span><strong>{selectedProject.owner}</strong></article>
                <article><span>開始</span><strong>{selectedProject.startDate}</strong></article>
                <article><span>結束</span><strong>{selectedProject.endDate}</strong></article>
              </div>
              <section className="detail-block project-task-block">
                <p className="eyebrow">專案任務 / 甘特項目</p>
                <div className="project-task-list-v2">
                  {selectedProject.tasks.map((task) => <div key={task.name}><strong>{task.name}</strong><span>{task.owner} · {task.start} - {task.end}</span><small>{task.progress}%</small></div>)}
                </div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">關聯任務</p>
                <div className="related-task-list">
                  {tickets.filter((task) => task.relatedProject === selectedProject.id).length ? tickets.filter((task) => task.relatedProject === selectedProject.id).map((task) => <article key={task.id}><strong>{task.title}</strong><span>{task.status} · {task.next}</span></article>) : <p>目前沒有關聯任務。</p>}
                </div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">里程碑</p>
                <div className="milestone-list-v2 milestone-list-v3">
                  {selectedProject.milestones.map((milestone) => <div key={milestone.name} className={milestone.done ? 'done' : ''}><span /> <strong>{milestone.name}</strong><small>{milestone.date}</small></div>)}
                </div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">關聯資料</p>
                <div className="tag-list">{selectedProject.related.map((item) => <span key={item}>{item}</span>)}</div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">處理紀錄</p>
                <div className="timeline-notes flow-timeline-notes">
                  {selectedProject.records.map((record, index) => <div key={record}><span>{index + 1}</span><p>{record}</p></div>)}
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function DeskPage({ tickets }) {
  return <TaskTrackingPage tasks={tickets} />
}

function RoadmapPage({ projects }) {
  return <ProjectManagementPage projects={projects} />
}

function parseDate(value) {
  return new Date(value + 'T00:00:00')
}

function daysBetween(start, end) {
  return Math.max(1, Math.round((parseDate(end) - parseDate(start)) / 86400000))
}

function ganttPoint(date, start, end) {
  const total = daysBetween(start, end)
  const current = Math.max(0, Math.min(total, Math.round((parseDate(date) - parseDate(start)) / 86400000)))
  return (current / total) * 100
}

function ganttStyle(start, end, rangeStart, rangeEnd) {
  const left = ganttPoint(start, rangeStart, rangeEnd)
  const right = ganttPoint(end, rangeStart, rangeEnd)
  return { left: left + '%', width: Math.max(3, right - left) + '%' }
}

function buildGanttTicks(start, end) {
  const total = daysBetween(start, end)
  const count = Math.min(7, Math.max(4, Math.ceil(total / 14)))
  return Array.from({ length: count + 1 }, (_, index) => {
    const date = new Date(parseDate(start).getTime() + (total * index / count) * 86400000)
    return date.toISOString().slice(0, 10)
  })
}

function formatMonthDay(value) {
  const date = parseDate(value)
  return (date.getMonth() + 1) + '/' + String(date.getDate()).padStart(2, '0')
}

function DocsPage({ docs }) {
  return (
    <div className="docs-layout">
      <aside className="doc-tree">
        <PanelTitle eyebrow="文件分類" title="知識整理" />
        {['釘選文件', '網路', '資安', '網站', '備份', '會議紀錄', '範本'].map((folder) => <button key={folder} type="button">▸ {folder}</button>)}
      </aside>
      <section className="doc-canvas">
        <div className="doc-hero doc-hero-compact">
          <span>📘</span>
          <h2>知識庫</h2>
        </div>
        <div className="doc-grid">
          {docs.map((doc) => (
            <article className="doc-card" key={doc.id}>
              <span className="doc-icon">{doc.icon}</span>
              <strong>{doc.title}</strong>
              <small>{doc.folder} · {doc.type} · {doc.updated}</small>
              <div className="tag-list">{doc.links.map((link) => <span key={link}>{link}</span>)}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function FlowPage({ rules }) {
  return (
    <div className="page-stack">
      <section className="rule-builder compact-rule-builder">
        <div>
          <p className="eyebrow">流程規則</p>
          <h2>流程自動化</h2>
        </div>
        <div className="ifthen-card">
          <span>如果</span><strong>工單剩餘時間低於 30 分鐘</strong>
          <span>則</span><strong>標記高風險並釘選到總覽</strong>
        </div>
      </section>
      <section className="automation-grid">
        {rules.map((rule) => (
          <article className="automation-card" key={rule.id}>
            <div><strong>{rule.title}</strong><Badge value={rule.status} /></div>
            <p><span>如果</span>{rule.when}</p>
            <p><span>則</span>{rule.then}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

function InsightPage({ metrics, records, tickets }) {
  const highImpact = tickets.filter((ticket) => ticket.priority === '高').length
  return (
    <div className="insight-layout">
      <section className="metric-strip full">
        <Metric label="健康度" value={`${metrics.pulse}%`} tone="violet" />
        <Metric label="開啟項目" value={metrics.open} tone="blue" />
        <Metric label="高優先任務" value={highImpact} tone="red" />
        <Metric label="採購金額" value={formatMoney(metrics.spend)} tone="green" />
      </section>
      <section className="panel wide">
        <PanelTitle eyebrow="管理摘要" title="本週重點" />
        <div className="insight-cards">
          <article><strong>目前風險</strong><p>等待文件、待回覆任務與專案報價假設是目前主要風險。</p></article>
          <article><strong>採購摘要</strong><p>目前採購加總 {formatMoney(initialPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0))}。</p></article>
          <article><strong>建議動作</strong><p>優先處理今日、高優先級與等待回覆項目。</p></article>
        </div>
      </section>
      <section className="panel">
        <PanelTitle eyebrow="報表中心" title="常用報表" />
        <ul className="clean-list"><li>採購月報</li><li>廠商統計</li><li>任務處理狀態</li><li>專案風險</li><li>等待回覆追蹤</li></ul>
      </section>
    </div>
  )
}

function toDateOnly(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getReminderDueInfo(dueDate) {
  const due = toDateOnly(dueDate)
  if (!due) return { label: '未設定日期', tone: 'slate', days: 999 }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: `逾期 ${Math.abs(days)} 天`, tone: 'red', days }
  if (days === 0) return { label: '今天到期', tone: 'amber', days }
  if (days === 1) return { label: '明天到期', tone: 'blue', days }
  if (days <= 7) return { label: `${days} 天後`, tone: 'blue', days }
  return { label: `${days} 天後`, tone: 'slate', days }
}

function getReminderSummary(reminders) {
  return reminders.reduce((summary, item) => {
    if (item.status === '已完成') return summary
    const due = getReminderDueInfo(item.dueDate)
    summary.open += 1
    if (due.days < 0) summary.overdue += 1
    if (due.days === 0) summary.today += 1
    if (due.days >= 0 && due.days <= 7) summary.week += 1
    return summary
  }, { open: 0, overdue: 0, today: 0, week: 0 })
}

function createEmptyReminder() {
  const today = new Date()
  today.setDate(today.getDate() + 3)
  const dueDate = today.toISOString().slice(0, 10)
  return { title: '', type: '追蹤提醒', priority: '中', status: '待處理', dueDate, sourceType: '一般', sourceTitle: '', note: '' }
}

function RemindersPage({ reminders, setReminders }) {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(createEmptyReminder())
  const summary = getReminderSummary(reminders)
  const filtered = reminders
    .filter((item) => statusFilter === '全部' || item.status === statusFilter)
    .filter((item) => typeFilter === '全部' || item.type === typeFilter)
    .filter((item) => {
      const q = keyword.trim().toLowerCase()
      if (!q) return true
      return [item.id, item.title, item.type, item.priority, item.status, item.sourceType, item.sourceTitle, item.note].join(' ').toLowerCase().includes(q)
    })
    .sort((a, b) => (toDateOnly(a.dueDate)?.getTime() || 0) - (toDateOnly(b.dueDate)?.getTime() || 0))

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function addReminder() {
    if (!draft.title.trim()) return
    const next = { ...draft, id: `REM-${String(Date.now()).slice(-5)}` }
    setReminders((current) => [next, ...current])
    setDraft(createEmptyReminder())
    setShowForm(false)
  }

  function updateReminder(id, patch) {
    setReminders((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function removeReminder(id) {
    setReminders((current) => current.filter((item) => item.id !== id))
  }

  function resetDemoReminders() {
    setReminders(initialReminders)
    window.localStorage.removeItem('flowdesk-reminders-v193')
  }

  return (
    <div className="reminders-layout">
      <section className="surface-toolbar reminders-hero">
        <div>
          <p className="eyebrow">提醒中心</p>
          <h2>提醒事項工作區</h2>
        </div>
        <div className="record-actions">
          <button className="ghost-btn" type="button" onClick={resetDemoReminders}>重載提醒範例</button>
          <button className="primary-btn" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? '收合新增' : '新增提醒'}</button>
        </div>
      </section>

      <section className="metric-strip reminder-metric-strip">
        <Metric label="逾期" value={summary.overdue} tone="red" />
        <Metric label="今日" value={summary.today} tone="amber" />
        <Metric label="本週" value={summary.week} tone="blue" />
        <Metric label="未結" value={summary.open} tone="violet" />
      </section>

      {showForm && (
        <section className="panel wide reminder-form-panel">
          <PanelTitle eyebrow="新增提醒" title="建立追蹤事項" />
          <div className="reminder-form-grid">
            <label>標題<input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="例如：追蹤廠商報價回覆" /></label>
            <label>類型<select value={draft.type} onChange={(event) => updateDraft('type', event.target.value)}>{reminderTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>優先級<select value={draft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>{reminderPriorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>到期日<input type="date" value={draft.dueDate} onChange={(event) => updateDraft('dueDate', event.target.value)} /></label>
            <label>關聯來源<select value={draft.sourceType} onChange={(event) => updateDraft('sourceType', event.target.value)}>{reminderSourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>關聯名稱<input value={draft.sourceTitle} onChange={(event) => updateDraft('sourceTitle', event.target.value)} placeholder="採購單、專案或任務名稱" /></label>
            <label className="wide-field">備註<textarea value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} placeholder="補充要追蹤的內容" /></label>
          </div>
          <div className="modal-actions inline-actions"><button type="button" onClick={() => setShowForm(false)}>取消</button><button type="button" className="primary-btn" onClick={addReminder}>建立提醒</button></div>
        </section>
      )}

      <section className="panel wide reminder-list-panel">
        <div className="purchase-filter-bar reminder-filter-bar">
          <label className="purchase-search-field">搜尋<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="標題、關聯來源、備註..." /></label>
          <label>狀態<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="全部">全部</option>{reminderStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>類型<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="全部">全部</option>{reminderTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={() => { setKeyword(''); setStatusFilter('全部'); setTypeFilter('全部') }}>清除篩選</button>
        </div>
        <div className="reminder-card-list">
          {filtered.map((item) => {
            const due = getReminderDueInfo(item.dueDate)
            return (
              <article className={`reminder-card ${item.status === '已完成' ? 'done' : ''}`} key={item.id}>
                <div className="reminder-card-main">
                  <span className="record-id">{item.id}</span>
                  <strong>{item.title}</strong>
                  <small>{item.sourceType} · {item.sourceTitle || '未指定'} · {item.type}</small>
                  <p>{item.note}</p>
                </div>
                <div className="reminder-card-meta">
                  <Badge value={item.priority} />
                  <span className={`due-chip ${due.tone}`}>{due.label}</span>
                  <select value={item.status} onChange={(event) => updateReminder(item.id, { status: event.target.value })}>{reminderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                </div>
                <div className="reminder-card-actions">
                  <button type="button" onClick={() => updateReminder(item.id, { status: item.status === '已完成' ? '待處理' : '已完成' })}>{item.status === '已完成' ? '重新開啟' : '完成'}</button>
                  <button type="button" onClick={() => updateReminder(item.id, { status: '延後' })}>延後</button>
                  <button className="danger" type="button" onClick={() => removeReminder(item.id)}>刪除</button>
                </div>
              </article>
            )
          })}
          {!filtered.length && <div className="purchase-empty-state">沒有符合條件的提醒事項</div>}
        </div>
      </section>
    </div>
  )
}

function SettingsPage({ themeOptions, uiTheme, setUiTheme, iconStyleMode, setIconStyleMode, resolvedIconStyle, modules, collections, setCollections, moduleIcons, setModuleIcons, baseTableIcons, setBaseTableIcons, setReminders }) {
  const [settingsView, setSettingsView] = useState('home')
  const activeTheme = themeOptions.find((theme) => theme.id === uiTheme) || themeOptions[0]
  const activeIconStyle = iconStyleOptions.find((style) => style.id === resolvedIconStyle) || iconStyleOptions[1]
  const selectedIconStyle = iconStyleOptions.find((style) => style.id === iconStyleMode) || iconStyleOptions[0]
  const sortedCollections = [...collections].sort((a, b) => (a.order || 0) - (b.order || 0))
  const [newCollectionName, setNewCollectionName] = useState('')

  function resetPurchaseDemo() {
    window.localStorage.removeItem('flowdesk-purchases-v19')
    window.localStorage.removeItem('flowdesk-purchase-history-v19')
    window.localStorage.removeItem('flowdesk-purchase-stages')
    window.location.reload()
  }


  function setModuleIcon(moduleId, icon) {
    setModuleIcons((current) => ({ ...current, [moduleId]: icon }))
  }

  function setBaseTableIcon(tableName, icon) {
    setBaseTableIcons((current) => ({ ...current, [tableName]: icon }))
  }

  function resetIconSettings() {
    setModuleIcons(defaultModuleIcons)
    setBaseTableIcons(defaultBaseTableIcons)
    setIconStyleMode('auto')
    window.localStorage.removeItem('flowdesk-module-icons')
    window.localStorage.removeItem('flowdesk-base-table-icons')
    window.localStorage.removeItem('flowdesk-icon-style-mode')
  }

  function addCollection() {
    const name = newCollectionName.trim()
    if (!name) return
    const nextId = `collection-${Date.now()}`
    setCollections((current) => [
      ...current,
      {
        id: nextId,
        name,
        rows: 0,
        fields: ['名稱', '狀態', '負責人', '備註'],
        color: 'blue',
        icon: '📁',
        visible: true,
        locked: false,
        order: Math.max(0, ...current.map((item) => Number(item.order) || 0)) + 1,
        defaultView: 'list',
      },
    ])
    setBaseTableIcons((current) => ({ ...current, [nextId]: '📁' }))
    setNewCollectionName('')
  }

  function updateCollection(collectionId, patch) {
    setCollections((current) => current.map((item) => item.id === collectionId ? { ...item, ...patch } : item))
  }

  function moveCollection(collectionId, direction) {
    setCollections((current) => {
      const next = [...current].sort((a, b) => (a.order || 0) - (b.order || 0))
      const index = next.findIndex((item) => item.id === collectionId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return current
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
  }

  function removeCollection(collectionId) {
    const target = collections.find((item) => item.id === collectionId)
    if (target?.locked) return
    setCollections((current) => current.filter((item) => item.id !== collectionId))
    setBaseTableIcons((current) => {
      const next = { ...current }
      delete next[collectionId]
      return next
    })
  }

  function resetCollections() {
    setCollections(baseTables.map((item) => ({ ...item })))
    setBaseTableIcons(defaultBaseTableIcons)
    window.localStorage.removeItem('flowdesk-collections-v194')
    window.localStorage.removeItem('flowdesk-base-table-icons')
  }

  function resetReminderDemo() {
    setReminders(initialReminders)
    window.localStorage.removeItem('flowdesk-reminders-v193')
  }

  const settingCards = [
    { id: 'appearance', title: '外觀設定', eyebrow: 'UI THEME', summary: `目前主題：${activeTheme.name}`, icon: '🎨' },
    { id: 'purchase', title: '採購設定', eyebrow: 'PURCHASE', summary: '採購資料與流程維護', icon: '🧾' },
    { id: 'collections', title: '資料集合設定', eyebrow: 'COLLECTIONS', summary: `${collections.filter((item) => item.visible !== false).length} 個顯示中，管理集合入口、視圖與外觀`, icon: '📚' },
    { id: 'sidebar', title: '側邊欄設定', eyebrow: 'LAYOUT', summary: '模組順序與側邊欄排序', icon: '🧭' },
    { id: 'icons', title: '圖示設定', eyebrow: 'ICONS', summary: `目前風格：${iconStyleMode === 'auto' ? '跟隨 UI 主題' : activeIconStyle.name}`, icon: '✨' },
    { id: 'reminders', title: '提醒設定', eyebrow: 'REMINDERS', summary: '提醒類型、狀態與範例資料', icon: '🔔' },
    { id: 'system', title: '系統資訊', eyebrow: 'VERSION', summary: 'FlowDesk v19.5.2 功能收斂版', icon: '⚙️' },
  ]

  return (
    <div className="settings-layout settings-hub-layout">
      <section className="surface-toolbar settings-hero">
        <div>
          <p className="eyebrow">系統設定</p>
          <h2>{settingsView === 'home' ? '設定中心' : settingCards.find((item) => item.id === settingsView)?.title}</h2>
        </div>
        {settingsView === 'home' ? (
          <button className="ghost-btn" type="button" onClick={() => setSettingsView('appearance')}>調整外觀</button>
        ) : (
          <button className="ghost-btn" type="button" onClick={() => setSettingsView('home')}>返回設定中心</button>
        )}
      </section>

      {settingsView === 'home' && (
        <section className="panel wide settings-panel settings-overview-panel">
          <PanelTitle eyebrow="設定分類" title="選擇要調整的項目" />
          <div className="settings-category-grid">
            {settingCards.map((card) => (
              <button className="settings-category-card" key={card.id} type="button" onClick={() => setSettingsView(card.id)}>
                <span className="settings-category-icon">{card.icon}</span>
                <small>{card.eyebrow}</small>
                <strong>{card.title}</strong>
                <p>{card.summary}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsView === 'appearance' && (
        <section className="panel wide settings-panel">
          <PanelTitle eyebrow="外觀設定" title="UI 主題切換" />
          <p className="settings-note">選擇後會套用到側邊欄、主要按鈕、卡片重點色與系統高亮色。若圖示風格設為「跟隨 UI 主題」，切換主題時圖示也會自動改成適合的風格。</p>
          <div className="theme-grid packaged-theme-grid">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                className={uiTheme === theme.id ? 'theme-option active' : 'theme-option'}
                type="button"
                onClick={() => setUiTheme(theme.id)}
              >
                <span className={`theme-swatch ${theme.id}`} />
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsView === 'purchase' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="採購設定" title="採購資料" />
          <p className="settings-note">採購是獨立資料應用，保留多品項、搜尋篩選、分頁與採購流程設定；其他資料集合暫不硬套流程。</p>
          <button className="ghost-btn" type="button" onClick={resetPurchaseDemo}>重置資料</button>
        </section>
      )}

      {settingsView === 'sidebar' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="版面設定" title="側邊欄排序" />
          <p className="settings-note">側邊欄模組可以拖曳調整順序，系統會自動記住目前排列。</p>
        </section>
      )}

      {settingsView === 'collections' && (
        <section className="panel wide settings-panel settings-detail-panel collection-settings-panel">
          <PanelTitle eyebrow="資料集合" title="管理資料集合" />
          <p className="settings-note">這裡只管理紀錄中心的資料集合入口、圖示、顏色、顯示狀態與預設視圖；流程暫時維持採購獨立設定。</p>
          <div className="collection-add-row">
            <input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="輸入新的資料集合名稱，例如：合約清單" />
            <button className="primary-btn" type="button" onClick={addCollection}>新增資料集合</button>
          </div>
          <div className="collection-editor-list">
            {sortedCollections.map((collection, index) => (
              <article className={collection.visible === false ? 'collection-editor disabled' : 'collection-editor'} key={collection.id}>
                <span className={`collection-preview ${collection.color}`}>{baseTableIcons[collection.id] || baseTableIcons[collection.name] || defaultBaseTableIcons[collection.name] || collection.icon || '📁'}</span>
                <input value={collection.name} onChange={(event) => updateCollection(collection.id, { name: event.target.value })} />
                <select value={collection.color || 'blue'} onChange={(event) => updateCollection(collection.id, { color: event.target.value })}>
                  {collectionColorOptions.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
                <select value={collection.defaultView || 'list'} onChange={(event) => updateCollection(collection.id, { defaultView: event.target.value })}>
                  {collectionViewOptions.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
                </select>
                <label className="collection-toggle"><input type="checkbox" checked={collection.visible !== false} onChange={(event) => updateCollection(collection.id, { visible: event.target.checked })} />顯示</label>
                <div className="collection-order-actions">
                  <button type="button" onClick={() => moveCollection(collection.id, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveCollection(collection.id, 1)} disabled={index === sortedCollections.length - 1}>↓</button>
                </div>
                <button className="stage-remove" type="button" onClick={() => removeCollection(collection.id)} disabled={collection.locked}>刪除</button>
              </article>
            ))}
          </div>
          <div className="icon-settings-actions">
            <button className="ghost-btn" type="button" onClick={resetCollections}>恢復預設資料集合</button>
          </div>
        </section>
      )}

      {settingsView === 'icons' && (
        <section className="panel wide settings-panel settings-detail-panel icon-settings-panel">
          <PanelTitle eyebrow="圖示設定" title="主選單與資料清單圖示" />
          <p className="settings-note">這裡可以手動更換左側主選單與紀錄中心資料清單的圖示。未來資料清單新增分類後，也會自動出現在這裡。</p>
          <div className="icon-style-panel">
            <div>
              <p className="eyebrow">ICON STYLE</p>
              <h3>圖示風格</h3>
              <small>目前套用：{iconStyleMode === 'auto' ? `${selectedIconStyle.name}，目前自動使用 ${activeIconStyle.name}` : activeIconStyle.name}</small>
            </div>
            <div className="icon-style-options">
              {iconStyleOptions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={iconStyleMode === style.id ? 'icon-style-option active' : 'icon-style-option'}
                  onClick={() => setIconStyleMode(style.id)}
                >
                  <span className={`icon-style-sample ${style.id === 'auto' ? resolvedIconStyle : style.id}`}>✨</span>
                  <strong>{style.name}</strong>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="icon-settings-actions">
            <button className="ghost-btn" type="button" onClick={resetIconSettings}>恢復預設圖示</button>
          </div>
          <div className="icon-settings-section">
            <h3>左側主選單</h3>
            <div className="icon-picker-list">
              {modules.map((module) => (
                <IconPickerRow key={module.id} title={module.name} currentIcon={moduleIcons[module.id] || defaultModuleIcons[module.id] || '✨'} onSelect={(icon) => setModuleIcon(module.id, icon)} />
              ))}
            </div>
          </div>
          <div className="icon-settings-section">
            <h3>資料清單</h3>
            <div className="icon-picker-list">
              {sortedCollections.map((table) => (
                <IconPickerRow key={table.id} title={table.name} currentIcon={baseTableIcons[table.id] || baseTableIcons[table.name] || defaultBaseTableIcons[table.name] || table.icon || '📄'} onSelect={(icon) => setBaseTableIcon(table.id, icon)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {settingsView === 'reminders' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="提醒設定" title="提醒中心" />
          <p className="settings-note">提醒中心目前支援一般提醒、追蹤提醒、廠商回覆、簽核、到貨與續約提醒。後續可再加通知規則與預設天數。</p>
          <div className="settings-info-list">
            <div><span>提醒類型</span><strong>{reminderTypeOptions.length} 種</strong></div>
            <div><span>提醒狀態</span><strong>{reminderStatusOptions.join(' / ')}</strong></div>
            <div><span>首頁摘要</span><strong>逾期 / 今日 / 本週 / 未結</strong></div>
          </div>
          <button className="ghost-btn" type="button" onClick={resetReminderDemo}>重載提醒範例</button>
        </section>
      )}

      {settingsView === 'system' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="系統資訊" title="FlowDesk v19.5.2" />
          <div className="settings-info-list">
            <div><span>版本基底</span><strong>v17 → v19.5.1 → v19.5.2</strong></div>
            <div><span>目前主題</span><strong>{activeTheme.name}</strong></div>
            <div><span>圖示風格</span><strong>{iconStyleMode === 'auto' ? `跟隨 UI 主題（${activeIconStyle.name}）` : activeIconStyle.name}</strong></div>
            <div><span>提醒中心</span><strong>獨立運作</strong></div>
            <div><span>採購資料</span><strong>獨立流程</strong></div>
            <div><span>資料集合</span><strong>入口與視圖管理</strong></div>
          </div>
        </section>
      )}
    </div>
  )
}

function IconPickerRow({ title, currentIcon, onSelect }) {
  return (
    <article className="icon-picker-row">
      <div className="icon-picker-title">
        <span className="icon-current">{currentIcon}</span>
        <strong>{title}</strong>
      </div>
      <div className="icon-option-grid">
        {iconOptions.map((icon) => (
          <button
            key={icon}
            type="button"
            className={currentIcon === icon ? 'icon-option active' : 'icon-option'}
            onClick={() => onSelect(icon)}
            aria-label={`設定 ${title} 圖示為 ${icon}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </article>
  )
}


function ContextPanel({ selected }) {
  if (!selected) {
    return (
      <div className="context-inner context-empty">
        <p className="eyebrow">詳細預覽</p>
        <h2>未選取工作</h2>
        <p>工作看板目前沒有可預覽的項目。</p>
      </div>
    )
  }

  return (
    <div className="context-inner">
      <p className="eyebrow">詳細預覽</p>
      <h2>{selected.title}</h2>
      <div className="context-meta">
        <Badge value={selected.lane} />
        <Badge value={selected.priority} />
        <span>{selected.id}</span>
      </div>
      <p>{selected.note}</p>
      <div className="context-section">
        <strong>關聯資訊</strong>
        <span>{selected.relation}</span>
        <span>{selected.channel}</span>
        <span>{selected.requester}</span>
      </div>
      <div className="context-section">
        <strong>欄位資料</strong>
        <div className="field-line"><span>負責人</span><b>{selected.owner}</b></div>
        <div className="field-line"><span>到期日</span><b>{selected.due}</b></div>
        <div className="field-line"><span>健康度</span><b>{selected.health}%</b></div>
      </div>
      <div className="context-section">
        <strong>標籤</strong>
        <div className="tag-list">{(Array.isArray(selected.tags) ? selected.tags : []).map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
    </div>
  )
}

function CreateLauncher({ onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="launcher">
        <div className="launcher-head">
          <div><p className="eyebrow">快速建立</p><h2>建立新的項目</h2></div>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        <div className="launcher-grid">
          {['任務', '採購', '專案', '廠商', '文件', '規則'].map((title) => <button type="button" key={title}><strong>{title}</strong></button>)}
        </div>
      </section>
    </div>
  )
}


function PurchaseModal({ onClose, onSubmit, stages, initial, mode = 'create' }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id,
    item: initial ? purchaseTitle(initial) : '',
    items: initial ? getPurchaseItems(initial) : [{ id: `line-${Date.now()}`, name: '', quantity: 1, unitPrice: 0, note: '' }],
    department: initial?.department || '',
    requester: initial?.requester || '',
    vendor: initial?.vendor || '',
    taxMode: initial?.taxMode || '未稅',
    taxRate: initial?.taxRate ?? 5,
    quoteAmount: initial?.quoteAmount || 0,
    status: initial?.status || stages?.[0]?.name || '需求確認',
    requestDate: initial?.requestDate || new Date().toISOString().slice(0, 10),
    orderDate: initial?.orderDate || '',
    arrivalDate: initial?.arrivalDate || '',
    note: initial?.note || '',
  }))

  const amount = calculatePurchase(form)
  const itemCount = form.items.length
  const totalQuantity = form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const itemSubtotal = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateItem(itemId, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item),
    }))
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { id: `line-${Date.now()}`, name: '', quantity: 1, unitPrice: 0, note: '' }],
    }))
  }

  function duplicateItem(itemId) {
    setForm((current) => {
      const target = current.items.find((item) => item.id === itemId)
      if (!target) return current
      const targetIndex = current.items.findIndex((item) => item.id === itemId)
      const cloned = { ...target, id: `line-${Date.now()}`, name: target.name ? `${target.name} 複製` : '' }
      const nextItems = [...current.items]
      nextItems.splice(targetIndex + 1, 0, cloned)
      return { ...current, items: nextItems }
    })
  }

  function removeItem(itemId) {
    setForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((item) => item.id !== itemId) : current.items,
    }))
  }

  function submitForm() {
    const cleanItems = form.items
      .map((item) => ({
        ...item,
        name: String(item.name || '').trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        note: String(item.note || '').trim(),
      }))
      .filter((item) => item.name || item.quantity || item.unitPrice)
    onSubmit({
      ...form,
      items: cleanItems.length ? cleanItems : [{ id: `line-${Date.now()}`, name: form.item || '未命名品項', quantity: 1, unitPrice: 0, note: '' }],
      item: cleanItems.length > 1 ? `${cleanItems[0].name || '採購品項'} 等 ${cleanItems.length} 項` : (cleanItems[0]?.name || form.item || '未命名採購'),
    })
  }

  return (
    <div className="modal-backdrop">
      <section className="launcher purchase-modal v16-modal">
        <div className="launcher-head purchase-modal-head">
          <div><p className="eyebrow">採購紀錄</p><h2>{mode === 'edit' ? '編輯採購' : '新增採購'}</h2></div>
          <button type="button" onClick={onClose}>✕</button>
        </div>

        <div className="purchase-modal-body">
          <div className="form-grid">
            <label>使用單位<input value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="例如 高雄營業所" /></label>
            <label>申請人<input value={form.requester} onChange={(event) => update('requester', event.target.value)} /></label>
            <label>廠商<input value={form.vendor} onChange={(event) => update('vendor', event.target.value)} /></label>
            <label>狀態<select value={form.status} onChange={(event) => update('status', event.target.value)}>{(stages || initialPurchaseStages).map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
          </div>

          <section className="purchase-items-editor">
            <div className="purchase-items-head">
              <div><p className="eyebrow">品項明細</p><h3>一筆採購可加入多個物品</h3></div>
              <button className="ghost-btn" type="button" onClick={addItem}>新增品項</button>
            </div>
            <div className="purchase-item-summary">
              <span>品項數 <b>{itemCount}</b></span>
              <span>總數量 <b>{totalQuantity}</b></span>
              <span>品項小計 <b>{formatMoney(itemSubtotal)}</b></span>
            </div>
            <div className="purchase-item-rows">
              {form.items.map((item, index) => {
                const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                return (
                  <article className="purchase-item-row" key={item.id}>
                    <div className="item-index">{index + 1}</div>
                    <label className="item-name">品項<input value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} placeholder="例如 Wi‑Fi AP" /></label>
                    <label>數量<input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></label>
                    <label>單價<input type="number" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)} /></label>
                    <label className="item-note">備註<input value={item.note || ''} onChange={(event) => updateItem(item.id, 'note', event.target.value)} placeholder="規格 / 用途" /></label>
                    <div className="line-total"><span>小計</span><strong>{formatMoney(lineTotal)}</strong></div>
                    <div className="line-actions">
                      <button type="button" onClick={() => duplicateItem(item.id)}>複製</button>
                      <button className="line-remove" type="button" onClick={() => removeItem(item.id)} disabled={form.items.length <= 1}>刪除</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="form-grid money-grid">
            <label>稅別<select value={form.taxMode} onChange={(event) => update('taxMode', event.target.value)}><option value="未稅">單價未稅</option><option value="含稅">單價含稅</option></select></label>
            <label>稅率 %<input type="number" value={form.taxRate} onChange={(event) => update('taxRate', event.target.value)} /></label>
            <label>報價單金額<input type="number" value={form.quoteAmount} onChange={(event) => update('quoteAmount', event.target.value)} /></label>
            <label>申請日<input type="date" value={form.requestDate} onChange={(event) => update('requestDate', event.target.value)} /></label>
            <label>下單日<input type="date" value={form.orderDate} onChange={(event) => update('orderDate', event.target.value)} /></label>
            <label>到貨日<input type="date" value={form.arrivalDate} onChange={(event) => update('arrivalDate', event.target.value)} /></label>
            <label className="form-wide">備註<textarea value={form.note} onChange={(event) => update('note', event.target.value)} /></label>
          </div>

          <div className="tax-preview">
            <article><span>未稅金額</span><strong>{formatMoney(amount.untaxedAmount)}</strong></article>
            <article><span>稅額</span><strong>{formatMoney(amount.taxAmount)}</strong></article>
            <article><span>含稅總額</span><strong>{formatMoney(amount.taxedTotal)}</strong></article>
          </div>
        </div>

        <div className="form-actions sticky-form-actions">
          <button className="ghost-btn" type="button" onClick={onClose}>取消</button>
          <button className="primary-btn" type="button" onClick={submitForm} disabled={!form.items.some((item) => String(item.name || '').trim())}>儲存</button>
        </div>
      </section>
    </div>
  )
}

function normalizePurchase(row) {
  const items = getPurchaseItems(row)
  const title = purchaseTitle({ ...row, items })
  return {
    ...row,
    item: title,
    items,
    quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    unitPrice: items.length === 1 ? Number(items[0].unitPrice || 0) : 0,
    taxRate: Number(row.taxRate ?? 5),
    quoteAmount: Number(row.quoteAmount || 0),
    taxMode: row.taxMode || '未稅',
  }
}

function getPurchaseItems(row = {}) {
  const source = Array.isArray(row.items) && row.items.length
    ? row.items
    : [{ id: 'line-legacy', name: row.item || '', quantity: row.quantity || 1, unitPrice: row.unitPrice || 0, note: row.note || '' }]

  return source.map((item, index) => ({
    id: item.id || `line-${index + 1}`,
    name: item.name || item.item || '',
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unitPrice || 0),
    note: item.note || '',
  }))
}

function purchaseTitle(row = {}) {
  const items = getPurchaseItems(row).filter((item) => item.name)
  if (!items.length) return row.item || '未命名採購'
  if (items.length === 1) return items[0].name
  return `${items[0].name} 等 ${items.length} 項`
}

function calculatePurchase(row) {
  const items = getPurchaseItems(row)
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const rate = Number(row.taxRate ?? 5) / 100
  if ((row.taxMode || '未稅') === '含稅') {
    const taxedTotal = subtotal
    const untaxedAmount = rate ? taxedTotal / (1 + rate) : taxedTotal
    const taxAmount = taxedTotal - untaxedAmount
    return roundAmounts({ untaxedAmount, taxAmount, taxedTotal })
  }
  const untaxedAmount = subtotal
  const taxAmount = untaxedAmount * rate
  const taxedTotal = untaxedAmount + taxAmount
  return roundAmounts({ untaxedAmount, taxAmount, taxedTotal })
}

function roundAmounts(amounts) {
  return Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, Math.round(Number(value || 0))]))
}

function PurchaseDetail({ row, stages, relatedTasks = [] }) {
  const amount = calculatePurchase(row)
  const items = getPurchaseItems(row)
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const quoteAmount = Number(row.quoteAmount || 0)
  const diff = quoteAmount ? amount.taxedTotal - quoteAmount : 0
  return (
    <div className="purchase-detail-stack enhanced-detail">
      <div className="detail-status-strip">
        <StageBadge value={row.status} stages={stages} />
        <span>{row.department || '未填部門'}</span>
        <span>{row.requester || '未填申請人'}</span>
      </div>

      <div className="detail-money-summary">
        <article>
          <span>含稅總額</span>
          <strong>{formatMoney(amount.taxedTotal)}</strong>
        </article>
        <article>
          <span>未稅 / 稅額</span>
          <strong>{formatMoney(amount.untaxedAmount)}</strong>
          <small>{formatMoney(amount.taxAmount)}</small>
        </article>
        <article>
          <span>報價差額</span>
          <strong className={Math.abs(diff) > 1 ? 'has-diff' : ''}>{quoteAmount ? formatMoney(diff) : '—'}</strong>
        </article>
      </div>

      <div className="purchase-detail-grid">
        <span>編號<b>{row.id}</b></span>
        <span>廠商<b>{row.vendor || '—'}</b></span>
        <span>品項數<b>{items.length} 項 / {totalQuantity} 件</b></span>
        <span>稅別<b>{row.taxMode || '未稅'} / {Number(row.taxRate || 0)}%</b></span>
        <span>申請日<b>{row.requestDate || '—'}</b></span>
        <span>下單日<b>{row.orderDate || '—'}</b></span>
        <span>到貨日<b>{row.arrivalDate || '—'}</b></span>
      </div>

      <div className="purchase-line-detail">
        <div className="line-detail-head"><strong>品項明細</strong><span>{items.length} 項 · 共 {totalQuantity} 件</span></div>
        {items.map((item, index) => (
          <article key={item.id}>
            <span>{index + 1}</span>
            <div><b>{item.name || '未命名品項'}</b><small>{item.note || '—'}</small></div>
            <em>{item.quantity} × {formatMoney(item.unitPrice)}</em>
            <strong>{formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</strong>
          </article>
        ))}
      </div>

      <div className="purchase-related-flow">
        <div className="line-detail-head"><strong>相關任務與下一步</strong><span>{relatedTasks.length} 筆</span></div>
        {relatedTasks.length ? relatedTasks.map((task) => (
          <article key={task.id}>
            <div><b>{task.title}</b><small>{task.status} · {task.relatedVendor || row.vendor || '未指定廠商'}</small></div>
            <p>{task.next}</p>
          </article>
        )) : <p>目前沒有關聯任務，可於任務追蹤建立採購、廠商或專案關聯。</p>}
      </div>

      <div className="detail-note-box">
        <span>備註</span>
        <p>{row.note || '尚未填寫備註。'}</p>
      </div>
    </div>
  )
}

function ScrollTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 320)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null
  return (
    <button className="scroll-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      ↑
    </button>
  )
}

function WorkCard({ item, onSelect, selected }) {
  const isSelected = selected?.id === item.id
  return (
    <article className={isSelected ? 'work-card-shell selected' : 'work-card-shell'}>
      <button className="work-card" type="button" onClick={onSelect}>
        <div className="card-top"><span>{item.id}</span><Badge value={item.priority} /></div>
        <strong>{item.title}</strong>
        <p>{item.note}</p>
        <div className="tag-list">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="card-bottom"><span>{item.owner}</span><span>{item.due}</span></div>
      </button>
      {isSelected && <BoardInlinePreview selected={item} />}
    </article>
  )
}


function WorkGrid({ items, selected, setSelected }) {
  return (
    <section className="work-grid">
      <div className="work-grid-head">
        <span>編號</span><span>標題</span><span>狀態</span><span>優先級</span><span>關聯</span><span>到期日</span>
      </div>
      {items.map((item) => {
        const isSelected = selected?.id === item.id
        return (
          <article className={isSelected ? 'work-grid-shell selected' : 'work-grid-shell'} key={item.id}>
            <button className="work-grid-row" type="button" onClick={() => setSelected(item)}>
              <span className="work-grid-id" data-label="編號">{item.id}</span>
              <strong className="work-grid-title" data-label="標題">{item.title}</strong>
              <span className="work-grid-status" data-label="狀態"><Badge value={item.lane} /></span>
              <span className="work-grid-priority" data-label="優先級"><Badge value={item.priority} /></span>
              <span className="work-grid-relation" data-label="關聯">{item.relation}</span>
              <span className="work-grid-due" data-label="到期日">{item.due}</span>
            </button>
            {isSelected && <BoardInlinePreview selected={item} />}
          </article>
        )
      })}
    </section>
  )
}


function CardWall({ items, selected, setSelected }) {
  return (
    <section className="card-wall board-card-view">
      {items.map((item) => (
        <WorkCard key={item.id} item={item} selected={selected} onSelect={() => setSelected(item)} />
      ))}
    </section>
  )
}


function Metric({ label, value, tone }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></article>
}

function PanelTitle({ eyebrow, title, action }) {
  return <div className="panel-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <span>{action}</span>}</div>
}

function StageBadge({ value, stages }) {
  const matched = stages.find((stage) => stage.name === value)
  return <span className={`badge ${matched?.tone || toneMap[value] || 'blue'}`}>{value}</span>
}

function Badge({ value }) {
  return <span className={`badge ${toneMap[value] || 'blue'}`}>{value}</span>
}

function formatMoney(value) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value)
}














// FLOWDESK_PROJECT_VIEW_SWITCHER_BRIDGE_START
if (typeof window !== 'undefined' && !window.__flowdeskProjectViewModalReady) {
  window.__flowdeskProjectViewModalReady = true

  const FLOW_PROJECT_VIEW_KEY = 'flowdesk-project-view-mode'

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const getProjects = () => {
    try {
      if (typeof projects !== 'undefined' && Array.isArray(projects)) {
        return [...projects].sort((a, b) => {
          const aNum = Number(String(a.id).match(/\d+/)?.[0] || 0)
          const bNum = Number(String(b.id).match(/\d+/)?.[0] || 0)
          return aNum - bNum || String(a.name).localeCompare(String(b.name), 'zh-Hant')
        })
      }
    } catch (error) {}
    return []
  }

  const getTickets = () => {
    try {
      if (typeof tickets !== 'undefined' && Array.isArray(tickets)) return tickets
    } catch (error) {}
    return []
  }

  const getWorkspace = () => document.querySelector('.project-workspace, .project-responsive, .project-reflow, .project-compact-screen, .project-smallscreen-simple, .project-scalable-selector, .project-list-modal-mode, .project-compact-modal-only')
  const getListPanel = (workspace) => workspace?.querySelector('.project-list-panel-v2, .project-list-panel')

  const statusClass = (project) => {
    const health = String(project.health || '')
    if (project.tone === 'red' || health.includes('待')) return 'danger'
    if (project.tone === 'green' || health.includes('穩')) return 'ok'
    return 'warn'
  }

  const dateLabel = (value) => {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    return String(date.getMonth() + 1).padStart(2, '0') + '/' + String(date.getDate()).padStart(2, '0')
  }

  const percent = (date, start, end) => {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const d = new Date(date).getTime()
    if (!Number.isFinite(s) || !Number.isFinite(e) || s === e) return 0
    return Math.max(0, Math.min(100, ((d - s) / (e - s)) * 100))
  }

  const rangeStyle = (start, end, baseStart, baseEnd) => {
    const left = percent(start, baseStart, baseEnd)
    const right = percent(end, baseStart, baseEnd)
    return { left, width: Math.max(3, right - left) }
  }

  const ticks = (start, end) => {
    const s = new Date(start)
    const e = new Date(end)
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return []
    const total = Math.max(1, e.getTime() - s.getTime())
    return [0, .25, .5, .75, 1].map((ratio) => new Date(s.getTime() + total * ratio))
  }

  const rowHtml = (project, index) => `
    <button type="button" class="flow-project-row" data-flow-project-id="${escapeHtml(project.id)}">
      <span class="flow-project-row-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="flow-project-row-main">
        <strong>${escapeHtml(project.name)}</strong>
        <small>${escapeHtml(project.id)} · ${escapeHtml(project.phase)} · ${escapeHtml(project.owner)}</small>
      </span>
      <span class="flow-project-row-status ${statusClass(project)}">${escapeHtml(project.health)}</span>
      <span class="flow-project-row-date"><b>${escapeHtml(project.startDate)}</b><b>${escapeHtml(project.endDate)}</b></span>
      <span class="flow-project-row-progress"><i><em style="width:${Number(project.progress) || 0}%"></em></i><b>${escapeHtml(project.progress)}%</b></span>
    </button>
  `

  const cardHtml = (project) => `
    <button type="button" class="flow-project-card" data-flow-project-id="${escapeHtml(project.id)}">
      <span class="flow-project-card-top"><small>${escapeHtml(project.id)}</small><b class="${statusClass(project)}">${escapeHtml(project.health)}</b></span>
      <strong>${escapeHtml(project.name)}</strong>
      <p>${escapeHtml(project.next)}</p>
      <span class="flow-project-card-meta">${escapeHtml(project.phase)} · ${escapeHtml(project.owner)}</span>
      <span class="flow-project-card-dates"><b>${escapeHtml(project.startDate)}</b><b>${escapeHtml(project.endDate)}</b></span>
      <span class="flow-project-card-progress"><i><em style="width:${Number(project.progress) || 0}%"></em></i><b>${escapeHtml(project.progress)}%</b></span>
    </button>
  `

  const kanbanHtml = (items) => {
    const phases = []
    items.forEach((project) => {
      if (!phases.includes(project.phase)) phases.push(project.phase)
    })

    return `
      <div class="flow-project-kanban">
        ${phases.map((phase) => {
          const grouped = items.filter((project) => project.phase === phase)
          return `
            <section class="flow-project-kanban-col">
              <header><strong>${escapeHtml(phase)}</strong><span>${grouped.length}</span></header>
              <div>
                ${grouped.map((project) => `
                  <button type="button" class="flow-project-kanban-card" data-flow-project-id="${escapeHtml(project.id)}">
                    <span><small>${escapeHtml(project.id)}</small><b class="${statusClass(project)}">${escapeHtml(project.health)}</b></span>
                    <strong>${escapeHtml(project.name)}</strong>
                    <p>${escapeHtml(project.owner)} · ${escapeHtml(project.progress)}%</p>
                    <i><em style="width:${Number(project.progress) || 0}%"></em></i>
                  </button>
                `).join('')}
              </div>
            </section>
          `
        }).join('')}
      </div>
    `
  }

  const bodyHtml = (mode, items) => {
    if (mode === 'card') return `<div class="flow-project-card-grid">${items.map(cardHtml).join('')}</div>`
    if (mode === 'kanban') return kanbanHtml(items)

    return `
      <div class="flow-project-table-head">
        <span>序號</span><span>專案名稱</span><span>狀態</span><span>日期</span><span>進度</span>
      </div>
      <div class="flow-project-table-body">${items.map(rowHtml).join('')}</div>
    `
  }

  const openProjectModal = (project) => {
    if (!project) return

    document.querySelector('.project-final-modal-backdrop-dom')?.remove()

    const taskItems = Array.isArray(project.tasks) ? project.tasks : []
    const milestoneItems = Array.isArray(project.milestones) ? project.milestones : []
    const relatedItems = Array.isArray(project.related) ? project.related : []
    const recordItems = Array.isArray(project.records) ? project.records : []
    const relatedTickets = getTickets().filter((task) => task.relatedProject === project.id)
    const tickItems = ticks(project.startDate, project.endDate)
    const mainRange = rangeStyle(project.startDate, project.endDate, project.startDate, project.endDate)

    const tickHtml = tickItems.map((tick) => `<span>${escapeHtml(dateLabel(tick))}</span>`).join('')
    const dotsHtml = milestoneItems.map((milestone) => `<i class="project-final-dot ${milestone.done ? 'done' : ''}" style="left:${percent(milestone.date, project.startDate, project.endDate)}%" title="${escapeHtml(milestone.name)}"></i>`).join('')

    const taskRowsHtml = taskItems.map((task) => {
      const style = rangeStyle(task.start, task.end, project.startDate, project.endDate)
      return `
        <div class="project-final-gantt-row-dom">
          <div class="project-final-gantt-label sub"><span>${escapeHtml(task.name)}</span><small>${escapeHtml(task.owner)}</small></div>
          <div class="project-final-track soft"><span class="project-final-taskbar" style="left:${style.left}%;width:${style.width}%">${escapeHtml(task.progress)}%</span></div>
        </div>
      `
    }).join('')

    const taskListHtml = taskItems.map((task) => `<div><strong>${escapeHtml(task.name)}</strong><span>${escapeHtml(task.owner)} · ${escapeHtml(task.start)} - ${escapeHtml(task.end)}</span><small>${escapeHtml(task.progress)}%</small></div>`).join('')
    const relatedTaskHtml = relatedTickets.length
      ? relatedTickets.map((task) => `<article><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.status)} · ${escapeHtml(task.next)}</span></article>`).join('')
      : '<p>目前沒有關聯任務。</p>'
    const milestoneHtml = milestoneItems.map((milestone) => `<div class="${milestone.done ? 'done' : ''}"><span></span><strong>${escapeHtml(milestone.name)}</strong><small>${escapeHtml(milestone.date)}</small></div>`).join('')
    const relatedHtml = relatedItems.map((item) => `<span>${escapeHtml(item)}</span>`).join('')
    const recordHtml = recordItems.map((record, index) => `<div><span>${index + 1}</span><p>${escapeHtml(record)}</p></div>`).join('')

    const backdrop = document.createElement('div')
    backdrop.className = 'project-final-modal-backdrop-dom'
    backdrop.innerHTML = `
      <div class="project-final-modal-shell-dom" role="dialog" aria-modal="true">
        <div class="project-final-modal-head-dom">
          <div>
            <p class="eyebrow">PROJECT DETAIL</p>
            <h3>${escapeHtml(project.name)}</h3>
            <span>${escapeHtml(project.id)} · ${escapeHtml(project.phase)} · ${escapeHtml(project.owner)} · ${escapeHtml(project.startDate)} → ${escapeHtml(project.endDate)}</span>
          </div>
          <div class="project-final-modal-actions-dom">
            <span class="badge ${statusClass(project)}">${escapeHtml(project.health)}</span>
            <button type="button" data-flow-project-close>關閉</button>
          </div>
        </div>

        <div class="project-final-modal-body-dom">
          <section class="project-final-summary-card-dom">
            <div><span>${escapeHtml(project.id)}</span><b>${escapeHtml(project.progress)}%</b></div>
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.next)}</p>
            <div class="flow-progress big"><span style="width:${Number(project.progress) || 0}%"></span></div>
          </section>

          <section class="project-final-field-grid-dom">
            <article><span>階段</span><strong>${escapeHtml(project.phase)}</strong></article>
            <article><span>負責</span><strong>${escapeHtml(project.owner)}</strong></article>
            <article><span>開始</span><strong>${escapeHtml(project.startDate)}</strong></article>
            <article><span>結束</span><strong>${escapeHtml(project.endDate)}</strong></article>
          </section>

          <section class="project-final-section-dom">
            <div class="project-final-section-head-dom">
              <p class="eyebrow">GANTT</p>
              <h3>專案甘特圖</h3>
              <small>只顯示目前選取專案的時間軸與任務。</small>
            </div>
            <div class="project-final-gantt-scroll-dom">
              <div class="project-final-gantt-head-dom"><span>項目</span>${tickHtml}</div>
              <div class="project-final-gantt-row-dom">
                <div class="project-final-gantt-label"><strong>專案總期程</strong><small>${escapeHtml(project.phase)}</small></div>
                <div class="project-final-track"><span class="project-final-mainbar ${escapeHtml(project.tone)}" style="left:${mainRange.left}%;width:${mainRange.width}%">${escapeHtml(project.progress)}%</span>${dotsHtml}</div>
              </div>
              ${taskRowsHtml}
            </div>
          </section>

          <section class="project-final-section-dom"><p class="eyebrow">專案任務 / 甘特項目</p><div class="project-final-task-list-dom">${taskListHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">關聯任務</p><div class="project-final-related-list-dom">${relatedTaskHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">里程碑</p><div class="project-final-milestone-list-dom">${milestoneHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">關聯資料</p><div class="tag-list">${relatedHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">處理紀錄</p><div class="project-final-timeline-dom">${recordHtml}</div></section>
        </div>
      </div>
    `

    const close = () => backdrop.remove()
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-flow-project-close]')) close()
    })

    const esc = (event) => {
      if (event.key === 'Escape') {
        close()
        document.removeEventListener('keydown', esc)
      }
    }
    document.addEventListener('keydown', esc)
    document.body.appendChild(backdrop)
  }

  const renderProjectView = () => {
    const workspace = getWorkspace()
    const listPanel = getListPanel(workspace)
    const items = getProjects()
    if (!workspace || !listPanel || !items.length) return

    let shell = workspace.querySelector('.flow-project-view-shell')
    if (!shell) {
      shell = document.createElement('div')
      shell.className = 'flow-project-view-shell'
      listPanel.parentNode.insertBefore(shell, listPanel)
    }

    workspace.classList.add('flow-project-view-switcher-active')

    const mode = localStorage.getItem(FLOW_PROJECT_VIEW_KEY) || 'table'
    shell.dataset.mode = mode
    shell.innerHTML = `
      <div class="flow-project-view-toolbar">
        <div><strong>專案清單</strong><span>${items.length} 件 · 依專案編號排序</span></div>
        <div class="flow-project-view-tabs" role="tablist" aria-label="專案視圖切換">
          <button type="button" data-flow-project-view="table" class="${mode === 'table' ? 'active' : ''}">表格</button>
          <button type="button" data-flow-project-view="card" class="${mode === 'card' ? 'active' : ''}">卡片</button>
          <button type="button" data-flow-project-view="kanban" class="${mode === 'kanban' ? 'active' : ''}">看板</button>
        </div>
      </div>
      <div class="flow-project-view-body">${bodyHtml(mode, items)}</div>
    `
  }

  const renderSoon = () => window.requestAnimationFrame(renderProjectView)

  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-flow-project-view]')
    if (viewButton) {
      event.preventDefault()
      event.stopPropagation()
      localStorage.setItem(FLOW_PROJECT_VIEW_KEY, viewButton.dataset.flowProjectView || 'table')
      renderProjectView()
      return
    }

    const projectButton = event.target.closest('[data-flow-project-id]')
    if (projectButton) {
      event.preventDefault()
      event.stopPropagation()
      const project = getProjects().find((item) => item.id === projectButton.dataset.flowProjectId)
      openProjectModal(project)
    }
  }, true)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSoon, { once: true })
  } else {
    renderSoon()
  }

  const observer = new MutationObserver(() => {
    const workspace = getWorkspace()
    if (workspace && !workspace.querySelector('.flow-project-view-shell')) renderSoon()
  })
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('resize', renderSoon)
}
// FLOWDESK_PROJECT_VIEW_SWITCHER_BRIDGE_END















// FLOWDESK_LEFT_NAV_SYNC_LAYOUT_BRIDGE_START
if (typeof window !== 'undefined' && !window.__flowdeskLeftNavSyncLayoutReady) {
  window.__flowdeskLeftNavSyncLayoutReady = true

  const navSelector = [
    '.workspace-sidebar',
    '.app-sidebar',
    '.flow-sidebar',
    '.nav-rail',
    '.left-rail',
    '.side-nav',
    '.product-shell > aside:first-child'
  ].join(',')

  let activeNav = null
  let closeTimer = null

  const setExpanded = (expanded) => {
    if (window.innerWidth <= 760) {
      document.body.classList.remove('flow-left-nav-expanded')
      return
    }

    document.body.classList.toggle('flow-left-nav-expanded', expanded)
  }

  const bindNav = () => {
    const nav = document.querySelector(navSelector)
    if (!nav || nav === activeNav) return

    activeNav = nav

    nav.addEventListener('mouseenter', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      setExpanded(true)
    })

    nav.addEventListener('mouseleave', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => setExpanded(false), 180)
    })

    nav.addEventListener('focusin', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      setExpanded(true)
    })

    nav.addEventListener('focusout', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => setExpanded(false), 180)
    })
  }

  const init = () => {
    document.querySelectorAll('.flow-left-nav-hover-zone').forEach((node) => node.remove())
    bindNav()
    if (window.innerWidth <= 760) setExpanded(false)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(init))
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 760) setExpanded(false)
  })
}
// FLOWDESK_LEFT_NAV_SYNC_LAYOUT_BRIDGE_END

// FLOWDESK_LEFT_NAV_SYNC_LAYOUT_BRIDGE_START
if (typeof window !== 'undefined' && !window.__flowdeskLeftNavPanelSyncFinalReady) {
  window.__flowdeskLeftNavPanelSyncFinalReady = true

  const navSelector = [
    '.workspace-sidebar',
    '.app-sidebar',
    '.flow-sidebar',
    '.nav-rail',
    '.left-rail',
    '.side-nav',
    '.product-shell > aside:first-child'
  ].join(',')

  let activeNav = null
  let closeTimer = null

  const setExpanded = (expanded) => {
    if (window.innerWidth <= 760) {
      document.body.classList.remove('flow-left-nav-expanded')
      return
    }
    document.body.classList.toggle('flow-left-nav-expanded', expanded)
  }

  const bindNav = () => {
    const nav = document.querySelector(navSelector)
    if (!nav || nav === activeNav) return

    activeNav = nav
    nav.classList.add('flow-left-nav-panel')

    nav.addEventListener('mouseenter', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      setExpanded(true)
    })

    nav.addEventListener('mouseleave', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => setExpanded(false), 180)
    })

    nav.addEventListener('focusin', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      setExpanded(true)
    })

    nav.addEventListener('focusout', () => {
      if (closeTimer) window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => setExpanded(false), 180)
    })
  }

  const init = () => {
    document.querySelectorAll('.flow-left-nav-hover-zone').forEach((node) => node.remove())
    bindNav()
    if (window.innerWidth <= 760) setExpanded(false)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(init))
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 760) setExpanded(false)
    else init()
  })
}
// FLOWDESK_LEFT_NAV_SYNC_LAYOUT_BRIDGE_END


























// FLOWDESK_WORKBOARD_OUTER_WIDTH_BRIDGE_START
if (typeof window !== 'undefined' && !window.__flowdeskWorkboardOuterWidthReady) {
  window.__flowdeskWorkboardOuterWidthReady = true

  const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

  const isVisible = (element) => {
    if (!element) return false
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }

  const visibleHeadings = () => Array.from(document.querySelectorAll('h1,h2,h3,.page-title,.module-title'))
    .filter(isVisible)
    .map((node) => ({ node, text: normalize(node.textContent) }))

  const isProjectPage = () => visibleHeadings().some(({ text }) => text === '專案管理' || text.includes('PROJECT FLOW'))

  const clearMarks = () => {
    document.querySelectorAll('.flow-workboard-outer-page, .flow-workboard-outer-main, .flow-workboard-outer-stretch, .flow-workboard-current-strip').forEach((node) => {
      node.classList.remove('flow-workboard-outer-page', 'flow-workboard-outer-main', 'flow-workboard-outer-stretch', 'flow-workboard-current-strip')
    })
  }

  const markWorkboardOuterWidth = () => {
    clearMarks()
    if (isProjectPage()) return

    const heading = visibleHeadings().find(({ text }) => text === '工作看板')?.node
    if (!heading) return

    const main = heading.closest('main') || heading.closest('[role="main"]') || heading.closest('.page, .page-content, .main-content, .content, .workspace-content')
    if (main) main.classList.add('flow-workboard-outer-main')

    let current = heading.parentElement
    let best = null
    const chain = []

    while (current && current !== document.body) {
      chain.push(current)
      const text = current.textContent || ''
      const hasWorkboard = text.includes('工作看板')
      const hasItems = /\b(?:FD|TASK)-\d+\b/.test(text)
      const notProject = !text.includes('PROJECT FLOW') && !text.includes('專案管理')

      if (hasWorkboard && hasItems && notProject) best = current
      current = current.parentElement
    }

    const page = best || heading.closest('section,article,div')
    if (page) page.classList.add('flow-workboard-outer-page')

    chain.forEach((node) => {
      if (main && !main.contains(node)) return
      const text = node.textContent || ''
      if (text.includes('PROJECT FLOW') || text.includes('專案管理')) return
      node.classList.add('flow-workboard-outer-stretch')
    })

    Array.from((main || document).querySelectorAll('section, article, div')).forEach((node) => {
      const text = normalize(node.textContent)
      const rect = node.getBoundingClientRect()
      const looksCurrentStrip = /\b(?:FD|TASK)-\d+\b/.test(text) && text.includes('目前選取') && rect.width > 500 && rect.height < 150
      if (looksCurrentStrip) node.classList.add('flow-workboard-current-strip')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markWorkboardOuterWidth, { once: true })
  } else {
    markWorkboardOuterWidth()
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(markWorkboardOuterWidth))
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', markWorkboardOuterWidth)
  setTimeout(markWorkboardOuterWidth, 300)
  setTimeout(markWorkboardOuterWidth, 1200)
}
// FLOWDESK_WORKBOARD_OUTER_WIDTH_BRIDGE_END

// FLOWDESK_LEFT_NAV_SCROLLBAR_FORCE_HIDE_BRIDGE_START
if (typeof window !== 'undefined' && !window.__flowdeskLeftNavScrollbarForceHideReady) {
  window.__flowdeskLeftNavScrollbarForceHideReady = true

  const leftNavSelector = [
    '.flow-left-nav-panel',
    '.workspace-sidebar',
    '.app-sidebar',
    '.flow-sidebar',
    '.nav-rail',
    '.left-rail',
    '.side-nav',
    '.product-shell > aside:first-child'
  ].join(',')

  const markLeftNavScrollers = () => {
    document.querySelectorAll('.flow-left-nav-force-hide-scroll').forEach((node) => {
      node.classList.remove('flow-left-nav-force-hide-scroll')
    })

    const nav = document.querySelector(leftNavSelector)
    if (!nav) return

    nav.classList.add('flow-left-nav-force-hide-scroll')

    nav.querySelectorAll('*').forEach((node) => {
      const style = window.getComputedStyle(node)
      const overflowY = style.overflowY
      const canScroll = node.scrollHeight > node.clientHeight + 2
      const looksScrollable = overflowY === 'auto' || overflowY === 'scroll' || canScroll

      if (looksScrollable) node.classList.add('flow-left-nav-force-hide-scroll')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markLeftNavScrollers, { once: true })
  } else {
    markLeftNavScrollers()
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(markLeftNavScrollers))
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', markLeftNavScrollers)
  setTimeout(markLeftNavScrollers, 300)
  setTimeout(markLeftNavScrollers, 1200)
}
// FLOWDESK_LEFT_NAV_SCROLLBAR_FORCE_HIDE_BRIDGE_END
export default App




























