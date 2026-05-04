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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.98'");

const patchStart = "/* FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX_START */";
const patchEnd = "/* FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX_END */";

const oldPatchRegex = new RegExp("\\/\\* FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX_START \\*\\/[\\s\\S]*?\\/\\* FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
${patchStart}
/* v20.4.98
   平板 / 小筆電專案管理任務分頁修正：
   任務分頁時，壓縮上方區塊，讓任務列表一定看得到。
*/

@media (min-width: 761px) and (max-width: 1360px) {
  .fd203-project-modal-backdrop {
    padding: 10px !important;
    align-items: stretch !important;
    justify-content: center !important;
  }

  .fd203-project-modal {
    width: min(1320px, calc(100vw - 20px)) !important;
    height: calc(100vh - 20px) !important;
    max-height: calc(100vh - 20px) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    border-radius: 22px !important;
  }

  /* 任務分頁：上方資訊太高，直接壓縮 */
  .fd203-project-modal--tasks .fd203-workspace-head {
    flex: 0 0 auto !important;
    min-height: 0 !important;
    padding: 10px 14px !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-title-row {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-title-row h3 {
    margin: 0 !important;
    font-size: 20px !important;
    line-height: 1.2 !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-label,
  .fd203-project-modal--tasks .fd203-workspace-meta,
  .fd203-project-modal--tasks .fd203-modal-summary-bar {
    display: none !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-actions,
  .fd203-project-modal--tasks .fd203-workspace-top-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-actions button,
  .fd203-project-modal--tasks .fd203-workspace-top-actions button {
    min-height: 32px !important;
    padding: 6px 10px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
  }

  /* 任務分頁的 tab 列固定在上方，不再把任務擠掉 */
  .fd203-project-modal--tasks .project-segmented-tabs,
  .fd203-project-modal--tasks .fd203-tabs {
    flex: 0 0 auto !important;
    position: static !important;
    display: flex !important;
    gap: 6px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    margin: 0 !important;
    padding: 8px 10px !important;
    border-radius: 0 !important;
    white-space: nowrap !important;
    scrollbar-width: thin !important;
  }

  .fd203-project-modal--tasks .project-segmented-tabs button,
  .fd203-project-modal--tasks .fd203-tabs button {
    flex: 0 0 auto !important;
    min-height: 32px !important;
    padding: 6px 10px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
  }

  /* 真正把任務內容變成主要可視區 */
  .fd203-project-modal--tasks .project-task-block,
  .fd203-project-modal--tasks .fd203-tab-panel {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    margin: 0 10px 10px !important;
    padding: 12px !important;
    border-radius: 18px !important;
    background: #fff !important;
  }

  .fd203-project-modal--tasks .detail-block-headline {
    flex: 0 0 auto !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 6 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
    margin: -12px -12px 10px !important;
    padding: 10px 12px !important;
    background: rgba(255, 255, 255, .96) !important;
    border-bottom: 1px solid rgba(226, 232, 240, .9) !important;
    backdrop-filter: blur(12px) !important;
  }

  .fd203-project-modal--tasks .detail-block-headline .eyebrow {
    margin: 0 !important;
    font-size: 11px !important;
  }

  .fd203-project-modal--tasks .detail-block-headline button {
    min-height: 32px !important;
    padding: 6px 11px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
  }

  .fd203-project-modal--tasks .project-detail-card-list,
  .fd203-project-modal--tasks .fd203-task-list {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    width: 100% !important;
    overflow: visible !important;
  }

  .fd203-project-modal--tasks .project-detail-card,
  .fd203-project-modal--tasks .fd203-detail-card {
    display: grid !important;
    gap: 10px !important;
    width: 100% !important;
    min-width: 0 !important;
    padding: 12px !important;
    border-radius: 16px !important;
    overflow: visible !important;
  }

  .fd203-project-modal--tasks .project-detail-card-head {
    display: flex !important;
    justify-content: space-between !important;
    align-items: flex-start !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
  }

  .fd203-project-modal--tasks .project-detail-card-head strong {
    min-width: 0 !important;
    overflow-wrap: anywhere !important;
  }

  /* 任務欄位：小筆電最多兩欄 */
  .fd203-project-modal--tasks .project-detail-form-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .fd203-project-modal--tasks .project-detail-form-grid label {
    min-width: 0 !important;
    font-size: 12px !important;
  }

  .fd203-project-modal--tasks .project-detail-form-grid input,
  .fd203-project-modal--tasks .project-detail-form-grid select,
  .fd203-project-modal--tasks .project-detail-form-grid textarea {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 34px !important;
    padding: 7px 9px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
  }

  .fd203-project-modal--tasks .project-detail-form-grid textarea,
  .fd203-project-modal--tasks .wide-field {
    grid-column: 1 / -1 !important;
  }

  .fd203-project-modal--tasks .project-detail-card-actions,
  .fd203-project-modal--tasks .fd203-detail-card-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 7px !important;
    justify-content: flex-start !important;
  }

  .fd203-project-modal--tasks .project-detail-card-actions button,
  .fd203-project-modal--tasks .fd203-detail-card-actions button {
    min-height: 32px !important;
    padding: 6px 10px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
    white-space: nowrap !important;
  }

  .fd203-project-modal--tasks .fd203-subtask-list,
  .fd203-project-modal--tasks .project-subtask-list {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    min-width: 0 !important;
  }
}

/* 更窄的平板直向 / 小視窗：任務欄位改單欄 */
@media (min-width: 761px) and (max-width: 980px) {
  .fd203-project-modal--tasks .project-detail-form-grid {
    grid-template-columns: 1fr !important;
  }

  .fd203-project-modal--tasks .fd203-workspace-actions button,
  .fd203-project-modal--tasks .fd203-workspace-top-actions button {
    flex: 1 1 auto !important;
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
  data.name = "flowdesk-product-v20-4-98";
  data.version = "20.4.98";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-98";
    data.packages[""].version = "20.4.98";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.98 專案任務小螢幕可見修正 patch 已完成");
