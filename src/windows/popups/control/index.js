(() => {
  var e = {},
    t = (e) => {
      window.electronAPI.control_ToMain(e);
    };
  const i = {
      data: () => ({
        isPenetrate: !1,
        paddingTopMain: 0,
        petInfo: {
          hunger: { label: "饥饿：", value: [0, 0], background: "hongse" },
          clean: { label: "清洁：", value: [0, 0], background: "hongse" },
          cure: { label: "健康：", value: [0, 0], background: "hongse" },
        },
        activeMenu: !1,
        saveActiveMenu: !1,
        doActive: !1,
        doActiveMenu: null,
        mouseMove: null,
        menus: [
          {
            name: "日常",
            icon: "../assets/control/icons/richang.png",
            children: [n.food, n.clean, n.cure],
          },
          {
            name: "交互",
            icon: "../assets/control/icons/chongwu.png",
            children: [n.work, n.study, n.trip],
          },
          {
            name: "活动",
            icon: "../assets/control/icons/gonggao.png",
            children: [n.task, n.hlyg, n.fz],
          },
        ],
        activeList: [],
        total: 1,
        current: 1,
        pageSize: 4,
        useActiveLoading: !1,
        mousePosition: [0, 0],
        tipMainPosition: [0, 0],
        tipOpt: null,
        activeUseData: {},
        taskMsg: [
          { class: "wait" },
          {
            class: "take",
            label: "可领取",
            icon: "url(../assets/tip/gift/61.svg)",
          },
          {
            class: "taked",
            label: "已领取",
            icon: "url(../assets/tip/gift/60.svg)",
          },
        ],
        winShow: !1,
        winShowText: "",
        winType: "",
        // 三个菜单按钮在窗口内的坐标（主进程下发）：
        // { left, top, up } —— up 表示下方空间不够，二级菜单要向上展开
        menuPos: null,
        // hover 商品/课程时那条浮动提示的实测尺寸（内容长度不固定，量一次再用）
        goodTipSize: null,
      }),
      computed: {
        activeMenuStyle() {
          const p = this.menuPos;
          // 还没收到主进程坐标时，保持原来的"整窗居中"排布
          if (!p) return { justifyContent: "center" };
          return {
            position: "absolute",
            left: p.left + "px",
            top: p.top + "px",
            width: "auto",
            height: "auto",
            paddingTop: "0px",
            display: "flex",
            justifyContent: "flex-start",
          };
        },
        // 三级活动面板（点二级菜单后弹出的 350x150 面板）原来靠 #appMain 的
        // flex 居中排布，面板被钳到屏幕边角后就停在窗口正中（也就是旧按钮的位置）。
        // 这里把它也绝对定位到宠物脚下。先把 .doActive 拉平成铺满窗口的定位容器，
        // 保证下面 .active 的 left/top 就是窗口坐标（不受 .doActive 的 top:5px 影响）。
        doActiveStyle() {
          const p = this.menuPos;
          if (!p || null == p.activeLeft) return {};
          return {
            position: "absolute",
            left: "0px",
            top: "0px",
            width: "100%",
            height: "100%",
          };
        },
        activePanelStyle() {
          const p = this.menuPos;
          if (!p || null == p.activeLeft) return {};
          return {
            position: "absolute",
            left: p.activeLeft + "px",
            top: p.activeTop + "px",
          };
        },
        // 三级面板里的确认框（"你要学习语文吗"这类，300x140）
        // 原先固定在鼠标右下 15px，面板贴到窗口右下角时会整体超出窗口被裁掉。
        tipMainStyle() {
          const p = this.tipMainPosition || [0, 0];
          return Object.assign(
            { position: "fixed" },
            this.tipPos(p[0], p[1], 300, 140),
          );
        },
      },
      created() {},
      mounted() {
        (this.doMousePenetrate(),
          window.electronAPI.control_ToHtml_menuOffset((e, t) => {
            this.menuPos = t;
          }),
          window.electronAPI.control_ToHtml((e, t) => {
            "load" == t.type &&
              ((this.paddingTopMain = t.paddingTopMain), seeApp());
          }),
          window.electronAPI.control_ToHtml_viewStyle((e, t) => {
            "hide" == t.type
              ? ((this.activeMenu = !1),
                (this.doActive = !1),
                (this.doActiveMenu = null),
                (this.activeList = []),
                (this.useActiveLoading = !1),
                (this.winShow = !1),
                (this.winShowText = ""),
                (this.winType = ""),
                t({ event: "hide" }))
              : "menu" != t.type || this.doActive
                ? "active" == t.type &&
                  t.opt.value &&
                  this.chooseOnce({ value: t.opt.value })
                : (this.activeMenu = !0);
          }));
        let e = 0;
        (window.electronAPI.control_ToHtml_gePetInfo((t, i) => {
          if (
            "info" != i.type ||
            ("hunger" != this.doActiveMenu?.foot &&
              "clean" != this.doActiveMenu?.foot &&
              "cure" != this.doActiveMenu?.foot)
          ) {
            if ("info" == i.type) {
              if (e) return;
              let t = () => {
                let e = {};
                for (let t in i.data) {
                  let n = i.data[t].now / i.data[t].max;
                  e[t] = {
                    label:
                      "hunger" == t
                        ? "饥饿："
                        : "clean" == t
                          ? "清洁："
                          : "健康：",
                    value: [i.data[t].now + "", i.data[t].max + ""],
                    background:
                      n > 0.6 ? "shenglan" : n > 0.3 ? "huangse" : "hongse",
                  };
                }
                this.petInfo = e;
              };
              (0 == e && t(),
                (e = setTimeout(() => {
                  (t(), (e = null));
                }, 6e4)));
            }
          } else {
            let e = this.doActiveMenu.foot,
              t = i.data[e].now / i.data[e].max;
            this.petInfo[e] = {
              label:
                "hunger" == e ? "饥饿：" : "clean" == e ? "清洁：" : "健康：",
              value: [i.data[e].now + "", i.data[e].max + ""],
              background: t > 0.6 ? "shenglan" : t > 0.3 ? "huangse" : "hongse",
            };
          }
        }),
          window.electronAPI.control_ToHtml_setActiveData((e, t) => {
            if (
              (console.log(" msg.data.result :>> ", t, this.doActiveMenu),
              (this.useActiveLoading = !1),
              "err" == t.type)
            ) {
              if ((console.log("msg :>> ", t), "dead" == t.data.overType))
                return void this.seeTip({
                  msg: "您的宠物已死亡，请用还魂丹进行复活~~",
                });
              if ("medicine" == t.data.type)
                return void this.seeTip({
                  msg: t.data.ill
                    ? "主人，吃错药了,我好难受~"
                    : "主人 我很健康哦~~",
                });
              t?.data?.msg && this.seeTip({ msg: t.data.msg, data: t.data });
            } else if ("stopGrowth" == t.type)
              this.seeTip({ msg: "您的宠物暂停成长中~~" });
            else if (t.type == this.doActiveMenu?.type) {
              if (
                ((this.activeList = t.data.result),
                console.log(" msg.data.result :>> ", t.data.result),
                this.activeList?.length % 4 != 0 &&
                  0 != this.activeList?.length)
              )
                for (let e = 4 - (this.activeList.length % 4); e > 0; e--)
                  this.activeList.push({});
              ((this.total = t.data.total),
                (this.current = t.data.current),
                console.log("this.a :>> ", this.activeList));
            }
          }),
          window.electronAPI.control_ToHtml_backDetermine((e, t) => {
            if ("winShow" == t.event)
              return (
                (this.winShowText = t.text),
                (this.winType = ""),
                void (this.winShow = !0)
              );
            ((this.tipOpt = t.data),
              (this.tipMainPosition = this.mousePosition));
          }),
          t({ event: "mounted" }));
      },
      methods: {
        // 浮动提示的落点：默认贴鼠标右下 15px；
        // 右边/下边放不下就翻到鼠标左侧/上方，最后再钳进窗口，避免被窗口裁掉。
        tipPos(mx, my, w, h) {
          const winW = window.innerWidth || 1100,
            winH = window.innerHeight || 505,
            PAD = 8,
            GAP = 15;
          let x = mx + GAP,
            y = my + GAP;
          if (x + w > winW - PAD) x = mx - GAP - w;
          if (y + h > winH - PAD) y = my - GAP - h;
          x = Math.max(PAD, Math.min(x, winW - w - PAD));
          y = Math.max(PAD, Math.min(y, winH - h - PAD));
          return { left: Math.round(x) + "px", top: Math.round(y) + "px" };
        },
        // hover 商品/课程时的浮动提示（宽度随内容变化，先按保守值估，量到后再修正）
        goodTipStyle() {
          const p = this.mousePosition || [0, 0],
            sz = this.goodTipSize || { w: 180, h: 70 };
          return this.tipPos(p[0], p[1], sz.w, sz.h);
        },
        // 提示是 CSS :hover 控制的显隐，只有鼠标移到格子上才会显示，
        // 所以每次鼠标移动后量一次当前可见的那条，拿到真实宽高。
        measureGoodTip() {
          let el = null;
          document.querySelectorAll(".c_m_a_tip").forEach((n) => {
            if (!el && n.offsetWidth && n.offsetHeight) el = n;
          });
          if (!el) return;
          const r = el.getBoundingClientRect(),
            w = Math.ceil(r.width),
            h = Math.ceil(r.height),
            old = this.goodTipSize;
          old && old.w === w && old.h === h || (this.goodTipSize = { w, h });
        },
        changeChildren(e) {
          this.activeUseData?.i != e &&
            ((this.activeUseData = { ...this.doActiveMenu.children[e], i: e }),
            (this.current = 1),
            window.electronAPI.control_ToMain_getActiveData(
              JSON.stringify({
                ...this.doActiveMenu,
                ...this.activeUseData,
                pageSize: this.pageSize,
                current: this.current,
              }),
            ));
        },
        closeTip(e) {
          (console.log("close", e),
            e
              ? (this.tipOpt = null)
              : (this.tipOpt?.data &&
                  (("work" != this.tipOpt?.data.type &&
                    "study" != this.tipOpt?.data.type) ||
                    this.useGood({ ...this.tipOpt.data, activeIt: !0 })),
                (this.tipOpt = null),
                (this.doActive = null),
                t({ event: "mainFocus" })));
        },
        seeTip(e) {
          "cure" != e.type
            ? ((this.tipOpt = e), (this.tipMainPosition = this.mousePosition))
            : window.electronAPI.control_ToMain_determine(
                JSON.stringify({ ...e }),
              );
        },
        useGood(e, t = 0) {
          (1 != e.isTake && null != e.isTake) ||
            (this.useActiveLoading,
            (this.useActiveLoading = !0),
            window.electronAPI.control_ToMain_useActiveData(
              JSON.stringify({
                ...e,
                inIndex: t,
                ...this.activeUseData,
                pageSize: this.pageSize,
                current: this.current,
              }),
            ));
        },
        nextPage(e) {
          (e
            ? this.total - this.current > 0 && ++this.current
            : this.current - 1 >= 1 && --this.current,
            window.electronAPI.control_ToMain_getActiveData(
              JSON.stringify({
                ...this.doActiveMenu,
                ...this.activeUseData,
                pageSize: this.pageSize,
                current: this.current,
              }),
            ));
        },
        closeActive() {
          ((this.doActive = !1),
            (this.doActiveMenu = null),
            this.saveActiveMenu &&
              ((this.activeMenu = !0),
              (this.saveActiveMenu = !1),
              (this.saveActiveList = []),
              (this.activeList = []),
              (this.current = 1),
              t({ event: "focus" })),
            this.isHide());
        },
        chooseOnce(e, t = {}) {
          if ("openWindow" != e.type) {
            if ("fz" == e.type)
              return (
                (this.winShowText =
                  "是否花费300元宝购买5天粉钻特权，20成长值/天 ~~"),
                (this.winType = "fz"),
                void (this.winShow = !0)
              );
            ((this.doActiveMenu = null),
              this.activeMenu &&
                ((this.saveActiveMenu = !0), (this.activeMenu = !1)),
              (this.doActiveMenu = n[e.value]),
              this.doActiveMenu?.children?.length > 0
                ? (this.activeUseData = {
                    ...this.doActiveMenu.children[t.index || 0],
                    i: t.index || 0,
                  })
                : (this.activeUseData = {}),
              this.doActiveMenu &&
                ((this.doActive = !0),
                window.electronAPI.control_ToMain_getActiveData(
                  JSON.stringify({
                    ...this.doActiveMenu,
                    ...this.activeUseData,
                    pageSize: this.pageSize,
                    current: 1,
                  }),
                )));
          } else
            window.electronAPI.control_ToMain_openWindow(JSON.stringify(e));
        },
        doMousePenetrate() {
          ((this.mouseMove = new move({
            id: "appMain",
            mousemove: (e, t) => {
              (this.isPenetrate != e.target.hasAttribute("cando") &&
                ((this.isPenetrate = e.target.hasAttribute("cando")),
                window.electronAPI.control_ToMain_eventMouse({
                  canDoType: this.isPenetrate,
                })),
                (this.mousePosition = [e.clientX, e.clientY]),
                this.measureGoodTip());
            },
          }).init()),
            document.addEventListener("mouseleave", () => {
              window.electronAPI.control_ToMain_eventMouse({ canDoType: !1 });
            }));
        },
        isHide() {
          this.activeMenu || this.doActive || t({ event: "hide" });
        },
        closeWindow() {
          t({ event: "close" });
        },
        toPercent: (e, t) => (+e / +t) * 100 + "%",
        closeTipWin(e) {
          ((e || !this.winType) && (this.winShow = !1),
            !e &&
              this.winType &&
              window.electronAPI.control_ToMain_useActiveData(
                JSON.stringify({
                  event: "winShow",
                  val: { type: this.winType, day: 5, growth: 20 },
                }),
              ));
        },
      },
    },
    n = {
      food: {
        value: "food",
        type: "food",
        name: "食物",
        icon: "../assets/control/icons/weishi.png",
        foot: "hunger",
      },
      clean: {
        value: "clean",
        type: "commodity",
        name: "清洁",
        icon: "../assets/control/icons/qingjie.png",
        foot: "clean",
      },
      cure: {
        value: "cure",
        type: "medicine",
        name: "吃药",
        icon: "../assets/control/icons/zhibing.png",
        foot: "cure",
      },
      work: {
        value: "work",
        type: "work",
        name: "打工",
        icon: "../assets/control/icons/dagong.png",
      },
      study: {
        value: "study",
        type: "study",
        name: "学习",
        icon: "../assets/control/icons/xuexi.png",
      },
      trip: {
        value: "trip",
        type: "trip",
        name: "旅游",
        icon: "../assets/control/icons/lvyou.png",
      },
      friend: {
        value: "friend",
        name: "好友",
        icon: "../assets/control/icons/haoyou.png",
      },
      play: {
        value: "play",
        name: "玩耍",
        icon: "../assets/control/icons/wanshua.png",
      },
      hlyg: {
        value: "hlyg",
        name: "渔港",
        type: "openWindow",
        icon: "../assets/control/icons/hlyg.png",
      },
      mstx: {
        value: "mstx",
        name: "密室",
        type: "openWindow",
        icon: "../assets/control/icons/mstx.png",
      },
      fz: {
        value: "fz",
        type: "fz",
        name: "开粉",
        icon: "../assets/control/icons/fenzhuan.png",
      },
      task: {
        value: "task",
        type: "task",
        name: "任务",
        icon: "../assets/control/icons/renwu.png",
        class: "activeTask",
        children: [
          { useType: "online", iconTitle: "url(../assets/tip/gift/6.svg)" },
          { useType: "sign", iconTitle: "url(../assets/tip/gift/4.svg)" },
        ],
      },
    };
  Vue.createApp(i).mount("#app");
  var o = window;
  for (var s in e) o[s] = e[s];
  e.__esModule && Object.defineProperty(o, "__esModule", { value: !0 });
})();
