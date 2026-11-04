(() => {
  var e = {},
    t = (e) => {
      window.electronAPI.rightMenu_h_bus(e);
    };
  const a = {
    data: () => ({
      menu: [
        {
          label: "喂养宠物",
          value: "feeding",
          fn: 1,
          children: [
            { label: "喂养", value: "food" },
            { label: "清洗", value: "clean" },
            { label: "吃药", value: "cure" },
          ],
        },
        { label: "小游戏", value: "smallGame" },
        { label: "商城", value: "openStore" },
        {
          label: "设置及帮助",
          value: "settingsAndHelp",
          children: [
            { label: "开启免打扰", value: "openMute" },
            { label: "宠物资料", value: "petInfo" },
            { label: "系统设置", value: "openSetup" },
          ],
          fn: 1,
        },
        { label: "停止成长", value: "stopGrowth" },
        { label: "开启自动学习", value: "openAutoStudy" },
        { label: "开启快速学习", value: "openStudyBoost" },
        { label: "退出宠物", value: "quit" },
      ],
      activeFatherValue: null,
      activeSunValue: null,
      positionType: null,
      sunBkBodyStyle: { transform: "translateX(-100%) translateY(-40%)" },
      menuMainStyle: { position: "fixed", bottom: "0", left: "50%" },
    }),
    computed: {},
    created() {},
    mounted() {
      (this.doMousePenetrate(),
        window.electronAPI.rightMenu_m_bus((e, t) => {
          if ("load" == t.type) {
            this.positionType = t.positionType;
            if ("trays" == t.positionType) {
              // 托盘右键：菜单贴窗口的某一侧（主进程已按托盘图标算好窗口位置），
              // 菜单只占一侧、另一侧留给子菜单，子菜单朝空白那侧展开。
              // 纵向用主进程给的 traysMenuTop 精确定位：窗口顶边就是菜单栏底边，
              // 不能再靠"窗口内留 60px 余量"——那样窗口会被系统钳回来，菜单跟着下坠。
              const mt = Number(t.traysMenuTop) || 0;
              this.menuMainStyle = {
                position: "fixed",
                left: "left" == t.traysAlign ? "0" : "210px",
                top: mt + "px",
                // CSS 里 .menuMain 有 bottom: 0，不清掉会和 top 一起把容器拉满全高
                bottom: "auto",
              };
              // 子菜单用绝对偏移定位（不走 translate）：托盘贴着菜单栏时，
              // translateY(-40%) 会把子菜单顶到屏幕顶部压住菜单栏；
              // top 再收敛一次，保证不越过窗口顶（越界会被窗口裁掉）。
              this.sunBkBodyStyle = {
                left: "left" == t.traysAlign ? "130px" : "-130px",
                top: Math.max(-28, -mt) + "px",
              };
            } else if ("followMain" == t.positionType) {
              ((this.menuMainStyle.left = "25%"),
                (this.menuMainStyle.bottom = "20px"),
                (this.sunBkBodyStyle.transform =
                  "translateX(100%) translateY(-40%)"),
                // 宠物本体右键时不显示「退出宠物」；按 value 找，别写死下标
                // （菜单里加过「开启自动学习」，写死的 5 会误伤新项）
                (this.menu.find((e) => "quit" == e.value).unShow = !0));
            }
            seeApp();
          } else if ("changeMenu" == t.type && t?.where?.length > 0 && t?.data) {
            let e = t.where.length;
            switch (e) {
              case (e = 1):
                t.where?.[0] &&
                  this.menu[this.getWhere(t.where[0])] &&
                  (this.menu[this.getWhere(t.where[0])] = t.data);
                break;
              case (e = 2):
                t.where?.[0] &&
                  t.where?.[1] &&
                  this.menu[this.getWhere(t.where[0])].children[
                    this.getWhere(t.where[1])
                  ] &&
                  (this.menu[this.getWhere(t.where[0])].children[
                    this.getWhere(t.where[1])
                  ] = t.data);
            }
          }
        }),
        t({ event: "mounted" }));
    },
    methods: {
      getWhere: (e) => e - 1,
      chooseItem(e, t, a) {
        if ("none" != e.state)
          if (e?.fn)
            "function" == typeof e.fn && e.fn({ item: e, type: a, id: t });
          else {
            let n = JSON.stringify({ ...e, type: a, label: e.value, id: t });
            window.electronAPI.rightMenu_h_setItem({ data: n });
          }
      },
      doMousePenetrate() {
        this.mouseMove = new move({
          id: "appMain",
          mousemove: (e, t) => {
            (this.isPenetrate != e.target.hasAttribute("cando") &&
              ((this.isPenetrate = e.target.hasAttribute("cando")),
              window.electronAPI.rightMenu_h_eventMouse({
                canDoType: this.isPenetrate,
              })),
              this.isPenetrate
                ? ((e.target.getAttribute("fv") ||
                    null == e.target.getAttribute("fv")) &&
                    this.setFv(e.target.getAttribute("fv")),
                  (e.target.getAttribute("sv") ||
                    null == e.target.getAttribute("sv")) &&
                    this.setSv(e.target.getAttribute("sv")))
                : (this.setFv(null), this.setSv(null)));
          },
        }).init();
      },
      setFv(e) {
        this.activeFatherValue != e && (this.activeFatherValue = e);
      },
      setSv(e) {
        this.activeSunValue != e && (this.activeSunValue = e);
      },
      closeWindow() {
        t({ event: "close" });
      },
    },
  };
  Vue.createApp(a).mount("#app");
  var n = window;
  for (var i in e) n[i] = e[i];
  e.__esModule && Object.defineProperty(n, "__esModule", { value: !0 });
})();
