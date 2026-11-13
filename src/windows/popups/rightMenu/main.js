(() => {
  var __webpack_modules__ = {
      881: (module) => {
        const _require = eval("require"),
          { app } = _require("electron"),
          infoCard = _require("../infoCard/main.js"),
          control = _require("../control/main.js"),
          setup = _require("../setup/main.js"),
          smallGame = _require("../smallGame/main.js"),
          screenUtil = _require("../../util/screen.js"),
          store = _require("../store/main.js");
        class mainClass {
          constructor(e) {
            ((this.window = null), (this.show = !1), (this.name = "rightMenu"));
          }
          positionType = null;
          traysVertical = "top";
          traysAlign = "right";
          traysMenuTop = 1;
          // 菜单项 value 顺序（渲染层 mounted 时发来），用来算 changeMenu 的下标
          menuOrder = [];
          cleate(e) {
            let {
              nowPosition: t,
              msg: o,
              positionType: a,
              trayBounds: b,
            } = e;
            ((this.positionType = a), (this.width = 340), (this.height = 300));
            let s = [
              Math.trunc(t[0] - this.width / 2),
              Math.trunc(t[1] - this.height),
            ];
            if (
              "trays" == this.positionType &&
              Array.isArray(b) &&
              4 == b.length
            ) {
              // 托盘右键：菜单贴着托盘图标摆（图标下方放不下就上翻），水平居中于图标。
              // 具体换算见 util/screen.js 的 placeTrayMenu
              const p = screenUtil.placeTrayMenu(
                { x: b[0], y: b[1], width: b[2], height: b[3] },
                this.width,
                this.height,
              );
              ((this.traysAlign = p.align),
                (this.traysVertical = p.vertical),
                (this.traysMenuTop = p.menuTop),
                (s = [p.x, p.y]));
            } else {
              "followMain" == this.positionType &&
                ((s[0] += this.width / 2 / 2), (s[1] += 80));
              // 宠物贴着屏幕边缘时，菜单会有一列落在屏幕外，这里收敛回可视区域
              s = screenUtil.clampToScreen(
                s[0],
                s[1],
                this.width,
                this.height,
                t,
              );
            }
            let n = this;
            windowsMain
              .open({
                name: this.name,
                loadFile: "popups/" + this.name,
                jsFiles: ["./util/move.js"],
                default: {
                  width: this.width,
                  height: this.height,
                  x: s[0],
                  y: s[1],
                  alwaysOnTop: !0,
                  // 固定窗口尺寸，位置计算按 340x300 精确对齐（否则 window.js 会各加 10px）
                  notChangeSize: !0,
                },
                created(e) {
                  let { vm: t, preloads: o, getinfo: a, wsMethods: s } = e;
                  t.setIgnoreMouseEvents(!0, { forward: !0 });
                  let i = {};
                  const l = (e, o) => {
                      if (e?.label && o?.length > 0) {
                        if (i["w" + o.join("-")] == e.value) return;
                        ((i["w" + o.join("-")] = e.value),
                          t.webContents.send("rightMenu_m_bus_h", {
                            data: e,
                            type: "changeMenu",
                            where: o,
                          }));
                      }
                    },
                    // changeMenu 的 where 是 1-based 下标。菜单项会随需求增减，
                    // 写死数字很容易错位（以前就这么错过一次），
                    // 统一按渲染层发来的顺序查；查不到返回 [0]（渲染层会跳过）。
                    // menuOrder 为空时（旧页面没带 order）退回默认顺序。
                    w = (e) => {
                      const order = n.menuOrder.length
                          ? n.menuOrder
                          : [
                              "feeding",
                              "smallGame",
                              "openStore",
                              "settingsAndHelp",
                              "stopGrowth",
                              "fastActive",
                              "quit",
                            ],
                        i = order.indexOf(e);
                      return i >= 0 ? [i + 1] : [0];
                    },
                    r = (e) => {
                      let t = null;
                      for (let o in e.activeOption)
                        e.activeOption[o] &&
                          "ill" != o &&
                          (t = e.activeOption[o]);
                      ((t = t
                        ? { label: "停止状态", value: "stopState" }
                        : e?.maxInfo?.stopGrowth
                          ? { label: "开启成长", value: "openGrowth" }
                          : { label: "停止成长", value: "stopGrowth" }),
                        l(t, w("stopGrowth")));
                    },
                    u = (e) => {
                      e.doNotDisturb
                        ? l(
                            {
                              label: "关闭免打扰",
                              value: "closeMute",
                              new: !0,
                            },
                            [w("settingsAndHelp")[0], 1],
                          )
                        : l(
                            { label: "开启免打扰", value: "openMute" },
                            [w("settingsAndHelp")[0], 1],
                          );
                    },
                    // 加速学习：原来「加速学习」和「快速学习」是两个开关，现在合成
                    // 一个。打开后同时做两件事——一节课用缩短的时长（shop 里的现值，
                    // 原版的 1/5）、下课时把本科目剩余课时一次结算完；关掉就是原版
                    // 45 分钟一节、一节一结算。只作用于学习，打工时长恒为原版。
                    // 状态存在 otherOptions.fastActive。
                    // 合并前老存档里可能只有 studyBoost=true（快速学习）而没有
                    // fastActive，实际已经在加速了，所以判断要带上它，否则菜单
                    // 会显示成「开启加速学习」，与实际状态不符。
                    mf = (e) => {
                      e?.otherOptions?.fastActive || e?.otherOptions?.studyBoost
                        ? l(
                            {
                              label: "关闭加速学习",
                              value: "closeFastActive",
                            },
                            w("fastActive"),
                          )
                        : l(
                            {
                              label: "开启加速学习",
                              value: "openFastActive",
                            },
                            w("fastActive"),
                          );
                    };
                  let h = !1,
                    p = ["3-0"];
                  (o({
                    rightMenu_h_say_m: (e, t) => {
                      console.log(t, " --- rightMenu_h_say_m say ");
                    },
                    rightMenu_h_bus_m: (e, o) => {
                      "mounted" == o.event
                        ? (Array.isArray(o.order) && (n.menuOrder = o.order),
                          r(getPetInfo()),
                          u(getSys()),
                          mf(getPetInfo()),
                          t.on("blur", (e) => {
                            h
                              ? setTimeout(() => {
                                  n.show && t.focus();
                                }, 200)
                              : n.doClose();
                          }),
                          t.webContents.send("rightMenu_m_bus_h", {
                            type: "load",
                            positionType: n.positionType,
                            traysVertical: n.traysVertical,
                            traysAlign: n.traysAlign,
                            traysMenuTop: n.traysMenuTop,
                          }),
                          t.focus())
                        : "close" == o.event && n.doClose();
                    },
                    rightMenu_h_eventMouse_m: (e, o) => {
                      o.canDoType
                        ? ((h = !0),
                          t.setIgnoreMouseEvents(!1, { forward: !0 }))
                        : ((h = !1),
                          t.setIgnoreMouseEvents(!0, { forward: !0 }));
                    },
                    rightMenu_h_setItem_m: (e, o) => {
                      try {
                        o.data = JSON.parse(o.data);
                      } catch (e) {}
                      if (
                        "food" == o.data.value ||
                        "clean" == o.data.value ||
                        "cure" == o.data.value
                      )
                        control.show &&
                          control.useInState({
                            type: "active",
                            opt: { value: o.data.value },
                          });
                      else if ("stopGrowth" == o.data.value)
                        (setPetInfo({ maxInfo: { stopGrowth: !0 } }),
                          changeTraysIcon({ name: "pause" }));
                      else if ("openGrowth" == o.data.value)
                        (setPetInfo({ maxInfo: { stopGrowth: !1 } }),
                          petControl.determineHealth({
                            communication: ["state", "startGrowth"],
                          }));
                      else if ("stopState" == o.data.value) {
                        let e = getPetInfoOne("", "activeOption");
                        ((e[
                          e?.work
                            ? "work"
                            : e?.study
                              ? "study"
                              : e?.trip
                                ? "trip"
                                : ""
                        ].stopNow = !0),
                          setPetInfo({ activeOption: e }),
                          petControl.GrowUp.GrowUpMain({ unGrow: !0 }));
                      }
                      // 开关只认 fastActive；顺手把老的 studyBoost 清成 false，
                      // 让状态单一化。不清的话老存档 studyBoost=true 时会「关不掉」
                      // ——isStudyBoost 读的是两者取或。
                      else if ("openFastActive" == o.data.value)
                        setPetInfo({
                          otherOptions: { fastActive: !0, studyBoost: !1 },
                        });
                      else if ("closeFastActive" == o.data.value)
                        setPetInfo({
                          otherOptions: { fastActive: !1, studyBoost: !1 },
                        });
                      // 合并前「快速学习」的开关值：老配置或旧页面还可能发过来，
                      // 统一折算到 fastActive 上，别只改一个字段。
                      else if ("openStudyBoost" == o.data.value)
                        setPetInfo({
                          otherOptions: { fastActive: !0, studyBoost: !1 },
                        });
                      else if ("closeStudyBoost" == o.data.value)
                        setPetInfo({
                          otherOptions: { fastActive: !1, studyBoost: !1 },
                        });
                      else
                        "quit" == o.data.value
                          ? app.quit()
                          : "petInfo" == o.data.value
                            ? infoCard.show
                              ? infoCard.doClose()
                              : infoCard.cleate()
                            : "openMute" == o.data.value
                              ? setSys({ name: "doNotDisturb", value: !0 })
                              : "closeMute" == o.data.value
                                ? setSys({ name: "doNotDisturb", value: !1 })
                                : "openStore" == o.data.value
                                  ? !store.show && store.cleate()
                                  : "openSetup" == o.data.value
                                    ? !setup.show && setup.cleate()
                                    : "smallGame" == o.data.value &&
                                      !smallGame.show &&
                                      smallGame.cleate();
                      o.data.value &&
                        (p.includes(o.data.id) ? t.focus() : n.doClose());
                    },
                  }),
                    a([
                      {
                        event: "pet",
                        name: n.name,
                        fn: (e) => {
                          (r(e), mf(e));
                        },
                      },
                      {
                        event: "system",
                        name: n.name,
                        fn: (e) => {
                          u(e);
                        },
                      },
                    ]));
                },
                onload() {
                  (console.log("onload ", this.name), (n.show = !0));
                },
                onshow(e) {
                  (console.log("onshow ", this.name),
                    (n.window = e),
                    (n.show = !0));
                },
                onhide() {
                  (console.log("onhide ", this.name), (n.show = !1));
                },
                onclose() {
                  (console.log("onclose ", this.name),
                    (n.window = null),
                    (n.show = !1));
                },
              })
              .then((e) => {
                ((this.window = e), this.init());
              })
              .catch((e) => {
                console.log(e);
              });
          }
          init() {
            this.show = !0;
          }
          doClose() {
            this.show && (this.window.close(), (this.show = !1));
          }
        }
        let main = new mainClass();
        module.exports = main;
      },
    },
    __webpack_module_cache__ = {};
  function __webpack_require__(e) {
    var t = __webpack_module_cache__[e];
    if (void 0 !== t) return t.exports;
    var o = (__webpack_module_cache__[e] = { exports: {} });
    return (
      __webpack_modules__[e](o, o.exports, __webpack_require__),
      o.exports
    );
  }
  var __webpack_exports__ = __webpack_require__(881);
  module.exports = __webpack_exports__;
})();
