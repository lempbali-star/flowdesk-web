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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.101'");

const marker = "FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX_START */
/* v20.4.101
   專案管理平板 / 小筆電卡片可讀性修正：
   卡片不要太窄、標題不要直排、分頁不要浮上來壓住內容。
*/

@media (min-width: 761px) and (max-width: 1360px), (min-width: 761px) and (max-height: 860px) {
  .project-workspace .fd203-project-list-pane.full,
  .project-workspace .fd203-project-list-pane {
    overflow: visible !important;
  }

  /* 卡片改成較寬欄位，不再硬塞 4~5 張 */
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important;
    gap: 12px !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
  }

  /* 卡片本體 */
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
  }

  /* 卡片上方資訊改上下排列，避免專案名稱被擠成直排 */
  .project-workspace .fd203-project-card .fd203-card-head,
  .project-workspace .fd203-project-card .project-card-title,
  .project-workspace .project-board-card-top,
  .project-workspace .project-card-title {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    align-items: start !important;
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
    overflow-wrap: anywhere !important;
    word-break: normal !important;
    white-space: normal !important;
    line-height: 1.35 !important;
    font-size: 17px !important;
  }

  /* ID / 狀態 / 優先 badge 改成可換行，不擠標題 */
  .project-workspace .fd203-project-card .record-id,
  .project-workspace .project-board-card .record-id,
  .project-workspace .project-card .record-id,
  .project-workspace .fd203-priority-chip,
  .project-workspace .badge,
  .project-workspace .status-pill {
    display: inline-flex !important;
    width: auto !important;
    max-width: 100% !important;
    writing-mode: horizontal-tb !important;
    white-space: nowrap !important;
    line-height: 1.2 !important;
  }

  .project-workspace .project-board-meta,
  .project-workspace .project-board-stats,
  .project-workspace .fd203-card-meta,
  .project-workspace .fd203-project-card-meta {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
  }

  /* 卡片內統計不要變成一條一條直排 */
  .project-workspace .fd203-project-card .fd203-card-kpis,
  .project-workspace .project-board-stats,
  .project-workspace .project-focus-kpis,
  .project-workspace .fd203-kpis {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  .project-workspace .fd203-project-card .fd203-card-kpis article,
  .project-workspace .project-board-stats article,
  .project-workspace .project-focus-kpis article,
  .project-workspace .fd203-kpis article {
    min-width: 0 !important;
    padding: 8px !important;
    border-radius: 14px !important;
  }

  /* 卡片按鈕與標籤列 */
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

  /* 分頁不要浮上去蓋卡片 */
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
    background: rgba(255, 255, 255, .92) !important;
  }

  .project-workspace .fd203-pagination *,
  .project-workspace .project-pagination-bar * {
    min-width: 0 !important;
  }

  /* 回到頂端按鈕不要壓到分頁 */
  .project-workspace .scroll-top-button,
  .project-workspace .back-to-top,
  .project-workspace .floating-action-button {
    bottom: 88px !important;
  }
}

@media (min-width: 761px) and (max-width: 1100px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: repeat(2, minmax(320px, 1fr)) !important;
  }
}

@media (min-width: 761px) and (max-width: 860px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: 1fr !important;
  }
}
/* FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-101";
  data.version = "20.4.101";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-101";
    data.packages[""].version = "20.4.101";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.101 專案卡片小筆電可讀性修正 patch 已完成");
