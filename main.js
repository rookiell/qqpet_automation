// macOS: 全局 EPIPE 防护 — 必须在最前面
// 原项目有几百个 console.log，管道断开时会 EPIPE 崩溃
const _origLog = console.log;
const _origErr = console.error;
const _origWarn = console.warn;
const safeFn = (fn) => (...args) => { try { fn(...args); } catch (e) { if (e?.code !== "EPIPE") throw e; } };
console.log = safeFn(_origLog);
console.error = safeFn(_origErr);
console.warn = safeFn(_origWarn);
process.stdout?.on?.("error", () => {});
process.stderr?.on?.("error", () => {});
process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE" || err.message?.includes("EPIPE")) return;
});

const { app } = require("electron");
const path = require("path");

// 启动标记：用来确认当前进程跑的是「项目源码」还是「打包后的 app.asar」。
// 排查时就靠它区分——打在 app.asar 里的是旧代码，改了 src 也不会生效。
try {
  require("fs").appendFileSync(
    "/tmp/qqpet-boot.log",
    `${new Date().toLocaleString()} pid=${process.pid} asar=${String(__dirname).includes(
      "app.asar",
    )} dir=${__dirname}\n`,
  );
} catch (e) {}

const gotTheLock = app.requestSingleInstanceLock();

// 禁用测试后门
global.$test = false;

global.initData = {};

let useTool = null;
let tool = ["floatStyle"];

try {
  let e = process.argv;
  for (let t in tool) {
    let a = false;
    for (let o in e) {
      if (e[o].indexOf(tool[t]) !== -1) {
        initData.NODE_TOOL = tool[t];
        a = true;
        break;
      }
    }
    if (a) break;
  }
} catch (e) {}

if (process?.env?.NODE_TOOL) {
  initData.NODE_TOOL = process.env.NODE_TOOL;
}

if (initData?.NODE_TOOL && typeof initData?.NODE_TOOL === "string") {
  useTool = require("./src/windows/tool/" + initData.NODE_TOOL + "/main.js");
}

const createWindow = async () => {
  require("./src/ini/init.js");
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
  process.on("unhandledRejection", function (e, t) {});
  app.setAppUserModelId("pet");

  if (gotTheLock) {
    if (useTool) {
      useTool.cleate("only");
    } else {
      require("./src/ini/doMain.js");
      const { startDataWatcher } = require("./src/ini/dataWatcher.js");
      startDataWatcher();
    }
  } else {
    app.exit(true);
  }
};

// macOS: 不加载 PepFlash DLL（使用 Ruffle WASM 替代）
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
// 渔场/后花园等弹窗以 file:// 加载，并用 iframe 加载本地 http 服务里的 SWF。
// 不加这个开关时，file:// 页面无法访问 http:// iframe 的 contentWindow，
// 宠物数据（元宝、鱼苗等）就无法注入到 SWF，导致无法购买/投放鱼苗。
app.commandLine.appendSwitch("allow-file-access-from-files");

app.whenReady().then(() => {
  createWindow();
});
