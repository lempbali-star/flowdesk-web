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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.111'");

const marker = "FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW_START */
/* v20.4.111
   專案管理分頁列強制下移：
   修正分頁列浮在卡片中間、蓋住第二排卡片。
*/

/* 先讓專案列表容器變成正常 block flow */
html body #root .project-workspace .fd203-project-list-pane,
html body #root .project-workspace .fd203-project-list-pane.full,
html body #root .project-workspace [class*="project-list-pane"],
html body #root .project-workspace [class*="project-list"] {
  overflow: visible !important;
}

/* 卡片列表下方預留空間，避免分頁列視覺壓住下一排 */
html body #root .project-workspace .fd203-project-card-list,
html body #root .project-workspace .fd203-project-card-list.expanded-gantt,
html body #root .project-workspace [class*="project-card-list"],
html body #root .project-workspace [class*="card-list"] {
  position: relative !important;
  z-index: 1 !important;
  margin-bottom: 26px !important;
  padding-bottom: 0 !important;
  overflow: visible !important;
}

/* 這次不只打 project 專用 class，也打所有在專案頁裡的 pagination class */
html body #root .project-workspace .fd20483-pagination,
html body #root .project-workspace .fd20483-pagination-controls,
html body #root .project-workspace .fd203-pagination,
html body #root .project-workspace .fd203-pagination-controls,
html body #root .project-workspace .project-pagination-bar,
html body #root .project-workspace .project-pagination-controls,
html body #root .project-workspace [class*="pagination"] {
  position: static !important;
  float: none !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  translate: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  z-index: 1 !important;
}

/* 分頁外框：強制獨立成一整列，放在列表後面 */
html body #root .project-workspace .fd20483-pagination,
html body #root .project-workspace .fd203-pagination,
html body #root .project-workspace .project-pagination-bar {
  clear: both !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 10px !important;

  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;

  margin-top: 20px !important;
  margin-bottom: 0 !important;
  padding: 12px 14px !important;

  border-radius: 18px !important;
  background: #ffffff !important;
  opacity: 1 !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .06) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  pointer-events: auto !important;
}

/* 內部控制列不要自己靠右浮上去 */
html body #root .project-workspace .fd20483-pagination-controls,
html body #root .project-workspace .fd203-pagination-controls,
html body #root .project-workspace .project-pagination-controls {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  width: auto !important;
  max-width: 100% !important;
}

/* 所有分頁按鈕取消浮動 */
html body #root .project-workspace .fd20483-pagination button,
html body #root .project-workspace .fd203-pagination button,
html body #root .project-workspace .project-pagination-bar button,
html body #root .project-workspace [class*="pagination"] button {
  position: static !important;
  float: none !important;
  transform: none !important;
  translate: none !important;
  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
}

/* 把可能造成白色半透明浮層的 pseudo element 關掉 */
html body #root .project-workspace .fd20483-pagination::before,
html body #root .project-workspace .fd20483-pagination::after,
html body #root .project-workspace .fd203-pagination::before,
html body #root .project-workspace .fd203-pagination::after,
html body #root .project-workspace .project-pagination-bar::before,
html body #root .project-workspace .project-pagination-bar::after,
html body #root .project-workspace [class*="pagination"]::before,
html body #root .project-workspace [class*="pagination"]::after {
  display: none !important;
  content: none !important;
}

/* 如果分頁列剛好被渲染在卡片列表之前，至少不要蓋卡片 */
html body #root .project-workspace .fd20483-pagination + .fd203-project-card-list,
html body #root .project-workspace .fd203-pagination + .fd203-project-card-list,
html body #root .project-workspace .project-pagination-bar + .fd203-project-card-list {
  margin-top: 18px !important;
}

/* 小筆電與平板：正常換行，不漂浮 */
@media (min-width: 761px) and (max-width: 1360px) {
  html body #root .project-workspace .fd20483-pagination,
  html body #root .project-workspace .fd203-pagination,
  html body #root .project-workspace .project-pagination-bar {
    justify-content: space-between !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  html body #root .project-workspace .fd20483-pagination,
  html body #root .project-workspace .fd203-pagination,
  html body #root .project-workspace .project-pagination-bar {
    align-items: stretch !important;
    justify-content: flex-start !important;
  }

  html body #root .project-workspace .fd20483-pagination-controls,
  html body #root .project-workspace .fd203-pagination-controls,
  html body #root .project-workspace .project-pagination-controls {
    justify-content: flex-start !important;
    width: 100% !important;
  }
}
/* FLOWDESK_V20_4_111_PROJECT_PAGINATION_FORCE_BELOW_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-111";
  data.version = "20.4.111";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-111";
    data.packages[""].version = "20.4.111";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.111 專案分頁列強制下移 patch 已完成");
