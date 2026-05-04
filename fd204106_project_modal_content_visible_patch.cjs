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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.106'");

const oldMarkers = [
  "FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX",
  "FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX",
  "FLOWDESK_V20_4_102_PROJECT_MODAL_TABS_RECOVERY",
  "FLOWDESK_V20_4_103_PROJECT_COMPACT_LAPTOP_MODE",
  "FLOWDESK_V20_4_106_PROJECT_MODAL_CONTENT_VISIBLE"
];

for (const marker of oldMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

const patch = `
/* FLOWDESK_V20_4_106_PROJECT_MODAL_CONTENT_VISIBLE_START */
/* v20.4.106
   專案彈窗分頁內容顯示修正：
   修正小筆電 / 平板寬度下，總覽、編輯、任務、里程碑、紀錄空白。
   原因是舊版小螢幕 CSS 把 detail-block / project-task-block / timeline-notes 隱藏。
*/

@media (min-width: 761px) {
  .project-workspace .fd203-project-modal {
    width: min(1560px, calc(100vw - 24px)) !important;
    max-width: calc(100vw - 24px) !important;
    height: calc(100vh - 24px) !important;
    max-height: calc(100vh - 24px) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  .project-workspace .fd203-project-modal .fd203-workspace-head,
  .project-workspace .fd203-project-modal .fd203-modal-summary-bar,
  .project-workspace .fd203-project-modal .fd203-workspace-metrics,
  .project-workspace .fd203-project-modal .fd203-tabs,
  .project-workspace .fd203-project-modal .project-segmented-tabs {
    flex: 0 0 auto !important;
  }

  .project-workspace .fd203-project-modal .fd203-tabs,
  .project-workspace .fd203-project-modal .project-segmented-tabs {
    position: relative !important;
    top: auto !important;
    z-index: 8 !important;
    margin: 0 !important;
  }

  /* 重要：覆蓋舊 CSS 的 display:none */
  .project-workspace .fd203-project-modal .fd203-overview-panel {
    display: grid !important;
    visibility: visible !important;
    opacity: 1 !important;
    grid-template-columns: minmax(260px, .85fr) minmax(320px, 1.15fr) !important;
    gap: 14px !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
    margin: 14px 18px 18px !important;
  }

  .project-workspace .fd203-project-modal .fd203-tab-panel,
  .project-workspace .fd203-project-modal .detail-block,
  .project-workspace .fd203-project-modal .fd203-edit-panel,
  .project-workspace .fd203-project-modal .fd203-records-panel {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
    margin: 14px 18px 18px !important;
  }

  .project-workspace .fd203-project-modal .project-task-block {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
  }

  .project-workspace .fd203-project-modal .fd203-gantt-panel {
    display: flex !important;
    flex-direction: column !important;
    visibility: visible !important;
    opacity: 1 !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
    margin: 14px 18px 18px !important;
  }

  .project-workspace .fd203-project-modal .related-task-list,
  .project-workspace .fd203-project-modal .project-detail-card-list,
  .project-workspace .fd203-project-modal .fd203-task-list,
  .project-workspace .fd203-project-modal .timeline-notes,
  .project-workspace .fd203-project-modal .flow-timeline-notes,
  .project-workspace .fd203-project-modal .fd397-records-grid,
  .project-workspace .fd203-project-modal .fd203-subtask-list,
  .project-workspace .fd203-project-modal .project-mini-card-grid {
    display: grid !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  .project-workspace .fd203-project-modal .fd397-records-grid {
    grid-template-columns: minmax(260px, .75fr) minmax(320px, 1.25fr) !important;
    gap: 14px !important;
  }

  .project-workspace .fd203-project-modal .project-detail-card,
  .project-workspace .fd203-project-modal .fd203-detail-card,
  .project-workspace .fd203-project-modal .project-mini-card,
  .project-workspace .fd203-project-modal .project-timeline-card,
  .project-workspace .fd203-project-modal .fd203-profile-card,
  .project-workspace .fd203-project-modal .fd203-editor-card {
    display: grid !important;
    visibility: visible !important;
    opacity: 1 !important;
    min-width: 0 !important;
  }

  .project-workspace .fd203-project-modal .project-editor-grid,
  .project-workspace .fd203-project-modal .project-detail-form-grid,
  .project-workspace .fd203-project-modal .project-detail-form-grid.compact-3,
  .project-workspace .fd203-project-modal .fd203-editor-grid,
  .project-workspace .fd203-project-modal .fd203-edit-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    min-width: 0 !important;
  }

  .project-workspace .fd203-project-modal .wide-field,
  .project-workspace .fd203-project-modal textarea {
    grid-column: 1 / -1 !important;
  }

  .project-workspace .fd203-project-modal .fd203-gantt-scroll {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: auto !important;
  }
}

@media (min-width: 761px) and (max-width: 1100px) {
  .project-workspace .fd203-project-modal .fd203-overview-panel,
  .project-workspace .fd203-project-modal .fd397-records-grid,
  .project-workspace .fd203-project-modal .project-editor-grid,
  .project-workspace .fd203-project-modal .project-detail-form-grid,
  .project-workspace .fd203-project-modal .project-detail-form-grid.compact-3,
  .project-workspace .fd203-project-modal .fd203-editor-grid,
  .project-workspace .fd203-project-modal .fd203-edit-grid {
    grid-template-columns: 1fr !important;
  }

  .project-workspace .fd203-project-modal .fd203-modal-summary-bar,
  .project-workspace .fd203-project-modal .fd203-workspace-metrics {
    display: none !important;
  }
}
/* FLOWDESK_V20_4_106_PROJECT_MODAL_CONTENT_VISIBLE_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-106";
  data.version = "20.4.106";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-106";
    data.packages[""].version = "20.4.106";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.106 專案彈窗內容顯示修正 patch 已完成");
