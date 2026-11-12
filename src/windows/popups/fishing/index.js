(() => {
  var e = {},
    o = (e) => {
      window.electronAPI.fishing_h_bus(e);
    },
    t = null;
  const s = {
    data: () => ({ url: "", doerrIs: !1, t: null, retry: 0, watch: null }),
    computed: {},
    created() {},
    mounted() {
      let e = this;
      (window.electronAPI.fishing_m_bus((s, r) => {
        (console.log("msg", r),
          "load" == r.type
            ? ((e.url = r.data),
              seeApp(),
              e.startWatch(),
              setTimeout(() => {
                let e = document.querySelector("iframe");
                (console.log("ifram", e),
                  e.addEventListener("load", (e) => {
                    (((t = e.target.contentWindow.window).getPetInfoFromMain =
                      function () {
                        (console.log("getInfo"), o({ event: "getInfo" }));
                      }),
                      (t.saveInfoData = (e) => {
                        (console.log("datas", e),
                          o({ event: "saveDatas", data: e }));
                      }),
                      (t.close_game = () => {
                        o({ event: "close" });
                      }),
                      setTimeout(() => {
                        ((t.selfeLoad = !0), console.log("selfeLoad", t));
                      }, 0));
                  }));
              }, 0))
            : "setPetInfo" == r.type && t && t.setPetInfo(r.data));
      }),
        o({ event: "mounted" }));
    },
    methods: {
      // iframe 里的 SWF 起没起来，只能由它自己上报（window.__fishReady）。
      // 待机久了再开窗口，偶尔 iframe 整个加载失败（服务地址变化）或者 Ruffle
      // 没接管 <embed>，表现就是只剩左上角两个图标、SWF 区域全空。
      // 这里每 2 秒看一次，40 秒还没就绪就换地址重载，最多重试两次。
      // 留 40 秒是给冷启动留余量（wasm 首次编译偶尔要十几秒），别把正常加载打断。
      startWatch() {
        clearInterval(this.watch);
        let n = 0;
        this.watch = setInterval(() => {
          const w = this.frameWindow();
          if (w && w.__fishReady) {
            clearInterval(this.watch);
            this.watch = null;
            return;
          }
          if (++n < 20) return;
          clearInterval(this.watch);
          this.watch = null;
          if (this.retry >= 2) return;
          this.retry++;
          console.log("fishing iframe reload", this.retry);
          // 加个时间戳强制重新请求，避免沿用上一次的失败状态。
          this.url = String(this.url).split("?")[0] + "?r=" + Date.now();
          this.startWatch();
        }, 2000);
      },
      frameWindow() {
        try {
          const f = document.querySelector("iframe");
          return f && f.contentWindow;
        } catch (e) {
          return null;
        }
      },
      closeWindow() {
        o({ event: "close" });
      },
      doError() {
        this.doerrIs
          ? (console.log("iframeWindow?.errorFishesDo", t, t?.errorFishesDo),
            t?.errorFishesDo && t.errorFishesDo(),
            (this.doerrIs = !1),
            this.t && clearTimeout(this.t))
          : ((this.doerrIs = !0),
            (this.t = setTimeout(() => {
              ((this.doerrIs = !1), (this.t = null));
            }, 5e3)));
      },
    },
  };
  Vue.createApp(s).mount("#app");
  var r = window;
  for (var n in e) r[n] = e[n];
  e.__esModule && Object.defineProperty(r, "__esModule", { value: !0 });
})();
