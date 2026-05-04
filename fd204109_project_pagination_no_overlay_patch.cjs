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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.109'");

const marker = "FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY_START */
/* v20.4.109
   專案管理分頁列修正：
   分頁列回到卡片列表下方，不再浮在卡片上。
   只處理專案管理，不動其他模組、不動彈窗、不動甘特圖。
*/

.project-workspace .fd203-project-list-pane,
.project-workspace .fd203-project-list-pane.full {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: visible !important;
}

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  order: 10 !important;
  position: relative !important;
  z-index: 1 !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

.project-workspace .fd203-pagination,
.project-workspace .project-pagination-bar,
.project-workspace .fd20483-pagination {
  order: 20 !important;
  position: static !important;
  inset: auto !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  transform: none !important;
  translate: none !important;
  z-index: 2 !important;

  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;

  margin: 14px 0 0 !important;
  padding: 10px 12px !important;
  border-radius: 18px !important;
  background: rgba(255, 255, 255, .94) !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .06) !important;
}

.project-workspace .fd203-pagination *,
.project-workspace .project-pagination-bar *,
.project-workspace .fd20483-pagination * {
  min-width: 0 !important;
}

/* 分頁內按鈕正常排列，不要漂浮到卡片中央 */
.project-workspace .fd203-pagination button,
.project-workspace .project-pagination-bar button,
.project-workspace .fd20483-pagination button {
  position: static !important;
  transform: none !important;
  min-height: 34px !important;
  padding: 7px 12px !important;
  border-radius: 999px !important;
  white-space: nowrap !important;
}

/* 若舊樣式把分頁控制列設成絕對定位，一併拉回來 */
.project-workspace .fd203-pagination-controls,
.project-workspace .project-pagination-controls,
.project-workspace .fd20483-pagination-controls {
  position: static !important;
  inset: auto !important;
  transform: none !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  width: 100% !important;
}

/* 避免右下回頂端按鈕和分頁重疊 */
.project-workspace .scroll-top-button,
.project-workspace .back-to-top,
.project-workspace .floating-action-button,
.project-workspace .fd-scroll-top {
  bottom: 92px !important;
}

/* 小筆電時分頁靠下正常換行 */
@media (min-width: 761px) and (max-width: 1360px) {
  .project-workspace .fd203-pagination,
  .project-workspace .project-pagination-bar,
  .project-workspace .fd20483-pagination {
    margin-top: 12px !important;
  }

  .project-workspace .fd203-pagination-controls,
  .project-workspace .project-pagination-controls,
  .project-workspace .fd20483-pagination-controls {
    justify-content: flex-end !important;
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  .project-workspace .fd203-pagination,
  .project-workspace .project-pagination-bar,
  .project-workspace .fd20483-pagination {
    align-items: stretch !important;
  }

  .project-workspace .fd203-pagination-controls,
  .project-workspace .project-pagination-controls,
  .project-workspace .fd20483-pagination-controls {
    justify-content: flex-start !important;
  }
}
/* FLOWDESK_V20_4_109_PROJECT_PAGINATION_NO_OVERLAY_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-109";
  data.version = "20.4.109";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-109";
    data.packages[""].version = "20.4.109";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.109 專案管理分頁列不覆蓋卡片 patch 已完成");
