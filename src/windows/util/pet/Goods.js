(() => {
  var __webpack_modules__ = {
      719: (module, __unused_webpack_exports, __webpack_require__) => {
        module = __webpack_require__.nmd(module);
        const _require = eval("require"),
          { shop } = _require("./shop.js");
        class Goods {
          storeGoods = {
            food: [],
            commodity: [],
            medicine: [],
            background: [],
          };
          backUseConsumables = () => {};
          callUseActive = () => {};
          constructor(e = {}) {
            (this.getConsumables(),
              e.backUseConsumables &&
                (this.backUseConsumables = e.backUseConsumables),
              e.callUseActive && (this.callUseActive = e.callUseActive));
          }
          getConsumables(e) {
            this.storeGoods = getCache("store");
          }
          getConsumablesPage(e) {
            let {
                pageSize: t = 4,
                current: s = 1,
                type: o,
                getWhere: a,
                value: l,
                useType: i = null,
              } = e,
              r = null;
            if (
              ("store" == a
                ? (r =
                    "study" == l
                      ? this.getStudyData()
                      : "work" == l
                        ? this.getWorkData()
                        : "task" == l && i
                          ? this.getGiftData(i, "online" == i ? 8 : 12)
                          : "sc" == l
                            ? this.getScData()
                            : this.storeGoods)
                : "shop" == a && (r = shop),
              !r?.[o] && !i && "work" != l && "study" != l)
            )
              return { opt: e, msg: "获取失败", state: "err" };
            "store" == a
              ? i || ("work" != l && "study" != l && (r = r[o]))
              : "shop" == a && (r = this.getOurGoods(o));
            // 日常三种消耗品按「新增属性值」从小到大排。
            // 必须在下面 slice 分页之前排，否则只是把当前这一页内部排了序。
            // 注意不能把 r 原地排序 —— 那是 storeGoods（背包缓存）的数组引用，
            // 排了就等于改了存档里的背包顺序，所以先 slice 一份再排。
            "store" == a &&
              !i &&
              Array.isArray(r) &&
              ("food" == o || "commodity" == o || "medicine" == o) &&
              (r = r.slice().sort(this.consumableCompare(o)));
            // 打工列表按「可获得元宝」从低到高排，想挑收益高的就往后翻。
            // 和上面一样必须在 slice 分页之前排，并且先 slice 一份不动原数组。
            "store" == a &&
              "work" == l &&
              Array.isArray(r) &&
              (r = r.slice().sort(this.workCompare()));
            let n = {
                total: countMaxPageSize(r.length, t),
                pageSize: t,
                current: s,
                result: [],
              },
              u = [],
              c = (e) => {
                ((u = r.slice(t * (e - 1), t * e)),
                  0 == u.length && e > 1 && ((n.current -= 1), c(n.current)));
              };
            if ((c(n.current), u.length > 0)) {
              if ("store" == a)
                if (i);
                else if ("work" != l && "study" != l)
                  for (let e in u) u[e] = `${o}*${u[e]}`;
              n.result =
                "study" == l
                  ? this.getStudyInfo({ goodNames: u })
                  : "work" == l
                    ? this.getWorkInfo({ goodNames: u })
                    : this.getGoodsInfo({ goodNames: u });
            }
            return n;
          }
          // 消耗品的排序依据，返回 [主属性, 次属性]：
          //   食物  → 饥饿值 starve，同饥饿值时按附加属性（魅力/智力/武力）多少
          //   清洁  → 清洁值 clean，同上
          //   吃药  → 药品在商品表里没有数值属性（22 种里 21 种 starve/clean/charm/
          //           intel/strong 全是 0，只有 desc 说明治什么病），所以按价格排：
          //           药价对应的正是病症轻重 —— 50 感冒 / 80 重感冒 / 120 肺炎 /
          //           200 肺结核 / 240 百草丹 / 400 还魂丹。
          // 入参可能是 "food*_10013006-2" 也可能是 "_10013006-2"，两种都兼容。
          consumableSortKey(e, t) {
            try {
              let s = String(e).split("*").pop().split("-")[0],
                o = shop[t] && shop[t][s];
              if (!o) return [0, 0];
              let a = +o.starve || 0,
                l = +o.clean || 0,
                i =
                  (+o.charm || 0) + (+o.intel || 0) + (+o.strong || 0);
              return "food" == t
                ? [a, i]
                : "commodity" == t
                  ? [l, i]
                  : "medicine" == t
                    ? [+o.price || 0, a + l + i]
                    : [0, 0];
            } catch (e) {
              return [0, 0];
            }
          }
          // 打工的排序依据：这份工作能拿到的元宝（shop.work[key].yb）。
          // 键可能是 "work*_bz" 也可能是 "_bz"，两种都兼容；取不到按 0 排在最前。
          workSortKey(e) {
            try {
              let t = String(e).split("*").pop(),
                s = shop.work && shop.work[t];
              return s ? +s.yb || 0 : 0;
            } catch (e) {
              return 0;
            }
          }
          workCompare() {
            let e = this;
            return (t, s) => e.workSortKey(t) - e.workSortKey(s);
          }
          consumableCompare(e) {
            let t = this;
            return (s, o) => {
              let a = t.consumableSortKey(s, e),
                l = t.consumableSortKey(o, e);
              // 食物/清洁里有一批「加点只有 0~1」的收藏品（愚人怪怪饼、星之密语这类），
              // 吃下去几乎不回复状态。按数值升序它们会并排挤在最前面，很碍事，
              // 统一沉到列表末尾；其余仍按主属性从低到高正常排。
              // 药品的主属性是价格（最低 50），不会被这条规则影响。
              if ("food" == e || "commodity" == e) {
                let w = a[0] <= 1,
                  h = l[0] <= 1;
                if (w != h) return w ? 1 : -1;
              }
              // 主属性相同就看次属性；再相同则保持原有顺序（sort 稳定）
              return a[0] - l[0] || a[1] - l[1];
            };
          }
          getOurGoods(e = null) {
            let t = [];
            for (let s in shop)
              if (
                (null == e || e == s) &&
                !((null == e && "work" == s) || (null == e && "study" == s))
              )
                for (let e in shop[s]) t.push(s + "*" + e);
            return t;
          }
          getGoodsInfo(e = {}) {
            let { goodNames: t, goodName: s } = e,
              o = {},
              a = (e) => {
                let t = e.split("*");
                if (!t[0] || !t[1])
                  return { name: e, state: "err", msg: "未找到该物品" };
                let s = t[1].split("-"),
                  o = shop[t[0]][s[0]],
                  a = s[0].split("_")[1],
                  l = {
                    ...o,
                    key: a,
                    keyName: s[0],
                    icon: `../assets/img_res/${o.type}/${a}.gif`,
                    valueList: {},
                  };
                return (
                  s[1] &&
                    ((l.num = s[1]),
                    (l.valueList.num = {
                      label: "数量：",
                      value: s[1] + "个",
                    })),
                  o.starve &&
                    (l.valueList.starve = {
                      label: "饥饿值 ",
                      value: "+" + o.starve,
                    }),
                  o.clean &&
                    (l.valueList.clean = {
                      label: "清洁值 ",
                      value: "+" + o.clean,
                    }),
                  (o.charm || o.intel || o.strong) &&
                    (l.valueList.opt = {
                      label: "属性：",
                      value: `${o.charm ? ` 魅力 +${o.charm} ` : ""}${o.intel ? ` 智力 +${o.intel} ` : ""}${o.strong ? ` 武力 +${o.strong} ` : ""}`,
                    }),
                  o.desc &&
                    (l.valueList.desc = { label: "tip：", value: o.desc }),
                  l
                );
              };
            if (s) o = a(s);
            else if (t.length > 0) {
              o = [];
              for (let e in t)
                t[e]?.type_Key
                  ? o.push({ ...a(t[e].type_Key), ...t[e] })
                  : o.push(a(t[e]));
            }
            return o;
          }
          getGiftData(e, t) {
            let s = getCache(e, "gift") || [];
            if (
              (s?.[t - 1]?.nextTime &&
                new Date().getTime() - s[t - 1].nextTime >= 864e5 &&
                (s = ["next"]),
              s?.length != t)
            ) {
              let o = [],
                a = [];
              if (0 == s.length) {
                o =
                  "sign" == e
                    ? [
                        "food*_102010001",
                        "commodity*_102020012",
                        "food*_102010012",
                        "food*_10013004",
                        "food*_100010465",
                        "commodity*_102020014",
                        "food*_100010117",
                        "medicine*_60001",
                        "commodity*_10021005",
                        "commodity*_102020011",
                        "commodity*_102020020",
                        "food*_100010142",
                      ]
                    : "online" == e
                      ? [
                          "food*_10013006",
                          "commodity*_10021008",
                          "commodity*_102020005",
                          "food*_10013005",
                          "commodity*_10021009",
                          "commodity*_10021005",
                          "food*_10013009",
                          "medicine*_60001",
                        ]
                      : [];
                for (let e in o) a.push(e);
              }
              (0 != o.length && 0 != a.length) ||
                ((o = this.getOurGoods()),
                (a = getRandomArr(0, o.length - 1, t)));
              for (let s in a) {
                let l = { type_Key: o[a[s]], isTake: 0 };
                ("sign" == e
                  ? ((l.seeTime = tool.getTime({
                      format: "YY-MM-DD",
                      addDay: s,
                    })),
                    (l.time = new Date(l.seeTime + " 06:00").getTime()),
                    (l.seeTime = l.seeTime.slice(5, 10)),
                    s == t - 1 && (l.nextTime = l.time))
                  : "online" == e &&
                    ((l.time = 10 * (+s + 1) + 20 * +s),
                    (l.seeTime = l.time + "分钟"),
                    s == t - 1 &&
                      (l.nextTime = new Date(
                        tool.getTime({ format: "YY-MM-DD" }) + " 06:00",
                      ).getTime())),
                  (a[s] = l));
              }
              (setCache({ name: e, upName: "gift", value: a }), (s = a));
            }
            return s;
          }
          useConsumables(e) {
            let t = this.backUseConsumables(e);
            if (!t || t.overType) return t || !1;
            let s = this.storeGoods[e.type],
              o = e.keyName + "-" + e.num,
              a = s.indexOf(o),
              l = e.num - 1;
            return (
              l > 0
                ? this.storeGoods[e.type].splice(a, 1, e.keyName + "-" + l)
                : this.storeGoods[e.type].splice(a, 1),
              this.toSaveGoodsCache(),
              !0
            );
          }
          getScData() {
            let e = this.getOurGoods("work");
            return (console.log("workData", e), e);
          }
          getBuyGoodsOrder(e = {}) {
            let { goods: t, buy: s = !1 } = e;
            if (!(t?.length > 0)) return { type: "empty", goods: t };
            (getPetInfo().info.yb, t.length);
            for (let e in t);
          }
          toAddGoods(e = {}) {
            try {
              let { goods: t, good: s, buy: o = !1 } = e,
                a = (e) => {
                  let t = "string" == typeof e ? e : e?.type_Key || "";
                  if (!t) return !1;
                  t = t.split("*");
                  let s = this.storeGoods[t[0]],
                    o = !1;
                  for (let e in s)
                    if (-1 != s[e].indexOf(t[1])) {
                      o = !0;
                      let a = s[e].split("-");
                      this.storeGoods[t[0]][e] = `${a[0]}-${+a[1] + 1}`;
                      break;
                    }
                  o || this.storeGoods[t[0]].push(`${t[1]}-1`);
                };
              if (s) a(s);
              else if (t?.length > 0) for (let e in t) a(t[e]);
              return (this.toSaveGoodsCache(), !0);
            } catch (e) {
              return e;
            }
          }
          saveTimes = null;
          toSaveGoodsCache() {
            (this.saveTimes && clearTimeout(this.saveTimes),
              (this.saveTimes = setTimeout(() => {
                setCache({ name: "store", value: this.storeGoods });
              }, 1e3)));
          }
          getWorkData() {
            return this.getOurGoods("work");
          }
          getWorkInfo(e = {}) {
            let { goodNames: t, goodName: s } = e,
              o = {},
              a = (e) => {
                let t = e.split("*");
                if (!t[0] || !t[1])
                  return { name: e, state: "err", msg: "未找到该物品" };
                let s = t[1].split("_")[1],
                  o = shop[t[0]][t[1]],
                  a = [];
                if (o.education)
                  for (let e in o.education)
                    o.education[e] &&
                      a.push(getStudyLevel(e, o.education[e], !0));
                a = a.join(",");
                let l = {
                  ...o,
                  key: s,
                  keyName: t[1],
                  icon: `../assets/img_res/${o.type}/${s}.png`,
                  overTime: o.useTime,
                  stateTime: 0,
                  obtain: {
                    yb: o.yb,
                    charm: o.charm,
                    intel: o.intel,
                    strong: o.strong,
                  },
                  valueList: {
                    yb: { label: "元宝：", value: "可获得" + o.yb + "元宝" },
                    need: {
                      label: "最低等级：",
                      value: o.need
                        ? "需要大于" + o.need + "级~"
                        : "无等级要求~",
                    },
                    needStudy: {
                      label: "学历要求：",
                      value: a ? "需要：" + a : "无要求~",
                    },
                    workTime: {
                      label: "工作时长：",
                      value: o.useTime + "分钟",
                    },
                  },
                };
                return (
                  (o.starve || o.clean) &&
                    (l.valueList.starve = {
                      label: "消耗：",
                      value: `${o.starve ? "饥饿值：" + o.starve + (o.clean ? " " : "") : ""}${o.clean ? "清洁值：" + o.clean : ""}`,
                    }),
                  (o.charm || o.intel || o.strong) &&
                    (l.valueList.opt = {
                      label: "属性：",
                      value: `${o.charm ? ` 魅力 +${o.charm} ` : ""}${o.intel ? ` 智力 +${o.intel} ` : ""}${o.strong ? ` 武力 +${o.strong} ` : ""}`,
                    }),
                  o.desc &&
                    (l.valueList.desc = { label: "tip：", value: o.desc }),
                  l
                );
              };
            if (s) o = a(s);
            else if (t.length > 0) {
              o = [];
              for (let e in t)
                t[e]?.type_Key
                  ? o.push({ ...a(t[e].type_Key), ...t[e] })
                  : o.push(a(t[e]));
            }
            return o;
          }
          activeWork(e) {
            return this.callUseActive({ type: "work", val: e });
          }
          getStudyData() {
            let e = [],
              t = JSONto(getPetInfoOne("study", "activeValue"));
            for (let s in t)
              ((t[s] =
                t[s] >= 0 && t[s] < 9
                  ? "study*_xx-" + s
                  : t[s] >= 9 && t[s] < 20
                    ? "study*_zx-" + s
                    : t[s] >= 20 && t[s] < 40
                      ? "study*_dx-" + s
                      : (t[s] >= 40 && t[s] < 95) || t[s] >= 95
                        ? "study*_yjs-" + s
                        : "study*_xx-" + s),
                e.push(t[s]));
            return e;
          }
          getStudyInfo(e = {}) {
            let { goodNames: t, goodName: s } = e,
              o = {},
              a = (e) => {
                let t = e.split("*");
                if (!t[0] || !t[1])
                  return { name: e, state: "err", msg: "未找到该物品" };
                let s = t[1].split("_")[1],
                  o = shop[t[0]][t[1]],
                  a = getPetInfoOne("study", "activeValue")[o.value],
                  l = {
                    ...o,
                    key: s,
                    name: "科目：" + o.object,
                    keyName: t[1],
                    icon: `../assets/img_res/${o.type}/${s}.png`,
                    overTime: o.classTime,
                    stateTime: 0,
                    obtain: {},
                    valueList: {
                      nowSchool: { label: "当前阶段：", value: o.school },
                      workTime: {
                        label: "学习时长：",
                        value: o.classTime + "分钟",
                      },
                      studied: { label: "已学课时：", value: a + "节" },
                      residue: {
                        label: "剩余课时：",
                        // a 是该科目累计的学习值，classNum 是这一阶段读完时的
                        // 累计值（小学 9 / 中学 20 / 大学 40 / 研究生 95），
                        // 剩余直接相减即可。
                        // 原来多加了 classNumUp，而它在课程表里是错的：数值
                        // 0 / 9 / 29 / 69 是上一阶段 classNum 被重复累加的产物
                        // （阶段真正的起点是 0 / 9 / 20 / 40），于是研究生
                        // 一进来显示 124 节、越读数字越大，且永远等不到
                        // 「学无止境」——95 节读完了还剩 69 节。
                        value:
                          o.classNum - a <= 0
                            ? "学无止境"
                            : o.classNum - a + "节",
                      },
                    },
                  };
                return (
                  (o.starve || o.clean) &&
                    (l.valueList.starve = {
                      label: "消耗：",
                      value: `${o.starve ? "饥饿值：" + o.starve + (o.clean ? " " : "") : ""}${o.clean ? "清洁值：" + o.clean : ""}`,
                    }),
                  (o.charm || o.intel || o.strong) &&
                    (o.charm && (l.obtain.charm = o.charm),
                    o.intel && (l.obtain.intel = o.intel),
                    o.strong && (l.obtain.strong = o.strong),
                    (l.valueList.opt = {
                      label: "属性：",
                      value: `${o.charm ? ` 魅力 +${o.charm} ` : ""}${o.intel ? ` 智力 +${o.intel} ` : ""}${o.strong ? ` 武力 +${o.strong} ` : ""}`,
                    })),
                  o.desc &&
                    (l.valueList.desc = { label: "tip：", value: o.desc }),
                  l
                );
              };
            if (s) o = a(s);
            else if (t.length > 0) {
              o = [];
              for (let e in t)
                t[e]?.type_Key
                  ? o.push({ ...a(t[e].type_Key), ...t[e] })
                  : o.push(a(t[e]));
            }
            return o;
          }
          activeStudy(e) {
            return this.callUseActive({ type: "study", val: e });
          }
          cleanOurStoreGoods() {
            ((this.storeGoods = { food: [], commodity: [], medicine: [] }),
              this.toSaveGoodsCache());
          }
          buy(goodKey) {
            try {
              const parts = String(goodKey || "").split("*");
              if (parts.length !== 2)
                return { ok: !1, msg: "商品 ID 格式错误" };
              const [type, key] = parts;
              const item = shop?.[type]?.[key];
              if (!item) return { ok: !1, msg: "商品不存在" };
              const price = +item.price;
              if (!price || price <= 0)
                return { ok: !1, msg: "该商品不可购买（任务/送礼获取）" };
              const yb = +getPetInfoOne("yb", "info") || 0;
              if (yb < price)
                return { ok: !1, msg: `元宝不足，需要 ${price}，当前 ${yb}` };
              setPetInfo({ info: { yb: yb - price } });
              this.toAddGoods({ good: goodKey });
              return {
                ok: !0,
                msg: `购买成功，扣除 ${price} 元宝`,
                leftYb: yb - price,
              };
            } catch (e) {
              return { ok: !1, msg: "购买出错: " + (e?.message || e) };
            }
          }
        }
        try {
          module && (module.exports = { Goods });
        } catch (e) {}
      },
    },
    __webpack_module_cache__ = {};
  function __webpack_require__(e) {
    var t = __webpack_module_cache__[e];
    if (void 0 !== t) return t.exports;
    var s = (__webpack_module_cache__[e] = { id: e, loaded: !1, exports: {} });
    return (
      __webpack_modules__[e](s, s.exports, __webpack_require__),
      (s.loaded = !0),
      s.exports
    );
  }
  __webpack_require__.nmd = (e) => (
    (e.paths = []),
    e.children || (e.children = []),
    e
  );
  var __webpack_exports__ = __webpack_require__(719);
  module.exports = __webpack_exports__;
})();
