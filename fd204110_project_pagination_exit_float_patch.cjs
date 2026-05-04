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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.110'");

const marker = "FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT_START */
/* v20.4.110
   專案管理分頁列退出浮層：
   修正分頁列蓋在第二排專案卡片上的問題。
   只處理專案管理，不動彈窗、不動甘特圖、不動其他模組。
*/

/* 專案列表容器回到一般文件流，不讓分頁用 sticky / fixed 蓋卡片 */
html body #root .project-workspace .fd203-project-list-pane,
html body #root .project-workspace .fd203-project-list-pane.full {
  position: relative !important;
  display: block !important;
  overflow: visible !important;
  padding-bottom: 16px !important;
}

/* 卡片列表先完整排完，再接分頁 */
html body #root .project-workspace .fd203-project-card-list,
html body #root .project-workspace .fd203-project-card-list.expanded-gantt {
  position: relative !important;
  z-index: 1 !important;
  display: grid !important;
  margin-bottom: 18px !important;
  padding-bottom: 0 !important;
  overflow: visible !important;
}

/* 分頁列強制回到卡片下方 */
html body #root .project-workspace .project-pagination-bar,
html body #root .project-workspace .fd203-pagination,
html body #root .project-workspace .fd20483-pagination {
  position: relative !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  translate: none !important;

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
  opacity: 1 !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .06) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;

  z-index: 1 !important;
  pointer-events: auto !important;
}

/* 右側頁碼按鈕列也取消任何浮動定位 */
html body #root .project-workspace .project-pagination-bar > *,
html body #root .project-workspace .fd203-pagination > *,
html body #root .project-workspace .fd20483-pagination > *,
html body #root .project-workspace .project-pagination-controls,
html body #root .project-workspace .fd203-pagination-controls,
html body #root .project-workspace .fd20483-pagination-controls {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  translate: none !important;
  min-width: 0 !important;
  z-index: auto !important;
}

/* 分頁按鈕正常排，不要浮到卡片中央 */
html body #root .project-workspace .project-pagination-bar button,
html body #root .project-workspace .fd203-pagination button,
html body #root .project-workspace .fd20483-pagination button {
  position: static !important;
  transform: none !important;
  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
}

/* 若舊版使用半透明遮罩效果，強制移除 */
html body #root .project-workspace .project-pagination-bar::before,
html body #root .project-workspace .project-pagination-bar::after,
html body #root .project-workspace .fd203-pagination::before,
html body #root .project-workspace .fd203-pagination::after,
html body #root .project-workspace .fd20483-pagination::before,
html body #root .project-workspace .fd20483-pagination::after {
  display: none !important;
  content: none !important;
}

/* 小筆電分頁正常換行，不蓋內容 */
@media (min-width: 761px) and (max-width: 1360px) {
  html body #root .project-workspace .project-pagination-bar,
  html body #root .project-workspace .fd203-pagination,
  html body #root .project-workspace .fd20483-pagination {
    align-items: center !important;
    justify-content: space-between !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  html body #root .project-workspace .project-pagination-bar,
  html body #root .project-workspace .fd203-pagination,
  html body #root .project-workspace .fd20483-pagination {
    align-items: stretch !important;
    justify-content: flex-start !important;
  }
}
/* FLOWDESK_V20_4_110_PROJECT_PAGINATION_EXIT_FLOAT_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-110";
  data.version = "20.4.110";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-110";
    data.packages[""].version = "20.4.110";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.110 專案管理分頁退出浮層 patch 已完成");
