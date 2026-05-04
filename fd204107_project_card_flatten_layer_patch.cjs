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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.107'");

const marker = "FLOWDESK_V20_4_107_PROJECT_CARD_FLATTEN_LAYER";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_107_PROJECT_CARD_FLATTEN_LAYER_START */
/* v20.4.107
   專案管理卡片層級扁平化：
   把右側多餘一層取消，內容直接回到主層顯示。
*/

@media (min-width: 761px) {
  .project-workspace .fd203-project-card,
  .project-workspace .project-board-card,
  .project-workspace .project-card,
  .project-workspace .project-list-row {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  /* 主內容容器改成單層，不再左右分欄 */
  .project-workspace .fd203-project-card .fd203-card-body,
  .project-workspace .fd203-project-card .fd203-card-main,
  .project-workspace .fd203-project-card .fd203-card-content,
  .project-workspace .project-board-card .project-board-body,
  .project-workspace .project-board-card .project-board-main,
  .project-workspace .project-board-card .project-board-content,
  .project-workspace .project-card .project-card-body,
  .project-workspace .project-card .project-card-main,
  .project-workspace .project-card .project-card-content,
  .project-workspace .project-list-row .project-card-body,
  .project-workspace .project-list-row .project-card-main,
  .project-workspace .project-list-row .project-card-content {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
    grid-template-columns: 1fr !important;
    grid-auto-flow: row !important;
  }

  /* 右側多餘那層直接取消成一般內容 */
  .project-workspace .fd203-project-card .fd203-card-side,
  .project-workspace .fd203-project-card .fd203-card-right,
  .project-workspace .fd203-project-card .fd203-card-rail,
  .project-workspace .fd203-project-card .fd203-side-panel,
  .project-workspace .project-board-card .project-board-side,
  .project-workspace .project-board-card .project-board-right,
  .project-workspace .project-board-card .project-board-rail,
  .project-workspace .project-card .project-card-side,
  .project-workspace .project-card .project-card-right,
  .project-workspace .project-card .project-card-rail,
  .project-workspace .project-list-row .project-card-side,
  .project-workspace .project-list-row .project-card-right,
  .project-workspace .project-list-row .project-card-rail {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  /* 標題與標籤改成同層排列 */
  .project-workspace .fd203-project-card .fd203-card-head,
  .project-workspace .project-board-card .project-board-card-top,
  .project-workspace .project-card .project-card-title,
  .project-workspace .project-list-row .project-card-title {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .project-workspace .fd203-project-card h3,
  .project-workspace .project-board-card h3,
  .project-workspace .project-card h3,
  .project-workspace .project-list-row h3,
  .project-workspace .fd203-project-card strong,
  .project-workspace .project-board-card strong {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    line-height: 1.35 !important;
  }

  /* 中間資訊列與 badge 同層化 */
  .project-workspace .fd203-project-card .fd203-card-meta,
  .project-workspace .fd203-project-card .fd203-project-card-meta,
  .project-workspace .project-board-card .project-board-meta,
  .project-workspace .project-board-card .project-board-badges,
  .project-workspace .project-card .project-card-meta,
  .project-workspace .project-card .project-card-badges {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
    min-width: 0 !important;
    margin-top: 8px !important;
  }

  /* 任務摘要直接全寬 */
  .project-workspace .fd203-project-card .related-task-list,
  .project-workspace .fd203-project-card .project-task-snippets,
  .project-workspace .project-board-card .related-task-list,
  .project-workspace .project-board-card .project-task-snippets,
  .project-workspace .project-card .related-task-list,
  .project-workspace .project-card .project-task-snippets {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-top: 10px !important;
  }

  /* 統計區回到主層，不再像掛在右邊 */
  .project-workspace .fd203-project-card .fd203-card-kpis,
  .project-workspace .fd203-project-card .fd203-card-metrics,
  .project-workspace .project-board-card .project-board-stats,
  .project-workspace .project-board-card .project-focus-kpis,
  .project-workspace .project-card .project-card-kpis,
  .project-workspace .project-card .project-card-metrics {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-top: 10px !important;
  }

  .project-workspace .fd203-project-card .fd203-card-kpis > *,
  .project-workspace .fd203-project-card .fd203-card-metrics > *,
  .project-workspace .project-board-card .project-board-stats > *,
  .project-workspace .project-board-card .project-focus-kpis > *,
  .project-workspace .project-card .project-card-kpis > *,
  .project-workspace .project-card .project-card-metrics > * {
    min-width: 0 !important;
  }

  /* 進度與底部資訊全寬 */
  .project-workspace .fd203-project-card .fd203-card-progress,
  .project-workspace .fd203-project-card .project-progress-row,
  .project-workspace .project-board-card .project-progress-row,
  .project-workspace .project-card .project-progress-row,
  .project-workspace .fd203-project-card .fd203-card-footer,
  .project-workspace .project-board-card .project-card-footer,
  .project-workspace .project-card .project-card-footer {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-top: 10px !important;
  }
}

@media (min-width: 761px) and (max-width: 1100px) {
  .project-workspace .fd203-project-card .fd203-card-kpis,
  .project-workspace .fd203-project-card .fd203-card-metrics,
  .project-workspace .project-board-card .project-board-stats,
  .project-workspace .project-board-card .project-focus-kpis,
  .project-workspace .project-card .project-card-kpis,
  .project-workspace .project-card .project-card-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

@media (min-width: 761px) and (max-width: 860px) {
  .project-workspace .fd203-project-card .fd203-card-kpis,
  .project-workspace .fd203-project-card .fd203-card-metrics,
  .project-workspace .project-board-card .project-board-stats,
  .project-workspace .project-board-card .project-focus-kpis,
  .project-workspace .project-card .project-card-kpis,
  .project-workspace .project-card .project-card-metrics {
    grid-template-columns: 1fr !important;
  }
}
/* FLOWDESK_V20_4_107_PROJECT_CARD_FLATTEN_LAYER_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-107";
  data.version = "20.4.107";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-107";
    data.packages[""].version = "20.4.107";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.107 專案卡片扁平化 patch 已完成");
