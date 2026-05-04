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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.95'");

const patchStart = "/* FLOWDESK_V20_4_95_MOBILE_COMPACT_REFINE_START */";
const patchEnd = "/* FLOWDESK_V20_4_95_MOBILE_COMPACT_REFINE_END */";

const oldPatchRegex = new RegExp("\\/\\* FLOWDESK_V20_4_95_MOBILE_COMPACT_REFINE_START \\*\\/[\\s\\S]*?\\/\\* FLOWDESK_V20_4_95_MOBILE_COMPACT_REFINE_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const compactPatch = `
${patchStart}
/* 手機 / 小螢幕第二階段收斂：更緊湊、減少擋畫面、底部導覽更精簡 */

@media (max-width: 900px) {
  .topbar-title p,
  .surface-toolbar p,
  .settings-note,
  .home-subtext,
  .fd20492-hero-copy > span {
    line-height: 1.45 !important;
  }

  .fd20492-command-card,
  .fd20492-module-card,
  .fd20480-work-card,
  .fd20481-doc-card,
  .reminder-card,
  .project-card,
  .purchase-card {
    min-height: auto !important;
  }

  .fd20492-command-card,
  .fd20492-module-card,
  .fd20480-work-card,
  .fd20481-doc-card,
  .reminder-card {
    padding: 12px !important;
  }

  .fd20492-panel-head h3,
  .panel-title h3,
  .panel-title h2 {
    font-size: 18px !important;
  }

  .fd20492-module-card b,
  .metric strong,
  .fd20482-kpi-card strong {
    font-size: 24px !important;
  }
}

@media (max-width: 760px) {
  /* 底部導覽再縮一些 */
  .workspace-sidebar {
    height: 66px !important;
    max-height: 66px !important;
    padding: 7px !important;
    border-radius: 22px !important;
  }

  .workspace-card {
    width: 44px !important;
    height: 44px !important;
    border-radius: 15px !important;
  }

  .workspace-card .brand-mark {
    width: 38px !important;
    height: 38px !important;
    border-radius: 13px !important;
    font-size: 16px !important;
  }

  .module {
    flex: 0 0 52px !important;
    width: 52px !important;
    min-height: 44px !important;
    padding: 4px !important;
    border-radius: 15px !important;
  }

  .module-icon {
    width: 34px !important;
    height: 34px !important;
    border-radius: 12px !important;
    font-size: 17px !important;
  }

  .module.active,
  .module[aria-current="page"] {
    box-shadow: 0 10px 24px rgba(37, 99, 235, .18) !important;
  }

  .main-canvas {
    padding: 10px 9px 92px !important;
  }

  /* 區塊更緊湊 */
  .app-topbar,
  .surface-toolbar,
  .board-control-center,
  .fd20490-list-topbar,
  .reminder-filter-bar,
  .fd20481-doc-filter-bar,
  .project-filter-panel,
  .settings-hero,
  .fd20492-hero,
  .panel,
  .fd20492-panel {
    padding: 12px !important;
  }

  .app-topbar {
    margin-bottom: 10px !important;
  }

  .topbar-title h1,
  .fd20492-hero-copy h2 {
    font-size: clamp(24px, 8vw, 32px) !important;
  }

  .topbar-title p,
  .surface-toolbar p,
  .fd20492-hero-copy > span,
  .fd20490-list-topbar-left span,
  .fd20489-work-view-topbar-left span {
    font-size: 12px !important;
  }

  .fd20492-hero-copy > span {
    opacity: .88 !important;
  }

  .panel-title p,
  .eyebrow {
    letter-spacing: .10em !important;
  }

  /* 按鈕收斂 */
  .topbar-actions,
  .hero-actions,
  .fd20492-hero-actions,
  .record-actions,
  .board-toolbar-actions,
  .fd20493-branding-actions {
    gap: 6px !important;
  }

  .topbar-actions button,
  .hero-actions button,
  .fd20492-hero-actions button,
  .record-actions button,
  .board-toolbar-actions button,
  .fd20493-branding-actions button,
  .fd20490-list-view-control button,
  .collection-view-control button {
    min-height: 34px !important;
    padding: 7px 11px !important;
    border-radius: 12px !important;
    font-size: 12px !important;
  }

  /* 卡片資訊更精簡 */
  .fd20480-work-card h4,
  .fd20481-doc-card h4,
  .reminder-card strong,
  .fd20492-module-card strong,
  .fd20492-focus-row strong,
  .fd20492-timeline strong {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  .fd20480-work-card p,
  .fd20481-doc-card p,
  .reminder-card p,
  .fd20492-focus-row small,
  .fd20492-timeline small,
  .fd20492-module-card small,
  .fd20482-recent-list small {
    font-size: 11px !important;
    line-height: 1.4 !important;
  }

  .fd20480-work-card .record-id,
  .fd20481-doc-card .record-id,
  .reminder-card .record-id {
    font-size: 11px !important;
  }

  .fd20480-work-card,
  .fd20481-doc-card,
  .reminder-card,
  .fd20492-command-card,
  .fd20492-module-card,
  .fd20492-focus-row,
  .fd20492-timeline button {
    border-radius: 18px !important;
  }

  .fd20492-command-card {
    min-height: auto !important;
    padding: 12px !important;
  }

  .fd20492-command-card strong {
    margin-top: 6px !important;
    font-size: 24px !important;
  }

  .fd20492-module-card {
    min-height: auto !important;
    gap: 8px !important;
    padding: 12px !important;
  }

  .fd20492-module-icon {
    width: 38px !important;
    height: 38px !important;
    border-radius: 14px !important;
    font-size: 19px !important;
  }

  .fd20492-module-card b {
    font-size: 22px !important;
  }

  .fd20492-overview,
  .fd20482-insight,
  .settings-layout,
  .fd20481-docs-body {
    gap: 12px !important;
  }

  .fd20483-pagination,
  .fd20490-list-topbar,
  .fd20489-work-view-topbar {
    gap: 8px !important;
    padding: 10px !important;
  }

  .fd20483-pagination-status,
  .fd20490-list-topbar-left span {
    font-size: 11px !important;
  }

  /* 彈窗頭尾固定 */
  .fd20478-work-modal,
  .fd20481-doc-modal,
  .fd20487-reminder-modal,
  .purchase-detail-modal,
  .project-detail-modal,
  .modal-card {
    border-radius: 18px !important;
  }

  .fd20478-work-modal-head,
  .fd20481-doc-modal-head,
  .fd20487-reminder-modal-head,
  .fd20478-work-modal-footer,
  .fd20481-doc-modal-footer,
  .fd20487-reminder-modal-footer,
  .purchase-detail-modal-head,
  .purchase-detail-modal-footer,
  .project-detail-modal-head,
  .project-detail-modal-footer {
    position: sticky !important;
    background: linear-gradient(180deg, #ffffff, #f8fbff) !important;
    z-index: 2 !important;
  }

  .fd20478-work-modal-head,
  .fd20481-doc-modal-head,
  .fd20487-reminder-modal-head,
  .purchase-detail-modal-head,
  .project-detail-modal-head {
    top: 0 !important;
  }

  .fd20478-work-modal-footer,
  .fd20481-doc-modal-footer,
  .fd20487-reminder-modal-footer,
  .purchase-detail-modal-footer,
  .project-detail-modal-footer {
    bottom: 0 !important;
  }

  .settings-category-grid .settings-card small,
  .settings-card p,
  .settings-note {
    font-size: 11px !important;
    line-height: 1.45 !important;
  }
}

@media (max-width: 520px) {
  /* 更小螢幕：隱藏次要說明 */
  .topbar-title p,
  .fd20492-hero-copy > span,
  .settings-note,
  .fd20490-list-topbar-left span,
  .fd20489-work-view-topbar-left span {
    display: none !important;
  }

  .app-topbar,
  .surface-toolbar,
  .fd20492-hero,
  .fd20490-list-topbar,
  .panel,
  .fd20492-panel {
    padding: 10px !important;
    border-radius: 18px !important;
  }

  .fd20492-score-card {
    min-height: 148px !important;
    padding: 14px !important;
  }

  .fd20492-score-card strong {
    font-size: 42px !important;
  }

  .fd20492-command-card strong,
  .metric strong,
  .fd20482-kpi-card strong {
    font-size: 22px !important;
  }

  .fd20492-module-card b {
    font-size: 20px !important;
  }

  .fd20492-purchase-summary article,
  .fd20492-data-list article,
  .fd20487-reminder-summary-grid article {
    padding: 10px !important;
    border-radius: 14px !important;
  }

  .fd20493-brand-preview strong {
    font-size: 16px !important;
  }
}

@media (max-width: 380px) {
  /* 超小螢幕再壓縮 */
  .workspace-sidebar {
    left: 5px !important;
    right: 5px !important;
    bottom: 5px !important;
    height: 62px !important;
    max-height: 62px !important;
    border-radius: 19px !important;
  }

  .main-canvas {
    padding: 8px 7px 86px !important;
  }

  .module {
    flex-basis: 48px !important;
    width: 48px !important;
    min-height: 42px !important;
  }

  .module-icon {
    width: 32px !important;
    height: 32px !important;
    font-size: 16px !important;
  }

  .workspace-card {
    width: 42px !important;
    height: 42px !important;
  }

  .workspace-card .brand-mark {
    width: 36px !important;
    height: 36px !important;
    font-size: 15px !important;
  }

  .topbar-title h1,
  .fd20492-hero-copy h2 {
    font-size: 22px !important;
  }

  .fd20492-score-card strong {
    font-size: 38px !important;
  }

  .fd20492-command-card,
  .fd20492-module-card,
  .fd20480-work-card,
  .fd20481-doc-card,
  .reminder-card {
    padding: 10px !important;
  }
}
${patchEnd}
`;

css = css.trimEnd() + "\n\n" + compactPatch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-95";
  data.version = "20.4.95";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-95";
    data.packages[""].version = "20.4.95";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.95 手機 / 小螢幕再收斂 patch 已完成");
