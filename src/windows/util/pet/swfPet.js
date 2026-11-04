(() => {
  var t = {};
  class e {
    useData = ["id", "dom", "backFn", "normalSwf", "router"];
    id = "";
    dom = null;
    // 「正在显示」与「正在下层加载」的宠物节点，换片竞态全靠这两个字段区分
    showing = null;
    pending = null;
    frozen = null;
    // 静态动作的画面缓存（key = swf 地址），避免切过去时还残留上一段动画
    _frames = {};
    defaultAttribute = {
      id: "",
      name: "",
      class: "",
      wmode: "transparent",
      allowscriptaccess: "always",
      style: "",
    };
    backFn = null;
    state = null;
    nextSwfRouter = {};
    oldNext = {};
    saveNext = {};
    changeNum = -1;
    normalSwf = null;
    router = null;
    changeIng = !1;
    delayTime = 90;
    onceNext = !1;
    constructor(t = {}) {
      for (let e in this.useData)
        this[this.useData[e]] = t[this.useData[e]] || null;
      this.defaultAttribute = {
        id: t.id || null,
        name: "pet",
        class: "pet",
        wmode: "transparent",
        allowScriptAccess: "always",
        type: "application/x-shockwave-flash",
      };
    }
    saveChange = null;
    // 换片。
    //
    // 难点：Ruffle 每次换片都要新建播放器实例，重新初始化 wasm、读 SWF、解首帧。
    // 实测（无头 Electron 逐帧量像素）：新实例 ~250ms 才 readyState>=2，
    // 画布真正出现像素要 ~310ms 以上。原实现 90ms 就把旧节点删了，
    // 中间这两百多毫秒新旧都没有画面 —— 这就是「切换时闪一下」的真正来源。
    //
    // 而如果让旧实例一直演到新实例出画（屏幕确实不会白），文档里就会同时存在
    // 两个 Ruffle 实例；一旦某个时刻两者的可见状态同时为真，就叠成两只宠物
    // （「4 只手」）。这条路径很难穷举，所以改成【快照交接】：
    // 任何时刻文档里最多只有一个 Ruffle 实例。
    //
    //   ① 换片前把当前画面 drawImage 到一张静态 canvas（快照），盖在最上层；
    //   ② 立刻移除旧节点 —— 旧实例当场销毁，不可能再参与渲染；
    //   ③ 新节点插在原位，加载期间 opacity:0 + visibility:hidden，彻底不可见；
    //   ④ 轮询新节点 canvas，真的读出像素后才显形，同一帧撤掉快照。
    //
    // 两帧内容本来就一样，快照期间看不出差别，只是把等待期从「白屏/重影」
    // 换成「定格一帧」。快照失败（WebGL 渲染器读不回像素）则退回旧路线：
    // 旧节点继续演、新节点藏在它下面加载 —— 那时至少还有画面，不会白。
    changeSwf(t = {}) {
      let { option: e, backFn: a } = t;
      if (r([e.src])) return;
      try {
        let old = this.curShowing();
        // 拿不到「当前画面」（上一轮还在加载 / 正被快照挡着）就先挂起，
        // 等那一轮交接完成后再重放，否则会克隆出一个还没出画的空壳。
        if (!old || !old.parentNode) return void (this.saveChange = e);
        var neo = old.cloneNode(!0);
        for (let k in this.defaultAttribute)
          neo.setAttribute(k, this.defaultAttribute[k]);
        for (let k in e) neo.setAttribute(k, e[k]);
        if (this.changeIng) return void (this.saveChange = e);
        this.changeIng = !0;
        if (this.nextSwfRouter?.opt?.size) {
          let sz = this.nextSwfRouter?.opt?.size;
          neo.style.width = sz[0] + "px";
          neo.style.height = sz[1] + "px";
        }
        // 换片令牌：新一轮换片让上一轮还在轮询的监视器失效
        let myId = (this._fadeId = (this._fadeId || 0) + 1);
        // 上一轮还没露脸的候选先丢掉，避免两个候选同时在加载
        this.dropPending();
        // 清掉历史残留（只动宠物节点，别误伤 .focusPress 那层）
        this.clearPetSiblings(old);
        // 新节点在加载期间必须彻底不可见：opacity 挡住自身，
        // visibility 连溢出部分（新旧动画尺寸不一致时会从边缘漏出来）一起挡掉。
        // 两者都不影响 canvas 内部绘制，hasPaint 照样能读到像素。
        this.hideNode(neo);
        this.hardStyle(old, "transition", "none");
        let parent = old.parentNode;
        // 优先用「目标动作」缓存的画面：Stand 只有一个姿势，
        // 直接显示它，屏幕上立刻就是站姿 —— 不会再把刚才的玩耍动画留在上面。
        // 没有缓存（第一次切过去）才退而冻结当前画面。
        let snap = this.cachedFrame(e.src) || this.freeze(old);
        if (snap) {
          this.dropSnap();
          parent.insertBefore(snap, old);
          try {
            old.remove();
          } catch (err) {}
          ((this.frozen = snap), (this.showing = null));
          parent.insertBefore(neo, snap.nextSibling);
        } else {
          // 兜底：读不回像素，只能让旧节点继续演，新节点藏在它下面
          try {
            let rect = old.getBoundingClientRect();
            rect.width && (old.style.width = Math.round(rect.width) + "px");
            rect.height && (old.style.height = Math.round(rect.height) + "px");
          } catch (e) {}
          old.style.position = "absolute";
          old.style.top = "0.2px";
          old.style.left = "0.2px";
          old.style.zIndex = "1";
          // 旧节点让出 id，否则 getElementById 拿到的是旧的
          old.removeAttribute("id");
          parent.insertBefore(neo, old);
          this.showing = old;
        }
        this.pending = neo;
        this.revealWhenReady(old, neo, myId, e.src);
        setTimeout(() => {
          try {
            this.changeIng = !1;
            // 只有当前画面可用时才重放积压的请求；否则交给交接完成后的重试
            this.saveChange &&
              this.showing &&
              (this.changeSwf(this.saveChange), (this.saveChange = null));
          } catch (err) {}
          // Ruffle polyfill 可能晚于定时器才把 <embed> 换成自己的元素，
          // 等新节点真正挂上再回传，否则 this.dom 会指向已被移除的节点。
          this.bindDom((node) => {
            let info = { ...e, event: "setState", dom: node };
            (s(a) && a(info),
              s(this.backFn) && this.backFn(info),
              this.changeNum++);
          });
        }, this.delayTime);
      } catch (t) {
        console.log(t);
      }
    }
    // 真正在显示的那个宠物节点。
    // 不能直接用 this.dom：换片 90ms 后 bindDom 会把它指向还在下层加载的新节点，
    // 拿它当「旧画面」，就会把真正的旧画面当残渣删掉，剩下的两个节点都会显示。
    curShowing() {
      let s = this.showing;
      if (s && s.isConnected) return s;
      let byId = document.getElementById(this.id);
      if (byId && byId.isConnected) {
        // 它是正在加载的候选时不能当「当前画面」用（还没有内容可克隆）
        if (this.pending && byId === this.pending) return null;
        this.pending = null;
        return (this.showing = byId);
      }
      let d = this.dom;
      if (d && d.isConnected) {
        this.pending = null;
        return (this.showing = d);
      }
      return null;
    }
    // 把一张 canvas 做成可插入页面的静态帧：先采样确认不是空白，再复制、摆位。
    snapFromCanvas(c) {
      try {
        if (!c || !c.width || !c.height) return null;
        // 先缩到 24x24 采样，确认真有画面，避免把一张空白帧当成快照
        let p = this._probe;
        if (!p) {
          p = this._probe = document.createElement("canvas");
          p.width = 24;
          p.height = 24;
        }
        let pc = p.__ffCtx || (p.__ffCtx = p.getContext("2d"));
        if (!pc) return null;
        pc.clearRect(0, 0, 24, 24);
        pc.drawImage(c, 0, 0, 24, 24);
        let d = pc.getImageData(0, 0, 24, 24).data,
          hit = 0;
        for (let i = 3; i < d.length; i += 4) d[i] > 8 && hit++;
        if (hit < 6) return null;
        let snap = document.createElement("canvas");
        snap.width = c.width;
        snap.height = c.height;
        snap.className = "petFreeze";
        let ctx = snap.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(c, 0, 0);
        (this.hardStyle(snap, "position", "absolute"),
          this.hardStyle(snap, "left", "0"),
          this.hardStyle(snap, "top", "0"),
          this.hardStyle(snap, "width", "100%"),
          this.hardStyle(snap, "height", "100%"),
          this.hardStyle(snap, "z-index", "10"),
          this.hardStyle(snap, "pointer-events", "none"));
        return snap;
      } catch (e) {
        return null;
      }
    }
    // 把当前宠物的画面冻结成静态帧
    freeze(node) {
      try {
        return this.snapFromCanvas(
          node && node.shadowRoot && node.shadowRoot.querySelector("canvas"),
        );
      } catch (e) {
        return null;
      }
    }
    // 静态动作（Stand 这类只有一帧的）把它那一帧缓存下来。
    // 切过去时先显示这张图 —— 屏幕上立刻就是目标姿势，
    // 而不是把上一段玩耍动画定格/续播那么一小会儿。
    // 动态动作不缓存：缓存的是上次播到的中间帧，拿来顶会跳帧。
    isStill(src) {
      return !!src && -1 !== (src + "").indexOf("Stand");
    }
    cachedFrame(src) {
      if (!this.isStill(src)) return null;
      return this.snapFromCanvas(this._frames[src]);
    }
    saveFrame(src, node) {
      if (!this.isStill(src)) return;
      try {
        let c = node && node.shadowRoot && node.shadowRoot.querySelector("canvas");
        if (!c || !c.width || !c.height) return;
        let cp = document.createElement("canvas");
        cp.width = c.width;
        cp.height = c.height;
        cp.getContext("2d").drawImage(c, 0, 0);
        this._frames[src] = cp;
      } catch (e) {}
    }
    // 撤掉静态帧。按 class 兜底清理，避免某次 remove 失败后
    // 留一层静态图永远盖在宠物上面。
    dropSnap() {
      this.frozen = null;
      try {
        let list = document.querySelectorAll("canvas.petFreeze");
        for (let i = list.length - 1; i >= 0; i--) list[i].remove();
      } catch (e) {}
    }
    // 彻底隐藏一个节点（不依赖 #pet 那条 transition，内联 !important 硬压）
    hideNode(el) {
      try {
        this.hardStyle(el, "transition", "none");
        this.hardStyle(el, "opacity", "0");
        this.hardStyle(el, "visibility", "hidden");
      } catch (e) {}
    }
    // 丢弃还没露脸的候选节点
    dropPending() {
      let p = this.pending;
      this.pending = null;
      if (!p) return;
      this.hideNode(p);
      setTimeout(() => {
        try {
          p.isConnected && p.remove();
        } catch (e) {}
      }, 0);
    }
    // 只清宠物节点，保留 keep 这一个
    clearPetSiblings(keep) {
      try {
        let parent = keep && keep.parentNode;
        if (!parent) return;
        for (let k = parent.children.length - 1; k >= 0; k--) {
          let n = parent.children[k];
          if (n === keep || n === this.pending || n === this.frozen) continue;
          let tag = (n.tagName || "").toUpperCase();
          if ("EMBED" !== tag && -1 === tag.indexOf("RUFFLE")) continue;
          this.hideNode(n);
          setTimeout(() => {
            try {
              n.remove();
            } catch (e) {}
          }, 0);
        }
      } catch (e) {}
    }
    hardStyle(el, k, v) {
      try {
        el.style.setProperty(k, v, "important");
      } catch (e) {}
    }
    // 读画布像素，判断「真的画出来了」。
    // 不能用 metadata / readyState：实测它们比首帧早约 60ms，拿它们当判据，
    // 切换瞬间正好露出空白。getContext("2d") 返回 null 说明 Ruffle 走的是 WebGL
    // 渲染器（像素读不出来），这时退回「readyState>=2 再多等一会儿」的保守判断。
    hasPaint(el) {
      try {
        let c = el && el.shadowRoot && el.shadowRoot.querySelector("canvas");
        if (!c || !c.width || !c.height) return !1;
        let ctx = c.__ffCtx;
        if (void 0 === ctx) {
          ctx = c.getContext("2d");
          c.__ffCtx = ctx || null;
        }
        if (!ctx) {
          this._pixelReadable = !1;
          return !1;
        }
        this._pixelReadable = !0;
        let probe = this._probe;
        if (!probe) {
          probe = this._probe = document.createElement("canvas");
          probe.width = 24;
          probe.height = 24;
        }
        let pctx = probe.__ffCtx || (probe.__ffCtx = probe.getContext("2d"));
        if (!pctx) return !1;
        pctx.clearRect(0, 0, 24, 24);
        pctx.drawImage(c, 0, 0, 24, 24);
        let d = pctx.getImageData(0, 0, 24, 24).data,
          hit = 0;
        for (let i = 3; i < d.length; i += 4) d[i] > 8 && hit++;
        // 至少 1% 的采样点有内容，才算画出东西了
        return hit >= 6;
      } catch (e) {
        return !1;
      }
    }
    // 等新节点真正出画，再交接。整个过程屏幕上一直有画面（快照或旧节点）。
    revealWhenReady(old, neo, myId, src) {
      let start = Date.now(),
        done = !1;
      const MIN_WAIT = 90,
        MAX_WAIT = 3000;
      const swap = () => {
        // 已经有新一轮换片接管，这次交接作废（新节点由那一轮负责清理）
        if (myId !== this._fadeId) return;
        // Ruffle 可能把 <embed> 替换成自己的元素，现取真正挂着的那个
        let live = document.getElementById(this.id);
        if (!live || !live.isConnected) live = neo;
        if (!live) return;
        // 同一帧交接：新画面显形、旧画面/快照消失，不留中间态
        this.hardStyle(live, "transition", "none");
        this.hardStyle(live, "opacity", "1");
        this.hardStyle(live, "visibility", "visible");
        if (old && old !== live && old.isConnected) this.hideNode(old);
        this.dropSnap();
        (this.showing = live), (this.pending = null);
        this.dom = live;
        // 静态动作攒一帧下来，下次切过去就能瞬间显示
        this.saveFrame(src, live);
        setTimeout(() => {
          try {
            old && old.isConnected && old.remove();
          } catch (e) {}
        }, 120);
        // 交接期间被挂起的换片请求，现在可以执行了
        if (this.saveChange) {
          let s = this.saveChange;
          this.saveChange = null;
          setTimeout(() => this.changeSwf(s), 30);
        }
      };
      const finish = () => {
        if (done) return;
        done = !0;
        if (myId !== this._fadeId) return;
        // 读不到像素（WebGL 渲染器）时，前面的就绪判断只能靠时序估，
        // 留一点余量再撤旧画面。旧节点在上层，多留一会儿只是「旧动作多演 0.2 秒」，
        // 顶多是切换稍慢，绝不会露出空白。
        let wait = !1 === this._pixelReadable ? 160 : 0;
        wait ? setTimeout(swap, wait) : swap();
      };
      const tick = () => {
        if (done) return;
        if (myId !== this._fadeId) {
          done = !0;
          return;
        }
        let elapsed = Date.now() - start,
          cur = document.getElementById(this.id) || neo,
          ok = this.hasPaint(cur);
        // 读不到像素（WebGL 渲染器）时的保守兜底：整片加载完 + 明显超过首帧耗时
        if (!ok && !1 === this._pixelReadable) {
          let rs = -1;
          try {
            rs = cur && cur.readyState;
          } catch (e) {}
          rs >= 2 && elapsed >= 420 && (ok = !0);
        }
        if (ok && elapsed >= MIN_WAIT) return void finish();
        if (elapsed > MAX_WAIT) return void finish();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    bindDom(t, e = 40) {
      let a = document.getElementById(this.id);
      if (a && !1 !== a.isConnected)
        return ((this.dom = a), ffMap.delete(a), void t(a));
      e > 0
        ? setTimeout(() => this.bindDom(t, e - 1), 50)
        : ((this.dom = a || this.dom), t(this.dom));
    }
    setState(t) {
      this.state = t;
      let {
        currentFrame: e,
        frame: a,
        isPlaying: i,
        percentLoaded: n,
      } = this.state;
      if (this.nextSwfRouter && "exit" !== this.oldNext.name) {
        if ("game" == this.oldNext.name) return;
        if (
          this.oldNext?.opt?.afterState &&
          this.oldNext?.opt?.afterState?.length > 0 &&
          "exit" !== this.nextSwfRouter.name &&
          !this.oldNext?.opt?.afterState?.includes(this.nextSwfRouter.name)
        )
          return void (this.nextSwfRouter = null);
        if ((-1 == this.changeNum || 0 == this.changeNum) && -1 == e) return;
        let t = this.oldNext?.opt?.lastTimeCut || 1;
        if (
          (this.onceNext?.name
            ? -1 != (this.onceNext.name + "").indexOf(this.nextSwfRouter.name)
            : this.onceNext) ||
          a == e + t ||
          // Stand.swf 这类站姿只有 1 帧，永远等不到“播到倒数第 t 帧”，
          // 有排队动作时直接放行，否则喂食/洗澡/说话/闲置玩耍全都上不了屏
          1 === a ||
          this.nextSwfRouter?.opt?.power > this.oldNext?.opt?.power ||
          (this.nextSwfRouter?.opt?.power == this.oldNext?.opt?.power &&
            this.nextSwfRouter?.opt?.canSelfSet) ||
          "exit" === this.nextSwfRouter.name ||
          "normal" == this.oldNext?.opt?.isOverState
        ) {
          if (
            (this.onceNext && (this.onceNext = !1),
            this.changeSwf({ option: this.nextSwfRouter }),
            this.nextSwfRouter?.callBack?.load &&
              this.nextSwfRouter?.callBack?.load(),
            this.nextSwfRouter?.opt?.backSwf)
          ) {
            let t = null,
              e = this.nextSwfRouter?.opt?.backSwf;
            ((t =
              "string" == typeof e
                ? "normal" == e
                  ? null
                  : e
                : e.backSwfChange
                  ? "canNext"
                  : "normal" == e.name
                    ? null
                    : e.name),
              setTimeout(() => {
                ("canNext" == t && this.nextSwfRouter) ||
                  this.nextSwf(
                    "canNext" == t ? "" : t,
                    () => {},
                    this.oldNext.opt,
                  );
              }, this.delayTime + 10));
          }
          (this.oldNext = this.nextSwfRouter),
            (this.nextSwfRouter = null),
            "normal" == this.oldNext?.opt?.state && this.armIdle();
          return;
        }
        if (1 != a && e + t < a && !i)
          return (
            this.oldNext?.opt?.nextFrames &&
              this.goToFrames(this.oldNext.opt.nextFrames),
            void this.play()
          );
      }
      if (this.oldNext?.callBack?.finish) {
        if (this.changeIng) return;
        if ((-1 == this.changeNum || 0 == this.changeNum) && -1 == e) return;
        a == e + (this.oldNext?.opt?.lastTimeCut || 1) + 1 &&
          (this.oldNext.callBack.finish(),
          (this.oldNext.callBack.finish = null));
      }
    }
    playTime = null;
    // 闲置动作：原来只在 nextSwf() 里排一次，动作演完回到 Stand 后就不会再排了，
    // 表现就是"企鹅站着不动"。改成每次落回 normal 后重新排一次，形成常驻循环。
    armIdle() {
      (this.playTime && clearTimeout(this.playTime),
        (this.playTime = setTimeout(() => {
          this.playTime = null;
          // 正在换片或已有排队动作就先让位，别打断喂食/洗澡这类主动作
          if (this.changeIng || this.nextSwfRouter) return void this.armIdle();
          // 生病/垂死/死亡(isSick 1/2/3)期间不自发玩耍，恢复后循环会重新放行
          if (this.router?.isSick) return void this.armIdle();
          // 气泡:玩耍 = 1:9（原来 3:7，气泡偏多、动作偏少）
          if (o({ start: 0, end: 100 }) < 10) {
            let t = {
              tolkName: "smallTalk",
              tolkActive: "speak",
              event: "setState",
            };
            s(this.backFn) && this.backFn(t);
          } else this.nextSwf(this.pickPlay());
        }, 10000 + Math.trunc(15000 * Math.random()))));
    }
    // 最近播过的玩耍动画（存 src，含 age/state 路径，换阶段不会串）
    playHistory = [];
    // 抽一段玩耍动画，避开刚播过的那几段。
    // 池子只有 47 段（happy）到 22 段（sad），而闲置循环现在每 10~25 秒抽一次，
    // 纯均匀随机时「和上一段一样」有 1/47≈2% 的概率，一小时抽两百多次，
    // 平均十几分钟就会连播同一段，观感上就像卡住了。这里抽到最近 3 段就重摇，
    // 最多 8 次；池子实在太小（比如某个状态只有几段）就接受重复。
    pickPlay() {
      let src = "",
        pick = null;
      for (let i = 0; i < 8; i++) {
        pick = this.router.getRouter("play");
        src = pick?.src || "";
        if (!src || -1 === this.playHistory.indexOf(src)) break;
      }
      if (src) {
        (this.playHistory.push(src),
          this.playHistory.length > 3 && this.playHistory.shift());
      }
      return pick;
    }
    nextSwf(t, e, a) {
      if (
        (t &&
          "string" == typeof t &&
          (t = { ...this.router.getRouter(t, this.oldNext) }),
        (this.saveNext = {
          callBack: e || null,
          ...(t || this.router.getRouter(this.normalSwf(), this.oldNext)),
        }),
        !this.oldNext?.opt?.state ||
          this.oldNext?.opt?.state != this.saveNext?.opt?.state ||
          "normal" != this.saveNext?.opt?.state ||
          this.oldNext.src != this.saveNext.src)
      )
        if (
          ((this.nextSwfRouter = this.saveNext),
          "normal" != this.normalSwf() || t)
        )
          this.playTime && clearTimeout(this.playTime);
        else this.armIdle();
    }
    click() {
      try {
        return (this.dom.click(), !0);
      } catch (t) {
        return t;
      }
    }
    stopPlay() {
      return ffStop(this.dom);
    }
    play() {
      return ffPlay(this.dom);
    }
    isPlaying() {
      return ffIsPlaying(this.dom);
    }
    rewind() {
      return ffGoto(this.dom, 1) || !0;
    }
    goToFrames(t) {
      (t > this.state.frame && (t = this.state.frame), ffGoto(this.dom, t));
    }
  }
  class a {
    useData = ["baseRouter", "sex", "age", "state", "use"];
    baseRouter = "../../assets/Action";
    sex = "GG";
    oldAge = "";
    age = "Adult";
    ageNum = 0;
    oldAgeNum = -1;
    agegrow = 0;
    state = "happy";
    use = "";
    backFn = () => {};
    changeStateTime = 0;
    SwfList = {};
    isSick = 0;
    isSickTime = null;
    eggMax = 4;
    kidMax = 9;
    constructor(t = {}) {
      (s(t?.backFn) && (this.backFn = t.backFn),
        (this.SwfList = this.initSwfList()),
        this.changeState(t.state),
        t.baseRouter && (this.baseRouter = t.baseRouter));
    }
    changeState(t) {
      let e = { ...t.info, age: t.maxInfo.level };
      ((this.sex = "MM" == e.sex ? "MM" : "GG"),
        (this.ageNum = e.age),
        (this.agegrow = e.growth),
        (this.age =
          e.age <= this.eggMax
            ? "Egg"
            : e.age > this.eggMax && e.age < this.kidMax
              ? "Kid"
              : "Adult"));
      let a = !1;
      (this.oldAge != this.age &&
        ("Egg" == this.age ? (this.state = "") : (this.state = "happy"),
        this.oldAge && (a = !0),
        (this.oldAge = this.age)),
        this.oldAgeNum != this.ageNum &&
          (-1 != this.oldAgeNum &&
            this.backFn({
              tolkName: "levUp",
              tolkActive: a ? "first" : "levUp",
              event: "setState",
            }),
          (this.oldAgeNum = this.ageNum)));
      let i = "";
      if ("Adult" == this.age) {
        let t = ["happy", "prostrate"];
        if (e?.mood || 0 == e.mood) {
          let a = l(e.mood, [
            {
              rule: [null, 900],
              value: t.includes(this.state) ? this.state : "happy",
            },
            { rule: [900, 800], value: "peaceful" },
            { rule: [800, 500], value: "upset" },
            { rule: [500, null], value: "sad" },
          ]);
          this.state != a &&
            ((this.state = a),
            (i = "changeState"),
            this.backFn({ event: "changeState", value: this.state }));
        } else this.state = "happy";
      } else this.state = "";
      (e?.health < 5 && e?.health >= 2
        ? 1 != this.isSick &&
          ((this.isSick = 1),
          this.backFn({ event: "sick", value: this.state }),
          this.isSickTime && clearInterval(this.isSickTime),
          (this.isSickTime = setInterval(() => {
            this.backFn({ event: "sick", value: this.state });
          }, 3e4)))
        : 1 == e?.health
          ? (this.isSickTime && clearInterval(this.isSickTime),
            2 != this.isSick &&
              ((this.isSick = 2),
              this.backFn({ event: "dying", value: this.state })))
          : 0 == e?.health
            ? (this.isSickTime && clearInterval(this.isSickTime),
              3 != this.isSick &&
                4 != this.isSick &&
                ((this.isSick = 3),
                this.backFn({ event: "die", value: this.state })))
            : (this.isSickTime && clearInterval(this.isSickTime),
              4 != this.isSick &&
                0 != this.isSick &&
                (this.backFn({ event: i || "normal", value: this.state }),
                (this.isSick = 0))),
        (this.use = "Play"));
    }
    getRouter(t, e = {}) {
      let a = this.SwfList[this.sex][this.age],
        i = `${this.baseRouter}/${this.sex}/${this.age}`,
        n = ["hideright", "hideleft"],
        s = (a) => {
          if ("enter" === t && 1 === +this.ageNum && 0 == this.agegrow)
            return this.getRouter("first");
          if (
            (("revival" != t && "bury" != t) || (this.isSick = 4),
            "normal" == t)
          ) {
            if (2 == this.isSick)
              return { ...this.getRouter("dying"), state: "dying" };
            if (3 == this.isSick && "revival" != e.name && "bury" != e.name)
              return { ...this.getRouter("die"), state: "die" };
          }
          if ("happy" == this.state || "prostrate" == this.state) {
            if ("normal" == t) {
              let t = this.state;
              return (
                e.name && this.doRandom(),
                n.includes(e?.opt?.state) &&
                "prostrate" == this.state &&
                "MM" != this.sex
                  ? this.getRouter("etoj")
                  : t != this.state &&
                    "MM" != this.sex &&
                    ("happy" == t
                      ? this.getRouter("etoj")
                      : this.getRouter("jtoc"))
              );
            }
            if (
              "prostrate" == this.state &&
              n.includes(t) &&
              "jtoc" != e?.opt?.state &&
              "MM" != this.sex
            ) {
              let e = this.getRouter("jtoc");
              return ((e.opt.backSwf = t), e);
            }
          }
        };
      if (
        ["enter", "exit", "clean", "eat", "game", "sick", "cure"].includes(t)
      ) {
        ((a = a[t]),
          (i += `/${a.name}${a?.notNum ? "" : o({ start: a.start, end: a.end })}.swf`));
        let e = { state: t, ...(a?.opt || {}) };
        return s() || { src: i, opt: e, name: t };
      }
      if (["normal", "speak", "hide", "appear"].includes(t)) {
        a = this.state ? a[this.state][t] : a[t];
        let e = a.name;
        (a?.haveNum &&
          (e =
            e.replace(".swf", "") + o({ start: a.start, end: a.end }) + ".swf"),
          (i += `/${this.state ? this.state + "/" : ""}${e}`));
        let n = { state: t, ...(a?.opt || {}) };
        return s() || { src: i, opt: n, name: t };
      }
      if (
        [
          "hideright",
          "hideleft",
          "etoj",
          "jtoc",
          "dying",
          "die",
          "revival",
          "bury",
          "first",
          "levUp",
        ].includes(t)
      ) {
        a = a[t];
        let e = a.name,
          n = "";
        (a?.haveNum &&
          ((n = o({ start: a.start, end: a.end })),
          (e = e.replace(".swf", "") + n + ".swf")),
          (i += `/${e}`));
        let r = { state: t, ...(a?.opt || {}) };
        return (
          n &&
            "object" == typeof r.nextFrames &&
            (r.nextFrames = r.nextFrames[n]),
          s() || { src: i, opt: r, name: t }
        );
      }
      if (["play"].includes(t))
        return (
          (a = this.state ? a[this.state][t] : a[t]),
          (i += `/${this.state ? this.state + "/" : ""}${t}/${a.name}${o({ start: a.start, end: a.end })}.swf`),
          { src: i, opt: { state: t, ...(a?.opt || {}) }, name: t }
        );
      if ("changeState" == t) {
        ((a = this.state ? a[this.state].normal : a.normal),
          (i += `/${this.state ? this.state + "/" : ""}${a.name}`));
        let t = {
          state: "changeState",
          power: 150,
          backSwf: "normal",
          canSelfSet: !0,
        };
        return s() || { src: i, opt: t, name: "changeState" };
      }
    }
    doRandom() {
      this.randomProstrateOrHappy();
    }
    randomProstrateOrHappy() {
      if ((this.changeStateTime++, 1 == this.changeStateTime)) {
        if ("prostrate" == this.state || "happy" == this.state) {
          let t = o({ start: 1, end: 10 });
          this.state = t < 6 ? "prostrate" : "happy";
        }
      } else this.changeStateTime >= 10 && (this.changeStateTime = 0);
    }
    initSwfList() {
      let t = [
          "speak",
          "clean",
          "eat",
          "hide",
          "game",
          "appear",
          "etoj",
          "jtoc",
          "changeState",
          "cure",
          "sick",
          "dying",
          "die",
          "first",
          "levUp",
          "revival",
          "bury",
        ],
        e = (e = {}) => {
          let {
            enterOption: a,
            exitOption: i,
            sickOption: n,
            cleanOption: s,
            cureOption: r,
            eatOption: o,
            hiderightOption: l,
            hidelefttOption: h,
          } = e;
          return {
            enter: { name: "Enter", start: a?.start || 1, end: a?.end || 3 },
            exit: { name: "Exit", start: i?.start || 1, end: i?.end || 4 },
            game: {
              name: "game/Game",
              start: 1,
              end: 1,
              opt: { power: 150, canSelfSet: !0, size: [140, 280] },
            },
            clean: {
              name: "Clean",
              start: s?.start || 1,
              end: s?.end || 2,
              notNum: !!s?.notNum,
              opt: { power: 150, backSwf: "normal", canSelfSet: !0 },
            },
            eat: {
              name: "Eat",
              start: o?.start || 1,
              end: o?.end || 2,
              opt: { power: 150, backSwf: "normal", canSelfSet: !0 },
            },
            etoj: {
              name: "Etoj.swf",
              opt: {
                power: 66,
                backSwf: { name: "normal", backSwfChange: !0 },
                lastTimeCut: 7,
              },
            },
            jtoc: {
              name: "Jtoc.swf",
              opt: {
                power: 66,
                backSwf: { name: "normal", backSwfChange: !0 },
                lastTimeCut: 7,
              },
            },
            sick: {
              name: "Sick",
              start: n?.start || 1,
              end: n?.end || 2,
              notNum: !!n?.notNum,
              opt: {
                power: 150,
                backSwf: "normal",
                canSelfSet: !0,
                ...(n?.opt || {}),
              },
            },
            cure: {
              name: "Cure",
              start: 1,
              end: 2,
              notNum: !!r?.notNum,
              opt: { power: 150, backSwf: "normal", canSelfSet: !0 },
            },
            dying: {
              name: "Dying.swf",
              opt: {
                power: 150,
                backSwf: { name: "normal", backSwfChange: !0 },
              },
            },
            die: {
              name: "Die.swf",
              opt: {
                power: 170,
                afterState: ["revival", "bury"],
                canSelfSet: !0,
              },
            },
            revival: {
              name: "Revival.swf",
              opt: {
                power: 170,
                backSwf: { name: "normal", backSwfChange: !0 },
              },
            },
            bury: {
              name: "Bury.swf",
              opt: {
                power: 170,
                lastTimeCut: 5,
                afterState: ["normal", "changeState", "first"],
                backSwf: "normal",
              },
            },
            first: {
              name: "First.swf",
              opt: { power: 170, backSwf: "normal" },
            },
            hideleft: {
              name: "Hide_left.swf",
              start: h?.start || 1,
              end: h?.end || 1,
              haveNum: !!h?.haveNum,
              opt: {
                afterState: ["normal", "hideright", "hideleft", ...t],
                nextFrames: h?.nextFrames || 66,
              },
            },
            hideright: {
              name: "Hide_right.swf",
              start: l?.start || 1,
              end: l?.end || 1,
              haveNum: !!l?.haveNum,
              opt: {
                afterState: ["hideleft", "hideright", "normal", ...t],
                nextFrames: l?.nextFrames || 66,
              },
            },
            levUp: {
              name: "LevUp.swf",
              opt: { power: 170, backSwf: "normal" },
            },
          };
        },
        a = (e = {}) => {
          let { playOption: a, speakOption: i, normalOption: n } = e;
          return {
            normal: {
              name: "Stand.swf",
              opt: {
                afterState: ["hideleft", "hideright", "play", ...t],
                ...(n?.opt || {}),
              },
            },
            hide: { name: "Hide.swf", opt: { power: 150, canSelfSet: !0 } },
            appear: {
              name: "Appear.swf",
              opt: {
                power: 150,
                backSwf: { name: "normal", backSwfChange: !0 },
                canSelfSet: !0,
              },
            },
            speak: {
              name: "Speak.swf",
              start: i?.start || 1,
              end: i?.end || 1,
              haveNum: !!i?.haveNum,
              opt: {
                afterState: ["hideleft", "hideright", "normal", ...t],
                backSwf: "normal",
                power: 100,
              },
            },
            interact: { BE1: "E1.swf", BE2: "E2.swf" },
            play: {
              name: "P",
              start: a?.start || 1,
              end: a?.end || 1,
              opt: { backSwf: "normal", power: 50 },
            },
          };
        };
      return {
        GG: {
          Adult: {
            ...e(),
            happy: a({ playOption: { end: 47 } }),
            prostrate: a({ playOption: { end: 46 } }),
            peaceful: a({ playOption: { end: 100 } }),
            upset: a({ playOption: { end: 23 } }),
            sad: a({ playOption: { end: 22 } }),
          },
          Kid: {
            ...e({
              eatOption: { end: 1 },
              exitOption: { end: 3 },
              cleanOption: { notNum: !0 },
              sickOption: { notNum: !0 },
              cureOption: { notNum: !0 },
              hiderightOption: {
                haveNum: !0,
                end: 2,
                nextFrames: { 1: 61, 2: 39 },
              },
              hidelefttOption: {
                haveNum: !0,
                end: 2,
                nextFrames: { 1: 61, 2: 39 },
              },
            }),
            ...a({
              playOption: { end: 112 },
              happy: a({ playOption: { end: 112 } }),
            prostrate: a({ playOption: { end: 112 } }),
            normalOption: { opt: { isOverState: "normal" } },
            }),
          },
          Egg: {
            ...e({
              enterOption: { end: 2 },
              exitOption: { end: 3 },
              cleanOption: { notNum: !0 },
              cureOption: { notNum: !0 },
              sickOption: { notNum: !0 },
              hiderightOption: { haveNum: !0, end: 2, nextFrames: 61 },
              hidelefttOption: { haveNum: !0, end: 2, nextFrames: 61 },
            }),
            ...a({
              playOption: { end: 29 },
              speakOption: { haveNum: !0, end: 3 },
              normalOption: { opt: { isOverState: "normal" } },
            }),
          },
        },
        MM: {
          Adult: {
            ...e(),
            happy: a({ playOption: { end: 47 } }),
            prostrate: a({ playOption: { end: 46 } }),
            peaceful: a({ playOption: { end: 100 } }),
            upset: a({ playOption: { end: 23 } }),
            sad: a({ playOption: { end: 22 } }),
          },
          Kid: {
            ...e({
              eatOption: { end: 1 },
              exitOption: { end: 3 },
              cleanOption: { notNum: !0 },
              sickOption: { notNum: !0, opt: { lastTimeCut: 600 } },
              cureOption: { notNum: !0 },
              hiderightOption: {
                haveNum: !0,
                end: 2,
                nextFrames: { 1: 61, 2: 39 },
              },
              hidelefttOption: {
                haveNum: !0,
                end: 2,
                nextFrames: { 1: 61, 2: 39 },
              },
            }),
            ...a({
              playOption: { end: 112 },
              happy: a({ playOption: { end: 112 } }),
            prostrate: a({ playOption: { end: 112 } }),
            normalOption: { opt: { isOverState: "normal" } },
            }),
          },
          Egg: {
            ...e({
              enterOption: { end: 2 },
              exitOption: { end: 3 },
              cleanOption: { notNum: !0 },
              cureOption: { notNum: !0 },
              sickOption: { notNum: !0 },
              hiderightOption: { haveNum: !0, end: 2, nextFrames: 61 },
              hidelefttOption: { haveNum: !0, end: 2, nextFrames: 61 },
            }),
            ...a({
              playOption: { end: 29 },
              speakOption: { haveNum: !0, end: 3 },
              normalOption: { opt: { isOverState: "normal" } },
            }),
          },
        },
      };
    }
  }
  class i {
    useData = ["dom", "changeState"];
    dom = null;
    state = { frame: 0, isPlaying: !1, currentFrame: 0, percentLoaded: 0 };
    changeState = null;
    constructor(t = {}) {
      for (let e in this.useData)
        this[this.useData[e]] = t[this.useData[e]] || null;
    }
    setDom(t) {
      this.dom = t || null;
    }
    isPlaying() {
      return ffIsPlaying(this.dom);
    }
    currentFrame() {
      return ffCurrent(this.dom);
    }
    totalFrames() {
      return ffTotal(this.dom);
    }
    percentLoaded() {
      return ffPercent(this.dom);
    }
    getState() {
      ((this.state = {
        frame: this.totalFrames(),
        isPlaying: this.isPlaying(),
        currentFrame: this.currentFrame(),
        percentLoaded: this.percentLoaded(),
      }),
        s(this.changeState) && this.changeState(this.state));
    }
  }
  class n {
    AnimationFrames = {};
    defaultAnimations = {};
    fps = 24;
    defaultSystem = { fps: 24, interval: 1e3 / 24 };
    constructor(t = {}) {
      this.initAnimation();
    }
    createAnimationFrame(t) {
      let {
        name: e,
        fn: a,
        stop: i = () => !1,
        interval: n = this.defaultSystem.interval,
      } = t;
      if (!e) return;
      var s;
      this.clearAnimationFrames(e);
      var r,
        o = Date.now();
      let l = () => {
        if (i()) return void this.clearAnimationFrames(e);
        try {
          (s = Date.now()),
            (r = s - o) > n && ((o = s - (r % n)), a && a());
        } catch (t) {}
        // 重新注册必须放在 try/catch 之外：回调抛错不能把整条动画循环打死
        this.AnimationFrames[e] = window.requestAnimationFrame(l);
      };
      l();
    }
    clearAnimationFrames(t) {
      try {
        t &&
          this.AnimationFrames[t] &&
          (window.cancelAnimationFrame(this.AnimationFrames[t]),
          (this.AnimationFrames[t] = null),
          delete this.AnimationFrames[t]);
      } catch (t) {}
    }
    initAnimation() {
      this.createAnimationFrame({
        name: "init",
        fn: () => {
          for (let t in this.defaultAnimations)
            this.defaultAnimations[t]?.fn &&
              s(this.defaultAnimations[t].fn) &&
              this.defaultAnimations[t].fn();
        },
      });
    }
    addAnimation(t) {
      let { name: e, fn: a } = t;
      r([e, a]) || (this.defaultAnimations[e] = { fn: a });
    }
    deleteAnimation(t) {
      r([t]) ||
        ((this.defaultAnimations[t] = {}), delete this.defaultAnimations[t]);
    }
  }
  const s = (t) => t && "function" == typeof t,
    r = (t) => {
      let e = !1;
      for (let a in t)
        if (!t[a]) {
          e = !0;
          break;
        }
      return e;
    },
    o = (t = {}) => {
      let e = t.start || 1,
        a = t.end || 0;
      return Math.trunc(Math.random() * a + e) + "";
    },
    l = (t, e) => {
      let a = e[0].value,
        i = e.length - 1;
      for (let n in e) {
        if (0 == n && t >= e[n].rule[1]) {
          a = e[n].value;
          break;
        }
        if (t < e[n].rule[0] && t >= e[n].rule[1]) {
          a = e[n].value;
          break;
        }
        if (n == i && t < e[n].rule[0]) {
          a = e[n].value;
          break;
        }
      }
      return a;
    };
  // ---- Ruffle 适配层 ----
  // 这套代码原本跑在 Flash Player 的 <embed> 上，靠 TotalFrames/CurrentFrame/IsPlaying
  // 这类旧版 JS API 驱动动作切换。Ruffle 只保留了 play/pause/isPlaying 等新 API，
  // 这里补齐旧 API：优先直连 wasm 实例拿真实帧号，拿不到则用 metadata 的
  // numFrames/frameRate 按播放时间推算，保证 lastTimeCut/nextFrames 等原版时序仍然成立。
  const ffMap = new WeakMap(),
    ffNow = () =>
      "object" == typeof performance && performance.now
        ? performance.now()
        : Date.now(),
    ffState = (t) => {
      let e = ffMap.get(t);
      return (
        e ||
          ((e = { last: ffNow(), acc: 0, probe: 0, fps: 0, total: 0 }),
          ffMap.set(t, e)),
        e
      );
    },
    ffInstance = (t) => {
      try {
        let e = t && t.instance;
        if (e && "function" == typeof e.current_frame) return e;
      } catch (e) {}
      return null;
    },
    ffIsPlaying = (t) => {
      try {
        return !!t.isPlaying;
      } catch (e) {
        return null;
      }
    },
    ffReadMeta = (t) => {
      let e = ffState(t),
        a = ffNow();
      if (!t) return e;
      if (e.total && e.fps) return e;
      if (a - e.probe < 300) return e;
      e.probe = a;
      try {
        let a = t.ruffle && t.ruffle(1),
          i = a && a.metadata;
        i &&
          i.numFrames &&
          ((e.total = +i.numFrames || 0), (e.fps = +i.frameRate || 24));
      } catch (e) {}
      return e;
    },
    ffTotal = (t) => {
      try {
        let e = ffInstance(t);
        if (e && "function" == typeof e.total_frames) return e.total_frames();
      } catch (e) {}
      let e = ffReadMeta(t);
      return e.total || null;
    },
    ffCurrent = (t) => {
      try {
        let e = ffInstance(t);
        if (e) return e.current_frame();
      } catch (e) {}
      let e = ffReadMeta(t),
        a = ffNow();
      (ffIsPlaying(t) && (e.acc += a - e.last), (e.last = a));
      if (!e.total || !e.fps) return null;
      let i = Math.floor((e.acc / 1e3) * e.fps) + 1;
      return e.total ? ((i - 1) % e.total) + 1 : i;
    },
    ffPlay = (t) => {
      try {
        return (t && t.play && t.play(), !0);
      } catch (e) {
        return e;
      }
    },
    ffStop = (t) => {
      try {
        return (t && t.pause && t.pause(), !0);
      } catch (e) {
        return e;
      }
    },
    ffGoto = (t, e) => {
      try {
        let a = ffInstance(t);
        if (a && "function" == typeof a.goto_frame) return (a.goto_frame(e), !0);
      } catch (e) {}
      return !1;
    },
    ffPercent = (t) => {
      try {
        return t && t.PercentLoaded ? t.PercentLoaded() : null;
      } catch (e) {
        return null;
      }
    };
  window.swfPet = class {
    useData = ["id", "backFn", "goNormal"];
    id = "";
    dom = null;
    router = null;
    swf = null;
    state = null;
    goNormal = null;
    load = !0;
    loadFn = null;
    timeControl = null;
    backFn = null;
    eggMax = 5;
    kidMax = 10;
    constructor(t = {}) {
      for (let e in this.useData)
        this[this.useData[e]] = t[this.useData[e]] || null;
      s(this.backFn) || (this.backFn = function (t) {});
    }
    init(t) {
      ((this.dom = this.id ? document.getElementById(this.id) : null),
        (this.router = new a({
          state: t.state,
          backFn: (t) => {
            if ("setState" == t.event) return void this.backFn(t);
            let e = () => {
              this.swf.nextSwf(t.event);
            };
            this.load
              ? (this.loadFn = () => {
                  e();
                })
              : e();
          },
          baseRouter: t.baseRouter,
        })),
        (this.state = new i({
          dom: this.dom,
          changeState: (t) => {
            this.swf?.setState && this.swf?.setState(t);
          },
        })),
        (this.swf = new e({
          id: this.id,
          dom: this.dom,
          backFn: (t) => {
            if ((t.dom && this.state.setDom(t.dom), "setState" == t.event)) {
              let e = { ...t, dom: "", tolkName: t.tolkName || t.name };
              this.backFn(e);
            }
          },
          normalSwf:
            this.goNormal ||
            function () {
              return "normal";
            },
          router: this.router,
        })),
        this.swf.changeSwf({ option: this.router.getRouter("enter") }),
        this.loadFn || this.swf.nextSwf(),
        (this.timeControl = new n()),
        this.addAnimation("geetState", () => {
          this.state.getState();
        }),
        (this.load = !1),
        this.loadFn && (this.loadFn(), (this.loadFn = null)));
    }
    addAnimation(t, e) {
      this.timeControl.addAnimation({ name: t, fn: e });
    }
    changeSwf(t, e) {
      this.swf.nextSwf(t ? this.router.getRouter(t) : "", e);
    }
    setPetState(t) {
      this.router?.changeState && this.router.changeState(t);
    }
    doNext(t) {
      this.swf.onceNext = t;
    }
    eventLoopList = {};
    addLoop(t) {}
    getRandom(t, e) {
      return o({ start: t, end: e });
    }
  };
  var h = window;
  for (var m in t) h[m] = t[m];
  t.__esModule && Object.defineProperty(h, "__esModule", { value: !0 });
})();
