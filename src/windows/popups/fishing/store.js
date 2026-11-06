// 鱼苗商店（自建面板）
// ---------------------------------------------------------------------------
// 为什么不用 SWF 里那个商店：它的「确认支付」是 ActionScript 里的二次确认，
// 数量也是写死的 1 条，JS 侧只能提供数据、没法改它的界面。所以在页面上叠了
// 一层自己的商店，买鱼直接写存档 + 通知 SWF 刷新池塘。
//
// 需求：
//   1. 按当前可购买的鱼苗，根据可获取元宝（sell_price × quantity）倒序
//   2. 点「立即购买」直接成交，不再二次确认
//   3. 购买数量可以直接改（1 ~ 池塘剩余空位，且不超过元宝能买得起的数量）
(() => {
  // 不在这里 return：万一 indexOnLine.js 里 FishStoreApi 还没挂上，
  // 至少要保证面板能打开、能关掉，而不是点了没反应。
  const A = () => window.FishStoreApi || null;
  const api = window.FishStoreApi || null;

  const MAX_POND = 5; // 池塘上限，和 indexOnLine.js 里 case 4 保持一致

  const $ = (id) => document.getElementById(id);
  const mask = $("fsMask");
  const listEl = $("fsList");
  const ybEl = $("fsYb");
  const numEl = $("fsNum");
  const totalEl = $("fsTotal");
  const buyEl = $("fsBuy");
  const tipEl = $("fsTip");
  const entry = $("fsEntry");

  const state = { selected: null, count: 1, tipTimer: null };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const curLevel = () => num(api && api.getCookie("level")) || 1;
  const curYb = () => num(api && api.getCookie("yb"));
  const pond = () => {
    try {
      return JSON.parse((api && api.getCookie("fishes")) || "[]") || [];
    } catch (e) {
      return [];
    }
  };

  // 价格口径和 case 3/case 4 完全一致（原价 / 0.8 四舍五入）
  const payOf = (f) =>
    api && api.shelfPrice ? api.shelfPrice(f.price_yb) : num(f.price_yb);
  // 成熟收获能拿到的元宝 = 单条售价 × 收获条数
  const gainOf = (f) => num(f.sell_price) * num(f.quantity);

  function tip(msg) {
    if (!tipEl) return;
    tipEl.textContent = msg;
    tipEl.classList.add("on");
    clearTimeout(state.tipTimer);
    state.tipTimer = setTimeout(() => tipEl.classList.remove("on"), 1800);
  }

  // 当前可买（等级已解锁）的排前面，组内按可获取元宝倒序
  function buildList() {
    const lv = curLevel();
    const all = ((api && api.shop) || []).map((f) => ({
      ...f,
      _pay: payOf(f),
      _gain: gainOf(f),
      _locked: num(f.level) > lv,
    }));
    all.sort((a, b) => {
      if (a._locked !== b._locked) return a._locked ? 1 : -1;
      return b._gain - a._gain;
    });
    return all;
  }

  function maxBuy() {
    const f = state.selected;
    if (!f) return 0;
    const room = MAX_POND - pond().length;
    const afford = Math.floor(curYb() / (f._pay || 1));
    return Math.max(0, Math.min(room, afford, MAX_POND));
  }

  // quiet=true 时不弹自动提示（购买成功/选中之类的提示优先）
  function render(quiet) {
    const list = buildList();
    if (!state.selected || !list.some((f) => f.fryid === state.selected.fryid)) {
      state.selected = list.find((f) => !f._locked) || list[0] || null;
    }
    ybEl.textContent = curYb();

    listEl.innerHTML = "";
    list.forEach((f) => {
      const row = document.createElement("div");
      row.className = "fs-row";
      if (f._locked) row.classList.add("lock");
      if (state.selected && f.fryid === state.selected.fryid)
        row.classList.add("on");
      row.innerHTML =
        '<img class="fs-ico" src="./res/fish/' +
        f.avator +
        '.png" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="fs-name">' +
        f.name +
        "<i>lv" +
        f.level +
        "</i></div>" +
        '<div class="fs-num"><div class="fs-price">' +
        f._pay +
        " 元宝</div>" +
        '<div class="fs-gain">可收 ' +
        f._gain +
        " 元宝</div></div>";
      row.onclick = () => {
        if (f._locked) return tip("还没到 lv" + f.level + "，先升级吧~");
        state.selected = f;
        state.count = 1;
        render(!0);
      };
      listEl.appendChild(row);
    });

    const top = maxBuy();
    state.count = Math.max(1, Math.min(state.count || 1, top || 1));
    numEl.value = state.count;
    numEl.max = Math.max(1, top);
    const f = state.selected;
    const total = f ? f._pay * state.count : 0;
    totalEl.innerHTML = "合计 <b>" + total + "</b> 元宝";
    buyEl.disabled = !f || top <= 0;

    if (!quiet) {
      if (!f) tip("商店暂时没有鱼苗");
      else if (top <= 0) {
        buyEl.disabled = true;
        if (pond().length >= MAX_POND) tip("池塘满了，先收获再买~");
        else if (curYb() < f._pay) tip("元宝不够啦~");
      }
    }
  }

  function setCount(v) {
    const top = maxBuy();
    if (top <= 0) return;
    let n = Math.round(num(v)) || 1;
    n = Math.max(1, Math.min(n, top));
    state.count = n;
    numEl.value = n;
    const f = state.selected;
    totalEl.innerHTML = "合计 <b>" + (f ? f._pay * n : 0) + "</b> 元宝";
  }

  function open() {
    state.selected = null;
    state.count = 1;
    render();
    mask.classList.add("fs-on");
  }

  function close() {
    mask.classList.remove("fs-on");
  }

  // 直接成交，没有二次确认
  function buy() {
    const f = state.selected;
    if (!f) return tip("请先选择鱼苗");
    if (!api) return tip("商店数据未就绪，请重新打开渔港");
    const pay = f._pay;
    const yb = curYb();
    const fishes = pond();
    const room = MAX_POND - fishes.length;
    if (room <= 0) return tip("池塘满了，先收获再买~");
    if (yb < pay) return tip("元宝不够啦~");

    const top = Math.max(0, Math.min(room, Math.floor(yb / pay)));
    const n = Math.max(1, Math.min(Math.round(num(state.count)) || 1, top));
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < n; i++) {
      fishes.push({
        id: api.nextId(),
        fryid: f.fryid,
        name: f.name,
        stage: 1,
        time: 0,
        interval: f.interval,
        costyb: pay,
        YB: f.sell_price,
        quantity: f.quantity,
        basequantity: f.quantity,
        avatar: f.avator,
        AIXIN: 0,
        growth: 0,
        strong: 0,
        iq: 0,
        charm: 0,
        born: now,
        siLiao: 0,
      });
    }
    api.setCookie("fishes", JSON.stringify(fishes), true);
    api.setCookie("yb", yb - pay * n, true);
    // 让 SWF 按新的存档重绘池塘和元宝
    api.getPetInfoAgain();

    state.count = 1;
    render(!0);
    tip("已买 " + n + " 条" + f.name + "，花费 " + pay * n + " 元宝");
  }

  if (entry) entry.onclick = open;
  if ($("fsClose")) $("fsClose").onclick = close;
  if (mask) {
    mask.onclick = (e) => {
      if (e.target === mask) close();
    };
    // 顺手支持 Esc 关闭
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mask.classList.contains("fs-on")) close();
    });
  }
  if (buyEl) buyEl.onclick = buy;
  if ($("fsMinus"))
    $("fsMinus").onclick = () => {
      setCount(state.count - 1);
    };
  if ($("fsPlus"))
    $("fsPlus").onclick = () => {
      setCount(state.count + 1);
    };
  if (numEl) {
    numEl.oninput = () => {
      const v = parseInt(numEl.value, 10);
      if (Number.isFinite(v)) setCount(v);
    };
    numEl.onblur = () => setCount(numEl.value);
  }
})();
