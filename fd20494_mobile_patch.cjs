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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.94'");

const patchStart = "/* FLOWDESK_V20_4_94_MOBILE_SMALL_SCREEN_POLISH_START */";
const patchEnd = "/* FLOWDESK_V20_4_94_MOBILE_SMALL_SCREEN_POLISH_END */";

const oldPatchRegex = new RegExp("\\/\\* FLOWDESK_V20_4_94_MOBILE_SMALL_SCREEN_POLISH_START \\*\\/[\\s\\S]*?\\/\\* FLOWDESK_V20_4_94_MOBILE_SMALL_SCREEN_POLISH_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const mobilePatch = `
${patchStart}
/* 手機版 / 小螢幕全面優化：底部導覽、滿版內容、卡片單欄、彈窗安全高度 */

@media (max-width: 1024px) {
  html,
  body,
  #root {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .main-canvas {
    min-width: 0 !important;
    padding: 14px !important;
  }

  .app-topbar,
  .surface-toolbar,
  .fd20492-hero,
  .fd20490-list-topbar,
  .board-control-center,
  .reminder-filter-bar,
  .fd20481-doc-filter-bar,
  .project-filter-panel,
  .settings-hero {
    border-radius: 22px !important;
  }

  .surface-toolbar,
  .app-topbar,
  .fd20492-hero,
  .fd20490-list-topbar {
    align-items: stretch !important;
    flex-direction: column !important;
    gap: 12px !important;
  }

  .record-actions,
  .board-toolbar-actions,
  .fd20481-docs-actions,
  .fd20482-insight-actions,
  .fd20492-hero-actions,
  .fd20490-list-view-control,
  .project-view-toggle {
    width: 100% !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
  }

  .record-actions button,
  .board-toolbar-actions button,
  .fd20492-hero-actions button {
    flex: 1 1 150px;
  }

  .metric-strip,
  .home-cloud-kpis,
  .fd20482-kpi-grid,
  .fd20492-commander-grid,
  .fd20492-module-grid,
  .fd20492-body-grid,
  .fd20492-bottom-grid,
  .fd20481-docs-body,
  .settings-layout,
  .base-layout,
  .purchase-home-grid,
  .home-project-summary,
  .reminder-home-grid {
    grid-template-columns: 1fr !important;
  }

  .panel,
  .fd20492-panel,
  .fd20482-panel,
  .fd20481-doc-card,
  .fd20480-work-card,
  .reminder-card {
    border-radius: 22px !important;
  }
}

@media (max-width: 760px) {
  body {
    background-attachment: fixed;
  }

  .product-shell,
  .product-shell.sidebar-open,
  .product-shell.has-context,
  .product-shell.sidebar-open.has-context {
    display: block !important;
    grid-template-columns: 1fr !important;
    min-height: 100vh !important;
  }

  .workspace-sidebar {
    position: fixed !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
    top: auto !important;
    z-index: 12000 !important;
    height: 74px !important;
    max-height: 74px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    overflow: hidden !important;
    padding: 8px !important;
    border: 1px solid rgba(148, 163, 184, .22) !important;
    border-radius: 24px !important;
    background: rgba(255, 255, 255, .94) !important;
    backdrop-filter: blur(18px) !important;
    box-shadow: 0 22px 50px rgba(15, 23, 42, .18) !important;
  }

  .workspace-card {
    flex: 0 0 auto !important;
    width: 50px !important;
    height: 50px !important;
    padding: 4px !important;
    border-radius: 18px !important;
    box-shadow: none !important;
  }

  .workspace-card .brand-mark {
    width: 42px !important;
    height: 42px !important;
    border-radius: 15px !important;
    font-size: 18px !important;
  }

  .sidebar-copy,
  .mini-dashboard,
  .drag-dot {
    display: none !important;
  }

  .module-list {
    flex: 1 1 auto !important;
    display: flex !important;
    gap: 6px !important;
    margin: 0 !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    padding: 0 2px 2px !important;
    scrollbar-width: none !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .module-list::-webkit-scrollbar {
    display: none !important;
  }

  .module {
    flex: 0 0 58px !important;
    width: 58px !important;
    min-height: 50px !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    place-items: center !important;
    gap: 0 !important;
    padding: 5px !important;
    border-radius: 18px !important;
    transform: none !important;
  }

  .module-icon {
    width: 38px !important;
    height: 38px !important;
    border-radius: 14px !important;
    font-size: 19px !important;
  }

  .module strong {
    display: none !important;
  }

  .main-canvas {
    width: 100% !important;
    min-width: 0 !important;
    padding: 12px 10px 104px !important;
  }

  .app-topbar {
    position: sticky !important;
    top: 0 !important;
    z-index: 80 !important;
    margin: -4px -2px 12px !important;
    padding: 12px !important;
    border-radius: 0 0 22px 22px !important;
    background: rgba(248, 251, 255, .94) !important;
    backdrop-filter: blur(16px) !important;
  }

  .topbar-title h1,
  .fd20492-hero-copy h2 {
    font-size: clamp(26px, 9vw, 36px) !important;
    line-height: 1.05 !important;
  }

  .topbar-title p,
  .eyebrow {
    font-size: 11px !important;
  }

  .topbar-actions,
  .hero-actions,
  .fd20492-hero-actions,
  .record-actions {
    width: 100% !important;
    display: flex !important;
    gap: 8px !important;
    overflow-x: auto !important;
    padding-bottom: 2px !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .topbar-actions button,
  .hero-actions button,
  .fd20492-hero-actions button,
  .record-actions button {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
  }

  .board-filter-grid,
  .purchase-filter-bar,
  .reminder-filter-bar,
  .fd20481-doc-filter-bar,
  .project-filter-panel,
  .fd20490-list-topbar,
  .fd20489-work-view-topbar,
  .fd20483-pagination {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    padding: 12px !important;
  }

  .fd20490-list-view-control,
  .fd20483-pagination-controls,
  .fd20483-page-size,
  .collection-view-control,
  .purchase-local-view-control {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
  }

  .fd20483-pagination-controls button {
    flex: 1 1 auto !important;
    min-width: 74px !important;
  }

  .fd20483-page-size select {
    flex: 1 !important;
  }

  .card-wall,
  .board-card-view,
  .fd20478-reminder-card-view .reminder-date-group,
  .fd20481-doc-grid,
  .fd20482-module-grid,
  .fd20492-module-grid,
  .fd20492-commander-grid,
  .fd20492-body-grid,
  .fd20492-bottom-grid,
  .settings-category-grid,
  .theme-grid {
    grid-template-columns: 1fr !important;
  }

  .fd61-work-row,
  .work-grid-shell,
  .fd20478-reminder-list-view .reminder-card,
  .fd20481-doc-row,
  .fd20482-recent-list article,
  .fd20492-focus-row,
  .fd20492-timeline button,
  .fd20492-vendor-list div {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    min-height: auto !important;
  }

  .fd20480-work-card,
  .fd20478-reminder-card-view .reminder-card,
  .fd20481-doc-card {
    min-height: auto !important;
  }

  .fd20480-work-focus-grid,
  .fd20481-doc-card-meta,
  .fd20487-reminder-summary-grid,
  .fd20492-purchase-summary,
  .fd20492-data-list {
    grid-template-columns: 1fr !important;
  }

  .purchase-table-wrap,
  .table-scroll,
  .fd20481-doc-list,
  .work-grid,
  .project-list-table,
  .base-main,
  .doc-canvas {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  table {
    max-width: 100% !important;
  }

  .fd20478-work-modal-layer,
  .fd20481-doc-modal-layer,
  .fd20487-reminder-modal-layer,
  .purchase-detail-modal-layer,
  .project-detail-modal-layer,
  .modal-layer {
    padding: 8px !important;
    align-items: stretch !important;
  }

  .fd20478-work-modal,
  .fd20481-doc-modal,
  .fd20487-reminder-modal,
  .purchase-detail-modal,
  .project-detail-modal,
  .modal-card {
    width: 100% !important;
    max-width: none !important;
    max-height: calc(100vh - 16px) !important;
    border-radius: 20px !important;
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
    align-items: stretch !important;
    flex-direction: column !important;
    gap: 10px !important;
    padding: 14px !important;
  }

  .fd20478-work-modal-body,
  .fd20481-doc-modal-body,
  .fd20487-reminder-modal-body,
  .purchase-detail-modal-body,
  .project-detail-modal-body {
    grid-template-columns: 1fr !important;
    padding: 12px !important;
  }

  .fd20478-work-form-grid,
  .fd20481-doc-form-grid,
  .fd20487-reminder-form-grid,
  .purchase-form-grid,
  .project-form-grid {
    grid-template-columns: 1fr !important;
  }

  .fd20492-hero {
    padding: 16px !important;
  }

  .fd20492-score-card {
    min-height: 170px !important;
  }

  .fd20492-score-card strong {
    font-size: 56px !important;
  }

  .fd20492-panel,
  .panel {
    padding: 14px !important;
  }

  .fd20492-panel-head,
  .panel-title {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .fd20492-focus-tabs {
    width: 100% !important;
    overflow-x: auto !important;
  }

  .fd20492-focus-tabs button {
    flex: 1 0 auto !important;
  }

  .fd20493-branding-editor,
  .settings-layout,
  .settings-info-list {
    grid-template-columns: 1fr !important;
  }

  .fd20493-branding-actions {
    justify-content: stretch !important;
  }

  .fd20493-branding-actions button {
    flex: 1 1 auto !important;
  }
}

@media (max-width: 420px) {
  .main-canvas {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .workspace-sidebar {
    left: 6px !important;
    right: 6px !important;
    bottom: 6px !important;
    height: 68px !important;
    max-height: 68px !important;
    border-radius: 21px !important;
  }

  .workspace-card {
    width: 46px !important;
    height: 46px !important;
  }

  .workspace-card .brand-mark,
  .module-icon {
    width: 36px !important;
    height: 36px !important;
    font-size: 17px !important;
  }

  .module {
    flex-basis: 50px !important;
    width: 50px !important;
    min-height: 46px !important;
  }

  .fd20492-hero-copy h2,
  .topbar-title h1 {
    font-size: 27px !important;
  }

  .metric strong,
  .fd20482-kpi-card strong,
  .fd20492-command-card strong {
    font-size: 24px !important;
  }

  .fd20492-score-card strong {
    font-size: 48px !important;
  }

  .panel,
  .fd20492-panel,
  .surface-toolbar,
  .fd20490-list-topbar {
    border-radius: 20px !important;
  }
}
${patchEnd}
`;

css = css.trimEnd() + "\n\n" + mobilePatch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-94";
  data.version = "20.4.94";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-94";
    data.packages[""].version = "20.4.94";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.94 手機版 / 小螢幕優化 patch 已完成");
