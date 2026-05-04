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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.105'");

/* 先清掉前面專案小螢幕錯誤補丁，避免互相打架 */
const oldMarkers = [
  "FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX",
  "FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX",
  "FLOWDESK_V20_4_102_PROJECT_MODAL_TABS_RECOVERY",
  "FLOWDESK_V20_4_103_PROJECT_COMPACT_LAPTOP_MODE",
  "FLOWDESK_V20_4_105_PROJECT_MAIN_COMPACT_ONLY"
];

for (const marker of oldMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

const patch = `
/* FLOWDESK_V20_4_105_PROJECT_MAIN_COMPACT_ONLY_START */
/* v20.4.105
   專案管理小筆電主畫面緊湊版
   只處理專案管理主畫面，不碰專案彈窗分頁 / 甘特圖 / 任務內容。
*/

@media (min-width: 761px) and (max-width: 1360px), (min-width: 761px) and (max-height: 860px) {
  .project-workspace,
  .project-workspace * {
    box-sizing: border-box !important;
  }

  .project-workspace.fd203-shell,
  .project-workspace.page-stack,
  .flowdesk-module-shell.fd203-shell {
    gap: 10px !important;
  }

  /* 專案管理標題區縮短 */
  .project-workspace .fd203-toolbar,
  .project-workspace .flowdesk-toolbar-v2,
  .project-workspace .flow-toolbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 12px 16px !important;
    border-radius: 22px !important;
    min-height: auto !important;
  }

  .project-workspace .fd203-toolbar h2,
  .project-workspace .flow-toolbar h2 {
    margin: 0 !important;
    font-size: 30px !important;
    line-height: 1.1 !important;
  }

  .project-workspace .fd203-toolbar .eyebrow,
  .project-workspace .flow-toolbar .eyebrow {
    margin-bottom: 2px !important;
    font-size: 11px !important;
  }

  .project-workspace .fd203-toolbar > div:first-child > span,
  .project-workspace .flow-toolbar > div:first-child > span {
    display: none !important;
  }

  .project-workspace .flow-toolbar-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .project-workspace .flow-toolbar-actions button,
  .project-workspace .flow-toolbar-actions .toolbar-soft-chip {
    min-height: 34px !important;
    padding: 7px 12px !important;
    border-radius: 13px !important;
    font-size: 12px !important;
  }

  /* 小筆電主畫面先收起說明性大區塊，把專案列表拉上來 */
  .project-workspace .fd20464-project-command-board,
  .project-workspace .fd203-attention-panel {
    display: none !important;
  }

  /* KPI 變薄 */
  .project-workspace .project-overview-strip.fd203-overview-strip,
  .project-workspace .project-overview-strip {
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin: 0 !important;
  }

  .project-workspace .project-overview-strip article {
    min-height: 56px !important;
    padding: 9px 10px !important;
    border-radius: 15px !important;
  }

  .project-workspace .project-overview-strip article span {
    font-size: 11px !important;
  }

  .project-workspace .project-overview-strip article strong {
    font-size: 18px !important;
    line-height: 1.15 !important;
  }

  /* 狀態切換列變薄 */
  .project-workspace .project-case-bar,
  .project-workspace .fd88-case-filter-bar.project-case-bar {
    gap: 8px !important;
    padding: 8px 10px !important;
    border-radius: 18px !important;
    margin: 0 !important;
  }

  .project-workspace .project-case-bar button,
  .project-workspace .fd88-case-filter-bar.project-case-bar button {
    min-height: 34px !important;
    padding: 7px 12px !important;
    border-radius: 999px !important;
    font-size: 13px !important;
  }

  /* 篩選列變薄 */
  .project-workspace .fd203-filter-bar {
    display: grid !important;
    grid-template-columns: minmax(260px, 1.8fr) repeat(5, minmax(105px, 1fr)) !important;
    gap: 8px !important;
    padding: 10px !important;
    border-radius: 18px !important;
    margin: 0 !important;
  }

  .project-workspace .fd203-filter-bar input,
  .project-workspace .fd203-filter-bar select {
    min-height: 34px !important;
    padding: 7px 10px !important;
    border-radius: 12px !important;
    font-size: 12px !important;
  }

  /* 專案列表區 */
  .project-workspace .fd203-main-layout.modal-mode,
  .project-workspace .fd203-main-layout {
    margin-top: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
  }

  .project-workspace .fd203-project-list-pane.full,
  .project-workspace .fd203-project-list-pane {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
    padding: 10px !important;
    border-radius: 20px !important;
  }

  .project-workspace .fd203-pane-head,
  .project-workspace .fd203-pane-head-stack {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    margin-bottom: 8px !important;
    padding: 0 !important;
  }

  .project-workspace .fd203-pane-head .eyebrow {
    display: none !important;
  }

  .project-workspace .fd203-pane-head h3 {
    margin: 0 !important;
    font-size: 18px !important;
  }

  .project-workspace .fd203-pane-actions {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .project-workspace .fd203-pane-actions small {
    font-size: 12px !important;
  }

  .project-workspace .fd203-pane-actions button {
    min-height: 32px !important;
    padding: 6px 10px !important;
    border-radius: 12px !important;
    font-size: 12px !important;
  }

  .project-workspace .fd20490-project-list-topbar,
  .project-workspace .fd20490-list-topbar {
    margin: 0 0 8px !important;
    padding: 9px 10px !important;
    border-radius: 16px !important;
  }

  .project-workspace .fd20490-list-topbar-left strong {
    font-size: 13px !important;
  }

  .project-workspace .fd20490-list-topbar-left span {
    font-size: 11px !important;
  }

  .project-workspace .fd20490-list-view-control button,
  .project-workspace .project-view-toggle button {
    min-height: 30px !important;
    padding: 6px 9px !important;
    border-radius: 10px !important;
    font-size: 12px !important;
  }

  /* 卡片可讀，不擠成直排 */
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)) !important;
    gap: 12px !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
  }

  .project-workspace .fd203-project-card,
  .project-workspace .project-board-card,
  .project-workspace .project-card,
  .project-workspace .project-list-row {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    padding: 14px !important;
    border-radius: 18px !important;
  }

  .project-workspace .fd203-project-card *,
  .project-workspace .project-board-card *,
  .project-workspace .project-card *,
  .project-workspace .project-list-row * {
    min-width: 0 !important;
    writing-mode: horizontal-tb !important;
  }

  .project-workspace .fd203-project-card h3,
  .project-workspace .project-board-card h3,
  .project-workspace .project-card h3,
  .project-workspace .project-list-row h3,
  .project-workspace .fd203-project-card strong,
  .project-workspace .project-board-card strong {
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;
    line-height: 1.35 !important;
  }

  /* 清單模式可橫向，不撐爆卡片模式 */
  .project-workspace .fd203-project-table {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .project-workspace .fd203-project-table-head,
  .project-workspace .fd203-project-row {
    min-width: 780px !important;
  }

  .project-workspace .fd203-pagination,
  .project-workspace .project-pagination-bar {
    position: static !important;
    inset: auto !important;
    transform: none !important;
    z-index: 1 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 12px 0 0 !important;
    padding: 10px 12px !important;
    border-radius: 16px !important;
    background: rgba(255,255,255,.92) !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .project-overview-strip.fd203-overview-strip,
  .project-workspace .project-overview-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .project-workspace .fd203-filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .project-workspace .fd203-filter-bar > :first-child {
    grid-column: 1 / -1 !important;
  }

  .project-workspace .fd203-toolbar,
  .project-workspace .flow-toolbar {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .project-workspace .flow-toolbar-actions {
    justify-content: flex-start !important;
  }

  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 761px) and (max-height: 760px) {
  .project-workspace .project-overview-strip.fd203-overview-strip,
  .project-workspace .project-overview-strip {
    display: none !important;
  }

  .project-workspace .fd203-toolbar h2,
  .project-workspace .flow-toolbar h2 {
    font-size: 26px !important;
  }
}
/* FLOWDESK_V20_4_105_PROJECT_MAIN_COMPACT_ONLY_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-105";
  data.version = "20.4.105";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-105";
    data.packages[""].version = "20.4.105";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.105 專案管理主畫面小筆電優化 patch 已完成");
