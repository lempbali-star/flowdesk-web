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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.116'");

const stateStart = app.indexOf("  const [projectPageSize, setProjectPageSize]");
const stateEnd = app.indexOf("  const [projectPageInput", stateStart);

if (stateStart === -1 || stateEnd === -1) {
  throw new Error("找不到 projectPageSize 狀態區塊，停止修改，避免改錯。");
}

const newProjectPageSizeState = `  const [projectPageSize, setProjectPageSize] = useState(() => {
    if (typeof window === 'undefined') return 5

    const migrationKey = 'flowdesk-project-page-size-default-v204116'
    const pageSizeKey = 'flowdesk-project-page-size-v20316'
    const pageKey = 'flowdesk-project-page-v20316'

    if (window.localStorage.getItem(migrationKey) !== 'done') {
      window.localStorage.setItem(pageSizeKey, '5')
      window.localStorage.setItem(pageKey, '1')
      window.localStorage.setItem(migrationKey, 'done')
      return 5
    }

    const saved = Number(window.localStorage.getItem(pageSizeKey) || 5)
    return [5, 10, 20, 30, 40, 50].includes(saved) ? saved : 5
  })
`;

app = app.slice(0, stateStart) + newProjectPageSizeState + app.slice(stateEnd);

/*
  專案管理每頁選項補上 5。
*/
let optionCount = 0;
app = app.replace(
  /(<select[^>]*value=\{projectPageSize\}[\s\S]*?>\s*)\{\[[^\]]+\]\.map\(\(size\) => <option key=\{size\} value=\{size\}>每頁 \{size\} 筆<\/option>\)\}(\s*<\/select>)/g,
  (match, before, after) => {
    optionCount++;
    return `${before}{[5, 10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)}${after}`;
  }
);

if (optionCount === 0) {
  throw new Error("找不到專案每頁筆數下拉選單，停止修改。");
}

const marker = "FLOWDESK_V20_4_116_PROJECT_PAGE_SIZE_FORCE_5";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_116_PROJECT_PAGE_SIZE_FORCE_5_START */
/* v20.4.116
   專案管理每頁 5 筆強制套用。
*/

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  margin-bottom: 14px !important;
}

.project-workspace .fd204114-project-pagination,
.project-workspace .project-pagination-bar.fd203-pagination {
  margin-top: 16px !important;
}
/* FLOWDESK_V20_4_116_PROJECT_PAGE_SIZE_FORCE_5_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-116";
  data.version = "20.4.116";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-116";
    data.packages[""].version = "20.4.116";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.116 專案每頁 5 筆強制套用完成，選項替換數量:", optionCount);
