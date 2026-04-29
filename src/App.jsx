import { useEffect, useMemo, useRef, useState } from 'react'
import { flowdeskCloud, hasSupabaseConfig, supabase } from './lib/supabaseClient.js'

const FLOWDESK_APP_VERSION = '20.3.43'
const FLOWDESK_VERSION_LABEL = `FlowDesk v${FLOWDESK_APP_VERSION}`
const PROJECT_PHASE_OPTIONS = ['規劃中', '需求確認', '執行中', '測試驗收', '待驗收', '上線導入', '暫緩', '已完成', '已取消']
const PROJECT_HEALTH_OPTIONS = ['穩定推進', '待確認', '高風險', '卡關']
const PROJECT_PRIORITY_OPTIONS = ['緊急', '高', '中', '低']
const PROJECT_SORT_OPTIONS = ['優先順序', '手動排序', '到期日', '進度', '名稱']

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

function confirmDestructiveAction(label = '這筆資料', detail = '刪除後無法直接復原。') {
  if (typeof window === 'undefined') return true
  return window.confirm(`確定要刪除「${label || '這筆資料'}」？\n${detail}`)
}

function confirmResetAction(message) {
  if (typeof window === 'undefined') return true
  return window.confirm(message)
}

const initialModules = [
  { id: 'home', name: '總覽', icon: 'overview' },
  { id: 'board', name: '工作事項', icon: 'kanban' },
  { id: 'base', name: '採購管理', icon: 'records' },
  { id: 'roadmap', name: '專案管理', icon: 'project' },
  { id: 'reminders', name: '提醒中心', icon: 'reminders' },
  { id: 'docs', name: '文件備忘', icon: 'knowledge' },
  { id: 'insight', name: '分析摘要', icon: 'report' },
  { id: 'settings', name: '系統設定', icon: 'settings' },
]


const modulePurposeMap = {
  home: { role: '總覽只做摘要與導引，不直接承接細節編輯。', scope: '今日重點、風險訊號、待處理摘要。', avoid: '不放完整報表、不塞所有操作。' },
  board: { role: '工作事項管理每日 Case、日常待辦與短期跟進。', scope: '每天遇到的支援事項、臨時需求、短期可完成的工作。', avoid: '不取代採購流程、不取代專案里程碑、不當純提醒清單。' },
  base: { role: '採購管理負責採購主資料與流程追蹤。', scope: '採購需求、詢價、報價、簽核、下單、付款、到貨、驗收與歷程。', avoid: '不放每日零散 Case，不把採購步驟拆成工作事項。' },
  roadmap: { role: '專案管理只放有階段、里程碑與起迄時間的長期工作。', scope: '專案、甘特圖、階段、里程碑、專案任務、風險與進度。', avoid: '不放每日零散工作、不放單純提醒。' },
  reminders: { role: '提醒中心只負責時間提醒。', scope: '逾期、今日、明日、本週、延後與關聯開啟。', avoid: '不變成第二個任務管理，不維護採購或專案主資料。' },
  docs: { role: '文件備忘只整理參考資料與範本。', scope: 'SOP、會議紀錄、設定筆記、常用範本。', avoid: '不承接待辦流程。' },
  insight: { role: '分析摘要只做檢視，不做資料維護。', scope: '採購、工作事項、專案、提醒的統計與趨勢。', avoid: '不新增另一套資料入口。' },
  settings: { role: '系統設定只處理外觀、備份與模組設定。', scope: '同步狀態、備份還原、主題、圖示、資料清理。', avoid: '不放工作內容。' },
}

const flowdeskModuleBoundaries = [
  {
    id: 'board',
    title: '工作事項',
    keep: '每日 Case、日常待辦、臨時支援、短期跟進事項。',
    avoid: '不要放完整採購流程、長期專案、純時間提醒或文件資料。',
    handoff: '採購相關 → 採購管理；長期計畫 → 專案管理；只是時間提醒 → 提醒中心。',
  },
  {
    id: 'base',
    title: '採購管理',
    keep: '採購需求、詢價、報價、簽核、下單、付款、到貨、驗收與採購歷程。',
    avoid: '不要放每日零散 Case，也不要把每個採購步驟都拆成工作事項。',
    handoff: '需要提醒 → 提醒中心；需要補充處理過程 → 採購歷程內記錄。',
  },
  {
    id: 'roadmap',
    title: '專案管理',
    keep: '有起訖、階段、里程碑、甘特圖、風險與前置相依的長期工作。',
    avoid: '不要把每日小事、單純提醒或一次性待辦塞進專案。',
    handoff: '短期小事 → 工作事項；時間提醒 → 提醒中心。',
  },
  {
    id: 'reminders',
    title: '提醒中心',
    keep: '今日、明日、本週、逾期、延後與到期通知。',
    avoid: '不要變成第二套工作事項，也不要維護採購或專案主資料。',
    handoff: '提醒本體回到來源模組處理，例如工作事項、採購管理或專案管理。',
  },
]

const flowdeskFocusRules = [
  { title: '工作事項', detail: '放每日 Case、臨時支援、日常待辦與短期跟進。' },
  { title: '採購管理', detail: '放採購主檔、品項、金額、廠商、付款、到貨、驗收與採購歷程。' },
  { title: '專案管理', detail: '放有起訖、階段、里程碑、甘特圖的長期工作。' },
  { title: '提醒中心', detail: '只提醒時間，不再重複管理任務本體。' },
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
  aurora: 'tech',
  neon: 'tech',
  cyber: 'tech',
  sunset: 'card',
  midnight: 'minimal',
  galaxy: 'tech',
  lava: 'card',
  prism: 'card',
  custom: 'card',
  hologlass: 'tech',
  nebula: 'tech',
  plasma: 'card',
}

const themeOptions = [
  { id: 'blue', name: '預設藍', description: '穩定、乾淨的 FlowDesk 預設色，適合日常工作台。', accent: '#356bff', secondary: '#8c4dff', vibe: '經典穩定' },
  { id: 'fresh', name: '青綠', description: '清爽明亮，適合長時間整理採購與待追蹤事項。', accent: '#1db79d', secondary: '#4dc9ff', vibe: '清爽效率' },
  { id: 'purple', name: '紫色', description: '較有科技感，讓重點區塊與分頁更醒目。', accent: '#7b4dff', secondary: '#b14cff', vibe: '科技醒目' },
  { id: 'amber', name: '橘色', description: '暖色提醒感較強，適合偏行動與跟催的工作台。', accent: '#f2992e', secondary: '#ff6b4a', vibe: '行動提醒' },
  { id: 'rose', name: '玫紅', description: '重點提示更明顯，適合提醒與待處理量較多時使用。', accent: '#e84c72', secondary: '#8c4dff', vibe: '亮眼重點' },
  { id: 'slate', name: '石墨灰', description: '沉穩低干擾，適合資料密集與正式場合。', accent: '#475569', secondary: '#0e7490', vibe: '沉穩低調' },
  { id: 'tech', name: '深海藍', description: '深藍搭配電光青，保留 FlowDesk 的科技感。', accent: '#315dff', secondary: '#00c2ff', vibe: '深海科技' },
  { id: 'green', name: '森綠', description: '穩重、舒適，適合長時間檢視專案與採購資料。', accent: '#0fa374', secondary: '#1d9b8f', vibe: '穩定舒適' },
  { id: 'ice', name: '冰川青', description: '低飽和冷色系，畫面更乾淨俐落。', accent: '#38a9d6', secondary: '#66c7c2', vibe: '乾淨俐落' },
  { id: 'aurora', name: '極光', description: '藍紫搭配極光綠，主畫面與甘特圖會更有層次感。', accent: '#00d4ff', secondary: '#7c3aed', vibe: '炫彩推薦' },
  { id: 'neon', name: '霓虹', description: '高彩度霓虹感，適合想讓按鈕、分頁與重點卡片更跳。', accent: '#00e5ff', secondary: '#ff2bd6', vibe: '高亮視覺' },
  { id: 'cyber', name: '賽博紫', description: '紫色主調加電光青，讓系統偏向科技儀表板風格。', accent: '#8b5cf6', secondary: '#06b6d4', vibe: '科技炫光' },
  { id: 'sunset', name: '暮光橘', description: '橘紅漸層更有行動感，適合提醒、跟催與專案推進。', accent: '#fb923c', secondary: '#ef4444', vibe: '暖色推進' },
  { id: 'midnight', name: '午夜藍', description: '深藍搭配冷光藍，保留正式感但更有視覺張力。', accent: '#1e3a8a', secondary: '#38bdf8', vibe: '深色質感' },
  { id: 'galaxy', name: '銀河紫', description: '紫藍星霧感更重，適合想把 FlowDesk 做成科幻儀表板。', accent: '#6d5dfc', secondary: '#24d4ff', vibe: '星霧科幻' },
  { id: 'lava', name: '熔岩紅', description: '紅橘高對比，提醒、跟催與待處理會更有衝擊感。', accent: '#ff5a36', secondary: '#ffb000', vibe: '高能警示' },
  { id: 'prism', name: '稜鏡糖彩', description: '粉紫、薄荷與天藍混色，畫面會更活潑搶眼。', accent: '#ff4fd8', secondary: '#38bdf8', vibe: '糖彩炫光' },
  { id: 'hologlass', name: '全息極光', description: '藍紫極光搭配虹彩邊緣，適合展示與深色模式。', accent: '#7dd3fc', secondary: '#c084fc', vibe: '全息展示' },
  { id: 'nebula', name: '星雲黑', description: '深色星雲感，讓卡片、甘特圖與重點區塊更像控制台。', accent: '#818cf8', secondary: '#22d3ee', vibe: '星雲控制台' },
  { id: 'plasma', name: '電漿金橘', description: '金橘高能流光，適合提醒、待處理與專案推進情境。', accent: '#f59e0b', secondary: '#ef4444', vibe: '高能流光' },
  { id: 'custom', name: '我的主題', description: '自行調整主色、輔助色與強調色，建立 FlowDesk 個人化外觀。', accent: '#2563eb', secondary: '#14b8a6', vibe: '自訂色彩' },
]

const appearanceModeOptions = [
  { id: 'light', name: '淺色', description: '維持明亮乾淨的日常工作台。' },
  { id: 'dark', name: '深色', description: '深色底搭配主題霓光，適合夜間或展示使用。' },
  { id: 'system', name: '跟隨系統', description: '依照作業系統深色 / 淺色設定自動切換。' },
]

const motionLevelOptions = [
  { id: 'off', name: '關閉', description: '關閉主題動畫與流光，保留基本色彩。' },
  { id: 'standard', name: '標準', description: '保留柔和轉場、卡片浮起與低調光澤。' },
  { id: 'vivid', name: '炫彩', description: '開啟完整流光、脈衝與主題氛圍效果。' },
  { id: 'holo', name: '全息極光', description: '開啟全息玻璃、霓虹邊框與更強的展示級光效。' },
]

const appearancePresetOptions = [
  {
    id: 'business',
    name: '商務日常',
    description: '淺色、標準動效、預設藍，適合日常工作與正式場合。',
    theme: 'blue',
    appearance: 'light',
    motion: 'standard',
    badge: '穩定'
  },
  {
    id: 'focus',
    name: '夜間專注',
    description: '深色、標準動效、星雲黑，長時間查看專案與甘特圖比較舒服。',
    theme: 'nebula',
    appearance: 'dark',
    motion: 'standard',
    badge: '專注'
  },
  {
    id: 'showcase',
    name: '展示模式',
    description: '深色、全息極光動效、全息極光主題，適合 Demo 或展示系統。',
    theme: 'hologlass',
    appearance: 'dark',
    motion: 'holo',
    badge: '展示'
  },
  {
    id: 'alert',
    name: '高能提醒',
    description: '電漿金橘搭配炫彩動效，提醒、待處理與專案推進更醒目。',
    theme: 'plasma',
    appearance: 'light',
    motion: 'vivid',
    badge: '提醒'
  },
  {
    id: 'calm',
    name: '低干擾',
    description: '冰川青、關閉動效，適合資料密集、會議投影或低干擾操作。',
    theme: 'ice',
    appearance: 'light',
    motion: 'off',
    badge: '安靜'
  },
]

const defaultCustomTheme = {
  primary: '#2563eb',
  secondary: '#14b8a6',
  accent: '#f97316',
}

function normalizeHexColor(value, fallback = '#2563eb') {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : fallback
}

function hexToRgbParts(hex, fallback = '37, 99, 235') {
  const safe = normalizeHexColor(hex, '#2563eb').replace('#', '')
  const r = parseInt(safe.slice(0, 2), 16)
  const g = parseInt(safe.slice(2, 4), 16)
  const b = parseInt(safe.slice(4, 6), 16)
  if ([r, g, b].some((part) => Number.isNaN(part))) return fallback
  return `${r}, ${g}, ${b}`
}

function getHexLuminance(hex) {
  const safe = normalizeHexColor(hex, '#2563eb').replace('#', '')
  const rgb = [0, 2, 4].map((idx) => parseInt(safe.slice(idx, idx + 2), 16) / 255)
  const linear = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function adjustHexBrightness(hex, amount = -28) {
  const safe = normalizeHexColor(hex, '#2563eb').replace('#', '')
  const next = [0, 2, 4].map((idx) => {
    const value = parseInt(safe.slice(idx, idx + 2), 16)
    const adjusted = Math.max(0, Math.min(255, value + amount))
    return adjusted.toString(16).padStart(2, '0')
  })
  return `#${next.join('')}`
}

function protectThemeContrast(theme) {
  const primary = normalizeHexColor(theme.primary, defaultCustomTheme.primary)
  const secondary = normalizeHexColor(theme.secondary, defaultCustomTheme.secondary)
  const accent = normalizeHexColor(theme.accent, defaultCustomTheme.accent)
  return {
    primary: getHexLuminance(primary) > 0.72 ? adjustHexBrightness(primary, -70) : primary,
    secondary: getHexLuminance(secondary) > 0.78 ? adjustHexBrightness(secondary, -62) : secondary,
    accent: getHexLuminance(accent) > 0.82 ? adjustHexBrightness(accent, -56) : accent,
  }
}

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
const purchasePaymentStatusOptions = ['未付款', '請款中', '已付款']
const purchaseArrivalStatusOptions = ['未到貨', '部分到貨', '已到貨']
const purchaseAcceptanceStatusOptions = ['未驗收', '驗收中', '已驗收']

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

function activeThemeName(options, currentId) {
  return options.find((item) => item.id === currentId)?.name || '自訂主題'
}

function motionLabel(value) {
  if (value === 'off') return '關閉動效'
  if (value === 'vivid') return '炫彩'
  if (value === 'holo') return '全息極光'
  return '標準動效'
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
  const [view, setView] = useState('看板')
  const [selected, setSelected] = useState(null)
  const [showLauncher, setShowLauncher] = useState(false)
  const [showAppearanceQuick, setShowAppearanceQuick] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uiTheme, setUiTheme] = useState(() => {
    if (typeof window === 'undefined') return 'blue'
    return window.localStorage.getItem('flowdesk-ui-theme') || 'blue'
  })
  const [appearanceMode, setAppearanceMode] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('flowdesk-appearance-mode') || 'light'
  })
  const [motionLevel, setMotionLevel] = useState(() => {
    if (typeof window === 'undefined') return 'standard'
    return window.localStorage.getItem('flowdesk-motion-level') || 'standard'
  })
  const [customTheme, setCustomTheme] = useState(() => {
    if (typeof window === 'undefined') return defaultCustomTheme
    try {
      const saved = JSON.parse(window.localStorage.getItem('flowdesk-custom-theme') || '{}')
      return {
        primary: normalizeHexColor(saved.primary, defaultCustomTheme.primary),
        secondary: normalizeHexColor(saved.secondary, defaultCustomTheme.secondary),
        accent: normalizeHexColor(saved.accent, defaultCustomTheme.accent),
      }
    } catch {
      return defaultCustomTheme
    }
  })
  const [iconStyleMode, setIconStyleMode] = useState(() => {
    if (typeof window === 'undefined') return 'auto'
    return window.localStorage.getItem('flowdesk-icon-style-mode') || 'auto'
  })
  const [activeBaseTable, setActiveBaseTable] = useState(() => {
    if (typeof window === 'undefined') return '採購紀錄'
    return window.localStorage.getItem('flowdesk-active-base-table-v20316') || '採購紀錄'
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
  const shellAppearancePreset = appearancePresetOptions.find((preset) => preset.theme === uiTheme && preset.appearance === appearanceMode && preset.motion === motionLevel)

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
        title: `${target.title || '未命名工作'} 複本`,
        lane: '待分類',
      }
      setSelected(next)
      setView('看板')
      return [next, ...current]
    })
  }

  function deleteWorkItem(itemId) {
    const target = workItems.find((item) => item.id === itemId)
    if (!confirmDestructiveAction(target?.title || itemId || '工作項目')) return
    setWorkItems((current) => {
      const next = current.filter((item) => item.id !== itemId)
      setSelected(next[0] || null)
      return next
    })
  }

  function createWorkItemFromSource(payload = {}) {
    const nextItem = {
      id: getNextWorkItemId(),
      title: payload.title || '未命名工作',
      type: payload.type || '一般工作',
      lane: payload.lane || '待分類',
      priority: payload.priority || '中',
      channel: payload.channel || '手動新增',
      relation: payload.relation || '未設定',
      requester: payload.requester || 'Kyle',
      owner: payload.owner || 'Kyle',
      due: payload.due || todayDate(),
      health: Number.isFinite(Number(payload.health)) ? Number(payload.health) : 85,
      note: payload.note || '',
      tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
    }
    setWorkItems((current) => {
      const duplicate = current.find((item) => item.relation === nextItem.relation && item.type === nextItem.type && item.channel === nextItem.channel)
      if (duplicate && nextItem.relation !== '未設定') {
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
      title: payload.title || '未命名提醒',
      type: payload.type || '追蹤提醒',
      priority: payload.priority || '中',
      status: payload.status || '待處理',
      dueDate: payload.dueDate || addDaysDate(3),
      sourceType: payload.sourceType || '一般',
      sourceTitle: payload.sourceTitle || '',
      note: payload.note || '',
    }
    setReminders((current) => {
      const duplicate = current.find((item) => item.status !== '已完成' && item.title === nextReminder.title && item.sourceTitle === nextReminder.sourceTitle)
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
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.flowdeskAppearance = appearanceMode
      document.documentElement.dataset.flowdeskMotion = motionLevel
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('flowdesk-appearance-mode', appearanceMode)
      window.localStorage.setItem('flowdesk-motion-level', motionLevel)
    }
  }, [appearanceMode, motionLevel])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.style.setProperty('--fd36-custom-primary', customTheme.primary)
      root.style.setProperty('--fd36-custom-secondary', customTheme.secondary)
      root.style.setProperty('--fd36-custom-accent', customTheme.accent)
      root.style.setProperty('--fd36-custom-primary-rgb', hexToRgbParts(customTheme.primary))
      root.style.setProperty('--fd36-custom-secondary-rgb', hexToRgbParts(customTheme.secondary, '20, 184, 166'))
      root.style.setProperty('--fd36-custom-accent-rgb', hexToRgbParts(customTheme.accent, '249, 115, 22'))
      root.dataset.flowdeskCustomTheme = 'ready'
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('flowdesk-custom-theme', JSON.stringify(customTheme))
    }
  }, [customTheme])

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

  function applyShellAppearancePreset(preset) {
    if (!preset) return
    setUiTheme(preset.theme)
    setAppearanceMode(preset.appearance)
    setMotionLevel(preset.motion)
    setShowAppearanceQuick(false)
  }

  function openAppearanceSettings() {
    setShowAppearanceQuick(false)
    setActive('settings')
  }

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
            <div className="topbar-status-row">
              <span className="version-pill">{FLOWDESK_VERSION_LABEL}</span>
              <span className={flowdeskCloud ? 'sync-state-pill online' : 'sync-state-pill local'}>{flowdeskCloud ? '雲端同步中' : '本機備援模式'}</span>
            </div>
            <div className="module-purpose-line">
              <span>{modulePurposeMap[active]?.role || '維持單一用途，避免功能重複。'}</span>
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
            <div className="fd39-appearance-quick">
              <button
                className="ghost-btn fd39-appearance-trigger"
                type="button"
                onClick={() => setShowAppearanceQuick((open) => !open)}
                title="快速切換外觀方案"
              >
                <span>🎨</span>
                <strong>{shellAppearancePreset?.name || '外觀快捷'}</strong>
              </button>
              {showAppearanceQuick && (
                <div className="fd39-appearance-menu">
                  <div className="fd39-menu-head">
                    <span>外觀快捷</span>
                    <strong>{shellAppearancePreset?.name || '自訂組合'}</strong>
                    <small>{activeThemeName(themeOptions, uiTheme)} · {appearanceMode === 'dark' ? '深色' : appearanceMode === 'system' ? '跟隨系統' : '淺色'} · {motionLabel(motionLevel)}</small>
                  </div>
                  <div className="fd39-menu-list">
                    {appearancePresetOptions.map((preset) => (
                      <button
                        key={preset.id}
                        className={shellAppearancePreset?.id === preset.id ? 'active' : ''}
                        type="button"
                        onClick={() => applyShellAppearancePreset(preset)}
                      >
                        <span>{preset.badge}</span>
                        <strong>{preset.name}</strong>
                        <small>{preset.description}</small>
                      </button>
                    ))}
                  </div>
                  <button className="fd39-menu-settings" type="button" onClick={openAppearanceSettings}>進入完整外觀設定</button>
                </div>
              )}
            </div>
            <label className="global-search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋任務、採購、專案、文件..." />
            </label>
            <button className="ghost-btn" type="button" onClick={onLogout}>登出</button>
            <button className="ghost-btn" type="button">邀請成員</button>
            <button className="primary-btn" type="button" onClick={() => setShowLauncher(true)}>新增</button>
          </div>
        </header>

        <ModuleScopeBar active={active} />

        {active === 'home' && <HomePage metrics={metrics} items={filteredItems} reminders={reminders} setActive={setActive} setSelected={setSelected} />}
        {active === 'board' && <BoardPage items={filteredItems} view={view} setView={setView} selected={selected} setSelected={setSelected} onAddItem={addWorkItem} onUpdateItem={updateWorkItem} onDeleteItem={deleteWorkItem} onDuplicateItem={duplicateWorkItem} />}
        {active === 'base' && <BasePage tables={visibleCollections} records={records} activeTable={activeBaseTable} onCreateWorkItem={createWorkItemFromSource} onCreateReminder={createReminderFromSource} />}
        {active === 'roadmap' && <RoadmapPage projects={projects} onCreateWorkItem={createWorkItemFromSource} />}
        {active === 'docs' && <DocsPage docs={docs} />}
        {active === 'insight' && <InsightPage metrics={metrics} records={records} tickets={tickets} />}
        {active === 'reminders' && <RemindersPage reminders={reminders} setReminders={setReminders} onNavigateSource={(item) => {
          const sourceType = item?.sourceType || ''
          if (sourceType.includes('採購')) {
            setActiveBaseTable('採購紀錄')
            setActive('base')
          } else if (sourceType.includes('專案')) {
            setActive('roadmap')
          } else if (sourceType.includes('任務')) {
            setActive('board')
          } else {
            setActive('board')
          }
        }} />}
        {active === 'settings' && <SettingsPage themeOptions={themeOptions} uiTheme={uiTheme} setUiTheme={setUiTheme} appearanceMode={appearanceMode} setAppearanceMode={setAppearanceMode} motionLevel={motionLevel} setMotionLevel={setMotionLevel} customTheme={customTheme} setCustomTheme={setCustomTheme} iconStyleMode={iconStyleMode} setIconStyleMode={setIconStyleMode} resolvedIconStyle={resolvedIconStyle} modules={modules} collections={visibleCollections} setCollections={setCollections} moduleIcons={moduleIcons} setModuleIcons={setModuleIcons} baseTableIcons={baseTableIcons} setBaseTableIcons={setBaseTableIcons} setReminders={setReminders} />}
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
  const openReminders = reminders.filter((item) => item.status !== '已完成')
  const purchaseTotal = purchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const purchaseOpen = purchases.filter((row) => !['已完成', '已取消'].includes(row.status || '')).length
  const purchaseWaitingQuote = purchases.filter((row) => String(row.status || '').includes('詢價') || String(row.status || '').includes('報價')).length
  const purchaseNotArrived = purchases.filter((row) => (row.arrivalStatus || '未到貨') !== '已到貨' && !['已完成', '已取消'].includes(row.status || '')).length
  const purchaseUnpaid = purchases.filter((row) => (row.paymentStatus || '未付款') !== '已付款' && !['已完成', '已取消'].includes(row.status || '')).length
  const projectActive = projects.filter((project) => !['已完成', '完成', '已取消'].some((done) => String(project.phase || '').includes(done))).length
  const projectRisk = projects.filter((project) => String(project.health || '').includes('風險') || String(project.health || '').includes('卡關') || project.tone === 'red').length
  const projectAvgProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0
  const taskOpen = taskRows.filter((task) => !['已完成', '完成'].includes(task.status || '')).length
  const taskBlocked = taskRows.filter((task) => ['等回覆', '卡關', '等待回覆'].includes(task.status || task.lane || '')).length
  const overdueWork = workItems.filter((item) => item.lane !== '已完成' && item.due && item.due < today).length
  const todayDueWork = workItems.filter((item) => item.lane !== '已完成' && item.due === today).length
  const waitingWork = workItems.filter((item) => ['等待回覆', '等回覆', '卡關'].includes(item.lane || item.status || '')).length
  const riskTotal = overdueWork + reminderSummary.overdue + projectRisk + taskBlocked + waitingWork
  const operationScore = Math.max(0, Math.min(100, 100 - overdueWork * 8 - reminderSummary.overdue * 8 - projectRisk * 7 - taskBlocked * 5 - purchaseNotArrived * 3 - purchaseUnpaid * 2))
  const operationTone = operationScore >= 85 ? 'green' : operationScore >= 70 ? 'blue' : operationScore >= 55 ? 'amber' : 'red'
  const operationSignals = [
    { title: '逾期 / 今日到期', value: overdueWork + todayDueWork + reminderSummary.overdue + reminderSummary.today, note: '先處理今天要回應與已逾期項目', tone: overdueWork + reminderSummary.overdue ? 'red' : 'blue', target: 'reminders' },
    { title: '採購阻塞', value: purchaseWaitingQuote + purchaseNotArrived + purchaseUnpaid, note: '報價、到貨、付款狀態需追蹤', tone: purchaseNotArrived || purchaseUnpaid ? 'amber' : 'green', target: 'base' },
    { title: '專案風險', value: projectRisk, note: '風險或卡關專案需確認下一步', tone: projectRisk ? 'red' : 'green', target: 'roadmap' },
    { title: '等待回覆', value: waitingWork + taskBlocked, note: '等待廠商、同仁或主管回覆', tone: waitingWork + taskBlocked ? 'violet' : 'green', target: 'board' },
  ]
  const dataHealthRows = [
    { label: '工作資料', count: workItems.length + taskRows.length, meta: `${workItems.length} 看板 / ${taskRows.length} 任務`, target: 'board' },
    { label: '採購資料', count: purchases.length, meta: `${purchaseOpen} 未完成 / ${formatMoney(purchaseTotal)}`, target: 'base' },
    { label: '專案資料', count: projects.length, meta: `${projectActive} 進行中 / 平均 ${projectAvgProgress}%`, target: 'roadmap' },
    { label: '提醒資料', count: reminders.length, meta: `${reminderSummary.open} 未結 / ${reminderSummary.week} 本週`, target: 'reminders' },
  ]
  const briefingRows = [
    `營運分數 ${operationScore}，目前${riskTotal ? `有 ${riskTotal} 個風險訊號` : '沒有明顯風險訊號'}。`,
    purchaseOpen ? `採購尚有 ${purchaseOpen} 筆未完成，其中 ${purchaseNotArrived} 筆未到貨、${purchaseUnpaid} 筆未付款。` : '採購目前沒有未完成項目。',
    projectRisk ? `專案有 ${projectRisk} 筆風險或卡關，建議先確認責任人與下一步。` : `專案平均進度 ${projectAvgProgress}%，目前無明顯風險。`,
    reminderSummary.open ? `提醒中心有 ${reminderSummary.open} 筆未結，今日 ${reminderSummary.today} 筆，本週 ${reminderSummary.week} 筆。` : '提醒中心目前沒有未結事項。',
  ]
  const focusItems = workItems
    .filter((item) => item.lane !== '已完成')
    .slice()
    .sort((a, b) => {
      const priorityScore = (row) => row.priority === '緊急' ? 0 : row.priority === '高' ? 1 : row.priority === '中' ? 2 : 3
      return priorityScore(a) - priorityScore(b) || String(a.due || '9999-12-31').localeCompare(String(b.due || '9999-12-31'))
    })
    .slice(0, 5)
  const purchaseFocus = purchases
    .map((row) => {
      const actions = []
      if ((row.arrivalStatus || '未到貨') !== '已到貨' && !['已完成', '已取消'].includes(row.status || '')) actions.push('到貨')
      if ((row.paymentStatus || '未付款') !== '已付款' && !['已完成', '已取消'].includes(row.status || '')) actions.push('付款')
      if ((row.acceptanceStatus || '未驗收') !== '已驗收' && !['已完成', '已取消'].includes(row.status || '')) actions.push('驗收')
      if (String(row.status || '').includes('詢價') || String(row.status || '').includes('報價')) actions.push('報價')
      return { row, actions, amount: calculatePurchase(row).taxedTotal }
    })
    .filter((item) => item.actions.length)
    .sort((a, b) => b.actions.length - a.actions.length || b.amount - a.amount)
    .slice(0, 5)
  const projectFocus = projects
    .filter((project) => Number(project.progress || 0) < 100)
    .slice()
    .sort((a, b) => {
      const riskA = String(a.health || '').includes('風險') || String(a.health || '').includes('卡關') || a.tone === 'red' ? 0 : 1
      const riskB = String(b.health || '').includes('風險') || String(b.health || '').includes('卡關') || b.tone === 'red' ? 0 : 1
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
      label: '工作',
      title: item.title || '未命名工作',
      subtitle: `${item.lane || '待分類'} · ${item.owner || '未指定'} · ${item.due || '未設定日期'}`,
      badge: item.priority || '中',
      target: 'board',
      raw: item,
      score: item.priority === '緊急' ? 90 : item.priority === '高' ? 75 : 45,
    })),
    ...purchaseFocus.map(({ row, actions, amount }) => ({
      id: `purchase-${row.id}`,
      label: '採購',
      title: purchaseTitle(row),
      subtitle: `${row.vendor || '未指定廠商'} · ${actions.join(' / ')} · ${formatMoney(amount)}`,
      badge: row.status || '待確認',
      target: 'base',
      score: 60 + actions.length * 8 + Math.min(20, Math.round(amount / 50000)),
    })),
    ...projectFocus.map((project) => ({
      id: `project-${project.id}`,
      label: '專案',
      title: project.name || '未命名專案',
      subtitle: `${project.phase || '未設定階段'} · ${project.owner || '未指定'} · ${project.endDate || '未設定日期'}`,
      badge: project.health || `${Number(project.progress || 0)}%`,
      target: 'roadmap',
      score: String(project.health || '').includes('風險') || String(project.health || '').includes('卡關') ? 82 : 50,
    })),
    ...reminderFocus.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      label: '提醒',
      title: reminder.title || '未命名提醒',
      subtitle: `${reminder.type || '提醒'} · ${reminder.dueDate || '未設定日期'}`,
      badge: reminder.priority || '中',
      target: 'reminders',
      score: reminder.priority === '高' ? 78 : 48,
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
          <p className="eyebrow hero-eyebrow">今日焦點</p>
          <h2>雲端工作總覽</h2>
          <div className="hero-actions">
            <button type="button" onClick={() => setActive('board')}>工作事項</button>
            <button type="button" onClick={() => setActive('base')}>採購管理</button>
            <button type="button" onClick={() => setActive('roadmap')}>專案管理</button>
          </div>
        </div>
        <div className="hero-metrics home-hero-metrics-grid">
          <Metric label="未完成工作" value={metrics.open} tone="blue" />
          <Metric label="逾期工作" value={overdueWork} tone="red" />
          <Metric label="待處理採購" value={purchaseOpen} tone="amber" />
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
        <Metric label="今日到期" value={todayDueWork} tone="violet" />
        <Metric label="任務未結" value={taskOpen} tone="blue" />
        <Metric label="專案進行" value={projectActive} tone="green" />
        <Metric label="專案風險" value={projectRisk} tone="red" />
        <Metric label="採購總額" value={formatMoney(purchaseTotal)} tone="green" />
      </section>

      <section className="panel wide home-executive-briefing">
        <div className="home-executive-head">
          <div>
            <p className="eyebrow">OPERATION BRIEFING</p>
            <h3>今日指揮摘要</h3>
          </div>
          <button className="ghost-btn" type="button" onClick={exportHomeBriefing}>匯出摘要</button>
        </div>
        <div className="home-executive-grid">
          <article className={`home-score-card ${operationTone}`}>
            <span>營運分數</span>
            <strong>{operationScore}</strong>
            <small>{riskTotal ? `目前有 ${riskTotal} 個風險訊號` : '目前狀態穩定'}</small>
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
        <PanelTitle eyebrow="DATA HEALTH" title="資料健康檢查" action={homeCloudLoading ? '同步中' : '雲端 / 本機已讀取'} />
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
        <PanelTitle eyebrow="整合待辦" title="下一步優先序" action={homeCloudLoading ? '同步中' : '已同步'} />
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
          )) : <EmptyState title="目前沒有待處理焦點" action="新增工作事項或採購後，這裡會自動彙整下一步。" />}
        </div>
      </section>

      <section className="panel wide purchase-home home-live-panel">
        <PanelTitle eyebrow="採購處理" title="採購流程總覽" action="紀錄中心" />
        <div className="purchase-home-grid">
          <article><span>採購總額</span><strong>{formatMoney(purchaseTotal)}</strong></article>
          <article><span>詢價 / 報價</span><strong>{purchaseWaitingQuote}</strong></article>
          <article><span>未到貨</span><strong>{purchaseNotArrived}</strong></article>
          <article><span>未付款</span><strong>{purchaseUnpaid}</strong></article>
        </div>
        <div className="purchase-home-list">
          {purchases.length ? purchases.slice(0, 5).map((row) => (
            <button key={row.id} type="button" onClick={() => setActive('base')}>
              <div><strong>{purchaseTitle(row)}</strong><small>{row.department || '未指定單位'} · {row.vendor || '未指定廠商'} · {getPurchaseItems(row).length} 項</small></div>
              <Badge value={row.status || '待確認'} />
            </button>
          )) : <EmptyState title="尚無採購資料" action="進入紀錄中心新增採購後，總覽會即時彙整。" />}
        </div>
      </section>

      <section className="panel wide home-project-panel">
        <PanelTitle eyebrow="專案推進" title="專案管理摘要" action="專案管理" />
        <div className="home-project-summary">
          <article><span>專案數</span><strong>{projects.length}</strong></article>
          <article><span>進行中</span><strong>{projectActive}</strong></article>
          <article><span>平均進度</span><strong>{projectAvgProgress}%</strong></article>
          <article><span>風險</span><strong>{projectRisk}</strong></article>
        </div>
        <div className="home-project-list">
          {projectFocus.length ? projectFocus.map((project) => (
            <button key={project.id} type="button" onClick={() => setActive('roadmap')}>
              <div>
                <strong>{project.name || '未命名專案'}</strong>
                <small>{project.phase || '未設定階段'} · {project.owner || '未指定'} · {project.endDate || '未設定日期'}</small>
                <i><em style={{ width: `${Math.max(0, Math.min(100, Number(project.progress || 0)))}%` }} /></i>
              </div>
              <Badge value={project.health || `${Number(project.progress || 0)}%`} />
            </button>
          )) : <EmptyState title="尚無進行中專案" action="建立專案後，這裡會顯示進度與風險。" />}
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
          {reminderFocus.length ? reminderFocus.map((item) => {
            const due = getReminderDueInfo(item.dueDate)
            return (
              <button key={item.id} type="button" onClick={() => setActive('reminders')}>
                <div><strong>{item.title}</strong><small>{item.sourceType} · {item.type} · {due.label}</small></div>
                <Badge value={item.priority} />
              </button>
            )
          }) : <EmptyState title="目前沒有未結提醒" action="新增提醒後會出現在這裡。" />}
        </div>
      </section>

      <section className="panel">
        <PanelTitle eyebrow="快速入口" title="常用視圖" />
        <div className="view-launchers view-launchers-min">
          <button type="button" onClick={() => setActive('board')}><span><Icon name="kanban" /></span><strong>工作事項</strong></button>
          <button type="button" onClick={() => setActive('base')}><span><Icon name="records" /></span><strong>紀錄中心</strong></button>
          <button type="button" onClick={() => setActive('roadmap')}><span><Icon name="project" /></span><strong>專案管理</strong></button>
          <button type="button" onClick={() => setActive('insight')}><span><Icon name="report" /></span><strong>分析摘要</strong></button>
          <button type="button" onClick={() => setActive('reminders')}><span>🔔</span><strong>提醒中心</strong></button>
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle eyebrow="近期動態" title="工作狀態流" />
        <div className="pulse-feed">
          {workItems.length ? workItems.slice(0, 10).map((item) => (
            <article key={item.id} className="pulse-item">
              <span className={`dot ${toneMap[item.lane] || 'blue'}`} />
              <div>
                <strong>{item.title}</strong>
                <small>{item.type} · {item.owner} · {item.note}</small>
              </div>
              <Badge value={item.priority} />
            </article>
          )) : <EmptyState title="尚無工作動態" action="新增工作事項後，近期動態會自動顯示。" />}
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
  const [laneFilter, setLaneFilter] = useState('全部')
  const [priorityFilter, setPriorityFilter] = useState('全部')
  const [ownerFilter, setOwnerFilter] = useState('全部')
  const [sortMode, setSortMode] = useState('到期日')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLane, setBulkLane] = useState('處理中')
  const [bulkPriority, setBulkPriority] = useState('中')
  const [bulkOwner, setBulkOwner] = useState('Kyle')
  const [hideDone, setHideDone] = useState(false)
  const ownerOptions = useMemo(() => ['全部', ...Array.from(new Set(items.map((item) => item.owner).filter(Boolean)))], [items])
  const scopedItems = useMemo(() => {
    const next = items
      .filter((item) => !hideDone || item.lane !== '已完成')
      .filter((item) => laneFilter === '全部' || item.lane === laneFilter)
      .filter((item) => priorityFilter === '全部' || item.priority === priorityFilter)
      .filter((item) => ownerFilter === '全部' || item.owner === ownerFilter)
      .slice()
    next.sort((a, b) => {
      if (sortMode === '健康度') return Number(a.health || 0) - Number(b.health || 0)
      if (sortMode === '優先級') {
        const order = { 緊急: 0, 高: 1, 中: 2, 低: 3 }
        return (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
      }
      return String(a.due || '').localeCompare(String(b.due || ''))
    })
    return next
  }, [items, laneFilter, priorityFilter, ownerFilter, sortMode, hideDone])
  const boardSummary = useMemo(() => ({
    total: items.length,
    open: items.filter((item) => item.lane !== '已完成').length,
    waiting: items.filter((item) => item.lane === '等待回覆').length,
    urgent: items.filter((item) => ['緊急', '高'].includes(item.priority)).length,
  }), [items])
  const focusRows = useMemo(() => {
    const today = todayDate()
    return [
      { id: 'today', label: '今日到期', count: items.filter((item) => item.due === today && item.lane !== '已完成').length, action: () => { setLaneFilter('全部'); setPriorityFilter('全部'); setOwnerFilter('全部'); setSortMode('到期日'); setHideDone(true) } },
      { id: 'waiting', label: '等待回覆', count: items.filter((item) => item.lane === '等待回覆').length, action: () => { setLaneFilter('等待回覆'); setPriorityFilter('全部'); setOwnerFilter('全部'); setHideDone(false) } },
      { id: 'urgent', label: '高優先', count: items.filter((item) => ['緊急', '高'].includes(item.priority)).length, action: () => { setLaneFilter('全部'); setPriorityFilter('高'); setOwnerFilter('全部'); setHideDone(false) } },
      { id: 'done', label: hideDone ? '顯示已完成' : '收合已完成', count: items.filter((item) => item.lane === '已完成').length, action: () => setHideDone((value) => !value) },
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
    const headers = ['編號', '標題', '狀態', '優先級', '負責人', '到期日', '來源', '關聯', '健康度', '備註']
    const rows = scopedItems.map((item) => [item.id, item.title, item.lane, item.priority, item.owner, item.due, item.channel, item.relation, item.health, item.note])
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    downloadFlowdeskText(`FlowDesk工作事項_${todayDate()}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8;')
  }

  function clearBoardFilters() {
    setLaneFilter('全部')
    setPriorityFilter('全部')
    setOwnerFilter('全部')
    setSortMode('到期日')
    setHideDone(false)
    clearBoardSelection()
  }

  return (
    <div className="page-stack board-page board-page-v198">
      <section className="surface-toolbar board-toolbar">
        <div>
          <p className="eyebrow">工作事項</p>
          <h2>工作事項</h2>
        </div>
        <div className="board-toolbar-actions">
          <div className="segmented board-view-switch">
            {['看板', '表格', '卡片'].map((name) => (
              <button key={name} className={view === name ? 'active' : ''} type="button" onClick={() => setView(name)}>{name}</button>
            ))}
          </div>
          <button className="primary-btn board-add-btn" type="button" onClick={onAddItem}>新增工作事項</button>
        </div>
      </section>

      <section className="board-control-center">
        <div className="board-control-metrics">
          <article><span>總工作</span><strong>{boardSummary.total}</strong></article>
          <article><span>未完成</span><strong>{boardSummary.open}</strong></article>
          <article><span>等待回覆</span><strong>{boardSummary.waiting}</strong></article>
          <article><span>高優先</span><strong>{boardSummary.urgent}</strong></article>
        </div>
        <div className="board-filter-grid">
          <label>狀態<select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)}><option value="全部">全部</option>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
          <label>優先級<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="全部">全部</option>{['緊急', '高', '中', '低'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label>負責人<select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
          <label>排序<select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>{['到期日', '優先級', '健康度'].map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={clearBoardFilters}>清除篩選</button>
        </div>
        <div className="board-result-hint">目前顯示 {scopedItems.length} / {items.length} 筆</div>
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
        <div><strong>批次處理</strong><span>已選取 {selectedIds.length} 筆 / 目前視圖 {scopedItems.length} 筆</span></div>
        <div className="bulk-actions-grid">
          <button type="button" onClick={selectScopedItems} disabled={!scopedItems.length}>選取目前視圖</button>
          <button type="button" onClick={clearBoardSelection} disabled={!selectedIds.length}>取消選取</button>
          <label>狀態<select value={bulkLane} onChange={(event) => setBulkLane(event.target.value)}>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
          <button type="button" onClick={() => applyBulkPatch({ lane: bulkLane })} disabled={!selectedIds.length}>套用狀態</button>
          <label>優先<select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value)}>{['緊急', '高', '中', '低'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <button type="button" onClick={() => applyBulkPatch({ priority: bulkPriority })} disabled={!selectedIds.length}>套用優先</button>
          <label>負責<input value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)} /></label>
          <button type="button" onClick={() => applyBulkPatch({ owner: bulkOwner || 'Kyle' })} disabled={!selectedIds.length}>套用負責人</button>
          <button type="button" onClick={exportBoardCsv}>匯出目前視圖</button>
        </div>
      </section>

      {!items.length && (
        <section className="board-empty-state">
          <strong>目前沒有工作項目</strong>
          <span>可先新增一筆工作，或稍後從採購、專案流程建立追蹤項目。</span>
          <button type="button" className="primary-btn" onClick={onAddItem}>新增第一筆工作</button>
        </section>
      )}

      {items.length > 0 && !scopedItems.length && (
        <section className="board-empty-state slim">
          <strong>沒有符合篩選的工作</strong>
          <span>請調整狀態、優先級或負責人條件。</span>
          <button type="button" className="ghost-btn" onClick={clearBoardFilters}>清除篩選</button>
        </section>
      )}

      {selected && <BoardFloatingPreview selected={selected} />}

      {view === '看板' && (
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
                  )) : <div className="lane-empty">尚無項目</div>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {view === '表格' && <WorkGrid items={scopedItems} selected={selected} setSelected={setSelected} selectedIds={selectedIds} onToggleSelect={toggleSelectedId} />}
      {view === '卡片' && <CardWall items={scopedItems} selected={selected} setSelected={setSelected} selectedIds={selectedIds} onToggleSelect={toggleSelectedId} />}
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
  const [statusFilter, setStatusFilter] = useState('全部')
  const [paymentFilter, setPaymentFilter] = useState('全部')
  const [arrivalFilter, setArrivalFilter] = useState('全部')
  const [acceptanceFilter, setAcceptanceFilter] = useState('全部')
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
  const [purchaseCloudReady, setPurchaseCloudReady] = useState(!flowdeskCloud)
  const purchaseCloudSaveTimers = useRef({})

  const activeStages = purchaseStages.filter((stage) => stage.enabled)
  const doneStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('完成')).map((stage) => stage.name)
  const arrivedStages = purchaseStages.filter((stage) => stage.done || stage.name.includes('到貨') || stage.name.includes('完成')).map((stage) => stage.name)
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
      row.paymentStatus,
      row.arrivalStatus,
      row.acceptanceStatus,
      row.note,
      ...getPurchaseItems(row).flatMap((item) => [item.name, item.note]),
    ].join(' ').toLowerCase()
    const byKeyword = !keyword || searchText.includes(keyword)
    const byStatus = statusFilter === '全部' || row.status === statusFilter
    const byPayment = paymentFilter === '全部' || (row.paymentStatus || '未付款') === paymentFilter
    const byArrival = arrivalFilter === '全部' || (row.arrivalStatus || '未到貨') === arrivalFilter
    const byAcceptance = acceptanceFilter === '全部' || (row.acceptanceStatus || '未驗收') === acceptanceFilter
    const byVendor = vendorFilter === '全部' || row.vendor === vendorFilter
    const byMonth = monthFilter === '全部' || (row.requestDate || '').startsWith(monthFilter)
    return byKeyword && byStatus && byPayment && byArrival && byAcceptance && byVendor && byMonth
  })
  const purchasePageCount = Math.max(1, Math.ceil(filteredPurchases.length / purchasePageSize))
  const safePurchasePage = Math.min(purchasePage, purchasePageCount)
  const pagedPurchases = filteredPurchases.slice((safePurchasePage - 1) * purchasePageSize, safePurchasePage * purchasePageSize)
  const stableSelectedPurchase = selectedPurchase ? purchases.find((row) => isSamePurchase(row, selectedPurchase)) || null : null
  const totalUntaxed = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).untaxedAmount, 0)
  const totalTax = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxAmount, 0)
  const totalAmount = filteredPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const waitingQuote = purchases.filter((row) => row.status.includes('詢價') || row.status.includes('報價')).length
  const pendingApproval = purchases.filter((row) => row.status.includes('簽核') || row.status.includes('核准') || row.status.includes('確認')).length
  const notArrived = purchases.filter((row) => !arrivedStages.includes(row.status) && (row.arrivalStatus || '未到貨') !== '已到貨').length
  const paymentPending = purchases.filter((row) => (row.paymentStatus || '未付款') !== '已付款' && !doneStages.includes(row.status)).length
  const acceptancePending = purchases.filter((row) => (row.acceptanceStatus || '未驗收') !== '已驗收' && !doneStages.includes(row.status)).length
  const completedPurchases = purchases.filter((row) => doneStages.includes(row.status)).length
  const currentMonthKey = todayDate().slice(0, 7)
  const thisMonthTotal = purchases
    .filter((row) => (row.requestDate || '').startsWith(currentMonthKey))
    .reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const vendorSpendRanking = Array.from(purchases.reduce((map, row) => {
    const vendor = row.vendor || '未指定廠商'
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
      if ((row.arrivalStatus || '未到貨') !== '已到貨' && !doneStages.includes(row.status)) reasons.push('到貨')
      if ((row.paymentStatus || '未付款') !== '已付款' && !doneStages.includes(row.status)) reasons.push('付款')
      if ((row.acceptanceStatus || '未驗收') !== '已驗收' && !doneStages.includes(row.status)) reasons.push('驗收')
      if (row.status.includes('詢價') || row.status.includes('報價')) reasons.push('報價')
      const score = reasons.length * 10 + Math.min(50, Math.round(amount / 10000))
      return { row, score, reasons, amount }
    })
    .filter((item) => item.reasons.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

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
      setActiveTable(tables[0]?.name || '採購紀錄')
    }
  }, [tables, activeTable])

  useEffect(() => {
    setPurchasePage(1)
  }, [statusFilter, paymentFilter, arrivalFilter, acceptanceFilter, vendorFilter, monthFilter, purchaseKeyword, purchasePageSize])

  useEffect(() => {
    if (activeTable !== '採購紀錄') return
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
    writeHistory(next.id, next.item, `新增採購，狀態為「${next.status}」。`)
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
      writeHistory(next.id, next.item, `狀態由「${before?.status || '未設定'}」改為「${next.status}」。`)
    } else {
      writeHistory(next.id, next.item, '更新採購資料。')
    }
    setSelectedPurchase(next)
    setEditingPurchase(null)
  }

  function updatePurchaseStatus(row, status) {
    if (!row || !status) return
    const patch = { status }
    if (arrivedStages.includes(status) && (row.arrivalStatus || '未到貨') === '未到貨') patch.arrivalStatus = '已到貨'
    if (doneStages.includes(status)) {
      if ((row.arrivalStatus || '未到貨') !== '已到貨') patch.arrivalStatus = '已到貨'
      if ((row.acceptanceStatus || '未驗收') !== '已驗收') patch.acceptanceStatus = '已驗收'
    }
    const next = normalizePurchase({ ...row, ...patch })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
    writeHistory(row.id, purchaseTitle(row), `狀態改為「${status}」。`)
  }

  function updatePurchaseMeta(row, patch, message) {
    if (!row) return
    const next = normalizePurchase({ ...row, ...patch })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
    writeHistory(row.id, purchaseTitle(row), message || '更新採購追蹤欄位。')
  }

  function advancePurchase(row) {
    if (!row) return
    const currentIndex = activeStages.findIndex((stage) => stage.name === row.status)
    const nextStage = activeStages[Math.min(activeStages.length - 1, currentIndex + 1)]
    if (nextStage && nextStage.name !== row.status) updatePurchaseStatus(row, nextStage.name)
  }

  function completePurchase(row) {
    if (!row) return
    const doneStage = purchaseStages.find((stage) => stage.done || stage.name.includes('完成'))?.name || '已完成'
    updatePurchaseStatus(row, doneStage)
  }

  function deletePurchase(targetRow) {
    const target = typeof targetRow === 'object' ? targetRow : purchases.find((row) => row.id === targetRow)
    if (!target) return
    const deleteLabel = [target.id, purchaseTitle(target)].filter(Boolean).join(' ')
    if (!confirmDestructiveAction(deleteLabel || '採購紀錄')) return
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
    writeHistory(target.id, purchaseTitle(target), '刪除採購紀錄。')
  }

  function duplicatePurchase(row) {
    if (!row) return
    const next = normalizePurchase({
      ...row,
      id: getNextPurchaseId(purchases),
      _purchaseKey: createPurchaseKey(),
      status: activeStages[0]?.name || row.status || '需求確認',
      requestDate: todayDate(),
      orderDate: '',
      arrivalDate: '',
      note: [row.note, `由 ${row.id} 複製。`].filter(Boolean).join('\n'),
    })
    setPurchases((rows) => [next, ...rows])
    setSelectedPurchase(next)
    writeHistory(next.id, purchaseTitle(next), `由 ${row.id} 複製採購。`)
  }

  function createPurchaseWorkItem(row) {
    if (!row || !onCreateWorkItem) return
    const amount = calculatePurchase(row)
    onCreateWorkItem({
      title: `追蹤 ${purchaseTitle(row)}`,
      type: '採購追蹤',
      lane: doneStages.includes(row.status) ? '已完成' : '待分類',
      priority: row.status?.includes('簽核') || row.status?.includes('確認') ? '高' : '中',
      channel: '採購管理',
      relation: row.id,
      requester: row.requester || 'Kyle',
      owner: 'Kyle',
      due: row.arrivalDate || row.orderDate || row.requestDate || todayDate(),
      health: doneStages.includes(row.status) ? 100 : 82,
      note: [row.vendor, purchaseTitle(row), formatMoney(amount.taxedTotal), row.note].filter(Boolean).join('｜'),
      tags: ['採購', row.vendor, row.status].filter(Boolean),
    })
    writeHistory(row.id, purchaseTitle(row), '建立工作事項事項追蹤。')
  }

  function createPurchaseReminder(row, reminderKind = '追蹤') {
    if (!row || !onCreateReminder) return
    const dueMap = {
      付款: row.paymentDueDate || row.orderDate || addDaysDate(7),
      到貨: row.arrivalDueDate || row.arrivalDate || row.orderDate || addDaysDate(3),
      驗收: row.acceptanceDate || row.arrivalDate || row.arrivalDueDate || addDaysDate(5),
      追蹤: row.arrivalDate || row.orderDate || row.requestDate || addDaysDate(3),
    }
    const typeMap = { 付款: '簽核提醒', 到貨: '到貨提醒', 驗收: '追蹤提醒', 追蹤: '追蹤提醒' }
    onCreateReminder({
      title: `${reminderKind} ${purchaseTitle(row)}`,
      type: typeMap[reminderKind] || '追蹤提醒',
      priority: reminderKind === '付款' || row.status?.includes('簽核') || row.status?.includes('確認') ? '高' : '中',
      dueDate: dueMap[reminderKind] || addDaysDate(3),
      sourceType: '採購',
      sourceTitle: `${row.id} ${purchaseTitle(row)}`,
      note: [row.vendor, row.status, row.poNo, row.quoteNo, row.note].filter(Boolean).join('｜'),
    })
    writeHistory(row.id, purchaseTitle(row), `建立${reminderKind}提醒。`)
  }

  function exportFilteredPurchases() {
    const headers = ['編號', '品項', '廠商', '部門', '申請人', '流程狀態', '付款狀態', '到貨狀態', '驗收狀態', '報價單號', 'PO單號', '發票號碼', '申請日', '下單日', '預計到貨', '到貨日', '付款期限', '驗收日', '預算', '報價金額', '未稅', '稅額', '含稅', '預算差異', '品項明細', '備註']
    const rows = filteredPurchases.map((row) => {
      const amount = calculatePurchase(row)
      const itemsText = getPurchaseItems(row).map((item) => `${item.name || '未命名'} x ${item.quantity || 0} @ ${item.unitPrice || 0}`).join('；')
      return [row.id, purchaseTitle(row), row.vendor, row.department, row.requester, row.status, row.paymentStatus || '未付款', row.arrivalStatus || '未到貨', row.acceptanceStatus || '未驗收', row.quoteNo, row.poNo, row.invoiceNo, row.requestDate, row.orderDate, row.arrivalDueDate, row.arrivalDate, row.paymentDueDate, row.acceptanceDate, row.budgetAmount || 0, row.quoteAmount || 0, amount.untaxedAmount, amount.taxAmount, amount.taxedTotal, Number(row.budgetAmount || 0) ? amount.taxedTotal - Number(row.budgetAmount || 0) : '', itemsText, row.note]
    })
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FlowDesk採購資料_${todayDate()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function cancelPurchase(row) {
    const cancelStage = purchaseStages.find((stage) => stage.cancel || stage.name.includes('取消'))?.name || '已取消'
    const next = normalizePurchase({ ...row, status: cancelStage })
    setPurchases((rows) => rows.map((item) => isSamePurchase(item, row) ? next : item))
    setSelectedPurchase(next)
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
    if (!confirmDestructiveAction(target?.name || '採購流程狀態')) return
    setPurchaseStages((stages) => stages.filter((stage) => stage.id !== stageId))
  }

  function resetStages() {
    if (!confirmResetAction('確定要恢復預設採購流程？目前自訂流程會被覆蓋。')) return
    setPurchaseStages(initialPurchaseStages)
    window.localStorage.removeItem('flowdesk-purchase-stages')
  }

  function resetPurchases() {
    if (!confirmResetAction('確定要重置採購資料？目前採購紀錄與歷程會被覆蓋。')) return
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
                    <button type="button" onClick={exportFilteredPurchases}>匯出目前採購</button>
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
              <label>流程<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="全部">全部</option>{activeStages.map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
              <label>付款<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="全部">全部</option>{purchasePaymentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>到貨<select value={arrivalFilter} onChange={(event) => setArrivalFilter(event.target.value)}><option value="全部">全部</option>{purchaseArrivalStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>驗收<select value={acceptanceFilter} onChange={(event) => setAcceptanceFilter(event.target.value)}><option value="全部">全部</option>{purchaseAcceptanceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>廠商<select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>{vendors.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}</select></label>
              <label>月份<select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select></label>
              <button type="button" className="ghost-btn" onClick={() => { setPurchaseKeyword(''); setStatusFilter('全部'); setPaymentFilter('全部'); setArrivalFilter('全部'); setAcceptanceFilter('全部'); setVendorFilter('全部'); setMonthFilter('全部') }}>清除篩選</button>
            </div>
            <div className="purchase-quick-filters">
              <button type="button" className={statusFilter === '全部' && paymentFilter === '全部' && arrivalFilter === '全部' && acceptanceFilter === '全部' ? 'active' : ''} onClick={() => { setStatusFilter('全部'); setPaymentFilter('全部'); setArrivalFilter('全部'); setAcceptanceFilter('全部') }}>全部</button>
              <button type="button" className={arrivalFilter === '未到貨' ? 'active' : ''} onClick={() => { setStatusFilter('全部'); setArrivalFilter('未到貨'); setPaymentFilter('全部'); setAcceptanceFilter('全部') }}>未到貨</button>
              <button type="button" className={paymentFilter === '未付款' ? 'active' : ''} onClick={() => { setStatusFilter('全部'); setPaymentFilter('未付款'); setArrivalFilter('全部'); setAcceptanceFilter('全部') }}>未付款</button>
              <button type="button" className={acceptanceFilter === '未驗收' ? 'active' : ''} onClick={() => { setStatusFilter('全部'); setAcceptanceFilter('未驗收'); setPaymentFilter('全部'); setArrivalFilter('全部') }}>未驗收</button>
              <button type="button" className={statusFilter === '已完成' ? 'active' : ''} onClick={() => { setStatusFilter('已完成'); setPaymentFilter('全部'); setArrivalFilter('全部'); setAcceptanceFilter('全部') }}>已完成</button>
            </div>
            <div className="purchase-v15-status-row purchase-v1974-status-row">
              <article><span>等待報價</span><strong>{waitingQuote}</strong></article>
              <article><span>待確認 / 簽核</span><strong>{pendingApproval}</strong></article>
              <article><span>尚未到貨</span><strong>{notArrived}</strong></article>
              <article><span>未付款</span><strong>{paymentPending}</strong></article>
              <article><span>未驗收</span><strong>{acceptancePending}</strong></article>
              <article><span>已完成</span><strong>{completedPurchases}</strong></article>
            </div>
            <div className="purchase-insight-strip">
              <article><span>本月採購</span><strong>{formatMoney(thisMonthTotal)}</strong></article>
              <article><span>篩選總額</span><strong>{formatMoney(totalAmount)}</strong></article>
              <article><span>篩選筆數</span><strong>{filteredPurchases.length}</strong></article>
            </div>
            <div className="purchase-action-board">
              <div><p className="eyebrow">處理優先序</p><strong>採購待辦焦點</strong><span>依金額與未完成狀態自動排序</span></div>
              <div className="purchase-action-list">
                {purchaseActionRows.length ? purchaseActionRows.map((item) => (
                  <button type="button" key={getPurchaseKey(item.row)} onClick={() => setSelectedPurchase(item.row)}>
                    <div><strong>{purchaseTitle(item.row)}</strong><small>{item.row.vendor || '未指定廠商'} · {item.reasons.join(' / ')}</small></div>
                    <b>{formatMoney(item.amount)}</b>
                  </button>
                )) : <span className="purchase-action-empty">目前沒有需要優先追蹤的採購。</span>}
              </div>
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
                <div className="purchase-selection-status">
                  <span>目前顯示 <b>{pagedPurchases.length}</b> 筆 / 篩選 <b>{filteredPurchases.length}</b> 筆</span>
                  <span>右側明細：<b>{stableSelectedPurchase ? `${stableSelectedPurchase.id} ${purchaseTitle(stableSelectedPurchase)}` : '尚未選取'}</b></span>
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
                            <span>廠商<b>{row.vendor || '—'}</b></span>
                            <span>申請人<b>{row.requester || '—'}</b></span>
                            <span>日期<b>{row.requestDate || '未填日期'}</b></span>
                            <span>品項<b>{getPurchaseItems(row).length} 項</b></span>
                            <span>付款<b>{row.paymentStatus || '未付款'}</b></span>
                            <span>到貨<b>{row.arrivalStatus || '未到貨'}</b></span>
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
                          <button type="button" className="danger" onClick={() => deletePurchase(row)}>刪除</button>
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
                  <PanelTitle eyebrow="採購明細" title={stableSelectedPurchase ? purchaseTitle(stableSelectedPurchase) : '請選擇採購項目'} action={stableSelectedPurchase?.id} />
          <ModuleBoundaryNote moduleId="base" compact />
                  {stableSelectedPurchase ? <PurchaseDetail row={stableSelectedPurchase} stages={purchaseStages} relatedTasks={getPurchaseRelatedTasks(stableSelectedPurchase)} history={purchaseHistory.filter((entry) => entry.purchaseId === stableSelectedPurchase.id)} onEdit={() => setEditingPurchase(stableSelectedPurchase)} onAdvance={() => advancePurchase(stableSelectedPurchase)} onComplete={() => completePurchase(stableSelectedPurchase)} onDuplicate={() => duplicatePurchase(stableSelectedPurchase)} onCreateTask={() => createPurchaseWorkItem(stableSelectedPurchase)} onCreateReminder={(kind) => createPurchaseReminder(stableSelectedPurchase, kind)} onUpdateMeta={(patch, message) => updatePurchaseMeta(stableSelectedPurchase, patch, message)} /> : <p>點選左側採購項目，可查看含稅、未稅與日期明細。</p>}
                </section>
                <section className="purchase-history-card compact-history-card">
                  <PanelTitle eyebrow="狀態歷程" title="最近變更" />
                  <div className="history-list">
                    {purchaseHistory.length ? purchaseHistory.slice(0, 6).map((entry) => <article key={entry.id}><strong>{entry.title}</strong><span>{entry.message}</span><small>{entry.time}</small></article>) : <p>尚無變更紀錄。</p>}
                  </div>
                </section>
                <section className="purchase-vendor-rank-card">
                  <PanelTitle eyebrow="廠商統計" title="採購金額排行" />
                  <div className="purchase-vendor-rank">
                    {vendorSpendRanking.length ? vendorSpendRanking.map((vendor) => (
                      <article key={vendor.vendor}>
                        <div><strong>{vendor.vendor}</strong><span>{vendor.count} 筆</span></div>
                        <b>{formatMoney(vendor.amount)}</b>
                      </article>
                    )) : <p>尚無廠商採購資料。</p>}
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
    source: '手動新增',
    category: '一般任務',
    status: '待跟進',
    priority: '中',
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
    title: String(row.title || '未命名任務').trim(),
    source: row.source || '手動新增',
    category: row.category || '一般任務',
    status: row.status || '待跟進',
    priority: row.priority || '中',
    owner: row.owner || 'Kyle',
    progress: Math.max(0, Math.min(100, Number(row.progress || 0))),
    due: row.due || todayDate(),
    next: next || '補上下一步。',
    relatedPurchase: row.relatedPurchase || '',
    relatedVendor: row.relatedVendor || '',
    relatedProject: row.relatedProject || '',
    tags,
    records: Array.isArray(row.records) && row.records.length ? row.records : ['建立任務。'],
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
  const [filter, setFilter] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState(sourceTasks[0]?.id)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const statusOptions = ['全部', '待跟進', '跟進中', '等回覆', '卡關', '已收斂']
  const taskStatusOptions = statusOptions.filter((item) => item !== '全部')

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
    const statusMatched = filter === '全部' || task.status === filter
    const q = keyword.trim().toLowerCase()
    const text = [task.id, task.title, task.source, task.category, task.status, task.priority, task.owner, task.next, task.relatedPurchase, task.relatedVendor, task.relatedProject, ...(Array.isArray(task.tags) ? task.tags : [])].join(' ').toLowerCase()
    return statusMatched && (!q || text.includes(q))
  })
  const openCount = tasks.filter((task) => task.status !== '已收斂').length
  const waitingCount = tasks.filter((task) => ['等回覆', '卡關'].includes(task.status)).length
  const todayCount = tasks.filter((task) => task.due === todayDate() || task.due === '今日').length
  const avgProgress = Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / Math.max(tasks.length, 1))

  function updateTask(id, patch, recordText) {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task
      const next = normalizeTask({ ...task, ...patch })
      if (recordText) next.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜${recordText}`, ...(task.records || [])].slice(0, 20)
      return next
    }))
  }

  function updateTaskStatus(id, status) {
    const target = tasks.find((task) => task.id === id)
    updateTask(id, { status, progress: status === '已收斂' ? 100 : status === '跟進中' ? Math.max(target?.progress || 0, 35) : target?.progress }, `狀態改為「${status}」。`)
  }

  function addTask(form) {
    const next = normalizeTask({ ...form, id: nextRunningId('TASK', tasks), records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜建立任務。`] })
    setTasks((current) => [next, ...current])
    setSelectedId(next.id)
    setShowTaskForm(false)
  }

  function saveTask(form) {
    const next = normalizeTask(form)
    setTasks((current) => current.map((task) => task.id === next.id ? { ...next, records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜更新任務內容。`, ...(task.records || [])].slice(0, 20) } : task))
    setSelectedId(next.id)
    setEditingTask(null)
  }

  function duplicateTask(task) {
    const next = normalizeTask({ ...task, id: nextRunningId('TASK', tasks), title: `${task.title || '未命名任務'} 複本`, status: '待跟進', progress: 0, records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜由 ${task.id} 複製。`] })
    setTasks((current) => [next, ...current])
    setSelectedId(next.id)
  }

  function removeTask(id) {
    const target = tasks.find((task) => task.id === id)
    if (!confirmDestructiveAction(target?.title || id || '任務')) return
    setTasks((current) => current.filter((task) => task.id !== id))
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
          <button className="ghost-btn" type="button" onClick={() => { setFilter('全部'); setKeyword('') }}>整理視圖</button>
          <button className="primary-btn" type="button" onClick={() => setShowTaskForm(true)}>新增任務</button>
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

      <div className="purchase-filter-bar task-search-bar">
        <label className="purchase-search-field">搜尋<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="任務、廠商、採購、專案、下一步..." /></label>
        <button className="ghost-btn" type="button" onClick={() => { setKeyword(''); setFilter('全部') }}>清除篩選</button>
      </div>

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
                <div className="tag-list">{(selectedTask.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
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
              <section className="detail-block project-meeting-block">
                <div className="detail-block-headline"><p className="eyebrow">會議紀錄</p><button type="button" onClick={() => addProjectMeeting(selectedProject.id)}>新增會議</button></div>
                <div className="project-decision-list">
                  {(selectedProject.meetings || []).map((meeting) => (
                    <article key={meeting.id} className="project-note-editor">
                      <input type="date" value={meeting.date || todayDate()} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { date: event.target.value })} />
                      <input value={meeting.title || ''} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { title: event.target.value })} placeholder="會議主題" />
                      <textarea value={meeting.note || ''} onChange={(event) => updateProjectMeeting(selectedProject.id, meeting.id, { note: event.target.value })} placeholder="會議重點 / 待辦" />
                      <button type="button" onClick={() => removeProjectMeeting(selectedProject.id, meeting.id)}>刪除</button>
                    </article>
                  ))}
                  {!selectedProject.meetings?.length && <div className="flow-empty-card">尚無會議紀錄。</div>}
                </div>
              </section>
              <section className="detail-block project-decision-block">
                <div className="detail-block-headline"><p className="eyebrow">決議事項</p><button type="button" onClick={() => addProjectDecision(selectedProject.id)}>新增決議</button></div>
                <div className="project-decision-list">
                  {(selectedProject.decisions || []).map((decision) => (
                    <article key={decision.id} className="project-decision-row">
                      <input type="date" value={decision.date || todayDate()} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { date: event.target.value })} />
                      <input value={decision.title || ''} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { title: event.target.value })} placeholder="決議內容" />
                      <input value={decision.owner || ''} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { owner: event.target.value })} placeholder="負責人" />
                      <select value={decision.status || '待追蹤'} onChange={(event) => updateProjectDecision(selectedProject.id, decision.id, { status: event.target.value })}><option>待追蹤</option><option>處理中</option><option>已完成</option></select>
                      <button type="button" onClick={() => removeProjectDecision(selectedProject.id, decision.id)}>刪除</button>
                    </article>
                  ))}
                  {!selectedProject.decisions?.length && <div className="flow-empty-card">尚無決議事項。</div>}
                </div>
              </section>
              <section className="detail-block">
                <p className="eyebrow">處理紀錄</p>
                <div className="timeline-notes flow-timeline-notes">
                  {(selectedTask.records || []).map((record, index) => <div key={`${record}-${index}`}><span>{index + 1}</span><p>{record}</p></div>)}
                </div>
              </section>
              <div className="task-action-row task-action-row-v2 task-action-row-expanded">
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '跟進中')}>跟進中</button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '等回覆')}>等回覆</button>
                <button type="button" onClick={() => updateTaskStatus(selectedTask.id, '已收斂')}>收斂</button>
                <button type="button" onClick={() => setEditingTask(selectedTask)}>編輯</button>
                <button type="button" onClick={() => duplicateTask(selectedTask)}>複製</button>
                <button className="danger" type="button" onClick={() => removeTask(selectedTask.id)}>刪除</button>
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
          <div><p className="eyebrow">任務追蹤</p><h2>{mode === 'edit' ? '編輯任務' : '新增任務'}</h2></div>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        <div className="purchase-modal-body">
          <div className="form-grid">
            <label>標題<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="例如：追蹤廠商報價" /></label>
            <label>狀態<select value={form.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>優先級<select value={form.priority} onChange={(event) => update('priority', event.target.value)}><option>高</option><option>中</option><option>低</option></select></label>
            <label>負責人<input value={form.owner} onChange={(event) => update('owner', event.target.value)} /></label>
            <label>來源<input value={form.source} onChange={(event) => update('source', event.target.value)} /></label>
            <label>類別<input value={form.category} onChange={(event) => update('category', event.target.value)} /></label>
            <label>到期日<input type="date" value={form.due} onChange={(event) => update('due', event.target.value)} /></label>
            <label>進度 %<input type="number" min="0" max="100" value={form.progress} onChange={(event) => update('progress', event.target.value)} /></label>
            <label>關聯採購<input value={form.relatedPurchase} onChange={(event) => update('relatedPurchase', event.target.value)} placeholder="例如 PO-001" /></label>
            <label>關聯廠商<input value={form.relatedVendor} onChange={(event) => update('relatedVendor', event.target.value)} /></label>
            <label>關聯專案<input value={form.relatedProject} onChange={(event) => update('relatedProject', event.target.value)} placeholder="例如 PRJ-001" /></label>
            <label>標籤<input value={form.tagsText} onChange={(event) => update('tagsText', event.target.value)} placeholder="以逗號分隔" /></label>
            <label className="form-wide">下一步<textarea value={form.next} onChange={(event) => update('next', event.target.value)} /></label>
          </div>
        </div>
        <div className="form-actions sticky-form-actions">
          <button className="ghost-btn" type="button" onClick={onClose}>取消</button>
          <button className="primary-btn" type="button" onClick={submitTask} disabled={!String(form.title || '').trim()}>儲存</button>
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
  const [projectPhaseFilter, setProjectPhaseFilter] = useState('全部')
  const [projectHealthFilter, setProjectHealthFilter] = useState('全部')
  const [projectPriorityFilter, setProjectPriorityFilter] = useState('全部')
  const [projectSortMode, setProjectSortMode] = useState(() => {
    if (typeof window === 'undefined') return '優先順序'
    const saved = window.localStorage.getItem('flowdesk-project-sort-mode-v20322')
    return PROJECT_SORT_OPTIONS.includes(saved) ? saved : '優先順序'
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

  function projectPriorityBaseScore(priority = '中') {
    return priority === '緊急' ? 78 : priority === '高' ? 62 : priority === '低' ? 22 : 42
  }

  function getProjectPriorityMeta(project = {}) {
    const today = todayDate()
    const manual = PROJECT_PRIORITY_OPTIONS.includes(project.priority) ? project.priority : '中'
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
    const blocked = health.includes('卡') || health.includes('風險') || health.includes('待')
    let score = projectPriorityBaseScore(manual)
    const reasons = [`手動優先：${manual}`]

    if (progress >= 100 || phase === '已完成' || phase === '已取消') {
      score -= 52
      reasons.push('專案已完成或取消')
    } else {
      if (endDate < today) {
        score += 30
        reasons.push('專案已逾期')
      } else if (remainingDays <= 3) {
        score += 24
        reasons.push('3 天內到期')
      } else if (remainingDays <= 7) {
        score += 18
        reasons.push('7 天內到期')
      } else if (remainingDays <= 14) {
        score += 10
        reasons.push('14 天內到期')
      }
      if (blocked) {
        score += health.includes('高風險') || health.includes('卡') ? 18 : 10
        reasons.push(`健康度：${project.health || '待確認'}`)
      }
      if (overdueItems > 0) {
        score += Math.min(18, overdueItems * 6)
        reasons.push(`${overdueItems} 個任務逾期`)
      }
      if (activeItems > 1) {
        score += Math.min(8, activeItems * 2)
        reasons.push(`${activeItems} 個項目進行中`)
      }
      if (progress > 0 && progress < 35 && remainingDays <= 14) {
        score += 8
        reasons.push('進度偏低')
      }
      if (phase === '暫緩') {
        score -= 18
        reasons.push('專案暫緩')
      }
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)))
    const label = finalScore >= 82 ? '緊急' : finalScore >= 62 ? '高' : finalScore >= 35 ? '中' : '低'
    const tone = label === '緊急' || label === '高' ? 'red' : label === '中' ? 'amber' : 'green'
    return {
      manual,
      label,
      score: finalScore,
      tone,
      reason: reasons.slice(0, 3).join(' / '),
    }
  }

  function compareProjectsBySort(a, b) {
    if (projectSortMode === '手動排序') return 0
    if (projectSortMode === '到期日') return String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31')) || String(a.name).localeCompare(String(b.name), 'zh-Hant')
    if (projectSortMode === '進度') return clampPercent(a.progress) - clampPercent(b.progress) || String(a.endDate || '9999-12-31').localeCompare(String(b.endDate || '9999-12-31'))
    if (projectSortMode === '名稱') return String(a.name).localeCompare(String(b.name), 'zh-Hant')
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
      name: task.name || '未命名任務',
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
      name: subtask.name || '新增子任務',
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
      name: project.name || '未命名專案',
      phase: project.phase || '規劃中',
      owner: project.owner || 'Kyle',
      health: project.health || '待確認',
      priority: PROJECT_PRIORITY_OPTIONS.includes(project.priority) ? project.priority : '中',
      next: project.next || '',
      tone: project.tone || 'blue',
      progress: clampPercent(project.progress),
      milestones: Array.isArray(project.milestones) ? project.milestones.map((milestone, index) => ({
        ...milestone,
        id: milestone.id || `${project.id || 'project'}-milestone-${index + 1}`,
        name: milestone.name || '未命名里程碑',
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
      name: '未命名專案',
      phase: '規劃中',
      owner: 'Kyle',
      startDate: today,
      endDate: nextMonth,
      progress: 0,
      health: '待確認',
      priority: '中',
      tone: 'blue',
      next: '補上專案目標、時程與負責人。',
      related: [],
      tasks: [{ id: taskId, name: '專案啟動', owner: 'Kyle', start: today, end: nextMonth, progress: 0, done: false, tone: 'blue', subtasks: [] }],
      milestones: [{ id: stableId('milestone'), name: '啟動確認', date: today, done: false }],
      meetings: [],
      decisions: [],
      records: ['建立專案。'],
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
      if (recordText) next.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜${recordText}`, ...(project.records || [])].slice(0, 30)
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
        const message = scheduled.changed ? `${recordText ? `${recordText}；` : ''}依前置任務完成日重新排定後續任務。` : recordText
        nextProject.records = [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜${message}`, ...(safeProject.records || [])].slice(0, 30)
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
        // 前置任務異動後，後續任務要「緊接」前置完成日後一天，
        // 不只是在早於前置時才往後推，避免 A 往前/往後調整時 B 停在舊日期。
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
      predecessorName: predecessor.name || `任務 ${taskIndex + 1}`,
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
    if (Boolean(task.done) || progress >= 100) return { label: '已完成', tone: 'done' }
    if (dependencyMeta.waiting) return { label: '等待前置', tone: 'waiting' }
    if (end < today) return { label: '逾期', tone: 'overdue' }
    if (start > today) return { label: '未開始', tone: 'pending' }
    if (progress > 0) return { label: '進行中', tone: 'active' }
    return { label: '未啟動', tone: 'idle' }
  }

  function getSubtaskStatusMeta(project = {}, task = {}, subtask = {}) {
    const today = todayDate()
    const progress = clampPercent(subtask.progress)
    const start = subtask.start || task.start || project.startDate || today
    const end = subtask.end || task.end || project.endDate || start
    if (Boolean(subtask.done) || progress >= 100) return { label: '已完成', tone: 'done' }
    if (end < today) return { label: '逾期', tone: 'overdue' }
    if (start > today) return { label: '未開始', tone: 'pending' }
    if (progress > 0) return { label: '進行中', tone: 'active' }
    return { label: '未啟動', tone: 'idle' }
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
    const nextRecord = scheduled.changed ? `${recordText ? `${recordText}；` : ''}依前置任務自動重排後續任務。` : recordText
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, nextRecord)
  }

  function autoEstimateProjectTask(projectId, taskIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const safeProject = normalizeProject(project)
    const targetTask = safeProject.tasks[taskIndex]
    if (!targetTask) return
    const nextProgress = estimateTaskProgress(targetTask)
    updateProjectTask(projectId, taskIndex, { progress: nextProgress, manualProgress: false, done: nextProgress >= 100 }, `依子任務自動估算任務進度為 ${nextProgress}%。`)
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
        name: `新增任務 ${project.tasks.length + 1}`,
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
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, scheduled.changed ? '新增專案任務；依前置任務自動重排。' : '新增專案任務。')
  }

  function removeProjectTask(projectId, taskIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const target = (project.tasks || [])[taskIndex]
    if (!confirmDestructiveAction(target?.name || '專案任務')) return
    const removedTaskId = target?.id
    const tasks = (project.tasks || [])
      .filter((_, index) => index !== taskIndex)
      .map((task) => task.dependsOnTaskId === removedTaskId ? { ...task, dependsOnTaskId: '' } : task)
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '刪除專案任務，並清除相關前置任務。')
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
          name: `新增子任務 ${nextSubtaskCount}`,
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
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '新增子任務。')
  }

  function removeProjectSubtask(projectId, taskIndex, subtaskIndex) {
    const project = normalizeProject(projects.find((item) => item.id === projectId))
    if (!project?.id) return
    const target = project.tasks?.[taskIndex]?.subtasks?.[subtaskIndex]
    if (!confirmDestructiveAction(target?.name || '子任務')) return
    const tasks = project.tasks.map((task, index) => {
      if (index !== taskIndex) return task
      const nextTask = { ...task, subtasks: (task.subtasks || []).filter((_, subIndex) => subIndex !== subtaskIndex) }
      if (nextTask.manualProgress || !(nextTask.subtasks || []).length) return nextTask
      const nextProgress = estimateTaskProgress(nextTask)
      return { ...nextTask, progress: nextProgress, done: nextProgress >= 100 }
    })
    const scheduled = resolveProjectTaskDependencies({ ...project, tasks })
    const nextProject = normalizeProject(scheduled.project)
    updateProject(projectId, { startDate: nextProject.startDate, endDate: nextProject.endDate, tasks: nextProject.tasks, progress: estimateProjectProgress(nextProject) }, '刪除子任務。')
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
    const milestones = [...project.milestones, { id: stableId('milestone'), name: '新增里程碑', date: project.endDate, done: false }]
    updateProject(projectId, { milestones }, '新增里程碑。')
    setDetailTab('milestones')
  }

  function removeProjectMilestone(projectId, milestoneIndex) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const target = (project.milestones || [])[milestoneIndex]
    if (!confirmDestructiveAction(target?.name || '里程碑')) return
    const milestones = (project.milestones || []).filter((_, index) => index !== milestoneIndex)
    updateProject(projectId, { milestones }, '刪除里程碑。')
  }

  function duplicateProject(project) {
    if (!project) return
    const next = normalizeProject({
      ...project,
      id: getNextProjectId(projects),
      name: `${project.name || '未命名專案'} 複本`,
      progress: 0,
      health: '待確認',
      records: [`${new Date().toLocaleString('zh-TW', { hour12: false })}｜由 ${project.id} 複製。`],
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
    if (!confirmDestructiveAction(target?.name || projectId || '專案')) return
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
      .filter((project) => projectPhaseFilter === '全部' || project.phase === projectPhaseFilter)
      .filter((project) => projectHealthFilter === '全部' || project.health === projectHealthFilter)
      .filter((project) => projectPriorityFilter === '全部' || project.priority === projectPriorityFilter || getProjectPriorityMeta(project).label === projectPriorityFilter)
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

  const projectPhaseOptions = useMemo(() => ['全部', ...Array.from(new Set([...PROJECT_PHASE_OPTIONS, ...projects.map((project) => project.phase)].filter(Boolean)))], [projects])
  const projectHealthOptions = useMemo(() => ['全部', ...Array.from(new Set([...PROJECT_HEALTH_OPTIONS, ...projects.map((project) => project.health)].filter(Boolean)))], [projects])
  const projectPriorityOptions = useMemo(() => ['全部', ...PROJECT_PRIORITY_OPTIONS], [])
  const selectedProject = normalizeProject(projects.find((project) => project.id === selectedId) || filteredProjects[0] || projects[0] || {})
  const hasSelectedProject = Boolean(selectedProject?.id)
  const avgProgress = Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / Math.max(projects.length, 1))
  const riskCount = projects.filter((project) => project.tone === 'red' || String(project.health || '').includes('待') || String(project.health || '').includes('卡') || String(project.health || '').includes('風險')).length
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
    updateProject(selectedProject.id, { progress: nextProgress }, `依 ${tasks.length} 個任務與子任務估算為 ${nextProgress}%。`)
  }

  function createWorkItemFromProjectTask(project, task) {
    if (!task || !onCreateWorkItem) return
    const dueDate = task.end || project.endDate || todayDate()
    onCreateWorkItem({
      title: `${project.name}｜${task.name}`,
      status: Number(task.progress || 0) >= 100 ? '已完成' : '待處理',
      priority: Number(task.progress || 0) >= 100 ? '低' : '中',
      dueDate,
      owner: task.owner || project.owner || 'Kyle',
      category: '專案',
      next: `追蹤 ${project.name} / ${task.name}`,
      relatedProject: project.id,
      channel: '專案管理',
      sourceType: 'project-task',
      sourceId: `${project.id}-${task.id || task.name}`,
    })
    updateProject(project.id, {}, `已由任務「${task.name}」建立跟進工作。`)
  }

  function exportProjectSummary() {
    const headers = ['編號', '專案', '階段', '負責人', '開始', '結束', '進度', '健康度', '下一步', '任務數', '子任務數', '里程碑數']
    const rows = filteredProjects.map((project) => [
      project.id, project.name, project.phase, project.owner, project.startDate, project.endDate, project.progress, project.health, project.next,
      (project.tasks || []).length, (project.tasks || []).reduce((sum, task) => sum + (task.subtasks || []).length, 0), (project.milestones || []).length,
    ])
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    downloadFlowdeskText(`FlowDesk專案摘要_${todayDate()}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8;')
  }

  function addManualProjectRecord() {
    if (!hasSelectedProject) return
    const text = manualRecordText.trim()
    if (!text) return
    updateProject(selectedProject.id, {}, text)
    setManualRecordText('')
  }

  function dateRangeLabel(start, end) {
    return `${formatMonthDayWeekday(start)} → ${formatMonthDayWeekday(end)}｜共 ${daysBetween(start, end) + 1} 天`
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
          <button type="button" onClick={closeGanttProgressEditor}>完成</button>
        </div>
        <div className="fd203-gantt-progress-pop-body">
          <input type="range" min="0" max="100" value={currentValue} onChange={(event) => applyGanttProgressValue(scope, projectId, taskIndex, subtaskIndex, event.target.value)} aria-label={`${label}進度`} />
          <div className="fd203-gantt-progress-inline">
            <input type="number" min="0" max="100" value={currentValue} onChange={(event) => applyGanttProgressValue(scope, projectId, taskIndex, subtaskIndex, event.target.value)} aria-label={`${label}進度百分比`} />
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
      const actionText = edge === 'move' ? '平移' : '調整'
      const scopeText = scope === 'project' ? '專案' : scope === 'subtask' ? '子任務' : '任務'
      finalizeProjectDependencySchedule(safeProject.id, `使用甘特圖${actionText}${scopeText}期程。`)
    }

    window.addEventListener('pointermove', applyMove)
    window.addEventListener('pointerup', stopMove, { once: true })
  }

  function getProjectListInfo(project = {}) {
    const today = todayDate()
    const flatItems = (project.tasks || []).flatMap((task, taskIndex) => {
      const taskLabel = task.name || `任務 ${taskIndex + 1}`
      const taskItem = {
        type: '任務',
        name: taskLabel,
        label: taskLabel,
        start: task.start || project.startDate,
        end: task.end || project.endDate,
        progress: clampPercent(task.progress),
        done: Boolean(task.done) || clampPercent(task.progress) >= 100,
      }
      const subItems = (task.subtasks || []).map((subtask, subIndex) => {
        const subLabel = subtask.name || `子任務 ${subIndex + 1}`
        return {
          type: '子任務',
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
    const itemRank = (item) => (item.type === '任務' ? 0 : 1)
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
      running: runningItem ? `${runningItem.type}：${runningItem.label}` : '尚未設定正在進行',
      next: nextItem
        ? `${nextItem.type}：${nextItem.label}`
        : manualNext && !manualLooksActive
          ? manualNext
          : '尚未設定下一步',
    }
  }


  function getProjectStatusMeta(project = {}) {
    const today = todayDate()
    const safeProject = normalizeProject(project)
    const progress = clampPercent(safeProject.progress)
    const listInfo = getProjectListInfo(safeProject)
    const taskItems = (safeProject.tasks || []).flatMap((task) => [
      { ...task, type: '任務', parentName: '' },
      ...((task.subtasks || []).map((subtask) => ({ ...subtask, type: '子任務', parentName: task.name || '未命名任務' }))),
    ])
    const openItems = taskItems.filter((item) => !(Boolean(item.done) || clampPercent(item.progress) >= 100))
    const overdueItems = openItems.filter((item) => (item.end || safeProject.endDate) < today)
    const startedZeroItems = openItems.filter((item) => (item.start || safeProject.startDate) <= today && clampPercent(item.progress) <= 0)
    const remainingDays = daysBetween(today, safeProject.endDate || today)
    const notices = []
    if (progress >= 100 || safeProject.phase === '已完成') notices.push({ label: '已完成', tone: 'done' })
    else {
      if ((safeProject.endDate || today) < today) notices.push({ label: '專案逾期', tone: 'danger' })
      else if (remainingDays <= 3) notices.push({ label: `${remainingDays} 天內到期`, tone: 'danger' })
      else if (remainingDays <= 7) notices.push({ label: `${remainingDays} 天後到期`, tone: 'warning' })
      if (overdueItems.length) notices.push({ label: `${overdueItems.length} 任務逾期`, tone: 'danger' })
      if (String(safeProject.health || '').includes('卡') || String(safeProject.health || '').includes('風險')) notices.push({ label: safeProject.health, tone: 'danger' })
      if (String(safeProject.health || '').includes('待')) notices.push({ label: safeProject.health, tone: 'warning' })
      if (listInfo.running === '尚未設定正在進行') notices.push({ label: '無進行中', tone: 'muted' })
      if (listInfo.next === '尚未設定下一步') notices.push({ label: '無下一步', tone: 'muted' })
      if (startedZeroItems.length) notices.push({ label: `${startedZeroItems.length} 項未啟動`, tone: 'warning' })
    }
    const fallback = progress >= 100 ? '專案已完成' : '正常推進'
    return {
      notices: notices.slice(0, 4),
      summary: notices.length ? notices.slice(0, 3).map((item) => item.label).join(' / ') : fallback,
      overdueItems,
      remainingDays,
    }
  }

  function buildProjectAttentionSummary(rows = filteredProjects) {
    const today = todayDate()
    const openRows = rows.map(normalizeProject).filter((project) => clampPercent(project.progress) < 100 && project.phase !== '已完成' && project.phase !== '已取消')
    const overdue = openRows.filter((project) => (project.endDate || today) < today)
    const dueSoon = openRows.filter((project) => (project.endDate || today) >= today && daysBetween(today, project.endDate || today) <= 7)
    const highPriority = openRows.filter((project) => getProjectPriorityMeta(project).score >= 62)
    const noNext = openRows.filter((project) => getProjectListInfo(project).next === '尚未設定下一步')
    const noRunning = openRows.filter((project) => getProjectListInfo(project).running === '尚未設定正在進行')
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
          title="點擊開啟專案彈窗；拖曳調整順序"
        >
          <div className="fd203-project-card-head">
            <span className="record-id">☰ {project.id}</span>
            <span className={`fd203-priority-chip ${priorityMeta.tone}`}>優先 {priorityMeta.label} · {priorityMeta.score}</span>
          </div>
          <div className="fd203-project-card-title">
            <strong>{project.name || '未命名專案'}</strong>
            <span className="fd203-project-title-badges"><Badge value={project.phase || '未分階段'} /><Badge value={project.health} /></span>
          </div>
          <div className="fd203-project-priority-reason"><span>優先依據</span><strong>{priorityMeta.reason}</strong></div>
          <div className="fd203-status-chip-row">{getProjectStatusMeta(project).notices.length ? getProjectStatusMeta(project).notices.map((notice) => <span key={notice.label} className={`fd203-status-chip ${notice.tone}`}>{notice.label}</span>) : <span className="fd203-status-chip done">正常推進</span>}</div>
          <div className="fd203-project-list-info compact-v21">
            <div className="running"><span>正在進行</span><strong>{listInfo.running}</strong></div>
            <div className="next"><span>下一步</span><strong>{listInfo.next}</strong></div>
          </div>
          <div className="fd203-project-card-kpis">
            <span><b>{project.tasks?.length || 0}</b><small>任務</small></span>
            <span><b>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0}</b><small>子任務</small></span>
            <span><b>{project.milestones?.filter((item) => item.done).length || 0}/{project.milestones?.length || 0}</b><small>里程碑</small></span>
          </div>
          <div className="fd203-project-card-meta">
            <span>{project.owner || '未指定'}</span>
            <span title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} → {formatMonthDayWeekday(project.endDate)}</span>
          </div>
          <div className="task-progress-row">
            <div className="flow-progress"><span style={{ width: `${project.progress}%` }} /></div>
            <strong>{project.progress}%</strong>
            <small>估 {estimated}%</small>
          </div>
          <div className="fd203-project-card-foot">
            <span className="fd203-card-date-pill" title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} → {formatMonthDayWeekday(project.endDate)}</span>
            <span className="fd203-card-open-pill">{projectListExpandAllGantt ? '甘特圖已展開' : '開啟專案'}</span>
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
          title="點擊開啟專案彈窗；拖曳調整順序"
        >
          <span className="fd203-row-main">
            <small>☰ {project.id}</small>
            <strong>{project.name || '未命名專案'}</strong>
            <em><b>正在進行</b>{listInfo.running}</em>
            <em><b>下一步</b>{listInfo.next}</em>
          </span>
          <span><strong>{project.owner || '未指定'}</strong><small title={dateRangeLabel(project.startDate, project.endDate)}>{formatMonthDayWeekday(project.startDate)} → {formatMonthDayWeekday(project.endDate)}</small></span>
          <span className="fd203-row-progress"><div className="flow-progress"><span style={{ width: `${project.progress}%` }} /></div><small>{project.progress}% / 估 {estimated}%</small></span>
          <span><strong>{project.tasks?.length || 0} 任務</strong><small>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0} 子任務</small></span>
          <span className="fd203-row-badges"><span className={`fd203-priority-chip ${priorityMeta.tone}`}>優先 {priorityMeta.label} · {priorityMeta.score}</span><Badge value={project.phase} /><Badge value={project.health} />{getProjectStatusMeta(project).notices.slice(0, 2).map((notice) => <span key={notice.label} className={`fd203-status-chip ${notice.tone}`}>{notice.label}</span>)}</span>
        </article>
        {projectListExpandAllGantt ? <div className="fd203-inline-gantt-shell fd203-inline-gantt-shell-row">{renderGantt(project, { embedded: true, compact: true })}</div> : null}
      </div>
    )
  }

  function renderGanttBar({ project, task, taskIndex = null, subtask, subtaskIndex = null, scope, start, end, displayStart, displayEnd, progress, label, className = '', tone = '', indent = false }) {
    const activePreview = ganttDragPreview?.projectId === project.id && ganttDragPreview?.scope === scope && ganttDragPreview?.taskIndex === taskIndex && ganttDragPreview?.subtaskIndex === subtaskIndex ? ganttDragPreview : null
    const activeEditor = ganttProgressEditor?.scope === scope && ganttProgressEditor?.projectId === project.id && ganttProgressEditor?.taskIndex === taskIndex && ganttProgressEditor?.subtaskIndex === subtaskIndex
    const done = scope === 'task' ? Boolean(task?.done) : scope === 'subtask' ? Boolean(subtask?.done) : false
    const title = `${label}｜${done ? '已完成' : '未完成'}｜${dateRangeLabel(start, end)}｜進度 ${progress}%`
    const startHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'start', event, subtaskIndex)
    const endHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'end', event, subtaskIndex)
    const moveHandler = (event) => startGanttDateDrag(project, scope, taskIndex, 'move', event, subtaskIndex)
    return (
      <span className={`fd203-gantt-bar ${className} ${tone} ${done ? 'done' : ''}`.trim()} style={ganttStyle(start, end, displayStart, displayEnd)} onPointerDown={moveHandler} title={title}>
        {activePreview ? <span className="fd203-gantt-drag-tip">{activePreview.label}</span> : null}
        {renderGanttProgressEditor(scope, project.id, taskIndex, subtaskIndex, progress, label)}
        <i className="gantt-resize-handle start" role="button" tabIndex={0} aria-label={`調整${label}開始日`} onPointerDown={startHandler} />
        <button type="button" className={`fd203-gantt-progress-trigger${activeEditor ? ' active' : ''}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openGanttProgressEditor(scope, project.id, taskIndex, subtaskIndex, progress, event)}>{progress}%</button>
        <i className="gantt-resize-handle end" role="button" tabIndex={0} aria-label={`調整${label}結束日`} onPointerDown={endHandler} />
      </span>
    )
  }

  function renderGantt(project, options = {}) {
    const { embedded = false, compact = false } = options
    if (!project?.id) return <div className="flow-empty-card">請先從專案列表開啟專案。</div>
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
            <small>{formatMonthDayWeekday(project.startDate)} → {formatMonthDayWeekday(project.endDate)} · 甘特圖依實際起迄顯示，最後一週會包含結束日；中間保留每日刻度{showToday ? ` · 今日：${formatMonthDayWeekday(todayValue)}` : ''}</small>
          </div>
          <div className="fd203-gantt-actions">
            {!compact && (
              <label>
                <span>專案進度 {project.progress}%</span>
                <input type="range" min="0" max="100" value={project.progress} onChange={(event) => updateProject(project.id, { progress: clampPercent(event.target.value) })} />
              </label>
            )}
            <button type="button" onClick={() => addProjectTask(project.id)}>新增任務</button>
            <button type="button" className={ganttShowSubtasks ? 'fd203-gantt-global-toggle open' : 'fd203-gantt-global-toggle closed'} onClick={toggleAllGanttSubtasks}>{ganttShowSubtasks ? '全部收合子任務' : '全部展開子任務'}</button>
          </div>
        </div>

        <div className="fd203-gantt-scroll">
          <div className="fd203-gantt-grid fd203-gantt-head" style={{ gridTemplateColumns: gridColumns }}>
            <span>項目</span>
            {weekTicks.map((tick) => (
              <span key={tick.key} className="fd203-week-head">
                <b>{formatWeekRange(tick.start, tick.end)}</b>
                <small>{tick.days} 天 · {formatWeekSpanLabel(tick.start, tick.end)}</small>
              </span>
            ))}
          </div>

          {showToday ? (
            <div className="fd203-gantt-grid fd203-gantt-floating-today" style={{ gridTemplateColumns: gridColumns }} aria-hidden="true">
              <span />
              <div className="fd203-gantt-floating-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                <i style={{ left: todayLeft }}>今天 {formatMonthDay(todayValue)}</i>
              </div>
            </div>
          ) : null}

          <div className="fd203-gantt-grid fd203-gantt-row" style={{ gridTemplateColumns: gridColumns }}>
            <div className="fd203-gantt-label" title={dateRangeLabel(project.startDate, project.endDate)}>
              <strong>專案總期程</strong>
              <small>{project.phase} · {project.progress}%</small>
            </div>
            <div className="fd203-gantt-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
              {showToday ? <span className="fd203-gantt-today-line subtle fd203-gantt-today-guide" style={{ left: todayLeft }} /> : null}
              {renderGanttBar({ project, scope: 'project', start: project.startDate, end: project.endDate, displayStart, displayEnd, progress: project.progress, label: '專案進度', className: 'project', tone: project.tone || 'blue' })}
              {(project.milestones || []).map((milestone, index) => (
                <i key={milestone.id || index} className={milestone.done ? 'milestone-dot done' : 'milestone-dot'} style={{ left: `${ganttPoint(milestone.date, displayStart, displayEnd)}%` }} title={`${milestone.name}｜${formatMonthDayWeekday(milestone.date)}`} />
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
                          title={subtasksOpen ? `收合 ${subtaskCount} 個子任務` : `展開 ${subtaskCount} 個子任務`}
                        >
                          {subtasksOpen ? '▾' : '▸'}
                        </button>
                      ) : (
                        <span className="fd203-subtask-chevron empty">•</span>
                      )}
                      <ChineseTextField commitOnBlur className="fd203-gantt-name-input" value={task.name || ''} onCommit={(value) => updateProjectTask(project.id, index, { name: value || '未命名任務' })} aria-label="甘特圖任務名稱" />
                      <span className={`fd203-gantt-status-chip ${taskStatus.tone}`}>{taskStatus.label}</span>
                      <label className={`fd203-gantt-done-check ${task.done ? 'checked' : ''}`} onClick={(event) => event.stopPropagation()} title={task.done ? '已完成，取消勾選可改回未完成' : '未完成，勾選後視為完成'}>
                        <input
                          type="checkbox"
                          checked={Boolean(task.done)}
                          onChange={(event) => updateProjectTask(project.id, index, { done: event.target.checked, progress: event.target.checked ? 100 : Math.min(progress, 99) }, event.target.checked ? '任務標記完成。' : '任務改為未完成。')}
                          aria-label="任務完成狀態"
                        />
                        <span>{task.done ? '完成' : '未完成'}</span>
                      </label>
                    </div>
                    <small title={dateRangeLabel(taskStart, taskEnd)}>{task.owner || '未指定'} · {progress}% · {formatMonthDay(taskStart)} → {formatMonthDay(taskEnd)}</small>
                    {dependencyMeta.hasDependency ? <div className={`fd203-task-dependency-note ${dependencyMeta.waiting ? 'waiting' : 'ready'}`}>{dependencyMeta.waiting ? '等待前置' : '前置完成'}：{dependencyMeta.predecessorName}，排定 {formatMonthDay(dependencyMeta.startAfter)}</div> : null}
                    <div className="fd203-gantt-row-actions compact-v16 fd203-gantt-row-actions-v29">
                      <button type="button" className="fd203-mini-link" onClick={() => addProjectSubtask(project.id, index)}>＋子任務</button>
                      {subtaskCount ? <button type="button" className="fd203-mini-link soft" onClick={() => autoEstimateProjectTask(project.id, index)}>自動%</button> : null}
                      {subtaskCount ? <span className={`fd203-subtask-count-pill ${subtasksOpen ? 'open' : 'closed'}`}>{subtasksOpen ? '已展開' : '已收合'} {subtaskCount}</span> : <span className="fd203-mini-muted">0 子任務</span>}
                      <button type="button" className="fd203-mini-link danger ghost-danger" onClick={() => removeProjectTask(project.id, index)}>刪除</button>
                    </div>
                  </div>
                  <div className="fd203-gantt-track soft" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                    {showToday ? <span className="fd203-gantt-today-line subtle" style={{ left: todayLeft }} /> : null}
                    {renderGanttBar({ project, task, taskIndex: index, scope: 'task', start: taskStart, end: taskEnd, displayStart, displayEnd, progress, label: task.name || '任務進度', className: 'task' })}
                  </div>
                </div>
                {!subtasksOpen && subtaskCount > 0 ? (
                  <div className="fd203-gantt-grid fd203-gantt-row subtask-collapsed-note" style={{ gridTemplateColumns: gridColumns }}>
                    <div className="fd203-gantt-label subtask-collapsed-note-label">
                      <span>已收合 {subtaskCount} 個子任務</span>
                      <button type="button" className="fd203-mini-link" onClick={() => toggleGanttTaskSubtasks(project, task, index)}>展開</button>
                    </div>
                    <div className="fd203-gantt-track subtask-collapsed-note-track" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                      <span>子任務目前隱藏，點左側展開查看明細</span>
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
                          <ChineseTextField commitOnBlur className="fd203-gantt-name-input subtask" value={subtask.name || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { name: value || '未命名子任務' })} aria-label="甘特圖子任務名稱" />
                          <span className={`fd203-gantt-status-chip subtask ${subtaskStatus.tone}`}>{subtaskStatus.label}</span>
                          <label className={`fd203-gantt-done-check subtask ${subtask.done ? 'checked' : ''}`} onClick={(event) => event.stopPropagation()} title={subtask.done ? '已完成，取消勾選可改回未完成' : '未完成，勾選後視為完成'}>
                            <input
                              type="checkbox"
                              checked={Boolean(subtask.done)}
                              onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { done: event.target.checked, progress: event.target.checked ? 100 : Math.min(subProgress, 99) }, event.target.checked ? '子任務標記完成。' : '子任務改為未完成。')}
                              aria-label="子任務完成狀態"
                            />
                            <span>{subtask.done ? '完成' : '未完成'}</span>
                          </label>
                        </div>
                        <small title={dateRangeLabel(subStart, subEnd)}>{subtask.owner || task.owner || '未指定'} · {subProgress}% · {formatMonthDay(subStart)} → {formatMonthDay(subEnd)}</small>
                        <div className="fd203-gantt-row-actions compact-v16">
                          <button type="button" className="fd203-mini-link danger" onClick={() => removeProjectSubtask(project.id, index, subIndex)}>刪除</button>
                        </div>
                      </div>
                      <div className="fd203-gantt-track subtask" style={{ gridColumn: `2 / span ${weekTicks.length}`, '--fd203-week-width': `${weekCellWidth}px` }}>
                        {showToday ? <span className="fd203-gantt-today-line subtle" style={{ left: todayLeft }} /> : null}
                        {renderGanttBar({ project, task, taskIndex: index, subtask, subtaskIndex: subIndex, scope: 'subtask', start: subStart, end: subEnd, displayStart, displayEnd, progress: subProgress, label: subtask.name || '子任務進度', className: 'subtask' })}
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
            <span>{project.id} · {project.phase} · {formatMonthDayWeekday(project.startDate)} → {formatMonthDayWeekday(project.endDate)}</span>
          </div>
          <div className="fd203-workspace-actions">
            <button type="button" onClick={() => duplicateProject(project)}>複製</button>
            <button className="danger" type="button" onClick={() => deleteProject(project.id)}>刪除</button>
            <button type="button" onClick={closeProjectModal}>關閉</button>
          </div>
        </div>

        <div className="fd203-modal-summary-bar">
          <span className={`fd203-priority-chip ${priorityMeta.tone}`}>優先 {priorityMeta.label} · {priorityMeta.score}</span>
          <span>健康度：{project.health || '待確認'}</span>
          <span>進度：{project.progress}%</span>
          <span>逾期任務：{getProjectStatusMeta(project).overdueItems.length}</span>
          <span>下一步：{getProjectListInfo(project).next}</span>
        </div>

        <div className="project-segmented-tabs fd203-tabs">
          <button type="button" className={detailTab === 'overview' ? 'active' : ''} onClick={() => setDetailTab('overview')}>總覽</button>
          <button type="button" className={detailTab === 'gantt' ? 'active' : ''} onClick={() => setDetailTab('gantt')}>甘特圖</button>
          <button type="button" className={detailTab === 'tasks' ? 'active' : ''} onClick={() => setDetailTab('tasks')}>任務</button>
          <button type="button" className={detailTab === 'milestones' ? 'active' : ''} onClick={() => setDetailTab('milestones')}>里程碑</button>
          <button type="button" className={detailTab === 'records' ? 'active' : ''} onClick={() => setDetailTab('records')}>紀錄</button>
        </div>

        {detailTab === 'overview' && (
          <div className="fd203-overview-panel">
            <section className="fd203-profile-card">
              <div className="detail-hero-line"><span className="record-id">{project.id}</span><span className={`fd203-priority-chip ${priorityMeta.tone}`}>優先 {priorityMeta.label} · {priorityMeta.score}</span><Badge value={project.health} /></div>
              <h3>{project.name}</h3>
              <p>{project.next || '尚未設定下一步'}</p>
              <div className="flow-progress big"><span style={{ width: `${project.progress}%` }} /></div>
              <div className="project-focus-kpis fd203-kpis">
                <article><span>階段</span><strong>{project.phase}</strong></article>
                <article><span>建議優先</span><strong>{priorityMeta.label}</strong></article>
                <article><span>負責人</span><strong>{project.owner}</strong></article>
                <article><span>期間</span><strong>{daysBetween(project.startDate, project.endDate) + 1} 天</strong></article>
                <article><span>任務</span><strong>{project.tasks?.length || 0}</strong></article>
                <article><span>子任務</span><strong>{project.tasks?.reduce((sum, task) => sum + (task.subtasks || []).length, 0) || 0}</strong></article>
                <article><span>里程碑</span><strong>{doneMilestones}/{project.milestones?.length || 0}</strong></article>
                <article><span>估算進度</span><strong>{estimateProjectProgress(project)}%</strong></article>
              </div>
              <div className="project-focus-actions fd203-action-row">
                <button type="button" onClick={autoEstimateSelectedProject}>估算進度</button>
                <button type="button" onClick={() => addProjectTask(project.id)}>新增任務</button>
                <button type="button" onClick={() => addProjectMilestone(project.id)}>新增里程碑</button>
              </div>
            </section>

            <section className="fd203-editor-card">
              <div className="project-section-head compact"><div><p className="eyebrow">PROJECT PROFILE</p><h3>基本資料</h3></div></div>
              <div className="project-editor-grid fd203-editor-grid">
                <label>專案名稱<ChineseTextField commitOnBlur value={project.name} onCommit={(value) => updateProject(project.id, { name: value || '未命名專案' })} /></label>
                <label>階段<select value={project.phase || '規劃中'} onChange={(event) => updateProject(project.id, { phase: event.target.value }, '更新專案階段。')}>{mergeOptionList(PROJECT_PHASE_OPTIONS, project.phase).map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></label>
                <label>專案優先<select value={project.priority || '中'} onChange={(event) => updateProject(project.id, { priority: event.target.value }, `更新專案優先為 ${event.target.value}。`)}>{mergeOptionList(PROJECT_PRIORITY_OPTIONS, project.priority).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
                <label>負責人<ChineseTextField commitOnBlur value={project.owner} onCommit={(value) => updateProject(project.id, { owner: value || '未指定' })} /></label>
                <label>健康度<select value={project.health || '待確認'} onChange={(event) => updateProject(project.id, { health: event.target.value }, '更新健康度。')}>{mergeOptionList(PROJECT_HEALTH_OPTIONS, project.health).map((health) => <option key={health} value={health}>{health}</option>)}</select></label>
                <label>開始<input title={dateRangeLabel(project.startDate, project.endDate)} type="date" value={project.startDate} onChange={(event) => updateProject(project.id, { startDate: minIsoDate(event.target.value, project.endDate) }, '更新開始日期。')} /></label>
                <label>結束<input title={dateRangeLabel(project.startDate, project.endDate)} type="date" value={project.endDate} onChange={(event) => updateProject(project.id, { endDate: maxIsoDate(event.target.value, project.startDate) }, '更新結束日期。')} /></label>
                <label>進度 %<input type="range" min="0" max="100" value={project.progress} onChange={(event) => updateProject(project.id, { progress: clampPercent(event.target.value) })} /><small>{project.progress}%</small></label>
                <label className="wide-field">下一步<ChineseTextField commitOnBlur multiline value={project.next} onCommit={(value) => updateProject(project.id, { next: value })} /></label>
              </div>
            </section>

            <section className="detail-block">
              <p className="eyebrow">關聯工作</p>
              <div className="related-task-list">
                {selectedRelatedTasks.length ? selectedRelatedTasks.map((task) => <article key={task.id}><strong>{task.title}</strong><span>{task.status} · {task.next}</span></article>) : <p>目前沒有關聯工作。</p>}
              </div>
            </section>
          </div>
        )}

        {detailTab === 'gantt' && renderGantt(project)}

        {detailTab === 'tasks' && (
          <section className="detail-block project-task-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">專案任務 / 甘特項目 / 子任務</p><button type="button" onClick={() => addProjectTask(project.id)}>新增任務</button></div>
            <div className="project-detail-card-list fd203-task-list">
              {project.tasks.map((task, index) => {
                const taskStart = task.start || project.startDate
                const taskEnd = task.end || project.endDate
                return (
                  <div key={task.id || index} className="project-detail-card fd203-detail-card">
                    <div className="project-detail-card-head"><strong>{task.name || '未命名任務'}</strong><span title={dateRangeLabel(taskStart, taskEnd)}>{clampPercent(task.progress)}%</span></div>
                    {getTaskDependencyMeta(project, task, index).hasDependency ? <div className={`fd203-task-dependency-note detail ${getTaskDependencyMeta(project, task, index).waiting ? 'waiting' : 'ready'}`}>{getTaskDependencyMeta(project, task, index).waiting ? '等待前置任務' : '前置任務已完成'}：{getTaskDependencyMeta(project, task, index).predecessorName}，自動排定 {formatMonthDayWeekday(getTaskDependencyMeta(project, task, index).startAfter)}</div> : null}
                    <div className="project-detail-form-grid">
                      <label>任務名稱<ChineseTextField commitOnBlur value={task.name || ''} onCommit={(value) => updateProjectTask(project.id, index, { name: value || '未命名任務' })} aria-label="任務名稱" /></label>
                      <label>負責人<ChineseTextField commitOnBlur value={task.owner || ''} onCommit={(value) => updateProjectTask(project.id, index, { owner: value })} aria-label="負責人" /></label>
                      <label>開始日<input title={dateRangeLabel(taskStart, taskEnd)} type="date" value={taskStart} onChange={(event) => updateProjectTask(project.id, index, { start: event.target.value }, '更新任務開始日。')} aria-label="開始日" /></label>
                      <label>結束日<input title={dateRangeLabel(taskStart, taskEnd)} type="date" value={taskEnd} onChange={(event) => updateProjectTask(project.id, index, { end: event.target.value }, '更新任務結束日。')} aria-label="結束日" /></label>
                      <label>前置任務<select value={task.dependsOnTaskId || ''} onChange={(event) => {
                        const predecessorName = project.tasks.find((item) => item.id === event.target.value)?.name || ''
                        updateProjectTask(project.id, index, { dependsOnTaskId: event.target.value }, event.target.value ? `設定前置任務為「${predecessorName}」。` : '清除前置任務。')
                      }} aria-label="前置任務"><option value="">無前置任務</option>{getAvailablePredecessorTasks(project, index).map((item) => <option key={item.id} value={item.id}>{item.name || '未命名任務'}</option>)}</select><small>前置日期變更時，會自動緊接前置完成日後一天</small></label>
                      <label>完成日<input type="date" value={task.completedAt || ''} disabled={!task.done} onChange={(event) => updateProjectTask(project.id, index, { completedAt: event.target.value || todayDate(), done: true, progress: 100 }, '更新任務完成日。')} aria-label="完成日" /><small>{task.done ? '可調整實際完成日' : '任務完成後啟用'}</small></label>
                      <label>進度<input type="range" min="0" max="100" value={clampPercent(task.progress)} onChange={(event) => updateProjectTask(project.id, index, { progress: clampPercent(event.target.value) })} aria-label="進度" /><small>{task.manualProgress ? '手動%' : '自動%'}</small></label>
                    </div>
                    <div className="project-detail-card-actions">
                      <button type="button" onClick={() => createWorkItemFromProjectTask(project, task)}>建立工作事項</button>
                      <button type="button" onClick={() => addProjectSubtask(project.id, index)}>新增子任務</button>
                      <button type="button" onClick={() => autoEstimateProjectTask(project.id, index)} disabled={!(task.subtasks || []).length}>依子任務估%</button>
                      <button type="button" onClick={() => updateProjectTask(project.id, index, { done: true, progress: 100 }, '任務視為完成。')}>視為完成</button>
                      <button type="button" onClick={() => removeProjectTask(project.id, index)}>刪除</button>
                    </div>
                    <div className="fd203-subtask-list">
                      {(task.subtasks || []).map((subtask, subIndex) => {
                        const subStart = subtask.start || taskStart
                        const subEnd = subtask.end || taskEnd
                        return (
                          <div key={subtask.id || subIndex} className="fd203-subtask-editor">
                            <div className="project-detail-card-head"><strong>↳ {subtask.name || '未命名子任務'}</strong><span title={dateRangeLabel(subStart, subEnd)}>{clampPercent(subtask.progress)}%</span></div>
                            <div className="project-detail-form-grid compact-3">
                              <label>子任務名稱<ChineseTextField commitOnBlur value={subtask.name || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { name: value || '未命名子任務' })} aria-label="子任務名稱" /></label>
                              <label>負責人<ChineseTextField commitOnBlur value={subtask.owner || ''} onCommit={(value) => updateProjectSubtask(project.id, index, subIndex, { owner: value })} aria-label="子任務負責人" /></label>
                              <label>開始日<input title={dateRangeLabel(subStart, subEnd)} type="date" value={subStart} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { start: event.target.value }, '更新子任務開始日。')} /></label>
                              <label>結束日<input title={dateRangeLabel(subStart, subEnd)} type="date" value={subEnd} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { end: event.target.value }, '更新子任務結束日。')} /></label>
                              <label>進度<input type="range" min="0" max="100" value={clampPercent(subtask.progress)} onChange={(event) => updateProjectSubtask(project.id, index, subIndex, { progress: clampPercent(event.target.value) })} /></label>
                            </div>
                            <div className="project-detail-card-actions"><button type="button" onClick={() => removeProjectSubtask(project.id, index, subIndex)}>刪除子任務</button></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {!project.tasks?.length && <div className="flow-empty-card">目前沒有專案任務。</div>}
            </div>
          </section>
        )}

        {detailTab === 'milestones' && (
          <section className="detail-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">里程碑</p><button type="button" onClick={() => addProjectMilestone(project.id)}>新增里程碑</button></div>
            <div className="project-detail-card-list milestone-list-layout fd203-task-list">
              {project.milestones.map((milestone, index) => (
                <div key={milestone.id || index} className={milestone.done ? 'project-detail-card fd203-detail-card done' : 'project-detail-card fd203-detail-card'}>
                  <div className="project-detail-card-head"><strong>{milestone.name || '未命名里程碑'}</strong><span>{milestone.done ? '已完成' : '進行中'}</span></div>
                  <div className="project-detail-form-grid compact-3">
                    <label>里程碑名稱<ChineseTextField commitOnBlur value={milestone.name || ''} onCommit={(value) => updateProjectMilestone(project.id, index, { name: value || '未命名里程碑' })} aria-label="里程碑名稱" /></label>
                    <label>日期<input type="date" value={milestone.date || project.endDate} onChange={(event) => updateProjectMilestone(project.id, index, { date: event.target.value }, '更新里程碑日期。')} aria-label="里程碑日期" /></label>
                    <label className="milestone-check"><span>完成狀態</span><input type="checkbox" checked={Boolean(milestone.done)} onChange={(event) => updateProjectMilestone(project.id, index, { done: event.target.checked }, event.target.checked ? '里程碑標記完成。' : '里程碑改為進行中。')} /></label>
                  </div>
                  <div className="project-detail-card-actions"><button type="button" onClick={() => removeProjectMilestone(project.id, index)}>刪除</button></div>
                </div>
              ))}
              {!project.milestones?.length && <div className="flow-empty-card">目前沒有里程碑。</div>}
            </div>
          </section>
        )}

        {detailTab === 'records' && (
          <section className="detail-block fd203-tab-panel">
            <div className="detail-block-headline"><p className="eyebrow">處理紀錄</p></div>
            <div className="fd203-record-input">
              <ChineseTextField multiline value={manualRecordText} onCommit={setManualRecordText} placeholder="新增一筆專案紀錄..." />
              <button type="button" onClick={addManualProjectRecord} disabled={!manualRecordText.trim()}>新增紀錄</button>
            </div>
            <div className="timeline-notes flow-timeline-notes">
              {project.records.length ? project.records.map((record, index) => <div key={`${record}-${index}`}><span>{index + 1}</span><p>{record}</p></div>) : <div className="flow-empty-card">目前沒有處理紀錄。</div>}
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
          <h2>專案管理</h2>
          <span>專案列表負責搜尋、篩選與排序；點擊專案後以彈窗開啟完整工作區。</span>
        </div>
        <div className="flow-toolbar-actions">
          <span className="toolbar-soft-chip">平均進度 {avgProgress}%</span>
          <button className="ghost-btn" type="button" onClick={exportProjectSummary}>匯出摘要</button>
          <button className="ghost-btn" type="button" onClick={autoEstimateSelectedProject} disabled={!hasSelectedProject || !selectedProject.tasks?.length}>依任務估進度</button>
          <button className="primary-btn" type="button" onClick={createProject}>新增專案</button>
        </div>
      </section>

      <section className="project-overview-strip fd203-overview-strip">
        <article><span>專案數</span><strong>{projects.length}</strong></article>
        <article><span>需注意</span><strong>{riskCount}</strong></article>
        <article><span>逾期專案</span><strong>{overdueProjects}</strong></article>
        <article><span>高優先</span><strong>{highPriorityProjects}</strong></article>
        <article><span>最近開啟</span><strong>{hasSelectedProject ? selectedProject.name : '—'}</strong></article>
        <article><span>同步狀態</span><strong>{flowdeskCloud ? (projectsCloudReady ? '雲端模式' : '同步中') : '本機備援'}</strong></article>
      </section>

      <section className="fd203-attention-panel">
        <div>
          <p className="eyebrow">TODAY FOCUS</p>
          <h3>今日需要注意</h3>
          <span>依目前篩選結果判斷逾期、即將到期、優先與資料缺口。</span>
        </div>
        <div className="fd203-attention-grid">
          <article className={attentionSummary.overdue.length ? 'danger' : ''}><span>逾期專案</span><strong>{attentionSummary.overdue.length}</strong><small>{attentionSummary.overdue.length ? attentionSummary.overdue.slice(0, 2).map((item) => item.name).join('、') : '目前沒有逾期專案'}</small></article>
          <article className={attentionSummary.dueSoon.length ? 'warning' : ''}><span>7 天內到期</span><strong>{attentionSummary.dueSoon.length}</strong><small>{attentionSummary.dueSoon.length ? attentionSummary.dueSoon.slice(0, 2).map((item) => item.name).join('、') : '短期到期壓力正常'}</small></article>
          <article className={attentionSummary.highPriority.length ? 'danger' : ''}><span>高優先</span><strong>{attentionSummary.highPriority.length}</strong><small>{attentionSummary.highPriority.length ? '建議優先查看' : '目前沒有高優先警示'}</small></article>
          <article className={attentionSummary.noNext.length ? 'warning' : ''}><span>未設定下一步</span><strong>{attentionSummary.noNext.length}</strong><small>{attentionSummary.noRunning.length} 個沒有進行中項目</small></article>
          <article className={attentionSummary.overdueTasks ? 'danger' : ''}><span>任務逾期</span><strong>{attentionSummary.overdueTasks}</strong><small>{attentionSummary.overdueTasks ? '請至甘特圖確認' : '任務期程正常'}</small></article>
        </div>
      </section>

      <section className="fd203-filter-bar">
        <ChineseTextField value={projectKeyword} onCommit={setProjectKeyword} placeholder="搜尋專案、任務、子任務、里程碑..." />
        <select value={projectPhaseFilter} onChange={(event) => setProjectPhaseFilter(event.target.value)}>{projectPhaseOptions.map((phase) => <option key={phase} value={phase}>{phase === '全部' ? '全部階段' : phase}</option>)}</select>
        <select value={projectHealthFilter} onChange={(event) => setProjectHealthFilter(event.target.value)}>{projectHealthOptions.map((health) => <option key={health} value={health}>{health === '全部' ? '全部健康度' : health}</option>)}</select>
        <select value={projectPriorityFilter} onChange={(event) => setProjectPriorityFilter(event.target.value)}>{projectPriorityOptions.map((priority) => <option key={priority} value={priority}>{priority === '全部' ? '全部優先' : `優先 ${priority}`}</option>)}</select>
        <select value={projectSortMode} onChange={(event) => setProjectSortMode(event.target.value)} aria-label="排序方式">{PROJECT_SORT_OPTIONS.map((mode) => <option key={mode} value={mode}>排序：{mode}</option>)}</select>
        <select value={projectPageSize} onChange={(event) => setProjectPageSize(Number(event.target.value))} aria-label="每頁筆數">
          {[10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)}
        </select>
        <div className="project-view-toggle" aria-label="專案檢視切換">
          <button type="button" className={projectViewMode === 'cards' ? 'active' : ''} onClick={() => setProjectViewMode('cards')}>卡片</button>
          <button type="button" className={projectViewMode === 'list' ? 'active' : ''} onClick={() => setProjectViewMode('list')}>清單</button>
        </div>
      </section>

      <section className="fd203-main-layout modal-mode">
        <aside className="fd203-project-list-pane full">
          <div className="fd203-pane-head fd203-pane-head-stack">
            <div>
              <p className="eyebrow">PROJECT LIST</p>
              <h3>專案列表</h3>
            </div>
            <div className="fd203-pane-actions">
              <small>{filteredProjects.length} 筆 · 可拖曳排序 · 點擊開啟彈窗</small>
              <button type="button" className={projectListExpandAllGantt ? 'ghost-btn active' : 'ghost-btn'} onClick={() => setProjectListExpandAllGantt((value) => !value)}>
                {projectListExpandAllGantt ? '收合全部甘特圖' : '展開全部甘特圖'}
              </button>
            </div>
          </div>

          {!projects.length && <div className="flow-empty-card"><strong>目前沒有專案</strong><span>可先新增一筆專案開始建立時程。</span></div>}

          {projectViewMode === 'cards' ? (
            <div className={projectListExpandAllGantt ? 'fd203-project-card-list expanded-gantt' : 'fd203-project-card-list'}>
              {paginatedProjects.map(renderProjectCard)}
            </div>
          ) : (
            <div className="fd203-project-table">
              <div className="fd203-project-table-head"><span>專案 / 正在進行 / 下一步</span><span>負責 / 期間</span><span>進度</span><span>數量</span><span>狀態</span></div>
              {paginatedProjects.map(renderProjectListRow)}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="project-pagination-bar fd203-pagination">
              <div>
                <strong>{filteredProjects.length}</strong> 筆 · 第 {safeProjectPage} / {projectPageTotal} 頁 · {projectSortMode}
                <span>{projectPageStart + 1} - {Math.min(projectPageStart + paginatedProjects.length, filteredProjects.length)}</span>
              </div>
              <div className="project-pagination-actions">
                <label className="fd203-page-jump"><span>跳至</span><input type="number" min="1" max={projectPageTotal} value={projectPageInput} onChange={(event) => setProjectPageInput(event.target.value)} onBlur={() => commitProjectPageInput()} onKeyDown={(event) => { if (event.key === 'Enter') commitProjectPageInput(event.currentTarget.value) }} aria-label="指定頁碼" /><small>/ {projectPageTotal}</small></label>
                <button type="button" onClick={() => setProjectPage(1)} disabled={safeProjectPage <= 1}>首頁</button>
                <button type="button" onClick={() => setProjectPage((page) => Math.max(1, page - 1))} disabled={safeProjectPage <= 1}>上一頁</button>
                <button type="button" onClick={() => setProjectPage((page) => Math.min(projectPageTotal, page + 1))} disabled={safeProjectPage >= projectPageTotal}>下一頁</button>
                <button type="button" onClick={() => setProjectPage(projectPageTotal)} disabled={safeProjectPage >= projectPageTotal}>末頁</button>
              </div>
            </div>
          )}
        </aside>
      </section>

      {projectModalOpen && hasSelectedProject && (
        <div className="fd203-project-modal-backdrop" role="dialog" aria-modal="true" aria-label="專案工作區" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProjectModal() }}>
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
  const weekdayMap = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  return `${weekdayMap[startDate.getDay()]} ～ ${weekdayMap[endDate.getDay()]}`
}

function formatMonthDayWeekday(value) {
  const date = parseDate(value)
  const weekdayMap = ['日', '一', '二', '三', '四', '五', '六']
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}(${weekdayMap[date.getDay()]})`
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
          <p className="eyebrow">自動化規則</p>
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
  const [reportScope, setReportScope] = useState('本月')
  const [reportTab, setReportTab] = useState('總覽')
  const [reportSearch, setReportSearch] = useState('')
  const [cloudStatus, setCloudStatus] = useState(flowdeskCloud ? '同步中' : '本機資料')
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
      setCloudStatus('本機資料')
      return
    }
    setCloudStatus('同步中')
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
      setCloudStatus('雲端已同步')
    } catch {
      setReportData(localData)
      setCloudStatus('使用本機備援')
    }
  }

  useEffect(() => {
    reloadReportData()
  }, [])

  const keyword = reportSearch.trim().toLowerCase()
  const workRows = reportData.workItems.map((row) => ({ ...row, __source: '工作事項', __date: row.due || row.createdAt || todayDate() }))
  const taskRows = reportData.tasks.map((row) => ({ ...row, __source: '任務追蹤', __date: row.due || todayDate() }))
  const allTaskRows = [...workRows, ...taskRows]
  const scopedPurchases = reportData.purchases.filter((row) => isReportInScope(row.requestDate || row.orderDate || row.arrivalDate, reportScope)).filter((row) => matchReportKeyword(row, keyword))
  const scopedTasks = allTaskRows.filter((row) => isReportInScope(row.__date, reportScope)).filter((row) => matchReportKeyword(row, keyword))
  const scopedProjects = reportData.projects.filter((row) => isReportInScope(row.startDate || row.endDate, reportScope) || reportScope === '全部').filter((row) => matchReportKeyword(row, keyword))
  const scopedReminders = reportData.reminders.filter((row) => isReportInScope(row.dueDate, reportScope)).filter((row) => matchReportKeyword(row, keyword))

  const purchaseTotal = scopedPurchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0)
  const purchaseOpen = scopedPurchases.filter((row) => !['已完成', '已取消'].includes(row.status)).length
  const taskOpen = scopedTasks.filter((row) => !['已完成', '已收斂'].includes(row.lane || row.status)).length
  const taskWaiting = scopedTasks.filter((row) => ['等待回覆', '等回覆', '卡關'].includes(row.lane || row.status)).length
  const projectRisk = scopedProjects.filter((row) => String(row.health || row.tone || '').includes('待') || row.tone === 'red').length
  const reminderSummary = getReminderSummary(reportData.reminders)
  const reportRiskTotal = taskWaiting + projectRisk + reminderSummary.overdue + scopedPurchases.filter((row) => (row.arrivalStatus || '未到貨') !== '已到貨' && !['已完成', '已取消'].includes(row.status || '')).length
  const reportEfficiencyScore = Math.max(0, Math.min(100, 100 - taskWaiting * 6 - projectRisk * 8 - reminderSummary.overdue * 9 - purchaseOpen * 2))
  const reportDecisionCards = [
    { label: '管理分數', value: reportEfficiencyScore, note: reportRiskTotal ? `${reportRiskTotal} 個重點訊號` : '狀態穩定' },
    { label: '採購待處理率', value: scopedPurchases.length ? `${Math.round((purchaseOpen / scopedPurchases.length) * 100)}%` : '0%', note: `${purchaseOpen} / ${scopedPurchases.length} 筆` },
    { label: '任務卡關率', value: scopedTasks.length ? `${Math.round((taskWaiting / scopedTasks.length) * 100)}%` : '0%', note: `${taskWaiting} / ${scopedTasks.length} 筆` },
    { label: '提醒逾期', value: reminderSummary.overdue, note: `${reminderSummary.open} 筆未結提醒` },
  ]
  const vendorRanking = buildVendorRanking(scopedPurchases).slice(0, 6)
  const purchaseStatusRows = buildCountRows(scopedPurchases, (row) => row.status || '未設定').slice(0, 6)
  const taskStatusRows = buildCountRows(scopedTasks, (row) => row.lane || row.status || '未設定').slice(0, 6)
  const upcomingReminders = [...reportData.reminders]
    .filter((row) => row.status !== '已完成')
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 5)

  const focusRows = [
    ...scopedPurchases
      .filter((row) => !['已完成', '已取消'].includes(row.status) || (row.paymentStatus || '未付款') !== '已付款' || (row.arrivalStatus || '未到貨') !== '已到貨')
      .map((row) => ({ type: '採購', title: purchaseTitle(row), meta: `${row.vendor || '未指定廠商'} · ${row.status || '未設定'} · ${formatMoney(calculatePurchase(row).taxedTotal)}`, weight: calculatePurchase(row).taxedTotal + 3000 })),
    ...scopedTasks
      .filter((row) => ['緊急', '高'].includes(row.priority) || ['等待回覆', '等回覆', '卡關'].includes(row.lane || row.status))
      .map((row) => ({ type: row.__source || '任務', title: row.title || row.id, meta: `${row.owner || '未指定'} · ${row.lane || row.status || '未設定'} · ${row.due || row.__date || '未設定日期'}`, weight: ['緊急', '高'].includes(row.priority) ? 9000 : 4500 })),
    ...scopedProjects
      .filter((row) => String(row.health || '').includes('待') || row.tone === 'red')
      .map((row) => ({ type: '專案', title: row.name || row.id, meta: `${row.phase || '未設定'} · ${row.owner || '未指定'} · ${row.progress || 0}%`, weight: 6000 })),
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
          <h2>報表分析</h2>
          <span>整合工作、任務、採購、專案與提醒資料，快速看出目前要追的重點。</span>
        </div>
        <div className="flow-toolbar-actions report-toolbar-actions">
          <span className="toolbar-soft-chip">{cloudStatus}</span>
          <label className="report-scope-select">期間<select value={reportScope} onChange={(event) => setReportScope(event.target.value)}>{['本週', '本月', '本季', '全部'].map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
          <button className="ghost-btn" type="button" onClick={reloadReportData}>重新整理</button>
          <button className="ghost-btn" type="button" onClick={exportExecutiveSnapshot}>匯出快照</button>
          <button className="primary-btn" type="button" onClick={exportCurrentReport}>匯出目前報表</button>
        </div>
      </section>

      <section className="metric-strip full report-kpi-strip">
        <Metric label="採購總額" value={formatMoney(purchaseTotal)} tone="green" />
        <Metric label="未完成採購" value={purchaseOpen} tone="amber" />
        <Metric label="未完成工作" value={taskOpen} tone="blue" />
        <Metric label="等待 / 卡關" value={taskWaiting} tone="red" />
        <Metric label="專案風險" value={projectRisk} tone="violet" />
      </section>

      <section className="panel wide report-decision-panel">
        <PanelTitle eyebrow="DECISION VIEW" title="管理決策摘要" action={reportScope} />
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
          <PanelTitle eyebrow="處理焦點" title="下一步優先序" />
          <div className="report-focus-list">
            {focusRows.length ? focusRows.map((row, index) => (
              <article key={`${row.type}-${row.title}-${index}`}>
                <span>{index + 1}</span>
                <div><strong>{row.title}</strong><small>{row.type} · {row.meta}</small></div>
              </article>
            )) : <p>目前沒有需要特別追蹤的項目。</p>}
          </div>
        </article>

        <article className="panel report-side-card">
          <PanelTitle eyebrow="提醒" title="到期摘要" />
          <div className="reminder-home-grid compact-reminder-grid">
            <article className="danger"><span>逾期</span><strong>{reminderSummary.overdue}</strong></article>
            <article><span>今日</span><strong>{reminderSummary.today}</strong></article>
            <article><span>本週</span><strong>{reminderSummary.week}</strong></article>
            <article><span>未結</span><strong>{reminderSummary.open}</strong></article>
          </div>
        </article>
      </section>

      <section className="panel wide report-table-panel">
        <div className="report-table-head">
          <div>
            <p className="eyebrow">資料報表</p>
            <h3>{reportTab}</h3>
          </div>
          <div className="report-table-tools">
            <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="搜尋報表內容..." />
            <div className="report-tab-switcher">
              {['總覽', '採購', '任務', '專案', '提醒'].map((tab) => <button key={tab} type="button" className={reportTab === tab ? 'active' : ''} onClick={() => setReportTab(tab)}>{tab}</button>)}
            </div>
          </div>
        </div>
        <div className="report-table-scroll">
          <table className="report-table-v1981">
            <thead><tr>{reportRows.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {reportRows.rows.map((row, index) => <tr key={`${reportTab}-${index}`}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}
              {!reportRows.rows.length && <tr><td colSpan={reportRows.headers.length}>目前沒有符合條件的資料。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-grid-v1981 report-lower-grid">
        <article className="panel">
          <PanelTitle eyebrow="廠商" title="採購金額排行" />
          <div className="report-rank-list">
            {vendorRanking.length ? vendorRanking.map((row) => <article key={row.vendor}><div><strong>{row.vendor}</strong><span>{row.count} 筆</span></div><b>{formatMoney(row.amount)}</b></article>) : <p>尚無廠商採購資料。</p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="狀態" title="採購分布" />
          <div className="report-status-list">
            {purchaseStatusRows.length ? purchaseStatusRows.map((row) => <article key={row.label}><span>{row.label}</span><strong>{row.count}</strong></article>) : <p>尚無採購狀態資料。</p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="任務" title="工作狀態分布" />
          <div className="report-status-list">
            {taskStatusRows.length ? taskStatusRows.map((row) => <article key={row.label}><span>{row.label}</span><strong>{row.count}</strong></article>) : <p>尚無任務資料。</p>}
          </div>
        </article>
        <article className="panel">
          <PanelTitle eyebrow="到期" title="近期提醒" />
          <div className="report-mini-list">
            {upcomingReminders.length ? upcomingReminders.map((row) => <article key={row.id}><strong>{row.title}</strong><span>{row.dueDate || '未設定日期'} · {row.status}</span></article>) : <p>尚無未結提醒。</p>}
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
  if (scope === '全部') return true
  const date = toDateOnly(value)
  if (!date) return scope === '全部'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  if (scope === '本週') start.setDate(today.getDate() - today.getDay())
  if (scope === '本月') start.setDate(1)
  if (scope === '本季') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
  }
  start.setHours(0, 0, 0, 0)
  return date >= start && date <= today
}

function buildVendorRanking(purchases = []) {
  return Array.from(purchases.reduce((map, row) => {
    const vendor = row.vendor || '未指定廠商'
    const current = map.get(vendor) || { vendor, amount: 0, count: 0 }
    current.amount += calculatePurchase(row).taxedTotal
    current.count += 1
    map.set(vendor, current)
    return map
  }, new Map()).values()).sort((a, b) => b.amount - a.amount)
}

function buildCountRows(rows = [], getter) {
  return Array.from(rows.reduce((map, row) => {
    const label = getter(row) || '未設定'
    map.set(label, (map.get(label) || 0) + 1)
    return map
  }, new Map()).entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function buildReportTableRows(tab, data) {
  if (tab === '採購') {
    const rows = data.purchases.map((row) => {
      const amount = calculatePurchase(row).taxedTotal
      return {
        csv: { 編號: row.id, 採購內容: purchaseTitle(row), 廠商: row.vendor || '', 狀態: row.status || '', 金額: amount, 付款: row.paymentStatus || '未付款', 到貨: row.arrivalStatus || '未到貨', 驗收: row.acceptanceStatus || '未驗收' },
        cells: [row.id, purchaseTitle(row), row.vendor || '未指定', row.status || '未設定', formatMoney(amount), row.paymentStatus || '未付款', row.arrivalStatus || '未到貨'],
      }
    })
    return { headers: ['編號', '採購內容', '廠商', '狀態', '金額', '付款', '到貨'], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '任務') {
    const rows = data.tasks.map((row) => ({
      csv: { 編號: row.id, 標題: row.title || '', 來源: row.__source || row.source || '', 狀態: row.lane || row.status || '', 優先級: row.priority || '', 負責人: row.owner || '', 到期日: row.due || row.__date || '' },
      cells: [row.id, row.title || '未命名', row.__source || row.source || '工作', row.lane || row.status || '未設定', row.priority || '未設定', row.owner || '未指定', row.due || row.__date || '未設定'],
    }))
    return { headers: ['編號', '標題', '來源', '狀態', '優先級', '負責人', '到期日'], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '專案') {
    const rows = data.projects.map((row) => ({
      csv: { 編號: row.id, 專案: row.name || '', 階段: row.phase || '', 負責人: row.owner || '', 進度: row.progress || 0, 健康度: row.health || '', 結束日: row.endDate || '' },
      cells: [row.id, row.name || '未命名專案', row.phase || '未設定', row.owner || '未指定', `${row.progress || 0}%`, row.health || '未設定', row.endDate || '未設定'],
    }))
    return { headers: ['編號', '專案', '階段', '負責人', '進度', '健康度', '結束日'], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  if (tab === '提醒') {
    const rows = data.reminders.map((row) => ({
      csv: { 編號: row.id, 提醒: row.title || '', 類型: row.type || '', 狀態: row.status || '', 優先級: row.priority || '', 到期日: row.dueDate || '' },
      cells: [row.id, row.title || '未命名提醒', row.type || '一般', row.status || '未設定', row.priority || '未設定', row.dueDate || '未設定'],
    }))
    return { headers: ['編號', '提醒', '類型', '狀態', '優先級', '到期日'], rows: rows.map((row) => row.cells), csv: rows.map((row) => row.csv) }
  }
  const summary = [
    { 項目: '採購筆數', 數值: data.purchases.length, 備註: '目前篩選期間內的採購紀錄' },
    { 項目: '採購總額', 數值: data.purchases.reduce((sum, row) => sum + calculatePurchase(row).taxedTotal, 0), 備註: '含稅金額加總' },
    { 項目: '任務筆數', 數值: data.tasks.length, 備註: '工作事項與任務追蹤合併' },
    { 項目: '專案筆數', 數值: data.projects.length, 備註: '目前篩選期間內的專案' },
    { 項目: '提醒筆數', 數值: data.reminders.length, 備註: '目前篩選期間內的提醒' },
  ]
  return { headers: ['項目', '數值', '備註'], rows: summary.map((row) => [row.項目, typeof row.數值 === 'number' && row.項目.includes('總額') ? formatMoney(row.數值) : row.數值, row.備註]), csv: summary }
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
    if (due.days === 1) summary.tomorrow += 1
    if (due.days >= 0 && due.days <= 7) summary.week += 1
    return summary
  }, { open: 0, overdue: 0, today: 0, tomorrow: 0, week: 0 })
}

function createEmptyReminder() {
  const today = new Date()
  today.setDate(today.getDate() + 3)
  const dueDate = today.toISOString().slice(0, 10)
  return { title: '', type: '追蹤提醒', priority: '中', status: '待處理', dueDate, sourceType: '一般', sourceTitle: '', note: '' }
}

function RemindersPage({ reminders, setReminders, onNavigateSource }) {
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
  const reminderGroups = [
    { id: 'overdue', title: '逾期', rows: filtered.filter((item) => item.status !== '已完成' && getReminderDueInfo(item.dueDate).days < 0) },
    { id: 'today', title: '今日', rows: filtered.filter((item) => item.status !== '已完成' && getReminderDueInfo(item.dueDate).days === 0) },
    { id: 'tomorrow', title: '明日', rows: filtered.filter((item) => item.status !== '已完成' && getReminderDueInfo(item.dueDate).days === 1) },
    { id: 'week', title: '本週', rows: filtered.filter((item) => item.status !== '已完成' && getReminderDueInfo(item.dueDate).days > 1 && getReminderDueInfo(item.dueDate).days <= 7) },
    { id: 'later', title: '之後', rows: filtered.filter((item) => item.status !== '已完成' && getReminderDueInfo(item.dueDate).days > 7) },
    { id: 'done', title: '已完成', rows: filtered.filter((item) => item.status === '已完成') },
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
    updateReminder(id, { status: '延後', dueDate: addDaysDate(days) })
  }

  function completeAllOverdue() {
    setReminders((current) => current.map((item) => getReminderDueInfo(item.dueDate).days < 0 ? { ...item, status: '已完成' } : item))
  }

  function removeReminder(id) {
    const target = reminders.find((item) => item.id === id)
    if (!confirmDestructiveAction(target?.title || id || '提醒')) return
    setReminders((current) => current.filter((item) => item.id !== id))
  }

  function resetDemoReminders() {
    if (!confirmResetAction('確定要清空並重置提醒資料？')) return
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
          <button className="ghost-btn" type="button" onClick={resetDemoReminders}>清空提醒資料</button>
          <button className="primary-btn" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? '收合新增' : '新增提醒'}</button>
        </div>
      </section>

      <section className="metric-strip reminder-metric-strip reminder-metric-strip-v20">
        <Metric label="逾期" value={summary.overdue} tone="red" />
        <Metric label="今日" value={summary.today} tone="amber" />
        <Metric label="明日" value={summary.tomorrow} tone="blue" />
        <Metric label="本週" value={summary.week} tone="violet" />
        <Metric label="未結" value={summary.open} tone="green" />
      </section>

      {showForm && (
        <section className="panel wide reminder-form-panel">
          <PanelTitle eyebrow="新增提醒" title="建立追蹤事項" />
          <ModuleBoundaryNote moduleId="reminders" compact />
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
        <div className="reminder-bulk-actions">
          <button type="button" onClick={() => { setStatusFilter('全部'); setTypeFilter('全部'); setKeyword('') }}>全部提醒</button>
          <button type="button" onClick={completeAllOverdue} disabled={!summary.overdue}>逾期全部完成</button>
        </div>
        <div className="reminder-card-list reminder-grouped-list">
          {reminderGroups.length ? reminderGroups.map((group) => (
            <section className="reminder-date-group" key={group.id}>
              <div className="reminder-date-head"><strong>{group.title}</strong><span>{group.rows.length} 筆</span></div>
              {group.rows.map((item) => {
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
                      <button type="button" onClick={() => deferReminder(item.id, 1)}>明天</button>
                      <button type="button" onClick={() => deferReminder(item.id, 7)}>下週</button>
                      {item.sourceType !== '一般' && <button type="button" onClick={() => onNavigateSource?.(item)}>開啟關聯</button>}
                      <button className="danger" type="button" onClick={() => removeReminder(item.id)}>刪除</button>
                    </div>
                  </article>
                )
              })}
            </section>
          )) : <div className="purchase-empty-state">沒有符合條件的提醒事項</div>}
        </div>
      </section>
    </div>
  )
}

function SettingsPage({ themeOptions, uiTheme, setUiTheme, appearanceMode, setAppearanceMode, motionLevel, setMotionLevel, customTheme, setCustomTheme, iconStyleMode, setIconStyleMode, resolvedIconStyle, modules, collections, setCollections, moduleIcons, setModuleIcons, baseTableIcons, setBaseTableIcons, setReminders }) {
  const [settingsView, setSettingsView] = useState('home')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [restorePreview, setRestorePreview] = useState(null)
  const restoreInputRef = useRef(null)
  const activeTheme = themeOptions.find((theme) => theme.id === uiTheme) || themeOptions[0]
  const activeAppearanceMode = appearanceModeOptions.find((mode) => mode.id === appearanceMode) || appearanceModeOptions[0]
  const activeMotionLevel = motionLevelOptions.find((level) => level.id === motionLevel) || motionLevelOptions[1]
  const activeAppearancePreset = appearancePresetOptions.find((preset) => preset.theme === uiTheme && preset.appearance === appearanceMode && preset.motion === motionLevel)
  const activeIconStyle = iconStyleOptions.find((style) => style.id === resolvedIconStyle) || iconStyleOptions[1]
  const selectedIconStyle = iconStyleOptions.find((style) => style.id === iconStyleMode) || iconStyleOptions[0]
  const sortedCollections = [...collections].sort((a, b) => (a.order || 0) - (b.order || 0))
  const [newCollectionName, setNewCollectionName] = useState('')
  const backupWorkspaceKeys = [
    { key: 'work_items', label: '工作事項' },
    { key: 'reminders', label: '提醒中心' },
    { key: 'collections', label: '資料集合' },
    { key: 'purchases', label: '採購資料' },
    { key: 'purchase_history', label: '採購歷程' },
    { key: 'purchase_stages', label: '採購流程' },
    { key: 'projects', label: '專案管理' },
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
    link.download = `FlowDesk備份_${todayDate()}.json`
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
      setBackupMessage('備份已匯出')
    } catch {
      setBackupMessage('備份失敗，請稍後再試')
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
      setBackupMessage('已讀取備份檔，請確認後再還原')
    } catch {
      setBackupMessage('還原失敗，請確認檔案格式')
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
      setBackupMessage('還原完成，重新整理後生效')
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      setBackupMessage('還原失敗，已保留目前資料')
      setBackupBusy(false)
    }
  }

  async function clearWorkspaceModule(dataKey) {
    const target = backupWorkspaceKeys.find((item) => item.key === dataKey)
    if (!target) return
    if (!window.confirm(`確定要清空「${target.label}」？此動作只會清空該模組資料。`)) return
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
      setBackupMessage(`${target.label} 已清空，重新整理後生效`)
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      setBackupMessage('清空模組資料失敗')
      setBackupBusy(false)
    }
  }

  async function clearWorkspaceData() {
    if (!window.confirm('確定要清空 FlowDesk 工作資料？此動作會保留登入設定。')) return
    setBackupBusy(true)
    try {
      backupLocalKeys.filter((key) => !key.includes('theme') && !key.includes('icon') && !key.includes('module-order')).forEach((key) => window.localStorage.removeItem(key))
      if (flowdeskCloud) {
        for (const item of backupWorkspaceKeys) await flowdeskCloud.setWorkspaceData(item.key, [])
      }
      setBackupMessage('資料已清空，重新整理後生效')
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      setBackupMessage('清空資料失敗')
      setBackupBusy(false)
    }
  }

  function resetPurchaseDemo() {
    if (!confirmResetAction('確定要清空採購資料？採購紀錄、歷程與流程設定會被移除。')) return
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
    if (!confirmResetAction('確定要恢復預設圖示？目前自訂圖示會被覆蓋。')) return
    setModuleIcons(defaultModuleIcons)
    setBaseTableIcons(defaultBaseTableIcons)
    setIconStyleMode('auto')
    window.localStorage.removeItem('flowdesk-module-icons')
    window.localStorage.removeItem('flowdesk-base-table-icons')
    window.localStorage.removeItem('flowdesk-icon-style-mode')
  }

  function updateCustomThemeColor(key, value) {
    setCustomTheme((current) => ({
      ...current,
      [key]: normalizeHexColor(value, defaultCustomTheme[key] || '#2563eb'),
    }))
  }

  function applyCustomTheme() {
    setUiTheme('custom')
  }

  function resetCustomTheme() {
    setCustomTheme(defaultCustomTheme)
    setUiTheme('custom')
    if (typeof window !== 'undefined') window.localStorage.removeItem('flowdesk-custom-theme')
  }

  function applyAppearancePreset(preset) {
    if (!preset) return
    setUiTheme(preset.theme)
    setAppearanceMode(preset.appearance)
    setMotionLevel(preset.motion)
  }

  function protectCurrentCustomTheme() {
    const protectedTheme = protectThemeContrast(customTheme)
    setCustomTheme(protectedTheme)
    setUiTheme('custom')
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
    if (!confirmDestructiveAction(target?.name || '資料集合')) return
    setCollections((current) => current.filter((item) => item.id !== collectionId))
    setBaseTableIcons((current) => {
      const next = { ...current }
      delete next[collectionId]
      return next
    })
  }

  function resetCollections() {
    if (!confirmResetAction('確定要恢復預設資料集合？目前自訂集合會被覆蓋。')) return
    setCollections(baseTables.map((item) => ({ ...item })))
    setBaseTableIcons(defaultBaseTableIcons)
    window.localStorage.removeItem('flowdesk-collections-v194')
    window.localStorage.removeItem('flowdesk-base-table-icons')
  }

  function resetReminderDemo() {
    if (!confirmResetAction('確定要清空提醒資料？此動作會清除提醒中心資料。')) return
    setReminders([])
    window.localStorage.removeItem('flowdesk-reminders-v193')
    if (flowdeskCloud) flowdeskCloud.setWorkspaceData('reminders', []).catch(() => null)
  }

  const settingCards = [
    { id: 'appearance', title: '外觀設定', eyebrow: 'UI THEME', summary: `目前方案：${activeAppearancePreset?.name || '自訂組合'} · ${activeTheme.name}`, icon: '🎨' },
    { id: 'purchase', title: '採購設定', eyebrow: 'PURCHASE', summary: '採購資料與流程維護', icon: '🧾' },
    { id: 'collections', title: '資料集合設定', eyebrow: 'COLLECTIONS', summary: `${collections.filter((item) => item.visible !== false).length} 個顯示中，管理集合入口、視圖與外觀`, icon: '📚' },
    { id: 'sidebar', title: '側邊欄設定', eyebrow: 'LAYOUT', summary: '模組順序與側邊欄排序', icon: '🧭' },
    { id: 'icons', title: '圖示設定', eyebrow: 'ICONS', summary: `目前風格：${iconStyleMode === 'auto' ? '跟隨 UI 主題' : activeIconStyle.name}`, icon: '✨' },
    { id: 'reminders', title: '提醒設定', eyebrow: 'REMINDERS', summary: '提醒類型、狀態與資料整理', icon: '🔔' },
    { id: 'data', title: '資料備份', eyebrow: 'BACKUP', summary: '匯出、還原、清空與同步檢查', icon: '💾' },
    { id: 'focus', title: '功能定位', eyebrow: 'FLOWDESK', summary: '收斂重複功能、釐清各模組用途與交接規則', icon: '🧭' },
    { id: 'system', title: '系統資訊', eyebrow: 'VERSION', summary: FLOWDESK_VERSION_LABEL, icon: '⚙️' },
  ]
  const v20Checklist = [
    ['功能收斂', '工作事項、採購、專案、提醒中心用途重新劃分，避免互相重複'],
    ['採購管理', '多品項、稅額總額、PO/報價、預算差異、提醒、歷程與清單選取穩定化'],
    ['專案管理', '甘特圖、里程碑完成、建立工作事項、進度估算、摘要匯出'],
    ['提醒中心', '逾期、今日、明日、本週分組，支援延後與關聯開啟'],
    ['設定備份', '匯入預覽、還原前自動備份、分模組清空、同步狀態'],
    ['操作一致化', '工具列、空狀態、右側明細、搜尋篩選與匯出入口收斂'],
  ]
  const syncStatusText = flowdeskCloud ? '雲端資料同步已啟用' : '目前使用本機備援資料'
  const lastSyncText = typeof window !== 'undefined' ? (window.localStorage.getItem('flowdesk-last-cloud-sync') || '尚未完成同步') : '—'

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
        <section className="panel wide settings-panel fd30-appearance-panel fd31-vivid-appearance-panel">
          <PanelTitle eyebrow="外觀設定" title="主題視覺套組" />
          <p className="settings-note">切換後會立即套用到主要按鈕、標籤、分頁、進度條、卡片重點色、輸入框 focus 色與甘特圖任務條。v20.3.43 加入外觀設定快速導覽、動效安全提醒與手機版收斂補強，外觀功能更多但操作更不亂。</p>
          <div className="fd40-appearance-nav">
            <a href="#fd40-presets">推薦方案</a>
            <a href="#fd40-mode">外觀 / 動效</a>
            <a href="#fd40-preview">主題預覽</a>
            <a href="#fd40-custom">我的主題</a>
            <a href="#fd40-themes">主題色</a>
          </div>
          <div className="fd30-theme-toolbar fd31-theme-toolbar">
            <div>
              <span>目前套用</span>
              <strong>{activeTheme.name}</strong>
              <small>{activeTheme.description}</small>
            </div>
            <div className="fd31-theme-toolbar-preview" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <button className="ghost-btn fd30-reset-theme-btn" type="button" onClick={() => setUiTheme('blue')}>回復預設藍</button>
          </div>
          <div className="fd38-preset-panel" id="fd40-presets">
            <div className="fd38-preset-head">
              <div>
                <span>一鍵外觀方案</span>
                <strong>{activeAppearancePreset?.name || '自訂組合'}</strong>
                <small>快速切換日常、夜間、展示、提醒與低干擾模式，不用逐一調整主題、外觀與動效。</small>
              </div>
              <em>{activeTheme.name} · {activeAppearanceMode.name} · {activeMotionLevel.name}</em>
            </div>
            <div className="fd38-preset-grid">
              {appearancePresetOptions.map((preset) => (
                <button
                  key={preset.id}
                  className={activeAppearancePreset?.id === preset.id ? 'fd38-preset-card active' : 'fd38-preset-card'}
                  type="button"
                  onClick={() => applyAppearancePreset(preset)}
                >
                  <span>{preset.badge}</span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="fd34-appearance-controls" id="fd40-mode">
            <div className="fd34-control-card">
              <div>
                <span>外觀模式</span>
                <strong>{activeAppearanceMode.name}</strong>
                <small>{activeAppearanceMode.description}</small>
              </div>
              <div className="fd34-segmented">
                {appearanceModeOptions.map((mode) => (
                  <button
                    key={mode.id}
                    className={appearanceMode === mode.id ? 'active' : ''}
                    type="button"
                    onClick={() => setAppearanceMode(mode.id)}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="fd34-control-card">
              <div>
                <span>動效強度</span>
                <strong>{activeMotionLevel.name}</strong>
                <small>{activeMotionLevel.description}</small>
              </div>
              <div className="fd34-segmented">
                {motionLevelOptions.map((level) => (
                  <button
                    key={level.id}
                    className={motionLevel === level.id ? 'active' : ''}
                    type="button"
                    onClick={() => setMotionLevel(level.id)}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="fd40-motion-advice">
            <div>
              <span>動效安全建議</span>
              <strong>{motionLevel === 'holo' ? '全息極光適合展示，日常可改用標準' : motionLevel === 'off' ? '已關閉動效，適合低干擾操作' : '目前動效設定適合日常使用'}</strong>
              <small>手機與低效能裝置會自動降低大型背景特效；需要投影或長時間操作時，可切到低干擾方案。</small>
            </div>
            <button className="ghost-btn" type="button" onClick={() => setMotionLevel('standard')}>切回標準動效</button>
          </div>
          <div className="fd35-theme-preview-panel" id="fd40-preview">
            <div className="fd35-preview-header">
              <div>
                <span>主題預覽</span>
                <strong>{activeTheme.name} · {activeAppearanceMode.name}</strong>
                <small>先看按鈕、標籤、進度、卡片與甘特條的套用效果。</small>
              </div>
              <em>{activeMotionLevel.name}</em>
            </div>
            <div className="fd35-preview-grid">
              <div className="fd35-preview-card fd35-preview-card-main">
                <span>按鈕與標籤</span>
                <button className="fd35-preview-button" type="button">主要操作</button>
                <div className="fd35-preview-tags">
                  <b>進行中</b>
                  <b>高優先</b>
                  <b>今日</b>
                </div>
              </div>
              <div className="fd35-preview-card">
                <span>進度條</span>
                <div className="fd35-preview-progress">
                  <i style={{ width: '68%' }} />
                </div>
                <small>專案進度 68%</small>
              </div>
              <div className="fd35-preview-card">
                <span>甘特圖</span>
                <div className="fd35-preview-gantt">
                  <i className="doing" />
                  <i className="late" />
                  <i className="done" />
                </div>
                <small>進行中 / 逾期 / 已完成</small>
              </div>
              <div className="fd35-preview-card fd35-preview-card-glow">
                <span>卡片 Highlight</span>
                <strong>今日重點</strong>
                <small>主題色會套用到首頁、模組入口與重要卡片。</small>
              </div>
            </div>
          </div>
          <div className="fd36-custom-theme-builder" id="fd40-custom">
            <div className="fd36-builder-head">
              <div>
                <span>自訂主題色</span>
                <strong>建立我的 FlowDesk 色彩</strong>
                <small>調整三個核心色後，可立即套用成「我的主題」。</small>
              </div>
              <div className="fd36-builder-actions">
                <button className="ghost-btn" type="button" onClick={protectCurrentCustomTheme}>自動提高對比</button>
                <button className="ghost-btn" type="button" onClick={resetCustomTheme}>恢復預設自訂色</button>
                <button className="primary-btn" type="button" onClick={applyCustomTheme}>套用我的主題</button>
              </div>
            </div>
            <div className="fd36-color-grid">
              <label className="fd36-color-field">
                <span>主色</span>
                <input type="color" value={customTheme.primary} onChange={(event) => updateCustomThemeColor('primary', event.target.value)} />
                <b>{customTheme.primary}</b>
              </label>
              <label className="fd36-color-field">
                <span>輔助色</span>
                <input type="color" value={customTheme.secondary} onChange={(event) => updateCustomThemeColor('secondary', event.target.value)} />
                <b>{customTheme.secondary}</b>
              </label>
              <label className="fd36-color-field">
                <span>強調色</span>
                <input type="color" value={customTheme.accent} onChange={(event) => updateCustomThemeColor('accent', event.target.value)} />
                <b>{customTheme.accent}</b>
              </label>
            </div>
          </div>
          <div className="theme-grid packaged-theme-grid fd30-theme-grid fd31-theme-grid" id="fd40-themes">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                className={uiTheme === theme.id ? 'theme-option active fd31-theme-option' : 'theme-option fd31-theme-option'}
                type="button"
                onClick={() => setUiTheme(theme.id)}
                style={{ '--theme-preview-color': theme.accent, '--theme-preview-secondary': theme.secondary || theme.accent }}
              >
                <span className={`theme-swatch ${theme.id}`}>
                  <i />
                  <b />
                </span>
                <span className="fd31-theme-vibe">{theme.vibe || '主題套用'}</span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
                <em>立即套用</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsView === 'purchase' && (
        <section className="panel settings-panel settings-detail-panel">
          <PanelTitle eyebrow="採購設定" title="採購資料" />
          <p className="settings-note">採購是獨立資料應用，保留多品項、搜尋篩選、分頁、右側明細、單筆刪除保護與採購流程設定。</p>
          <button className="ghost-btn" type="button" onClick={resetPurchaseDemo}>清空採購資料</button>
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
          <p className="settings-note">提醒中心目前支援一般提醒、追蹤提醒、廠商回覆、簽核、到貨與續約提醒。</p>
          <div className="settings-info-list">
            <div><span>提醒類型</span><strong>{reminderTypeOptions.length} 種</strong></div>
            <div><span>提醒狀態</span><strong>{reminderStatusOptions.join(' / ')}</strong></div>
            <div><span>首頁摘要</span><strong>逾期 / 今日 / 明日 / 本週 / 未結</strong></div>
          </div>
          <button className="ghost-btn" type="button" onClick={resetReminderDemo}>清空提醒資料</button>
        </section>
      )}

      {settingsView === 'data' && (
        <section className="panel wide settings-panel settings-detail-panel data-backup-panel">
          <PanelTitle eyebrow="資料備份" title="備份與還原" />
          <div className="backup-sync-strip">
            <article><span>同步狀態</span><strong>{syncStatusText}</strong></article>
            <article><span>最後同步</span><strong>{lastSyncText}</strong></article>
            <article><span>備份版本</span><strong>{FLOWDESK_VERSION_LABEL}</strong></article>
          </div>
          <div className="backup-action-grid">
            <article>
              <span>匯出資料</span>
              <strong>下載 JSON 備份</strong>
              <button className="primary-btn" type="button" onClick={exportWorkspaceBackup} disabled={backupBusy}>{backupBusy ? '處理中...' : '匯出備份'}</button>
            </article>
            <article>
              <span>還原資料</span>
              <strong>從備份檔還原</strong>
              <button className="ghost-btn" type="button" onClick={() => restoreInputRef.current?.click()} disabled={backupBusy}>選擇備份檔</button>
              <input ref={restoreInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={restoreWorkspaceBackup} />
            </article>
            <article className="danger">
              <span>清空資料</span>
              <strong>保留登入設定</strong>
              <button className="danger" type="button" onClick={clearWorkspaceData} disabled={backupBusy}>清空工作資料</button>
            </article>
          </div>
          {restorePreview && (
            <section className="restore-preview-card">
              <div><span>待還原檔案</span><strong>{restorePreview.fileName}</strong></div>
              <div><span>本機資料項</span><strong>{restorePreview.localCount}</strong></div>
              <div><span>雲端資料項</span><strong>{restorePreview.cloudKeys.length}</strong></div>
              <div className="restore-preview-actions">
                <button className="primary-btn" type="button" onClick={confirmRestorePreview} disabled={backupBusy}>確認還原</button>
                <button className="ghost-btn" type="button" onClick={() => setRestorePreview(null)} disabled={backupBusy}>取消</button>
              </div>
            </section>
          )}
          <div className="settings-info-list backup-key-list backup-key-list-v1991">
            {backupWorkspaceKeys.map((item) => <div key={item.key}><span>{item.label}</span><strong>{item.key}</strong><button type="button" onClick={() => clearWorkspaceModule(item.key)} disabled={backupBusy}>清空此模組</button></div>)}
          </div>
          {backupMessage && <div className="backup-message">{backupMessage}</div>}
        </section>
      )}

      {settingsView === 'focus' && (
        <section className="panel wide settings-panel settings-detail-panel focus-definition-panel">
          <PanelTitle eyebrow="功能定位" title="FlowDesk v20.1.0 收斂原則" />
          <FlowDeskBoundaryMap />
          <p className="settings-note">這版先把容易重複的入口重新定位：提醒只提醒、看板只做待辦、採購保留主流程、專案保留長期計畫。</p>
          <div className="focus-definition-grid">
            {Object.entries(modulePurposeMap).filter(([key]) => ['board', 'base', 'roadmap', 'reminders', 'insight'].includes(key)).map(([key, item]) => (
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
          <PanelTitle eyebrow="系統資訊" title={FLOWDESK_VERSION_LABEL} />
          <div className="settings-info-list">
            <div><span>版本狀態</span><strong>{FLOWDESK_VERSION_LABEL} 功能收斂版</strong></div>
            <div><span>雲端同步</span><strong>{flowdeskCloud ? '已啟用' : '本機模式'}</strong></div>
            <div><span>Supabase 設定</span><strong>{hasSupabaseConfig ? '已設定' : '未設定'}</strong></div>
            <div><span>最後同步時間</span><strong>{lastSyncText}</strong></div>
            <div><span>最後檢查</span><strong>{new Date().toLocaleString('zh-TW', { hour12: false })}</strong></div>
            <div><span>目前主題</span><strong>{activeTheme.name}</strong></div>
            <div><span>圖示風格</span><strong>{iconStyleMode === 'auto' ? `跟隨 UI 主題（${activeIconStyle.name}）` : activeIconStyle.name}</strong></div>
            <div><span>提醒中心</span><strong>只做時間提醒</strong></div>
            <div><span>採購資料</span><strong>保留採購主流程</strong></div>
            <div><span>資料集合</span><strong>改為輔助紀錄入口</strong></div>
          </div>
          <div className="flowdesk-v20-checklist">
            {v20Checklist.map(([title, detail]) => (
              <article key={title}>
                <span>已補齊</span>
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
            aria-label={`設定 ${title} 圖示為 ${icon}`}
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
      lane: selected.lane || '待分類',
      priority: selected.priority || '中',
      type: selected.type || '一般工作',
      owner: selected.owner || '',
      requester: selected.requester || '',
      due: selected.due || '',
      health: Number.isFinite(Number(selected.health)) ? Number(selected.health) : 100,
      relation: selected.relation || '',
      channel: selected.channel || '',
      note: selected.note || '',
      tagsText: Array.isArray(selected.tags) ? selected.tags.join('、') : '',
    })
  }, [selected])

  if (!selected || !draft) {
    return (
      <div className="context-inner context-empty">
        <p className="eyebrow">詳細預覽</p>
        <h2>未選取工作</h2>
        <p>工作事項目前沒有可預覽的項目。</p>
      </div>
    )
  }

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const saveDraft = () => {
    onUpdateItem?.(selected.id, {
      ...draft,
      title: draft.title.trim() || '未命名工作',
      health: Math.max(0, Math.min(100, Number(draft.health) || 0)),
      tags: draft.tagsText.split(/[、,，\n]/).map((tag) => tag.trim()).filter(Boolean),
    })
  }

  return (
    <div className="context-inner editable-context-panel">
      <p className="eyebrow">詳細預覽</p>
      <h2>{selected.title}</h2>
      <div className="context-meta">
        <Badge value={selected.lane} />
        <Badge value={selected.priority} />
        <span>{selected.id}</span>
      </div>

      <div className="work-edit-form">
        <label className="work-edit-wide"><span>標題</span><input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
        <label><span>狀態</span><select value={draft.lane} onChange={(event) => updateDraft('lane', event.target.value)}>{lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.title}</option>)}</select></label>
        <label><span>優先級</span><select value={draft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>{['緊急', '高', '中', '低'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>類型</span><input value={draft.type} onChange={(event) => updateDraft('type', event.target.value)} /></label>
        <label><span>負責人</span><input value={draft.owner} onChange={(event) => updateDraft('owner', event.target.value)} /></label>
        <label><span>提出人</span><input value={draft.requester} onChange={(event) => updateDraft('requester', event.target.value)} /></label>
        <label><span>到期日</span><input type="date" value={draft.due} onChange={(event) => updateDraft('due', event.target.value)} /></label>
        <label><span>健康度</span><input type="number" min="0" max="100" value={draft.health} onChange={(event) => updateDraft('health', event.target.value)} /></label>
        <label><span>來源</span><input value={draft.channel} onChange={(event) => updateDraft('channel', event.target.value)} /></label>
        <label className="work-edit-wide"><span>關聯資訊</span><input value={draft.relation} onChange={(event) => updateDraft('relation', event.target.value)} /></label>
        <label className="work-edit-wide"><span>標籤</span><input value={draft.tagsText} onChange={(event) => updateDraft('tagsText', event.target.value)} placeholder="以頓號或逗號分隔" /></label>
        <label className="work-edit-wide"><span>處理備註</span><textarea value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} rows={4} /></label>
      </div>

      <div className="context-quick-lanes">
        {lanes.map((lane) => <button key={lane.id} type="button" className={draft.lane === lane.id ? 'active' : ''} onClick={() => updateDraft('lane', lane.id)}>{lane.title}</button>)}
      </div>

      <div className="context-action-row">
        <button className="primary-btn" type="button" onClick={saveDraft}>儲存</button>
        <button type="button" onClick={() => onDuplicateItem?.(selected.id)}>複製</button>
        <button className="danger" type="button" onClick={() => onDeleteItem?.(selected.id)}>刪除</button>
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
          {['新增工作事項', '新增採購', '新增專案', '新增提醒', '新增備忘'].map((title) => <button type="button" key={title}><strong>{title}</strong></button>)}
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
    taxMode: initial?.taxMode || '未稅',
    taxRate: initial?.taxRate ?? 5,
    quoteAmount: initial?.quoteAmount || 0,
    budgetAmount: initial?.budgetAmount || 0,
    quoteNo: initial?.quoteNo || '',
    poNo: initial?.poNo || '',
    invoiceNo: initial?.invoiceNo || '',
    paymentDueDate: initial?.paymentDueDate || '',
    arrivalDueDate: initial?.arrivalDueDate || '',
    acceptanceDate: initial?.acceptanceDate || '',
    status: initial?.status || stages?.[0]?.name || '需求確認',
    paymentStatus: initial?.paymentStatus || '未付款',
    arrivalStatus: initial?.arrivalStatus || '未到貨',
    acceptanceStatus: initial?.acceptanceStatus || '未驗收',
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
    const target = form.items.find((item) => item.id === itemId)
    if (!confirmDestructiveAction(target?.name || '品項')) return
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
            <label>流程狀態<select value={form.status} onChange={(event) => update('status', event.target.value)}>{(stages || initialPurchaseStages).map((stage) => <option key={stage.id} value={stage.name}>{stage.name}</option>)}</select></label>
            <label>付款狀態<select value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)}>{purchasePaymentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>到貨狀態<select value={form.arrivalStatus} onChange={(event) => update('arrivalStatus', event.target.value)}>{purchaseArrivalStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label>驗收狀態<select value={form.acceptanceStatus} onChange={(event) => update('acceptanceStatus', event.target.value)}>{purchaseAcceptanceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
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
            <label>預算金額<input type="number" value={form.budgetAmount} onChange={(event) => update('budgetAmount', event.target.value)} /></label>
            <label>報價金額<input type="number" value={form.quoteAmount} onChange={(event) => update('quoteAmount', event.target.value)} /></label>
            <label>報價單號<input value={form.quoteNo} onChange={(event) => update('quoteNo', event.target.value)} placeholder="QT / 報價單號" /></label>
            <label>PO 單號<input value={form.poNo} onChange={(event) => update('poNo', event.target.value)} placeholder="PO / 訂單編號" /></label>
            <label>發票號碼<input value={form.invoiceNo} onChange={(event) => update('invoiceNo', event.target.value)} placeholder="發票 / 請款單號" /></label>
            <label>付款期限<input type="date" value={form.paymentDueDate} onChange={(event) => update('paymentDueDate', event.target.value)} /></label>
            <label>預計到貨<input type="date" value={form.arrivalDueDate} onChange={(event) => update('arrivalDueDate', event.target.value)} /></label>
            <label>申請日<input type="date" value={form.requestDate} onChange={(event) => update('requestDate', event.target.value)} /></label>
            <label>下單日<input type="date" value={form.orderDate} onChange={(event) => update('orderDate', event.target.value)} /></label>
            <label>到貨日<input type="date" value={form.arrivalDate} onChange={(event) => update('arrivalDate', event.target.value)} /></label>
            <label>驗收日<input type="date" value={form.acceptanceDate} onChange={(event) => update('acceptanceDate', event.target.value)} /></label>
            <label className="form-wide">備註<textarea value={form.note} onChange={(event) => update('note', event.target.value)} /></label>
          </div>

          <div className="tax-preview">
            <article><span>未稅金額</span><strong>{formatMoney(amount.untaxedAmount)}</strong></article>
            <article><span>稅額</span><strong>{formatMoney(amount.taxAmount)}</strong></article>
            <article><span>含稅總額</span><strong>{formatMoney(amount.taxedTotal)}</strong></article>
            <article><span>預算差異</span><strong className={Number(form.budgetAmount || 0) && amount.taxedTotal > Number(form.budgetAmount || 0) ? 'has-diff' : ''}>{Number(form.budgetAmount || 0) ? formatMoney(amount.taxedTotal - Number(form.budgetAmount || 0)) : '—'}</strong></article>
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
    taxMode: row.taxMode || '未稅',
    paymentStatus: row.paymentStatus || '未付款',
    arrivalStatus: row.arrivalStatus || '未到貨',
    acceptanceStatus: row.acceptanceStatus || '未驗收',
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
        <span>{row.department || '未填部門'}</span>
        <span>{row.requester || '未填申請人'}</span>
        <span>{row.paymentStatus || '未付款'}</span>
        <span>{row.arrivalStatus || '未到貨'}</span>
        <span>{row.acceptanceStatus || '未驗收'}</span>
      </div>
      <div className="purchase-detail-identity">
        <div>
          <span>目前選取</span>
          <strong>{row.id} · {purchaseTitle(row)}</strong>
        </div>
        <small>{row.vendor || '未指定廠商'} · {items.length} 項 · {formatMoney(amount.taxedTotal)}</small>
      </div>
      <div className="purchase-detail-actions">
        <button type="button" onClick={onEdit}>編輯採購</button>
        <button type="button" onClick={onAdvance}>下一流程</button>
        <button type="button" onClick={onComplete}>視為完成</button>
        <button type="button" onClick={onCreateTask}>建立追蹤工作</button>
        <button type="button" onClick={() => onCreateReminder?.('追蹤')}>建立追蹤提醒</button>
        <button type="button" onClick={() => onCreateReminder?.('付款')}>付款提醒</button>
        <button type="button" onClick={() => onCreateReminder?.('到貨')}>到貨提醒</button>
        <button type="button" onClick={() => onCreateReminder?.('驗收')}>驗收提醒</button>
        <button type="button" onClick={onDuplicate}>複製採購</button>
      </div>

      <div className="purchase-progress-actions">
        <button type="button" className={(row.paymentStatus || '未付款') === '已付款' ? 'active' : ''} onClick={() => onUpdateMeta?.({ paymentStatus: (row.paymentStatus || '未付款') === '已付款' ? '未付款' : '已付款' }, (row.paymentStatus || '未付款') === '已付款' ? '付款狀態改為未付款。' : '付款狀態改為已付款。')}>付款完成</button>
        <button type="button" className={(row.arrivalStatus || '未到貨') === '已到貨' ? 'active' : ''} onClick={() => onUpdateMeta?.({ arrivalStatus: (row.arrivalStatus || '未到貨') === '已到貨' ? '未到貨' : '已到貨', arrivalDate: (row.arrivalStatus || '未到貨') === '已到貨' ? row.arrivalDate : (row.arrivalDate || todayDate()) }, (row.arrivalStatus || '未到貨') === '已到貨' ? '到貨狀態改為未到貨。' : '到貨狀態改為已到貨。')}>到貨完成</button>
        <button type="button" className={(row.acceptanceStatus || '未驗收') === '已驗收' ? 'active' : ''} onClick={() => onUpdateMeta?.({ acceptanceStatus: (row.acceptanceStatus || '未驗收') === '已驗收' ? '未驗收' : '已驗收' }, (row.acceptanceStatus || '未驗收') === '已驗收' ? '驗收狀態改為未驗收。' : '驗收狀態改為已驗收。')}>驗收完成</button>
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
        <article>
          <span>預算差異</span>
          <strong className={budgetDiff > 0 ? 'has-diff' : ''}>{budgetAmount ? formatMoney(budgetDiff) : '—'}</strong>
        </article>
      </div>

      <div className="purchase-detail-grid">
        <span>編號<b>{row.id}</b></span>
        <span>報價單號<b>{row.quoteNo || '—'}</b></span>
        <span>PO 單號<b>{row.poNo || '—'}</b></span>
        <span>發票號碼<b>{row.invoiceNo || '—'}</b></span>
        <span>廠商<b>{row.vendor || '—'}</b></span>
        <span>品項數<b>{items.length} 項 / {totalQuantity} 件</b></span>
        <span>稅別<b>{row.taxMode || '未稅'} / {Number(row.taxRate || 0)}%</b></span>
        <span>付款<b>{row.paymentStatus || '未付款'}</b></span>
        <span>到貨<b>{row.arrivalStatus || '未到貨'}</b></span>
        <span>驗收<b>{row.acceptanceStatus || '未驗收'}</b></span>
        <span>申請日<b>{row.requestDate || '—'}</b></span>
        <span>下單日<b>{row.orderDate || '—'}</b></span>
        <span>付款期限<b>{row.paymentDueDate || '—'}</b></span>
        <span>預計到貨<b>{row.arrivalDueDate || '—'}</b></span>
        <span>到貨日<b>{row.arrivalDate || '—'}</b></span>
        <span>驗收日<b>{row.acceptanceDate || '—'}</b></span>
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

      <div className="purchase-history-timeline">
        <div className="line-detail-head"><strong>採購歷程時間軸</strong><span>{history.length} 筆</span></div>
        {history.length ? history.map((entry) => (
          <article key={entry.id}>
            <i />
            <div><strong>{entry.title}</strong><span>{entry.message}</span><small>{entry.time}</small></div>
          </article>
        )) : <p>尚無此採購單的歷程紀錄。</p>}
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

function WorkCard({ item, onSelect, selected, selectable = false, checked = false, onToggleSelect }) {
  const isSelected = selected?.id === item.id
  return (
    <article className={isSelected ? 'work-card-shell selected' : 'work-card-shell'}>
      {selectable && (
        <label className="work-select-check" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={checked} onChange={onToggleSelect} />
          <span>選取</span>
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
        <span>選取</span><span>編號</span><span>標題</span><span>狀態</span><span>優先級</span><span>關聯</span><span>到期日</span>
      </div>
      {items.map((item) => {
        const isSelected = selected?.id === item.id
        return (
          <article className={isSelected ? 'work-grid-shell selected' : 'work-grid-shell'} key={item.id}>
            <button className="work-grid-row work-grid-row-v199" type="button" onClick={() => setSelected(item)}>
              <label className="grid-select-check" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggleSelect?.(item.id)} /></label>
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
        <span>定位</span>
        <strong>{purpose.role}</strong>
      </article>
      <article>
        <span>應該放這裡</span>
        <strong>{purpose.scope}</strong>
      </article>
      <article>
        <span>避免重複</span>
        <strong>{purpose.avoid}</strong>
      </article>
    </section>
  )
}

function Metric({ label, value, tone }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></article>
}

function ModuleBoundaryNote({ moduleId, compact = false }) {
  const boundary = flowdeskModuleBoundaries.find((item) => item.id === moduleId)
  if (!boundary) return null
  return (
    <div className={compact ? 'fd41-boundary-note compact' : 'fd41-boundary-note'}>
      <div>
        <span>功能定位</span>
        <strong>{boundary.title}</strong>
      </div>
      <p><b>適合：</b>{boundary.keep}</p>
      <p><b>避免：</b>{boundary.avoid}</p>
      {!compact && <small>{boundary.handoff}</small>}
    </div>
  )
}

function FlowDeskBoundaryMap() {
  return (
    <div className="fd41-boundary-map">
      {flowdeskModuleBoundaries.map((item) => (
        <article className="fd41-boundary-card" key={item.id}>
          <span>{item.title}</span>
          <strong>{item.keep}</strong>
          <p>{item.avoid}</p>
          <small>{item.handoff}</small>
        </article>
      ))}
    </div>
  )
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

    const heading = visibleHeadings().find(({ text }) => text === '工作事項')?.node
    if (!heading) return

    const main = heading.closest('main') || heading.closest('[role="main"]') || heading.closest('.page, .page-content, .main-content, .content, .workspace-content')
    if (main) main.classList.add('flow-workboard-outer-main')

    let current = heading.parentElement
    let best = null
    const chain = []

    while (current && current !== document.body) {
      chain.push(current)
      const text = current.textContent || ''
      const hasWorkboard = text.includes('工作事項')
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




























