(() => {
  var __webpack_modules__ = {
      933: (module) => {
        const _require = eval("require"),
          fishing = _require("../fishing/main"),
          backRoom = _require("../backRoom/main"),
          screenUtil = _require("../../util/screen.js"),
          { pinkDiamondLevel } = _require("../../util/pet/level");
        class mainClass {
          constructor(e) {
            ((this.window = null),
              (this.show = !1),
              (this.name = "control"),
              (this.isReady = !1),
              (this.isCleate = !1),
              (this.positionSave = null));
          }
          addTop = 5;
          // 面板坐标：默认水平居中于宠物、顶边贴在宠物脚下。
          // 下方放不下时贴着工作区底边往上收（保持"从下方展开"的方向），
          // 最后统一钳制进可视区域。
          // 注意：不要翻到宠物上方——1100x505 的大面板翻上去会挡在屏幕中上部，
          // 顶部的菜单栏看起来就像"整块面板跑到屏幕上面去了"。
          _calcLog(position, maxSize, area, out) {
            try {
              require("fs").appendFileSync(
                "/tmp/qqpet-control-pos.log",
                JSON.stringify({
                  t: new Date().toISOString(),
                  position,
                  maxSize,
                  size: [this.width, this.height],
                  area,
                  out,
                  bounds: this.window ? this.window.getBounds() : null,
                }) + "\n",
              );
            } catch (e) {}
          }
          calcPosition(position, maxSize) {
            const area = screenUtil.getWorkArea(position);
            // 宠物坐标可能落在屏幕外（"出门/隐藏"时的过渡坐标），
            // 按这种坐标算，面板会被钳制到工作区左上角，且之后可能不再更新。
            // 检测到异常坐标就直接退回"工作区水平居中、贴底"。
            const outside =
              !Array.isArray(position) ||
              position.length < 2 ||
              !Number.isFinite(position[0]) ||
              !Number.isFinite(position[1]) ||
              position[0] < area.x - 1 ||
              position[1] < area.y - 1 ||
              position[0] > area.x + area.width ||
              position[1] > area.y + area.height;
            let out;
            if (outside) {
              out = [
                Math.round(area.x + (area.width - this.width) / 2),
                Math.round(area.y + area.height - this.height),
              ];
            } else {
              let x = position[0] + maxSize[0] / 2 - this.width / 2,
                y = position[1] + maxSize[1] - this.addTop;
              if (y + this.height > area.y + area.height) {
                y = area.y + area.height - this.height;
              }
              out = screenUtil.clampToScreen(
                x,
                y,
                this.width,
                this.height,
                position,
              );
            }
            this._calcLog(position, maxSize, area, out);
            return out;
          }
          // 把三个菜单按钮在窗口内的坐标发给渲染层。
          // 面板被钳制到屏幕边角后，如果按钮还按"面板正上方居中"排布，
          // 就会离宠物很远（宠物在右下角时会偏到屏幕中部）。
          // 这里直接算出按钮应该出现在屏幕上的位置（宠物脚下、水平居中于宠物），
          // 再换算成窗口内坐标，渲染层绝对定位过去即可。
          // 同时判断下方够不够展开二级菜单，不够就让它向上展开，避免被屏幕底边裁掉。
          _sendMenuOffset(position, maxSize, panelPos) {
            try {
              if (!this.window || this.window.isDestroyed()) return;
              if (!Array.isArray(position) || !Array.isArray(panelPos)) return;
              const area = screenUtil.getWorkArea(position),
                ROW_W = 170, // 3 x 50 图标 + 2 x 10 间距
                ROW_H = 50,
                // 二级菜单向下展开的真实高度：3 项 x 30 = 90。
                // .m_c_once 写的是 height:30px + padding:12px 0，看着像 54/项，
                // 但 lib/ant-design/antd.css 的 reset 里有 *{box-sizing:border-box}，
                // padding 被算进 height 里，实测 offsetHeight 就是 30，3 项合计 90。
                // （实测方式：加载 antd.css + css/index.css + popups/control/index.css，
                //  复刻菜单 DOM，量 .m_children 内 3 个 .m_c_once 的 top/bottom = 50→140。）
                // 之前按 content-box 估成 162，多算 72px，导致 roomBelow 在 90~162
                // 之间时明明放得下却上翻。
                // .m_children 的 top 已经是 var(--iconBoxSize)=50，从按钮**底边**起算，
                // 所以 roomBelow 直接和 DROP_H 比即可，不要再加按钮自身高度。
                DROP_H = 90;
              // 目标屏幕坐标：水平居中于宠物，垂直贴在宠物脚下
              const petCenterX = position[0] + maxSize[0] / 2,
                petBottom = position[1] + maxSize[1] - this.addTop;
              let left = Math.round(petCenterX - panelPos[0] - ROW_W / 2),
                top = Math.round(petBottom - panelPos[1]);
              left = Math.max(0, Math.min(left, this.width - ROW_W));
              top = Math.max(0, Math.min(top, this.height - ROW_H));
              // 按钮下方还剩多少能真正摆下二级菜单的空间。
              // 二级菜单是在窗口内渲染的，超出窗口的部分会被窗口裁掉，
              // 所以真正的上限是「到窗口底边的距离」；再与「到屏幕工作区底边」
              // 取小值兜底（正常窗口不会越出工作区，两者相等）。
              const roomBelow = Math.min(
                this.height - (top + ROW_H),
                area.y + area.height - (panelPos[1] + top + ROW_H),
              );
              // 三级活动面板（点击二级菜单项后弹出的 350x150 面板）同理：
              // 原来它按窗口居中排布，面板被钳到边角后就跑到窗口正中，
              // 离宠物很远。这里也锚定到"宠物脚下、水平居中于宠物"。
              const ACT_W = 350, ACT_H = 150;
              let activeLeft = Math.round(petCenterX - panelPos[0] - ACT_W / 2),
                activeTop = Math.round(petBottom - panelPos[1]);
              activeLeft = Math.max(0, Math.min(activeLeft, this.width - ACT_W));
              activeTop = Math.max(0, Math.min(activeTop, this.height - ACT_H));
              const payload = {
                left,
                top,
                up: roomBelow < DROP_H,
                activeLeft,
                activeTop,
              };
              try {
                require("fs").appendFileSync(
                  "/tmp/qqpet-control-pos.log",
                  JSON.stringify({
                    t: new Date().toISOString(),
                    tag: "menu",
                    position,
                    maxSize,
                    panelPos,
                    petBottom,
                    roomBelow,
                    payload,
                  }) + "\n",
                );
              } catch (err) {}
              this.window.webContents.send("control_bus-html_menuOffset", payload);
            } catch (e) {}
          }
          cleate(e, t) {
            this.isCleate = !0;
            ((this.width = 1100), (this.height = 500 + this.addTop));
            let o = this.calcPosition(e.position, e.maxSize);
            // 首次创建时窗口还没就绪，先记住上下文，等 onshow 后再下发按钮坐标
            this._menuCtx = {
              position: e.position,
              maxSize: e.maxSize,
              panelPos: o,
            };
            let n = this;
            ((this.state = "hide"),
              windowsMain
                .open({
                  name: this.name,
                  loadFile: "popups/" + this.name,
                  jsFiles: ["./util/move.js"],
                  default: {
                    width: this.width,
                    height: this.height,
                    x: o[0],
                    y: o[1],
                    show: !1,
                    notChangeSize: !0,
                  },
                  created(e) {
                    let { vm: t, preloads: o, getinfo: i, wsMethods: s } = e,
                      a = !0;
                    t.setIgnoreMouseEvents(!0, { forward: !0 });
                    let l = null;
                    o({
                      "control_set-say": (e, t) => {
                        console.log(t, " --- control_set say");
                      },
                      "control_bus-Main": (e, o) => {
                        "mounted" == o.event
                          ? ((n.isReady = !0),
                            t.webContents.send("control_bus-html", {
                              paddingTopMain: n.addTop,
                              type: "load",
                            }),
                            openLocalHost(),
                            h(getPetInfo()),
                            t.on("blur", (e) => {
                              a ? n.changeState({ type: "hide" }) : t.focus();
                            }))
                          : "close" == o.event
                            ? t.close()
                            : "focus" == o.event
                              ? ((n.state = "active"), t.focus())
                              : "mainFocus" == o.event ||
                                ("hide" == o.event && n.doHide(!0));
                      },
                      "control_bus-Main_eventMouse": (e, o) => {
                        o.canDoType
                          ? ((a = !1),
                            t.setIgnoreMouseEvents(!1, { forward: !0 }),
                            n.hideTimer && clearTimeout(n.hideTimer))
                          : ((a = !0),
                            t.setIgnoreMouseEvents(!0, { forward: !0 }),
                            n.hideTimer && clearTimeout(n.hideTimer),
                            (n.hideTimer = setTimeout(() => {
                              ((n.hideTimer = null), n.doHide(!1));
                            }, 500)));
                      },
                      "control_bus-Main_getActiveData": (e, o) => {
                        try {
                          o = JSON.parse(o);
                        } catch (e) {}
                        let i = {};
                        ((l = "study" == o.value ? o : null),
                          (i = petControl.Goods.getConsumablesPage({
                            ...o,
                            getWhere: o.getWhere || "store",
                          })),
                          "task" == o.value
                            ? (i.result = n.doGiftIsTask(i.result, o.useType))
                            : h(getPetInfo()),
                          t.webContents.send("control_bus-html_setActiveData", {
                            data: i,
                            type: o.type,
                          }));
                      },
                      "control_bus-Main_useActiveData": (e, o) => {
                        let i = o;
                        try {
                          i = JSON.parse(i);
                        } catch (e) {}
                        if ("winShow" != i.event) {
                          if (getPetInfoOne("stopGrowth", "maxInfo"))
                            t.webContents.send(
                              "control_bus-html_setActiveData",
                              { type: "stopGrowth" },
                            );
                          else if (i?.useType) {
                            if (
                              1 == i.isTake &&
                              !0 === petControl.Goods.toAddGoods({ good: i })
                            ) {
                              let e = getCache(i.useType, "gift");
                              ((e[
                                i.inIndex + (i.current - 1) * i.pageSize
                              ].isTake = 2),
                                setCache({
                                  name: i.useType,
                                  upName: "gift",
                                  value: e,
                                }),
                                openSpeak({
                                  data: { type: "text" },
                                  communication: ["gift", i.useType],
                                  nextActiveStr: "speak",
                                }));
                            }
                            let e = petControl.Goods.getConsumablesPage({
                              ...i,
                              value: "task",
                              getWhere: "store",
                            });
                            ((e.result = n.doGiftIsTask(e.result, i.useType)),
                              t.webContents.send(
                                "control_bus-html_setActiveData",
                                { data: e, type: "task" },
                              ));
                          } else if (
                            "food" == i.type ||
                            "commodity" == i.type ||
                            "medicine" == i.type
                          ) {
                            let e = petControl.Goods.useConsumables(i);
                            if (e && !e.overType) {
                              let e = petControl.Goods.getConsumablesPage({
                                pageSize: i.pageSize,
                                current: i.current,
                                type: i.type,
                                getWhere: "store",
                              });
                              t.webContents.send(
                                "control_bus-html_setActiveData",
                                { data: e, type: i.type },
                              );
                            } else
                              t.webContents.send(
                                "control_bus-html_setActiveData",
                                { data: e, type: "err" },
                              );
                          } else if ("work" == i.type) {
                            if (!i.activeIt) {
                              let e = { msg: "" };
                              if (
                                getPetInfoOne("work", "activeOption") ||
                                getPetInfoOne("study", "activeOption") ||
                                getPetInfoOne("trip", "activeOption")
                              )
                                e = {
                                  msg:
                                    getPetInfoOne("host", "info") +
                                    "~做什么事都要专心哦~~",
                                };
                              else if (getPetInfoOne("ill", "activeOption"))
                                e = {
                                  msg:
                                    ("dead" ==
                                    getPetInfoOne("ill", "activeOption").type
                                      ? "您的宠物已死亡~"
                                      : "") ||
                                    getPetInfoOne("host", "info") +
                                      "~我生病，等我治疗好了再赚元宝吧~~",
                                };
                              else if (
                                i.need > getPetInfoOne("level", "maxInfo") ||
                                !getPetInfoOne("level", "maxInfo")
                              )
                                e = {
                                  msg:
                                    getPetInfoOne("host", "info") +
                                    "~我的等级不够哦，陪我长大再试试吧~~",
                                };
                              else {
                                let t = !0,
                                  o = getPetInfoOne("study", "activeValue");
                                for (let e in i.education)
                                  i.education[e] &&
                                    (!o[e] || o[e] < i.education[e]) &&
                                    (t = !1);
                                e = t
                                  ? {
                                      ...i,
                                      msg:
                                        getPetInfoOne("host", "info") +
                                        "~确定要去" +
                                        i.tolkName +
                                        "吗？",
                                    }
                                  : {
                                      msg:
                                        getPetInfoOne("host", "info") +
                                        "~书到用时方恨少啊，我要努力学习~~",
                                    };
                              }
                              return void t.webContents.send(
                                "control_bus-html_setActiveData",
                                { data: e, type: "err" },
                              );
                            }
                            petControl.Goods.activeWork(i);
                          } else if ("study" == i.type) {
                            if (!i.activeIt) {
                              let e = { msg: "" };
                              return (
                                (e =
                                  getPetInfoOne("work", "activeOption") ||
                                  getPetInfoOne("study", "activeOption") ||
                                  getPetInfoOne("trip", "activeOption")
                                    ? {
                                        msg:
                                          getPetInfoOne("host", "info") +
                                          "~做什么事都要专心哦~~",
                                      }
                                    : getPetInfoOne("ill", "activeOption")
                                      ? {
                                          msg:
                                            ("dead" ==
                                            getPetInfoOne("ill", "activeOption")
                                              .type
                                              ? "您的宠物已死亡~"
                                              : "") ||
                                            getPetInfoOne("host", "info") +
                                              "~我生病，等我治疗好了再上学吧~~",
                                        }
                                      : {
                                          ...i,
                                          msg:
                                            getPetInfoOne("host", "info") +
                                            "~确定要学习" +
                                            i.tolkName +
                                            "吗？",
                                        }),
                                void t.webContents.send(
                                  "control_bus-html_setActiveData",
                                  { data: e, type: "err" },
                                )
                              );
                            }
                            petControl.Goods.activeStudy(i) &&
                              (console.log("close mm"),
                              n.changeState({ type: "menu" }));
                          }
                        } else if ("fz" == i.val?.type) {
                          let e = {},
                            o = {},
                            n = +getPetInfoOne("yb", "info");
                          if (n - 200 < 0)
                            return void t.webContents.send(
                              "control_bus-html_backDetermine",
                              {
                                event: "winShow",
                                text: `当前元宝￥${n} ，还差￥${200 - n}元宝，我可用打工、养鱼赚钱的~~`,
                              },
                            );
                          (getPetInfoOne("pinkDiamond", "otherOptions")
                            ? (e = {
                                pinkDiamondExpirationDate:
                                  getPetInfoOne(
                                    "pinkDiamondExpirationDate",
                                    "otherOptions",
                                  ) +
                                  hourTime * i.val.day,
                                growthValue: i.val.growth,
                              })
                            : ((e = {
                                pinkDiamond: !0,
                                pinkDiamondBeginDate: tool.getDayHourTime(),
                                pinkDiamondExpirationDate:
                                  tool.getDayHourTime() + hourTime * i.val.day,
                                growthValue: i.val.growth,
                                pinkDiamondLevel:
                                  getPetInfoOne(
                                    "pinkDiamondLevel",
                                    "otherOptions",
                                  ) || 1,
                              }),
                              (o = pinkDiamondLevel.toChangeOtherDatas({
                                ...getPetInfoOne("", "otherOptions"),
                                ...e,
                              }))),
                            console.log("opts", o),
                            setPetInfo({
                              otherOptions: e,
                              info: { yb: n - 200 },
                              ...o,
                            }),
                            t.webContents.send(
                              "control_bus-html_backDetermine",
                              {
                                event: "winShow",
                                text:
                                  "您已开通粉钻会员，到期时间： " +
                                  tool.getTime({
                                    defaultTime: e.pinkDiamondExpirationDate,
                                    format: "YY-MM-DD",
                                  }),
                              },
                            ));
                        }
                      },
                      "control_bus-Main_determine": (e, o) => {
                        try {
                          o = JSON.parse(o);
                        } catch (e) {}
                        let n = getPetInfo(),
                          i = {};
                        ("cure" == o.type &&
                          (i = n.activeOption.ill
                            ? {
                                type: "icon",
                                icon: `../assets/img_res/medicine/${n.activeOption.ill.cure.icon}.gif`,
                                tipMsg: n.activeOption.ill.tolk,
                                msg:
                                  "dead" == n.activeOption.ill.type
                                    ? "您的宝贝已死亡，需要" +
                                      n.activeOption.ill.cure.name +
                                      "进行复活~~"
                                    : "您的宝贝得了" +
                                      n.activeOption.ill.name +
                                      "，需要" +
                                      n.activeOption.ill.cure.name +
                                      "来来治疗哦~~~",
                              }
                            : {
                                type: "msg",
                                msg:
                                  getPetInfoOne("host", "info") +
                                  " 我很健康哦~~~",
                              }),
                          t.webContents.send("control_bus-html_backDetermine", {
                            data: i,
                            type: o.type,
                          }));
                      },
                      "control_bus-Main_openWindow": (e, t) => {
                        try {
                          t = JSON.parse(t);
                        } catch (e) {}
                        openLocalHost((e) => {
                          (console.log("url", e),
                            "hlyg" == t.value
                              ? (!fishing.show && fishing.cleate(e),
                                fishing.show && fishing.doClose())
                              : "mstx" == t.value &&
                                (!backRoom.show && backRoom.cleate(e),
                                backRoom.show && backRoom.doClose()));
                        });
                      },
                    });
                    let h = (e) => {
                      if (l && e?.changeValue?.study) {
                        let e = petControl.Goods.getConsumablesPage({
                          ...l,
                          getWhere: "store",
                        });
                        t.webContents.send("control_bus-html_setActiveData", {
                          data: e,
                          type: l.type,
                        });
                      }
                      let o = e,
                        n = {
                          hunger: { now: o.info.hunger, max: o.maxInfo.hunger },
                          clean: { now: o.info.clean, max: o.maxInfo.clean },
                          cure: { now: o.info.health, max: o.maxInfo.health },
                        };
                      t.webContents.send("control_bus-html_gePetInfo", {
                        type: "info",
                        data: n,
                      });
                    };
                    i([
                      {
                        event: "pet",
                        name: n.name,
                        fn: (e) => {
                          h(e);
                        },
                      },
                    ]);
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
                      (n.isCleate = !1),
                      (n.show = !1),
                      (n.isReady = !1),
                      (n.state = "hide"));
                  },
                })
                .then((e) => {
                  ((this.window = e),
                    this.positionSave &&
                      (console.log("使用储存位置 :>> "),
                      this.window.setBounds(this.positionSave),
                      (this.positionSave = null)),
                    this.init(),
                    this._menuCtx &&
                      (this._sendMenuOffset(
                        this._menuCtx.position,
                        this._menuCtx.maxSize,
                        this._menuCtx.panelPos,
                      ),
                      (this._menuCtx = null)));
                })
                .catch((e) => {
                  console.log(e);
                }));
          }
          init() {
            this.show = !0;
          }
          setPosition(e) {
            let t = this.calcPosition(e.position, e.maxSize);
            let o = {
              x: +t[0],
              y: +t[1],
              height: this.height,
              width: this.width,
            };
            this.window
              ? (this.window.setBounds(o),
                this._sendMenuOffset(e.position, e.maxSize, t))
              : (console.log("没有window储存位置 :>> "),
                (this.positionSave = o));
          }
          // 打开面板前，用宠物当前实时位置重算一次，避免面板停在过期的坐标上
          // （比如宠物"出门/隐藏"时算出的屏幕外坐标，之后宠物回来但没再触发移动）。
          _resyncPosition() {
            try {
              const mainWin = _require("../../main/main.js"),
                p = mainWin?.nowPosition;
              if (Array.isArray(p) && p.length >= 2)
                this.setPosition({
                  position: p,
                  maxSize: mainWin?.maxSize || [180, 180],
                });
            } catch (e) {}
          }
          changeState(e = {}) {
            this.isReady &&
              ("hide" != e.type &&
                (this._resyncPosition(),
                  setTimeout(() => {
                    (this.doShow("menu" == e.type),
                      this.window && this.window.focus());
                  }, 0)),
              this.state != e.type &&
                ((this.state = e.type),
                this.window &&
                  this.window.webContents.send("control_bus-html_viewStyle", {
                    type: this.state,
                    opt: e.opt || null,
                  })));
          }
          doGiftIsTask(e, t) {
            let o = e;
            if ("sign" == t) {
              let e = new Date(
                tool.getTime({ format: "YY-MM-DD hh:mm" }),
              ).getTime();
              for (let t in o)
                e >= o[t].time && 0 == o[t].isTake && (o[t].isTake = 1);
            } else if ("online" == t) {
              let e = +getPetInfoOne("onlineDataTime", "info");
              for (let t in o)
                e > o[t].time && 0 == o[t].isTake && (o[t].isTake = 1);
            }
            return o;
          }
          useInState(e = {}) {
            (setTimeout(() => {
              this.doShow(!0);
            }, 0),
              (this.state = e.type),
              this.window &&
                this.window.webContents.send("control_bus-html_viewStyle", {
                  type: this.state,
                  opt: e.opt || null,
                }));
          }
          doHide(e) {
            (this.show || e) && this.window.hide();
          }
          doShow(e) {
            (!this.show || e) && this.window.show();
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
  var __webpack_exports__ = __webpack_require__(933);
  module.exports = __webpack_exports__;
})();
