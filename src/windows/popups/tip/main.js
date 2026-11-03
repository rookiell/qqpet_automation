(() => {
  var __webpack_modules__ = {
      361: (module) => {
        const _require = eval("require"),
          screenUtil = _require("../../util/screen.js"),
          path = _require("path");
        class mainClass {
          constructor(t) {
            ((this.window = null),
              (this.show = !1),
              (this.name = "tip"),
              (this.closeTime = 1e4),
              (this.closeTimeOut = null));
          }
          nowPosition = [0, 0];
          // 气泡默认挂在宠物上方；宠物贴屏幕顶部时翻到下方，
          // 再统一收敛进可视区域，避免气泡跑到屏幕外看不见。
          calcPosition(position, maxSize) {
            let area = screenUtil.getWorkArea(position),
              x = position[0] + maxSize[0] / 2 - this.width / 2,
              y = position[1] - this.height - 30;
            if (y < area.y) y = position[1] + maxSize[1] + 30;
            // 窗口实际尺寸比计算值大 10px（window.js 创建时的默认扩张），按实际尺寸收敛
            return screenUtil.clampToScreen(
              x,
              y,
              this.width + 10,
              this.height + 10,
              position,
            );
          }
          cleate(t) {
            ((this.nowPosition = t.position || [0, 0]),
              (this.maxSize = t.maxSize || [0, 0]),
              (this.width = 229),
              (this.height = 179));
            let e = this,
              s = this.calcPosition(t.position, t.maxSize);
            ((this.msgData = t.data),
              (this.otherMsgData = t.otherOpt || null),
              windowsMain
                .open({
                  name: this.name,
                  loadFile: "popups/" + this.name,
                  default: {
                    width: this.width,
                    focusable: !1,
                    show: !1,
                    height: this.height,
                    x: s[0] || 1,
                    y: s[1] || 1,
                  },
                  created(t) {
                    let { vm: s, preloads: i, getinfo: o, wsMethods: a } = t;
                    (s.setAlwaysOnTop(!0), s.showInactive());
                    const h = (t) => {
                      if (!s?.webContents?.send) return;
                      let i = { size: [229, 179] };
                      (t.otherOptions?.sweetHeart && (i = { size: [271, 179] }),
                        (i.size[0] == e.width && i.size[1] == e.height) ||
                          e.setPosition(
                            { position: e.nowPosition, maxSize: e.maxSize },
                            i.size[0],
                            i.size[1],
                          ),
                        s.webContents.send("tip_m_setData_h", {
                          type: "otherOptions",
                          data: t.otherOptions,
                        }));
                    };
                    (i({
                      tip_h_say_m: (t, e) => {
                        console.log(e, " --- tip_h_say_m say");
                      },
                      tip_h_bus_m: (t, i) => {
                        if ("mounted" == i.event)
                          (e.setMsg({
                            data: e.manageMsg(e.msgData),
                            otherOpt: e.otherMsgData,
                          }),
                            h(getPetInfo()),
                            s.webContents.send("tip_m_bus_h", {
                              type: "load",
                            }));
                        else if ("close" == i.event) {
                          if (i.data) {
                            let t = i.data;
                            try {
                              t = JSON.parse(t);
                            } catch (t) {}
                          }
                          (e.otherMsgData &&
                            (console.log("_this.otherMsgData", e.otherMsgData),
                            "click" == e.otherMsgData?.type
                              ? e.otherMsgData?.fn && e.otherMsgData?.fn()
                              : e.otherMsgData?.mood &&
                                addPetInfo(e.otherMsgData)),
                            e.doClose());
                        }
                      },
                    }),
                      o([
                        {
                          event: "pet",
                          name: e.name,
                          fn: (t) => {
                            h(t);
                          },
                        },
                      ]));
                  },
                  onload() {
                    (console.log("onload ", e.name), (e.show = !0));
                  },
                  onshow(t) {
                    (console.log("onshow ", e.name),
                      (e.window = t),
                      (e.show = !0));
                  },
                  onhide() {
                    (console.log("onhide ", e.name), (e.show = !1));
                  },
                  onclose() {
                    (console.log("onclose ", e.name),
                      e.closeTimeOut && clearTimeout(e.closeTimeOut),
                      (e.window = null),
                      (e.show = !1));
                  },
                })
                .then((t) => {
                  ((this.window = t), this.init());
                })
                .catch((t) => {
                  console.log(t);
                }));
          }
          init() {
            this.show = !0;
          }
          setPosition(t, e, s) {
            if (2 != t?.position?.length) return;
            ((this.nowPosition = t.position || [0, 0]),
              (this.maxSize = t.maxSize || [0, 0]),
              e && (this.width = e),
              s && (this.height = s));
            let i = this.calcPosition(t.position, t.maxSize);
            let o = {
              x: i[0] || 1,
              y: i[1] || 1,
              height: this.height + 10,
              width: this.width + 10,
            };
            this.window.setBounds(o);
          }
          setMsg(t, e) {
            this.window &&
              ((this.msgData = t.data),
              (this.otherMsgData = t.otherOpt || null),
              this.window.webContents.send("tip_m_bus_h", {
                data: JSON.stringify(this.manageMsg(this.msgData)),
                type: "nextData",
              }),
              this.closeTimeOut && clearTimeout(this.closeTimeOut),
              (this.closeTimeOut = setTimeout(() => {
                this.doClose();
              }, t?.closeTime || this.closeTime)));
          }
          manageMsg(t) {
            return (
              ("text" != t.type && "seeTextImgs" != t.type) ||
                !t.data ||
                "clip" == t.data?.form ||
                (-1 != (t.data + "")?.indexOf("[host]") &&
                  (t.data = (t.data + "").replace(
                    /\[host\]/g,
                    getPetInfoOne("host", "info"),
                  ))),
              t
            );
          }
          doClose() {
            (global.nextActive && global.nextActive({ name: "speak" }),
              this.closeTimeOut && clearTimeout(this.closeTimeOut),
              this.window.close(),
              (this.show = !1),
              // 气泡关掉（点按钮 / 超时）后通知一次，自动学习靠这里判断
              // 「学习礼包领取完了」，再决定要不要续课。
              global.onSpeakClosed && global.onSpeakClosed());
          }
        }
        let main = new mainClass();
        module.exports = main;
      },
    },
    __webpack_module_cache__ = {};
  function __webpack_require__(t) {
    var e = __webpack_module_cache__[t];
    if (void 0 !== e) return e.exports;
    var s = (__webpack_module_cache__[t] = { exports: {} });
    return (
      __webpack_modules__[t](s, s.exports, __webpack_require__),
      s.exports
    );
  }
  var __webpack_exports__ = __webpack_require__(361);
  module.exports = __webpack_exports__;
})();
