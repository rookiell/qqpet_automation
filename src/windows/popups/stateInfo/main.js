(() => {
  var __webpack_modules__ = {
      821: (module) => {
        const _require = eval("require"),
          infoCard = _require("../infoCard/main.js"),
          screenUtil = _require("../../util/screen.js"),
          control = _require("../control/main.js");
        class mainClass {
          constructor(e) {
            ((this.window = null),
              (this.name = "stateInfo"),
              (this.show = !1),
              (this.position = [0, 0]));
          }
          cleate(e) {
            let { nowPosition: t, msg: o } = e;
            this.msg = o;
            let s = this,
              // 面板挂在宠物左上方；宠物贴边时收敛回可视区域，避免整块跑到屏幕外
              p = screenUtil.clampToScreen(t[0] - 95, t[1] - 290, 190, 290, t);
            ((this.width = 190),
              (this.height = 290),
              windowsMain
                .open({
                  name: this.name,
                  loadFile: "popups/" + this.name,
                  default: {
                    width: this.width,
                    height: this.height,
                    x: p[0],
                    y: p[1],
                    notChangeSize: !0,
                  },
                  created(e) {
                    let { vm: t, preloads: o, getinfo: n, wsMethods: a } = e;
                    (o({
                      "stateInfo_set-say": (e, t) => {
                        console.log(t, " --- stateInfo_set say");
                      },
                      "stateInfo_bus-Main": (e, o) => {
                        "mounted" == o.event &&
                          (s.autoTimer && clearInterval(s.autoTimer),
                          (s.autoTimer = setInterval(() => {
                            try {
                              let _b = t.getBounds(),
                                _p =
                                  _require(
                                    "electron",
                                  ).screen.getCursorScreenPoint(),
                                _w =
                                  windowsMain.wins &&
                                  windowsMain.wins.main &&
                                  windowsMain.wins.main.win,
                                _pb = _w ? _w.getBounds() : null,
                                _in = (b) =>
                                  b &&
                                  _p.x >= b.x &&
                                  _p.x <= b.x + b.width &&
                                  _p.y >= b.y &&
                                  _p.y <= b.y + b.height;
                              _in(_b) ||
                                _in(_pb) ||
                                (clearInterval(s.autoTimer),
                                (s.autoTimer = null),
                                s.doClose());
                            } catch (e) {
                              (clearInterval(s.autoTimer),
                                (s.autoTimer = null));
                            }
                          }, 1000)),
                          t.webContents.send("stateInfo_bus-html", {
                            data: (() => {
                              try {
                                let d = getPetInfo();
                                d.claimable = s.calcClaimable();
                                return d;
                              } catch (e) {
                                return getPetInfo();
                              }
                            })(),
                            type: "load",
                          }),
                          t.on("blur", (e) => {
                            t.webContents.send("stateInfo_bus-htmlFB", {
                              type: "blur",
                              data: !0,
                            });
                          }),
                          t.on("focus", (e) => {
                            t.webContents.send("stateInfo_bus-htmlFB", {
                              type: "focus",
                              data: !0,
                            });
                          }));
                      },
                      "stateInfo_bus-upData": (e, t) => {
                        "openPetFile" != t.type
                          ? (setPetInfo(t),
                            // 刚打开贴心宝贝时先照料一次，不用等下个整分钟；
                            // 关掉的时候不用做什么。
                            t.otherOptions &&
                              t.otherOptions.sweetHeart &&
                              petControl.GrowUp &&
                              petControl.GrowUp.sweetHeartAuto())
                          : infoCard.show
                            ? infoCard.doClose()
                            : infoCard.cleate();
                      },
                      "stateInfo_bus-close": (e, t) => {
                        s.doClose();
                      },
                      "stateInfo_bus-openActive": (e, t) => {
                        if (!t) return;
                        let got = 0;
                        try {
                          let n = Date.now(),
                            sg = getCache("sign", "gift") || [],
                            i1 = 0;
                          for (let g of sg)
                            if (
                              g &&
                              0 == g.isTake &&
                              n >= +g.time &&
                              petControl.Goods.toAddGoods({ good: g }) === !0
                            ) {
                              g.isTake = 2;
                              got++;
                            }
                          if (i1 || got)
                            setCache({
                              name: "sign",
                              upName: "gift",
                              value: sg,
                            });
                          let o = +getPetInfoOne("onlineDataTime", "info") || 0,
                            og = getCache("online", "gift") || [],
                            c2 = 0;
                          for (let g of og)
                            if (
                              g &&
                              0 == g.isTake &&
                              o > +g.time &&
                              petControl.Goods.toAddGoods({ good: g }) === !0
                            ) {
                              g.isTake = 2;
                              c2++;
                            }
                          if (c2)
                            setCache({
                              name: "online",
                              upName: "gift",
                              value: og,
                            });
                          got += c2;
                        } catch (e) {}
                        openSpeak({
                          data: {
                            type: "text",
                            data: got
                              ? "领到 " + got + " 份礼物，都放进背包啦~"
                              : "今天的礼物都领完啦~ 明早六点后有新的签到礼包，多陪我在线还能解锁在线礼包哦~~",
                          },
                        });
                      },
                      stateInfo_h_stopState_m: (e, t) => {
                        let o = getPetInfoOne("", "activeOption");
                        ((o[
                          o?.work
                            ? "work"
                            : o?.study
                              ? "study"
                              : o?.trip
                                ? "trip"
                                : ""
                        ].stopNow = !0),
                          setPetInfo({ activeOption: o }),
                          petControl.GrowUp.GrowUpMain({ unGrow: !0 }));
                      },
                    }),
                      n([
                        {
                          event: "pet",
                          name: s.name,
                          fn: (e) => {
                            t.webContents.send("stateInfo_bus-htmlPetInfo", {
                              type: "info",
                              data: (() => {
                                try {
                                  let d = getPetInfo();
                                  d.claimable = s.calcClaimable();
                                  return d;
                                } catch (e) {
                                  return getPetInfo();
                                }
                              })(),
                            });
                          },
                        },
                      ]));
                  },
                  onload() {
                    (console.log("onload ", this.name), (s.show = !0));
                  },
                  onshow(e) {
                    (console.log("onshow ", this.name),
                      (s.window = e),
                      (s.show = !0));
                  },
                  onhide() {
                    (console.log("onhide ", this.name), (s.show = !1));
                  },
                  onclose() {
                    (console.log("onclose ", this.name),
                      (s.window = null),
                      (s.show = !1));
                  },
                })
                .then((e) => {
                  ((this.window = e), this.init());
                })
                .catch((e) => {
                  console.log(e);
                }));
          }
          // 签到 / 在线礼物有没有可领的（1=有，0=没有）。
          //
          // 关键：礼物列表是「懒生成」的。Goods.getGiftData 只在
          // getConsumablesPage({ value: "task" }) 里被调用 —— 也就是打开任务栏那一刻，
          // 它才会把当天的 12 个签到礼 / 8 个在线礼写进缓存。
          // 于是下面两种情况缓存是「不该被信任」的：
          //   ① 进程第一次跑，缓存还是 pet.js 里的空数组 { sign: [], online: [] }；
          //   ② 跨过 06:00 进入新的一天，缓存里还是昨天的列表（isTake 全是 2=已领）。
          // 这时直接扫缓存永远扫不到可领取项，信息栏的「领取」按钮就是灰的，
          // 而打开任务栏后它自己重新生成了列表，就又变正常 —— 表现为「时好时坏」。
          // 所以这里先自己把数据补齐，再判断，不再依赖「用户先点过任务栏」。
          calcClaimable() {
            try {
              let g = petControl && petControl.Goods;
              if (g && "function" == typeof g.getGiftData) {
                // 数量必须和任务栏用的保持一致（签到 12、在线 8），
                // 否则 getGiftData 会认为长度不符而整份重新生成。
                try {
                  g.getGiftData("sign", 12);
                } catch (e) {}
                try {
                  g.getGiftData("online", 8);
                } catch (e) {}
              }
            } catch (e) {}
            let c = 0,
              n = Date.now(),
              o = +getPetInfoOne("onlineDataTime", "info") || 0;
            for (let g of getCache("sign", "gift") || [])
              if (g && 0 == g.isTake && n >= +g.time) {
                c = 1;
                break;
              }
            if (!c)
              for (let g of getCache("online", "gift") || [])
                if (g && 0 == g.isTake && o > +g.time) {
                  c = 1;
                  break;
                }
            return c;
          }
          init() {
            this.show = !0;
          }
          doHide() {
            (this.window.hide(), (this.show = !1));
          }
          doClose() {
            (this.window.close(), (this.show = !1));
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
  var __webpack_exports__ = __webpack_require__(821);
  module.exports = __webpack_exports__;
})();
