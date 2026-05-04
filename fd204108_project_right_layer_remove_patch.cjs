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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.108'");

const marker = "FLOWDESK_V20_4_108_PROJECT_RIGHT_LAYER_REMOVE";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_108_PROJECT_RIGHT_LAYER_REMOVE_START */
/* v20.4.108
   專案管理右側多餘空層移除。
   只針對專案管理卡片，不動其他模組、不動彈窗分頁、不動甘特圖邏輯。
*/

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: visible !important;
}

/* 專案卡片本體取消可能造成右側 rail 的分欄 */
.project-workspace .fd203-project-card,
.project-workspace .project-board-card,
.project-workspace .project-card {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  grid-template-columns: 1fr !important;
  grid-auto-flow: row !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

/* 所有第一層子元素都回到主欄，不允許自己佔右側欄 */
.project-workspace .fd203-project-card > *,
.project-workspace .project-board-card > *,
.project-workspace .project-card > * {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

/* 取消卡片右側 rail / side / aside 類型容器的視覺層 */
.project-workspace .fd203-project-card [class*="side"],
.project-workspace .fd203-project-card [class*="right"],
.project-workspace .fd203-project-card [class*="rail"],
.project-workspace .fd203-project-card [class*="aside"],
.project-workspace .project-board-card [class*="side"],
.project-workspace .project-board-card [class*="right"],
.project-workspace .project-board-card [class*="rail"],
.project-workspace .project-board-card [class*="aside"],
.project-workspace .project-card [class*="side"],
.project-workspace .project-card [class*="right"],
.project-workspace .project-card [class*="rail"],
.project-workspace .project-card [class*="aside"] {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 8px 0 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 若右側空層是 pseudo element 產生，直接關掉 */
.project-workspace .fd203-project-card::before,
.project-workspace .fd203-project-card::after,
.project-workspace .project-board-card::before,
.project-workspace .project-board-card::after,
.project-workspace .project-card::before,
.project-workspace .project-card::after {
  display: none !important;
  content: none !important;
}

/* 卡片內部所有 grid 都不得撐出右側空欄 */
.project-workspace .fd203-project-card [class*="grid"],
.project-workspace .fd203-project-card [class*="layout"],
.project-workspace .fd203-project-card [class*="body"],
.project-workspace .fd203-project-card [class*="content"],
.project-workspace .fd203-project-card [class*="main"],
.project-workspace .project-board-card [class*="grid"],
.project-workspace .project-board-card [class*="layout"],
.project-workspace .project-board-card [class*="body"],
.project-workspace .project-board-card [class*="content"],
.project-workspace .project-board-card [class*="main"],
.project-workspace .project-card [class*="grid"],
.project-workspace .project-card [class*="layout"],
.project-workspace .project-card [class*="body"],
.project-workspace .project-card [class*="content"],
.project-workspace .project-card [class*="main"] {
  grid-template-columns: 1fr !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

/* 文字、badge、任務摘要都維持水平可讀 */
.project-workspace .fd203-project-card *,
.project-workspace .project-board-card *,
.project-workspace .project-card * {
  min-width: 0 !important;
  writing-mode: horizontal-tb !important;
}

.project-workspace .fd203-project-card h3,
.project-workspace .project-board-card h3,
.project-workspace .project-card h3,
.project-workspace .fd203-project-card strong,
.project-workspace .project-board-card strong,
.project-workspace .project-card strong {
  white-space: normal !important;
  word-break: normal !important;
  overflow-wrap: anywhere !important;
  line-height: 1.35 !important;
}

/* 統計區保持同層，不再往右側掛出去 */
.project-workspace .fd203-project-card [class*="kpi"],
.project-workspace .fd203-project-card [class*="metric"],
.project-workspace .fd203-project-card [class*="stat"],
.project-workspace .project-board-card [class*="kpi"],
.project-workspace .project-board-card [class*="metric"],
.project-workspace .project-board-card [class*="stat"],
.project-workspace .project-card [class*="kpi"],
.project-workspace .project-card [class*="metric"],
.project-workspace .project-card [class*="stat"] {
  max-width: 100% !important;
  min-width: 0 !important;
}

/* 小筆電維持可讀欄寬，不硬塞太多張 */
@media (min-width: 761px) and (max-width: 1360px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)) !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .fd203-project-card-list,
  .project-workspace .fd203-project-card-list.expanded-gantt {
    grid-template-columns: 1fr !important;
  }
}
/* FLOWDESK_V20_4_108_PROJECT_RIGHT_LAYER_REMOVE_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-108";
  data.version = "20.4.108";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-108";
    data.packages[""].version = "20.4.108";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.108 專案管理右側空層移除 patch 已完成");
