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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.100'");

const marker = "FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX_START */
/* v20.4.100
   專案管理平板 / 小筆電卡片檢視修正：
   不讓卡片橫向撐版，改成自動換行網格。
*/

@media (min-width: 761px) and (max-width: 1360px), (min-width: 761px) and (max-height: 860px) {
  .project-workspace,
  .project-workspace * {
    box-sizing: border-box !important;
  }

  .project-workspace .fd203-project-list-pane.full,
  .project-workspace .fd203-project-list-pane {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
    gap: 10px !important;
    overflow: visible !important;
  }

  .project-workspace .fd203-project-card,
  .project-workspace .project-board-card,
  .project-workspace .project-card,
  .project-workspace .project-list-row {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    flex: initial !important;
    overflow: hidden !important;
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .project-workspace .fd203-project-card *,
  .project-workspace .project-board-card *,
  .project-workspace .project-card *,
  .project-workspace .project-list-row * {
    min-width: 0 !important;
  }

  .project-workspace .fd203-project-card h3,
  .project-workspace .project-board-card h3,
  .project-workspace .project-card h3,
  .project-workspace .project-list-row h3,
  .project-workspace .fd203-project-card strong,
  .project-workspace .project-board-card strong {
    max-width: 100% !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    line-height: 1.35 !important;
  }

  .project-workspace .fd203-project-card .fd203-card-head,
  .project-workspace .fd203-project-card .project-card-title,
  .project-workspace .project-board-card-top,
  .project-workspace .project-card-title,
  .project-workspace .project-board-meta,
  .project-workspace .project-board-stats {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .project-workspace .fd203-project-card .fd203-card-head > *,
  .project-workspace .project-board-card-top > *,
  .project-workspace .project-card-title > * {
    min-width: 0 !important;
  }

  .project-workspace .fd203-project-card .fd203-card-actions,
  .project-workspace .project-board-actions,
  .project-workspace .project-focus-actions,
  .project-workspace .project-list-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 7px !important;
    justify-content: flex-start !important;
  }

  .project-workspace .fd203-project-card button,
  .project-workspace .project-board-card button,
  .project-workspace .project-card button {
    min-height: 30px !important;
    padding: 6px 10px !important;
    border-radius: 11px !important;
    font-size: 12px !important;
    white-space: nowrap !important;
  }

  .project-workspace .fd203-pagination,
  .project-workspace .project-pagination-bar {
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
    margin-top: 10px !important;
  }

  .project-workspace .fd203-pagination > *,
  .project-workspace .project-pagination-bar > * {
    min-width: 0 !important;
  }

  /* 清單模式可以橫滑；卡片模式不可以橫滑 */
  .project-workspace .fd203-project-table {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .project-workspace .fd203-project-table-head,
  .project-workspace .fd203-project-row {
    min-width: 780px !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
  }
}

@media (min-width: 761px) and (max-width: 860px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: 1fr 1fr !important;
  }
}
/* FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-100";
  data.version = "20.4.100";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-100";
    data.packages[""].version = "20.4.100";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.100 專案卡片小筆電修正 patch 已完成");
