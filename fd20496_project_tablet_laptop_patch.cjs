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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.96'");

const patchStart = "/* FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_START */";
const patchEnd = "/* FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_END */";

const oldPatchRegex = new RegExp("\\/\\* FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_START \\*\\/[\\s\\S]*?\\/\\* FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
${patchStart}
/* 平板 / 小筆電專案管理修正：
   目標是 900～1360px，不是手機。
   專案列表移上方、內容滿版、任務區可見。
*/

/* 13~14 吋筆電、小視窗、平板橫向 */
@media (min-width: 761px) and (max-width: 1360px) {
  .main-canvas {
    min-width: 0 !important;
    padding: 16px !important;
  }

  /* 專案管理主版面不要再三欄硬塞 */
  .project-layout-v3,
  .project-reflow .project-layout-v3,
  .project-responsive .project-layout-v3,
  .fd203-main-layout,
  .fd203-main-layout.modal-mode {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
    align-items: start !important;
    min-width: 0 !important;
  }

  /* 專案列表改成上方橫向列 */
  .project-list-panel,
  .project-list-panel-v2,
  .fd203-project-list-pane,
  .fd203-project-list-pane.full {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    align-items: stretch !important;
    gap: 10px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    padding: 10px !important;
    border-radius: 22px !important;
    scroll-snap-type: x proximity !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .project-list-panel::-webkit-scrollbar,
  .project-list-panel-v2::-webkit-scrollbar,
  .fd203-project-list-pane::-webkit-scrollbar {
    height: 8px !important;
  }

  .project-list-panel::-webkit-scrollbar-thumb,
  .project-list-panel-v2::-webkit-scrollbar-thumb,
  .fd203-project-list-pane::-webkit-scrollbar-thumb {
    border-radius: 999px !important;
    background: rgba(148, 163, 184, .38) !important;
  }

  .project-list-head,
  .fd203-pane-head {
    flex: 0 0 190px !important;
    min-width: 190px !important;
    display: grid !important;
    align-content: center !important;
    padding: 10px 12px !important;
    border-radius: 16px !important;
    background: rgba(248, 250, 252, .9) !important;
  }

  .project-list-card,
  .project-list-card-v2,
  .fd203-project-card,
  .fd203-project-row {
    flex: 0 0 260px !important;
    width: 260px !important;
    min-width: 260px !important;
    scroll-snap-align: start !important;
  }

  /* 主要內容滿版 */
  .gantt-panel-v2,
  .gantt-panel-v3,
  .project-detail-panel,
  .project-detail-panel-v2,
  .project-detail-shell,
  .fd203-workspace,
  .fd203-project-modal,
  .fd203-tab-panel,
  .fd203-gantt-panel,
  .fd203-overview-panel {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    grid-column: 1 / -1 !important;
  }

  .project-detail-panel,
  .project-detail-panel-v2 {
    position: static !important;
  }

  /* 專案任務區：強制可見與可閱讀 */
  .project-task-block,
  .fd203-task-list,
  .project-detail-card-list,
  .fd203-subtask-list {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 12px !important;
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }

  .project-detail-card,
  .fd203-detail-card,
  .fd203-subtask-editor {
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
    border-radius: 18px !important;
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

  /* 任務編輯欄位：小筆電不要三欄硬塞 */
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
  .fd203-editor-grid textarea {
    grid-column: 1 / -1 !important;
  }

  /* 任務操作按鈕不要被擠到看不到 */
  .project-detail-card-actions,
  .fd203-detail-card-actions,
  .project-gantt-control-bar,
  .project-board-actions-row,
  .project-list-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
    gap: 8px !important;
    width: 100% !important;
  }

  .project-detail-card-actions button,
  .fd203-detail-card-actions button,
  .project-gantt-control-bar button,
  .project-board-actions-row button,
  .project-list-actions button {
    flex: 0 1 auto !important;
    min-height: 34px !important;
    padding: 7px 11px !important;
    border-radius: 12px !important;
    white-space: nowrap !important;
  }

  /* 甘特圖可以橫向滑，不要把任務區擠掉 */
  .gantt-scroll,
  .gantt-scroll-v3,
  .gantt-scroll-inline,
  .fd203-gantt-scroll {
    max-width: 100% !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .gantt-grid-head,
  .gantt-project-group,
  .gantt-project-row,
  .gantt-task-row,
  .gantt-project-row-v3,
  .gantt-task-row-v3,
  .fd203-gantt-grid,
  .fd203-gantt-row {
    min-width: 760px !important;
  }

  /* 專案彈窗：小筆電高度要能看到任務 */
  .fd203-project-modal {
    width: min(1180px, calc(100vw - 36px)) !important;
    max-height: calc(100vh - 36px) !important;
  }

  .fd203-project-modal .fd203-tabs {
    overflow-x: auto !important;
    white-space: nowrap !important;
  }
}

/* 更窄的平板直向 / 小視窗：任務欄位改單欄 */
@media (min-width: 761px) and (max-width: 980px) {
  .project-detail-form-grid,
  .project-detail-form-grid.compact-3,
  .fd203-editor-grid,
  .fd203-record-grid {
    grid-template-columns: 1fr !important;
  }

  .project-list-head,
  .fd203-pane-head {
    flex-basis: 160px !important;
    min-width: 160px !important;
  }

  .project-list-card,
  .project-list-card-v2,
  .fd203-project-card,
  .fd203-project-row {
    flex-basis: 230px !important;
    width: 230px !important;
    min-width: 230px !important;
  }
}

/* 保留手機版既有處理，但補任務區單欄 */
@media (max-width: 760px) {
  .project-task-block,
  .fd203-task-list,
  .project-detail-card-list,
  .fd203-subtask-list {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .project-detail-form-grid,
  .project-detail-form-grid.compact-3,
  .fd203-editor-grid,
  .fd203-record-grid {
    grid-template-columns: 1fr !important;
  }

  .gantt-scroll,
  .gantt-scroll-v3,
  .gantt-scroll-inline,
  .fd203-gantt-scroll {
    max-width: 100% !important;
    overflow-x: auto !important;
  }
}
${patchEnd}
`;

css = css.trimEnd() + "\\n\\n" + patch + "\\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-96";
  data.version = "20.4.96";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-96";
    data.packages[""].version = "20.4.96";
  }

  write(file, JSON.stringify(data, null, 2) + "\\n");
}

console.log("v20.4.96 平板筆電專案管理小螢幕修正 patch 已完成");
