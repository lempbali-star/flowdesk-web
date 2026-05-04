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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.99'");

/* 清掉前面幾版專案小螢幕 patch，避免互相打架 */
[
  "FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX"
].forEach((marker) => {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
});

const patch = `
/* FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX_START */
/* v20.4.99
   平板 / 小筆電 / 小視窗專案管理主畫面修正：
   問題不是手機版，而是高度不足時，上方區域太高導致專案列表與任務入口看不到。
*/

/* 針對平板、小筆電、小視窗 */
@media (min-width: 761px) and (max-width: 1360px), (min-width: 761px) and (max-height: 860px) {
  .project-workspace.fd203-shell,
  .project-workspace.page-stack,
  .flowdesk-module-shell.fd203-shell {
    gap: 10px !important;
  }

  /* 專案管理頁標題區壓縮 */
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

  /* 上方六張 KPI 卡變薄 */
  .project-overview-strip.fd203-overview-strip,
  .project-workspace .project-overview-strip {
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin: 0 !important;
  }

  .project-overview-strip.fd203-overview-strip article,
  .project-workspace .project-overview-strip article {
    min-height: 58px !important;
    padding: 9px 12px !important;
    border-radius: 16px !important;
  }

  .project-overview-strip.fd203-overview-strip article span,
  .project-workspace .project-overview-strip article span {
    font-size: 11px !important;
  }

  .project-overview-strip.fd203-overview-strip article strong,
  .project-workspace .project-overview-strip article strong {
    font-size: 18px !important;
    line-height: 1.1 !important;
  }

  /* 狀態切換列壓縮 */
  .project-case-bar,
  .fd88-case-filter-bar.project-case-bar {
    gap: 8px !important;
    padding: 8px 10px !important;
    border-radius: 18px !important;
    margin: 0 !important;
  }

  .project-case-bar button,
  .fd88-case-filter-bar.project-case-bar button {
    min-height: 34px !important;
    padding: 7px 12px !important;
    border-radius: 999px !important;
    font-size: 13px !important;
  }

  /* 這兩塊在小筆電太吃高度：先收掉，讓專案列表與任務入口上來 */
  .project-workspace .fd20464-project-command-board,
  .project-workspace .fd203-attention-panel {
    display: none !important;
  }

  /* 篩選列改薄 */
  .project-workspace .fd203-filter-bar {
    display: grid !important;
    grid-template-columns: minmax(260px, 1.8fr) repeat(5, minmax(110px, 1fr)) !important;
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

  /* 專案列表區往上、變緊湊 */
  .project-workspace .fd203-main-layout.modal-mode,
  .project-workspace .fd203-main-layout {
    margin-top: 0 !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 10px !important;
  }

  .project-workspace .fd203-project-list-pane.full,
  .project-workspace .fd203-project-list-pane {
    padding: 10px !important;
    border-radius: 20px !important;
    min-width: 0 !important;
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

  /* 卡片列表更容易在第一屏看到 */
  .project-workspace .fd203-project-card-list {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
    gap: 10px !important;
  }

  .project-workspace .fd203-project-card,
  .project-workspace .project-board-card,
  .project-workspace .project-list-row {
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .project-workspace .fd203-project-card h3,
  .project-workspace .project-board-card h3,
  .project-workspace .project-list-row h3 {
    font-size: 15px !important;
    line-height: 1.3 !important;
  }

  /* 清單模式可橫向，不撐爆畫面 */
  .project-workspace .fd203-project-table {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .project-workspace .fd203-project-table-head,
  .project-workspace .fd203-project-row {
    min-width: 820px !important;
  }

  .project-workspace .fd203-pagination,
  .project-workspace .project-pagination-bar {
    margin-top: 8px !important;
    padding: 8px 10px !important;
    border-radius: 16px !important;
  }
}

/* 980px 以下：再更緊湊，不要把專案列表擠到第二屏 */
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
}

/* 高度很矮的筆電畫面：KPI 也收掉，只保留列表 */
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
/* FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-99";
  data.version = "20.4.99";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-99";
    data.packages[""].version = "20.4.99";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.99 平板小筆電專案管理主畫面修正 patch 已完成");
