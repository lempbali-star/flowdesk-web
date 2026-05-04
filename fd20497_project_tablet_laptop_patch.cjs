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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.97'");

const patchStart = "/* FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_START */";
const patchEnd = "/* FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_END */";

const oldPatchRegex = new RegExp("\\/\\* FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_START \\*\\/[\\s\\S]*?\\/\\* FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
${patchStart}
/* 平板 / 小筆電專案管理修正：900～1360px，不是手機版 */

@media (min-width: 761px) and (max-width: 1360px) {
  .main-canvas {
    min-width: 0 !important;
    padding: 16px !important;
  }

  /* 專案列表不要壓縮主內容 */
  .fd203-main-layout,
  .fd203-main-layout.modal-mode {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
    min-width: 0 !important;
  }

  .fd203-project-list-pane.full {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }

  .fd203-project-card-list {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
    gap: 12px !important;
  }

  .fd203-project-table {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .fd203-project-table-head,
  .fd203-project-row {
    min-width: 820px !important;
  }

  /* 專案彈窗：小筆電要更接近滿版，任務才看得到 */
  .fd203-project-modal-backdrop {
    padding: 12px !important;
    place-items: stretch center !important;
  }

  .fd203-project-modal {
    width: min(1320px, calc(100vw - 24px)) !important;
    max-height: calc(100vh - 24px) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    border-radius: 22px !important;
  }

  .fd203-project-modal .fd203-workspace-head {
    position: sticky !important;
    top: 0 !important;
    z-index: 12 !important;
    flex: 0 0 auto !important;
    margin: 0 !important;
    padding: 12px 16px !important;
    border-radius: 0 !important;
  }

  .fd203-workspace-hero {
    margin: 0 !important;
  }

  .fd203-workspace-title-row h3 {
    font-size: 22px !important;
    line-height: 1.25 !important;
  }

  .fd203-workspace-meta {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
  }

  .fd203-workspace-actions,
  .fd203-workspace-top-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .fd203-workspace-actions button,
  .fd203-workspace-top-actions button {
    min-height: 34px !important;
    padding: 7px 11px !important;
    border-radius: 12px !important;
  }

  .fd203-workspace-metrics {
    flex: 0 0 auto !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin: 8px 12px !important;
  }

  .fd203-workspace-metrics article {
    min-height: 64px !important;
    padding: 10px !important;
    border-radius: 14px !important;
  }

  .fd203-workspace-metrics article.wide {
    grid-column: span 1 !important;
  }

  /* 分頁列維持可見，但不要吃掉太多高度 */
  .fd203-project-modal .fd203-tabs {
    position: sticky !important;
    top: 70px !important;
    z-index: 11 !important;
    display: flex !important;
    gap: 8px !important;
    overflow-x: auto !important;
    padding: 9px 12px !important;
    margin: 0 !important;
    white-space: nowrap !important;
    scrollbar-width: thin !important;
  }

  .fd203-project-modal .fd203-tabs button {
    flex: 0 0 auto !important;
    min-height: 36px !important;
    padding: 7px 12px !important;
    border-radius: 12px !important;
    font-size: 13px !important;
  }

  /* 任務分頁：真正把高度留給任務內容 */
  .fd203-project-modal--tasks .fd203-tab-panel,
  .fd203-project-modal--edit .fd203-tab-panel,
  .fd203-project-modal--milestones .fd203-tab-panel,
  .fd203-project-modal--records .fd203-tab-panel {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    margin: 0 12px 12px !important;
    overflow: auto !important;
    padding: 12px !important;
    border-radius: 18px !important;
  }

  .fd203-project-modal--tasks .project-task-block {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    min-height: 0 !important;
    overflow: auto !important;
  }

  .detail-block-headline {
    position: sticky !important;
    top: 0 !important;
    z-index: 5 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding: 10px !important;
    margin: -12px -12px 10px !important;
    background: rgba(255,255,255,.96) !important;
    border-bottom: 1px solid rgba(226,232,240,.9) !important;
    backdrop-filter: blur(12px) !important;
  }

  .detail-block-headline button {
    min-height: 34px !important;
    padding: 7px 12px !important;
    border-radius: 12px !important;
  }

  .project-detail-card-list,
  .fd203-task-list {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .project-detail-card,
  .fd203-detail-card,
  .fd203-subtask-editor {
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
    border-radius: 18px !important;
    padding: 14px !important;
  }

  .project-detail-card-head {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 10px !important;
    flex-wrap: wrap !important;
  }

  .project-detail-card-head strong {
    min-width: 0 !important;
    overflow-wrap: anywhere !important;
  }

  /* 小筆電欄位只保留兩欄，不再擠到看不到 */
  .project-detail-form-grid,
  .project-detail-form-grid.compact-3,
  .fd203-editor-grid,
  .fd203-record-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .project-detail-form-grid label,
  .fd203-editor-grid label,
  .fd203-record-grid label {
    min-width: 0 !important;
  }

  .project-detail-form-grid input,
  .project-detail-form-grid select,
  .project-detail-form-grid textarea,
  .fd203-editor-grid input,
  .fd203-editor-grid select,
  .fd203-editor-grid textarea,
  .fd203-detail-card input,
  .fd203-detail-card select,
  .fd203-detail-card textarea {
    width: 100% !important;
    min-width: 0 !important;
  }

  .project-detail-form-grid textarea,
  .fd203-editor-grid textarea,
  .wide-field {
    grid-column: 1 / -1 !important;
  }

  .project-detail-card-actions,
  .fd203-detail-card-actions,
  .project-focus-actions,
  .fd203-action-row {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    width: 100% !important;
  }

  .project-detail-card-actions button,
  .fd203-detail-card-actions button,
  .project-focus-actions button,
  .fd203-action-row button {
    flex: 0 1 auto !important;
    min-height: 34px !important;
    padding: 7px 11px !important;
    border-radius: 12px !important;
    white-space: nowrap !important;
  }

  .fd203-subtask-list {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    margin-top: 10px !important;
  }

  /* 甘特圖橫滑，不擠壓整個彈窗 */
  .fd203-project-modal--gantt .fd203-gantt-panel {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    margin: 0 12px 12px !important;
    overflow: hidden !important;
  }

  .fd203-project-modal .fd203-gantt-scroll,
  .gantt-scroll,
  .gantt-scroll-v3,
  .gantt-scroll-inline,
  .fd203-gantt-scroll {
    max-width: 100% !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .fd203-gantt-grid,
  .fd203-gantt-row,
  .gantt-grid-head,
  .gantt-project-row,
  .gantt-task-row {
    min-width: 860px !important;
  }
}

/* 更窄平板 / 小視窗：任務欄位改單欄 */
@media (min-width: 761px) and (max-width: 980px) {
  .fd203-workspace-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .project-detail-form-grid,
  .project-detail-form-grid.compact-3,
  .fd203-editor-grid,
  .fd203-record-grid {
    grid-template-columns: 1fr !important;
  }

  .fd203-project-modal .fd203-tabs {
    top: 82px !important;
  }
}
${patchEnd}
`;

css = css.replace(oldPatchRegex, "").trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-97";
  data.version = "20.4.97";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-97";
    data.packages[""].version = "20.4.97";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.97 平板筆電專案管理修正 patch 已完成");
