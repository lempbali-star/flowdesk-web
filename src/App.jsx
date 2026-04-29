import { useEffect, useMemo, useRef, useState } from 'react'
import { flowdeskCloud, hasSupabaseConfig, supabase } from './lib/supabaseClient.js'

const FLOWDESK_APP_VERSION = '20.3.31'
const FLOWDESK_VERSION_LABEL = `FlowDesk v${FLOWDESK_APP_VERSION}`
const PROJECT_PHASE_OPTIONS = ['閬?銝?, '?瘙Ⅱ隤?, '?瑁?銝?, '皜祈岫撽', '敺???, '銝?撠', '?怎楨', '撌脣???, '撌脣?瘨?]
const PROJECT_HEALTH_OPTIONS = ['蝛拙??券?, '敺Ⅱ隤?, '擃◢??, '?⊿?']
const PROJECT_PRIORITY_OPTIONS = ['蝺?, '擃?, '銝?, '雿?]
const PROJECT_SORT_OPTIONS = ['?芸???', '????', '?唳???, '?脣漲', '?迂']

function mergeOptionList(base = [], current) {
  return Array.from(new Set([...base, current].filter(Boolean)))
}

function ChineseTextField({ value = '', onCommit, multiline = false, commitOnBlur = false, ...props }) {
  const [draft, setDraft] = useState(value ?? '')
  const composingRef = useRef(false)

  useEffect(() => {
    if (!composingRef.current) setDraft(value ?? '')
  }, [value])

  const commitValue = (nextValue) => {
    if (typeof onCommit === 'function') onCommit(nextValue)
  }

  const handleChange = (event) => {
    const nextValue = event.target.value
    setDraft(nextValue)
    if (!composingRef.current && !commitOnBlur) commitValue(nextValue)
  }

  const handleCompositionStart = () => {
    composingRef.current = true
  }

  const handleCompositionEnd = (event) => {
    composingRef.current = false
    const nextValue = event.currentTarget.value
    setDraft(nextValue)
    if (!commitOnBlur) commitValue(nextValue)
  }

  const handleBlur = (event) => {
    if (commitOnBlur) commitValue(event.currentTarget.value)
    if (typeof props.onBlur === 'function') props.onBlur(event)
  }

  const Component = multiline ? 'textarea' : 'input'
  return (
    <Component
      {...props}
      value={draft}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      autoComplete={props.autoComplete || 'off'}
      spellCheck={false}
      lang="zh-Hant"
    />
  )
}

function confirmDestructiveAction(label = '??鞈?', detail = '?芷敺瘜?亙儔??) {
  if (typeof window === 'undefined') return true
  return window.confirm(`蝣箏?閬?扎?{label || '??鞈?'}??\n${detail}`)
}

function confirmResetAction(message) {
  if (typeof window === 'undefined') return true
  return window.confirm(message)
}

const initialModules = [
  { id: 'home', name: '蝮質汗', icon: 'overview' },
  { id: 'board', name: '撌乩??', icon: 'kanban' },
  { id: 'base', name: '?∟頃????, icon: 'records' },
  { id: 'desk', name: '頝脩???, icon: 'issue' },
  { id: 'roadmap', name: '撠?蝞∠?', icon: 'project' },
  { id: 'docs', name: '?辣??', icon: 'knowledge' },
  { id: 'flow', name: '瘚?閬?', icon: 'automation' },
  { id: 'insight', name: '????', icon: 'report' },
  { id: 'reminders', name: '??銝剖?', icon: 'reminders' },
  { id: 'settings', name: '蝟餌絞閮剖?', icon: 'settings' },
]


const modulePurposeMap = {
  home: { role: '蝮質汗?芸?????撘?銝?交?亦敦蝭蝺刻摩??, scope: '隞???◢?芾?????????, avoid: '銝摰?梯”??憛???雿? },
  board: { role: '撌乩???芰恣?撣詨?颲西?頝脖???, scope: '隞予閬???閬蕭鈭箝?摰??極雿?, avoid: '銝?隞?鞈潭?蝔??誨撠???蝣? },
  base: { role: '?∟頃????鞎祈??擃?瘚?蝝??, scope: '?∟頃?柴?????憿???甈整鞎刻?甇瑞???, avoid: '銝?瘥鞈潭郊撽???函?隞餃??? },
  desk: { role: '頝脩?????憿????窗??, scope: '?閬?????瘜???鞎砌犖??蝥?閬?鈭???, avoid: '銝???蝚砌??極雿??踴? },
  roadmap: { role: '撠?蝞∠??芣??畾萸?蝔??絲餈????瑟?撌乩???, scope: '撠????孵???畾萸?蝔???獢遙???脣漲??, avoid: '銝?嗆撠??蝝??? },
  docs: { role: '?辣???芣??????蝭??, scope: 'SOP??霅啁??身摰?閮虜?函??研?, avoid: '銝?亙?颲行?蝔? },
  flow: { role: '瘚?閬??芣?????閬???, scope: '?唳?????????銴?雿???, avoid: '銝撖阡?隞餃?皜?? },
  insight: { role: '?????芸?瑼Ｚ?嚗????雁霅瑯?, scope: '?∟頃?極雿?獢???蝯梯??隅?Ｕ?, avoid: '銝憓銝憟????? },
  reminders: { role: '??銝剖??芾?鞎祆?????, scope: '?暹????乓??乓?晞辣敺??????, avoid: '銝??洵鈭遙?恣?? },
  settings: { role: '蝟餌絞閮剖??芾???閫??隞質?璅∠?閮剖???, scope: '?郊???隞賡??蜓憿?蝷箝?????, avoid: '銝?亙虜撌乩??批捆?? },
}

const flowdeskFocusRules = [
  { title: '撌乩??', detail: '?暹撣詨?颲艾蕭頩支???憭抵??券脩?撠極雿? },
  { title: '?∟頃????, detail: '?暹鞈潔蜓瑼???憿???甈曇??啗疏??? },
  { title: '撠?蝞∠?', detail: '?暹?韏瑁???畾萸?蝔????孵???極雿? },
  { title: '??銝剖?', detail: '?芣?????銝???蝞∠?隞餃??祇??? },
]

const defaultModuleIcons = {
  home: '??',
  board: '??儭?,
  base: '?屁',
  desk: '?',
  roadmap: '??',
  docs: '??',
  flow: '??',
  insight: '??',
  reminders: '??',
  settings: '??',
}

const defaultBaseTableIcons = {
  '?∟頃蝝??: '?屁',
  '撱?鞈?': '?',
}

const iconOptions = ['??', '??儭?, '?屁', '?', '??', '??', '??', '??', '??', '?', '??', '?妍', '?儭?, '?', '?儭?, '?儭?, '??', '?', '??', '?', '??儭?, '?', '?', '?', '??', '??', '??', '??, '?梧?', '??', '?', '??', '?', '??', '??', '?妣', '?', '??]

const iconStyleOptions = [
  { id: 'auto', name: '頝 UI 銝駁?', description: '?? UI 銝駁????內憸冽???韏瑁??氬? },
  { id: 'soft', name: '敶抵??', description: '???∠?摨嚗???質??亙虜撌乩??啜? },
  { id: 'tech', name: '蝺?蝘?', description: '?????憭???鈭桅敶晞? },
  { id: 'minimal', name: '璆萇陛?株', description: '雿僕?整?脩頂嚗??????Ｕ? },
  { id: 'card', name: '?膜?∠?', description: '?內?∠???＊嚗?閬箸?頛暑瞏? },
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
  { id: 'blue', name: '?身??, description: '蝛拙??嗾瘛函? FlowDesk ?身?莎??拙??亙虜撌乩??啜?, accent: '#356bff' },
  { id: 'fresh', name: '??', description: '皜?漁嚗????渡??∟頃??餈質馱鈭???, accent: '#1db79d' },
  { id: 'purple', name: '蝝怨', description: '頛?蝘???霈?暺?憛????湧??柴?, accent: '#7b4dff' },
  { id: 'amber', name: '璈', description: '?????撘瘀??拙?????頝?極雿??, accent: '#f2992e' },
  { id: 'rose', name: '?怎?', description: '???內?湔?憿荔??拙?????????憭?雿輻??, accent: '#e84c72' },
  { id: 'slate', name: '?喳◢??, description: '瘝帘雿僕?橘??拙?鞈?撖??迤撘??, accent: '#475569' },
  { id: 'tech', name: '瘛望絲??, description: '瘛梯??剝??餃???靽? FlowDesk ?????, accent: '#315dff' },
  { id: 'green', name: '璉桃?', description: '蝛拚????抬??拙??瑟??炎閬?獢??∟頃鞈???, accent: '#0fa374' },
  { id: 'ice', name: '?啣???, description: '雿ˊ??脩頂嚗?Ｘ銋暹楊靽??, accent: '#38a9d6' },
]

const initialWorkItems = []

const collectionColorOptions = [
  { id: 'violet', name: '蝝怨' },
  { id: 'blue', name: '?' },
  { id: 'green', name: '蝬' },
  { id: 'amber', name: '?亦?' },
  { id: 'rose', name: '?怎' },
  { id: 'cyan', name: '瘞渲?' },
  { id: 'slate', name: '?喳◢' },
]

const collectionViewOptions = [
  { id: 'list', name: '皜閬?' },
  { id: 'card', name: '?∠?閬?' },
]

const collectionPageSizeOptions = [6, 12, 24]

const baseTables = [
  { id: 'purchase-records', name: '?∟頃蝝??, rows: 0, fields: ['撱?', '??', '?挾', '?啗疏???], color: 'violet', icon: 'purchase-record', visible: true, locked: true, order: 1, defaultView: 'list' },
  { id: 'vendors', name: '撱?鞈?', rows: 0, fields: ['憿?', '?舐窗鈭?, '??', '?餈蝜?], color: 'green', icon: 'vendor-record', visible: true, locked: true, order: 2, defaultView: 'card' },
]

const activeCollectionIds = ['purchase-records', 'vendors']

const records = []

const initialReminders = []

const reminderTypeOptions = ['?唳???', '餈質馱??', '撱?????', '蝪賣??', '?啗疏??', '蝥???', '?降??']
const reminderStatusOptions = ['敺???, '??銝?, '撌脣???, '撱嗅?']
const reminderPriorityOptions = ['擃?, '銝?, '雿?]
const reminderSourceOptions = ['銝??, '?∟頃', '撠?', '隞餃?', '鞈?皜']


const purchaseBaseRows = []

const purchaseDemoCatalog = []

function buildInitialPurchases() {
  return []
}

const initialPurchases = buildInitialPurchases()

const initialPurchaseStages = [
  { id: 'stage-1', name: '?瘙Ⅱ隤?, tone: 'blue', enabled: true, locked: true },
  { id: 'stage-2', name: '閰Ｗ銝?, tone: 'violet', enabled: true },
  { id: 'stage-3', name: '敺偷??, tone: 'amber', enabled: true },
  { id: 'stage-4', name: '撌脖???, tone: 'blue', enabled: true },
  { id: 'stage-5', name: '撌脣鞎?, tone: 'green', enabled: true },
  { id: 'stage-6', name: '撌脣???, tone: 'green', enabled: true, done: true },
  { id: 'stage-7', name: '撌脣?瘨?, tone: 'slate', enabled: false, cancel: true },
]

const stageColorOptions = [
  { tone: 'blue', label: '?' },
  { tone: 'indigo', label: '??' },
  { tone: 'violet', label: '蝝怨' },
  { tone: 'pink', label: '蝎?' },
  { tone: 'red', label: '蝝' },
  { tone: 'orange', label: '璈' },
  { tone: 'amber', label: '暺' },
  { tone: 'green', label: '蝬' },
  { tone: 'teal', label: '??' },
  { tone: 'cyan', label: '瘞渲?' },
  { tone: 'slate', label: '?啗' },
]

const purchasePageSizeOptions = [5, 10, 20, 40]
const purchasePaymentStatusOptions = ['?芯?甈?, '隢狡銝?, '撌脖?甈?]
const purchaseArrivalStatusOptions = ['?芸鞎?, '?典??啗疏', '撌脣鞎?]
const purchaseAcceptanceStatusOptions = ['?芷???, '撽銝?, '撌脤???]

const tickets = []

const projects = []

const docs = []

const rules = []

const lanes = [
  { id: '敺?憿?, title: '敺?憿? },
  { id: '撌脫?蝔?, title: '撌脫?蝔? },
  { id: '??銝?, title: '??銝? },
  { id: '蝑???', title: '蝑???' },
  { id: '撌脣???, title: '撌脣??? },
]

const toneMap = {
  敺?憿? 'blue', 撌脫?蝔? 'slate', ??銝? 'violet', 蝑???: 'amber', 撌脣??? 'green',
  擃? 'red', 蝺? 'red', 銝? 'amber', 雿? 'green', ?: 'green', ?阮: 'slate', 敺??? 'blue', 頝脖葉: 'violet', 蝑?閬? 'amber', ?⊿?: 'red', 撌脫?? 'green', 蝛拙??券? 'green', 敺?隞嗉?朣? 'red', 敺暺? 'amber',
  撌脖??? 'violet', 敺偷?? 'amber', 敺Ⅱ隤? 'blue', 撱?撅內: 'blue', 隤踵銝? 'violet', 蝑??辣: 'amber',
  ??銝? 'blue', 蝑??詨?: 'amber', 擃◢?? 'red', 銝剝◢?? 'amber', 雿◢?? 'green',
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
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return 'home'
    const saved = window.localStorage.getItem('flowdesk-active-module-v20316')
    return initialModules.some((item) => item.id === saved) ? saved : 'home'
  })
  const [query, setQuery] = useState('')
  const [view, setView] = useState('?')
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
  const [activeBaseTable, setActiveBaseTable] = useState(() => {
    if (typeof window === 'undefined') return '?∟頃蝝??
    return window.localStorage.getItem('flowdesk-active-base-table-v20316') || '?∟頃蝝??
  })
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
  const [shellCloudReady, setShellCloudReady] = useState(!flowdeskCloud)
  const shellCloudSaveTimers = useRef({})

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
        name: item.name || '?芸??????,
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
    const firstTable = visibleCollections[0]?.name || '?∟頃蝝??
    if (!visibleCollections.some((item) => item.name === activeBaseTable)) setActiveBaseTable(firstTable)
  }, [activeBaseTable, visibleCollections])

  useEffect(() => {
    let cancelled = false
    async function loadCloudWorkspaceData() {
      if (!flowdeskCloud) {
        setShellCloudReady(true)
        return
      }
      const [workResult, reminderResult, collectionResult] = await Promise.all([
        flowdeskCloud.getWorkspaceData('work_items'),
        flowdeskCloud.getWorkspaceData('reminders'),
        flowdeskCloud.getWorkspaceData('collections'),
      ])
      if (cancelled) return
      if (Array.isArray(workResult.data)) setWorkItems(workResult.data)
      if (Array.isArray(reminderResult.data)) setReminders(reminderResult.data)
      if (Array.isArray(collectionResult.data) && collectionResult.data.length) setCollections(collectionResult.data)
      setShellCloudReady(true)
    }
    loadCloudWorkspaceData()
    return () => {
      cancelled = true
      Object.values(shellCloudSaveTimers.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  function queueShellCloudSave(dataKey, payload) {
    if (!shellCloudReady || !flowdeskCloud) return
    clearTimeout(shellCloudSaveTimers.current[dataKey])
    shellCloudSaveTimers.current[dataKey] = window.setTimeout(() => {
      flowdeskCloud.setWorkspaceData(dataKey, payload)
        .then(() => window.localStorage.setItem('flowdesk-last-cloud-sync', new Date().toLocaleString('zh-TW', { hour12: false })))
        .catch(() => null)
    }, 600)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-work-items-v196', JSON.stringify(workItems))
    queueShellCloudSave('work_items', workItems)
  }, [workItems, shellCloudReady])

  useEffect(() => {
    if (!workItems.length) {
      if (selected) setSelected(null)
      return
    }
    if (!selected || !workItems.some((item) => item.id === selected.id)) {
      setSelected(workItems[0])
    }
  }, [selected, workItems])

  function getNextWorkItemId(current = workItems) {
    const maxNumber = current.reduce((max, item) => {
      const matched = String(item.id || '').match(/TASK-(\d+)/)
      return matched ? Math.max(max, Number(matched[1])) : max
    }, 0)
    return `TASK-${String(maxNumber + 1).padStart(3, '0')}`
  }

  function addWorkItem() {
    const now = new Date()
    const nextItem = {
      id: getNextWorkItemId(),
      title: '?芸?極雿?,
      type: '銝?砍極雿?,
      lane: '敺?憿?,
      priority: '銝?,
      channel: '???啣?',
      relation: '?芾身摰?,
      requester: 'Kyle',
      owner: 'Kyle',
      due: now.toISOString().slice(0, 10),
      health: 100,
      note: '',
      tags: [],
    }
    setWorkItems((current) => [nextItem, ...current])
    setSelected(nextItem)
    setView('?')
  }

  function updateWorkItem(itemId, patch) {
    setWorkItems((current) => current.map((item) => {
      if (item.id !== itemId) return item
      const next = { ...item, ...patch }
      setSelected(next)
      return next
    }))
  }

  function duplicateWorkItem(itemId) {
    setWorkItems((current) => {
      const target = current.find((item) => item.id === itemId)
      if (!target) return current
      const next = {
        ...target,
        id: getNextWorkItemId(current),
        title: `${target.title || '?芸?極雿?} 銴`,
        lane: '敺?憿?,
      }
      setSelected(next)
      setView('?')
      return [next, ...current]
    })
  }

  function deleteWorkItem(itemId) {
    const target = workItems.find((item) => item.id === itemId)
    if (!confirmDestructiveAction(target?.title || itemId || '撌乩??')) return
    setWorkItems((current) => {
      const next = current.filter((item) => item.id !== itemId)
      setSelected(next[0] || null)
      return next
    })
  }

  function createWorkItemFromSource(payload = {}) {
    const nextItem = {
      id: getNextWorkItemId(),
      title: payload.title || '?芸?極雿?,
      type: payload.type || '銝?砍極雿?,
      lane: payload.lane || '敺?憿?,
      priority: payload.priority || '銝?,
      channel: payload.channel || '???啣?',
      relation: payload.relation || '?芾身摰?,
      requester: payload.requester || 'Kyle',
      owner: payload.owner || 'Kyle',
      due: payload.due || todayDate(),
      health: Number.isFinite(Number(payload.health)) ? Number(payload.health) : 85,
      note: payload.note || '',
      tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
    }
    setWorkItems((current) => {
      const duplicate = current.find((item) => item.relation === nextItem.relation && item.type === nextItem.type && item.channel === nextItem.channel)
      if (duplicate && nextItem.relation !== '?芾身摰?) {
        setSelected(duplicate)
        return current
      }
      return [nextItem, ...current]
    })
    setSelected(nextItem)
    return nextItem
  }

  function createReminderFromSource(payload = {}) {
    const nextReminder = {
      id: `REM-${String(Date.now()).slice(-5)}`,
      title: payload.title || '?芸????,
      type: payload.type || '餈質馱??',
      priority: payload.priority || '銝?,
      status: payload.status || '敺???,
      dueDate: payload.dueDate || addDaysDate(3),
      sourceType: payload.sourceType || '銝??,
      sourceTitle: payload.sourceTitle || '',
      note: payload.note || '',
    }
    setReminders((current) => {
      const duplicate = current.find((item) => item.status !== '撌脣??? && item.title === nextReminder.title && item.sourceTitle === nextReminder.sourceTitle)
      return duplicate ? current : [nextReminder, ...current]
    })
    return nextReminder
  }

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return workItems
    return workItems.filter((item) => [item.id, item.title, item.type, item.channel, item.relation, item.owner, item.note, ...(Array.isArray(item.tags) ? item.tags : [])].join(' ').toLowerCase().includes(keyword))
  }, [query, workItems])

  const metrics = useMemo(() => {
    const open = workItems.filter((item) => item.lane !== '撌脣???).length
    const waiting = workItems.filter((item) => item.lane === '蝑???').length
    const urgent = workItems.filter((item) => item.priority === '蝺? || item.priority === '擃?).length
    const pulse = workItems.length ? Math.round(workItems.reduce((sum, item) => sum + item.health, 0) / workItems.length) : 100
    const spend = initialPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
    const reminderOpen = reminders.filter((item) => item.status !== '撌脣???).length
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
    window.localStorage.setItem('flowdesk-active-module-v20316', active)
  }, [active])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-active-base-table-v20316', activeBaseTable)
  }, [activeBaseTable])


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
    queueShellCloudSave('reminders', reminders)
  }, [reminders, shellCloudReady])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-collections-v194', JSON.stringify(collections))
    queueShellCloudSave('collections', collections)
  }, [collections, shellCloudReady])

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
      <aside className="workspace-sidebar" aria-label="?湧??詨" onMouseEnter={() => setSidebarOpen(true)} onMouseLeave={() => setSidebarOpen(false)}>
        <div className="workspace-card">
          <div className="brand-mark">F</div>
          <div className="sidebar-copy">
            <strong>FlowDesk</strong>
            <small>{FLOWDESK_VERSION_LABEL}</small>
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
              title={`${item.name}嚗???嚗}
            >
              <span className="module-icon" aria-hidden="true">{moduleIcons[item.id] || defaultModuleIcons[item.id] || "??}</span>
              <strong>{item.name}</strong>
              <i className="drag-dot" aria-hidden="true"><span /><span /><span /></i>
            </button>
          ))}
        </nav>

        <div className="mini-dashboard">
          <div className="mini-dashboard-top">
            <span>?亙熒摨?/span>
            <strong>{metrics.pulse}%</strong>
          </div>
          <div className="pulse-bar"><span style={{ width: `${metrics.pulse}%` }} /></div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className={`app-topbar ${active === 'base' ? 'app-topbar-with-collections' : ''}`}>
          <div className="topbar-title">
            <p className="eyebrow">隞撌乩????/p>
            <h1>{pageTitle(active, modules)}</h1>
            <div className="topbar-status-row">
              <span className="version-pill">{FLOWDESK_VERSION_LABEL}</span>
              <span className={flowdeskCloud ? 'sync-state-pill online' : 'sync-state-pill local'}>{flowdeskCloud ? '?脩垢?郊銝? : '?祆??璅∪?'}</span>
            </div>
            <div className="module-purpose-line">
              <span>{modulePurposeMap[active]?.role || '蝬剜??桐??券??踹??????}</span>
            </div>
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
              <span>??/span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="??隞餃??鞈潦?獢?隞?.." />
            </label>
            <button className="ghost-btn" type="button" onClick={onLogout}>?餃</button>
            <button className="ghost-btn" type="button">?隢???/button>
            <button className="primary-btn" type="button" onClick={() => setShowLauncher(true)}>?啣?</button>
          </div>
        </header>

        <ModuleScopeBar active={active} />

        {active === 'home' && <HomePage metrics={metrics} items={filteredItems} reminders={reminders} setActive={setActive} setSelected={setSelected} />}
        {active === 'board' && <BoardPage items={filteredItems} view={view} setView={setView} selected={selected} setSelected={setSelected} onAddItem={addWorkItem} onUpdateItem={updateWorkItem} onDeleteItem={deleteWorkItem} onDuplicateItem={duplicateWorkItem} />}
        {active === 'base' && <BasePage tables={visibleCollections} records={records} activeTable={activeBaseTable} onCreateWorkItem={createWorkItemFromSource} onCreateReminder={createReminderFromSource} />}
        {active === 'desk' && <DeskPage tickets={tickets} />}
        {active === 'roadmap' && <RoadmapPage projects={projects} onCreateWorkItem={createWorkItemFromSource} />}
        {active === 'docs' && <DocsPage docs={docs} />}
        {active === 'flow' && <FlowPage rules={rules} />}
        {active === 'insight' && <InsightPage metrics={metrics} records={records} tickets={tickets} />}
        {active === 'reminders' && <RemindersPage reminders={reminders} setReminders={setReminders} onNavigateSource={(item) => {
          const sourceType = item?.sourceType || ''
          if (sourceType.includes('?∟頃')) {
            setActiveBaseTable('?∟頃蝝??)
            setActive('base')
          } else if (sourceType.includes('撠?')) {
            setActive('roadmap')
          } else if (sourceType.includes('隞餃?')) {
            setActive('desk')
          } else {
            setActive('board')
          }
        }} />}
        {active === 'settings' && <SettingsPage themeOptions={themeOptions} uiTheme={uiTheme} setUiTheme={setUiTheme} iconStyleMode={iconStyleMode} setIconStyleMode={setIconStyleMode} resolvedIconStyle={resolvedIconStyle} modules={modules} collections={visibleCollections} setCollections={setCollections} moduleIcons={moduleIcons} setModuleIcons={setModuleIcons} baseTableIcons={baseTableIcons} setBaseTableIcons={setBaseTableIcons} setReminders={setReminders} />}
      </main>

      {active === 'board' && (
        <aside className="context-panel">
          <ContextPanel selected={selected} onUpdateItem={updateWorkItem} onDeleteItem={deleteWorkItem} onDuplicateItem={duplicateWorkItem} />
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
    if (signInError) setError('撣唾???蝣潔?甇?Ⅱ')
    setBusy(false)
  }

  return (
    <div className="flowdesk-login-page">
      <form className="flowdesk-login-card" onSubmit={handleSubmit}>
        <div className="flowdesk-login-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FlowDesk</strong>
            <span>?餃</span>
          </div>
        </div>

        {mode === 'checking' ? (
          <div className="flowdesk-login-status">撽?銝?..</div>
        ) : configMissing ? (
          <div className="flowdesk-login-error">?餃??撠閮剖?</div>
        ) : (
          <>
            <label>
              <span>Email</span>
              <input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              <span>撖Ⅳ</span>
              <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error && <div className="flowdesk-login-error">{error}</div>}
            <button className="primary-btn" type="submit" disabled={busy}>{busy ? '?餃銝?..' : '?餃'}</button>
          </>
        )}
      </form>
    </div>
  )
}

function BaseCollectionSwitcher({ tables, activeTable, setActiveTable, baseTableIcons }) {
  return (
    <nav className="topbar-collection-switcher" aria-label="蝝??憿?>
      {tables.map((table) => (
        <button key={table.name} className={activeTable === table.name ? 'base-table active' : 'base-table'} type="button" onClick={() => setActiveTable(table.name)} title={table.name}>
          <span className={`table-icon ${table.color}`} aria-hidden="true">{baseTableIcons?.[table.id] || baseTableIcons?.[table.name] || defaultBaseTableIcons[table.name] || table.icon || "??"}</span>
          <div><strong>{table.name}</strong><small>{table.rows} 蝑???/small></div>
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
  const [homeData, setHomeData] = useState(() => ({
    purchases: readFlowdeskLocalArray('flowdesk-purchases-v19'),
    projects: readFlowdeskLocalArray('flowdesk-projects-v1972'),
    tasks: readFlowdeskLocalArray('flowdesk-tasks-v1972'),
  }))
  const [homeCloudLoading, setHomeCloudLoading] = useState(Boolean(flowdeskCloud))

  useEffect(() => {
    let cancelled = false
    async function loadHomeCloudData() {
      if (!flowdeskCloud) {
        setHomeCloudLoading(false)
        return
      }
      setHomeCloudLoading(true)
      const [purchaseResult, projectResult, taskResult] = await Promise.all([
        flowdeskCloud.getWorkspaceData('purchases'),
        flowdeskCloud.getWorkspaceData('projects'),
        flowdeskCloud.getWorkspaceData('tasks'),
      ])
      if (cancelled) return
      setHomeData({
        purchases: Array.isArray(purchaseResult.data) ? purchaseResult.data : readFlowdeskLocalArray('flowdesk-purchases-v19'),
        projects: Array.isArray(projectResult.data) ? projectResult.data : readFlowdeskLocalArray('flowdesk-projects-v1972'),
        tasks: Array.isArray(taskResult.data) ? taskResult.data : readFlowdeskLocalArray('flowdesk-tasks-v1972'),
      })
      setHomeCloudLoading(false)
    }
    loadHomeCloudData().catch(() => {
      if (cancelled) return
      setHomeData({
        purchases: readFlowdeskLocalArray('flowdesk-purchases-v19'),
        projects: readFlowdeskLocalArray('flowdesk-projects-v1972'),
        tasks: readFlowdeskLocalArray('flowdesk-tasks-v1972'),
      })
      setHomeCloudLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const purchases = Array.isArray(homeData.purchases) ? homeData.purchases : []
  const projects = Array.isArray(homeData.projects) ? homeData.projects : []
  const taskRows = Array.isArray(homeData.tasks) ? homeData.tasks : []
  const workItems = Array.isArray(items) ? items : []
  const today = todayDate()
  const reminderSummary = getReminderSummary(reminders)
  const openReminders = reminders.filter((item) => item.status !== '撌脣???)
  const purchaseTotal = purchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const purchaseOpen = purchases.filter((row) => !['撌脣???, '撌脣?瘨?].includes(row.status || '')).length
  const purchaseWaitingQuote = purchases.filter((row) => String(row.status || '').includes('閰Ｗ') || String(row.status || '').includes('?勗')).length
  const purchaseNotArrived = purchases.filter((row) => (row.arrivalStatus || '?芸鞎?) !== '撌脣鞎? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')).length
  const purchaseUnpaid = purchases.filter((row) => (row.paymentStatus || '?芯?甈?) !== '撌脖?甈? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')).length
  const projectActive = projects.filter((project) => !['撌脣???, '摰?', '撌脣?瘨?].some((done) => String(project.phase || '').includes(done))).length
  const projectRisk = projects.filter((project) => String(project.health || '').includes('憸券') || String(project.health || '').includes('?⊿?') || project.tone === 'red').length
  const projectAvgProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0
  const taskOpen = taskRows.filter((task) => !['撌脣???, '摰?'].includes(task.status || '')).length
  const taskBlocked = taskRows.filter((task) => ['蝑?閬?, '?⊿?', '蝑???'].includes(task.status || task.lane || '')).length
  const overdueWork = workItems.filter((item) => item.lane !== '撌脣??? && item.due && item.due < today).length
  const todayDueWork = workItems.filter((item) => item.lane !== '撌脣??? && item.due === today).length
  const waitingWork = workItems.filter((item) => ['蝑???', '蝑?閬?, '?⊿?'].includes(item.lane || item.status || '')).length
  const riskTotal = overdueWork + reminderSummary.overdue + projectRisk + taskBlocked + waitingWork
  const operationScore = Math.max(0, Math.min(100, 100 - overdueWork * 8 - reminderSummary.overdue * 8 - projectRisk * 7 - taskBlocked * 5 - purchaseNotArrived * 3 - purchaseUnpaid * 2))
  const operationTone = operationScore >= 85 ? 'green' : operationScore >= 70 ? 'blue' : operationScore >= 55 ? 'amber' : 'red'
  const operationSignals = [
    { title: '?暹? / 隞?唳?', value: overdueWork + todayDueWork + reminderSummary.overdue + reminderSummary.today, note: '????憭抵????歇?暹??', tone: overdueWork + reminderSummary.overdue ? 'red' : 'blue', target: 'reminders' },
    { title: '?∟頃?餃?', value: purchaseWaitingQuote + purchaseNotArrived + purchaseUnpaid, note: '?勗?鞎具?甈曄???餈質馱', tone: purchaseNotArrived || purchaseUnpaid ? 'amber' : 'green', target: 'base' },
    { title: '撠?憸券', value: projectRisk, note: '憸券???獢?蝣箄?銝?甇?, tone: projectRisk ? 'red' : 'green', target: 'roadmap' },
    { title: '蝑???', value: waitingWork + taskBlocked, note: '蝑?撱???隞?銝餌恣??', tone: waitingWork + taskBlocked ? 'violet' : 'green', target: 'board' },
  ]
  const dataHealthRows = [
    { label: '撌乩?鞈?', count: workItems.length + taskRows.length, meta: `${workItems.length} ? / ${taskRows.length} 隞餃?`, target: 'board' },
    { label: '?∟頃鞈?', count: purchases.length, meta: `${purchaseOpen} ?芸???/ ${formatMoney(purchaseTotal)}`, target: 'base' },
    { label: '撠?鞈?', count: projects.length, meta: `${projectActive} ?脰?銝?/ 撟喳? ${projectAvgProgress}%`, target: 'roadmap' },
    { label: '??鞈?', count: reminders.length, meta: `${reminderSummary.open} ?芰? / ${reminderSummary.week} ?祇常, target: 'reminders' },
  ]
  const briefingRows = [
    `??? ${operationScore}嚗??{riskTotal ? `??${riskTotal} ?◢?芾?? : '瘝??＊憸券閮?'}?,
    purchaseOpen ? `?∟頃撠? ${purchaseOpen} 蝑摰?嚗銝?${purchaseNotArrived} 蝑?啗疏??{purchaseUnpaid} 蝑隞狡? : '?∟頃?桀?瘝??芸????柴?,
    projectRisk ? `撠???${projectRisk} 蝑◢?芣??⊿?嚗遣霅啣?蝣箄?鞎砌遙鈭箄?銝?甇乓 : `撠?撟喳??脣漲 ${projectAvgProgress}%嚗??＊憸券?,
    reminderSummary.open ? `??銝剖???${reminderSummary.open} 蝑蝯?隞 ${reminderSummary.today} 蝑??祇?${reminderSummary.week} 蝑 : '??銝剖??桀?瘝??芰?鈭???,
  ]
  const focusItems = workItems
    .filter((item) => item.lane !== '撌脣???)
    .slice()
    .sort((a, b) => {
      const priorityScore = (row) => row.priority === '蝺? ? 0 : row.priority === '擃? ? 1 : row.priority === '銝? ? 2 : 3
      return priorityScore(a) - priorityScore(b) || String(a.due || '9999-12-31').localeCompare(String(b.due || '9999-12-31'))
    })
    .slice(0, 5)
  const purchaseFocus = purchases
    .map((row) => {
      const actions = []
      if ((row.arrivalStatus || '?芸鞎?) !== '撌脣鞎? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')) actions.push('?啗疏')
      if ((row.paymentStatus || '?芯?甈?) !== '撌脖?甈? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')) actions.push('隞狡')
      if ((row.acceptanceStatus || '?芷???) !== '撌脤??? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')) actions.push('撽')
      if (String(row.status || '').includes('閰Ｗ') || String(row.status || '').includes('?勗')) actions.push('?勗')
      return { row, actions, amount: calculatePurchase(row).taxedTotal }
    })
    .filter((item) => item.actions.length)
    .sort((a, b) => b.actions.length - a.actions.length || b.amount - a.amount)
    .slice(0, 5)
  const projectFocus = projects
    .filter((project) => Number(project.progress || 0) < 100)
    .slice()
    .sort((a, b) => {
      const riskA = String(a.health || '').includes('憸券') || String(a.health || '').includes('?⊿?') || a.tone === 'red' ? 0 : 1
      const riskB = String(b.health || '').includes('憸券') || String(b.health || '').includes('?⊿?') || b.tone === 'red' ? 0 : 1
      return riskA - riskB || String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31'))
    })
    .slice(0, 4)
  const reminderFocus = openReminders
    .slice()
    .sort((a, b) => String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31')))
    .slice(0, 4)
  const priorityRows = [
    ...focusItems.map((item) => ({
      id: `work-${item.id}`,
      label: '撌乩?',
      title: item.title || '?芸?極雿?,
      subtitle: `${item.lane || '敺?憿?} 繚 ${item.owner || '?芣?摰?} 繚 ${item.due || '?芾身摰??}`,
      badge: item.priority || '銝?,
      target: 'board',
      raw: item,
      score: item.priority === '蝺? ? 90 : item.priority === '擃? ? 75 : 45,
    })),
    ...purchaseFocus.map(({ row, actions, amount }) => ({
      id: `purchase-${row.id}`,
      label: '?∟頃',
      title: purchaseTitle(row),
      subtitle: `${row.vendor || '?芣?摰???} 繚 ${actions.join(' / ')} 繚 ${formatMoney(amount)}`,
      badge: row.status || '敺Ⅱ隤?,
      target: 'base',
      score: 60 + actions.length * 8 + Math.min(20, Math.round(amount / 50000)),
    })),
    ...projectFocus.map((project) => ({
      id: `project-${project.id}`,
      label: '撠?',
      title: project.name || '?芸??獢?,
      subtitle: `${project.phase || '?芾身摰?畾?} 繚 ${project.owner || '?芣?摰?} 繚 ${project.endDate || '?芾身摰??}`,
      badge: project.health || `${Number(project.progress || 0)}%`,
      target: 'roadmap',
      score: String(project.health || '').includes('憸券') || String(project.health || '').includes('?⊿?') ? 82 : 50,
    })),
    ...reminderFocus.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      label: '??',
      title: reminder.title || '?芸????,
      subtitle: `${reminder.type || '??'} 繚 ${reminder.dueDate || '?芾身摰??}`,
      badge: reminder.priority || '銝?,
      target: 'reminders',
      score: reminder.priority === '擃? ? 78 : 48,
    })),
  ].sort((a, b) => b.score - a.score).slice(0, 8)

  function jumpToPriority(row) {
    if (row.target === 'board' && row.raw) setSelected(row.raw)
    setActive(row.target)
  }

  function exportHomeBriefing() {
    const payload = {
      exportedAt: new Date().toISOString(),
      score: operationScore,
      signals: operationSignals,
      dataHealth: dataHealthRows,
      briefing: briefingRows,
      priorityRows: priorityRows.map((row) => ({ label: row.label, title: row.title, subtitle: row.subtitle, badge: row.badge })),
    }
    downloadFlowdeskText(`flowdesk_home_briefing_${todayDate()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  return (
    <div className="home-layout home-cloud-dashboard">
      <section className="command-hero compact-hero home-command-center">
        <div>
          <p className="eyebrow hero-eyebrow">隞?阡?</p>
          <h2>?脩垢撌乩?蝮質汗</h2>
          <div className="hero-actions">
            <button type="button" onClick={() => setActive('board')}>撌乩??</button>
            <button type="button" onClick={() => setActive('base')}>?∟頃????/button>
            <button type="button" onClick={() => setActive('roadmap')}>撠?蝞∠?</button>
          </div>
        </div>
        <div className="hero-metrics home-hero-metrics-grid">
          <Metric label="?芸??極雿? value={metrics.open} tone="blue" />
          <Metric label="?暹?撌乩?" value={overdueWork} tone="red" />
          <Metric label="敺??鞈? value={purchaseOpen} tone="amber" />
        </div>
      </section>

      <section className="flowdesk-focus-rules">
        {flowdeskFocusRules.map((rule) => (
          <article key={rule.title}>
            <strong>{rule.title}</strong>
            <span>{rule.detail}</span>
          </article>
        ))}
      </section>

      <section className="metric-strip home-cloud-kpis">
        <Metric label="隞?唳?" value={todayDueWork} tone="violet" />
        <Metric label="隞餃??芰?" value={taskOpen} tone="blue" />
        <Metric label="撠??脰?" value={projectActive} tone="green" />
        <Metric label="撠?憸券" value={projectRisk} tone="red" />
        <Metric label="?∟頃蝮賡?" value={formatMoney(purchaseTotal)} tone="green" />
      </section>

      <section className="panel wide home-executive-briefing">
        <div className="home-executive-head">
          <div>
            <p className="eyebrow">OPERATION BRIEFING</p>
            <h3>隞???</h3>
          </div>
          <button className="ghost-btn" type="button" onClick={exportHomeBriefing}>?臬??</button>
        </div>
        <div className="home-executive-grid">
          <article className={`home-score-card ${operationTone}`}>
            <span>???</span>
            <strong>{operationScore}</strong>
            <small>{riskTotal ? `?桀???${riskTotal} ?◢?芾?? : '?桀???帘摰?}</small>
          </article>
          <div className="home-signal-grid">
            {operationSignals.map((signal) => (
              <button key={signal.title} type="button" className={`home-signal-card ${signal.tone}`} onClick={() => setActive(signal.target)}>
                <span>{signal.title}</span>
                <strong>{signal.value}</strong>
                <small>{signal.note}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="home-briefing-lines">
          {briefingRows.map((line) => <p key={line}>{line}</p>)}
        </div>
      </section>

      <section className="panel wide home-data-health">
        <PanelTitle eyebrow="DATA HEALTH" title="鞈??亙熒瑼Ｘ" action={homeCloudLoading ? '?郊銝? : '?脩垢 / ?祆?撌脰???} />
        <div className="home-data-health-grid">
          {dataHealthRows.map((row) => (
            <button key={row.label} type="button" onClick={() => setActive(row.target)}>
              <span>{row.label}</span>
              <strong>{row.count}</strong>
              <small>{row.meta}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel wide home-priority-panel">
        <PanelTitle eyebrow="?游?敺齒" title="銝?甇亙??" action={homeCloudLoading ? '?郊銝? : '撌脣?甇?} />
        <div className="home-priority-list">
          {priorityRows.length ? priorityRows.map((row) => (
            <button key={row.id} className="home-priority-row" type="button" onClick={() => jumpToPriority(row)}>
              <span>{row.label}</span>
              <div>
                <strong>{row.title}</strong>
                <small>{row.subtitle}</small>
              </div>
              <Badge value={row.badge} />
            </button>
          )) : <EmptyState title="?桀?瘝?敺??暺? action="?啣?撌乩??鞈澆?嚗ㄐ????港?銝甇乓? />}
        </div>
      </section>

      <section className="panel wide purchase-home home-live-panel">
        <PanelTitle eyebrow="?∟頃??" title="?∟頃瘚?蝮質汗" action="蝝?葉敹? />
        <div className="purchase-home-grid">
          <article><span>?∟頃蝮賡?</span><strong>{formatMoney(purchaseTotal)}</strong></article>
          <article><span>閰Ｗ / ?勗</span><strong>{purchaseWaitingQuote}</strong></article>
          <article><span>?芸鞎?/span><strong>{purchaseNotArrived}</strong></article>
          <article><span>?芯?甈?/span><strong>{purchaseUnpaid}</strong></article>
        </div>
        <div className="purchase-home-list">
          {purchases.length ? purchases.slice(0, 5).map((row) => (
            <button key={row.id} type="button" onClick={() => setActive('base')}>
              <div><strong>{purchaseTitle(row)}</strong><small>{row.department || '?芣?摰雿?} 繚 {row.vendor || '?芣?摰???} 繚 {getPurchaseItems(row).length} ??/small></div>
              <Badge value={row.status || '敺Ⅱ隤?} />
            </button>
          )) : <EmptyState title="撠?∟頃鞈?" action="?脣蝝?葉敹憓鞈澆?嚗蜇閬賣??單?敶?? />}
        </div>
      </section>

      <section className="panel wide home-project-panel">
        <PanelTitle eyebrow="撠??券? title="撠?蝞∠???" action="撠?蝞∠?" />
        <div className="home-project-summary">
          <article><span>撠???/span><strong>{projects.length}</strong></article>
          <article><span>?脰?銝?/span><strong>{projectActive}</strong></article>
          <article><span>撟喳??脣漲</span><strong>{projectAvgProgress}%</strong></article>
          <article><span>憸券</span><strong>{projectRisk}</strong></article>
        </div>
        <div className="home-project-list">
          {projectFocus.length ? projectFocus.map((project) => (
            <button key={project.id} type="button" onClick={() => setActive('roadmap')}>
              <div>
                <strong>{project.name || '?芸??獢?}</strong>
                <small>{project.phase || '?芾身摰?畾?} 繚 {project.owner || '?芣?摰?} 繚 {project.endDate || '?芾身摰??}</small>
                <i><em style={{ width: `${Math.max(0, Math.min(100, Number(project.progress || 0)))}%` }} /></i>
              </div>
              <Badge value={project.health || `${Number(project.progress || 0)}%`} />
            </button>
          )) : <EmptyState title="撠?脰?銝剖?獢? action="撱箇?撠?敺??ㄐ?＊蝷粹脣漲?◢?芥? />}
        </div>
      </section>

      <section className="panel wide reminder-home-panel">
        <PanelTitle eyebrow="??銝剖?" title="隞??望??? action="??鈭?" />
        <div className="reminder-home-grid">
          <article className="danger"><span>?暹?</span><strong>{reminderSummary.overdue}</strong></article>
          <article><span>隞</span><strong>{reminderSummary.today}</strong></article>
          <article><span>?祇?/span><strong>{reminderSummary.week}</strong></article>
          <article><span>?芰?</span><strong>{reminderSummary.open}</strong></article>
        </div>
        <div className="reminder-home-list">
          {reminderFocus.length ? reminderFocus.map((item) => {
            const due = getReminderDueInfo(item.dueDate)
            return (
              <button key={item.id} type="button" onClick={() => setActive('reminders')}>
                <div><strong>{item.title}</strong><small>{item.sourceType} 繚 {item.type} 繚 {due.label}</small></div>
                <Badge value={item.priority} />
              </button>
            )
          }) : <EmptyState title="?桀?瘝??芰???" action="?啣???敺??箇?券ㄐ?? />}
        </div>
      </section>

      <section className="panel">
        <PanelTitle eyebrow="敹恍?? title="撣貊閬?" />
        <div className="view-launchers view-launchers-min">
          <button type="button" onClick={() => setActive('board')}><span><Icon name="kanban" /></span><strong>撌乩??</strong></button>
          <button type="button" onClick={() => setActive('base')}><span><Icon name="records" /></span><strong>蝝?葉敹?/strong></button>
          <button type="button" onClick={() => setActive('roadmap')}><span><Icon name="project" /></span><strong>撠?蝞∠?</strong></button>
          <button type="button" onClick={() => setActive('insight')}><span><Icon name="report" /></span><strong>????</strong></button>
          <button type="button" onClick={() => setActive('reminders')}><span>??</span><strong>??銝剖?</strong></button>
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle eyebrow="餈???" title="撌乩????" />
        <div className="pulse-feed">
          {workItems.length ? workItems.slice(0, 10).map((item) => (
            <article key={item.id} className="pulse-item">
              <span className={`dot ${toneMap[item.lane] || 'blue'}`} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.type} 繚 {item.owner} 繚 {item.note}</small>
              </div>
              <Badge value={item.priority} />
            </article>
          )) : <EmptyState title="撠撌乩???" action="?啣?撌乩?敺?餈?????＊蝷箝? />}
        </div>
      </section>
    </div>
  )
}

function EmptyState({ title, action }) {
  return (
    <div className="home-empty-state">
      <strong>{title}</strong>
      {action ? <small>{action}</small> : null}
    </div>
  )
}

function BoardPage({ items, view, setView, selected, setSelected, onAddItem, onUpdateItem, onDeleteItem, onDuplicateItem }) {
  const [laneFilter, setLaneFilter] = useState('?券')
  const [priorityFilter, setPriorityFilter] = useState('?券')
  const [ownerFilter, setOwnerFilter] = useState('?券')
  const [sortMode, setSortMode] = useState('?唳???)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLane, setBulkLane] = useState('??銝?)
  const [bulkPriority, setBulkPriority] = useState('銝?)
  const [bulkOwner, setBulkOwner] = useState('Kyle')
  const [hideDone, setHideDone] = useState(false)
  const ownerOptions = useMemo(() => ['?券', ...Array.from(new Set(items.map((item) => item.owner).filter(Boolean)))], [items])
  const scopedItems = useMemo(() => {
    const next = items
      .filter((item) => !hideDone || item.lane !== '撌脣???)
      .filter((item) => laneFilter === '?券' || item.lane === laneFilter)
      .filter((item) => priorityFilter === '?券' || item.priority === priorityFilter)
      .filter((item) => ownerFilter === '?券' || item.owner === ownerFilter)
      .slice()
    next.sort((a, b) => {
      if (sortMode === '?亙熒摨?) return Number(a.health || 0) - Number(b.health || 0)
      if (sortMode === '?芸?蝝?) {
        const order = { 蝺? 0, 擃? 1, 銝? 2, 雿? 3 }
        return (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
      }
      return String(a.due || '').localeCompare(String(b.due || ''))
    })
    return next
  }, [items, laneFilter, priorityFilter, ownerFilter, sortMode, hideDone])
  const boardSummary = useMemo(() => ({
    total: items.length,
    open: items.filter((item) => item.lane !== '撌脣???).length,
    waiting: items.filter((item) => item.lane === '蝑???').length,
    urgent: items.filter((item) => ['蝺?, '擃?].includes(item.priority)).length,
  }), [items])
  const focusRows = useMemo(() => {
    const today = todayDate()
    return [
      { id: 'today', label: '隞?唳?', count: items.filter((item) => item.due === today && item.lane !== '撌脣???).length, action: () => { setLaneFilter('?券'); setPriorityFilter('?券'); setOwnerFilter('?券'); setSortMode('?唳???); setHideDone(true) } },
      { id: 'waiting', label: '蝑???', count: items.filter((item) => item.lane === '蝑???').length, action: () => { setLaneFilter('蝑???'); setPriorityFilter('?券'); setOwnerFilter('?券'); setHideDone(false) } },
      { id: 'urgent', label: '擃??, count: items.filter((item) => ['蝺?, '擃?].includes(item.priority)).length, action: () => { setLaneFilter('?券'); setPriorityFilter('擃?); setOwnerFilter('?券'); setHideDone(false) } },
      { id: 'done', label: hideDone ? '憿舐內撌脣??? : '?嗅?撌脣???, count: items.filter((item) => item.lane === '撌脣???).length, action: () => setHideDone((value) => !value) },
    ]
  }, [items, hideDone])

  function toggleSelectedId(itemId) {
    setSelectedIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])
  }

  function clearBoardSelection() {
    setSelectedIds([])
  }

  function selectScopedItems() {
    setSelectedIds(scopedItems.map((item) => item.id))
  }

  function applyBulkPatch(patch) {
    if (!selectedIds.length) return
    selectedIds.forEach((id) => onUpdateItem(id, patch))
    clearBoardSelection()
  }

  function exportBoardCsv() {
    const headers = ['蝺刻?', '璅?', '???, '?芸?蝝?, '鞎痊鈭?, '?唳???, '靘?', '?', '?亙熒摨?, '?酉']
    const rows = scopedItems.map((item) => [item.id, item.title, item.lane, item.priority, item.owner, item.due, item.channel, item.relation, item.health, item.note])
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    downloadFlowdeskText(`FlowDesk撌乩??_${todayDate()}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8;')
  }

  function clearBoardFilters() {
    setLaneFilter('?券')
    setPriorityFilter('?券')
    setOwnerFilter('?券')
    setSortMode('?唳???)
    setHideDone(false)
    clearBoardSelection()
  }

  return (
    <div className="page-stack board-page board-page-v198">
      <section className="surface-toolbar board-toolbar">
        <div>
          <p className="eyebrow">撌乩?蝞∠?</p>
          <h2>撌乩??</h2>
        </div>
        <div className="board-toolbar-actions">
          <div className="segmented board-view-switch">
            {['?', '銵冽', '?∠?'].map((name) => (
              <button key={name} className={view === name ? 'active' : ''} type="button" onClick={() => setView(name)}>{name}</button>
            ))}
          </div>
          <button className="primary-btn board-add-btn" type="button" onClick={onAddItem}>?啣?撌乩?</button>
        </div>
      </section>

      <section className="board-control-center">
        <div className="board-control-metrics">
          <article><span>蝮賢極雿?/span><strong>{boardSummary.total}</strong></article>
          <article><span>?芸???/span><strong>{boardSummary.open}</strong></article>
          <article><span>蝑???</span><strong>{boardSummary.waiting}</strong></article>
          <article><span>擃??/span><strong>{boardSummary.urgent}</strong></article>
        </div>
        <div className="board-filter-grid">
          <label>???select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)}><option value="?券">?券</option>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
          <label>?芸?蝝?select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="?券">?券</option>{['蝺?, '擃?, '銝?, '雿?].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label>鞎痊鈭?select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
          <label>??<select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>{['?唳???, '?芸?蝝?, '?亙熒摨?].map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={clearBoardFilters}>皜蝭拚</button>
        </div>
        <div className="board-result-hint">?桀?憿舐內 {scopedItems.length} / {items.length} 蝑?/div>
      </section>

      <section className="board-focus-strip v199-focus-strip">
        {focusRows.map((row) => (
          <button key={row.id} type="button" onClick={row.action}>
            <span>{row.label}</span>
            <strong>{row.count}</strong>
          </button>
        ))}
      </section>

      <section className="board-bulk-panel v199-bulk-panel">
        <div><strong>?寞活??</strong><span>撌脤??{selectedIds.length} 蝑?/ ?桀?閬? {scopedItems.length} 蝑?/span></div>
        <div className="bulk-actions-grid">
          <button type="button" onClick={selectScopedItems} disabled={!scopedItems.length}>?詨??桀?閬?</button>
          <button type="button" onClick={clearBoardSelection} disabled={!selectedIds.length}>???詨?</button>
          <label>???select value={bulkLane} onChange={(event) => setBulkLane(event.target.value)}>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
          <button type="button" onClick={() => applyBulkPatch({ lane: bulkLane })} disabled={!selectedIds.length}>憟???/button>
          <label>?芸?<select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value)}>{['蝺?, '擃?, '銝?, '雿?].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <button type="button" onClick={() => applyBulkPatch({ priority: bulkPriority })} disabled={!selectedIds.length}>憟?芸?</button>
          <label>鞎痊<input value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)} /></label>
          <button type="button" onClick={() => applyBulkPatch({ owner: bulkOwner || 'Kyle' })} disabled={!selectedIds.length}>憟鞎痊鈭?/button>
          <button type="button" onClick={exportBoardCsv}>?臬?桀?閬?</button>
        </div>
      </section>

      {!items.length && (
        <section className="board-empty-state">
          <strong>?桀?瘝?撌乩??</strong>
          <span>?臬??啣?銝蝑極雿???敺??∟頃??獢?蝔遣蝡蕭頩日??柴?/span>
          <button type="button" className="primary-btn" onClick={onAddItem}>?啣?蝚砌?蝑極雿?/button>
        </section>
      )}

      {items.length > 0 && !scopedItems.length && (
        <section className="board-empty-state slim">
          <strong>瘝?蝚血?蝭拚?極雿?/strong>
          <span>隢矽?渡??????鞎砌犖璇辣??/span>
          <button type="button" className="ghost-btn" onClick={clearBoardFilters}>皜蝭拚</button>
        </section>
      )}

      {selected && <BoardFloatingPreview selected={selected} />}

      {view === '?' && (
        <section className="kanban board-kanban-view">
          {lanes.map((lane) => {
            const laneItems = scopedItems.filter((item) => item.lane === lane.id)
            return (
              <article className="lane" key={lane.id}>
                <div className="lane-title">
                  <strong>{lane.title}</strong>
                  <span>{laneItems.length}</span>
                </div>
                <div className="lane-cards">
                  {laneItems.length ? laneItems.map((item) => (
                    <WorkCard key={item.id} item={item} selected={selected} onSelect={() => setSelected(item)} selectable checked={selectedIds.includes(item.id)} onToggleSelect={() => toggleSelectedId(item.id)} />
                  )) : <div className="lane-empty">撠?</div>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {view === '銵冽' && <WorkGrid items={scopedItems} selected={selected} setSelected={setSelected} selectedIds={selectedIds} onToggleSelect={toggleSelectedId} />}
      {view === '?∠?' && <CardWall items={scopedItems} selected={selected} setSelected={setSelected} selectedIds={selectedIds} onToggleSelect={toggleSelectedId} />}
    </div>
  )
}


function BoardFloatingPreview({ selected }) {
  return (
    <section className="board-floating-preview" aria-label="撠?璈極雿?閬?>
      <div className="board-floating-main">
        <span>{selected.id} 繚 ?桀??詨?</span>
        <strong>{selected.title}</strong>
      </div>
      <div className="board-floating-detail">
        <span>鞎痊鈭?{selected.owner}</span>
        <span>?亙熒摨?{selected.health}%</span>
        <span>{selected.channel}</span>
        <span>{(Array.isArray(selected.tags) ? selected.tags : []).slice(0, 2).join(' / ')}</span>
      </div>
    </section>
  )
}

function BoardInlinePreview({ selected }) {
  return (
    <section className="board-inline-preview" aria-label="??撌乩?閰喟敦?汗">
      <div className="board-inline-head">
        <span>{selected.id}</span>
        <strong>閰喟敦?汗</strong>
      </div>
      <p>{selected.note}</p>
      <div className="board-inline-grid">
        <span>???<b>{selected.lane}</b></span>
        <span>?芸?蝝?<b>{selected.priority}</b></span>
        <span>? <b>{selected.relation}</b></span>
        <span>?唳? <b>{selected.due}</b></span>
        <span>鞎痊 <b>{selected.owner}</b></span>
        <span>?亙熒摨?<b>{selected.health}%</b></span>
      </div>
      <div className="tag-list">{(Array.isArray(selected.tags) ? selected.tags : []).map((tag) => <span key={tag}>{tag}</span>)}</div>
    </section>
  )
}


function BasePage({ tables, records, activeTable, onCreateWorkItem, onCreateReminder }) {
  const [purchases, setPurchases] = useState(() => {
    if (typeof window === 'undefined') return initialPurchases
    try {
      const saved = window.localStorage.getItem('flowdesk-purchases-v19')
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length ? normalizePurchaseList(parsed) : initialPurchases
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
  const [statusFilter, setStatusFilter] = useState('?券')
  const [paymentFilter, setPaymentFilter] = useState('?券')
  const [arrivalFilter, setArrivalFilter] = useState('?券')
  const [acceptanceFilter, setAcceptanceFilter] = useState('?券')
  const [vendorFilter, setVendorFilter] = useState('?券')
  const [monthFilter, setMonthFilter] = useState('?券')
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
  const [purchaseCloudReady, setPurchaseCloudReady] = useState(!flowdeskCloud)
  const purchaseCloudSaveTimers = useRef({})

  const activeStages = purchaseStages.filter((stage) => stage.enabled)
  const doneStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('摰?')).map((stage) => stage.name)
  const arrivedStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('?啗疏') || stage.name.includes('摰?')).map((stage) => stage.name)
  const activeCollection = tables.find((table) => table.name === activeTable) || tables[0]
  const collectionView = collectionViews[activeCollection?.id] || activeCollection?.defaultView || 'list'

  useEffect(() => {
    let cancelled = false
    async function loadPurchaseCloudData() {
      if (!flowdeskCloud) {
        setPurchaseCloudReady(true)
        return
      }
      const [purchaseResult, historyResult, stageResult] = await Promise.all([
        flowdeskCloud.getWorkspaceData('purchases'),
        flowdeskCloud.getWorkspaceData('purchase_history'),
        flowdeskCloud.getWorkspaceData('purchase_stages'),
      ])
      if (cancelled) return
      if (Array.isArray(purchaseResult.data)) setPurchases(normalizePurchaseList(purchaseResult.data))
      if (Array.isArray(historyResult.data)) setPurchaseHistory(historyResult.data)
      if (Array.isArray(stageResult.data) && stageResult.data.length) setPurchaseStages(stageResult.data)
      setPurchaseCloudReady(true)
    }
    loadPurchaseCloudData()
    return () => {
      cancelled = true
      Object.values(purchaseCloudSaveTimers.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  function queuePurchaseCloudSave(dataKey, payload) {
    if (!purchaseCloudReady || !flowdeskCloud) return
    clearTimeout(purchaseCloudSaveTimers.current[dataKey])
    purchaseCloudSaveTimers.current[dataKey] = window.setTimeout(() => {
      flowdeskCloud.setWorkspaceData(dataKey, payload)
        .then(() => window.localStorage.setItem('flowdesk-last-cloud-sync', new Date().toLocaleString('zh-TW', { hour12: false })))
        .catch(() => null)
    }, 600)
  }
  const vendors = ['?券', ...Array.from(new Set(purchases.map((row) => row.vendor).filter(Boolean)))]
  const months = ['?券', ...Array.from(new Set(purchases.map((row) => (row.requestDate || '').slice(0, 7)).filter(Boolean))).sort().reverse()]
  const filteredPurchases = purchases.filter((row) => {
    const keyword = purchaseKeyword.trim().toLowerCase()
    const searchText = [
      row.id,
      purchaseTitle(row),
      row.department,
      row.requester,
      row.vendor,
      row.status,
      row.paymentStatus,
      row.arrivalStatus,
      row.acceptanceStatus,
      row.note,
      ...getPurchaseItems(row).flatMap((item) => [item.name, item.note]),
    ].join(' ').toLowerCase()
    const byKeyword = !keyword || searchText.includes(keyword)
    const byStatus = statusFilter === '?券' || row.status === statusFilter
    const byPayment = paymentFilter === '?券' || (row.paymentStatus || '?芯?甈?) === paymentFilter
    const byArrival = arrivalFilter === '?券' || (row.arrivalStatus || '?芸鞎?) === arrivalFilter
    const byAcceptance = acceptanceFilter === '?券' || (row.acceptanceStatus || '?芷???) === acceptanceFilter
    const byVendor = vendorFilter === '?券' || row.vendor === vendorFilter
    const byMonth = monthFilter === '?券' || (row.requestDate || '').startsWith(monthFilter)
    return byKeyword && byStatus && byPayment && byArrival && byAcceptance && byVendor && byMonth
  })
  const purchasePageCount = Math.max(1, Math.ceil(filteredPurchases.length / purchasePageSize))
  const safePurchasePage = Math.min(purchasePage, purchasePageCount)
  const pagedPurchases = filteredPurchases.slice((safePurchasePage - 1) * purchasePageSize, safePurchasePage * purchasePageSize)
  const stableSelectedPurchase = selectedPurchase ? purchases.find((row) => isSamePurchase(row, selectedPurchase)) || null : null
  const totalUntaxed = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).untaxedAmount, 0)
  const totalTax = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxAmount, 0)
  const totalAmount = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const waitingQuote = purchases.filter((row) => row.status.includes('閰Ｗ') || row.status.includes('?勗')).length
  const pendingApproval = purchases.filter((row) => row.status.includes('蝪賣') || row.status.includes('?詨?') || row.status.includes('蝣箄?')).length
  const notArrived = purchases.filter((row) => !arrivedStages.includes(row.status) && (row.arrivalStatus || '?芸鞎?) !== '撌脣鞎?).length
  const paymentPending = purchases.filter((row) => (row.paymentStatus || '?芯?甈?) !== '撌脖?甈? && !doneStages.includes(row.status)).length
  const acceptancePending = purchases.filter((row) => (row.acceptanceStatus || '?芷???) !== '撌脤??? && !doneStages.includes(row.status)).length
  const completedPurchases = purchases.filter((row) => doneStages.includes(row.status)).length
  const currentMonthKey = todayDate().slice(0, 7)
  const thisMonthTotal = purchases
    .filter((row) => (row.requestDate || '').startsWith(currentMonthKey))
    .reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const vendorSpendRanking = Array.from(purchases.reduce((map, row) => {
    const vendor = row.vendor || '?芣?摰???
    const current = map.get(vendor) || { vendor, amount: 0, count: 0 }
    current.amount += calculatePurchase(row).taxedTotal
    current.count += 1
    map.set(vendor, current)
    return map
  }, new Map()).values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
  const purchaseActionRows = purchases
    .map((row) => {
      const amount = calculatePurchase(row).taxedTotal
      const reasons = []
      if ((row.arrivalStatus || '?芸鞎?) !== '撌脣鞎? && !doneStages.includes(row.status)) reasons.push('?啗疏')
      if ((row.paymentStatus || '?芯?甈?) !== '撌脖?甈? && !doneStages.includes(row.status)) reasons.push('隞狡')
      if ((row.acceptanceStatus || '?芷???) !== '撌脤??? && !doneStages.includes(row.status)) reasons.push('撽')
      if (row.status.includes('閰Ｗ') || row.status.includes('?勗')) reasons.push('?勗')
      const score = reasons.length * 10 + Math.min(50, Math.round(amount / 10000))
      return { row, score, reasons, amount }
    })
    .filter((item) => item.reasons.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  function getPurchaseRelatedTasks(row) {
    if (!row) return []
    return tickets.filter((task) => {
      const purchaseMatched = task.relatedPurchase === row.id || (task.relatedPurchase && task.relatedPurchase !== '?? && purchaseTitle(row).includes(task.relatedPurchase))
      const vendorMatched = task.relatedVendor && task.relatedVendor !== '?? && row.vendor && task.relatedVendor === row.vendor
      const titleMatched = task.title.includes(purchaseTitle(row)) || task.tags?.some((tag) => purchaseTitle(row).includes(tag))
      return purchaseMatched || vendorMatched || titleMatched
    }).slice(0, 3)
  }

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchase-stages', JSON.stringify(purchaseStages))
    queuePurchaseCloudSave('purchase_stages', purchaseStages)
  }, [purchaseStages, purchaseCloudReady])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchases-v19', JSON.stringify(purchases))
    queuePurchaseCloudSave('purchases', purchases)
  }, [purchases, purchaseCloudReady])

  useEffect(() => {
    window.localStorage.setItem('flowdesk-purchase-history-v19', JSON.stringify(purchaseHistory))
    queuePurchaseCloudSave('purchase_history', purchaseHistory)
  }, [purchaseHistory, purchaseCloudReady])

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
      setActiveTable(tables[0]?.name || '?∟頃蝝??)
    }
  }, [tables, activeTable])

  useEffect(() => {
    setPurchasePage(1)
  }, [statusFilter, paymentFilter, arrivalFilter, acceptanceFilter, vendorFilter, monthFilter, purchaseKeyword, purchasePageSize])

  useEffect(() => {
    if (activeTable !== '?∟頃蝝??) return
    if (!purchases.length) {
      if (selectedPurchase) setSelectedPurchase(null)
      return
    }
    const visibleRows = filteredPurchases.length ? filteredPurchases : purchases
    const refreshed = selectedPurchase ? purchases.find((row) => isSamePurchase(row, selectedPurchase)) : null
    const stillVisible = refreshed && visibleRows.some((row) => isSamePurchase(row, refreshed))
    if (stillVisible && refreshed !== selectedPurchase) {
      setSelectedPurchase(refreshed)
      return
    }
    if (!stillVisible) {
      setSelectedPurchase(visibleRows[0] || null)
    }
  }, [activeTable, filteredPurchases, purchases, selectedPurchase])

  function updateCollectionView(viewId) {
    if (!activeCollection) return
    setCollectionViews((current) => ({ ...current, [activeCollection.id]: viewId }))
  }

  function writeHistory(purchaseId, title, message) {
    setPurchaseHistory((rows) => [{ id: `H-${Date.now()}`, purchaseId, title, message, time: new Date().toLocaleString('zh-TW', { hour12: false }) }, ...rows].slice(0, 80))
  }

  function getNextPurchaseId(current = purchases) {
    const maxNumber = current.reduce((max, item) => {
      const matched = String(item.id || '').match(/PO-(\d+)/)
      return matched ? Math.max(max, Number(matched[1])) : max
    }, 0)
    return `PO-${String(maxNumber + 1).padStart(3, '0')}`
  }

  function addPurchase(form) {
    const next = normalizePurchase({
      ...form,
      id: form.id || getNextPurchaseId(purchases),
      _purchaseKey: form._purchaseKey || createPurchaseKey(),
    })
    setPurchases((rows) => [next, ...rows])
    writeHistory(next.id, next.item, `?啣??∟頃嚗????{next.status}?)
    setShowPurchaseForm(false)
  }

  function savePurchase(form) {
    const source = editingPurchase || form
    const next = normalizePurchase({
      ...source,
      ...form,
      id: form.id || source?.id,
      _purchaseKey: form._purchaseKey || source?._purchaseKey || source?.uid || source?.key,
    })
    const before = purchases.find((row) => isSamePurchase(row, source)) || purchases.find((row) => row.id && row.id === next.id)
    setPurchases((rows) => rows.map((row) => isSamePurchase(row, source) || (row.id && row.id === next.id && !source?._purchaseKey) ? next : row))
    if (before?.status !== next.status) {
      writeHistory(next.id, next.item, `????{before?.status || '?芾身摰?}??箝?{next.status}?)
    } else {
      writeHistory(next.id, next.item, '?湔?∟頃鞈???)
    }
    setSelectedPurchase(next)
    setEditingPurchase(null)
  }

  function updatePurchaseStatus(row, status) {
    if (!row || !status) return
    const patch = { status }
    if (arrivedStages.includes(status) && (row.arrivalStatus || '?芸鞎?) === '?芸鞎?) patch.arrivalStatus = '撌脣鞎?
    if (doneStages.includes(status)) {
      if ((row.arrivalStatus || '?芸鞎?) !== '撌脣鞎?) patch.arrivalStatus = '撌脣鞎?
      if ((row.acceptanceStatus || '?芷???) !== '撌脤???) patch.acceptanceStatus = '撌脤???
    }
    const next = normalizePurchase({ ...row, ...patch })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
    writeHistory(row.id, purchaseTitle(row), `???箝?{status}?)
  }

  function updatePurchaseMeta(row, patch, message) {
    if (!row) return
    const next = normalizePurchase({ ...row, ...patch })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
    writeHistory(row.id, purchaseTitle(row), message || '?湔?∟頃餈質馱甈???)
  }

  function advancePurchase(row) {
    if (!row) return
    const currentIndex = activeStages.findIndex((stage) => stage.name === row.status)
    const nextStage = activeStages[Math.min(activeStages.length - 1, currentIndex + 1)]
    if (nextStage && nextStage.name !== row.status) updatePurchaseStatus(row, nextStage.name)
  }

  function completePurchase(row) {
    if (!row) return
    const doneStage = purchaseStages.find((stage) => stage.done || stage.name.includes('摰?'))?.name || '撌脣???
    updatePurchaseStatus(row, doneStage)
  }

  function deletePurchase(targetRow) {
    const target = typeof targetRow === 'object' ? targetRow : purchases.find((row) => row.id === targetRow)
    if (!target) return
    const deleteLabel = [target.id, purchaseTitle(target)].filter(Boolean).join(' ')
    if (!confirmDestructiveAction(deleteLabel || '?∟頃蝝??)) return
    setPurchases((rows) => {
      let removed = false
      const nextRows = rows.filter((row) => {
        if (removed) return true
        if (isSamePurchase(row, target)) {
          removed = true
          return false
        }
        return true
      })
      const nextSelected = selectedPurchase && !isSamePurchase(selectedPurchase, target)
        ? nextRows.find((row) => isSamePurchase(row, selectedPurchase)) || nextRows[0] || null
        : nextRows[0] || null
      setSelectedPurchase(nextSelected)
      return nextRows
    })
    writeHistory(target.id, purchaseTitle(target), '?芷?∟頃蝝??)
  }

  function duplicatePurchase(row) {
    if (!row) return
    const next = normalizePurchase({
      ...row,
      id: getNextPurchaseId(purchases),
      _purchaseKey: createPurchaseKey(),
      status: activeStages[0]?.name || row.status || '?瘙Ⅱ隤?,
      requestDate: todayDate(),
      orderDate: '',
      arrivalDate: '',
      note: [row.note, `??${row.id} 銴ˊ?].filter(Boolean).join('\n'),
    })
    setPurchases((rows) => [next, ...rows])
    setSelectedPurchase(next)
    writeHistory(next.id, purchaseTitle(next), `??${row.id} 銴ˊ?∟頃?)
  }

  function createPurchaseWorkItem(row) {
    if (!row || !onCreateWorkItem) return
    const amount = calculatePurchase(row)
    onCreateWorkItem({
      title: `餈質馱 ${purchaseTitle(row)}`,
      type: '?∟頃餈質馱',
      lane: doneStages.includes(row.status) ? '撌脣??? : '敺?憿?,
      priority: row.status?.includes('蝪賣') || row.status?.includes('蝣箄?') ? '擃? : '銝?,
      channel: '?∟頃蝞∠?',
      relation: row.id,
      requester: row.requester || 'Kyle',
      owner: 'Kyle',
      due: row.arrivalDate || row.orderDate || row.requestDate || todayDate(),
      health: doneStages.includes(row.status) ? 100 : 82,
      note: [row.vendor, purchaseTitle(row), formatMoney(amount.taxedTotal), row.note].filter(Boolean).join('嚚?),
      tags: ['?∟頃', row.vendor, row.status].filter(Boolean),
    })
    writeHistory(row.id, purchaseTitle(row), '撱箇?撌乩??餈質馱??)
  }

  function createPurchaseReminder(row, reminderKind = '餈質馱') {
    if (!row || !onCreateReminder) return
    const dueMap = {
      隞狡: row.paymentDueDate || row.orderDate || addDaysDate(7),
      ?啗疏: row.arrivalDueDate || row.arrivalDate || row.orderDate || addDaysDate(3),
      撽: row.acceptanceDate || row.arrivalDate || row.arrivalDueDate || addDaysDate(5),
      餈質馱: row.arrivalDate || row.orderDate || row.requestDate || addDaysDate(3),
    }
    const typeMap = { 隞狡: '蝪賣??', ?啗疏: '?啗疏??', 撽: '餈質馱??', 餈質馱: '餈質馱??' }
    onCreateReminder({
      title: `${reminderKind} ${purchaseTitle(row)}`,
      type: typeMap[reminderKind] || '餈質馱??',
      priority: reminderKind === '隞狡' || row.status?.includes('蝪賣') || row.status?.includes('蝣箄?') ? '擃? : '銝?,
      dueDate: dueMap[reminderKind] || addDaysDate(3),
      sourceType: '?∟頃',
      sourceTitle: `${row.id} ${purchaseTitle(row)}`,
      note: [row.vendor, row.status, row.poNo, row.quoteNo, row.note].filter(Boolean).join('嚚?),
    })
    writeHistory(row.id, purchaseTitle(row), `撱箇?${reminderKind}???)
  }

  function exportFilteredPurchases() {
    const headers = ['蝺刻?', '??', '撱?', '?券?', '?唾?鈭?, '瘚????, '隞狡???, '?啗疏???, '撽???, '?勗?株?', 'PO?株?', '?潛巨?Ⅳ', '?唾???, '銝??, '???啗疏', '?啗疏??, '隞狡??', '撽??, '??', '?勗??', '?芰?', '蝔?', '?怎?', '??撌桃', '???敦', '?酉']
    const rows = filteredPurchases.map((row) => {
      const amount = calculatePurchase(row)
      const itemsText = getPurchaseItems(row).map((item) => `${item.name || '?芸??} x ${item.quantity || 0} @ ${item.unitPrice || 0}`).join('嚗?)
      return [row.id, purchaseTitle(row), row.vendor, row.department, row.requester, row.status, row.paymentStatus || '?芯?甈?, row.arrivalStatus || '?芸鞎?, row.acceptanceStatus || '?芷???, row.quoteNo, row.poNo, row.invoiceNo, row.requestDate, row.orderDate, row.arrivalDueDate, row.arrivalDate, row.paymentDueDate, row.acceptanceDate, row.budgetAmount || 0, row.quoteAmount || 0, amount.untaxedAmount, amount.taxAmount, amount.taxedTotal, Number(row.budgetAmount || 0) ? amount.taxedTotal - Number(row.budgetAmount || 0) : '', itemsText, row.note]
    })
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FlowDesk?∟頃鞈?_${todayDate()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function cancelPurchase(row) {
    const cancelStage = purchaseStages.find((stage) => stage.cancel || stage.name.includes('??'))?.name || '撌脣?瘨?
    const next = normalizePurchase({ ...row, status: cancelStage })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
    writeHistory(row.id, purchaseTitle(row), `???箝?{cancelStage}?)
  }

  function updateStage(stageId, patch) {
    setPurchaseStages((stages) => stages.map((stage) => stage.id === stageId ? { ...stage, ...patch } : stage))
  }

  function addStage() {
    const nextId = `stage-${Date.now()}`
    setPurchaseStages((stages) => [...stages, { id: nextId, name: '?唳?蝔?, tone: 'blue', enabled: true }])
  }

  function removeStage(stageId) {
    const target = purchaseStages.find((stage) => stage.id === stageId)
    if (target?.locked) return
    if (!confirmDestructiveAction(target?.name || '?∟頃瘚????)) return
    setPurchaseStages((stages) => stages.filter((stage) => stage.id !== stageId))
  }

  function resetStages() {
    if (!confirmResetAction('蝣箏?閬敺拚?閮剜鞈潭?蝔??桀??芾?瘚??◤閬???)) return
    setPurchaseStages(initialPurchaseStages)
    window.localStorage.removeItem('flowdesk-purchase-stages')
  }

  function resetPurchases() {
    if (!confirmResetAction('蝣箏?閬?蝵格鞈潸????桀??∟頃蝝??甇瑞??◤閬???)) return
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
            <h2>{activeTable === '?∟頃蝝?? ? '?∟頃瘚?餈質馱' : activeTable}</h2>
          </div>
          <div className="record-actions collection-record-actions">
            <div className="collection-view-control" aria-label="鞈???閬?">
              <span className="collection-control-label">閬?</span>
              {collectionViewOptions.map((option) => (
                <button key={option.id} className={collectionView === option.id ? 'active' : ''} type="button" onClick={() => updateCollectionView(option.id)}>
                  <span aria-hidden="true">{option.id === 'list' ? '?? : '??}</span>{option.name}
                </button>
              ))}
            </div>
            {activeTable !== '?∟頃蝝?? && (
              <label className="collection-page-size-control"><span>瘥?蝑</span>
                <select value={collectionPageSize} onChange={(event) => setCollectionPageSize(Number(event.target.value))}>
                  {collectionPageSizeOptions.map((size) => <option key={size} value={size}>{size} 蝑?/option>)}
                </select>
              </label>
            )}
            {activeTable === '?∟頃蝝?? && (
              <>
                <button className="primary-btn" type="button" onClick={() => setShowPurchaseForm(true)}>?啣??∟頃</button>
                <details className="more-actions-menu">
                  <summary>?游???</summary>
                  <div>
                    <button type="button" onClick={() => setShowStageSettings((value) => !value)}>?∟頃瘚?閮剖?</button>
                    <button type="button" onClick={exportFilteredPurchases}>?臬?桀??∟頃</button>
                    <button type="button" onClick={resetPurchases}>?蔭鞈?</button>
                  </div>
                </details>
              </>
            )}
          </div>
        </div>

        {activeTable === '?∟頃蝝?? ? (
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
              <Metric label="?芰???" value={formatMoney(totalUntaxed)} tone="blue" />
              <Metric label="蝔?" value={formatMoney(totalTax)} tone="amber" />
              <Metric label="?怎?蝮賡?" value={formatMoney(totalAmount)} tone="green" />
              <Metric label="?芸鞎? value={notArrived} tone="red" />
            </div>
            <div className="purchase-filter-bar">
              <label className="purchase-search-field">??<input value={purchaseKeyword} onChange={(event) => setPurchaseKeyword(event.target.value)} placeholder="蝺刻??????隢犖..." /></label>
              <label>瘚?<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="?券">?券</option>{activeStages.map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
              <label>隞狡<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="?券">?券</option>{purchasePaymentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>?啗疏<select value={arrivalFilter} onChange={(event) => setArrivalFilter(event.target.value)}><option value="?券">?券</option>{purchaseArrivalStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>撽<select value={acceptanceFilter} onChange={(event) => setAcceptanceFilter(event.target.value)}><option value="?券">?券</option>{purchaseAcceptanceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>撱?<select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>{vendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}</select></label>
              <label>?遢<select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select></label>
              <button type="button" className="ghost-btn" onClick={() => { setPurchaseKeyword(''); setStatusFilter('?券'); setPaymentFilter('?券'); setArrivalFilter('?券'); setAcceptanceFilter('?券'); setVendorFilter('?券'); setMonthFilter('?券') }}>皜蝭拚</button>
            </div>
            <div className="purchase-quick-filters">
              <button type="button" className={statusFilter === '?券' && paymentFilter === '?券' && arrivalFilter === '?券' && acceptanceFilter === '?券' ? 'active' : ''} onClick={() => { setStatusFilter('?券'); setPaymentFilter('?券'); setArrivalFilter('?券'); setAcceptanceFilter('?券') }}>?券</button>
              <button type="button" className={arrivalFilter === '?芸鞎? ? 'active' : ''} onClick={() => { setStatusFilter('?券'); setArrivalFilter('?芸鞎?); setPaymentFilter('?券'); setAcceptanceFilter('?券') }}>?芸鞎?/button>
              <button type="button" className={paymentFilter === '?芯?甈? ? 'active' : ''} onClick={() => { setStatusFilter('?券'); setPaymentFilter('?芯?甈?); setArrivalFilter('?券'); setAcceptanceFilter('?券') }}>?芯?甈?/button>
              <button type="button" className={acceptanceFilter === '?芷??? ? 'active' : ''} onClick={() => { setStatusFilter('?券'); setAcceptanceFilter('?芷???); setPaymentFilter('?券'); setArrivalFilter('?券') }}>?芷???/button>
              <button type="button" className={statusFilter === '撌脣??? ? 'active' : ''} onClick={() => { setStatusFilter('撌脣???); setPaymentFilter('?券'); setArrivalFilter('?券'); setAcceptanceFilter('?券') }}>撌脣???/button>
            </div>
            <div className="purchase-v15-status-row purchase-v1974-status-row">
              <article><span>蝑??勗</span><strong>{waitingQuote}</strong></article>
              <article><span>敺Ⅱ隤?/ 蝪賣</span><strong>{pendingApproval}</strong></article>
              <article><span>撠?啗疏</span><strong>{notArrived}</strong></article>
              <article><span>?芯?甈?/span><strong>{paymentPending}</strong></article>
              <article><span>?芷???/span><strong>{acceptancePending}</strong></article>
              <article><span>撌脣???/span><strong>{completedPurchases}</strong></article>
            </div>
            <div className="purchase-insight-strip">
              <article><span>?祆??∟頃</span><strong>{formatMoney(thisMonthTotal)}</strong></article>
              <article><span>蝭拚蝮賡?</span><strong>{formatMoney(totalAmount)}</strong></article>
              <article><span>蝭拚蝑</span><strong>{filteredPurchases.length}</strong></article>
            </div>
            <div className="purchase-action-board">
              <div><p className="eyebrow">???芸?摨?/p><strong>?∟頃敺齒?阡?</strong><span>靘?憿??芸??????摨?/span></div>
              <div className="purchase-action-list">
                {purchaseActionRows.length ? purchaseActionRows.map((item) => (
                  <button type="button" key={getPurchaseKey(item.row)} onClick={() => setSelectedPurchase(item.row)}>
                    <div><strong>{purchaseTitle(item.row)}</strong><small>{item.row.vendor || '?芣?摰???} 繚 {item.reasons.join(' / ')}</small></div>
                    <b>{formatMoney(item.amount)}</b>
                  </button>
                )) : <span className="purchase-action-empty">?桀?瘝??閬?蕭頩斤??∟頃??/span>}
              </div>
            </div>

            <div className="purchase-workspace-layout">
              <section className="purchase-list-panel">
                <div className="purchase-list-headline">
                  <div>
                    <p className="eyebrow">?∟頃皜</p>
                    <h3>{filteredPurchases.length} 蝑鞈澆</h3>
                  </div>
                  <div className="purchase-list-head-actions">
                    <label className="purchase-page-size-control purchase-inline-page-size"><span>瘥?蝑</span>
                      <select value={purchasePageSize} onChange={(event) => setPurchasePageSize(Number(event.target.value))}>
                        {purchasePageSizeOptions.map((size) => <option key={size} value={size}>{size} 蝑?/option>)}
                      </select>
                    </label>
                    <div className="purchase-page-size-control compact-page-indicator">
                      <span>蝚?{safePurchasePage} / {purchasePageCount} ??/span>
                    </div>
                  </div>
                </div>
                <div className="purchase-selection-status">
                  <span>?桀?憿舐內 <b>{pagedPurchases.length}</b> 蝑?/ 蝭拚 <b>{filteredPurchases.length}</b> 蝑?/span>
                  <span>?喳?敦嚗?b>{stableSelectedPurchase ? `${stableSelectedPurchase.id} ${purchaseTitle(stableSelectedPurchase)}` : '撠?詨?'}</b></span>
                </div>
                <div className={collectionView === 'card' ? 'purchase-card-list purchase-card-grid' : 'purchase-card-list'}>
                  {pagedPurchases.map((row) => {
                    const amount = calculatePurchase(row)
                    const quoteAmount = Number(row.quoteAmount || 0)
                    const diff = quoteAmount ? amount.taxedTotal - quoteAmount : 0
                    return (
                      <article className={isSamePurchase(selectedPurchase, row) ? 'purchase-card-row purchase-card-compact active' : 'purchase-card-row purchase-card-compact'} key={getPurchaseKey(row)} onClick={() => setSelectedPurchase(row)}>
                        <div className="purchase-card-main">
                          <div className="purchase-card-topline">
                            <span className="record-id">{row.id}</span>
                            <StageBadge value={row.status} stages={purchaseStages} />
                          </div>
                          <strong>{purchaseTitle(row)}</strong>
                          <div className="purchase-card-meta-grid">
                            <span>撱?<b>{row.vendor || '??}</b></span>
                            <span>?唾?鈭?b>{row.requester || '??}</b></span>
                            <span>?交?<b>{row.requestDate || '?芸‵?交?'}</b></span>
                            <span>??<b>{getPurchaseItems(row).length} ??/b></span>
                            <span>隞狡<b>{row.paymentStatus || '?芯?甈?}</b></span>
                            <span>?啗疏<b>{row.arrivalStatus || '?芸鞎?}</b></span>
                          </div>
                          <div className="purchase-item-preview">
                            {getPurchaseItems(row).slice(0, 3).map((item) => (
                              <span key={item.id}>{item.name || '?芸??} ? {item.quantity}</span>
                            ))}
                            {getPurchaseItems(row).length > 3 && <span>+{getPurchaseItems(row).length - 3}</span>}
                          </div>
                        </div>
                        <div className="purchase-card-money">
                          <span>?怎?蝮賡?</span>
                          <strong>{formatMoney(amount.taxedTotal)}</strong>
                          <small>?芰? {formatMoney(amount.untaxedAmount)} 繚 蝔? {formatMoney(amount.taxAmount)}</small>
                          {quoteAmount > 0 && <em className={Math.abs(diff) > 1 ? 'has-diff' : ''}>?勗撌桅? {formatMoney(diff)}</em>}
                        </div>
                        <div className="purchase-actions compact-actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => setEditingPurchase(row)}>蝺刻摩</button>
                          <button type="button" onClick={() => cancelPurchase(row)}>??</button>
                          <button type="button" className="danger" onClick={() => deletePurchase(row)}>?芷</button>
                        </div>
                      </article>
                    )
                  })}
                  {!pagedPurchases.length && <div className="purchase-empty-state">瘝?蝚血?璇辣?鞈潸???/div>}
                </div>
                <div className="purchase-pagination">
                  <button type="button" onClick={() => setPurchasePage((page) => Math.max(1, page - 1))} disabled={safePurchasePage <= 1}>銝???/button>
                  <span>{((safePurchasePage - 1) * purchasePageSize) + (filteredPurchases.length ? 1 : 0)} - {Math.min(safePurchasePage * purchasePageSize, filteredPurchases.length)} / {filteredPurchases.length}</span>
                  <button type="button" onClick={() => setPurchasePage((page) => Math.min(purchasePageCount, page + 1))} disabled={safePurchasePage >= purchasePageCount}>銝???/button>
                </div>
              </section>

              <aside className="purchase-side-panel">
                <section className="purchase-detail-card compact-detail-card">
                  <PanelTitle eyebrow="?∟頃?敦" title={stableSelectedPurchase ? purchaseTitle(stableSelectedPurchase) : '隢?鞈潮???} action={stableSelectedPurchase?.id} />
                  {stableSelectedPurchase ? <PurchaseDetail row={stableSelectedPurchase} stages={purchaseStages} relatedTasks={getPurchaseRelatedTasks(stableSelectedPurchase)} history={purchaseHistory.filter((entry) => entry.purchaseId === stableSelectedPurchase.id)} onEdit={() => setEditingPurchase(stableSelectedPurchase)} onAdvance={() => advancePurchase(stableSelectedPurchase)} onComplete={() => completePurchase(stableSelectedPurchase)} onDuplicate={() => duplicatePurchase(stableSelectedPurchase)} onCreateTask={() => createPurchaseWorkItem(stableSelectedPurchase)} onCreateReminder={(kind) => createPurchaseReminder(stableSelectedPurchase, kind)} onUpdateMeta={(patch, message) => updatePurchaseMeta(stableSelectedPurchase, patch, message)} /> : <p>暺撌血?∟頃?嚗?亦??怎??蝔??交??敦??/p>}
                </section>
                <section className="purchase-history-card compact-history-card">
                  <PanelTitle eyebrow="??風蝔? title="?餈??? />
                  <div className="history-list">
                    {purchaseHistory.length ? purchaseHistory.slice(0, 6).map((entry) => <article key={entry.id}><strong>{entry.title}</strong><span>{entry.message}</span><small>{entry.time}</small></article>) : <p>撠霈蝝??/p>}
                  </div>
                </section>
                <section className="purchase-vendor-rank-card">
                  <PanelTitle eyebrow="撱?蝯梯?" title="?∟頃????" />
                  <div className="purchase-vendor-rank">
                    {vendorSpendRanking.length ? vendorSpendRanking.map((vendor) => (
                      <article key={vendor.vendor}>
                        <div><strong>{vendor.vendor}</strong><span>{vendor.count} 蝑?/span></div>
                        <b>{formatMoney(vendor.amount)}</b>
                      </article>
                    )) : <p>撠撱??∟頃鞈???/p>}
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
      status: record.status || '?芾身摰?,
      owner: record.owner || '?芣?摰?,
      date: record.date || '?芸‵?交?',
      meta: [record.vendor, record.group].filter(Boolean).join(' 繚 ') || collection?.name,
    }))
  }
  const fields = Array.isArray(collection?.fields) && collection.fields.length ? collection.fields : ['?迂', '???, '鞎痊鈭?, '?酉']
  return Array.from({ length: Math.min(Math.max(Number(collection?.rows || 0), 3), 12) }, (_, index) => ({
    id: `${collection?.id || 'collection'}-${index + 1}`,
    title: `${collection?.name || '鞈???'} 蝭? ${index + 1}`,
    status: index % 3 === 0 ? '敺?? : index % 3 === 1 ? '餈質馱銝? : '撌脫飛瑼?,
    owner: index % 2 === 0 ? 'Kyle' : '?芣?摰?,
    date: `2026-04-${String(12 + index).padStart(2, '0')}`,
    meta: fields.slice(0, 3).join(' 繚 '),
  }))
}

function CollectionPreviewPanel({ collection, view, pageSize, records }) {
  const matchedRecords = records.filter((record) => record.table === collection?.name)
  const isSamplePreview = matchedRecords.length === 0
  const rows = buildCollectionPreviewRows(collection, records).slice(0, pageSize)
  const fields = Array.isArray(collection?.fields) && collection.fields.length ? collection.fields : ['?迂', '???, '鞎痊鈭?, '?酉']
  const isCard = view === 'card'
  return (
    <section className="collection-view-panel">
      <div className="collection-view-hero">
        <div>
          <p className="eyebrow">COLLECTION</p>
          <h3>{collection?.name || '鞈???'}</h3>
          <span>{isCard ? '?∠?閬?' : '皜閬?'} 繚 憿舐內 {rows.length} 蝑?繚 {fields.length} ??雿?/span>
        </div>
        <div className={`collection-view-mark ${collection?.color || 'blue'}`}>{fields[0]?.slice(0, 1) || '鞈?}</div>
      </div>

      <div className="collection-preview-note">
        <strong>{isSamplePreview ? '?汗璅∪?' : '鞈?璅∪?'}</strong>
        <span>{isSamplePreview ? '?桀?甇日????芸遣蝡迤撘????誑甈?蝭???芯?鞈?璅???? : '?桀?憿舐內甇方????歇撱箇?????}</span>
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
          <p className="eyebrow">?∟頃瘚?</p>
          <h3>?芾?瘚??迂??摨?/h3>
        </div>
        <div>
          <button className="ghost-btn" type="button" onClick={resetStages}>?Ｗ儔?身</button>
          <button className="primary-btn" type="button" onClick={addStage}>?啣????/button>
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
            <span className="stage-handle">?栽</span>
            <input value={stage.name} onChange={(event) => updateStage(stage.id, { name: event.target.value })} />
            <div className="stage-color-picker" aria-label="瘚?憿">
              {stageColorOptions.map((color) => (
                <button
                  key={color.tone}
                  type="button"
                  className={'stage-color-dot ' + color.tone + (stage.tone === color.tone ? ' active' : '')}
                  title={color.label}
                  aria-label={'閮剖??? + color.label}
                  onClick={() => updateStage(stage.id, { tone: color.tone })}
                />
              ))}
            </div>
            <label className="stage-check"><input type="checkbox" checked={stage.enabled} onChange={(event) => updateStage(stage.id, { enabled: event.target.checked })} />?</label>
            <label className="stage-check"><input type="checkbox" checked={Boolean(stage.done)} onChange={(event) => updateStage(stage.id, { done: event.target.checked })} />閬摰?</label>
            <button className="stage-remove" type="button" onClick={() => removeStage(stage.id)} disabled={stage.locked}>?芷</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysDate(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function nextRunningId(prefix, rows = []) {
  const maxNumber = rows.reduce((max, item) => {
    const matched = String(item.id || '').match(new RegExp(`${prefix}-(\\d+)`))
    return matched ? Math.max(max, Number(matched[1])) : max
  }, 0)
  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`
}

function createEmptyTask() {
  return {
    title: '',
    source: '???啣?',
    category: '銝?砌遙??,
    status: '敺???,
    priority: '銝?,
    owner: 'Kyle',
    progress: 0,
    due: todayDate(),
    next: '',
    relatedPurchase: '',
    relatedVendor: '',
    relatedProject: '',
    tagsText: '',
    note: '',
  }
}

function normalizeTask(row = {}) {
  const tags = Array.isArray(row.tags)
    ? row.tags
    : String(row.tagsText || row.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  const next = String(row.next || row.note || '').trim()
  return {
    id: row.id || `TASK-${Date.now()}`,
    title: String(row.title || '?芸?遙??).trim(),
    source: row.source || '???啣?',
    category: row.category || '銝?砌遙??,
    status: row.status || '敺???,
    priority: row.priority || '銝?,
    owner: row.owner || 'Kyle',
    progress: Math.max(0, Math.min(100, Number(row.progress || 0))),
    due: row.due || todayDate(),
    next: next || '鋆?銝?甇乓?,
    relatedPurchase: row.relatedPurchase || '',
    relatedVendor: row.relatedVendor || '',
    relatedProject: row.relatedProject || '',
    tags,
    records: Array.isArray(row.records) && row.records.length ? row.records : ['撱箇?隞餃???],
  }
}

function TaskTrackingPage({ tasks: sourceTasks }) {
  const [tasks, setTasks] = useState(() => {
    if (typeof window === 'undefined') return sourceTasks
    try {
      const saved = window.localStorage.getItem('flowdesk-tasks-v1972')
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeTask) : sourceTasks.map(normalizeTask)
    } catch {
      return sourceTasks.map(normalizeTask)
    }
  })
  const [tasksCloudReady, setTasksCloudReady] = useState(!flowdeskCloud)
  const tasksCloudSaveTimer = useRef(null)
  const [filter, setFilter] = useState('?券')
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState(sourceTasks[0]?.id)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const statusOptions = ['?券', '敺???, '頝脖葉', '蝑?閬?, '?⊿?', '撌脫??]
  const taskStatusOptions = statusOptions.filter((item) => item !== '?券')

  useEffect(() => {
    let cancelled = false
    async function loadTasksFromCloud() {
      if (!flowdeskCloud) {
        setTasksCloudReady(true)
        return
      }
      const { data } = await flowdeskCloud.getWorkspaceData('tasks')
      if (cancelled) return
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeTask)
        setTasks(normalized)
        setSelectedId(normalized[0]?.id)
      }
      setTasksCloudReady(true)
    }
    loadTasksFromCloud()
    return () => {
      cancelled = true
      clearTimeout(tasksCloudSaveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-tasks-v1972', JSON.stringify(tasks))
    if (!tasksCloudReady || !flowdeskCloud) return
    clearTimeout(tasksCloudSaveTimer.current)
    tasksCloudSaveTimer.current = window.setTimeout(() => {
      flowdeskCloud.setWorkspaceData('tasks', tasks).catch(() => null)
    }, 600)
  }, [tasks, tasksCloudReady])

  useEffect(() => {
    if (!tasks.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !tasks.some((task) => task.id === selectedId)) setSelectedId(tasks[0].id)
  }, [selectedId, tasks])

  const selectedTask = tasks.find((task) => task.id === selectedId) || tasks[0]
  const visibleTasks = tasks.filter((task) => {
    const statusMatched = filter === '?券' || task.status === filter
    const q = keyword.trim().toLowerCase()
    const text = [task.id, task.title, task.source, task.category, task.status, task.priority, task.owner, task.next, task.relatedPurchase, task.relatedVendor, task.relatedProject, ...(Array.isArray(task.tags) ? task.tags : [])].join(' ').toLowerCase()
    return statusMatched && (!q || text.includes(q))
  })
  const openCount = tasks.filter((task) => task.status !== '撌脫??).length
  const waitingCount = tasks.filter((task) => ['蝑?閬?, '?⊿?'].includes(task.status)).length
  const todayCount = tasks.filter((task) => task.due === todayDate() || task.due === '隞').length
  const avgProgress = Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / Math.max(tasks.length, 1))

  function updateTask(id, patch, recordText) {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task
      const next = normalizeTask({ ...task, ...patch })
      if (recordText) next.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚?{recordText}`, ...(task.records || [])].slice(0, 20)
      return next
    }))
  }

  function updateTaskStatus(id, status) {
    const target = tasks.find((task) => task.id === id)
    updateTask(id, { status, progress: status === '撌脫?? ? 100 : status === '頝脖葉' ? Math.max(target?.progress || 0, 35) : target?.progress }, `???箝?{status}?)
  }

  function addTask(form) {
    const next = normalizeTask({ ...form, id: nextRunningId('TASK', tasks), records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚遣蝡遙?] })
    setTasks((current) => [next, ...current])
    setSelectedId(next.id)
    setShowTaskForm(false)
  }

  function saveTask(form) {
    const next = normalizeTask(form)
    setTasks((current) => current.map((task) => task.id === next.id ? { ...next, records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚?唬遙?摰嫘, ...(task.records || [])].slice(0, 20) } : task))
    setSelectedId(next.id)
    setEditingTask(null)
  }

  function duplicateTask(task) {
    const next = normalizeTask({ ...task, id: nextRunningId('TASK', tasks), title: `${task.title || '?芸?遙??} 銴`, status: '敺???, progress: 0, records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚 ${task.id} 銴ˊ?] })
    setTasks((current) => [next, ...current])
    setSelectedId(next.id)
  }

  function removeTask(id) {
    const target = tasks.find((task) => task.id === id)
    if (!confirmDestructiveAction(target?.title || id || '隞餃?')) return
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  function statusCount(status) {
    return status === '?券' ? tasks.length : tasks.filter((task) => task.status === status).length
  }

  return (
    <div className="task-workspace page-stack flowdesk-module-shell">
      <section className="flow-toolbar flowdesk-toolbar-v2">
        <div>
          <p className="eyebrow">TASK FLOW</p>
          <h2>隞餃?餈質馱</h2>
          <span>?刻????格?撣詨??????????銝?甇乓?/span>
        </div>
        <div className="flow-toolbar-actions">
          <span className="toolbar-soft-chip">蝑? / ?⊿? {waitingCount}</span>
          <button className="ghost-btn" type="button" onClick={() => { setFilter('?券'); setKeyword('') }}>?渡?閬?</button>
          <button className="primary-btn" type="button" onClick={() => setShowTaskForm(true)}>?啣?隞餃?</button>
        </div>
      </section>

      <section className="task-summary-grid compact-flow-stats">
        <article><span>?芣??/span><strong>{openCount}</strong><small>?閬?蝥???/small></article>
        <article><span>隞閬?</span><strong>{todayCount}</strong><small>隞?唳???蝣箄?</small></article>
        <article><span>蝑? / ?⊿?</span><strong>{waitingCount}</strong><small>?芸?蝣箄???</small></article>
        <article><span>撟喳??脣漲</span><strong>{avgProgress}%</strong><small>?桀?隞餃??券脣漲</small></article>
      </section>

      <section className="task-filter-strip flow-pill-filter">
        {statusOptions.map((status) => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            <span>{status}</span><small>{statusCount(status)}</small>
          </button>
        ))}
      </section>

      <div className="purchase-filter-bar task-search-bar">
        <label className="purchase-search-field">??<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="隞餃????鞈潦?獢?銝甇?.." /></label>
        <button className="ghost-btn" type="button" onClick={() => { setKeyword(''); setFilter('?券') }}>皜蝭拚</button>
      </div>

      <div className="task-board-layout task-board-layout-v2">
        <section className="task-feed-panel task-feed-panel-v2">
          <div className="task-panel-head">
            <div><strong>撌乩?皜</strong><span>{visibleTasks.length} 蝑泵??隞?/span></div>
            <small>暺?∠??亦??喳???賢?</small>
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
                <span>{task.relatedPurchase && task.relatedPurchase !== '?? ? task.relatedPurchase : task.source}</span>
                <span>{task.relatedVendor && task.relatedVendor !== '?? ? task.relatedVendor : '?芣?摰???}</span>
                <span>{task.relatedProject && task.relatedProject !== '?? ? task.relatedProject : task.due}</span>
              </div>
              <div className="task-progress-row">
                <div className="flow-progress"><span style={{ width: `${task.progress}%` }} /></div>
                <strong>{task.progress}%</strong>
              </div>
            </button>
          ))}
          {!visibleTasks.length && <div className="flow-empty-card">?桀?瘝?蝚血?璇辣?遙??/div>}
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
                <p>{selectedTask.source} 繚 {selectedTask.category}</p>
                <div className="tag-list">{(selectedTask.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="flow-progress big"><span style={{ width: `${selectedTask.progress}%` }} /></div>
              </div>
              <section className="detail-block next-action-card">
                <p className="eyebrow">銝?甇?/p>
                <strong>{selectedTask.next}</strong>
              </section>
              <div className="detail-section-grid detail-section-grid-v2">
                <article><span>?芸?</span><strong>{selectedTask.priority}</strong></article>
                <article><span>鞎痊</span><strong>{selectedTask.owner}</strong></article>
                <article><span>?∟頃</span><strong>{selectedTask.relatedPurchase || '??}</strong></article>
                <article><span>撱?</span><strong>{selectedTask.relatedVendor || '??}</strong></article>
                <article><span>撠?</span><strong>{selectedTask.relatedProject || '??}</strong></article>
                <article><span>?唳?</span><strong>{selectedTask.due}</strong></article>
              </div>
              <section className="detail-block project-meeting-block">
                <div className="detail-block-headline"><p className="eyebrow">?降蝝??/p><button type="button" onClick={() => addProjectMeeting(selectedProject.id)}>?啣??降</button></div>
                <div className="project-decision-list">
                  {(selectedProject.meetings || []).map((meeting) => (
                    <article key={meeting.id} className="project-note-editor">
                      <input type="date" value={meeting.date || todayDate()} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { date: event.target.value })} />
                      <input value={meeting.title || ''} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { title: event.target.value })} placeholder="?降銝駁?" />
                      <textarea value={meeting.note || ''} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { note: event.target.value })} placeholder="?降?? / 敺齒" />
                      <button type="button" onClick={() => removeProjectMeeting(selectedProject.id, meeting.id)}>?芷</button>
                    </article>
                  ))}
                  {!selectedProject.meetings?.length && <div className="flow-empty-card">撠?降蝝??/div>}
                </div>
              </section>
              <section className="detail-block project-decision-block">
                <div className="detail-block-headline"><p className="eyebrow">瘙箄降鈭?</p><button type="button" onClick={() => addProjectDecision(selectedProject.id)}>?啣?瘙箄降</button></div>
                <div className="project-decision-list">
                  {(selectedProject.decisions || []).map((decision) => (
                    <article key={decision.id} className="project-decision-row">
                      <input type="date" value={decision.date || todayDate()} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { date: event.target.value })} />
                      <input value={decision.title || ''} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { title: event.target.value })} placeholder="瘙箄降?批捆" />
                      <input value={decision.owner || ''} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { owner: event.target.value })} placeholder="鞎痊鈭? />
                      <select value={decision.status || '敺蕭頩?} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { status: event.target.value })}><option>敺蕭頩?/option><option>??銝?/option><option>撌脣???/option></select>
                      <button type="button" onClick={() => removeProjectDecision(selectedProject.id, decision.id)}>?芷</button>
                    </article>
                  ))}
                  {!selectedProject.decisions?.length && <div className="flow-empty-card">撠瘙箄降鈭???/div>}
                </div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">??蝝??/p>
                <div className="timeline-notes flow-timeline-notes">
                  {(selectedTask.records || []).map((record, index) => <div key={`${record}-${index}`}><span>{index + 1}</span><p>{record}</p></div>)}
                </div>
              </section>
              <div className="task-action-row task-action-row-v2 task-action-row-expanded">
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '頝脖葉')}>頝脖葉</button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '蝑?閬?)}>蝑?閬?/button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '撌脫??)}>?嗆?</button>
                <button type="button" onClick={() => setEditingTask(selectedTask)}>蝺刻摩</button>
                <button type="button" onClick={() => duplicateTask(selectedTask)}>銴ˊ</button>
                <button className="danger" type="button" onClick={() => removeTask(selectedTask.id)}>?芷</button>
              </div>
            </>
          )}
        </aside>
      </div>
      {showTaskForm && <TaskModal onClose={() => setShowTaskForm(false)} onSubmit={addTask} statusOptions={taskStatusOptions} />}
      {editingTask && <TaskModal onClose={() => setEditingTask(null)} onSubmit={saveTask} statusOptions={taskStatusOptions} initial={editingTask} mode="edit" />}
    </div>
  )
}

function TaskModal({ onClose, onSubmit, statusOptions, initial, mode = 'create' }) {
  const [form, setForm] = useState(() => ({ ...createEmptyTask(), ...(initial || {}), tagsText: Array.isArray(initial?.tags) ? initial.tags.join(', ') : initial?.tagsText || '' }))

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitTask() {
    if (!String(form.title || '').trim()) return
    onSubmit(form)
  }

  return (
    <div className="modal-backdrop">
      <section className="launcher task-modal v16-modal">
        <div className="launcher-head purchase-modal-head">
          <div><p className="eyebrow">隞餃?餈質馱</p><h2>{mode === 'edit' ? '蝺刻摩隞餃?' : '?啣?隞餃?'}</h2></div>
          <button type="button" onClick={onClose}>??/button>
        </div>
        <div className="purchase-modal-body">
          <div className="form-grid">
            <label>璅?<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="靘?嚗蕭頩文???? /></label>
            <label>???select value={form.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>?芸?蝝?select value={form.priority} onChange={(event) => update('priority', event.target.value)}><option>擃?/option><option>銝?/option><option>雿?/option></select></label>
            <label>鞎痊鈭?input value={form.owner} onChange={(event) => update('owner', event.target.value)} /></label>
            <label>靘?<input value={form.source} onChange={(event) => update('source', event.target.value)} /></label>
            <label>憿<input value={form.category} onChange={(event) => update('category', event.target.value)} /></label>
            <label>?唳???input type="date" value={form.due} onChange={(event) => update('due', event.target.value)} /></label>
            <label>?脣漲 %<input type="number" min="0" max="100" value={form.progress} onChange={(event) => update('progress', event.target.value)} /></label>
            <label>??∟頃<input value={form.relatedPurchase} onChange={(event) => update('relatedPurchase', event.target.value)} placeholder="靘? PO-001" /></label>
            <label>?撱?<input value={form.relatedVendor} onChange={(event) => update('relatedVendor', event.target.value)} /></label>
            <label>?撠?<input value={form.relatedProject} onChange={(event) => update('relatedProject', event.target.value)} placeholder="靘? PRJ-001" /></label>
            <label>璅惜<input value={form.tagsText} onChange={(event) => update('tagsText', event.target.value)} placeholder="隞仿???" /></label>
            <label className="form-wide">銝?甇?textarea value={form.next} onChange={(event) => update('next', event.target.value)} /></label>
          </div>
        </div>
        <div className="form-actions sticky-form-actions">
          <button className="ghost-btn" type="button" onClick={onClose}>??</button>
          <button className="primary-btn" type="button" onClick={submitTask} disabled={!String(form.title || '').trim()}>?脣?</button>
        </div>
      </section>
    </div>
  )
}



function ProjectManagementPage({ projects: initialProjectRows = [], onCreateWorkItem }) {
  const [projects, setProjects] = useState(() => initialProjectRows)
  const [projectsCloudReady, setProjectsCloudReady] = useState(!flowdeskCloud)
  const projectsCloudSaveTimer = useRef(null)
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return initialProjectRows[0]?.id
    return window.localStorage.getItem('flowdesk-project-selected-id-v20316') || initialProjectRows[0]?.id
  })
  const [projectModalOpen, setProjectModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('flowdesk-project-modal-open-v20316') === 'true'
  })
  const [projectListExpandAllGantt, setProjectListExpandAllGantt] = useState(false)
  const [projectKeyword, setProjectKeyword] = useState('')
  const [projectPhaseFilter, setProjectPhaseFilter] = useState('?券')
  const [projectHealthFilter, setProjectHealthFilter] = useState('?券')
  const [projectPriorityFilter, setProjectPriorityFilter] = useState('?券')
  const [projectSortMode, setProjectSortMode] = useState(() => {
    if (typeof window === 'undefined') return '?芸???'
    const saved = window.localStorage.getItem('flowdesk-project-sort-mode-v20322')
    return PROJECT_SORT_OPTIONS.includes(saved) ? saved : '?芸???'
  })
  const [detailTab, setDetailTab] = useState(() => {
    if (typeof window === 'undefined') return 'overview'
    const saved = window.localStorage.getItem('flowdesk-project-detail-tab-v20316')
    return ['overview', 'gantt', 'tasks', 'milestones', 'records'].includes(saved) ? saved : 'overview'
  })
  const [projectViewMode, setProjectViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'cards'
    return window.localStorage.getItem('flowdesk-project-view-mode-v20316') || 'cards'
  })
  const [projectPage, setProjectPage] = useState(() => {
    if (typeof window === 'undefined') return 1
    return Math.max(1, Number(window.localStorage.getItem('flowdesk-project-page-v20316') || 1))
  })
  const [projectPageSize, setProjectPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10
    const saved = Number(window.localStorage.getItem('flowdesk-project-page-size-v20316') || 10)
    return [10, 20, 30, 40, 50].includes(saved) ? saved : 10
  })
  const [projectPageInput, setProjectPageInput] = useState(() => {
    if (typeof window === 'undefined') return '1'
    return String(Math.max(1, Number(window.localStorage.getItem('flowdesk-project-page-v20316') || 1)))
  })
  const [draggingProjectId, setDraggingProjectId] = useState(null)
  const [dropProjectId, setDropProjectId] = useState(null)
  const [manualRecordText, setManualRecordText] = useState('')
  const [ganttDragRange, setGanttDragRange] = useState(null)
  const [ganttDragPreview, setGanttDragPreview] = useState(null)
  const [ganttProgressEditor, setGanttProgressEditor] = useState(null)
  const [ganttShowSubtasks, setGanttShowSubtasks] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('flowdesk-gantt-show-subtasks-v20316') !== 'false'
  })
  const [ganttExpandedTasks, setGanttExpandedTasks] = useState({})
  const projectFilterInitRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    async function loadProjectsFromCloud() {
      if (!flowdeskCloud) {
        setProjectsCloudReady(true)
        return
      }
      const { data } = await flowdeskCloud.getWorkspaceData('projects')
      if (cancelled) return
      if (Array.isArray(data)) {
        setProjects(data)
        const savedSelectedId = typeof window !== 'undefined' ? window.localStorage.getItem('flowdesk-project-selected-id-v20316') : null
        setSelectedId((current) => {
          if (current && data.some((project) => project.id === current)) return current
          if (savedSelectedId && data.some((project) => project.id === savedSelectedId)) return savedSelectedId
          return data[0]?.id
        })
      }
      setProjectsCloudReady(true)
    }
    loadProjectsFromCloud()
    return () => {
      cancelled = true
      clearTimeout(projectsCloudSaveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!projectsCloudReady) return
    try {
      window.localStorage.setItem('flowdesk-projects-v1972', JSON.stringify(projects))
    } catch {
      // localStorage is only a backup; cloud sync remains the main source when available.
    }
    if (!flowdeskCloud) return
    clearTimeout(projectsCloudSaveTimer.current)
    projectsCloudSaveTimer.current = window.setTimeout(() => {
      flowdeskCloud.setWorkspaceData('projects', projects).catch(() => null)
    }, 600)
  }, [projects, projectsCloudReady])

  useEffect(() => {
    if (selectedId && projects.some((project) => project.id === selectedId)) return
    setSelectedId(projects[0]?.id)
  }, [projects, selectedId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedId) window.localStorage.setItem('flowdesk-project-selected-id-v20316', selectedId)
    window.localStorage.setItem('flowdesk-project-modal-open-v20316', String(Boolean(projectModalOpen)))
    window.localStorage.setItem('flowdesk-project-detail-tab-v20316', detailTab)
    window.localStorage.setItem('flowdesk-project-view-mode-v20316', projectViewMode)
    window.localStorage.setItem('flowdesk-project-sort-mode-v20322', projectSortMode)
    window.localStorage.setItem('flowdesk-project-page-v20316', String(projectPage))
    window.localStorage.setItem('flowdesk-project-page-size-v20316', String(projectPageSize))
    window.localStorage.setItem('flowdesk-gantt-show-subtasks-v20316', String(Boolean(ganttShowSubtasks)))
  }, [selectedId, projectModalOpen, detailTab, projectViewMode, projectSortMode, projectPage, projectPageSize, ganttShowSubtasks])

  useEffect(() => {
    if (projectFilterInitRef.current) {
      projectFilterInitRef.current = false
      return
    }
    setProjectPage(1)
  }, [projectKeyword, projectPhaseFilter, projectHealthFilter, projectPriorityFilter, projectViewMode, projectSortMode, projectPageSize])

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') setProjectModalOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value || 0)))
  }

  function stableId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  function projectPriorityBaseScore(priority = '銝?) {
    return priority === '蝺? ? 78 : priority === '擃? ? 62 : priority === '雿? ? 22 : 42
  }

  function getProjectPriorityMeta(project = {}) {
    const today = todayDate()
    const manual = PROJECT_PRIORITY_OPTIONS.includes(project.priority) ? project.priority : '銝?
    const progress = clampPercent(project.progress)
    const endDate = project.endDate || today
    const remainingDays = daysBetween(today, endDate)
    const health = String(project.health || '')
    const phase = String(project.phase || '')
    const tasks = Array.isArray(project.tasks) ? project.tasks : []
    const flatTasks = tasks.flatMap((task) => [
      task,
      ...(Array.isArray(task.subtasks) ? task.subtasks : []),
    ])
    const openItems = flatTasks.filter((item) => !(Boolean(item.done) || clampPercent(item.progress) >= 100))
    const overdueItems = openItems.filter((item) => (item.end || endDate) < today).length
    const activeItems = openItems.filter((item) => (item.start || project.startDate || today) <= today && (item.end || endDate) >= today).length
    const blocked = health.includes('??) || health.includes('憸券') || health.includes('敺?)
    let score = projectPriorityBaseScore(manual)
    const reasons = [`???芸?嚗?{manual}`]

    if (progress >= 100 || phase === '撌脣??? || phase === '撌脣?瘨?) {
      score -= 52
      reasons.push('撠?撌脣?????')
    } else {
      if (endDate < today) {
        score += 30
        reasons.push('撠?撌脤暹?')
      } else if (remainingDays <= 3) {
        score += 24
        reasons.push('3 憭拙?唳?')
      } else if (remainingDays <= 7) {
        score += 18
        reasons.push('7 憭拙?唳?')
      } else if (remainingDays <= 14) {
        score += 10
        reasons.push('14 憭拙?唳?')
      }
      if (blocked) {
        score += health.includes('擃◢??) || health.includes('??) ? 18 : 10
        reasons.push(`?亙熒摨佗?${project.health || '敺Ⅱ隤?}`)
      }
      if (overdueItems > 0) {
        score += Math.min(18, overdueItems * 6)
        reasons.push(`${overdueItems} ?遙?暹?`)
      }
      if (activeItems > 1) {
        score += Math.min(8, activeItems * 2)
        reasons.push(`${activeItems} ???桅脰?銝苜)
      }
      if (progress > 0 && progress < 35 && remainingDays <= 14) {
        score += 8
        reasons.push('?脣漲??')
      }
      if (phase === '?怎楨') {
        score -= 18
        reasons.push('撠??怎楨')
      }
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)))
    const label = finalScore >= 82 ? '蝺? : finalScore >= 62 ? '擃? : finalScore >= 35 ? '銝? : '雿?
    const tone = label === '蝺? || label === '擃? ? 'red' : label === '銝? ? 'amber' : 'green'
    return {
      manual,
      label,
      score: finalScore,
      tone,
      reason: reasons.slice(0, 3).join(' / '),
    }
  }

  function compareProjectsBySort(a, b) {
    if (projectSortMode === '????') return 0
    if (projectSortMode === '?唳???) return String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31')) || String(a.name).localeCompare(String(b.name), 'zh-Hant')
    if (projectSortMode === '?脣漲') return clampPercent(a.progress) - clampPercent(b.progress) || String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31'))
    if (projectSortMode === '?迂') return String(a.name).localeCompare(String(b.name), 'zh-Hant')
    const pa = getProjectPriorityMeta(a)
    const pb = getProjectPriorityMeta(b)
    return (pb.score - pa.score) || String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31')) || String(a.name).localeCompare(String(b.name), 'zh-Hant')
  }

  function normalizeTask(task = {}, project, index = 0) {
    const start = task.start || project.startDate
    const end = task.end || project.endDate
    const progress = clampPercent(task.progress)
    const done = progress >= 100
    const normalizedId = task.id || `${project.id || 'project'}-task-${index + 1}`
    return {
      ...task,
      id: normalizedId,
      name: task.name || '?芸?遙??,
      owner: task.owner || project.owner || 'Kyle',
      start: minIsoDate(start, end),
      end: maxIsoDate(end, start),
      progress,
      done,
      completedAt: done ? (task.completedAt || task.end || todayDate()) : '',
      dependsOnTaskId: task.dependsOnTaskId && task.dependsOnTaskId !== normalizedId ? task.dependsOnTaskId : '',
      manualProgress: Boolean(task.manualProgress),
      tone: task.tone || 'blue',
      subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((subtask, subIndex) => normalizeSubtask(subtask, project, task, index, subIndex)) : [],
    }
  }

  function normalizeSubtask(subtask = {}, project, task = {}, taskIndex = 0, subIndex = 0) {
    const taskStart = task.start || project.startDate
    const taskEnd = task.end || project.endDate
    const start = clampIsoDate(subtask.start || taskStart, taskStart, taskEnd)
    const end = clampIsoDate(subtask.end || taskEnd, start, taskEnd)
    const progress = clampPercent(subtask.progress)
    const done = progress >= 100
    return {
      ...subtask,
      id: subtask.id || `${project.id || 'project'}-task-${taskIndex + 1}-sub-${subIndex + 1}`,
      name: subtask.name || '?啣?摮遙??,
      owner: subtask.owner || task.owner || project.owner || 'Kyle',
      start,
      end,
      progress,
      done,
      completedAt: done ? (subtask.completedAt || subtask.end || todayDate()) : '',
      tone: subtask.tone || 'cyan',
    }
  }

  function getNextProjectId(current = projects) {
    const maxNumber = current.reduce((max, item) => {
      const matched = String(item.id || '').match(/PRJ-(\d+)/)
      return matched ? Math.max(max, Number(matched[1])) : max
    }, 0)
    return `PRJ-${String(maxNumber + 1).padStart(3, '0')}`
  }

  function normalizeProject(project = {}) {
    const startDate = project.startDate || todayDate()
    const endDate = project.endDate || addDaysDate(30)
    const base = {
      ...project,
      startDate,
      endDate,
      id: project.id || getNextProjectId(),
      name: project.name || '?芸??獢?,
      phase: project.phase || '閬?銝?,
      owner: project.owner || 'Kyle',
      health: project.health || '敺Ⅱ隤?,
      priority: PROJECT_PRIORITY_OPTIONS.includes(project.priority) ? project.priority : '銝?,
      next: project.next || '',
      tone: project.tone || 'blue',
      progress: clampPercent(project.progress),
      milestones: Array.isArray(project.milestones) ? project.milestones.map((milestone, index) => ({
        ...milestone,
        id: milestone.id || `${project.id || 'project'}-milestone-${index + 1}`,
        name: milestone.name || '?芸??蝔?',
        date: milestone.date || endDate,
        done: Boolean(milestone.done),
      })) : [],
      records: Array.isArray(project.records) ? project.records : [],
      related: Array.isArray(project.related) ? project.related : [],
    }
    return {
      ...base,
      tasks: Array.isArray(project.tasks) ? project.tasks.map((task, index) => normalizeTask(task, base, index)) : [],
    }
  }

  function createProject() {
    const today = todayDate()
    const nextMonth = addDaysDate(30)
    const taskId = stableId('task')
    const next = normalizeProject({
      id: getNextProjectId(),
      name: '?芸??獢?,
      phase: '閬?銝?,
      owner: 'Kyle',
      startDate: today,
      endDate: nextMonth,
      progress: 0,
      health: '敺Ⅱ隤?,
      priority: '銝?,
      tone: 'blue',
      next: '鋆?撠??格???蝔?鞎痊鈭箝?,
      related: [],
      tasks: [{ id: taskId, name: '撠???', owner: 'Kyle', start: today, end: nextMonth, progress: 0, done: false, tone: 'blue', subtasks: [] }],
      milestones: [{ id: stableId('milestone'), name: '??蝣箄?', date: today, done: false }],
      meetings: [],
      decisions: [],
      records: ['撱箇?撠???],
    })
    setProjects((rows) => [next, ...rows])
    setSelectedId(next.id)
    setDetailTab('overview')
    setProjectModalOpen(true)
  }

  function updateProject(projectId, patch, recordText) {
    setProjects((rows) => rows.map((project) => {
      if (project.id !== projectId) return project
      const next = normalizeProject({ ...project, ...patch })
      if (recordText) next.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚?{recordText}`, ...(project.records || [])].slice(0, 30)
      return next
    }))
  }

  function finalizeProjectDependencySchedule(projectId, recordText) {
    setProjects((rows) => rows.map((project) => {
      if (project.id !== projectId) return project
      const safeProject = normalizeProject(project)
      const scheduled = resolveProjectTaskDependencies(safeProject)
      const nextProject = normalizeProject(scheduled.project)
      nextProject.progress = estimateProjectProgress(nextProject)
      if (recordText || scheduled.changed) {
        const message = scheduled.changed ? `${recordText ? `${recordText}嚗 : ''}靘?蝵桐遙??????敺?隞餃?? : recordText
        nextProject.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚?{message}`, ...(safeProject.records || [])].slice(0, 30)
      }
      return nextProject
    }))
  }

  function estimateTaskProgress(task = {}) {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
    if (!subtasks.length) return clampPercent(task.progress)
    const values = subtasks.map((subtask) => clampPercent(subtask.progress))
    return Math.round(values.reduce((sum, progress) => sum + progress, 0) / Math.max(values.length, 1))
  }

  function taskDurationOffset(task = {}) {
    const start = task.start || todayDate()
    const end = task.end || start
    return Math.max(0, Math.round((parseDate(end) - parseDate(start)) / 86400000))
  }

  function shiftTaskWithSubtasks(task = {}, nextStart) {
    const previousStart = task.start || nextStart
    const durationOffset = taskDurationOffset(task)
    const deltaDays = Math.round((parseDate(nextStart) - parseDate(previousStart)) / 86400000)
    const nextEnd = addDaysToDateValue(nextStart, durationOffset)
    return {
      ...task,
      start: nextStart,
      end: nextEnd,
      subtasks: (task.subtasks || []).map((subtask) => {
        const subStart = addDaysToDateValue(subtask.start || previousStart, deltaDays)
        const subEnd = addDaysToDateValue(subtask.end || subtask.start || previousStart, deltaDays)
        return {
          ...subtask,
          start: clampIsoDate(subStart, nextStart, nextEnd),
          end: clampIsoDate(subEnd, subStart, nextEnd),
        }
      }),
    }
  }

  function getTaskDependencyFinishDate(task = {}) {
    const progress = clampPercent(task.progress)
    const isDone = Boolean(task.done) || progress >= 100
    if (isDone) return task.completedAt || task.end || todayDate()
    return task.end || todayDate()
  }

  function hasProjectTaskDependencyCycle(tasks = [], taskId, dependencyId) {
    if (!taskId || !dependencyId) return false
    let cursor = dependencyId
    const visited = new Set()
    while (cursor) {
      if (cursor === taskId) return true
      if (visited.has(cursor)) return true
      visited.add(cursor)
      const current = tasks.find((task) => task.id === cursor)
      cursor = current?.dependsOnTaskId || ''
    }
    return false
  }

  function resolveProjectTaskDependencies(project = {}) {
    let changed = false
    let tasks = (project.tasks || []).map((task) => ({ ...task, subtasks: (task.subtasks || []).map((subtask) => ({ ...subtask })) }))
    for (let pass = 0; pass < Math.max(tasks.length * 2, 1); pass += 1) {
      let passChanged = false
      tasks = tasks.map((task) => {
        if (!task.dependsOnTaskId) return task
        const predecessor = tasks.find((item) => item.id === task.dependsOnTaskId)
        if (!predecessor || predecessor.id === task.id || hasProjectTaskDependencyCycle(tasks, task.id, task.dependsOnTaskId)) {
          changed = true
          passChanged = true
          return { ...task, dependsOnTaskId: '' }
        }
        const nextStart = addDaysToDateValue(getTaskDependencyFinishDate(predecessor), 1)
        // ?蔭隞餃??啣?敺?敺?隞餃?閬??乓?蝵桀??敺?憭抬?
        // 銝?臬?拇?蔭??敺敺嚗??A 敺??敺敺矽?湔? B ????
        if ((task.start || project.startDate) === nextStart) return task
        changed = true
        passChanged = true
        return shiftTaskWithSubtasks(task, nextStart)
      })
      if (!passChanged) break
    }
    const allDates = [project.startDate, project.endDate]
    tasks.forEach((task) => {
      allDates.push(task.start, task.end)
      ;(task.subtasks || []).forEach((subtask) => allDates.push(subtask.start, subtask.end))
    })
    const safeDates = allDates.filter(Boolean).sort()
    const nextProject = {
      ...project,
      startDate: safeDates[0] && safeDates[0] < project.startDate ? safeDates[0] : project.startDate,
      endDate: safeDates[safeDates.length - 1] && safeDates[safeDates.length - 1] > project.endDate ? safeDates[safeDates.length - 1] : project.endDate,
      tasks,
    }
    return { project: nextProject, changed }
  }

  function getTaskDependencyMeta(project = {}, task = {}, taskIndex = 0) {
    if (!task?.dependsOnTaskId) return { hasDependency: false }
    const predecessor = (project.tasks || []).find((item) => item.id === task.dependsOnTaskId)
    if (!predecessor) return { hasDependency: false }
    const predecessorDone = Boolean(predecessor.done) || clampPercent(predecessor.progress) >= 100
    const startAfter = addDaysToDateValue(getTaskDependencyFinishDate(predecessor), 1)
    return {
      hasDependency: true,
      predecessor,
      predecessorName: predecessor.name || `隞餃? ${taskIndex + 1}`,
      predecessorDone,
      waiting: !predecessorDone,
      startAfter,
    }
  }

  function getTaskStatusMeta(project = {}, task = {}, taskIndex = 0) {
    const today = todayDate()
    const dependencyMeta = getTaskDependencyMeta(project, task, taskIndex)
    const progress = clampPercent(task.progress)
    const start = task.start || project.startDate || today
    const end = task.end || project.endDate || start
    if (Boolean(task.done) || progress >= 100) return { label: '撌脣???, tone: 'done' }
    if (dependencyMeta.waiting) return { label: '蝑??蔭', tone: 'waiting' }
    if (end < today) return { label: '?暹?', tone: 'overdue' }
    if (start > today) return { label: '?芷?憪?, tone: 'pending' }
    if (progress > 0) return { label: '?脰?銝?, tone: 'active' }
    return { label: '?芸???, tone: 'idle' }
  }

  function getSubtaskStatusMeta(project = {}, task = {}, subtask = {}) {
    const today = todayDate()
    const progress = clampPercent(subtask.progress)
    const start = subtask.start || task.start || project.startDate || today
    const end = subtask.end || task.end || project.endDate || start
    if (Boolean(subtask.done) || progress >= 100) return { label: '撌脣???, tone: 'done' }
    if (end < today) return { label: '?暹?', tone: 'overdue' }
    if (start > today) return { label: '?芷?憪?, tone: 'pending' }
    if (progress > 0) return { label: '?脰?銝?, tone: 'active' }
    return { label: '?芸???, tone: 'idle' }
  }

  function getAvailablePredecessorTasks(project = {}, taskIndex = 0) {
    const tasks = project.tasks || []
    const target = tasks[taskIndex]
    if (!target) return []
    return tasks.filter((task, index) => index !== taskIndex && !hasProjectTaskDependencyCycle(tasks, target.id, task.id))
  }

  function updateProjectTask(projectId, taskIndex, patch, recordText) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const safeProject = normalizeProject(project)
    const targetTask = safeProject.tasks[taskIndex]
    const safePatch = { ...patch }
    if (Object.prototype.hasOwnProperty.call(safePatch, 'dependsOnTaskId')) {
      const nextDependencyId = safePatch.dependsOnTaskId || ''
      safePatch.dependsOnTaskId = nextDependencyId && targetTask && !hasProjectTaskDependencyCycle(safeProject.tasks, targetTask.id, nextDependencyId) ? nextDependencyId : ''
    }
    const tasks = safeProject.tasks.map((task, index) => {
      if (index !== taskIndex) return task
      const start = safePatch.start || task.start || safeProject.startDate
      const end = safePatch.end || task.end || safeProject.endDate
      const manualProgress = Object.prototype.hasOwnProperty.call(safePatch, 'manualProgress')
        ? Boolean(safePatch.manualProgress)
        : Object.prototype.hasOwnProperty.call(safePatch, 'progress')
          ? true
          : Boolean(task.manualProgress)
      const merged = {
        ...task,
        ...safePatch,
        manualProgress,
        start: minIsoDate(start, end),
        end: maxIsoDate(end, start),
      }
      const nextProgress = Object.prototype.hasOwnProperty.call(safePatch, 'progress')
        ? clampPercent(safePatch.progress)
        : manualProgress
          ? clampPercent(task.progress)
          : estimateTaskProgress(merged)
      const nextDone = safePatch.done !== undefined ? Boolean(safePatch.done) : nextProgress >= 100
      const dateChanged = Object.prototype.hasOwnProperty.call(safePatch, 'start') || Object.prototype.hasOwnProperty.call(safePatch, 'end')
      const nextCompletedAt = nextDone
        ? (safePatch.completedAt || (dateChanged ? maxIsoDate(end, start) : task.completedAt || maxIsoDate(end, start) || todayDate()))
        : ''
      return normalizeTask({
        ...merged,
        progress: nextProgress,
        done: nextDone,
        completedAt: nextCompletedAt,
      }, safeProject, index)
    })
    const scheduled = resolveProjectTaskDependencies({ ...safeProject, tasks })
    const nextProject = normalizeProject(scheduled.project)
    const nextRecord = scheduled.changed ? `${recordText ? `${recordText}嚗 : ''}靘?蝵桐遙?????蝥遙? : recordText
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, nextRecord)
  }

  function autoEstimateProjectTask(projectId, taskIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const safeProject = normalizeProject(project)
    const targetTask = safeProject.tasks[taskIndex]
    if (!targetTask) return
    const nextProgress = estimateTaskProgress(targetTask)
    updateProjectTask(projectId, taskIndex, { progress: nextProgress, manualProgress: false, done: nextProgress >= 100 }, `靘?隞餃??芸?隡啁?隞餃??脣漲??${nextProgress}%?)
  }

  function addProjectTask(projectId) {
    const project = normalizeProject(projects.find((item) => item.id === projectId))
    if (!project?.id) return
    const taskStart = project.startDate
    const taskEnd = minIsoDate(addDaysToDateValue(taskStart, 6), project.endDate)
    const tasks = [
      ...project.tasks,
      {
        id: stableId('task'),
        name: `?啣?隞餃? ${project.tasks.length + 1}`,
        owner: project.owner || 'Kyle',
        start: taskStart,
        end: maxIsoDate(taskEnd, taskStart),
        progress: 0,
        done: false,
        tone: 'blue',
        subtasks: [],
      },
    ]
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, scheduled.changed ? '?啣?撠?隞餃?嚗??蔭隞餃??芸????? : '?啣?撠?隞餃???)
  }

  function removeProjectTask(projectId, taskIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const target = (project.tasks || [])[taskIndex]
    if (!confirmDestructiveAction(target?.name || '撠?隞餃?')) return
    const removedTaskId = target?.id
    const tasks = (project.tasks || [])
      .filter((_, index) => index !== taskIndex)
      .map((task) => task.dependsOnTaskId === removedTaskId ? { ...task, dependsOnTaskId: '' } : task)
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '?芷撠?隞餃?嚗蒂皜?賊??蔭隞餃???)
  }

  function updateProjectSubtask(projectId, taskIndex, subtaskIndex, patch, recordText) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const safeProject = normalizeProject(project)
    const tasks = safeProject.tasks.map((task, index) => {
      if (index !== taskIndex) return task
      const subtasks = (task.subtasks || []).map((subtask, subIndex) => {
        if (subIndex !== subtaskIndex) return subtask
        const start = patch.start || subtask.start || task.start || safeProject.startDate
        const end = patch.end || subtask.end || task.end || safeProject.endDate
        const nextProgress = patch.progress === undefined ? clampPercent(subtask.progress) : clampPercent(patch.progress)
        const nextDone = patch.done !== undefined ? Boolean(patch.done) : nextProgress >= 100
        return normalizeSubtask({
          ...subtask,
          ...patch,
          start: clampIsoDate(start, task.start || safeProject.startDate, task.end || safeProject.endDate),
          end: clampIsoDate(end, start, task.end || safeProject.endDate),
          progress: nextProgress,
          done: nextDone,
          completedAt: nextDone ? (patch.completedAt || subtask.completedAt || todayDate()) : '',
        }, safeProject, task, index, subIndex)
      })
      const nextTask = { ...task, subtasks }
      if (nextTask.manualProgress) return nextTask
      const nextProgress = estimateTaskProgress(nextTask)
      return { ...nextTask, progress: nextProgress, done: nextProgress >= 100 }
    })
    const nextProject = normalizeProject({ ...safeProject, tasks })
    updateProject(projectId, { tasks, progress: estimateProjectProgress(nextProject) }, recordText)
  }

  function addProjectSubtask(projectId, taskIndex) {
    const project = normalizeProject(projects.find((item) => item.id === projectId))
    if (!project?.id) return
    const tasks = project.tasks.map((task, index) => {
      if (index !== taskIndex) return task
      const taskStart = task.start || project.startDate
      const taskEnd = task.end || project.endDate
      const subtaskStart = taskStart
      const subtaskEnd = minIsoDate(addDaysToDateValue(subtaskStart, 2), taskEnd)
      const nextSubtaskCount = (task.subtasks || []).length + 1
      const subtasks = [
        ...(task.subtasks || []),
        {
          id: stableId('subtask'),
          name: `?啣?摮遙??${nextSubtaskCount}`,
          owner: task.owner || project.owner || 'Kyle',
          start: subtaskStart,
          end: maxIsoDate(subtaskEnd, subtaskStart),
          progress: 0,
          done: false,
          tone: 'cyan',
        },
      ]
      const nextTask = { ...task, subtasks }
      if (nextTask.manualProgress) return nextTask
      const nextProgress = estimateTaskProgress(nextTask)
      return { ...nextTask, progress: nextProgress, done: nextProgress >= 100 }
    })
    setGanttShowSubtasks(true)
    const targetTask = project.tasks?.[taskIndex]
    if (targetTask) {
      const taskKey = getGanttTaskToggleKey(project, targetTask, taskIndex)
      setGanttExpandedTasks((rows) => ({ ...rows, [taskKey]: true }))
    }
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '?啣?摮遙??)
  }

  function removeProjectSubtask(projectId, taskIndex, subtaskIndex) {
    const project = normalizeProject(projects.find((item) => item.id === projectId))
    if (!project?.id) return
    const target = project.tasks?.[taskIndex]?.subtasks?.[subtaskIndex]
    if (!confirmDestructiveAction(target?.name || '摮遙??)) return
    const tasks = project.tasks.map((task, index) => {
      if (index !== taskIndex) return task
      const nextTask = { ...task, subtasks: (task.subtasks || []).filter((_, subIndex) => subIndex !== subtaskIndex) }
      if (nextTask.manualProgress || !(nextTask.subtasks || []).length) return nextTask
      const nextProgress = estimateTaskProgress(nextTask)
      return { ...nextTask, progress: nextProgress, done: nextProgress >= 100 }
    })
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '?芷摮遙??)
  }

  function getGanttTaskKey(project, task, index) {
    return `${project?.id || 'project'}-${task?.id || `task-${index}`}`
  }

  function getGanttSubtaskKey(project, task, subtask, taskIndex, subIndex) {
    return `${project?.id || 'project'}-${task?.id || `task-${taskIndex}`}-${subtask?.id || `subtask-${subIndex}`}`
  }


  function getGanttTaskToggleKey(project, task, taskIndex) {
    return `${project?.id || 'project'}::${task?.id || `task-${taskIndex}`}`
  }

  function isGanttTaskSubtasksOpen(project, task, taskIndex) {
    const key = getGanttTaskToggleKey(project, task, taskIndex)
    return ganttExpandedTasks[key] ?? ganttShowSubtasks
  }

  function toggleGanttTaskSubtasks(project, task, taskIndex) {
    const key = getGanttTaskToggleKey(project, task, taskIndex)
    const current = isGanttTaskSubtasksOpen(project, task, taskIndex)
    setGanttExpandedTasks((rows) => ({ ...rows, [key]: !current }))
  }

  function toggleAllGanttSubtasks() {
    setGanttShowSubtasks((value) => !value)
    setGanttExpandedTasks({})
  }

  function updateProjectMilestone(projectId, milestoneIndex, patch, recordText) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const milestones = (project.milestones || []).map((milestone, index) => index === milestoneIndex ? { ...milestone, ...patch } : milestone)
    updateProject(projectId, { milestones }, recordText)
  }

  function addProjectMilestone(projectId) {
    const project = normalizeProject(projects.find((item) => item.id === projectId))
    if (!project?.id) return
    const milestones = [...project.milestones, { id: stableId('milestone'), name: '?啣???蝣?, date: project.endDate, done: false }]
    updateProject(projectId, { milestones }, '?啣???蝣?)
    setDetailTab('milestones')
  }

  function removeProjectMilestone(projectId, milestoneIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const target = (project.milestones || [])[milestoneIndex]
    if (!confirmDestructiveAction(target?.name || '??蝣?)) return
    const milestones = (project.milestones || []).filter((_, index) => index !== milestoneIndex)
    updateProject(projectId, { milestones }, '?芷??蝣?)
  }

  function duplicateProject(project) {
    if (!project) return
    const next = normalizeProject({
      ...project,
      id: getNextProjectId(projects),
      name: `${project.name || '?芸??獢?} 銴`,
      progress: 0,
      health: '敺Ⅱ隤?,
      records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}嚚 ${project.id} 銴ˊ?],
    })
    next.tasks = next.tasks.map((task) => ({ ...task, id: stableId('task'), subtasks: (task.subtasks || []).map((subtask) => ({ ...subtask, id: stableId('subtask') })) }))
    next.milestones = next.milestones.map((milestone) => ({ ...milestone, id: stableId('milestone') }))
    setProjects((rows) => [next, ...rows])
    setSelectedId(next.id)
    setDetailTab('overview')
    setProjectModalOpen(true)
  }

  function deleteProject(projectId) {
    const target = projects.find((project) => project.id === projectId)
    if (!confirmDestructiveAction(target?.name || projectId || '撠?')) return
    setProjects((rows) => {
      const next = rows.filter((project) => project.id !== projectId)
      setSelectedId(next[0]?.id)
      if (!next.length) setProjectModalOpen(false)
      return next
    })
  }

  function reorderProjects(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return
    setProjects((rows) => {
      const next = [...rows]
      const fromIndex = next.findIndex((item) => item.id === dragId)
      const toIndex = next.findIndex((item) => item.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return rows
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  function openProject(projectId) {
    if (!projectId) return
    setSelectedId(projectId)
    setManualRecordText('')
    setProjectModalOpen(true)
  }

  function closeProjectModal() {
    setProjectModalOpen(false)
    setGanttProgressEditor(null)
    setGanttDragPreview(null)
  }

  function getProjectDragProps(projectId) {
    return {
      draggable: true,
      onDragStart: () => setDraggingProjectId(projectId),
      onDragEnd: () => {
        setDraggingProjectId(null)
        setDropProjectId(null)
      },
      onDragOver: (event) => {
        event.preventDefault()
        if (draggingProjectId && draggingProjectId !== projectId) setDropProjectId(projectId)
      },
      onDrop: (event) => {
        event.preventDefault()
        reorderProjects(draggingProjectId, projectId)
        setDraggingProjectId(null)
        setDropProjectId(null)
      },
    }
  }

  function handleProjectKeyDown(projectId, event) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openProject(projectId)
  }

  const filteredProjects = useMemo(() => {
    const keyword = projectKeyword.trim().toLowerCase()
    return projects
      .map(normalizeProject)
      .filter((project) => projectPhaseFilter === '?券' || project.phase === projectPhaseFilter)
      .filter((project) => projectHealthFilter === '?券' || project.health === projectHealthFilter)
      .filter((project) => projectPriorityFilter === '?券' || project.priority === projectPriorityFilter || getProjectPriorityMeta(project).label === projectPriorityFilter)
      .filter((project) => {
        if (!keyword) return true
        return [
          project.id,
          project.name,
          project.phase,
          project.owner,
          project.health,
          project.priority,
          getProjectPriorityMeta(project).label,
          project.next,
          ...(project.related || []),
          ...(project.records || []),
          ...(project.tasks || []).map((task) => `${task.name} ${task.owner} ${(task.subtasks || []).map((subtask) => `${subtask.name} ${subtask.owner}`).join(' ')}`),
          ...(project.milestones || []).map((milestone) => milestone.name),
        ].join(' ').toLowerCase().includes(keyword)
      })
      .sort(compareProjectsBySort)
  }, [projects, projectKeyword, projectPhaseFilter, projectHealthFilter, projectPriorityFilter, projectSortMode])

  const projectPhaseOptions = useMemo(() => ['?券', ...Array.from(new Set([...PROJECT_PHASE_OPTIONS, ...projects.map((project) => project.phase)].filter(Boolean)))], [projects])
  const projectHealthOptions = useMemo(() => ['?券', ...Array.from(new Set([...PROJECT_HEALTH_OPTIONS, ...projects.map((project) => project.health)].filter(Boolean)))], [projects])
  const projectPriorityOptions = useMemo(() => ['?券', ...PROJECT_PRIORITY_OPTIONS], [])
  const selectedProject = normalizeProject(projects.find((project) => project.id === selectedId) || filteredProjects[0] || projects[0] || {})
  const hasSelectedProject = Boolean(selectedProject?.id)
  const avgProgress = Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / Math.max(projects.length, 1))
  const riskCount = projects.filter((project) => project.tone === 'red' || String(project.health || '').includes('敺?) || String(project.health || '').includes('??) || String(project.health || '').includes('憸券')).length
  const overdueProjects = projects.filter((project) => project.endDate && project.endDate < todayDate() && Number(project.progress || 0) < 100).length
  const highPriorityProjects = projects.map(normalizeProject).filter((project) => getProjectPriorityMeta(project).score >= 62 && clampPercent(project.progress) < 100).length
  const projectPageTotal = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize))
  const safeProjectPage = Math.min(projectPage, projectPageTotal)
  const projectPageStart = (safeProjectPage - 1) * projectPageSize
  const paginatedProjects = filteredProjects.slice(projectPageStart, projectPageStart + projectPageSize)
  const selectedRelatedTasks = hasSelectedProject ? tickets.filter((task) => task.relatedProject === selectedProject.id) : []
  const doneMilestones = hasSelectedProject ? selectedProject.milestones.filter((item) => item.done).length : 0

  useEffect(() => {
    setProjectPage((current) => Math.min(current, projectPageTotal))
  }, [projectPageTotal])

  useEffect(() => {
    setProjectPageInput(String(safeProjectPage))
  }, [safeProjectPage])

  function commitProjectPageInput(value = projectPageInput) {
    const nextPage = Math.max(1, Math.min(projectPageTotal, Number(value) || 1))
    setProjectPage(nextPage)
    setProjectPageInput(String(nextPage))
  }

  function estimateProjectProgress(project) {
    const tasks = project?.tasks || []
    if (!tasks.length) return Number(project?.progress || 0)
    const taskValues = tasks.map((task) => {
      const subtasks = task.subtasks || []
      if (subtasks.length) return Math.round(subtasks.reduce((sum, subtask) => sum + Number(subtask.progress || 0), 0) / subtasks.length)
      return Number(task.progress || 0)
    })
    return Math.round(taskValues.reduce((sum, progress) => sum + progress, 0) / taskValues.length)
  }

  function autoEstimateSelectedProject() {
    if (!hasSelectedProject) return
    const tasks = selectedProject.tasks || []
    if (!tasks.length) return
    const nextProgress = estimateProjectProgress(selectedProject)
    updateProject(selectedProject.id, { progress: nextProgress }, `靘?${tasks.length} ?遙??摮遙?摯蝞 ${nextProgress}%?)
  }

  function createWorkItemFromProjectTask(project, task) {
    if (!task || !onCreateWorkItem) return
    const dueDate = task.end || project.endDate || todayDate()
    onCreateWorkItem({
      title: `${project.name}嚚?{task.name}`,
      status: Number(task.progress || 0) >= 100 ? '撌脣??? : '敺???,
      priority: Number(task.progress || 0) >= 100 ? '雿? : '銝?,
      dueDate,
      owner: task.owner || project.owner || 'Kyle',
      category: '撠?',
      next: `餈質馱 ${project.name} / ${task.name}`,
      relatedProject: project.id,
      channel: '撠?蝞∠?',
      sourceType: 'project-task',
      sourceId: `${project.id}-${task.id || task.name}`,
    })
    updateProject(project.id, {}, `撌脩隞餃???{task.name}?遣蝡??脣極雿)
  }

  function exportProjectSummary() {
    const headers = ['蝺刻?', '撠?', '?挾', '鞎痊鈭?, '??', '蝯?', '?脣漲', '?亙熒摨?, '銝?甇?, '隞餃???, '摮遙?', '??蝣']
    const rows = filteredProjects.map((project) => [
      project.id, project.name, project.phase, project.owner, project.startDate, project.endDate, project.progress, project.health, project.next,
      (project.tasks || []).length, (project.tasks || []).reduce((sum, task) => sum + (task.subtasks || []).length, 0), (project.milestones || []).length,
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    downloadFlowdeskText(`FlowDesk撠???_${todayDate()}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8;')
  }

  function addManualProjectRecord() {
    if (!hasSelectedProject) return
    const text = manualRecordText.trim()
    if (!text) return
    updateProject(selectedProject.id, {}, text)
    setManualRecordText('')
  }

  function dateRangeLabel(start, end) {
    return `${formatMonthDayWeekday(start)} ??${formatMonthDayWeekday(end)}嚚 ${daysBetween(start, end) + 1} 憭奈
  }

  function updateGanttDragPreview(projectId, scope, taskIndex, subtaskIndex, start, end, edge) {
    setGanttDragPreview({
      projectId,
      scope,
      taskIndex,
      subtaskIndex,
      start,
      end,
      edge,
      label: dateRangeLabel(start, end),
    })
  }

  function openGanttProgressEditor(scope, projectId, taskIndex, subtaskIndex, value, event) {
    event.preventDefault()
    event.stopPropagation()
    setGanttProgressEditor({ scope, projectId, taskIndex, subtaskIndex, value: clampPercent(value) })
  }

  function closeGanttProgressEditor(event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    setGanttProgressEditor(null)
  }

  function applyGanttProgressValue(scope, projectId, taskIndex, subtaskIndex, nextValue) {
    const safeValue = clampPercent(nextValue)
    setGanttProgressEditor((current) => current ? { ...current, value: safeValue } : current)
    if (scope === 'project') {
      updateProject(projectId, { progress: safeValue })
      return
    }
    if (scope === 'subtask') {
      updateProjectSubtask(projectId, taskIndex, subtaskIndex, { progress: safeValue, done: safeValue >= 100 })
      return
    }
    updateProjectTask(projectId, taskIndex, { progress: safeValue, done: safeValue >= 100 })
  }

  function renderGanttProgressEditor(scope, projectId, taskIndex, subtaskIndex, value, label) {
    const isActive = ganttProgressEditor?.scope === scope && ganttProgressEditor?.projectId === projectId && ganttProgressEditor?.taskIndex === taskIndex && ganttProgressEditor?.subtaskIndex === subtaskIndex
    if (!isActive) return null
    const currentValue = ganttProgressEditor?.value ?? value
    return (
      <div className="fd203-gantt-progress-pop" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <div className="fd203-gantt-progress-pop-head">
          <strong>{label}</strong>
          <button type="button" onClick={closeGanttProgressEditor}>摰?</button>
        </div>
        <div className="fd203-gantt-progress-pop-body">
          <input type="range" min="0" max="100" value={currentValue} onChange={(event) => applyGanttProgressValue(scope, projectId, taskIndex, subtaskIndex, event.target.value)} aria-label={`${label}?脣漲`} />
          <div className="fd203-gantt-progress-inline">
            <input type="number" min="0" max="100" value={currentValue} onChange={(event) => applyGanttProgressValue(scope, projectId, taskIndex, subtaskIndex, event.target.value)} aria-label={`${label}?脣漲?曉?瘥} />
            <span>%</span>
          </div>
        </div>
      </div>
    )
  }

  function startGanttDateDrag(project, scope, taskIndex, edge, event, subtaskIndex = null) {
    event.preventDefault()
    event.stopPropagation()
    setGanttProgressEditor(null)
    const safeProject = normalizeProject(project)
    const track = event.currentTarget.closest('.fd203-gantt-track')
    const trackWidth = Math.max(track?.getBoundingClientRect?.().width || 1, 1)
    const dragTimelineRange = getProjectGanttRange(safeProject)
    const displayStart = dragTimelineRange.start
    const displayEnd = dragTimelineRange.end
    setGanttDragRange({ projectId: safeProject.id, start: displayStart, end: displayEnd })
    const rangeDays = Math.max(1, daysBetween(displayStart, displayEnd))
    const pixelsPerDay = Math.max(2, trackWidth / rangeDays)
    const startX = event.clientX
    const originalProjectStart = safeProject.startDate
    const originalProjectEnd = safeProject.endDate
    const originalProjectDuration = Math.max(0, Math.round((parseDate(originalProjectEnd) - parseDate(originalProjectStart)) / 86400000))
    const originalTask = scope === 'task' || scope === 'subtask' ? (safeProject.tasks || [])[taskIndex] : null
    const originalTaskStart = originalTask?.start || originalProjectStart
    const originalTaskEnd = originalTask?.end || originalProjectEnd
    const originalTaskDuration = Math.max(0, Math.round((parseDate(originalTaskEnd) - parseDate(originalTaskStart)) / 86400000))
    const originalSubtask = scope === 'subtask' ? (originalTask?.subtasks || [])[subtaskIndex] : null
    const originalSubtaskStart = originalSubtask?.start || originalTaskStart
    const originalSubtaskEnd = originalSubtask?.end || originalTaskEnd
    const originalSubtaskDuration = Math.max(0, Math.round((parseDate(originalSubtaskEnd) - parseDate(originalSubtaskStart)) / 86400000))

    updateGanttDragPreview(
      safeProject.id,
      scope,
      taskIndex,
      subtaskIndex,
      scope === 'project' ? originalProjectStart : scope === 'subtask' ? originalSubtaskStart : originalTaskStart,
      scope === 'project' ? originalProjectEnd : scope === 'subtask' ? originalSubtaskEnd : originalTaskEnd,
      edge,
    )
    document.body.classList.add('gantt-date-dragging')

    const clampTaskMoveDelta = (deltaDays) => {
      const earliestDelta = Math.round((parseDate(originalProjectStart) - parseDate(originalTaskStart)) / 86400000)
      const latestDelta = Math.round((parseDate(originalProjectEnd) - parseDate(originalTaskEnd)) / 86400000)
      return Math.max(earliestDelta, Math.min(latestDelta, deltaDays))
    }

    const clampSubtaskMoveDelta = (deltaDays) => {
      const earliestDelta = Math.round((parseDate(originalTaskStart) - parseDate(originalSubtaskStart)) / 86400000)
      const latestDelta = Math.round((parseDate(originalTaskEnd) - parseDate(originalSubtaskEnd)) / 86400000)
      return Math.max(earliestDelta, Math.min(latestDelta, deltaDays))
    }

    const applyMove = (moveEvent) => {
      const deltaDays = Math.round((moveEvent.clientX - startX) / pixelsPerDay)
      if (scope === 'project') {
        if (edge === 'move') {
          const nextStart = addDaysToDateValue(originalProjectStart, deltaDays)
          const nextEnd = addDaysToDateValue(nextStart, originalProjectDuration)
          const shiftedTasks = (safeProject.tasks || []).map((task) => ({
            ...task,
            start: addDaysToDateValue(task.start || originalProjectStart, deltaDays),
            end: addDaysToDateValue(task.end || originalProjectEnd, deltaDays),
            subtasks: (task.subtasks || []).map((subtask) => ({
              ...subtask,
              start: addDaysToDateValue(subtask.start || task.start || originalProjectStart, deltaDays),
              end: addDaysToDateValue(subtask.end || task.end || originalProjectEnd, deltaDays),
            })),
          }))
          const shiftedMilestones = (safeProject.milestones || []).map((milestone) => ({ ...milestone, date: addDaysToDateValue(milestone.date || originalProjectEnd, deltaDays) }))
          updateGanttDragPreview(safeProject.id, 'project', null, null, nextStart, nextEnd, edge)
          updateProject(safeProject.id, { startDate: nextStart, endDate: nextEnd, tasks: shiftedTasks, milestones: shiftedMilestones })
        } else if (edge === 'start') {
          const nextStart = minIsoDate(addDaysToDateValue(originalProjectStart, deltaDays), originalProjectEnd)
          updateGanttDragPreview(safeProject.id, 'project', null, null, nextStart, originalProjectEnd, edge)
          updateProject(safeProject.id, { startDate: nextStart })
        } else {
          const nextEnd = maxIsoDate(addDaysToDateValue(originalProjectEnd, deltaDays), originalProjectStart)
          updateGanttDragPreview(safeProject.id, 'project', null, null, originalProjectStart, nextEnd, edge)
          updateProject(safeProject.id, { endDate: nextEnd })
        }
        return
      }

      if (scope === 'task' && originalTask) {
        if (edge === 'move') {
          const safeDelta = clampTaskMoveDelta(deltaDays)
          const nextStart = addDaysToDateValue(originalTaskStart, safeDelta)
          const nextEnd = addDaysToDateValue(nextStart, originalTaskDuration)
          const shiftedSubtasks = (originalTask.subtasks || []).map((subtask) => ({
            ...subtask,
            start: addDaysToDateValue(subtask.start || originalTaskStart, safeDelta),
            end: addDaysToDateValue(subtask.end || originalTaskEnd, safeDelta),
          }))
          updateGanttDragPreview(safeProject.id, 'task', taskIndex, null, nextStart, nextEnd, edge)
          updateProjectTask(safeProject.id, taskIndex, { start: nextStart, end: nextEnd, subtasks: shiftedSubtasks })
        } else if (edge === 'start') {
          const nextStart = clampIsoDate(addDaysToDateValue(originalTaskStart, deltaDays), originalProjectStart, originalTaskEnd)
          updateGanttDragPreview(safeProject.id, 'task', taskIndex, null, nextStart, originalTaskEnd, edge)
          updateProjectTask(safeProject.id, taskIndex, { start: nextStart })
        } else {
          const nextEnd = clampIsoDate(addDaysToDateValue(originalTaskEnd, deltaDays), originalTaskStart, originalProjectEnd)
          updateGanttDragPreview(safeProject.id, 'task', taskIndex, null, originalTaskStart, nextEnd, edge)
          updateProjectTask(safeProject.id, taskIndex, { end: nextEnd })
        }
        return
      }

      if (scope === 'subtask' && originalSubtask) {
        if (edge === 'move') {
          const safeDelta = clampSubtaskMoveDelta(deltaDays)
          const nextStart = addDaysToDateValue(originalSubtaskStart, safeDelta)
          const nextEnd = addDaysToDateValue(nextStart, originalSubtaskDuration)
          updateGanttDragPreview(safeProject.id, 'subtask', taskIndex, subtaskIndex, nextStart, nextEnd, edge)
          updateProjectSubtask(safeProject.id, taskIndex, subtaskIndex, { start: nextStart, end: nextEnd })
        } else if (edge === 'start') {
          const nextStart = clampIsoDate(addDaysToDateValue(originalSubtaskStart, deltaDays), originalTaskStart, originalSubtaskEnd)
          updateGanttDragPreview(safeProject.id, 'subtask', taskIndex, subtaskIndex, nextStart, originalSubtaskEnd, edge)
          updateProjectSubtask(safeProject.id, taskIndex, subtaskIndex, { start: nextStart })
        } else {
          const nextEnd = clampIsoDate(addDaysToDateValue(originalSubtaskEnd, deltaDays), originalSubtaskStart, originalTaskEnd)
          updateGanttDragPreview(safeProject.id, 'subtask', taskIndex, subtaskIndex, originalSubtaskStart, nextEnd, edge)
          updateProjectSubtask(safeProject.id, taskIndex, subtaskIndex, { end: nextEnd })
        }
      }
    }

    const stopMove = () => {
      document.body.classList.remove('gantt-date-dragging')
      setGanttDragRange(null)
      setGanttDragPreview(null)
      window.removeEventListener('pointermove', applyMove)
      window.removeEventListener('pointerup', stopMove)
      const actionText = edge === 'move' ? '撟喟宏' : '隤踵'
      const scopeText = scope === 'project' ? '撠?' : scope === 'subtask' ? '摮遙?? : '隞餃?'
      finalizeProjectDependencySchedule(safeProject.id, `雿輻???{actionText}${scopeText}???)
    }

    window.addEventListener('pointermove', applyMove)
    window.addEventListener('pointerup', stopMove, { once: true })
  }

  function getProjectListInfo(project = {}) {
    const today = todayDate()
    const flatItems = (project.tasks || []).flatMap((task, taskIndex) => {
      const taskLabel = task.name || `隞餃? ${taskIndex + 1}`
      const taskItem = {
        type: '隞餃?',
        name: taskLabel,
        label: taskLabel,
        start: task.start || project.startDate,
        end: task.end || project.endDate,
        progress: clampPercent(task.progress),
        done: Boolean(task.done) || clampPercent(task.progress) >= 100,
      }
      const subItems = (task.subtasks || []).map((subtask, subIndex) => {
        const subLabel = subtask.name || `摮遙??${subIndex + 1}`
        return {
          type: '摮遙??,
          name: subLabel,
          label: `${taskLabel} / ${subLabel}`,
          start: subtask.start || task.start || project.startDate,
          end: subtask.end || task.end || project.endDate,
          progress: clampPercent(subtask.progress),
          done: Boolean(subtask.done) || clampPercent(subtask.progress) >= 100,
        }
      })
      return [taskItem, ...subItems]
    })

    const openItems = flatItems.filter((item) => !item.done)
    const itemRank = (item) => (item.type === '隞餃?' ? 0 : 1)
    const sortByWorkPriority = (a, b) => (
      (itemRank(a) - itemRank(b)) ||
      String(a.start).localeCompare(String(b.start)) ||
      String(a.end).localeCompare(String(b.end)) ||
      String(a.label).localeCompare(String(b.label))
    )
    const currentItems = openItems
      .filter((item) => item.start <= today && item.end >= today)
      .sort((a, b) => (itemRank(a) - itemRank(b)) || (b.progress - a.progress) || String(a.end).localeCompare(String(b.end)) || String(a.label).localeCompare(String(b.label)))
    const activeItems = openItems
      .filter((item) => item.progress > 0 && item.progress < 100 && item.start <= today)
      .sort((a, b) => (itemRank(a) - itemRank(b)) || (b.progress - a.progress) || String(a.end).localeCompare(String(b.end)) || String(a.label).localeCompare(String(b.label)))
    const upcomingItems = openItems
      .filter((item) => item.start > today)
      .sort(sortByWorkPriority)
    const fallbackItems = openItems
      .filter((item) => item.start >= today)
      .sort(sortByWorkPriority)
    const runningItem = currentItems[0] || activeItems[0] || fallbackItems[0] || openItems[0]
    const nextItem = upcomingItems.find((item) => !runningItem || item.label !== runningItem.label) || null
    const manualNext = String(project.next || '').trim()
    const activeTexts = [...currentItems, ...activeItems]
      .map((item) => `${item.name} ${item.label}`.trim())
      .filter(Boolean)
    const manualLooksActive = manualNext && activeTexts.some((text) => text.includes(manualNext) || manualNext.includes(text.split(' / ').pop()))

    return {
      running: runningItem ? `${runningItem.type}嚗?{runningItem.label}` : '撠閮剖?甇??脰?',
      next: nextItem
        ? `${nextItem.type}嚗?{nextItem.label}`
        : manualNext && !manualLooksActive
          ? manualNext
          : '撠閮剖?銝?甇?,
    }
  }


  function getProjectStatusMeta(project = {}) {
    const today = todayDate()
    const safeProject = normalizeProject(project)
    const progress = clampPercent(safeProject.progress)
    const listInfo = getProjectListInfo(safeProject)
    const taskItems = (safeProject.tasks || []).flatMap((task) => [
      { ...task, type: '隞餃?', parentName: '' },
      ...((task.subtasks || []).map((subtask) => ({ ...subtask, type: '摮遙??, parentName: task.name || '?芸?遙?? }))),
    ])
    const openItems = taskItems.filter((item) => !(Boolean(item.done) || clampPercent(item.progress) >= 100))
    const overdueItems = openItems.filter((item) => (item.end || safeProject.endDate) < today)
    const startedZeroItems = openItems.filter((item) => (item.start || safeProject.startDate) <= today && clampPercent(item.progress) <= 0)
    const remainingDays = daysBetween(today, safeProject.endDate || today)
    const notices = []
    if (progress >= 100 || safeProject.phase === '撌脣???) notices.push({ label: '撌脣???, tone: 'done' })
    else {
      if ((safeProject.endDate || today) < today) notices.push({ label: '撠??暹?', tone: 'danger' })
      else if (remainingDays <= 3) notices.push({ label: `${remainingDays} 憭拙?唳?`, tone: 'danger' })
      else if (remainingDays <= 7) notices.push({ label: `${remainingDays} 憭拙??唳?`, tone: 'warning' })
      if (overdueItems.length) notices.push({ label: `${overdueItems.length} 隞餃??暹?`, tone: 'danger' })
      if (String(safeProject.health || '').includes('??) || String(safeProject.health || '').includes('憸券')) notices.push({ label: safeProject.health, tone: 'danger' })
      if (String(safeProject.health || '').includes('敺?)) notices.push({ label: safeProject.health, tone: 'warning' })
      if (listInfo.running === '撠閮剖?甇??脰?') notices.push({ label: '?⊿脰?銝?, tone: 'muted' })
      if (listInfo.next === '撠閮剖?銝?甇?) notices.push({ label: '?∩?銝甇?, tone: 'muted' })
      if (startedZeroItems.length) notices.push({ label: `${startedZeroItems.length} ???`, tone: 'warning' })
    }
    const fallback = progress >= 100 ? '撠?撌脣??? : '甇?虜?券?
    return {
      notices: notices.slice(0, 4),
      summary: notices.length ? notices.slice(0, 3).map((item) => item.label).join(' / ') : fallback,
      overdueItems,
      remainingDays,
    }
  }

  function buildProjectAttentionSummary(rows = filteredProjects) {
    const today = todayDate()
    const openRows = rows.map(normalizeProject).filter((project) => clampPercent(project.progress) < 100 && project.phase !== '撌脣??? && project.phase !== '撌脣?瘨?)
    const overdue = openRows.filter((project) => (project.endDate || today) < today)
    const dueSoon = openRows.filter((project) => (project.endDate || today) >= today && daysBetween(today, project.endDate || today) <= 7)
    const highPriority = openRows.filter((project) => getProjectPriorityMeta(project).score >= 62)
    const noNext = openRows.filter((project) => getProjectListInfo(project).next === '撠閮剖?銝?甇?)
    const noRunning = openRows.filter((project) => getProjectListInfo(project).running === '撠閮剖?甇??脰?')
    const overdueTasks = openRows.reduce((sum, project) => sum + getProjectStatusMeta(project).overdueItems.length, 0)
    return { overdue, dueSoon, highPriority, noNext, noRunning, overdueTasks }
  }

  const attentionSummary = buildProjectAttentionSummary(filteredProjects)

  function renderProjectCard(project) {
    const isActive = selectedProject?.id === project.id && projectModalOpen
    const estimated = estimateProjectProgress(project)
    const listInfo = getProjectListInfo(project)
    const priorityMeta = getProjectPriorityMeta(project)
    return (
      <div key={project.id} className="fd203-project-entry">
        <article
          {...getProjectDragProps(project.id)}
          role="button"
          tabIndex={0}
          className={[
            'fd203-project-card',
            isActive ? 'active' : '',
            draggingProjectId === project.id ? 'dragging' : '',
            dropProjectId === project.id ? 'drop-target' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => openProject(project.id)}
          onKeyDown={(event) => handleProjectKeyDown(project.id, event)}
          title="暺???撠?敶?嚗??唾矽?湧?摨?
        >
          <div className="fd203-project-card-head">
            <span className="record-id">??{project.id}</span>
            <span className={`fd203-priority-chip ${priorityMeta.tone}`}>?芸? {priorityMeta.label} 繚 {priorityMeta.score}</span>
          </div>
          <div className="fd203-project-card-title">
            <strong>{project.name || '?芸??獢?}</strong>
            <span className="fd203-project-title-badges"><Badge value={project.phase || '?芸??挾'} /><Badge value={project.health} /></span>
          </div>
          <div className="fd203-project-priority-reason"><span>?芸?靘?</span><strong>{priorityMeta.reason}</strong></div>
          <div className="fd203-status-chip-row">{getProjectStatusMeta(project).notices.length ? getProjectStatusMeta(project).notices.map((notice) => <span key={notice.label} className={`fd203-status-chip ${notice.tone}`}>{notice.label}</span>) : <span className="fd203-status-chip done">甇?虜?券?/span>}</div>
          <div className="fd203-project-list-info compact-v21">
            <div className="running"><span>甇??脰?</span><strong>{listInfo.running}</strong></div>
            <div className="next"><span>銝?甇?/span><strong>{listInfo.next}</strong></div>
          </div>
          <div className="fd203-project-card-kpis">
            <span><b>{project.tasks?.length || 0}</b><small>隞餃?</small></span>
            <span><b>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0}</b><small>摮遙??/small></span>
            <span><b>{project.milestones?.filter((item) => item.done).length || 0}/{project.milestones?.length || 0}</b><small>??蝣?/small></span>
          </div>
          <div className="fd203-project-card-meta">
            <span>{project.owner || '?芣?摰?}</span>
            <span title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} ??{formatMonthDayWeekday(project.endDate)}</span>
          </div>
          <div className="task-progress-row">
            <div className="flow-progress"><span style={{ width: `${project.progress}%` }} /></div>
            <strong>{project.progress}%</strong>
            <small>隡?{estimated}%</small>
          </div>
          <div className="fd203-project-card-foot">
            <span className="fd203-card-date-pill" title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} ??{formatMonthDayWeekday(project.endDate)}</span>
            <span className="fd203-card-open-pill">{projectListExpandAllGantt ? '??歇撅?' : '??撠?'}</span>
          </div>
        </article>
        {projectListExpandAllGantt ? <div className="fd203-inline-gantt-shell">{renderGantt(project, { embedded: true, compact: true })}</div> : null}
      </div>
    )
  }

  function renderProjectListRow(project) {
    const isActive = selectedProject?.id === project.id && projectModalOpen
    const estimated = estimateProjectProgress(project)
    const listInfo = getProjectListInfo(project)
    const priorityMeta = getProjectPriorityMeta(project)
    return (
      <div key={project.id} className="fd203-project-entry fd203-project-entry-row">
        <article
          {...getProjectDragProps(project.id)}
          role="button"
          tabIndex={0}
          className={[
            'fd203-project-row',
            isActive ? 'active' : '',
            draggingProjectId === project.id ? 'dragging' : '',
            dropProjectId === project.id ? 'drop-target' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => openProject(project.id)}
          onKeyDown={(event) => handleProjectKeyDown(project.id, event)}
          title="暺???撠?敶?嚗??唾矽?湧?摨?
        >
          <span className="fd203-row-main">
            <small>??{project.id}</small>
            <strong>{project.name || '?芸??獢?}</strong>
            <em><b>甇??脰?</b>{listInfo.running}</em>
            <em><b>銝?甇?/b>{listInfo.next}</em>
          </span>
          <span><strong>{project.owner || '?芣?摰?}</strong><small title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} ??{formatMonthDayWeekday(project.endDate)}</small></span>
          <span className="fd203-row-progress"><div className="flow-progress"><span style={{ width: `${project.progress}%` }} /></div><small>{project.progress}% / 隡?{estimated}%</small></span>
          <span><strong>{project.tasks?.length || 0} 隞餃?</strong><small>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0} 摮遙??/small></span>
          <span className="fd203-row-badges"><span className={`fd203-priority-chip ${priorityMeta.tone}`}>?芸? {priorityMeta.label} 繚 {priorityMeta.score}</span><Badge value={project.phase} /><Badge value={project.health} />{getProjectStatusMeta(project).notices.slice(0, 2).map((notice) => <span key={notice.label} className={`fd203-status-chip ${notice.tone}`}>{notice.label}</span>)}</span>
        </article>
        {projectListExpandAllGantt ? <div className="fd203-inline-gantt-shell fd203-inline-gantt-shell-row">{renderGantt(project, { embedded: true, compact: true })}</div> : null}
      </div>
    )
  }

  function renderGanttBar({ project, task, taskIndex = null, subtask, subtaskIndex = null, scope, start, end, displayStart, displayEnd, progress, label, className = '', tone = '', indent = false }) {
    const activePreview = ganttDragPreview?.projectId === project.id && ganttDragPreview?.scope === scope && ganttDragPreview?.taskIndex === taskIndex && ganttDragPreview?.subtaskIndex === subtaskIndex ? ganttDragPreview : null
    const activeEditor = ganttProgressEditor?.scope === scope && ganttProgressEditor?.projectId === project.id && ganttProgressEditor?.taskIndex === taskIndex && ganttProgressEditor?.subtaskIndex === subtaskIndex
    const done = scope === 'task' ? Boolean(task?.done) : scope === 'subtask' ? Boolean(subtask?.done) : false
    const title = `${label}嚚?{done ? '撌脣??? : '?芸???}嚚?{dateRangeLabel(start, end)}嚚脣漲 ${progress}%`
    const startHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'start', event, subtaskIndex)
    const endHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'end', event, subtaskIndex)
    const moveHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'move', event, subtaskIndex)
    return (
      <span className={`fd203-gantt-bar ${className} ${tone} ${done ? 'done' : ''}`.trim()} style={ganttStyle(start, end, displayStart, displayEnd)} onPointerDown={moveHandler} title={title}>
        {activePreview ? <span className="fd203-gantt-drag-tip">{activePreview.label}</span> : null}
        {renderGanttProgressEditor(scope, project.id, taskIndex, subtaskIndex, progress, label)}
        <i className="gantt-resize-handle start" role="button" tabIndex={0} aria-label={`隤踵${label}???匝} onPointerDown={startHandler} />
        <button type="button" className={`fd203-gantt-progress-trigger${activeEditor ? ' active' : ''}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openGanttProgressEditor(scope, project.id, taskIndex, subtaskIndex, progress, event)}>{progress}%</button>
        <i className="gantt-resize-handle end" role="button" tabIndex={0} aria-label={`隤踵${label}蝯??匝} onPointerDown={endHandler} />
      </span>
    )
  }

  function renderGantt(project, options = {}) {
    const { embedded = false, compact = false } = options
    if (!project?.id) return <div className="flow-empty-card">隢?敺?獢?銵券???獢?/div>
    const frozenRange = ganttDragRange?.projectId === project.id ? ganttDragRange : null
    const timelineRange = getProjectGanttRange(project)
    const displayStart = frozenRange?.start || timelineRange.start
    const displayEnd = frozenRange?.end || timelineRange.end
    const weekTicks = buildGanttWeekTicks(displayStart, displayEnd)
    const weekCellWidth = compact ? 124 : 140
    const labelColumnWidth = compact ? 224 : 248
    const gridColumns = `${labelColumnWidth}px repeat(${weekTicks.length}, minmax(${weekCellWidth}px, ${weekCellWidth}px))`
    const todayValue = new Date().toISOString().slice(0, 10)
    const showToday = todayValue >= displayStart && todayValue <= displayEnd
    const todayLeft = showToday ? `${ganttPoint(todayValue, displayStart, displayEnd)}%` : null
    return (
      <div className={`fd203-gantt-panel${embedded ? ' embedded' : ''}${compact ? ' compact' : ''}`}>
        <div className="fd203-gantt-summary">
          <div>
            <p className="eyebrow">PROJECT GANTT</p>
            <h3>{project.name}</h3>
            <small>{formatMonthDayWeekday(project.startDate)} ??{formatMonthDayWeekday(project.endDate)} 繚 ???撖阡?韏瑁?憿舐內嚗?敺??望??蝯??伐?銝剝?靽?瘥?餃漲{showToday ? ` 繚 隞嚗?{formatMonthDayWeekday(todayValue)}` : ''}</small>
          </div>
          <div className="fd203-gantt-actions">
            {!compact && (
              <label>
                <span>撠??脣漲 {project.progress}%</span>
                <input type="range" min="0" max="100" value={project.progress} onChange={(event) => updateProject(project.id, { progress: clampPercent(event.target.value) })} />
              </label>
            )}
            <button type="button" onClick={() => addProjectTask(project.id)}>?啣?隞餃?</button>
            <button type="button" className={ganttShowSubtasks ? 'fd203-gantt-global-toggle open' : 'fd203-gantt-global-toggle closed'} onClick={toggleAllGanttSubtasks}>{ganttShowSubtasks ? '?券?嗅?摮遙?? : '?券撅?摮遙??}</button>
          </div>
        </div>

        <div className="fd203-gantt-scroll">
          <div className="fd203-gantt-grid fd203-gantt-head" style={{ gridTemplateColumns: gridColumns }}>
            <span>?</span>
            {weekTicks.map((tick) => (
              <span key={tick.key} className="fd203-week-head">
                <b>{formatWeekRange(tick.start, tick.end)}</b>
                <small>{tick.days} 憭?繚 {formatWeekSpanLabel(tick.start, tick.end)}</small>
              </span>
            ))}
          </div>

          {showToday ? (
            <div className="fd203-gantt-grid fd203-gantt-floating-today" style={{ gridTemplateColumns: gridColumns }} aria-hidden="true">
              <span />
              <div className="fd203-gantt-floating-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                <i style={{ left: todayLeft }}>隞予 {formatMonthDay(todayValue)}</i>
              </div>
            </div>
          ) : null}

          <div className="fd203-gantt-grid fd203-gantt-row" style={{ gridTemplateColumns: gridColumns }}>
            <div className="fd203-gantt-label" title={dateRangeLabel(project.startDate, project.endDate)}>
              <strong>撠?蝮賣?蝔?/strong>
              <small>{project.phase} 繚 {project.progress}%</small>
            </div>
            <div className="fd203-gantt-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
              {showToday ? <span className="fd203-gantt-today-line subtle fd203-gantt-today-guide" style={{ left: todayLeft }} /> : null}
              {renderGanttBar({ project, scope: 'project', start: project.startDate, end: project.endDate, displayStart, displayEnd, progress: project.progress, label: '撠??脣漲', className: 'project', tone: project.tone || 'blue' })}
              {(project.milestones || []).map((milestone, index) => (
                <i key={milestone.id || index} className={milestone.done ? 'milestone-dot done' : 'milestone-dot'} style={{ left: `${ganttPoint(milestone.date, displayStart, displayEnd)}%` }} title={`${milestone.name}嚚?{formatMonthDayWeekday(milestone.date)}`} />
              ))}
            </div>
          </div>

          {(project.tasks || []).map((task, index) => {
            const taskStart = task.start || project.startDate
            const taskEnd = task.end || project.endDate
            const progress = clampPercent(task.progress)
            const taskKey = getGanttTaskKey(project, task, index)
            const subtaskCount = (task.subtasks || []).length
            const dependencyMeta = getTaskDependencyMeta(project, task, index)
            const taskStatus = getTaskStatusMeta(project, task, index)
            const subtasksOpen = isGanttTaskSubtasksOpen(project, task, index)
            return (
              <div key={taskKey} className={`fd203-gantt-task-group ${subtaskCount ? 'has-subtasks' : 'no-subtasks'} ${subtasksOpen ? 'subtasks-open' : 'subtasks-collapsed'} ${task.done ? 'is-complete' : 'is-incomplete'}`}>
                <div className={`fd203-gantt-grid fd203-gantt-row task ${subtaskCount ? 'has-subtasks' : 'no-subtasks'} ${subtasksOpen ? 'subtasks-open' : 'subtasks-collapsed'} ${task.done ? 'is-complete' : 'is-incomplete'}`} style={{ gridTemplateColumns: gridColumns }}>
                  <div className="fd203-gantt-label" title={dateRangeLabel(taskStart, taskEnd)}>
                    <div className="fd203-gantt-task-title-line compact-v16">
                      {subtaskCount ? (
                        <button
                          type="button"
                          className={`fd203-subtask-chevron ${subtasksOpen ? 'open' : 'closed'}`}
                          onClick={() => toggleGanttTaskSubtasks(project, task, index)}
                          aria-expanded={subtasksOpen}
                          title={subtasksOpen ? `?嗅? ${subtaskCount} ??隞餃?` : `撅? ${subtaskCount} ??隞餃?`}
                        >
                          {subtasksOpen ? '?? : '??}
                        </button>
                      ) : (
                        <span className="fd203-subtask-chevron empty">??/span>
                      )}
                      <ChineseTextField commitOnBlur className="fd203-gantt-name-input" value={task.name || ''} onCommit={(value) => updateProjectTask(project.id, index, { name: value || '?芸?遙?? })} aria-label="??遙??蝔? />
                      <span className={`fd203-gantt-status-chip ${taskStatus.tone}`}>{taskStatus.label}</span>
                      <label className={`fd203-gantt-done-check ${task.done ? 'checked' : ''}`} onClick={(event) => event.stopPropagation()} title={task.done ? '撌脣??????暸?舀?摰?' : '?芸????暸敺??箏???}>
                        <input
                          type="checkbox"
                          checked={Boolean(task.done)}
                          onChange={(event) => updateProjectTask(project.id, index, { done: event.target.checked, progress: event.target.checked ? 100 : Math.min(progress, 99) }, event.target.checked ? '隞餃?璅?摰??? : '隞餃??寧?芸???)}
                          aria-label="隞餃?摰????
                        />
                        <span>{task.done ? '摰?' : '?芸???}</span>
                      </label>
                    </div>
                    <small title={dateRangeLabel(taskStart, taskEnd)}>{task.owner || '?芣?摰?} 繚 {progress}% 繚 {formatMonthDay(taskStart)} ??{formatMonthDay(taskEnd)}</small>
                    {dependencyMeta.hasDependency ? <div className={`fd203-task-dependency-note ${dependencyMeta.waiting ? 'waiting' : 'ready'}`}>{dependencyMeta.waiting ? '蝑??蔭' : '?蔭摰?'}嚗dependencyMeta.predecessorName}嚗?摰?{formatMonthDay(dependencyMeta.startAfter)}</div> : null}
                    <div className="fd203-gantt-row-actions compact-v16 fd203-gantt-row-actions-v29">
                      <button type="button" className="fd203-mini-link" onClick={() => addProjectSubtask(project.id, index)}>嚗?隞餃?</button>
                      {subtaskCount ? <button type="button" className="fd203-mini-link soft" onClick={() => autoEstimateProjectTask(project.id, index)}>?芸?%</button> : null}
                      {subtaskCount ? <span className={`fd203-subtask-count-pill ${subtasksOpen ? 'open' : 'closed'}`}>{subtasksOpen ? '撌脣??? : '撌脫??} {subtaskCount}</span> : <span className="fd203-mini-muted">0 摮遙??/span>}
                      <button type="button" className="fd203-mini-link danger ghost-danger" onClick={() => removeProjectTask(project.id, index)}>?芷</button>
                    </div>
                  </div>
                  <div className="fd203-gantt-track soft" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                    {showToday ? <span className="fd203-gantt-today-line subtle" style={{ left: todayLeft }} /> : null}
                    {renderGanttBar({ project, task, taskIndex: index, scope: 'task', start: taskStart, end: taskEnd, displayStart, displayEnd, progress, label: task.name || '隞餃??脣漲', className: 'task' })}
                  </div>
                </div>
                {!subtasksOpen && subtaskCount > 0 ? (
                  <div className="fd203-gantt-grid fd203-gantt-row subtask-collapsed-note" style={{ gridTemplateColumns: gridColumns }}>
                    <div className="fd203-gantt-label subtask-collapsed-note-label">
                      <span>撌脫??{subtaskCount} ??隞餃?</span>
                      <button type="button" className="fd203-mini-link" onClick={() => toggleGanttTaskSubtasks(project, task, index)}>撅?</button>
                    </div>
                    <div className="fd203-gantt-track subtask-collapsed-note-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                      <span>摮遙????暺椰?游????蝝?/span>
                    </div>
                  </div>
                ) : null}
                {subtasksOpen && (task.subtasks || []).map((subtask, subIndex) => {
                  const subStart = subtask.start || taskStart
                  const subEnd = subtask.end || taskEnd
                  const subProgress = clampPercent(subtask.progress)
                  const subtaskStatus = getSubtaskStatusMeta(project, task, subtask)
                  const subtaskKey = getGanttSubtaskKey(project, task, subtask, index, subIndex)
                  return (
                    <div className={`fd203-gantt-grid fd203-gantt-row subtask ${subtask.done ? 'is-complete' : 'is-incomplete'}`} key={subtaskKey} style={{ gridTemplateColumns: gridColumns }}>
                      <div className="fd203-gantt-label subtask" title={dateRangeLabel(subStart, subEnd)}>
                        <div className="fd203-gantt-subtask-title-line compact-v16">
                          <ChineseTextField commitOnBlur className="fd203-gantt-name-input subtask" value={subtask.name || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { name: value || '?芸??隞餃?' })} aria-label="???隞餃??迂" />
                          <span className={`fd203-gantt-status-chip subtask ${subtaskStatus.tone}`}>{subtaskStatus.label}</span>
                          <label className={`fd203-gantt-done-check subtask ${subtask.done ? 'checked' : ''}`} onClick={(event) => event.stopPropagation()} title={subtask.done ? '撌脣??????暸?舀?摰?' : '?芸????暸敺??箏???}>
                            <input
                              type="checkbox"
                              checked={Boolean(subtask.done)}
                              onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { done: event.target.checked, progress: event.target.checked ? 100 : Math.min(subProgress, 99) }, event.target.checked ? '摮遙??閮??? : '摮遙??箸摰???)}
                              aria-label="摮遙??????
                            />
                            <span>{subtask.done ? '摰?' : '?芸???}</span>
                          </label>
                        </div>
                        <small title={dateRangeLabel(subStart, subEnd)}>{subtask.owner || task.owner || '?芣?摰?} 繚 {subProgress}% 繚 {formatMonthDay(subStart)} ??{formatMonthDay(subEnd)}</small>
                        <div className="fd203-gantt-row-actions compact-v16">
                          <button type="button" className="fd203-mini-link danger" onClick={() => removeProjectSubtask(project.id, index, subIndex)}>?芷</button>
                        </div>
                      </div>
                      <div className="fd203-gantt-track subtask" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                        {showToday ? <span className="fd203-gantt-today-line subtle" style={{ left: todayLeft }} /> : null}
                        {renderGanttBar({ project, task, taskIndex: index, subtask, subtaskIndex: subIndex, scope: 'subtask', start: subStart, end: subEnd, displayStart, displayEnd, progress: subProgress, label: subtask.name || '摮遙?脣漲', className: 'subtask' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderProjectWorkspace(project) {
    if (!project?.id) return null
    const priorityMeta = getProjectPriorityMeta(project)
    return (
      <>
        <div className="fd203-workspace-head">
          <div>
            <p className="eyebrow">PROJECT WORKSPACE</p>
            <h3>{project.name}</h3>
            <span>{project.id} 繚 {project.phase} 繚 {formatMonthDayWeekday(project.startDate)} ??{formatMonthDayWeekday(project.endDate)}</span>
          </div>
          <div className="fd203-workspace-actions">
            <button type="button" onClick={() => duplicateProject(project)}>銴ˊ</button>
            <button className="danger" type="button" onClick={() => deleteProject(project.id)}>?芷</button>
            <button type="button" onClick={closeProjectModal}>??</button>
          </div>
        </div>

        <div className="fd203-modal-summary-bar">
          <span className={`fd203-priority-chip ${priorityMeta.tone}`}>?芸? {priorityMeta.label} 繚 {priorityMeta.score}</span>
          <span>?亙熒摨佗?{project.health || '敺Ⅱ隤?}</span>
          <span>?脣漲嚗project.progress}%</span>
          <span>?暹?隞餃?嚗getProjectStatusMeta(project).overdueItems.length}</span>
          <span>銝?甇伐?{getProjectListInfo(project).next}</span>
        </div>

        <div className="project-segmented-tabs fd203-tabs">
          <button type="button" className={detailTab === 'overview' ? 'active' : ''} onClick={() => setDetailTab('overview')}>蝮質汗</button>
          <button type="button" className={detailTab === 'gantt' ? 'active' : ''} onClick={() => setDetailTab('gantt')}>???/button>
          <button type="button" className={detailTab === 'tasks' ? 'active' : ''} onClick={() => setDetailTab('tasks')}>隞餃?</button>
          <button type="button" className={detailTab === 'milestones' ? 'active' : ''} onClick={() => setDetailTab('milestones')}>??蝣?/button>
          <button type="button" className={detailTab === 'records' ? 'active' : ''} onClick={() => setDetailTab('records')}>蝝??/button>
        </div>

        {detailTab === 'overview' && (
          <div className="fd203-overview-panel">
            <section className="fd203-profile-card">
              <div className="detail-hero-line"><span className="record-id">{project.id}</span><span className={`fd203-priority-chip ${priorityMeta.tone}`}>?芸? {priorityMeta.label} 繚 {priorityMeta.score}</span><Badge value={project.health} /></div>
              <h3>{project.name}</h3>
              <p>{project.next || '撠閮剖?銝?甇?}</p>
              <div className="flow-progress big"><span style={{ width: `${project.progress}%` }} /></div>
              <div className="project-focus-kpis fd203-kpis">
                <article><span>?挾</span><strong>{project.phase}</strong></article>
                <article><span>撱箄降?芸?</span><strong>{priorityMeta.label}</strong></article>
                <article><span>鞎痊鈭?/span><strong>{project.owner}</strong></article>
                <article><span>??</span><strong>{daysBetween(project.startDate, project.endDate) + 1} 憭?/strong></article>
                <article><span>隞餃?</span><strong>{project.tasks?.length || 0}</strong></article>
                <article><span>摮遙??/span><strong>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0}</strong></article>
                <article><span>??蝣?/span><strong>{doneMilestones}/{project.milestones?.length || 0}</strong></article>
                <article><span>隡啁??脣漲</span><strong>{estimateProjectProgress(project)}%</strong></article>
              </div>
              <div className="project-focus-actions fd203-action-row">
                <button type="button" onClick={autoEstimateSelectedProject}>隡啁??脣漲</button>
                <button type="button" onClick={() => addProjectTask(project.id)}>?啣?隞餃?</button>
                <button type="button" onClick={() => addProjectMilestone(project.id)}>?啣???蝣?/button>
              </div>
            </section>

            <section className="fd203-editor-card">
              <div className="project-section-head compact"><div><p className="eyebrow">PROJECT PROFILE</p><h3>?箸鞈?</h3></div></div>
              <div className="project-editor-grid fd203-editor-grid">
                <label>撠??迂<ChineseTextField commitOnBlur value={project.name} onCommit={(value) => updateProject(project.id, { name: value || '?芸??獢? })} /></label>
                <label>?挾<select value={project.phase || '閬?銝?} onChange={(event) => updateProject(project.id, { phase: event.target.value }, '?湔撠??挾??)}>{mergeOptionList(PROJECT_PHASE_OPTIONS, project.phase).map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></label>
                <label>撠??芸?<select value={project.priority || '銝?} onChange={(event) => updateProject(project.id, { priority: event.target.value }, `?湔撠??芸???${event.target.value}?)}>{mergeOptionList(PROJECT_PRIORITY_OPTIONS, project.priority).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
                <label>鞎痊鈭?ChineseTextField commitOnBlur value={project.owner} onCommit={(value) => updateProject(project.id, { owner: value || '?芣?摰? })} /></label>
                <label>?亙熒摨?select value={project.health || '敺Ⅱ隤?} onChange={(event) => updateProject(project.id, { health: event.target.value }, '?湔?亙熒摨艾?)}>{mergeOptionList(PROJECT_HEALTH_OPTIONS, project.health).map((health) => <option key={health} value={health}>{health}</option>)}</select></label>
                <label>??<input title={dateRangeLabel(project.startDate, project.endDate)} type="date" value={project.startDate} onChange={(event) => updateProject(project.id, { startDate: minIsoDate(event.target.value, project.endDate) }, '?湔???交???)} /></label>
                <label>蝯?<input title={dateRangeLabel(project.startDate, project.endDate)} type="date" value={project.endDate} onChange={(event) => updateProject(project.id, { endDate: maxIsoDate(event.target.value, project.startDate) }, '?湔蝯??交???)} /></label>
                <label>?脣漲 %<input type="range" min="0" max="100" value={project.progress} onChange={(event) => updateProject(project.id, { progress: clampPercent(event.target.value) })} /><small>{project.progress}%</small></label>
                <label className="wide-field">銝?甇?ChineseTextField commitOnBlur multiline value={project.next} onCommit={(value) => updateProject(project.id, { next: value })} /></label>
              </div>
            </section>

            <section className="detail-block">
              <p className="eyebrow">?撌乩?</p>
              <div className="related-task-list">
                {selectedRelatedTasks.length ? selectedRelatedTasks.map((task) => <article key={task.id}><strong>{task.title}</strong><span>{task.status} 繚 {task.next}</span></article>) : <p>?桀?瘝??撌乩???/p>}
              </div>
            </section>
          </div>
        )}

        {detailTab === 'gantt' && renderGantt(project)}

        {detailTab === 'tasks' && (
          <section className="detail-block project-task-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">撠?隞餃? / ?? / 摮遙??/p><button type="button" onClick={() => addProjectTask(project.id)}>?啣?隞餃?</button></div>
            <div className="project-detail-card-list fd203-task-list">
              {project.tasks.map((task, index) => {
                const taskStart = task.start || project.startDate
                const taskEnd = task.end || project.endDate
                return (
                  <div key={task.id || index} className="project-detail-card fd203-detail-card">
                    <div className="project-detail-card-head"><strong>{task.name || '?芸?遙??}</strong><span title={dateRangeLabel(taskStart, taskEnd)}>{clampPercent(task.progress)}%</span></div>
                    {getTaskDependencyMeta(project, task, index).hasDependency ? <div className={`fd203-task-dependency-note detail ${getTaskDependencyMeta(project, task, index).waiting ? 'waiting' : 'ready'}`}>{getTaskDependencyMeta(project, task, index).waiting ? '蝑??蔭隞餃?' : '?蔭隞餃?撌脣???}嚗getTaskDependencyMeta(project, task, index).predecessorName}嚗??摰?{formatMonthDayWeekday(getTaskDependencyMeta(project, task, index).startAfter)}</div> : null}
                    <div className="project-detail-form-grid">
                      <label>隞餃??迂<ChineseTextField commitOnBlur value={task.name || ''} onCommit={(value) => updateProjectTask(project.id, index, { name: value || '?芸?遙?? })} aria-label="隞餃??迂" /></label>
                      <label>鞎痊鈭?ChineseTextField commitOnBlur value={task.owner || ''} onCommit={(value) => updateProjectTask(project.id, index, { owner: value })} aria-label="鞎痊鈭? /></label>
                      <label>????input title={dateRangeLabel(taskStart, taskEnd)} type="date" value={taskStart} onChange={(event) => updateProjectTask(project.id, index, { start: event.target.value }, '?湔隞餃????乓?)} aria-label="???? /></label>
                      <label>蝯???input title={dateRangeLabel(taskStart, taskEnd)} type="date" value={taskEnd} onChange={(event) => updateProjectTask(project.id, index, { end: event.target.value }, '?湔隞餃?蝯??乓?)} aria-label="蝯??? /></label>
                      <label>?蔭隞餃?<select value={task.dependsOnTaskId || ''} onChange={(event) => {
                        const predecessorName = project.tasks.find((item) => item.id === event.target.value)?.name || ''
                        updateProjectTask(project.id, index, { dependsOnTaskId: event.target.value }, event.target.value ? `閮剖??蔭隞餃??箝?{predecessorName}? : '皜?蔭隞餃???)
                      }} aria-label="?蔭隞餃?"><option value="">?∪?蝵桐遙??/option>{getAvailablePredecessorTasks(project, index).map((item) => <option key={item.id} value={item.id}>{item.name || '?芸?遙??}</option>)}</select><small>?蔭?交?霈??????亙?蝵桀??敺?憭?/small></label>
                      <label>摰???input type="date" value={task.completedAt || ''} disabled={!task.done} onChange={(event) => updateProjectTask(project.id, index, { completedAt: event.target.value || todayDate(), done: true, progress: 100 }, '?湔隞餃?摰??乓?)} aria-label="摰??? /><small>{task.done ? '?航矽?游祕???' : '隞餃?摰?敺???}</small></label>
                      <label>?脣漲<input type="range" min="0" max="100" value={clampPercent(task.progress)} onChange={(event) => updateProjectTask(project.id, index, { progress: clampPercent(event.target.value) })} aria-label="?脣漲" /><small>{task.manualProgress ? '??%' : '?芸?%'}</small></label>
                    </div>
                    <div className="project-detail-card-actions">
                      <button type="button" onClick={() => createWorkItemFromProjectTask(project, task)}>撱箇?撌乩?</button>
                      <button type="button" onClick={() => addProjectSubtask(project.id, index)}>?啣?摮遙??/button>
                      <button type="button" onClick={() => autoEstimateProjectTask(project.id, index)} disabled={!(task.subtasks || []).length}>靘?隞餃?隡?</button>
                      <button type="button" onClick={() => updateProjectTask(project.id, index, { done: true, progress: 100 }, '隞餃?閬摰???)}>閬摰?</button>
                      <button type="button" onClick={() => removeProjectTask(project.id, index)}>?芷</button>
                    </div>
                    <div className="fd203-subtask-list">
                      {(task.subtasks || []).map((subtask, subIndex) => {
                        const subStart = subtask.start || taskStart
                        const subEnd = subtask.end || taskEnd
                        return (
                          <div key={subtask.id || subIndex} className="fd203-subtask-editor">
                            <div className="project-detail-card-head"><strong>??{subtask.name || '?芸??隞餃?'}</strong><span title={dateRangeLabel(subStart, subEnd)}>{clampPercent(subtask.progress)}%</span></div>
                            <div className="project-detail-form-grid compact-3">
                              <label>摮遙??蝔?ChineseTextField commitOnBlur value={subtask.name || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { name: value || '?芸??隞餃?' })} aria-label="摮遙??蝔? /></label>
                              <label>鞎痊鈭?ChineseTextField commitOnBlur value={subtask.owner || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { owner: value })} aria-label="摮遙??鞎砌犖" /></label>
                              <label>????input title={dateRangeLabel(subStart, subEnd)} type="date" value={subStart} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { start: event.target.value }, '?湔摮遙??憪??)} /></label>
                              <label>蝯???input title={dateRangeLabel(subStart, subEnd)} type="date" value={subEnd} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { end: event.target.value }, '?湔摮遙?????)} /></label>
                              <label>?脣漲<input type="range" min="0" max="100" value={clampPercent(subtask.progress)} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { progress: clampPercent(event.target.value) })} /></label>
                            </div>
                            <div className="project-detail-card-actions"><button type="button" onClick={() => removeProjectSubtask(project.id, index, subIndex)}>?芷摮遙??/button></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {!project.tasks?.length && <div className="flow-empty-card">?桀?瘝?撠?隞餃???/div>}
            </div>
          </section>
        )}

        {detailTab === 'milestones' && (
          <section className="detail-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">??蝣?/p><button type="button" onClick={() => addProjectMilestone(project.id)}>?啣???蝣?/button></div>
            <div className="project-detail-card-list milestone-list-layout fd203-task-list">
              {project.milestones.map((milestone, index) => (
                <div key={milestone.id || index} className={milestone.done ? 'project-detail-card fd203-detail-card done' : 'project-detail-card fd203-detail-card'}>
                  <div className="project-detail-card-head"><strong>{milestone.name || '?芸??蝔?'}</strong><span>{milestone.done ? '撌脣??? : '?脰?銝?}</span></div>
                  <div className="project-detail-form-grid compact-3">
                    <label>??蝣?蝔?ChineseTextField commitOnBlur value={milestone.name || ''} onCommit={(value) => updateProjectMilestone(project.id, index, { name: value || '?芸??蝔?' })} aria-label="??蝣?蝔? /></label>
                    <label>?交?<input type="date" value={milestone.date || project.endDate} onChange={(event) => updateProjectMilestone(project.id, index, { date: event.target.value }, '?湔??蝣??)} aria-label="??蝣?? /></label>
                    <label className="milestone-check"><span>摰????/span><input type="checkbox" checked={Boolean(milestone.done)} onChange={(event) => updateProjectMilestone(project.id, index, { done: event.target.checked }, event.target.checked ? '??蝣?閮??? : '??蝣?粹脰?銝准?)} /></label>
                  </div>
                  <div className="project-detail-card-actions"><button type="button" onClick={() => removeProjectMilestone(project.id, index)}>?芷</button></div>
                </div>
              ))}
              {!project.milestones?.length && <div className="flow-empty-card">?桀?瘝???蝣?/div>}
            </div>
          </section>
        )}

        {detailTab === 'records' && (
          <section className="detail-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">??蝝??/p></div>
            <div className="fd203-record-input">
              <ChineseTextField multiline value={manualRecordText} onCommit={setManualRecordText} placeholder="?啣?銝蝑?獢???.." />
              <button type="button" onClick={addManualProjectRecord} disabled={!manualRecordText.trim()}>?啣?蝝??/button>
            </div>
            <div className="timeline-notes flow-timeline-notes">
              {project.records.length ? project.records.map((record, index) => <div key={`${record}-${index}`}><span>{index + 1}</span><p>{record}</p></div>) : <div className="flow-empty-card">?桀?瘝???蝝??/div>}
            </div>
          </section>
        )}
      </>
    )
  }

  return (
    <div className="project-workspace page-stack flowdesk-module-shell fd203-shell">
      <section className="flow-toolbar flowdesk-toolbar-v2 fd203-toolbar">
        <div>
          <p className="eyebrow">PROJECT FLOW</p>
          <h2>撠?蝞∠?</h2>
          <span>撠??”鞎痊???祟?貉???嚗???獢?隞亙?蝒????游極雿???/span>
        </div>
        <div className="flow-toolbar-actions">
          <span className="toolbar-soft-chip">撟喳??脣漲 {avgProgress}%</span>
          <button className="ghost-btn" type="button" onClick={exportProjectSummary}>?臬??</button>
          <button className="ghost-btn" type="button" onClick={autoEstimateSelectedProject} disabled={!hasSelectedProject || !selectedProject.tasks?.length}>靘遙?摯?脣漲</button>
          <button className="primary-btn" type="button" onClick={createProject}>?啣?撠?</button>
        </div>
      </section>

      <section className="project-overview-strip fd203-overview-strip">
        <article><span>撠???/span><strong>{projects.length}</strong></article>
        <article><span>?瘜冽?</span><strong>{riskCount}</strong></article>
        <article><span>?暹?撠?</span><strong>{overdueProjects}</strong></article>
        <article><span>擃??/span><strong>{highPriorityProjects}</strong></article>
        <article><span>?餈???/span><strong>{hasSelectedProject ? selectedProject.name : '??}</strong></article>
        <article><span>?郊???/span><strong>{flowdeskCloud ? (projectsCloudReady ? '?脩垢璅∪?' : '?郊銝?) : '?祆??'}</strong></article>
      </section>

      <section className="fd203-attention-panel">
        <div>
          <p className="eyebrow">TODAY FOCUS</p>
          <h3>隞?閬釣??/h3>
          <span>靘?祟?貊???琿暹??撠???鞈?蝻箏??/span>
        </div>
        <div className="fd203-attention-grid">
          <article className={attentionSummary.overdue.length ? 'danger' : ''}><span>?暹?撠?</span><strong>{attentionSummary.overdue.length}</strong><small>{attentionSummary.overdue.length ? attentionSummary.overdue.slice(0, 2).map((item) => item.name).join('??) : '?桀?瘝??暹?撠?'}</small></article>
          <article className={attentionSummary.dueSoon.length ? 'warning' : ''}><span>7 憭拙?唳?</span><strong>{attentionSummary.dueSoon.length}</strong><small>{attentionSummary.dueSoon.length ? attentionSummary.dueSoon.slice(0, 2).map((item) => item.name).join('??) : '?剜??唳?憯?甇?虜'}</small></article>
          <article className={attentionSummary.highPriority.length ? 'danger' : ''}><span>擃??/span><strong>{attentionSummary.highPriority.length}</strong><small>{attentionSummary.highPriority.length ? '撱箄降?芸??亦?' : '?桀?瘝?擃?郎蝷?}</small></article>
          <article className={attentionSummary.noNext.length ? 'warning' : ''}><span>?芾身摰?銝甇?/span><strong>{attentionSummary.noNext.length}</strong><small>{attentionSummary.noRunning.length} ???脰?銝剝???/small></article>
          <article className={attentionSummary.overdueTasks ? 'danger' : ''}><span>隞餃??暹?</span><strong>{attentionSummary.overdueTasks}</strong><small>{attentionSummary.overdueTasks ? '隢??Ⅱ隤? : '隞餃???甇?虜'}</small></article>
        </div>
      </section>

      <section className="fd203-filter-bar">
        <ChineseTextField value={projectKeyword} onCommit={setProjectKeyword} placeholder="??撠??遙??隞餃???蝔?..." />
        <select value={projectPhaseFilter} onChange={(event) => setProjectPhaseFilter(event.target.value)}>{projectPhaseOptions.map((phase) => <option key={phase} value={phase}>{phase === '?券' ? '?券?挾' : phase}</option>)}</select>
        <select value={projectHealthFilter} onChange={(event) => setProjectHealthFilter(event.target.value)}>{projectHealthOptions.map((health) => <option key={health} value={health}>{health === '?券' ? '?券?亙熒摨? : health}</option>)}</select>
        <select value={projectPriorityFilter} onChange={(event) => setProjectPriorityFilter(event.target.value)}>{projectPriorityOptions.map((priority) => <option key={priority} value={priority}>{priority === '?券' ? '?券?芸?' : `?芸? ${priority}`}</option>)}</select>
        <select value={projectSortMode} onChange={(event) => setProjectSortMode(event.target.value)} aria-label="???孵?">{PROJECT_SORT_OPTIONS.map((mode) => <option key={mode} value={mode}>??嚗mode}</option>)}</select>
        <select value={projectPageSize} onChange={(event) => setProjectPageSize(Number(event.target.value))} aria-label="瘥?蝑">
          {[10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>瘥? {size} 蝑?/option>)}
        </select>
        <div className="project-view-toggle" aria-label="撠?瑼Ｚ???">
          <button type="button" className={projectViewMode === 'cards' ? 'active' : ''} onClick={() => setProjectViewMode('cards')}>?∠?</button>
          <button type="button" className={projectViewMode === 'list' ? 'active' : ''} onClick={() => setProjectViewMode('list')}>皜</button>
        </div>
      </section>

      <section className="fd203-main-layout modal-mode">
        <aside className="fd203-project-list-pane full">
          <div className="fd203-pane-head fd203-pane-head-stack">
            <div>
              <p className="eyebrow">PROJECT LIST</p>
              <h3>撠??”</h3>
            </div>
            <div className="fd203-pane-actions">
              <small>{filteredProjects.length} 蝑?繚 ?舀??單?摨?繚 暺???敶?</small>
              <button type="button" className={projectListExpandAllGantt ? 'ghost-btn active' : 'ghost-btn'} onClick={() => setProjectListExpandAllGantt((value) => !value)}>
                {projectListExpandAllGantt ? '?嗅??券??? : '撅??券???}
              </button>
            </div>
          </div>

          {!projects.length && <div className="flow-empty-card"><strong>?桀?瘝?撠?</strong><span>?臬??啣?銝蝑?獢?憪遣蝡?蝔?/span></div>}

          {projectViewMode === 'cards' ? (
            <div className={projectListExpandAllGantt ? 'fd203-project-card-list expanded-gantt' : 'fd203-project-card-list'}>
              {paginatedProjects.map(renderProjectCard)}
            </div>
          ) : (
            <div className="fd203-project-table">
              <div className="fd203-project-table-head"><span>撠? / 甇??脰? / 銝?甇?/span><span>鞎痊 / ??</span><span>?脣漲</span><span>?賊?</span><span>???/span></div>
              {paginatedProjects.map(renderProjectListRow)}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="project-pagination-bar fd203-pagination">
              <div>
                <strong>{filteredProjects.length}</strong> 蝑?繚 蝚?{safeProjectPage} / {projectPageTotal} ??繚 {projectSortMode}
                <span>{projectPageStart + 1} - {Math.min(projectPageStart + paginatedProjects.length, filteredProjects.length)}</span>
              </div>
              <div className="project-pagination-actions">
                <label className="fd203-page-jump"><span>頝唾</span><input type="number" min="1" max={projectPageTotal} value={projectPageInput} onChange={(event) => setProjectPageInput(event.target.value)} onBlur={() => commitProjectPageInput()} onKeyDown={(event) => { if (event.key === 'Enter') commitProjectPageInput(event.currentTarget.value) }} aria-label="???Ⅳ" /><small>/ {projectPageTotal}</small></label>
                <button type="button" onClick={() => setProjectPage(1)} disabled={safeProjectPage <= 1}>擐?</button>
                <button type="button" onClick={() => setProjectPage((page) => Math.max(1, page - 1))} disabled={safeProjectPage <= 1}>銝???/button>
                <button type="button" onClick={() => setProjectPage((page) => Math.min(projectPageTotal, page + 1))} disabled={safeProjectPage >= projectPageTotal}>銝???/button>
                <button type="button" onClick={() => setProjectPage(projectPageTotal)} disabled={safeProjectPage >= projectPageTotal}>?恍?</button>
              </div>
            </div>
          )}
        </aside>
      </section>

      {projectModalOpen && hasSelectedProject && (
        <div className="fd203-project-modal-backdrop" role="dialog" aria-modal="true" aria-label="撠?撌乩??" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProjectModal() }}>
          <section className="fd203-project-modal">
            {renderProjectWorkspace(selectedProject)}
          </section>
        </div>
      )}
    </div>
  )
}

function DeskPage({ tickets }) {
  return <TaskTrackingPage tasks={tickets} />
}

function RoadmapPage({ projects, onCreateWorkItem }) {
  return <ProjectManagementPage projects={projects} onCreateWorkItem={onCreateWorkItem} />
}

function parseDate(value) {
  return new Date(value + 'T00:00:00')
}

function addDaysToDateValue(value, days) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function minIsoDate(value, maxValue) {
  if (!value) return maxValue
  if (!maxValue) return value
  return value > maxValue ? maxValue : value
}

function maxIsoDate(value, minValue) {
  if (!value) return minValue
  if (!minValue) return value
  return value < minValue ? minValue : value
}

function clampIsoDate(value, minValue, maxValue) {
  return minIsoDate(maxIsoDate(value, minValue), maxValue)
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
  const ticks = []
  let cursor = parseDate(start)
  const finalDate = parseDate(end)
  while (cursor <= finalDate) {
    ticks.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 86400000)
  }
  if (!ticks.length || ticks[ticks.length - 1] !== end) ticks.push(end)
  return ticks
}


function getProjectGanttRange(project = {}) {
  const dates = []
  const pushDate = (value) => {
    if (!value) return
    const parsed = parseDate(value)
    if (!Number.isNaN(parsed.getTime())) dates.push(parsed.toISOString().slice(0, 10))
  }
  pushDate(project.startDate)
  pushDate(project.endDate)
  ;(project.tasks || []).forEach((task) => {
    pushDate(task.start || project.startDate)
    pushDate(task.end || project.endDate)
    ;(task.subtasks || []).forEach((subtask) => {
      pushDate(subtask.start || task.start || project.startDate)
      pushDate(subtask.end || task.end || project.endDate)
    })
  })
  ;(project.milestones || []).forEach((milestone) => pushDate(milestone.date))
  if (!dates.length) {
    const today = new Date().toISOString().slice(0, 10)
    return { start: today, end: today }
  }
  dates.sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

function buildGanttWeekTicks(start, end) {
  const ticks = []
  let cursor = parseDate(start)
  const finalDate = parseDate(end)
  while (cursor <= finalDate) {
    const weekStart = cursor.toISOString().slice(0, 10)
    const weekEndDate = new Date(cursor.getTime() + (6 * 86400000))
    const normalizedWeekEnd = weekEndDate > finalDate ? finalDate : weekEndDate
    const weekEnd = normalizedWeekEnd.toISOString().slice(0, 10)
    ticks.push({
      key: `${weekStart}_${weekEnd}`,
      start: weekStart,
      end: weekEnd,
      days: Math.round((normalizedWeekEnd - cursor) / 86400000) + 1,
    })
    cursor = new Date(normalizedWeekEnd.getTime() + 86400000)
  }
  return ticks
}

function formatMonthDay(value) {
  const date = parseDate(value)
  return (date.getMonth() + 1) + '/' + String(date.getDate()).padStart(2, '0')
}

function formatWeekRange(start, end) {
  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`
}

function formatWeekSpanLabel(start, end) {
  const weekdayMap = ['?望', '?曹?', '?曹?', '?曹?', '?勗?', '?曹?', '?勗']
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  return `${weekdayMap[startDate.getDay()]} 嚚?${weekdayMap[endDate.getDay()]}`
}

function formatMonthDayWeekday(value) {
  const date = parseDate(value)
  const weekdayMap = ['??, '銝', '鈭?, '銝?, '??, '鈭?, '??]
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}(${weekdayMap[date.getDay()]})`
}

function DocsPage({ docs }) {
  return (
    <div className="docs-layout">
      <aside className="doc-tree">
        <PanelTitle eyebrow="?辣??" title="?亥??渡?" />
        {['??辣', '蝬脰楝', '鞈?', '蝬脩?', '?遢', '?降蝝??, '蝭'].map((folder) => <button key={folder} type="button">??{folder}</button>)}
      </aside>
      <section className="doc-canvas">
        <div className="doc-hero doc-hero-compact">
          <span>??</span>
          <h2>?亥?摨?/h2>
        </div>
        <div className="doc-grid">
          {docs.map((doc) => (
            <article className="doc-card" key={doc.id}>
              <span className="doc-icon">{doc.icon}</span>
              <strong>{doc.title}</strong>
              <small>{doc.folder} 繚 {doc.type} 繚 {doc.updated}</small>
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
          <p className="eyebrow">瘚?閬?</p>
          <h2>瘚??芸???/h2>
        </div>
        <div className="ifthen-card">
          <span>憒?</span><strong>撌亙?拚???雿 30 ??</strong>
          <span>??/span><strong>璅?擃◢?芯蒂??啁蜇閬?/strong>
        </div>
      </section>
      <section className="automation-grid">
        {rules.map((rule) => (
          <article className="automation-card" key={rule.id}>
            <div><strong>{rule.title}</strong><Badge value={rule.status} /></div>
            <p><span>憒?</span>{rule.when}</p>
            <p><span>??/span>{rule.then}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

function InsightPage({ metrics, records, tickets }) {
  const [reportScope, setReportScope] = useState('?祆?')
  const [reportTab, setReportTab] = useState('蝮質汗')
  const [reportSearch, setReportSearch] = useState('')
  const [cloudStatus, setCloudStatus] = useState(flowdeskCloud ? '?郊銝? : '?祆?鞈?')
  const [reportData, setReportData] = useState(() => ({
    workItems: readFlowdeskLocalArray('flowdesk-work-items-v196'),
    tasks: readFlowdeskLocalArray('flowdesk-tasks-v1972'),
    purchases: readFlowdeskLocalArray('flowdesk-purchases-v19'),
    projects: readFlowdeskLocalArray('flowdesk-projects-v1972'),
    reminders: readFlowdeskLocalArray('flowdesk-reminders-v193'),
  }))

  async function reloadReportData() {
    const localData = {
      workItems: readFlowdeskLocalArray('flowdesk-work-items-v196'),
      tasks: readFlowdeskLocalArray('flowdesk-tasks-v1972'),
      purchases: readFlowdeskLocalArray('flowdesk-purchases-v19'),
      projects: readFlowdeskLocalArray('flowdesk-projects-v1972'),
      reminders: readFlowdeskLocalArray('flowdesk-reminders-v193'),
    }
    if (!flowdeskCloud) {
      setReportData(localData)
      setCloudStatus('?祆?鞈?')
      return
    }
    setCloudStatus('?郊銝?)
    try {
      const [workResult, taskResult, purchaseResult, projectResult, reminderResult] = await Promise.all([
        flowdeskCloud.getWorkspaceData('work_items'),
        flowdeskCloud.getWorkspaceData('tasks'),
        flowdeskCloud.getWorkspaceData('purchases'),
        flowdeskCloud.getWorkspaceData('projects'),
        flowdeskCloud.getWorkspaceData('reminders'),
      ])
      setReportData({
        workItems: Array.isArray(workResult.data) ? workResult.data : localData.workItems,
        tasks: Array.isArray(taskResult.data) ? taskResult.data : localData.tasks,
        purchases: Array.isArray(purchaseResult.data) ? purchaseResult.data : localData.purchases,
        projects: Array.isArray(projectResult.data) ? projectResult.data : localData.projects,
        reminders: Array.isArray(reminderResult.data) ? reminderResult.data : localData.reminders,
      })
      setCloudStatus('?脩垢撌脣?甇?)
    } catch {
      setReportData(localData)
      setCloudStatus('雿輻?祆??')
    }
  }

  useEffect(() => {
    reloadReportData()
  }, [])

  const keyword = reportSearch.trim().toLowerCase()
  const workRows = reportData.workItems.map((row) => ({ ...row, __source: '撌乩??', __date: row.due || row.createdAt || todayDate() }))
  const taskRows = reportData.tasks.map((row) => ({ ...row, __source: '隞餃?餈質馱', __date: row.due || todayDate() }))
  const allTaskRows = [...workRows, ...taskRows]
  const scopedPurchases = reportData.purchases.filter((row) => isReportInScope(row.requestDate || row.orderDate || row.arrivalDate, reportScope)).filter((row) => matchReportKeyword(row, keyword))
  const scopedTasks = allTaskRows.filter((row) => isReportInScope(row.__date, reportScope)).filter((row) => matchReportKeyword(row, keyword))
  const scopedProjects = reportData.projects.filter((row) => isReportInScope(row.startDate || row.endDate, reportScope) || reportScope === '?券').filter((row) => matchReportKeyword(row, keyword))
  const scopedReminders = reportData.reminders.filter((row) => isReportInScope(row.dueDate, reportScope)).filter((row) => matchReportKeyword(row, keyword))

  const purchaseTotal = scopedPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const purchaseOpen = scopedPurchases.filter((row) => !['撌脣???, '撌脣?瘨?].includes(row.status)).length
  const taskOpen = scopedTasks.filter((row) => !['撌脣???, '撌脫??].includes(row.lane || row.status)).length
  const taskWaiting = scopedTasks.filter((row) => ['蝑???', '蝑?閬?, '?⊿?'].includes(row.lane || row.status)).length
  const projectRisk = scopedProjects.filter((row) => String(row.health || row.tone || '').includes('敺?) || row.tone === 'red').length
  const reminderSummary = getReminderSummary(reportData.reminders)
  const reportRiskTotal = taskWaiting + projectRisk + reminderSummary.overdue + scopedPurchases.filter((row) => (row.arrivalStatus || '?芸鞎?) !== '撌脣鞎? && !['撌脣???, '撌脣?瘨?].includes(row.status || '')).length
  const reportEfficiencyScore = Math.max(0, Math.min(100, 100 - taskWaiting * 6 - projectRisk * 8 - reminderSummary.overdue * 9 - purchaseOpen * 2))
  const reportDecisionCards = [
    { label: '蝞∠??', value: reportEfficiencyScore, note: reportRiskTotal ? `${reportRiskTotal} ??暺?? : '??帘摰? },
    { label: '?∟頃敺???', value: scopedPurchases.length ? `${Math.round((purchaseOpen / scopedPurchases.length) * 100)}%` : '0%', note: `${purchaseOpen} / ${scopedPurchases.length} 蝑 },
    { label: '隞餃??⊿???, value: scopedTasks.length ? `${Math.round((taskWaiting / scopedTasks.length) * 100)}%` : '0%', note: `${taskWaiting} / ${scopedTasks.length} 蝑 },
    { label: '???暹?', value: reminderSummary.overdue, note: `${reminderSummary.open} 蝑蝯?? },
  ]
  const vendorRanking = buildVendorRanking(scopedPurchases).slice(0, 6)
  const purchaseStatusRows = buildCountRows(scopedPurchases, (row) => row.status || '?芾身摰?).slice(0, 6)
  const taskStatusRows = buildCountRows(scopedTasks, (row) => row.lane || row.status || '?芾身摰?).slice(0, 6)
  const upcomingReminders = [...reportData.reminders]
    .filter((row) => row.status !== '撌脣???)
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 5)

  const focusRows = [
    ...scopedPurchases
      .filter((row) => !['撌脣???, '撌脣?瘨?].includes(row.status) || (row.paymentStatus || '?芯?甈?) !== '撌脖?甈? || (row.arrivalStatus || '?芸鞎?) !== '撌脣鞎?)
      .map((row) => ({ type: '?∟頃', title: purchaseTitle(row), meta: `${row.vendor || '?芣?摰???} 繚 ${row.status || '?芾身摰?} 繚 ${formatMoney(calculatePurchase(row).taxedTotal)}`, weight: calculatePurchase(row).taxedTotal + 3000 })),
    ...scopedTasks
      .filter((row) => ['蝺?, '擃?].includes(row.priority) || ['蝑???', '蝑?閬?, '?⊿?'].includes(row.lane || row.status))
      .map((row) => ({ type: row.__source || '隞餃?', title: row.title || row.id, meta: `${row.owner || '?芣?摰?} 繚 ${row.lane || row.status || '?芾身摰?} 繚 ${row.due || row.__date || '?芾身摰??}`, weight: ['蝺?, '擃?].includes(row.priority) ? 9000 : 4500 })),
    ...scopedProjects
      .filter((row) => String(row.health || '').includes('敺?) || row.tone === 'red')
      .map((row) => ({ type: '撠?', title: row.name || row.id, meta: `${row.phase || '?芾身摰?} 繚 ${row.owner || '?芣?摰?} 繚 ${row.progress || 0}%`, weight: 6000 })),
  ].sort((a, b) => b.weight - a.weight).slice(0, 8)

  const reportRows = buildReportTableRows(reportTab, { purchases: scopedPurchases, tasks: scopedTasks, projects: scopedProjects, reminders: scopedReminders })

  function exportCurrentReport() {
    const csv = toCsv(reportRows.csv)
    downloadFlowdeskText(`flowdesk_${reportTab}_${todayDate()}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function exportExecutiveSnapshot() {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      scope: reportScope,
      summary: { purchaseTotal, purchaseOpen, taskOpen, taskWaiting, projectRisk, reminders: reminderSummary },
      focusRows,
      vendorRanking,
      purchaseStatusRows,
      taskStatusRows,
    }
    downloadFlowdeskText(`flowdesk_report_snapshot_${todayDate()}.json`, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8')
  }

  return (
    <div className="insight-layout insight-ops-layout">
      <section className="flow-toolbar flowdesk-toolbar-v2 report-command-bar">
        <div>
          <p className="eyebrow">REPORT CENTER</p>
          <h2>?梯”??</h2>
          <span>?游?撌乩??遙?鞈潦?獢???鞈?嚗翰???箇??餈賜?????/span>
        </div>
        <div className="flow-toolbar-actions report-toolbar-actions">
          <span className="toolbar-soft-chip">{cloudStatus}</span>
          <label className="report-scope-select">??<select value={reportScope} onChange={(event) => setReportScope(event.target.value)}>{['?祇?, '?祆?', '?砍迤', '?券'].map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={reloadReportData}>??渡?</button>
          <button className="ghost-btn" type="button" onClick={exportExecutiveSnapshot}>?臬敹怎</button>
          <button className="primary-btn" type="button" onClick={exportCurrentReport}>?臬?桀??梯”</button>
        </div>
      </section>

      <section className="metric-strip full report-kpi-strip">
        <Metric label="?∟頃蝮賡?" value={formatMoney(purchaseTotal)} tone="green" />
        <Metric label="?芸??鞈? value={purchaseOpen} tone="amber" />
        <Metric label="?芸??極雿? value={taskOpen} tone="blue" />
        <Metric label="蝑? / ?⊿?" value={taskWaiting} tone="red" />
        <Metric label="撠?憸券" value={projectRisk} tone="violet" />
      </section>

      <section className="panel wide report-decision-panel">
        <PanelTitle eyebrow="DECISION VIEW" title="蝞∠?瘙箇???" action={reportScope} />
        <div className="report-decision-grid">
          {reportDecisionCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="report-grid-v1981">
        <article className="panel wide report-focus-panel">
          <PanelTitle eyebrow="???阡?" title="銝?甇亙??" />
          <div className="report-focus-list">
            {focusRows.length ? focusRows.map((row, index) => (
              <article key={`${row.type}-${row.title}-${index}`}>
                <span>{index + 1}</span>
                <div><strong>{row.title}</strong><small>{row.type} 繚 {row.meta}</small></div>
              </article>
            )) : <p>?桀?瘝??閬?亥蕭頩斤????/p>}
          </div>
        </article>

        <article className="panel report-side-card">
          <PanelTitle eyebrow="??" title="?唳???" />
          <div className="reminder-home-grid compact-reminder-grid">
            <article className="danger"><span>?暹?</span><strong>{reminderSummary.overdue}</strong></article>
            <article><span>隞</span><strong>{reminderSummary.today}</strong></article>
            <article><span>?祇?/span><strong>{reminderSummary.week}</strong></article>
            <article><span>?芰?</span><strong>{reminderSummary.open}</strong></article>
          </div>
        </article>
      </section>

      <section className="panel wide report-table-panel">
        <div className="report-table-head">
          <div>
            <p className="eyebrow">鞈??梯”</p>
            <h3>{reportTab}</h3>
          </div>
          <div className="report-table-tools">
            <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="???梯”?批捆..." />
            <div className="report-tab-switcher">
              {['蝮質汗', '?∟頃', '隞餃?', '撠?', '??'].map((tab) => <button key={tab} type="button" className={reportTab === tab ? 'active' : ''} onClick={() => setReportTab(tab)}>{tab}</button>)}
            </div>
          </div>
        </div>
        <div className="report-table-scroll">
          <table className="report-table-v1981">
            <thead><tr>{reportRows.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {reportRows.rows.map((row, index) => <tr key={`${reportTab}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}
              {!reportRows.rows.length && <tr><td colSpan={reportRows.headers.length}>?桀?瘝?蝚血?璇辣????/td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-grid-v1981 report-lower-grid">
        <article className="panel">
          <PanelTitle eyebrow="撱?" title="?∟頃????" />
          <div className="report-rank-list">
            {vendorRanking.length ? vendorRanking.map((row) => <article key={row.vendor}><div><strong>{row.vendor}</strong><span>{row.count} 蝑?/span></div><b>{formatMoney(row.amount)}</b></article>) : <p>撠撱??∟頃鞈???/p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="??? title="?∟頃??" />
          <div className="report-status-list">
            {purchaseStatusRows.length ? purchaseStatusRows.map((row) => <article key={row.label}><span>{row.label}</span><strong>{row.count}</strong></article>) : <p>撠?∟頃?????/p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="隞餃?" title="撌乩????撣? />
          <div className="report-status-list">
            {taskStatusRows.length ? taskStatusRows.map((row) => <article key={row.label}><span>{row.label}</span><strong>{row.count}</strong></article>) : <p>撠隞餃?鞈???/p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="?唳?" title="餈???" />
          <div className="report-mini-list">
            {upcomingReminders.length ? upcomingReminders.map((row) => <article key={row.id}><strong>{row.title}</strong><span>{row.dueDate || '?芾身摰??} 繚 {row.status}</span></article>) : <p>撠?芰?????/p>}
          </div>
        </article>
      </section>
    </div>
  )
}

function readFlowdeskLocalArray(key) {
  if (typeof window === 'undefined') return []
  try {
    const saved = window.localStorage.getItem(key)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function matchReportKeyword(row, keyword) {
  if (!keyword) return true
  return JSON.stringify(row || {}).toLowerCase().includes(keyword)
}

function isReportInScope(value, scope) {
  if (scope === '?券') return true
  const date = toDateOnly(value)
  if (!date) return scope === '?券'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  if (scope === '?祇?) start.setDate(today.getDate() - today.getDay())
  if (scope === '?祆?') start.setDate(1)
  if (scope === '?砍迤') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
  }
  start.setHours(0, 0, 0, 0)
  return date >= start && date <= today
}

function buildVendorRanking(purchases = []) {
  return Array.from(purchases.reduce((map, row) => {
    const vendor = row.vendor || '?芣?摰???
    const current = map.get(vendor) || { vendor, amount: 0, count: 0 }
    current.amount += calculatePurchase(row).taxedTotal
    current.count += 1
    map.set(vendor, current)
    return map
  }, new Map()).values()).sort((a, b) => b.amount - a.amount)
}

function buildCountRows(rows = [], getter) {
  return Array.from(rows.reduce((map, row) => {
    const label = getter(row) || '?芾身摰?
    map.set(label, (map.get(label) || 0) + 1)
    return map
  }, new Map()).entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function buildReportTableRows(tab, data) {
  if (tab === '?∟頃') {
    const rows = data.purchases.map((row) => {
      const amount = calculatePurchase(row).taxedTotal
      return {
        csv: { 蝺刻?: row.id, ?∟頃?批捆: purchaseTitle(row), 撱?: row.vendor || '', ??? row.status || '', ??: amount, 隞狡: row.paymentStatus || '?芯?甈?, ?啗疏: row.arrivalStatus || '?芸鞎?, 撽: row.acceptanceStatus || '?芷??? },
        cells: [row.id, purchaseTitle(row), row.vendor || '?芣?摰?, row.status || '?芾身摰?, formatMoney(amount), row.paymentStatus || '?芯?甈?, row.arrivalStatus || '?芸鞎?],
      }
    })
    return { headers: ['蝺刻?', '?∟頃?批捆', '撱?', '???, '??', '隞狡', '?啗疏'], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '隞餃?') {
    const rows = data.tasks.map((row) => ({
      csv: { 蝺刻?: row.id, 璅?: row.title || '', 靘?: row.__source || row.source || '', ??? row.lane || row.status || '', ?芸?蝝? row.priority || '', 鞎痊鈭? row.owner || '', ?唳??? row.due || row.__date || '' },
      cells: [row.id, row.title || '?芸??, row.__source || row.source || '撌乩?', row.lane || row.status || '?芾身摰?, row.priority || '?芾身摰?, row.owner || '?芣?摰?, row.due || row.__date || '?芾身摰?],
    }))
    return { headers: ['蝺刻?', '璅?', '靘?', '???, '?芸?蝝?, '鞎痊鈭?, '?唳???], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '撠?') {
    const rows = data.projects.map((row) => ({
      csv: { 蝺刻?: row.id, 撠?: row.name || '', ?挾: row.phase || '', 鞎痊鈭? row.owner || '', ?脣漲: row.progress || 0, ?亙熒摨? row.health || '', 蝯??? row.endDate || '' },
      cells: [row.id, row.name || '?芸??獢?, row.phase || '?芾身摰?, row.owner || '?芣?摰?, `${row.progress || 0}%`, row.health || '?芾身摰?, row.endDate || '?芾身摰?],
    }))
    return { headers: ['蝺刻?', '撠?', '?挾', '鞎痊鈭?, '?脣漲', '?亙熒摨?, '蝯???], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '??') {
    const rows = data.reminders.map((row) => ({
      csv: { 蝺刻?: row.id, ??: row.title || '', 憿?: row.type || '', ??? row.status || '', ?芸?蝝? row.priority || '', ?唳??? row.dueDate || '' },
      cells: [row.id, row.title || '?芸????, row.type || '銝??, row.status || '?芾身摰?, row.priority || '?芾身摰?, row.dueDate || '?芾身摰?],
    }))
    return { headers: ['蝺刻?', '??', '憿?', '???, '?芸?蝝?, '?唳???], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  const summary = [
    { ?: '?∟頃蝑', ?詨? data.purchases.length, ?酉: '?桀?蝭拚???抒??∟頃蝝?? },
    { ?: '?∟頃蝮賡?', ?詨? data.purchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0), ?酉: '?怎????蜇' },
    { ?: '隞餃?蝑', ?詨? data.tasks.length, ?酉: '撌乩???遙?蕭頩文?雿? },
    { ?: '撠?蝑', ?詨? data.projects.length, ?酉: '?桀?蝭拚???抒?撠?' },
    { ?: '??蝑', ?詨? data.reminders.length, ?酉: '?桀?蝭拚???抒???' },
  ]
  return { headers: ['?', '?詨?, '?酉'], rows: summary.map((row) => [row.?, typeof row.?詨?=== 'number' && row.?.includes('蝮賡?') ? formatMoney(row.?詨? : row.?詨? row.?酉]), csv: summary }
}

function toCsv(rows = []) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
}

function downloadFlowdeskText(filename, content, type) {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
function toDateOnly(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getReminderDueInfo(dueDate) {
  const due = toDateOnly(dueDate)
  if (!due) return { label: '?芾身摰??, tone: 'slate', days: 999 }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: `?暹? ${Math.abs(days)} 憭奈, tone: 'red', days }
  if (days === 0) return { label: '隞予?唳?', tone: 'amber', days }
  if (days === 1) return { label: '?予?唳?', tone: 'blue', days }
  if (days <= 7) return { label: `${days} 憭拙?`, tone: 'blue', days }
  return { label: `${days} 憭拙?`, tone: 'slate', days }
}

function getReminderSummary(reminders) {
  return reminders.reduce((summary, item) => {
    if (item.status === '撌脣???) return summary
    const due = getReminderDueInfo(item.dueDate)
    summary.open += 1
    if (due.days < 0) summary.overdue += 1
    if (due.days === 0) summary.today += 1
    if (due.days === 1) summary.tomorrow += 1
    if (due.days >= 0 && due.days <= 7) summary.week += 1
    return summary
  }, { open: 0, overdue: 0, today: 0, tomorrow: 0, week: 0 })
}

function createEmptyReminder() {
  const today = new Date()
  today.setDate(today.getDate() + 3)
  const dueDate = today.toISOString().slice(0, 10)
  return { title: '', type: '餈質馱??', priority: '銝?, status: '敺???, dueDate, sourceType: '銝??, sourceTitle: '', note: '' }
}

function RemindersPage({ reminders, setReminders, onNavigateSource }) {
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('?券')
  const [typeFilter, setTypeFilter] = useState('?券')
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(createEmptyReminder())
  const summary = getReminderSummary(reminders)
  const filtered = reminders
    .filter((item) => statusFilter === '?券' || item.status === statusFilter)
    .filter((item) => typeFilter === '?券' || item.type === typeFilter)
    .filter((item) => {
      const q = keyword.trim().toLowerCase()
      if (!q) return true
      return [item.id, item.title, item.type, item.priority, item.status, item.sourceType, item.sourceTitle, item.note].join(' ').toLowerCase().includes(q)
    })
    .sort((a, b) => (toDateOnly(a.dueDate)?.getTime() || 0) - (toDateOnly(b.dueDate)?.getTime() || 0))
  const reminderGroups = [
    { id: 'overdue', title: '?暹?', rows: filtered.filter((item) => item.status !== '撌脣??? && getReminderDueInfo(item.dueDate).days < 0) },
    { id: 'today', title: '隞', rows: filtered.filter((item) => item.status !== '撌脣??? && getReminderDueInfo(item.dueDate).days === 0) },
    { id: 'tomorrow', title: '?', rows: filtered.filter((item) => item.status !== '撌脣??? && getReminderDueInfo(item.dueDate).days === 1) },
    { id: 'week', title: '?祇?, rows: filtered.filter((item) => item.status !== '撌脣??? && getReminderDueInfo(item.dueDate).days > 1 && getReminderDueInfo(item.dueDate).days <= 7) },
    { id: 'later', title: '銋?', rows: filtered.filter((item) => item.status !== '撌脣??? && getReminderDueInfo(item.dueDate).days > 7) },
    { id: 'done', title: '撌脣???, rows: filtered.filter((item) => item.status === '撌脣???) },
  ].filter((group) => group.rows.length)

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

  function deferReminder(id, days = 3) {
    updateReminder(id, { status: '撱嗅?', dueDate: addDaysDate(days) })
  }

  function completeAllOverdue() {
    setReminders((current) => current.map((item) => getReminderDueInfo(item.dueDate).days < 0 ? { ...item, status: '撌脣??? } : item))
  }

  function removeReminder(id) {
    const target = reminders.find((item) => item.id === id)
    if (!confirmDestructiveAction(target?.title || id || '??')) return
    setReminders((current) => current.filter((item) => item.id !== id))
  }

  function resetDemoReminders() {
    if (!confirmResetAction('蝣箏?閬?蝛箔蒂?蔭??鞈?嚗?)) return
    setReminders(initialReminders)
    window.localStorage.removeItem('flowdesk-reminders-v193')
  }

  return (
    <div className="reminders-layout">
      <section className="surface-toolbar reminders-hero">
        <div>
          <p className="eyebrow">??銝剖?</p>
          <h2>??鈭?撌乩??</h2>
        </div>
        <div className="record-actions">
          <button className="ghost-btn" type="button" onClick={resetDemoReminders}>皜征??鞈?</button>
          <button className="primary-btn" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? '?嗅??啣?' : '?啣???'}</button>
        </div>
      </section>

      <section className="metric-strip reminder-metric-strip reminder-metric-strip-v20">
        <Metric label="?暹?" value={summary.overdue} tone="red" />
        <Metric label="隞" value={summary.today} tone="amber" />
        <Metric label="?" value={summary.tomorrow} tone="blue" />
        <Metric label="?祇? value={summary.week} tone="violet" />
        <Metric label="?芰?" value={summary.open} tone="green" />
      </section>

      {showForm && (
        <section className="panel wide reminder-form-panel">
          <PanelTitle eyebrow="?啣???" title="撱箇?餈質馱鈭?" />
          <div className="reminder-form-grid">
            <label>璅?<input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="靘?嚗蕭頩文???孵?閬? /></label>
            <label>憿?<select value={draft.type} onChange={(event) => updateDraft('type', event.target.value)}>{reminderTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>?芸?蝝?select value={draft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>{reminderPriorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>?唳???input type="date" value={draft.dueDate} onChange={(event) => updateDraft('dueDate', event.target.value)} /></label>
            <label>?靘?<select value={draft.sourceType} onChange={(event) => updateDraft('sourceType', event.target.value)}>{reminderSourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>??迂<input value={draft.sourceTitle} onChange={(event) => updateDraft('sourceTitle', event.target.value)} placeholder="?∟頃?柴?獢?隞餃??迂" /></label>
            <label className="wide-field">?酉<textarea value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} placeholder="鋆?閬蕭頩斤??批捆" /></label>
          </div>
          <div className="modal-actions inline-actions"><button type="button" onClick={() => setShowForm(false)}>??</button><button type="button" className="primary-btn" onClick={addReminder}>撱箇???</button></div>
        </section>
      )}

      <section className="panel wide reminder-list-panel">
        <div className="purchase-filter-bar reminder-filter-bar">
          <label className="purchase-search-field">??<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="璅????臭?皞?閮?.." /></label>
          <label>???select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="?券">?券</option>{reminderStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>憿?<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="?券">?券</option>{reminderTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={() => { setKeyword(''); setStatusFilter('?券'); setTypeFilter('?券') }}>皜蝭拚</button>
        </div>
        <div className="reminder-bulk-actions">
          <button type="button" onClick={() => { setStatusFilter('?券'); setTypeFilter('?券'); setKeyword('') }}>?券??</button>
          <button type="button" onClick={completeAllOverdue} disabled={!summary.overdue}>?暹??券摰?</button>
        </div>
        <div className="reminder-card-list reminder-grouped-list">
          {reminderGroups.length ? reminderGroups.map((group) => (
            <section className="reminder-date-group" key={group.id}>
              <div className="reminder-date-head"><strong>{group.title}</strong><span>{group.rows.length} 蝑?/span></div>
              {group.rows.map((item) => {
                const due = getReminderDueInfo(item.dueDate)
                return (
                  <article className={`reminder-card ${item.status === '撌脣??? ? 'done' : ''}`} key={item.id}>
                    <div className="reminder-card-main">
                      <span className="record-id">{item.id}</span>
                      <strong>{item.title}</strong>
                      <small>{item.sourceType} 繚 {item.sourceTitle || '?芣?摰?} 繚 {item.type}</small>
                      <p>{item.note}</p>
                    </div>
                    <div className="reminder-card-meta">
                      <Badge value={item.priority} />
                      <span className={`due-chip ${due.tone}`}>{due.label}</span>
                      <select value={item.status} onChange={(event) => updateReminder(item.id, { status: event.target.value })}>{reminderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    </div>
                    <div className="reminder-card-actions">
                      <button type="button" onClick={() => updateReminder(item.id, { status: item.status === '撌脣??? ? '敺??? : '撌脣??? })}>{item.status === '撌脣??? ? '???' : '摰?'}</button>
                      <button type="button" onClick={() => deferReminder(item.id, 1)}>?予</button>
                      <button type="button" onClick={() => deferReminder(item.id, 7)}>銝?/button>
                      {item.sourceType !== '銝?? && <button type="button" onClick={() => onNavigateSource?.(item)}>???</button>}
                      <button className="danger" type="button" onClick={() => removeReminder(item.id)}>?芷</button>
                    </div>
                  </article>
                )
              })}
            </section>
          )) : <div className="purchase-empty-state">瘝?蝚血?璇辣??????/div>}
        </div>
      </section>
    </div>
  )
}

function SettingsPage({ themeOptions, uiTheme, setUiTheme, iconStyleMode, setIconStyleMode, resolvedIconStyle, modules, collections, setCollections, moduleIcons, setModuleIcons, baseTableIcons, setBaseTableIcons, setReminders }) {
  const [settingsView, setSettingsView] = useState('home')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [restorePreview, setRestorePreview] = useState(null)
  const restoreInputRef = useRef(null)
  const activeTheme = themeOptions.find((theme) => theme.id === uiTheme) || themeOptions[0]
  const activeIconStyle = iconStyleOptions.find((style) => style.id === resolvedIconStyle) || iconStyleOptions[1]
  const selectedIconStyle = iconStyleOptions.find((style) => style.id === iconStyleMode) || iconStyleOptions[0]
  const sortedCollections = [...collections].sort((a, b) => (a.order || 0) - (b.order || 0))
  const [newCollectionName, setNewCollectionName] = useState('')
  const backupWorkspaceKeys = [
    { key: 'work_items', label: '撌乩??' },
    { key: 'reminders', label: '??銝剖?' },
    { key: 'collections', label: '鞈???' },
    { key: 'purchases', label: '?∟頃鞈?' },
    { key: 'purchase_history', label: '?∟頃甇瑞?' },
    { key: 'purchase_stages', label: '?∟頃瘚?' },
    { key: 'projects', label: '撠?蝞∠?' },
  ]
  const backupLocalKeys = [
    'flowdesk-work-items-v196',
    'flowdesk-reminders-v193',
    'flowdesk-collections-v194',
    'flowdesk-purchases-v19',
    'flowdesk-purchase-history-v19',
    'flowdesk-purchase-stages',
    'flowdesk-module-order',
    'flowdesk-ui-theme',
    'flowdesk-icon-style-mode',
    'flowdesk-module-icons',
    'flowdesk-base-table-icons',
  ]

  function readLocalBackupValue(key) {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    try {
      return { type: 'json', value: JSON.parse(raw) }
    } catch {
      return { type: 'text', value: raw }
    }
  }

  function writeLocalBackupValue(key, entry) {
    if (!entry) return
    const value = entry.type === 'text' ? String(entry.value ?? '') : JSON.stringify(entry.value)
    window.localStorage.setItem(key, value)
  }

  function downloadBackupFile(payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FlowDesk?遢_${todayDate()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function exportWorkspaceBackup() {
    if (backupBusy) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      const local = {}
      backupLocalKeys.forEach((key) => {
        const value = readLocalBackupValue(key)
        if (value) local[key] = value
      })

      const cloud = {}
      if (flowdeskCloud) {
        for (const item of backupWorkspaceKeys) {
          const { data } = await flowdeskCloud.getWorkspaceData(item.key)
          cloud[item.key] = data ?? null
        }
      }

      downloadBackupFile({
        app: 'FlowDesk',
        version: FLOWDESK_APP_VERSION,
        exportedAt: new Date().toISOString(),
        cloudEnabled: Boolean(flowdeskCloud),
        local,
        cloud,
      })
      setBackupMessage('?遢撌脣??)
    } catch {
      setBackupMessage('?遢憭望?嚗?蝔??岫')
    } finally {
      setBackupBusy(false)
    }
  }

  async function restoreWorkspaceBackup(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || backupBusy) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      const raw = await file.text()
      const payload = JSON.parse(raw)
      const localCount = payload?.local && typeof payload.local === 'object' ? Object.keys(payload.local).length : 0
      const cloudKeys = payload?.cloud && typeof payload.cloud === 'object' ? Object.keys(payload.cloud).filter((key) => backupWorkspaceKeys.some((item) => item.key === key)) : []
      setRestorePreview({ payload, localCount, cloudKeys, fileName: file.name })
      setBackupMessage('撌脰???隞賣?嚗?蝣箄?敺???')
    } catch {
      setBackupMessage('??憭望?嚗?蝣箄?瑼??澆?')
    } finally {
      setBackupBusy(false)
    }
  }

  async function createSafetyBackupBeforeRestore() {
    const local = {}
    backupLocalKeys.forEach((key) => {
      const value = readLocalBackupValue(key)
      if (value) local[key] = value
    })
    const cloud = {}
    if (flowdeskCloud) {
      for (const item of backupWorkspaceKeys) {
        const { data } = await flowdeskCloud.getWorkspaceData(item.key)
        cloud[item.key] = data ?? null
      }
    }
    downloadBackupFile({
      app: 'FlowDesk',
      version: `${FLOWDESK_APP_VERSION}-before-restore`,
      exportedAt: new Date().toISOString(),
      reason: 'restore safety backup',
      local,
      cloud,
    })
  }

  async function confirmRestorePreview() {
    if (!restorePreview?.payload || backupBusy) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      await createSafetyBackupBeforeRestore()
      const payload = restorePreview.payload
      if (payload?.local && typeof payload.local === 'object') {
        Object.entries(payload.local).forEach(([key, entry]) => writeLocalBackupValue(key, entry))
      }
      if (payload?.cloud && flowdeskCloud) {
        for (const [key, value] of Object.entries(payload.cloud)) {
          if (backupWorkspaceKeys.some((item) => item.key === key)) {
            await flowdeskCloud.setWorkspaceData(key, value ?? [])
          }
        }
      }
      setBackupMessage('??摰?嚗??唳????')
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      setBackupMessage('??憭望?嚗歇靽??桀?鞈?')
      setBackupBusy(false)
    }
  }

  async function clearWorkspaceModule(dataKey) {
    const target = backupWorkspaceKeys.find((item) => item.key === dataKey)
    if (!target) return
    if (!window.confirm(`蝣箏?閬?蝛箝?{target.label}??甇文?雿??蝛箄府璅∠?鞈??)) return
    setBackupBusy(true)
    try {
      const localMap = {
        work_items: ['flowdesk-work-items-v196'],
        reminders: ['flowdesk-reminders-v193'],
        collections: ['flowdesk-collections-v194'],
        purchases: ['flowdesk-purchases-v19'],
        purchase_history: ['flowdesk-purchase-history-v19'],
        purchase_stages: ['flowdesk-purchase-stages'],
        projects: [],
      }
      ;(localMap[dataKey] || []).forEach((key) => window.localStorage.removeItem(key))
      if (flowdeskCloud) await flowdeskCloud.setWorkspaceData(dataKey, [])
      setBackupMessage(`${target.label} 撌脫?蝛綽???渡?敺??)
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      setBackupMessage('皜征璅∠?鞈?憭望?')
      setBackupBusy(false)
    }
  }

  async function clearWorkspaceData() {
    if (!window.confirm('蝣箏?閬?蝛?FlowDesk 撌乩?鞈?嚗迨??????亥身摰?)) return
    setBackupBusy(true)
    try {
      backupLocalKeys.filter((key) => !key.includes('theme') && !key.includes('icon') && !key.includes('module-order')).forEach((key) => window.localStorage.removeItem(key))
      if (flowdeskCloud) {
        for (const item of backupWorkspaceKeys) await flowdeskCloud.setWorkspaceData(item.key, [])
      }
      setBackupMessage('鞈?撌脫?蝛綽???渡?敺???)
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      setBackupMessage('皜征鞈?憭望?')
      setBackupBusy(false)
    }
  }

  function resetPurchaseDemo() {
    if (!confirmResetAction('蝣箏?閬?蝛箸鞈潸????∟頃蝝?風蝔?瘚?閮剖??◤蝘駁??)) return
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
    if (!confirmResetAction('蝣箏?閬敺拚?閮剖?蝷綽??桀??芾??內?◤閬???)) return
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
        fields: ['?迂', '???, '鞎痊鈭?, '?酉'],
        color: 'blue',
        icon: '??',
        visible: true,
        locked: false,
        order: Math.max(0, ...current.map((item) => Number(item.order) || 0)) + 1,
        defaultView: 'list',
      },
    ])
    setBaseTableIcons((current) => ({ ...current, [nextId]: '??' }))
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
    if (!confirmDestructiveAction(target?.name || '鞈???')) return
    setCollections((current) => current.filter((item) => item.id !== collectionId))
    setBaseTableIcons((current) => {
      const next = { ...current }
      delete next[collectionId]
      return next
    })
  }

  function resetCollections() {
    if (!confirmResetAction('蝣箏?閬敺拚?閮剛??????桀??芾????◤閬???)) return
    setCollections(baseTables.map((item) => ({ ...item })))
    setBaseTableIcons(defaultBaseTableIcons)
    window.localStorage.removeItem('flowdesk-collections-v194')
    window.localStorage.removeItem('flowdesk-base-table-icons')
  }

  function resetReminderDemo() {
    if (!confirmResetAction('蝣箏?閬?蝛箸?????甇文?雿?皜??銝剖?鞈???)) return
    setReminders([])
    window.localStorage.removeItem('flowdesk-reminders-v193')
    if (flowdeskCloud) flowdeskCloud.setWorkspaceData('reminders', []).catch(() => null)
  }

  const settingCards = [
    { id: 'appearance', title: '憭?閮剖?', eyebrow: 'UI THEME', summary: `?桀?銝駁?嚗?{activeTheme.name}`, icon: '?' },
    { id: 'purchase', title: '?∟頃閮剖?', eyebrow: 'PURCHASE', summary: '?∟頃鞈???蝔雁霅?, icon: '?屁' },
    { id: 'collections', title: '鞈???閮剖?', eyebrow: 'COLLECTIONS', summary: `${collections.filter((item) => item.visible !== false).length} ?＊蝷箔葉嚗恣????????憭?`, icon: '??' },
    { id: 'sidebar', title: '?湧?甈身摰?, eyebrow: 'LAYOUT', summary: '璅∠????????', icon: '?妣' },
    { id: 'icons', title: '?內閮剖?', eyebrow: 'ICONS', summary: `?桀?憸冽嚗?{iconStyleMode === 'auto' ? '頝 UI 銝駁?' : activeIconStyle.name}`, icon: '?? },
    { id: 'reminders', title: '??閮剖?', eyebrow: 'REMINDERS', summary: '??憿?????鞈??渡?', icon: '??' },
    { id: 'data', title: '鞈??遢', eyebrow: 'BACKUP', summary: '?臬????蝛箄??郊瑼Ｘ', icon: '?' },
    { id: 'focus', title: '?摰?', eyebrow: 'FLOWDESK', summary: '?嗆?????芋蝯??, icon: '?妣' },
    { id: 'system', title: '蝟餌絞鞈?', eyebrow: 'VERSION', summary: FLOWDESK_VERSION_LABEL, icon: '??' },
  ]
  const v20Checklist = [
    ['??嗆?', '撌乩???鞈潦?獢??葉敹???啣????踹?鈭??'],
    ['?∟頃蝞∠?', '憭???憿蜇憿O/?勗??蝞榆?啜??風蝔?皜?詨?蝛拙???],
    ['撠?蝞∠?', '???蝔?摰??遣蝡極雿脣漲隡啁???閬??],
    ['??銝剖?', '?暹????乓??乓?勗?蝯??舀撱嗅????舫???],
    ['閮剖??遢', '?臬?汗?????芸??遢??璅∠?皜征??甇亦???],
    ['??銝?游?', '撌亙?征???湔?蝝啜?撠祟?貉??臬?亙?嗆?'],
  ]
  const syncStatusText = flowdeskCloud ? '?脩垢鞈??郊撌脣??? : '?桀?雿輻?祆??鞈?'
  const lastSyncText = typeof window !== 'undefined' ? (window.localStorage.getItem('flowdesk-last-cloud-sync') || '撠摰??郊') : '??

  return (
    <div className="settings-layout settings-hub-layout">
      <section className="surface-toolbar settings-hero">
        <div>
          <p className="eyebrow">蝟餌絞閮剖?</p>
          <h2>{settingsView === 'home' ? '閮剖?銝剖?' : settingCards.find((item) => item.id === settingsView)?.title}</h2>
        </div>
        {settingsView === 'home' ? (
          <button className="ghost-btn" type="button" onClick={() => setSettingsView('appearance')}>隤踵憭?</button>
        ) : (
          <button className="ghost-btn" type="button" onClick={() => setSettingsView('home')}>餈?閮剖?銝剖?</button>
        )}
      </section>

      {settingsView === 'home' && (
        <section className="panel wide settings-panel settings-overview-panel">
          <PanelTitle eyebrow="閮剖???" title="?豢?閬矽?渡??" />
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
        <section className="panel wide settings-panel fd30-appearance-panel">
          <PanelTitle eyebrow="憭?閮剖?" title="銝駁??脣?蝯? />
          <p className="settings-note">??敺?蝡憟?唬蜓閬???蝐扎??脣漲璇??暺?撓?交? focus ?脰???遙????內憸冽閮剔????UI 銝駁????內銋?銝韏瑁矽?氬?/p>
          <div className="fd30-theme-toolbar">
            <div>
              <span>?桀?憟</span>
              <strong>{activeTheme.name}</strong>
              <small>{activeTheme.description}</small>
            </div>
            <button className="ghost-btn fd30-reset-theme-btn" type="button" onClick={() => setUiTheme('blue')}>?儔?身??/button>
          </div>
          <div className="theme-grid packaged-theme-grid fd30-theme-grid">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                className={uiTheme === theme.id ? 'theme-option active' : 'theme-option'}
                type="button"
                onClick={() => setUiTheme(theme.id)}
                style={{ '--theme-preview-color': theme.accent }}
              >
                <span className={`theme-swatch ${theme.id}`} />
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
                <em>蝡憟</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsView === 'purchase' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="?∟頃閮剖?" title="?∟頃鞈?" />
          <p className="settings-note">?∟頃?舐蝡????剁?靽?憭???撠祟?詻???湔?蝝啜蝑?支?霅瑁??∟頃瘚?閮剖???/p>
          <button className="ghost-btn" type="button" onClick={resetPurchaseDemo}>皜征?∟頃鞈?</button>
        </section>
      )}

      {settingsView === 'sidebar' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="?閮剖?" title="?湧?甈?摨? />
          <p className="settings-note">?湧?甈芋蝯隞交??唾矽?湧?摨?蝟餌絞???雿????/p>
        </section>
      )}

      {settingsView === 'collections' && (
        <section className="panel wide settings-panel settings-detail-panel collection-settings-panel">
          <PanelTitle eyebrow="鞈???" title="蝞∠?鞈???" />
          <p className="settings-note">?ㄐ?芰恣???葉敹?鞈????亙??蝷箝??脯＊蝷箇????身閬?嚗?蝔?雁?鞈潛蝡身摰?/p>
          <div className="collection-add-row">
            <input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="頛詨?啁?鞈????迂嚗?憒???皜" />
            <button className="primary-btn" type="button" onClick={addCollection}>?啣?鞈???</button>
          </div>
          <div className="collection-editor-list">
            {sortedCollections.map((collection, index) => (
              <article className={collection.visible === false ? 'collection-editor disabled' : 'collection-editor'} key={collection.id}>
                <span className={`collection-preview ${collection.color}`}>{baseTableIcons[collection.id] || baseTableIcons[collection.name] || defaultBaseTableIcons[collection.name] || collection.icon || '??'}</span>
                <input value={collection.name} onChange={(event) => updateCollection(collection.id, { name: event.target.value })} />
                <select value={collection.color || 'blue'} onChange={(event) => updateCollection(collection.id, { color: event.target.value })}>
                  {collectionColorOptions.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
                <select value={collection.defaultView || 'list'} onChange={(event) => updateCollection(collection.id, { defaultView: event.target.value })}>
                  {collectionViewOptions.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
                </select>
                <label className="collection-toggle"><input type="checkbox" checked={collection.visible !== false} onChange={(event) => updateCollection(collection.id, { visible: event.target.checked })} />憿舐內</label>
                <div className="collection-order-actions">
                  <button type="button" onClick={() => moveCollection(collection.id, -1)} disabled={index === 0}>??/button>
                  <button type="button" onClick={() => moveCollection(collection.id, 1)} disabled={index === sortedCollections.length - 1}>??/button>
                </div>
                <button className="stage-remove" type="button" onClick={() => removeCollection(collection.id)} disabled={collection.locked}>?芷</button>
              </article>
            ))}
          </div>
          <div className="icon-settings-actions">
            <button className="ghost-btn" type="button" onClick={resetCollections}>?Ｗ儔?身鞈???</button>
          </div>
        </section>
      )}

      {settingsView === 'icons' && (
        <section className="panel wide settings-panel settings-detail-panel icon-settings-panel">
          <PanelTitle eyebrow="?內閮剖?" title="銝駁?株?鞈?皜?內" />
          <p className="settings-note">?ㄐ?臭誑???湔?撌血銝駁?株?蝝?葉敹????桃??內?靘????格憓?憿?嚗????曉?ㄐ??/p>
          <div className="icon-style-panel">
            <div>
              <p className="eyebrow">ICON STYLE</p>
              <h3>?內憸冽</h3>
              <small>?桀?憟嚗iconStyleMode === 'auto' ? `${selectedIconStyle.name}嚗??蝙??${activeIconStyle.name}` : activeIconStyle.name}</small>
            </div>
            <div className="icon-style-options">
              {iconStyleOptions.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={iconStyleMode === style.id ? 'icon-style-option active' : 'icon-style-option'}
                  onClick={() => setIconStyleMode(style.id)}
                >
                  <span className={`icon-style-sample ${style.id === 'auto' ? resolvedIconStyle : style.id}`}>??/span>
                  <strong>{style.name}</strong>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="icon-settings-actions">
            <button className="ghost-btn" type="button" onClick={resetIconSettings}>?Ｗ儔?身?內</button>
          </div>
          <div className="icon-settings-section">
            <h3>撌血銝駁??/h3>
            <div className="icon-picker-list">
              {modules.map((module) => (
                <IconPickerRow key={module.id} title={module.name} currentIcon={moduleIcons[module.id] || defaultModuleIcons[module.id] || '??} onSelect={(icon) => setModuleIcon(module.id, icon)} />
              ))}
            </div>
          </div>
          <div className="icon-settings-section">
            <h3>鞈?皜</h3>
            <div className="icon-picker-list">
              {sortedCollections.map((table) => (
                <IconPickerRow key={table.id} title={table.name} currentIcon={baseTableIcons[table.id] || baseTableIcons[table.name] || defaultBaseTableIcons[table.name] || table.icon || '??'} onSelect={(icon) => setBaseTableIcon(table.id, icon)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {settingsView === 'reminders' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="??閮剖?" title="??銝剖?" />
          <p className="settings-note">??銝剖??桀??舀銝?祆??蕭頩斗?????閬偷?詻鞎刻?蝥?????/p>
          <div className="settings-info-list">
            <div><span>??憿?</span><strong>{reminderTypeOptions.length} 蝔?/strong></div>
            <div><span>?????/span><strong>{reminderStatusOptions.join(' / ')}</strong></div>
            <div><span>擐???</span><strong>?暹? / 隞 / ? / ?祇?/ ?芰?</strong></div>
          </div>
          <button className="ghost-btn" type="button" onClick={resetReminderDemo}>皜征??鞈?</button>
        </section>
      )}

      {settingsView === 'data' && (
        <section className="panel wide settings-panel settings-detail-panel data-backup-panel">
          <PanelTitle eyebrow="鞈??遢" title="?遢???? />
          <div className="backup-sync-strip">
            <article><span>?郊???/span><strong>{syncStatusText}</strong></article>
            <article><span>?敺?甇?/span><strong>{lastSyncText}</strong></article>
            <article><span>?遢?</span><strong>{FLOWDESK_VERSION_LABEL}</strong></article>
          </div>
          <div className="backup-action-grid">
            <article>
              <span>?臬鞈?</span>
              <strong>銝? JSON ?遢</strong>
              <button className="primary-btn" type="button" onClick={exportWorkspaceBackup} disabled={backupBusy}>{backupBusy ? '??銝?..' : '?臬?遢'}</button>
            </article>
            <article>
              <span>??鞈?</span>
              <strong>敺?隞賣???</strong>
              <button className="ghost-btn" type="button" onClick={() => restoreInputRef.current?.click()} disabled={backupBusy}>?豢??遢瑼?/button>
              <input ref={restoreInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={restoreWorkspaceBackup} />
            </article>
            <article className="danger">
              <span>皜征鞈?</span>
              <strong>靽??餃閮剖?</strong>
              <button className="danger" type="button" onClick={clearWorkspaceData} disabled={backupBusy}>皜征撌乩?鞈?</button>
            </article>
          </div>
          {restorePreview && (
            <section className="restore-preview-card">
              <div><span>敺???獢?/span><strong>{restorePreview.fileName}</strong></div>
              <div><span>?祆?鞈???/span><strong>{restorePreview.localCount}</strong></div>
              <div><span>?脩垢鞈???/span><strong>{restorePreview.cloudKeys.length}</strong></div>
              <div className="restore-preview-actions">
                <button className="primary-btn" type="button" onClick={confirmRestorePreview} disabled={backupBusy}>蝣箄???</button>
                <button className="ghost-btn" type="button" onClick={() => setRestorePreview(null)} disabled={backupBusy}>??</button>
              </div>
            </section>
          )}
          <div className="settings-info-list backup-key-list backup-key-list-v1991">
            {backupWorkspaceKeys.map((item) => <div key={item.key}><span>{item.label}</span><strong>{item.key}</strong><button type="button" onClick={() => clearWorkspaceModule(item.key)} disabled={backupBusy}>皜征甇斗芋蝯?/button></div>)}
          </div>
          {backupMessage && <div className="backup-message">{backupMessage}</div>}
        </section>
      )}

      {settingsView === 'focus' && (
        <section className="panel wide settings-panel settings-detail-panel focus-definition-panel">
          <PanelTitle eyebrow="?摰?" title="FlowDesk v20.1.0 ?嗆???" />
          <p className="settings-note">????摰寞????????啣?雿????芣????踹??颲艾鞈潔??蜓瘚???獢?????怒?/p>
          <div className="focus-definition-grid">
            {Object.entries(modulePurposeMap).filter(([key]) => ['board', 'base', 'roadmap', 'reminders', 'desk', 'insight'].includes(key)).map(([key, item]) => (
              <article key={key}>
                <span>{pageTitle(key, modules)}</span>
                <strong>{item.scope}</strong>
                <p>{item.avoid}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {settingsView === 'system' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="蝟餌絞鞈?" title={FLOWDESK_VERSION_LABEL} />
          <div className="settings-info-list">
            <div><span>????/span><strong>{FLOWDESK_VERSION_LABEL} ??嗆???/strong></div>
            <div><span>?脩垢?郊</span><strong>{flowdeskCloud ? '撌脣??? : '?祆?璅∪?'}</strong></div>
            <div><span>Supabase 閮剖?</span><strong>{hasSupabaseConfig ? '撌脰身摰? : '?芾身摰?}</strong></div>
            <div><span>?敺?甇交???/span><strong>{lastSyncText}</strong></div>
            <div><span>?敺炎??/span><strong>{new Date().toLocaleString('zh-TW', { hour12: false })}</strong></div>
            <div><span>?桀?銝駁?</span><strong>{activeTheme.name}</strong></div>
            <div><span>?內憸冽</span><strong>{iconStyleMode === 'auto' ? `頝 UI 銝駁?嚗?{activeIconStyle.name}嚗 : activeIconStyle.name}</strong></div>
            <div><span>??銝剖?</span><strong>?芸?????</strong></div>
            <div><span>?∟頃鞈?</span><strong>靽??∟頃銝餅?蝔?/strong></div>
            <div><span>鞈???</span><strong>?寧頛蝝???/strong></div>
          </div>
          <div className="flowdesk-v20-checklist">
            {v20Checklist.map(([title, detail]) => (
              <article key={title}>
                <span>撌脰?朣?/span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
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
            aria-label={`閮剖? ${title} ?內??${icon}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </article>
  )
}


function ContextPanel({ selected, onUpdateItem, onDeleteItem, onDuplicateItem }) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!selected) {
      setDraft(null)
      return
    }
    setDraft({
      title: selected.title || '',
      lane: selected.lane || '敺?憿?,
      priority: selected.priority || '銝?,
      type: selected.type || '銝?砍極雿?,
      owner: selected.owner || '',
      requester: selected.requester || '',
      due: selected.due || '',
      health: Number.isFinite(Number(selected.health)) ? Number(selected.health) : 100,
      relation: selected.relation || '',
      channel: selected.channel || '',
      note: selected.note || '',
      tagsText: Array.isArray(selected.tags) ? selected.tags.join('??) : '',
    })
  }, [selected])

  if (!selected || !draft) {
    return (
      <div className="context-inner context-empty">
        <p className="eyebrow">閰喟敦?汗</p>
        <h2>?芷?極雿?/h2>
        <p>撌乩???桀?瘝??舫?閬賜????/p>
      </div>
    )
  }

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const saveDraft = () => {
    onUpdateItem?.(selected.id, {
      ...draft,
      title: draft.title.trim() || '?芸?極雿?,
      health: Math.max(0, Math.min(100, Number(draft.health) || 0)),
      tags: draft.tagsText.split(/[??嚗n]/).map((tag) => tag.trim()).filter(Boolean),
    })
  }

  return (
    <div className="context-inner editable-context-panel">
      <p className="eyebrow">閰喟敦?汗</p>
      <h2>{selected.title}</h2>
      <div className="context-meta">
        <Badge value={selected.lane} />
        <Badge value={selected.priority} />
        <span>{selected.id}</span>
      </div>

      <div className="work-edit-form">
        <label className="work-edit-wide"><span>璅?</span><input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
        <label><span>???/span><select value={draft.lane} onChange={(event) => updateDraft('lane', event.target.value)}>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
        <label><span>?芸?蝝?/span><select value={draft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>{['蝺?, '擃?, '銝?, '雿?].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>憿?</span><input value={draft.type} onChange={(event) => updateDraft('type', event.target.value)} /></label>
        <label><span>鞎痊鈭?/span><input value={draft.owner} onChange={(event) => updateDraft('owner', event.target.value)} /></label>
        <label><span>?鈭?/span><input value={draft.requester} onChange={(event) => updateDraft('requester', event.target.value)} /></label>
        <label><span>?唳???/span><input type="date" value={draft.due} onChange={(event) => updateDraft('due', event.target.value)} /></label>
        <label><span>?亙熒摨?/span><input type="number" min="0" max="100" value={draft.health} onChange={(event) => updateDraft('health', event.target.value)} /></label>
        <label><span>靘?</span><input value={draft.channel} onChange={(event) => updateDraft('channel', event.target.value)} /></label>
        <label className="work-edit-wide"><span>?鞈?</span><input value={draft.relation} onChange={(event) => updateDraft('relation', event.target.value)} /></label>
        <label className="work-edit-wide"><span>璅惜</span><input value={draft.tagsText} onChange={(event) => updateDraft('tagsText', event.target.value)} placeholder="隞仿???????" /></label>
        <label className="work-edit-wide"><span>???酉</span><textarea value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} rows={4} /></label>
      </div>

      <div className="context-quick-lanes">
        {lanes.map((lane) => <button key={lane.id} type="button" className={draft.lane === lane.id ? 'active' : ''} onClick={() => updateDraft('lane', lane.id)}>{lane.title}</button>)}
      </div>

      <div className="context-action-row">
        <button className="primary-btn" type="button" onClick={saveDraft}>?脣?</button>
        <button type="button" onClick={() => onDuplicateItem?.(selected.id)}>銴ˊ</button>
        <button className="danger" type="button" onClick={() => onDeleteItem?.(selected.id)}>?芷</button>
      </div>
    </div>
  )
}

function CreateLauncher({ onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="launcher">
        <div className="launcher-head">
          <div><p className="eyebrow">敹恍遣蝡?/p><h2>撱箇??啁??</h2></div>
          <button type="button" onClick={onClose}>??/button>
        </div>
        <div className="launcher-grid">
          {['撌乩?敺齒', '?∟頃??, '撠?', '撱?蝝??, '?辣??', '??閬?'].map((title) => <button type="button" key={title}><strong>{title}</strong></button>)}
        </div>
      </section>
    </div>
  )
}


function createPurchaseKey() {
  return `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getPurchaseKey(row) {
  if (!row) return ''
  return row._purchaseKey || row.uid || row.key || row.id || ''
}

function isSamePurchase(a, b) {
  if (!a || !b) return false
  const aKey = getPurchaseKey(a)
  const bKey = getPurchaseKey(b)
  if (aKey && bKey) return aKey === bKey
  return Boolean(a.id && b.id && a.id === b.id)
}

function normalizePurchaseList(rows = []) {
  const used = new Set()
  const maxInitial = rows.reduce((max, item) => {
    const matched = String(item?.id || '').match(/PO-(\d+)/)
    return matched ? Math.max(max, Number(matched[1])) : max
  }, 0)
  let maxNumber = maxInitial
  return rows.map((row, index) => {
    const next = normalizePurchase(row || {})
    let nextId = String(next.id || '').trim()
    if (!nextId || used.has(nextId)) {
      do {
        maxNumber += 1
        nextId = `PO-${String(maxNumber).padStart(3, '0')}`
      } while (used.has(nextId))
    }
    used.add(nextId)
    return {
      ...next,
      id: nextId,
      _purchaseKey: next._purchaseKey || next.uid || next.key || `purchase-${nextId}-${index}`,
    }
  })
}

function PurchaseModal({ onClose, onSubmit, stages, initial, mode = 'create' }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id,
    _purchaseKey: initial?._purchaseKey || initial?.uid || initial?.key,
    item: initial ? purchaseTitle(initial) : '',
    items: initial ? getPurchaseItems(initial) : [{ id: `line-${Date.now()}`, name: '', quantity: 1, unitPrice: 0, note: '' }],
    department: initial?.department || '',
    requester: initial?.requester || '',
    vendor: initial?.vendor || '',
    taxMode: initial?.taxMode || '?芰?',
    taxRate: initial?.taxRate ?? 5,
    quoteAmount: initial?.quoteAmount || 0,
    budgetAmount: initial?.budgetAmount || 0,
    quoteNo: initial?.quoteNo || '',
    poNo: initial?.poNo || '',
    invoiceNo: initial?.invoiceNo || '',
    paymentDueDate: initial?.paymentDueDate || '',
    arrivalDueDate: initial?.arrivalDueDate || '',
    acceptanceDate: initial?.acceptanceDate || '',
    status: initial?.status || stages?.[0]?.name || '?瘙Ⅱ隤?,
    paymentStatus: initial?.paymentStatus || '?芯?甈?,
    arrivalStatus: initial?.arrivalStatus || '?芸鞎?,
    acceptanceStatus: initial?.acceptanceStatus || '?芷???,
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
      const cloned = { ...target, id: `line-${Date.now()}`, name: target.name ? `${target.name} 銴ˊ` : '' }
      const nextItems = [...current.items]
      nextItems.splice(targetIndex + 1, 0, cloned)
      return { ...current, items: nextItems }
    })
  }

  function removeItem(itemId) {
    const target = form.items.find((item) => item.id === itemId)
    if (!confirmDestructiveAction(target?.name || '??')) return
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
      items: cleanItems.length ? cleanItems : [{ id: `line-${Date.now()}`, name: form.item || '?芸????, quantity: 1, unitPrice: 0, note: '' }],
      item: cleanItems.length > 1 ? `${cleanItems[0].name || '?∟頃??'} 蝑?${cleanItems.length} ? : (cleanItems[0]?.name || form.item || '?芸?鞈?),
    })
  }

  return (
    <div className="modal-backdrop">
      <section className="launcher purchase-modal v16-modal">
        <div className="launcher-head purchase-modal-head">
          <div><p className="eyebrow">?∟頃蝝??/p><h2>{mode === 'edit' ? '蝺刻摩?∟頃' : '?啣??∟頃'}</h2></div>
          <button type="button" onClick={onClose}>??/button>
        </div>

        <div className="purchase-modal-body">
          <div className="form-grid">
            <label>雿輻?桐?<input value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="靘? 擃??平?" /></label>
            <label>?唾?鈭?input value={form.requester} onChange={(event) => update('requester', event.target.value)} /></label>
            <label>撱?<input value={form.vendor} onChange={(event) => update('vendor', event.target.value)} /></label>
            <label>瘚????select value={form.status} onChange={(event) => update('status', event.target.value)}>{(stages || initialPurchaseStages).map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
            <label>隞狡???select value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)}>{purchasePaymentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>?啗疏???select value={form.arrivalStatus} onChange={(event) => update('arrivalStatus', event.target.value)}>{purchaseArrivalStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>撽???select value={form.acceptanceStatus} onChange={(event) => update('acceptanceStatus', event.target.value)}>{purchaseAcceptanceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          </div>

          <section className="purchase-items-editor">
            <div className="purchase-items-head">
              <div><p className="eyebrow">???敦</p><h3>銝蝑鞈澆?憭??/h3></div>
              <button className="ghost-btn" type="button" onClick={addItem}>?啣???</button>
            </div>
            <div className="purchase-item-summary">
              <span>????<b>{itemCount}</b></span>
              <span>蝮賣??<b>{totalQuantity}</b></span>
              <span>??撠? <b>{formatMoney(itemSubtotal)}</b></span>
            </div>
            <div className="purchase-item-rows">
              {form.items.map((item, index) => {
                const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                return (
                  <article className="purchase-item-row" key={item.id}>
                    <div className="item-index">{index + 1}</div>
                    <label className="item-name">??<input value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} placeholder="靘? Wi?i AP" /></label>
                    <label>?賊?<input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></label>
                    <label>?桀<input type="number" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)} /></label>
                    <label className="item-note">?酉<input value={item.note || ''} onChange={(event) => updateItem(item.id, 'note', event.target.value)} placeholder="閬 / ?券? /></label>
                    <div className="line-total"><span>撠?</span><strong>{formatMoney(lineTotal)}</strong></div>
                    <div className="line-actions">
                      <button type="button" onClick={() => duplicateItem(item.id)}>銴ˊ</button>
                      <button className="line-remove" type="button" onClick={() => removeItem(item.id)} disabled={form.items.length <= 1}>?芷</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="form-grid money-grid">
            <label>蝔<select value={form.taxMode} onChange={(event) => update('taxMode', event.target.value)}><option value="?芰?">?桀?芰?</option><option value="?怎?">?桀?怎?</option></select></label>
            <label>蝔? %<input type="number" value={form.taxRate} onChange={(event) => update('taxRate', event.target.value)} /></label>
            <label>????<input type="number" value={form.budgetAmount} onChange={(event) => update('budgetAmount', event.target.value)} /></label>
            <label>?勗??<input type="number" value={form.quoteAmount} onChange={(event) => update('quoteAmount', event.target.value)} /></label>
            <label>?勗?株?<input value={form.quoteNo} onChange={(event) => update('quoteNo', event.target.value)} placeholder="QT / ?勗?株?" /></label>
            <label>PO ?株?<input value={form.poNo} onChange={(event) => update('poNo', event.target.value)} placeholder="PO / 閮蝺刻?" /></label>
            <label>?潛巨?Ⅳ<input value={form.invoiceNo} onChange={(event) => update('invoiceNo', event.target.value)} placeholder="?潛巨 / 隢狡?株?" /></label>
            <label>隞狡??<input type="date" value={form.paymentDueDate} onChange={(event) => update('paymentDueDate', event.target.value)} /></label>
            <label>???啗疏<input type="date" value={form.arrivalDueDate} onChange={(event) => update('arrivalDueDate', event.target.value)} /></label>
            <label>?唾???input type="date" value={form.requestDate} onChange={(event) => update('requestDate', event.target.value)} /></label>
            <label>銝??input type="date" value={form.orderDate} onChange={(event) => update('orderDate', event.target.value)} /></label>
            <label>?啗疏??input type="date" value={form.arrivalDate} onChange={(event) => update('arrivalDate', event.target.value)} /></label>
            <label>撽??input type="date" value={form.acceptanceDate} onChange={(event) => update('acceptanceDate', event.target.value)} /></label>
            <label className="form-wide">?酉<textarea value={form.note} onChange={(event) => update('note', event.target.value)} /></label>
          </div>

          <div className="tax-preview">
            <article><span>?芰???</span><strong>{formatMoney(amount.untaxedAmount)}</strong></article>
            <article><span>蝔?</span><strong>{formatMoney(amount.taxAmount)}</strong></article>
            <article><span>?怎?蝮賡?</span><strong>{formatMoney(amount.taxedTotal)}</strong></article>
            <article><span>??撌桃</span><strong className={Number(form.budgetAmount || 0) && amount.taxedTotal > Number(form.budgetAmount || 0) ? 'has-diff' : ''}>{Number(form.budgetAmount || 0) ? formatMoney(amount.taxedTotal - Number(form.budgetAmount || 0)) : '??}</strong></article>
          </div>
        </div>

        <div className="form-actions sticky-form-actions">
          <button className="ghost-btn" type="button" onClick={onClose}>??</button>
          <button className="primary-btn" type="button" onClick={submitForm} disabled={!form.items.some((item) => String(item.name || '').trim())}>?脣?</button>
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
    id: String(row.id || '').trim(),
    _purchaseKey: row._purchaseKey || row.uid || row.key || createPurchaseKey(),
    item: title,
    items,
    quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    unitPrice: items.length === 1 ? Number(items[0].unitPrice || 0) : 0,
    taxRate: Number(row.taxRate ?? 5),
    quoteAmount: Number(row.quoteAmount || 0),
    budgetAmount: Number(row.budgetAmount || 0),
    quoteNo: row.quoteNo || '',
    poNo: row.poNo || '',
    invoiceNo: row.invoiceNo || '',
    paymentDueDate: row.paymentDueDate || '',
    arrivalDueDate: row.arrivalDueDate || '',
    acceptanceDate: row.acceptanceDate || '',
    taxMode: row.taxMode || '?芰?',
    paymentStatus: row.paymentStatus || '?芯?甈?,
    arrivalStatus: row.arrivalStatus || '?芸鞎?,
    acceptanceStatus: row.acceptanceStatus || '?芷???,
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
  if (!items.length) return row.item || '?芸?鞈?
  if (items.length === 1) return items[0].name
  return `${items[0].name} 蝑?${items.length} ?
}

function calculatePurchase(row) {
  const items = getPurchaseItems(row)
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const rate = Number(row.taxRate ?? 5) / 100
  if ((row.taxMode || '?芰?') === '?怎?') {
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

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function PurchaseDetail({ row, stages, relatedTasks = [], history = [], onEdit, onAdvance, onComplete, onDuplicate, onCreateTask, onCreateReminder, onUpdateMeta }) {
  const amount = calculatePurchase(row)
  const items = getPurchaseItems(row)
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const quoteAmount = Number(row.quoteAmount || 0)
  const diff = quoteAmount ? amount.taxedTotal - quoteAmount : 0
  const budgetAmount = Number(row.budgetAmount || 0)
  const budgetDiff = budgetAmount ? amount.taxedTotal - budgetAmount : 0
  return (
    <div className="purchase-detail-stack enhanced-detail">
      <div className="detail-status-strip">
        <StageBadge value={row.status} stages={stages} />
        <span>{row.department || '?芸‵?券?'}</span>
        <span>{row.requester || '?芸‵?唾?鈭?}</span>
        <span>{row.paymentStatus || '?芯?甈?}</span>
        <span>{row.arrivalStatus || '?芸鞎?}</span>
        <span>{row.acceptanceStatus || '?芷???}</span>
      </div>
      <div className="purchase-detail-identity">
        <div>
          <span>?桀??詨?</span>
          <strong>{row.id} 繚 {purchaseTitle(row)}</strong>
        </div>
        <small>{row.vendor || '?芣?摰???} 繚 {items.length} ??繚 {formatMoney(amount.taxedTotal)}</small>
      </div>
      <div className="purchase-detail-actions">
        <button type="button" onClick={onEdit}>蝺刻摩?∟頃</button>
        <button type="button" onClick={onAdvance}>銝?瘚?</button>
        <button type="button" onClick={onComplete}>閬摰?</button>
        <button type="button" onClick={onCreateTask}>撱箇?餈質馱撌乩?</button>
        <button type="button" onClick={() => onCreateReminder?.('餈質馱')}>撱箇?餈質馱??</button>
        <button type="button" onClick={() => onCreateReminder?.('隞狡')}>隞狡??</button>
        <button type="button" onClick={() => onCreateReminder?.('?啗疏')}>?啗疏??</button>
        <button type="button" onClick={() => onCreateReminder?.('撽')}>撽??</button>
        <button type="button" onClick={onDuplicate}>銴ˊ?∟頃</button>
      </div>

      <div className="purchase-progress-actions">
        <button type="button" className={(row.paymentStatus || '?芯?甈?) === '撌脖?甈? ? 'active' : ''} onClick={() => onUpdateMeta?.({ paymentStatus: (row.paymentStatus || '?芯?甈?) === '撌脖?甈? ? '?芯?甈? : '撌脖?甈? }, (row.paymentStatus || '?芯?甈?) === '撌脖?甈? ? '隞狡???箸隞狡?? : '隞狡???箏歇隞狡??)}>隞狡摰?</button>
        <button type="button" className={(row.arrivalStatus || '?芸鞎?) === '撌脣鞎? ? 'active' : ''} onClick={() => onUpdateMeta?.({ arrivalStatus: (row.arrivalStatus || '?芸鞎?) === '撌脣鞎? ? '?芸鞎? : '撌脣鞎?, arrivalDate: (row.arrivalStatus || '?芸鞎?) === '撌脣鞎? ? row.arrivalDate : (row.arrivalDate || todayDate()) }, (row.arrivalStatus || '?芸鞎?) === '撌脣鞎? ? '?啗疏???箸?啗疏?? : '?啗疏???箏歇?啗疏??)}>?啗疏摰?</button>
        <button type="button" className={(row.acceptanceStatus || '?芷???) === '撌脤??? ? 'active' : ''} onClick={() => onUpdateMeta?.({ acceptanceStatus: (row.acceptanceStatus || '?芷???) === '撌脤??? ? '?芷??? : '撌脤??? }, (row.acceptanceStatus || '?芷???) === '撌脤??? ? '撽???箸撽?? : '撽???箏歇撽??)}>撽摰?</button>
      </div>

      <div className="detail-money-summary">
        <article>
          <span>?怎?蝮賡?</span>
          <strong>{formatMoney(amount.taxedTotal)}</strong>
        </article>
        <article>
          <span>?芰? / 蝔?</span>
          <strong>{formatMoney(amount.untaxedAmount)}</strong>
          <small>{formatMoney(amount.taxAmount)}</small>
        </article>
        <article>
          <span>?勗撌桅?</span>
          <strong className={Math.abs(diff) > 1 ? 'has-diff' : ''}>{quoteAmount ? formatMoney(diff) : '??}</strong>
        </article>
        <article>
          <span>??撌桃</span>
          <strong className={budgetDiff > 0 ? 'has-diff' : ''}>{budgetAmount ? formatMoney(budgetDiff) : '??}</strong>
        </article>
      </div>

      <div className="purchase-detail-grid">
        <span>蝺刻?<b>{row.id}</b></span>
        <span>?勗?株?<b>{row.quoteNo || '??}</b></span>
        <span>PO ?株?<b>{row.poNo || '??}</b></span>
        <span>?潛巨?Ⅳ<b>{row.invoiceNo || '??}</b></span>
        <span>撱?<b>{row.vendor || '??}</b></span>
        <span>????b>{items.length} ??/ {totalQuantity} 隞?/b></span>
        <span>蝔<b>{row.taxMode || '?芰?'} / {Number(row.taxRate || 0)}%</b></span>
        <span>隞狡<b>{row.paymentStatus || '?芯?甈?}</b></span>
        <span>?啗疏<b>{row.arrivalStatus || '?芸鞎?}</b></span>
        <span>撽<b>{row.acceptanceStatus || '?芷???}</b></span>
        <span>?唾???b>{row.requestDate || '??}</b></span>
        <span>銝??b>{row.orderDate || '??}</b></span>
        <span>隞狡??<b>{row.paymentDueDate || '??}</b></span>
        <span>???啗疏<b>{row.arrivalDueDate || '??}</b></span>
        <span>?啗疏??b>{row.arrivalDate || '??}</b></span>
        <span>撽??b>{row.acceptanceDate || '??}</b></span>
      </div>

      <div className="purchase-line-detail">
        <div className="line-detail-head"><strong>???敦</strong><span>{items.length} ??繚 ??{totalQuantity} 隞?/span></div>
        {items.map((item, index) => (
          <article key={item.id}>
            <span>{index + 1}</span>
            <div><b>{item.name || '?芸????}</b><small>{item.note || '??}</small></div>
            <em>{item.quantity} ? {formatMoney(item.unitPrice)}</em>
            <strong>{formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</strong>
          </article>
        ))}
      </div>

      <div className="purchase-related-flow">
        <div className="line-detail-head"><strong>?賊?隞餃???銝甇?/strong><span>{relatedTasks.length} 蝑?/span></div>
        {relatedTasks.length ? relatedTasks.map((task) => (
          <article key={task.id}>
            <div><b>{task.title}</b><small>{task.status} 繚 {task.relatedVendor || row.vendor || '?芣?摰???}</small></div>
            <p>{task.next}</p>
          </article>
        )) : <p>?桀?瘝??隞餃?嚗?潔遙?蕭頩文遣蝡鞈潦???撠????/p>}
      </div>

      <div className="purchase-history-timeline">
        <div className="line-detail-head"><strong>?∟頃甇瑞???頠?/strong><span>{history.length} 蝑?/span></div>
        {history.length ? history.map((entry) => (
          <article key={entry.id}>
            <i />
            <div><strong>{entry.title}</strong><span>{entry.message}</span><small>{entry.time}</small></div>
          </article>
        )) : <p>撠甇斗鞈澆?風蝔???/p>}
      </div>

      <div className="detail-note-box">
        <span>?酉</span>
        <p>{row.note || '撠憛怠神?酉??}</p>
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
      ??
    </button>
  )
}

function WorkCard({ item, onSelect, selected, selectable = false, checked = false, onToggleSelect }) {
  const isSelected = selected?.id === item.id
  return (
    <article className={isSelected ? 'work-card-shell selected' : 'work-card-shell'}>
      {selectable && (
        <label className="work-select-check" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={checked} onChange={onToggleSelect} />
          <span>?詨?</span>
        </label>
      )}
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


function WorkGrid({ items, selected, setSelected, selectedIds = [], onToggleSelect }) {
  return (
    <section className="work-grid">
      <div className="work-grid-head work-grid-head-v199">
        <span>?詨?</span><span>蝺刻?</span><span>璅?</span><span>???/span><span>?芸?蝝?/span><span>?</span><span>?唳???/span>
      </div>
      {items.map((item) => {
        const isSelected = selected?.id === item.id
        return (
          <article className={isSelected ? 'work-grid-shell selected' : 'work-grid-shell'} key={item.id}>
            <button className="work-grid-row work-grid-row-v199" type="button" onClick={() => setSelected(item)}>
              <label className="grid-select-check" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggleSelect?.(item.id)} /></label>
              <span className="work-grid-id" data-label="蝺刻?">{item.id}</span>
              <strong className="work-grid-title" data-label="璅?">{item.title}</strong>
              <span className="work-grid-status" data-label="???><Badge value={item.lane} /></span>
              <span className="work-grid-priority" data-label="?芸?蝝?><Badge value={item.priority} /></span>
              <span className="work-grid-relation" data-label="?">{item.relation}</span>
              <span className="work-grid-due" data-label="?唳???>{item.due}</span>
            </button>
            {isSelected && <BoardInlinePreview selected={item} />}
          </article>
        )
      })}
    </section>
  )
}


function CardWall({ items, selected, setSelected, selectedIds = [], onToggleSelect }) {
  return (
    <section className="card-wall board-card-view">
      {items.map((item) => (
        <WorkCard key={item.id} item={item} selected={selected} onSelect={() => setSelected(item)} selectable checked={selectedIds.includes(item.id)} onToggleSelect={() => onToggleSelect?.(item.id)} />
      ))}
    </section>
  )
}


function ModuleScopeBar({ active }) {
  const purpose = modulePurposeMap[active]
  if (!purpose) return null
  return (
    <section className="module-scope-bar">
      <article>
        <span>摰?</span>
        <strong>{purpose.role}</strong>
      </article>
      <article>
        <span>?府?暸ㄐ</span>
        <strong>{purpose.scope}</strong>
      </article>
      <article>
        <span>?踹???</span>
        <strong>{purpose.avoid}</strong>
      </article>
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
    if (project.tone === 'red' || health.includes('敺?)) return 'danger'
    if (project.tone === 'green' || health.includes('蝛?)) return 'ok'
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
        <small>${escapeHtml(project.id)} 繚 ${escapeHtml(project.phase)} 繚 ${escapeHtml(project.owner)}</small>
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
      <span class="flow-project-card-meta">${escapeHtml(project.phase)} 繚 ${escapeHtml(project.owner)}</span>
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
                    <p>${escapeHtml(project.owner)} 繚 ${escapeHtml(project.progress)}%</p>
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
        <span>摨?</span><span>撠??迂</span><span>???/span><span>?交?</span><span>?脣漲</span>
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

    const taskListHtml = taskItems.map((task) => `<div><strong>${escapeHtml(task.name)}</strong><span>${escapeHtml(task.owner)} 繚 ${escapeHtml(task.start)} - ${escapeHtml(task.end)}</span><small>${escapeHtml(task.progress)}%</small></div>`).join('')
    const relatedTaskHtml = relatedTickets.length
      ? relatedTickets.map((task) => `<article><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.status)} 繚 ${escapeHtml(task.next)}</span></article>`).join('')
      : '<p>?桀?瘝??隞餃???/p>'
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
            <span>${escapeHtml(project.id)} 繚 ${escapeHtml(project.phase)} 繚 ${escapeHtml(project.owner)} 繚 ${escapeHtml(project.startDate)} ??${escapeHtml(project.endDate)}</span>
          </div>
          <div class="project-final-modal-actions-dom">
            <span class="badge ${statusClass(project)}">${escapeHtml(project.health)}</span>
            <button type="button" data-flow-project-close>??</button>
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
            <article><span>?挾</span><strong>${escapeHtml(project.phase)}</strong></article>
            <article><span>鞎痊</span><strong>${escapeHtml(project.owner)}</strong></article>
            <article><span>??</span><strong>${escapeHtml(project.startDate)}</strong></article>
            <article><span>蝯?</span><strong>${escapeHtml(project.endDate)}</strong></article>
          </section>

          <section class="project-final-section-dom">
            <div class="project-final-section-head-dom">
              <p class="eyebrow">GANTT</p>
              <h3>撠????/h3>
              <small>?芷＊蝷箇???獢???頠貉?隞餃???/small>
            </div>
            <div class="project-final-gantt-scroll-dom">
              <div class="project-final-gantt-head-dom"><span>?</span>${tickHtml}</div>
              <div class="project-final-gantt-row-dom">
                <div class="project-final-gantt-label"><strong>撠?蝮賣?蝔?/strong><small>${escapeHtml(project.phase)}</small></div>
                <div class="project-final-track"><span class="project-final-mainbar ${escapeHtml(project.tone)}" style="left:${mainRange.left}%;width:${mainRange.width}%">${escapeHtml(project.progress)}%</span>${dotsHtml}</div>
              </div>
              ${taskRowsHtml}
            </div>
          </section>

          <section class="project-final-section-dom"><p class="eyebrow">撠?隞餃? / ??</p><div class="project-final-task-list-dom">${taskListHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">?隞餃?</p><div class="project-final-related-list-dom">${relatedTaskHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">??蝣?/p><div class="project-final-milestone-list-dom">${milestoneHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">?鞈?</p><div class="tag-list">${relatedHtml}</div></section>
          <section class="project-final-section-dom"><p class="eyebrow">??蝝??/p><div class="project-final-timeline-dom">${recordHtml}</div></section>
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
        <div><strong>撠?皜</strong><span>${items.length} 隞?繚 靘?獢楊??摨?/span></div>
        <div class="flow-project-view-tabs" role="tablist" aria-label="撠?閬???">
          <button type="button" data-flow-project-view="table" class="${mode === 'table' ? 'active' : ''}">銵冽</button>
          <button type="button" data-flow-project-view="card" class="${mode === 'card' ? 'active' : ''}">?∠?</button>
          <button type="button" data-flow-project-view="kanban" class="${mode === 'kanban' ? 'active' : ''}">?</button>
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

  const isProjectPage = () => visibleHeadings().some(({ text }) => text === '撠?蝞∠?' || text.includes('PROJECT FLOW'))

  const clearMarks = () => {
    document.querySelectorAll('.flow-workboard-outer-page, .flow-workboard-outer-main, .flow-workboard-outer-stretch, .flow-workboard-current-strip').forEach((node) => {
      node.classList.remove('flow-workboard-outer-page', 'flow-workboard-outer-main', 'flow-workboard-outer-stretch', 'flow-workboard-current-strip')
    })
  }

  const markWorkboardOuterWidth = () => {
    clearMarks()
    if (isProjectPage()) return

    const heading = visibleHeadings().find(({ text }) => text === '撌乩??')?.node
    if (!heading) return

    const main = heading.closest('main') || heading.closest('[role="main"]') || heading.closest('.page, .page-content, .main-content, .content, .workspace-content')
    if (main) main.classList.add('flow-workboard-outer-main')

    let current = heading.parentElement
    let best = null
    const chain = []

    while (current && current !== document.body) {
      chain.push(current)
      const text = current.textContent || ''
      const hasWorkboard = text.includes('撌乩??')
      const hasItems = /\b(?:FD|TASK)-\d+\b/.test(text)
      const notProject = !text.includes('PROJECT FLOW') && !text.includes('撠?蝞∠?')

      if (hasWorkboard && hasItems && notProject) best = current
      current = current.parentElement
    }

    const page = best || heading.closest('section,article,div')
    if (page) page.classList.add('flow-workboard-outer-page')

    chain.forEach((node) => {
      if (main && !main.contains(node)) return
      const text = node.textContent || ''
      if (text.includes('PROJECT FLOW') || text.includes('撠?蝞∠?')) return
      node.classList.add('flow-workboard-outer-stretch')
    })

    Array.from((main || document).querySelectorAll('section, article, div')).forEach((node) => {
      const text = normalize(node.textContent)
      const rect = node.getBoundingClientRect()
      const looksCurrentStrip = /\b(?:FD|TASK)-\d+\b/.test(text) && text.includes('?桀??詨?') && rect.width > 500 && rect.height < 150
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





























