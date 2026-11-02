(() => {
  var t = {},
    e = (t) => {
      window.electronAPI.html_ToMain(t);
    };
  window.RufflePlayer = window.RufflePlayer || {};
  const i = {
    data: () => ({
      nowPosition: "",
      position: "center",
      maxSize: [144, 144],
      sizeStyle: { width: "144px", height: "144px" },
      loads: !1,
      petContent: null,
      petInfo: { info: {}, maxInfo: {}, activeOption: {}, otherOptions: {} },
      petControl: null,
      curState: !1,
      swfPet: null,
      floatArr: [],
    }),
    watch: {
      maxSize: {
        handler(t, e) {
          ((this.sizeStyle = { width: t[0] + "px", height: t[1] + "px" }),
            this.setMainPosition([0, 0]));
        },
        deep: !0,
      },
    },
    computed: {},
    created() {
      window.addEventListener(
        "message",
        (t) => {
          console.log("res father:>> ", t);
        },
        !1,
      );
    },
    mounted() {
      ((this.loads = !0),
        this.initPet(),
        this.doMove(),
        this.bindWheel(),
        this.getNowPosition(),
        window.electronAPI.main_ToHtml((t, e) => {
          if ("load" == e.type) {
            (e.bd && seeApp(),
              (this.petInfo = e.petInfo),
              (this.maxSize = e.maxSize));
            let t = [
              e.nowPosition[0] - +this.petInfo.info.lastX,
              e.nowPosition[1] - +this.petInfo.info.lastY,
            ];
            (this.setMainPosition(t),
              this.swfPet.init &&
                this.swfPet.init({
                  state: this.petInfo,
                  baseRouter: e.bd ? "../assets/Action" : "../../assets/Action",
                }),
              setTimeout(() => {
                try {
                  let _bd = e.bd ? "../assets/Action" : "../../assets/Action",
                    _sx = "MM" == this.petInfo.info.sex ? "MM" : "GG",
                    _lv = this.petInfo.maxInfo.level,
                    _st = _lv <= 4 ? "Egg" : _lv < 9 ? "Kid" : "Adult",
                    _n = "Egg" == _st ? 29 : 112;
                  for (let _md of ["happy", "prostrate"])
                    for (let _i = 1; _i <= _n; _i++)
                      fetch(`${_bd}/${_sx}/${_st}/${_md}/play/P${_i}.swf`).catch(
                      () => {},
                    );
                } catch (e) {}
              }, 5000));
          }
        }),
        window.electronAPI.main_ToHtml_setSay((t, e) => {
          try {
            e = JSON.parse(e);
          } catch {}
          for (let t in e) console.log(e[t]);
        }),
        window.electronAPI.main_ToHtml_setPet((t, e) => {
          ((this.petInfo = e),
            this.swfPet.setPetState && this.swfPet.setPetState(e));
        }),
        window.electronAPI.main_ToHtml_active((t, e) => {
          (this.swfPet.changeSwf &&
            this.swfPet.changeSwf(e.active, {
              load: () => {
                e.load &&
                  window.electronAPI.html_ToMain_backPetLoadFinish({
                    type: e?.type || null,
                    data: e.load,
                    event: "load",
                    otherOpt: e.otherOpt || null,
                  });
              },
              finish: () => {
                e.finish &&
                  window.electronAPI.html_ToMain_backPetLoadFinish({
                    type: e?.type || null,
                    data: e.finish,
                    event: "finish",
                    otherOpt: e.otherOpt || null,
                  });
              },
            }),
            window.electronAPI.html_ToMain_getFocus());
        }),
        window.electronAPI.main_m_nextActive((t, e) => {
          let i = !0;
          if (e?.data)
            try {
              i = JSON.parse(e.data);
            } catch {}
          this.swfPet.doNext && this.swfPet.doNext(i);
        }),
        window.electronAPI.main_m_setFloat((t, e) => {
          "seeFloat" == e.type && this.seeFloat(e.data);
        }),
        e({ event: "mounted" }));
    },
    methods: {
      seeFloat(t) {
        t?.num &&
          (this.floatArr.push({
            id: Math.round(4e3 * Math.random() + 100),
            icon: "laugh",
            type: "addMood",
            nums: (t.num + "").split(""),
          }),
          setTimeout(() => {
            this.floatArr.shift();
          }, t?.time || 200));
      },
      clickPet(t) {
        console.log("e :>> ", t);
      },
      initPet(t) {
        this.swfPet = new swfPet({
          id: "pet",
          goNormal: this.goNormal,
          backFn: (t) => {
            (console.log("e", t),
              window.electronAPI.main_h_setPetState({
                type: "setState",
                data: JSON.stringify(t),
              }));
          },
        });
      },
      goNormal() {
        return "left" == this.position
          ? "hideleft"
          : "right" == this.position
            ? "hideright"
            : "center" == this.position
              ? "normal"
              : void 0;
      },
      setMainPosition(t, e = {}) {
        window.electronAPI.html_ToMain_move({
          next: t,
          maxSize: [...this.maxSize],
          notChangeSize: e.changeSize || this.notChangeSize || !1,
        });
      },
      // 滚轮 / 触控板双指滑动安抚宠物。
      // 原版把这件事错接到了 mousedown 的 which==2（鼠标中键）上，触控板根本按不出中键，
      // 所以那条路等于不存在。这里补一个真正的 wheel 监听：
      // 触控板双指滑动同样会派发 wheel 事件，不需要外接鼠标。
      bindWheel() {
        let last = 0;
        window.addEventListener(
          "wheel",
          () => {
            const now = Date.now();
            // 触控板有惯性滚动，一次手势会连续派发很多事件，800ms 内只算一次
            if (now - last < 800) return;
            last = now;
            window.electronAPI.html_ToMain_mouse({ type: "roller" });
          },
          { passive: true },
        );
      },
      // 拖着宠物玩 = 涨心情。原版有两个判据，这份代码里都丢了，这里一并补上：
      //
      // ① 绕圈：路径曲率积分。完整画一圈总转角约 ±2π，直线拖拽接近 0。
      // ② 高频晃动：短时间内在原地来回摆。绕圈的转角是「同向」累加的，晃动时
      //    正负相互抵消、总转角≈0，所以转角判据永远抓不到晃动，必须单独用
      //    「换向次数」来判：来回摆一次就会出现一次 >100° 的急折角。
      //
      // 共同前提：必须用 screenX/screenY —— 拖拽时窗口本身在动，clientX 会失真；
      // 并且要做「距离重采样」：拖拽时 mousemove 极其密集（高刷屏每帧只挪 1~2px），
      // 若按事件逐个采样，相邻步长太短，转角一次都累加不上。所以位移不足 6px
      // 就原地不动、也不推进采样点，攒够 6px 才取下一个点。
      checkDragCircle(e) {
        if (!this.curState) return void this._resetDragTrack();
        if (!e || null == e.screenX || null == e.screenY) return;
        let p = { x: e.screenX, y: e.screenY };
        // 第一个采样点只做锚点
        if (!this._cP2) {
          ((this._cP2 = p), (this._cAngle = 0), (this._cP1 = null), (this._cPath = []));
          return;
        }
        // 位移不足：直接丢弃，不推进采样点
        if (Math.hypot(p.x - this._cP2.x, p.y - this._cP2.y) < 6) return;

        // —— 判据①：绕圈，相邻三点的转角累加 ——
        // 注意这里必须配合下面的「窗口路程」一起判：光看转角的话，
        // 手停在原地轻微发抖也能把转角摇满好几圈（实测 10px 抖动就能凑够）。
        if (this._cP1) {
          let v1x = this._cP2.x - this._cP1.x,
            v1y = this._cP2.y - this._cP1.y,
            v2x = p.x - this._cP2.x,
            v2y = p.y - this._cP2.y;
          this._cAngle =
            (this._cAngle || 0) + Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y);
        }

        // —— 判据②：晃动，1.2 秒窗口内的运动学统计 ——
        let path = this._cPath || (this._cPath = []),
          now = Date.now();
        (path.push({ x: p.x, y: p.y, t: now }),
          // 只保留最近 1.2 秒，至少留两个点
          (() => {
            while (path.length > 2 && now - path[0].t > 1200) path.shift();
          })());
        let dist = 0,
          flips = 0;
        for (let i = 1; i < path.length; i++) {
          let ax = path[i].x - path[i - 1].x,
            ay = path[i].y - path[i - 1].y;
          dist += Math.hypot(ax, ay);
          if (i > 1) {
            let bx = path[i - 1].x - path[i - 2].x,
              by = path[i - 1].y - path[i - 2].y,
              d = Math.hypot(ax, ay) * Math.hypot(bx, by);
            // 夹角 >100° 才算一次换向；画圈时每步只转几度，不会命中
            d > 0 && (ax * bx + ay * by) / d < -0.17 && flips++;
          }
        }
        // 净位移 / 总路程：晃动的特征是「原地来回」，这个比值远小于 1；
        // 拖着宠物换位置是单调移动，比值接近 1，靠它把误触发挡掉。
        let spread = dist ? Math.hypot(p.x - path[0].x, p.y - path[0].y) / dist : 1,
          // 最近 1.2 秒真的走出了一段轨迹，才算「在绕圈」而不是「停在原地抖」
          moved = dist >= 150,
          isCircle = Math.abs(this._cAngle || 0) >= Math.PI * 2 * 0.8 && moved,
          // 换向 ≥4 次、路程 ≥300px、且是原地来回
          isShake = flips >= 4 && dist >= 300 && spread < 0.5;

        ((this._cP1 = this._cP2), (this._cP2 = p));

        // 拖拽过程中判定到「在陪它玩」先只记下来，不立刻结算——
        // 心情值和台词统一等松手时再加，这样一次拖拽只给一次反馈，
        // 不会边晃边连续弹台词。
        if ((isCircle || isShake) && !this._playPending) {
          ((this._playPending = isShake ? "shake" : "circle"), this._resetDragTrack());
        }
      },
      // 松手结算：本次拖拽确实陪它玩过，才加心情 + 说一句
      _settleDragPlay() {
        let by = this._playPending;
        this._playPending = null;
        if (!by) return;
        let now = Date.now();
        // 3 秒冷却：连续甩来甩去不要刷心情
        if (now - (this._cLast || 0) <= 3000) return;
        ((this._cLast = now),
          window.electronAPI.html_ToMain_mouse({ type: "circle", by: by }));
      },
      _resetDragTrack() {
        ((this._cP1 = null), (this._cP2 = null), (this._cAngle = 0), (this._cPath = []));
      },
      async doMove() {
        this.moveOut = new move({
          id: "move",
          contextmenu: () => {
            this.isClosed;
          },
          mousedown: (t) => {
            1 == t.which
              ? ((this._downAt = [t.screenX, t.screenY]),
                (this.curState = !0),
                (this._playPending = null),
                this._resetDragTrack(),
                window.electronAPI.html_ToMain_mouse({
                  data: t,
                  type: "which",
                }))
              : 2 == t.which
                ? window.electronAPI.html_ToMain_mouse({ type: "roller" })
                : 3 == t.which &&
                  window.electronAPI.html_ToMain_mouse({
                    data: { ...t, clientX: t.clientX, clientY: t.clientY },
                    type: "rightClick",
                  });
          },
          mousemove: (t, e) => {
            (e.next && this.setMainPosition(e.next),
              this.checkDragCircle(t),
              window.electronAPI.html_ToMain_mouse({ data: t, type: "move" }));
          },
          mouseup: (t, e) => {
            (e.isDown && this.swfPet.changeSwf(),
              // 松手点也纳入轨迹判定，避免快速甩完一圈立刻松手时漏判
              this.checkDragCircle(t),
              (this.curState = !1),
              // 结束本轮拖拽，清掉轨迹
              this.checkDragCircle(),
              // 陪玩统一在松手这一刻结算（加心情 + 说一句）
              this._settleDragPlay(),
              // 判断「点击」必须用 screenX/screenY：拖拽时窗口是跟着鼠标走的，
              // mouseup 时鼠标相对窗口的位置（clientX）几乎回到按下时的原点，
              // 用 client 坐标算位移会恒小于阈值，于是每次拖拽松手都被误判成
              // 点了一下，进而弹出状态面板。屏幕坐标才是真实的移动距离。
              1 == t.which &&
                this._downAt &&
                Math.hypot(
                  t.screenX - this._downAt[0],
                  t.screenY - this._downAt[1],
                ) < 6 &&
                window.electronAPI.html_ToMain_mouse({ type: "petClick" }),
              window.electronAPI.html_ToMain_mouse({ data: e, type: "which" }));
          },
          mouseout: (t, e) => {},
        }).init();
        let t = this.moveOut.getSize()[0];
        this.maxSize = [t, t];
      },
      getNowPosition() {
        window.electronAPI.main_ToHtml_setPotision((t, e, i) => {
          ((this.nowPosition = e),
            (this.position =
              e[0] <= 3
                ? "left"
                : e[0] >= +i[0] - +this.maxSize[0] - 3
                  ? "right"
                  : "center"));
        });
      },
      closeWindow() {
        e({ event: "close" });
      },
    },
  };
  Vue.createApp(i).mount("#app");
  var o = window;
  for (var n in t) o[n] = t[n];
  t.__esModule && Object.defineProperty(o, "__esModule", { value: !0 });
})();
