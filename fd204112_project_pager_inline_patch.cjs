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

let app = read(appPath);
let css = read(cssPath);

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.112'");

/*
  直接把專案管理分頁列換成獨立 class，
  避開舊的 project-pagination-bar / fd203-pagination / fd20483-pagination 浮層樣式。
*/

let pagerCount = 0;
let actionCount = 0;

app = app.replace(/className\s*=\s*["'`]([^"'`]*\bproject-pagination-bar\b[^"'`]*)["'`]/g, () => {
  pagerCount++;
  return 'className="fd204112-project-pager-inline"';
});

app = app.replace(/className\s*=\s*["'`]([^"'`]*\bproject-pagination-actions\b[^"'`]*)["'`]/g, () => {
  actionCount++;
  return 'className="fd204112-project-pager-actions"';
});

console.log("已替換專案分頁外層 class 數量:", pagerCount);
console.log("已替換專案分頁按鈕列 class 數量:", actionCount);

const oldMarkers = [
  "FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY",
  "FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT",
  "FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW",
  "FLOWDESK_V20_4_112_PROJECT_PAGER_INLINE"
];

for (const marker of oldMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

const patch = `
/* FLOWDESK_V20_4_112_PROJECT_PAGER_INLINE_START */
/* v20.4.112
   專案管理分頁列獨立化：
   分頁列改用 fd204112 class，避開舊浮層樣式，不再蓋住卡片。
*/

.project-workspace .fd204112-project-pager-inline,
.flowdesk-module-shell .fd204112-project-pager-inline {
  position: static !important;
  float: none !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  translate: none !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 12px !important;

  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;

  clear: both !important;
  margin: 18px 0 0 !important;
  padding: 12px 14px !important;

  border: 1px solid rgba(226, 232, 240, .9) !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .06) !important;

  opacity: 1 !important;
  z-index: 1 !important;
  pointer-events: auto !important;
}

.project-workspace .fd204112-project-pager-inline > div:first-child,
.flowdesk-module-shell .fd204112-project-pager-inline > div:first-child {
  min-width: 180px !important;
  color: #64748b !important;
  font-size: 13px !important;
  line-height: 1.45 !important;
}

.project-workspace .fd204112-project-pager-inline > div:first-child strong,
.flowdesk-module-shell .fd204112-project-pager-inline > div:first-child strong {
  display: block !important;
  color: #1d4ed8 !important;
  font-size: 18px !important;
  font-weight: 950 !important;
}

.project-workspace .fd204112-project-pager-inline > div:first-child span,
.flowdesk-module-shell .fd204112-project-pager-inline > div:first-child span {
  display: block !important;
  margin-top: 2px !important;
}

.project-workspace .fd204112-project-pager-actions,
.flowdesk-module-shell .fd204112-project-pager-actions {
  position: static !important;
  float: none !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;

  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: wrap !important;
  gap: 8px !important;

  min-width: 0 !important;
  max-width: 100% !important;
}

.project-workspace .fd204112-project-pager-actions button,
.flowdesk-module-shell .fd204112-project-pager-actions button {
  position: static !important;
  float: none !important;
  transform: none !important;
  translate: none !important;

  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
}

.project-workspace .fd204112-project-pager-actions .fd203-page-jump,
.flowdesk-module-shell .fd204112-project-pager-actions .fd203-page-jump {
  position: static !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  min-height: 34px !important;
  padding: 5px 10px !important;
  border: 1px solid rgba(226, 232, 240, .9) !important;
  border-radius: 999px !important;
  background: #fff !important;
}

.project-workspace .fd204112-project-pager-actions .fd203-page-jump input,
.flowdesk-module-shell .fd204112-project-pager-actions .fd203-page-jump input {
  width: 58px !important;
  min-height: 28px !important;
  text-align: center !important;
  border-radius: 999px !important;
}

.project-workspace .fd204112-project-pager-inline::before,
.project-workspace .fd204112-project-pager-inline::after,
.project-workspace .fd204112-project-pager-actions::before,
.project-workspace .fd204112-project-pager-actions::after,
.flowdesk-module-shell .fd204112-project-pager-inline::before,
.flowdesk-module-shell .fd204112-project-pager-inline::after,
.flowdesk-module-shell .fd204112-project-pager-actions::before,
.flowdesk-module-shell .fd204112-project-pager-actions::after {
  display: none !important;
  content: none !important;
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .fd204112-project-pager-inline,
  .flowdesk-module-shell .fd204112-project-pager-inline {
    align-items: stretch !important;
    justify-content: flex-start !important;
  }

  .project-workspace .fd204112-project-pager-actions,
  .flowdesk-module-shell .fd204112-project-pager-actions {
    justify-content: flex-start !important;
    width: 100% !important;
  }
}
/* FLOWDESK_V20_4_112_PROJECT_PAGER_INLINE_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-112";
  data.version = "20.4.112";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-112";
    data.packages[""].version = "20.4.112";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.112 專案分頁列獨立化 patch 已完成");
