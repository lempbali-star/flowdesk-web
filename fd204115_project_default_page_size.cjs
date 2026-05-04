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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.115'");

/*
  專案管理預設每頁改 5 筆。
  只針對 project page size，不動其他模組。
*/
let changeCount = 0;

app = app.replace(
  /const\s+\[projectPageSize,\s*setProjectPageSize\]\s*=\s*useState\(\s*10\s*\)/g,
  () => {
    changeCount++;
    return "const [projectPageSize, setProjectPageSize] = useState(5)";
  }
);

app = app.replace(
  /const\s+\[projectPageSize,\s*setProjectPageSize\]\s*=\s*useState\(\s*20\s*\)/g,
  () => {
    changeCount++;
    return "const [projectPageSize, setProjectPageSize] = useState(5)";
  }
);

/*
  每頁選項補上 5。
*/
app = app.replaceAll(
  "[10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)",
  "[5, 10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)"
);

app = app.replaceAll(
  "[10,20,30,40,50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)",
  "[5, 10, 20, 30, 40, 50].map((size) => <option key={size} value={size}>每頁 {size} 筆</option>)"
);

/*
  若目前已經是 v20.4.114 的採購樣式分頁，保留；只補強分頁列間距。
*/
const marker = "FLOWDESK_V20_4_115_PROJECT_DEFAULT_PAGE_SIZE";
const oldPatchRegex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
css = css.replace(oldPatchRegex, "");

const patch = `
/* FLOWDESK_V20_4_115_PROJECT_DEFAULT_PAGE_SIZE_START */
/* v20.4.115
   專案管理預設每頁 5 筆，讓分頁列正常出現在第一屏附近。
*/

.project-workspace .fd204114-project-pagination,
.project-workspace .project-pagination-bar.fd203-pagination {
  margin-top: 16px !important;
  margin-bottom: 0 !important;
}

.project-workspace .fd203-project-card-list,
.project-workspace .fd203-project-card-list.expanded-gantt {
  margin-bottom: 12px !important;
}
/* FLOWDESK_V20_4_115_PROJECT_DEFAULT_PAGE_SIZE_END */
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-115";
  data.version = "20.4.115";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-115";
    data.packages[""].version = "20.4.115";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.115 專案預設每頁 5 筆修正完成，projectPageSize 替換數量:", changeCount);
