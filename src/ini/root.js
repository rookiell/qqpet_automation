const _require = eval("require");
// 本地源码改得勤（特别是 html/css/js），一旦被 Chromium 缓存，
// 改了代码窗口里却还是旧页面，很难排查。页面类资源禁用缓存。
const PAGE_NO_CACHE = {
  setHeaders: (res, p) => {
    if (/\.(?:html?|js|css|json)$/i.test(p)) {
      res.setHeader("Cache-Control", "no-store, must-revalidate");
    }
  },
};
// 本机无法进行js与flash交互有安全机制问题， 通过开端口形式进行flash页面引入
const createMain = (fn, post, ip, fileName, none) => {
  if (none) {
    fn(post, ip, fileName);
    return;
  }
  const express = _require("express");
  const app = express();
  const path = _require("path");
  app.get("/", function (req, res) {
    // res.render('index');
    res.send("this is the Homepage");
  });
  // fileName = 'u'
  let pattt = path.join(__dirname, "../../src");
  app.use("/" + fileName, express.static(pattt, PAGE_NO_CACHE));
  let aotuIp = getLocalIP();
  var server = app.listen(post, ip || aotuIp[0], function () {
    var host = server.address().address;
    var port = server.address().port;
    fn(port, host, fileName);
    console.log("express at http://%s:%s/%s", host, port, fileName);
  });
};

let device = {};
//本机websocket
const openWS = (wsPopt) => {
  let ws = _require("nodejs-websocket");
  let server = ws.createServer(function (conn) {
    conn.on("text", async function (data) {
      // 接受客户端消息 并处理
      //重写发送消息事件
      conn.sendTextJson = (option) => {
        try {
          option = JSON.stringify(option);
        } catch (error) {}
        conn.sendText(option);
      };
      try {
        data = JSON.parse(data);
      } catch (e) {}
      if (data.router == "joinDevice") {
        device[data.name] = conn;
      }
      if (data.router == "setMsg") {
        device[data.name].sendTextJson(data.data);
      }
    });
    conn.on("close", function (code, reason) {
      //code = 1001 reason= “”
    });
    conn.on("error", function (code, reason) {
      //code= 报错信息，reason = undefined
    });
  });
  server.listen(wsPopt, function () {
    console.log("websocket：" + wsPopt);
  });
};

function getLocalIP(fn) {
  const os = _require("os");
  const osType = os.type(); //系统类型
  const netInfo = os.networkInterfaces(); //网络信息
  let ip = [];
  let str = `请选择启动ip`;
  if (osType === "Windows_NT") {
    let i = 0;
    for (let dev in netInfo) {
      //win7的网络信息中显示为本地连接，win10显示为以太网
      // if (dev === '本地连接' || dev === '以太网') {
      for (let j = 0; j < netInfo[dev].length; j++) {
        if (netInfo[dev][j].family === "IPv4") {
          // ip = netInfo[dev][j].address;
          ip.push(netInfo[dev][j].address);
          str += `
第${i++}个IP：${netInfo[dev][j].address}`;
        }
      }
      // }
    }
  } else if (osType === "Linux") {
    ip = netInfo.eth0[0].address;
  } else if (osType === "Darwin") {
    // macOS: 遍历所有网络接口获取 IPv4 地址
    for (let dev in netInfo) {
      for (let j = 0; j < netInfo[dev].length; j++) {
        if (netInfo[dev][j].family === "IPv4" && !netInfo[dev][j].internal) {
          ip.push(netInfo[dev][j].address);
        }
      }
    }
    if (ip.length === 0) {
      ip.push("127.0.0.1");
    }
  } else {
    // 其他操作系统
  }
  // let chouseIpFn = () => {
  // 	const readline = _require('readline').createInterface({
  // 		input: process.stdin,
  // 		output: process.stdout,
  // 	});
  // 	readline.question(`${str}
  // 	`, name => {
  // 		let chouseIp = ip[name]
  // 		if (chouseIp) {
  // 			console.log('已选择： ' + chouseIp)
  // 			fn && fn(chouseIp)
  // 			readline.close();
  // 		} else {
  // 			console.log('请选择正确选项')
  // 			readline.close();
  // 			chouseIpFn()
  // 		}
  // 	});
  // }
  // chouseIpFn()
  return ip;
}

try {
  if (module) module.exports = { openWS, createMain };
} catch (error) {}
/**
 * 
sad
var mx:int = this.mouseX;
         var my:int = this.mouseY;
         ExternalInterface.call("API.GetCursorPositionHtml",mx,my);
         if(mx < -30)
         {
            mx = 34;
         }
         if(my < -79)
         {
            my = 0;
         }
         return new Point(mx,my);
happy peaceful
var mx:int = this.mouseX;
         var my:int = this.mouseY;
         ExternalInterface.call("API.GetCursorPositionHtml",mx,my);
         if(mx < -70)
         {
            mx = 0;
         }
         if(my < -70)
         {
            my = 0;
         }
         return new Point(mx,my);

prostrate
var mx:int = this.mouseX;
         var my:int = this.mouseY;
         ExternalInterface.call("API.GetCursorPositionHtml",mx,my);
         if(mx < -33)
         {
            mx = 35;
         }
         if(my < -83)
         {
            my = 21;
         }
         return new Point(mx,my);
upset
var mx:int = this.mouseX;
         var my:int = this.mouseY;
         ExternalInterface.call("API.GetCursorPositionHtml",mx,my);
         if(mx < -38)
         {
            mx = 29;
         }
         if(my < -68)
         {
            my = 24;
         }
         return new Point(mx,my);

 */

let fileNames = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "_",
];

let url = {
  host: "",
  port: "",
  fileName: "",
};
global.openLocalHost = (fn) => {
  if (!fn) {
    return;
  }
  if (url.host) {
    fn(url);
    return;
  }
  const express = _require("express");
  const app = express();
  const path = _require("path");
  app.get("/", function (req, res) {
    // res.render('index');
    res.send("this is the Homepage");
  });
  let fileName = upDownArr(shuffleArr(fileNames)).join("");
  // fileName = 'u'
  let pattt = path.join(__dirname, "../../src");
  app.use("/" + fileName, express.static(pattt, PAGE_NO_CACHE));
  // 这个服务只给本机 iframe 用（渔港、卧室小游戏），绑回环地址就够了。
  // 以前绑的是启动时探测到的网卡 IP：待机/休眠后 Wi-Fi 重连、切网或者开 VPN，
  // 机器地址就变了，而 iframe 的地址是启动时拼好的，于是连不上——
  // 症状正是渔港只剩外层那两个 HTML 图标、SWF 区域一片空白。
  // 127.0.0.1 不随网络变化，能根治这一类问题。
  const LOOPBACK = "127.0.0.1";
  const post = "33385";
  const listen = (port, ip, onFail) => {
    const server = app.listen(port, ip);
    let bound = false;
    server.once("error", (err) => {
      // 已经起来了之后的运行时错误不该再起一个新服务，只处理绑定失败。
      if (bound) return;
      try {
        server.close();
      } catch (e) {}
      console.log("local host listen failed:", ip, port, err && err.code);
      onFail && onFail();
    });
    server.once("listening", () => {
      bound = true;
      url = {
        host: server.address().address,
        port: server.address().port,
        fileName: fileName,
      };
      fn(url);
      console.log("express at http://%s:%s/%s", url.host, url.port, fileName);
    });
  };
  // 端口被占（比如上一次的进程没退干净）就换个随机端口，实在不行退回网卡 IP。
  listen(post, LOOPBACK, () =>
    listen(0, LOOPBACK, () => {
      let aotuIp = getLocalIP();
      listen(post, aotuIp[0], () => {});
    }),
  );
};
