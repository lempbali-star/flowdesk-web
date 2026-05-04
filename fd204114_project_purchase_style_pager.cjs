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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.114'");

/*
  1) 專案分頁恢復原本事件，但改成採購同款分頁樣式。
  不改 onClick、不改 setProjectPage、不改 projectPageTotal。
*/
let pagerCount = 0;
let actionCount = 0;

app = app.replace(
  /className="[^"]*(project-pagination-bar|fd204112-project-pager-inline|fd204113-project-pager-inline)[^"]*"/g,
  () => {
    pagerCount++;
    return 'className="purchase-pagination fd204114-project-pagination"';
  }
);

app = app.replace(
  /className="[^"]*(project-pagination-actions|fd204112-project-pager-actions|fd204113-project-pager-actions)[^"]*"/g,
  () => {
    actionCount++;
    return 'className="fd204114-project-pagination-actions"';
  }
);

/*
  2) 讓目前 10 筆資料也能測分頁：
  專案每頁筆數增加 5。
*/
app = app.replace(
  /\{\[10,\s*20,\s*30,\s*40,\s*50\]\.map\(\(size\) => <option key=\{size\} value=\{size\}>每頁 \{size\} 筆<\/option>\)\}/g,
  "{[5, 10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)}"
);

if (pagerCount === 0) {
  throw new Error("找不到專案分頁外層 class，停止修改，避免又改錯。");
}

console.log("專案分頁外層替換數量:", pagerCount);
console.log("專案分頁按鈕列替換數量:", actionCount);

/*
  3) 清掉前面錯誤分頁補丁。
*/
const removeMarkers = [
  "FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY",
  "FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT",
  "FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW",
  "FLOWDESK_V20_4_112_PROJECT_PAGER_INLINE",
  "FLOWDESK_V20_4_113_PROJECT_PAGER_RESTORE_ACTIONS",
  "FLOWDESK_V20_4_113_PROJECT_PAGER_CLEAN_RESTORE",
  "FLOWDESK_V20_4_114_PROJECT_PURCHASE_STYLE_PAGER"
];

for (const marker of removeMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

const patch = `
/* FLOWDESK_V20_4_114_PROJECT_PURCHASE_STYLE_PAGER_START */
/* v20.4.114
   專案分頁照採購分頁樣式重做。
   保留原本分頁事件，只改外觀與位置。
*/

.project-workspace .fd203-project-list-pane,
.project-workspace .fd203-project-list-pane.full {
  overflow: visible !important;
}

.project-workspace .fd203-project-list-pane::before,
.project-workspace .fd203-project-list-pane::after,
.project-workspace .fd203-project-card-list::before,
.project-workspace .fd203-project-card-list::after {
  display: none !important;
  content: none !important;
}

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  position: relative !important;
  z-index: 1 !important;
  margin-bottom: 12px !important;
  overflow: visible !important;
}

.project-workspace .fd204114-project-pagination {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  float: none !important;
  clear: both !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 10px !important;

  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;

  margin: 16px 0 0 !important;
  padding: 12px 14px !important;

  border: 1px solid rgba(226, 232, 240, .9) !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .06) !important;

  opacity: 1 !important;
  z-index: 1 !important;
  pointer-events: auto !important;
}

.project-workspace .fd204114-project-pagination > div:first-child {
  min-width: 180px !important;
  color: #64748b !important;
  font-size: 13px !important;
  line-height: 1.45 !important;
}

.project-workspace .fd204114-project-pagination > div:first-child strong {
  color: #1d4ed8 !important;
  font-size: 18px !important;
  font-weight: 950 !important;
}

.project-workspace .fd204114-project-pagination > div:first-child span {
  display: block !important;
  margin-top: 2px !important;
}

.project-workspace .fd204114-project-pagination-actions {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  float: none !important;

  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: wrap !important;
  gap: 8px !important;

  min-width: 0 !important;
  max-width: 100% !important;
  pointer-events: auto !important;
}

.project-workspace .fd204114-project-pagination-actions button {
  position: static !important;
  transform: none !important;
  translate: none !important;

  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
  pointer-events: auto !important;
}

.project-workspace .fd204114-project-pagination-actions .fd203-page-jump {
  position: static !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;

  min-height: 34px !important;
  padding: 5px 10px !important;

  border: 1px solid rgba(226, 232, 240, .9) !important;
  border-radius: 999px !important;
  background: #fff !important;
}

.project-workspace .fd204114-project-pagination-actions .fd203-page-jump input {
  width: 58px !important;
  min-height: 28px !important;
  text-align: center !important;
  border-radius: 999px !important;
}

.project-workspace .fd204114-project-pagination::before,
.project-workspace .fd204114-project-pagination::after,
.project-workspace .fd204114-project-pagination-actions::before,
.project-workspace .fd204114-project-pagination-actions::after {
  display: none !important;
  content: none !important;
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .fd204114-project-pagination {
    align-items: stretch !important;
    justify-content: flex-start !important;
  }

  .project-workspace .fd204114-project-pagination-actions {
    justify-content: flex-start !important;
    width: 100% !important;
  }
}
/* FLOWDESK_V20_4_114_PROJECT_PURCHASE_STYLE_PAGER_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-114";
  data.version = "20.4.114";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-114";
    data.packages[""].version = "20.4.114";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.114 專案分頁照採購樣式重做完成");
