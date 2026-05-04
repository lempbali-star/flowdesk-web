const fs = require("fs");

const appPath = "src/App.jsx";
const cssPath = "src/styles.css";
const pkgPath = "package.json";
const lockPath = "package-lock.json";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function replaceOnce(text, oldText, newText, label) {
  if (!text.includes(oldText)) {
    throw new Error("找不到區塊：" + label);
  }
  return text.replace(oldText, newText);
}

let app = read(appPath);
let css = read(cssPath);

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.93'");

if (!app.includes("FLOWDESK_PLATFORM_NAME_STORAGE_KEY")) {
  app = replaceOnce(
    app,
    "const FLOWDESK_VERSION_LABEL = `FlowDesk v${FLOWDESK_APP_VERSION}`",
    `const FLOWDESK_VERSION_LABEL = \`FlowDesk v\${FLOWDESK_APP_VERSION}\`
const FLOWDESK_DEFAULT_PLATFORM_NAME = 'FlowDesk 工作流管理平台'
const FLOWDESK_PLATFORM_NAME_STORAGE_KEY = 'flowdesk-platform-name-v20493'

function normalizePlatformName(value) {
  const next = String(value || '').trim()
  return next || FLOWDESK_DEFAULT_PLATFORM_NAME
}

function readFlowDeskPlatformName() {
  if (typeof window === 'undefined') return FLOWDESK_DEFAULT_PLATFORM_NAME
  return normalizePlatformName(window.localStorage.getItem(FLOWDESK_PLATFORM_NAME_STORAGE_KEY) || FLOWDESK_DEFAULT_PLATFORM_NAME)
}

function getPlatformMark(value) {
  const text = normalizePlatformName(value)
  const first = text.match(/[A-Za-z0-9]/)?.[0] || text.slice(0, 1) || 'F'
  return first.toUpperCase()
}`,
    "平台名稱 helper"
  );
}

if (!app.includes("const [platformName, setPlatformName]")) {
  app = replaceOnce(
    app,
    `  const [showAppearanceQuick, setShowAppearanceQuick] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uiTheme, setUiTheme] = useState(() => {`,
    `  const [showAppearanceQuick, setShowAppearanceQuick] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [platformName, setPlatformName] = useState(() => readFlowDeskPlatformName())
  const [uiTheme, setUiTheme] = useState(() => {`,
    "FlowDeskShell 平台名稱 state"
  );
}

if (!app.includes("document.title = `${nextName}｜${FLOWDESK_VERSION_LABEL}`")) {
  app = replaceOnce(
    app,
    `  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-active-module-v20316', active)
  }, [active])`,
    `  useEffect(() => {
    if (typeof window === 'undefined') return
    const nextName = normalizePlatformName(platformName)
    window.localStorage.setItem(FLOWDESK_PLATFORM_NAME_STORAGE_KEY, nextName)
    if (typeof document !== 'undefined') document.title = \`\${nextName}｜\${FLOWDESK_VERSION_LABEL}\`
  }, [platformName])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('flowdesk-active-module-v20316', active)
  }, [active])`,
    "平台名稱儲存 effect"
  );
}

app = app.replace(
  `<div className="brand-mark">F</div>
          <div className="sidebar-copy">
            <strong>FlowDesk</strong>`,
  `<div className="brand-mark">{getPlatformMark(platformName)}</div>
          <div className="sidebar-copy">
            <strong>{platformName}</strong>`
);

app = app.replace(
  `{active === 'settings' && <SettingsPage themeOptions={themeOptions}`,
  `{active === 'settings' && <SettingsPage platformName={platformName} setPlatformName={setPlatformName} themeOptions={themeOptions}`
);

if (!app.includes("const [loginPlatformName] = useState(() => readFlowDeskPlatformName())")) {
  app = replaceOnce(
    app,
    `function LoginScreen({ mode, configMissing }) {
  const [email, setEmail] = useState('')`,
    `function LoginScreen({ mode, configMissing }) {
  const [loginPlatformName] = useState(() => readFlowDeskPlatformName())
  const [email, setEmail] = useState('')`,
    "登入頁平台名稱 state"
  );
}

app = app.replace(
  `<div className="flowdesk-login-brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FlowDesk</strong>`,
  `<div className="flowdesk-login-brand">
          <div className="brand-mark">{getPlatformMark(loginPlatformName)}</div>
          <div>
            <strong>{loginPlatformName}</strong>`
);

app = app.replace(
  `function SettingsPage({ themeOptions, uiTheme, setUiTheme, appearanceMode, setAppearanceMode, motionLevel, setMotionLevel, customTheme, setCustomTheme, themeShuffleSettings, setThemeShuffleSettings, themeShuffleCountdown, randomizeThemeNow, freezeThemeShuffle, iconStyleMode, setIconStyleMode, resolvedIconStyle, modules, collections, setCollections, moduleIcons, setModuleIcons, baseTableIcons, setBaseTableIcons, setReminders }) {`,
  `function SettingsPage({ platformName, setPlatformName, themeOptions, uiTheme, setUiTheme, appearanceMode, setAppearanceMode, motionLevel, setMotionLevel, customTheme, setCustomTheme, themeShuffleSettings, setThemeShuffleSettings, themeShuffleCountdown, randomizeThemeNow, freezeThemeShuffle, iconStyleMode, setIconStyleMode, resolvedIconStyle, modules, collections, setCollections, moduleIcons, setModuleIcons, baseTableIcons, setBaseTableIcons, setReminders }) {`
);

if (!app.includes("platformNameDraft")) {
  app = replaceOnce(
    app,
    `  const [newCollectionName, setNewCollectionName] = useState('')`,
    `  const [newCollectionName, setNewCollectionName] = useState('')
  const [platformNameDraft, setPlatformNameDraft] = useState(platformName)

  useEffect(() => {
    setPlatformNameDraft(platformName)
  }, [platformName])

  function savePlatformName() {
    const nextName = normalizePlatformName(platformNameDraft)
    setPlatformName(nextName)
    setPlatformNameDraft(nextName)
  }

  function resetPlatformName() {
    setPlatformName(FLOWDESK_DEFAULT_PLATFORM_NAME)
    setPlatformNameDraft(FLOWDESK_DEFAULT_PLATFORM_NAME)
  }`,
    "設定頁平台名稱 state"
  );
}

if (!app.includes("id: 'branding'")) {
  app = replaceOnce(
    app,
    `  const settingCards = [
    { id: 'appearance', title: '外觀設定', eyebrow: 'UI THEME', summary: \`目前方案：\${activeAppearancePreset?.name || '自訂組合'} · \${activeTheme.name}\${themeShuffleSettings.enabled ? ' · 自動隨機中' : ''}\`, icon: '🎨' },`,
    `  const settingCards = [
    { id: 'branding', title: '平台名稱', eyebrow: 'BRANDING', summary: \`目前名稱：\${platformName}\`, icon: '🏷️' },
    { id: 'appearance', title: '外觀設定', eyebrow: 'UI THEME', summary: \`目前方案：\${activeAppearancePreset?.name || '自訂組合'} · \${activeTheme.name}\${themeShuffleSettings.enabled ? ' · 自動隨機中' : ''}\`, icon: '🎨' },`,
    "設定分類平台名稱卡片"
  );
}

if (!app.includes("fd20493-branding-panel")) {
  app = replaceOnce(
    app,
    `            {settingsView === 'appearance' && (`,
    `      {settingsView === 'branding' && (
        <section className="panel wide settings-panel settings-detail-panel fd20493-branding-panel">
          <PanelTitle eyebrow="平台名稱" title="自訂系統顯示名稱" />
          <p className="settings-note">可調整側邊欄、登入頁與瀏覽器標題顯示的名稱。預設為 FlowDesk 工作流管理平台。</p>
          <div className="fd20493-branding-editor">
            <div className="fd20493-brand-preview">
              <div className="brand-mark">{getPlatformMark(platformNameDraft)}</div>
              <div>
                <span>目前預覽</span>
                <strong>{normalizePlatformName(platformNameDraft)}</strong>
                <small>{FLOWDESK_VERSION_LABEL}</small>
              </div>
            </div>
            <label>
              <span>平台名稱</span>
              <input
                value={platformNameDraft}
                onChange={(event) => setPlatformNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') savePlatformName()
                }}
                placeholder={FLOWDESK_DEFAULT_PLATFORM_NAME}
              />
            </label>
            <div className="fd20493-branding-actions">
              <button className="primary-btn" type="button" onClick={savePlatformName}>套用名稱</button>
              <button className="ghost-btn" type="button" onClick={resetPlatformName}>恢復預設</button>
            </div>
          </div>
          <div className="settings-info-list fd20493-branding-info">
            <div><span>目前名稱</span><strong>{platformName}</strong></div>
            <div><span>預設名稱</span><strong>{FLOWDESK_DEFAULT_PLATFORM_NAME}</strong></div>
            <div><span>儲存位置</span><strong>本機瀏覽器設定</strong></div>
          </div>
        </section>
      )}

            {settingsView === 'appearance' && (`,
    "平台名稱設定頁"
  );
}

if (!app.includes("<span>平台名稱</span><strong>{platformName}</strong>")) {
  app = app.replace(
    `<div><span>版本狀態</span><strong>{FLOWDESK_VERSION_LABEL} 功能收斂版</strong></div>`,
    `<div><span>平台名稱</span><strong>{platformName}</strong></div>
            <div><span>版本狀態</span><strong>{FLOWDESK_VERSION_LABEL} 功能收斂版</strong></div>`
  );
}

if (!app.includes("FLOWDESK_PLATFORM_NAME_STORAGE_KEY,")) {
  app = app.replace(
    `'flowdesk-base-table-icons',
  ]`,
    `'flowdesk-base-table-icons',
    FLOWDESK_PLATFORM_NAME_STORAGE_KEY,
  ]`
  );
}

if (!css.includes("FLOWDESK_V20_4_93_PLATFORM_NAME_SETTING")) {
  css += `

/* FLOWDESK_V20_4_93_PLATFORM_NAME_SETTING_START */
.sidebar-copy strong,
.flowdesk-login-brand strong {
  max-width: 188px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fd20493-branding-panel {
  display: grid;
  gap: 16px;
}

.fd20493-branding-editor {
  display: grid;
  grid-template-columns: minmax(260px, .72fr) minmax(320px, 1fr);
  gap: 14px;
  align-items: stretch;
}

.fd20493-brand-preview,
.fd20493-branding-editor label {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, .18);
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 14px 30px rgba(15, 23, 42, .05);
}

.fd20493-brand-preview {
  display: flex;
  align-items: center;
  gap: 14px;
}

.fd20493-brand-preview .brand-mark {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  font-size: 22px;
}

.fd20493-brand-preview span,
.fd20493-branding-editor label span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
}

.fd20493-brand-preview strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 950;
}

.fd20493-brand-preview small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.fd20493-branding-editor label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fd20493-branding-editor input {
  width: 100%;
  min-height: 44px;
  padding: 10px 13px;
  border: 1px solid rgba(148, 163, 184, .28);
  border-radius: 14px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-weight: 850;
  box-sizing: border-box;
  outline: none;
}

.fd20493-branding-editor input:focus {
  border-color: rgba(37, 99, 235, .42);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .10);
}

.fd20493-branding-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.fd20493-branding-info {
  margin-top: 0;
}

@media (max-width: 860px) {
  .fd20493-branding-editor {
    grid-template-columns: 1fr;
  }

  .fd20493-branding-actions {
    justify-content: stretch;
  }

  .fd20493-branding-actions button {
    flex: 1;
  }
}
/* FLOWDESK_V20_4_93_PLATFORM_NAME_SETTING_END */
`;
}

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-93";
  data.version = "20.4.93";
  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-93";
    data.packages[""].version = "20.4.93";
  }
  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.93 平台名稱設定 patch 已完成");
