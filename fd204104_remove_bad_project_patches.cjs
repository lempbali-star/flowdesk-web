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

app = app.replace(/const FLOWDESK_APP_VERSION = '20\.\d+\.\d+'/g, "const FLOWDESK_APP_VERSION = '20.4.104'");

const badProjectPatchMarkers = [
  "FLOWDESK_V20_4_96_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_97_TABLET_LAPTOP_PROJECT_LAYOUT_FIX",
  "FLOWDESK_V20_4_98_PROJECT_TASKS_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_99_PROJECT_MAIN_VISIBLE_TABLET_FIX",
  "FLOWDESK_V20_4_100_PROJECT_CARD_TABLET_GRID_FIX",
  "FLOWDESK_V20_4_101_PROJECT_CARD_READABLE_TABLET_FIX",
  "FLOWDESK_V20_4_102_PROJECT_MODAL_TABS_RECOVERY",
  "FLOWDESK_V20_4_103_PROJECT_COMPACT_LAPTOP_MODE"
];

for (const marker of badProjectPatchMarkers) {
  const regex = new RegExp("\\/\\* " + marker + "_START \\*\\/[\\s\\S]*?\\/\\* " + marker + "_END \\*\\/", "g");
  css = css.replace(regex, "");
}

css = css.replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";

write(appPath, app);
write(cssPath, css);

for (const file of [pkgPath, lockPath]) {
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(read(file));
  data.name = "flowdesk-product-v20-4-104";
  data.version = "20.4.104";

  if (file === lockPath && data.packages && data.packages[""]) {
    data.packages[""].name = "flowdesk-product-v20-4-104";
    data.packages[""].version = "20.4.104";
  }

  write(file, JSON.stringify(data, null, 2) + "\n");
}

console.log("v20.4.104 已清掉專案小螢幕錯誤補丁");
