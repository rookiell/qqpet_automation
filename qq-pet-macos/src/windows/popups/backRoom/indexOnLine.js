let saveOpt = {},
  saveTime = null;
// Electron 中该页面以 file:// 加载，iframe 又是 http:// 的跨域页面，
// 这种第三方上下文里 document.cookie 会被浏览器直接禁用（写入静默失败）。
// 这里用 localStorage（不可用时退回内存）代替 Cookie 保存临时数据，
// 真正的持久化仍然通过 saveInfoData 交给主进程存档。
const cookieStore = (() => {
  const memory = {};
  try {
    const testKey = "qqpet_cookie_test";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return {
      get(key) {
        return localStorage.getItem(key);
      },
      set(key, value) {
        localStorage.setItem(key, value);
      },
    };
  } catch (e) {
    return {
      get(key) {
        return Object.prototype.hasOwnProperty.call(memory, key)
          ? memory[key]
          : null;
      },
      set(key, value) {
        memory[key] = value;
      },
    };
  }
})();
// 设置键值对
function setCookie(key, value, save) {
  try {
    cookieStore.set(
      "qqpet_" + encodeURIComponent(key),
      encodeURIComponent(value)
    );
  } catch (e) {
    console.log("setCookie error", e);
  }
  if (save) {
    //进行保存调用
    if (saveTime) {
      clearTimeout(saveTime);
    }
    //加入需要保存的数据
    saveOpt[key] = value + "";
    saveTime = setTimeout(() => {
      console.log("saveOpt", saveOpt);
      if (!saveInfoData) {
        return;
      }
      // 保存
      saveInfoData && saveInfoData(JSON.parse(JSON.stringify(saveOpt)));
      saveOpt = {};
    }, 500);
  }
}

// 读取键值对
function getCookie(key) {
  try {
    const value = cookieStore.get("qqpet_" + encodeURIComponent(key));
    if (value === null || value === undefined) {
      return null;
    }
    return decodeURIComponent(value);
  } catch (e) {
    console.log("getCookie error", e);
    return null;
  }
}

window.closeFrame = () => {
  console.log("closeFrame", "guanbi");
  close_game && close_game()
};
