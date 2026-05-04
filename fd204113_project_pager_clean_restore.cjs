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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.113'");

/*
  還原前面錯誤把分頁 class 改掉的地方。
  不改 onClick、不改分頁邏輯，只恢復原本 class。
*/
app = app.replaceAll(
  'className="fd204112-project-pager-inline"',
  'className="project-pagination-bar fd203-pagination"'
);

app = app.replaceAll(
  'className="fd204112-project-pager-actions"',
  'className="project-pagination-actions"'
);

app = app.replaceAll(
  'className="project-pagination-bar fd203-pagination fd204113-project-pager-inline"',
  'className="project-pagination-bar fd203-pagination"'
);

app = app.replaceAll(
  'className="project-pagination-actions fd204113-project-pager-actions"',
  'className="project-pagination-actions"'
);

/*
  清掉 v20.4.109 ~ v20.4.113 專案分頁相關補丁。
*/
const removeMarkers = [
  "FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY",
  "FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT",
  "FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW",
  "FLOWDESK_V20_4_112_PROJECT_PAGER_INLINE",
  "FLOWDESK_V20_4_113_PROJECT_PAGER_RESTORE_ACTIONS",
  "FLOWDESK_V20_4_113_PROJECT_PAGER_CLEAN_RESTORE"
];

for (const marker of removeMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

/*
  只做最小版面修正：
  保留原本分頁 class 與功能，不替換 JSX。
  只避免分頁浮在卡片中間。
*/
const patch = `
/* FLOWDESK_V20_4_113_PROJECT_PAGER_CLEAN_RESTORE_START */
/* v20.4.113 clean
   專案分頁功能恢復版：
   不改分頁 JSX、不改 onClick，只修分頁位置。
*/

.project-workspace .fd203-project-list-pane,
.project-workspace .fd203-project-list-pane.full {
  overflow: visible !important;
}

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  position: relative !important;
  z-index: 1 !important;
  margin-bottom: 18px !important;
  overflow: visible !important;
}

.project-workspace .project-pagination-bar.fd203-pagination {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  z-index: 1 !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 10px !important;

  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;

  margin: 18px 0 0 !important;
  padding: 12px 14px !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .06) !important;

  pointer-events: auto !important;
}

.project-workspace .project-pagination-actions {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;

  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: wrap !important;
  gap: 8px !important;

  pointer-events: auto !important;
}

.project-workspace .project-pagination-actions button,
.project-workspace .project-pagination-bar.fd203-pagination button {
  position: static !important;
  transform: none !important;
  translate: none !important;
  pointer-events: auto !important;
}

.project-workspace .project-pagination-bar.fd203-pagination::before,
.project-workspace .project-pagination-bar.fd203-pagination::after {
  display: none !important;
  content: none !important;
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .project-pagination-bar.fd203-pagination {
    align-items: stretch !important;
    justify-content: flex-start !important;
  }

  .project-workspace .project-pagination-actions {
    justify-content: flex-start !important;
    width: 100% !important;
  }
}
/* FLOWDESK_V20_4_113_PROJECT_PAGER_CLEAN_RESTORE_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-113";
  data.version = "20.4.113";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-113";
    data.packages[""].version = "20.4.113";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.113 clean 專案分頁修正完成");
