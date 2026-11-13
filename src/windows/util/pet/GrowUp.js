(() => {
  var e = {
      303: (e, t, o) => {
        e = o.nmd(e);
        const { Level: i, pinkDiamondLevel: n } = o(527);
        // 课程四个阶段的 shop key 前缀（小学 → 中学 → 大学 → 研究生）
        const STUDY_STAGES = ["_xx-", "_zx-", "_dx-", "_yjs-"];
        class a {
          callBackState = (e) => {};
          oldEvent = null;
          maxGrow = 150;
          growTime = 6e4;
          intervalTime = null;
          normalGrowthRate = 260;
          // 「加速学习」（右键菜单，otherOptions.fastActive）：开启后一节课直接把
          // 本科目从当前进度一路读到研究生毕业（学无止境），不再一阶段一阶段地
          // 读。学习值、属性、礼包一次性发放；属性按各阶段真实课时分别累加
          // （小学 15、中学 25、大学 45、研究生 85…），而不是拿当前阶段的值乘总
          // 课时。同一个开关还会把单节课时长压到 shop 里的现值（见
          // Goods.studyMinutes），两件事一起生效。
          // 消耗没有跟着放大（一节课还是扣一节课的饥饿/清洁），按需求保留。
          // 已经「学无止境」时退回一节课的正常结算。
          studyShop = void 0;
          getStudyShop() {            if (void 0 === this.studyShop) {
              try {
                const m = eval("require")("./shop.js");
                this.studyShop = (m && m.shop && m.shop.study) || null;
              } catch (err) {
                this.studyShop = null;
              }
            }
            return this.studyShop;
          }
          // 完整商品表，贴心宝贝挑物品时用（学习那份只缓存了 shop.study）。
          shopTable = void 0;
          getShopTable() {
            if (void 0 === this.shopTable) {
              try {
                const m = eval("require")("./shop.js");
                this.shopTable = (m && m.shop) || null;
              } catch (err) {
                this.shopTable = null;
              }
            }
            return this.shopTable;
          }
          // 该科目还差多少节课才「学无止境」（研究生读完）。<= 0 即读完。
          studyRemain(e) {
            try {
              const cur = getPetInfoOne("study", "activeValue") || {},
                done = +cur[e] || 0,
                table = this.getStudyShop(),
                last = table && table[STUDY_STAGES[3] + e],
                total = (last && last.classNum) || 95;
              return total - done;
            } catch (err) {
              return 1;
            }
          }
          // 返回 { step, obtain }；step = 1 表示按一节课正常结算。
          // 「加速学习」打开时，这一节把本科目剩余课时一次结算完（step 就是
          // 剩余总课时数），同时属性按各阶段真实课时累加。
          studyPlan(e, t) {
            const one = { step: 1, obtain: null };
            if (!this.isStudyBoost()) return one;
            try {
              const table = this.getStudyShop();
              if (!table || !e || !e.value) return one;
              let done = (t.study && t.study[e.value]) || 0,
                from = 0,
                step = 0,
                obtain = {};
              for (let j = 0; j < STUDY_STAGES.length; j++) {
                const item = table[STUDY_STAGES[j] + e.value];
                if (!item) continue;
                // classNum 是这一阶段读完时的累计课时（9 / 20 / 40 / 95）
                let end = item.classNum || 0,
                  total = end - from,
                  used = Math.min(Math.max(done - from, 0), total),
                  left = total - used;
                if (left > 0) {
                  step += left;
                  ["intel", "charm", "strong"].forEach((k) => {
                    item[k] && (obtain[k] = (obtain[k] || 0) + item[k] * left);
                  });
                }
                from = end;
              }
              // 200 只是防御脏数据，正常最大是从小学一路读到研究生 95 节
              return step > 0 ? { step: Math.min(step, 200), obtain } : one;
            } catch (err) {
              return one;
            }
          }
          // 右键菜单的「加速学习」是唯一开关（otherOptions.fastActive）。
          // 老的 otherOptions.studyBoost 是合并前「快速学习」的独立开关，
          // 只做兼容读取：老存档里它为 true 时行为不变，新写入一律走 fastActive。
          isStudyBoost() {
            try {
              return (
                !!getPetInfoOne("fastActive", "otherOptions") ||
                !!getPetInfoOne("studyBoost", "otherOptions")
              );
            } catch (e) {
              return !1;
            }
          }
          constructor(e = {}) {
            let { fn: t, petInfo: o, growTime: i, callBackState: n } = e;
            ((this.oldEvent = null),
              "function" == typeof n &&
                (this.callBackState = (e) => {
                  this.oldEvent != e.type &&
                    ((this.oldEvent = e.type), e.type && n(e));
                }),
              i && (this.growTime = i),
              this.doChangeMaxInfo(o));
          }
          startGrowUp() {
            this.intervalTime
              ? (clearInterval(this.intervalTime), (this.intervalTime = null))
              : this.GrowUpMain({ first: !0 });
            let e = this.growTime;
            ($test && (e = 1e3),
              (this.intervalTime = setInterval(() => {
                this.GrowUpMain();
              }, e)));
          }
          doChangeMaxInfo(e) {
            let t = JSONto(e.maxInfo),
              o = JSONto(e.info);
            if (o.growth || 0 == o.growth) {
              let e = i.getNowLevel(o.growth);
              ((t.upGrowth = e.upGrowth),
                (t.nextGrowth = e.nextGrowth),
                (t.level = e.level));
            } else ((t.upGrowth = 0), (t.nextGrowth = 100), (t.level = 1));
            ((t.hunger = 3e3 + 100 * (t.level > 30 ? 30 : t.level)),
              (t.clean = 3e3 + 100 * (t.level > 30 ? 30 : t.level)),
              (t.growthRate = this.getEffectGrowthRate(e)),
              setPetInfo({ maxInfo: t }));
          }
          addMax = 0;
          addMaxi = 1;
          GrowUpMain(e = {}) {
            let { first: t, unGrow: o = !1 } = e,
              i = getPetInfo();
            if (
              i.info.lastLoginTime &&
              new Date().getTime() >= i.info.lastLoginTime
            ) {
              let e = tool.getTime({ format: "YY-MM-DD", addDay: 1 }),
                t = {
                  lastLoginTime: new Date(e + " 06:00").getTime(),
                  onlineDataTime: 0,
                },
                o = n.isExpirationDate(i.otherOptions),
                a = n.toChangeOtherDatas(i.otherOptions);
              setPetInfo({ info: t, otherOptions: o, ...a });
            }
            if (i?.maxInfo?.stopGrowth)
              return void this.callBackState({
                type: "pause",
                communication: ["state", "stopGrowth"],
                speak: !0,
              });
            if ((this.callBackState({ type: null }), 0 == i.info.health))
              return;
            let a = JSONto(i.maxInfo),
              l = JSONto(i.info),
              r = JSONto(i.activeOption),
              s = JSONto(i.activeValue);
            if (t)
              0 == l.growth &&
                setTimeout(() => {
                  setPetInfo({ info: { growth: 0.5 } });
                }, 500);
            else {
              if (!o) {
                let e = this.getEffectHungerCleanMood(i),
                  t = isNumber(l.hunger) - e[0];
                l.hunger = t < 0 ? 0 : t;
                let o = isNumber(l.clean) - e[1];
                l.clean = o < 0 ? 0 : o;
                let n = isNumber(l.mood) - e[2];
                l.mood = n < 0 ? 0 : n;
                let r = 100,
                  s =
                    Math.trunc(
                      (a.growthRate / 60 / (60 / (this.growTime / 1e3))) * r,
                    ) / r;
                ((l.growth = Math.trunc((isNumber(l.growth) + s) * r) / r),
                  (l.onLineTime = isNumber(l.onLineTime) + this.growTime / 6e4),
                  (l.onlineDataTime =
                    isNumber(l.onlineDataTime) + this.growTime / 6e4));
              }
              i.activeOption.ill ||
                (r = this.countdownActiveTime(
                  r,
                  s,
                  (e) => {
                    for (let t in e) l[t] = +l[t] + +e[t];
                  },
                  (e) => {
                    s.study[e] = (s.study[e] || 0) + 1;
                  },
                ));
            }
            setPetInfo({ info: l, activeOption: r, activeValue: s });
            // 每分钟这一轮扣完饥饿/清洁后，看看要不要帮它吃点/洗一下。
            // 停止成长和死亡在上面已经 return，不会走到这里。
            this.sweetHeartAuto();
          }
          getEffectGrowthRate(e) {
            let t = [0, 0, 0, 0, 0];
            ((e.info.mood || 0 == e.info.mood) &&
              (t[0] = getInterval(e.info.mood, {
                100: "number" != typeof e.info.mood,
                0: [900, 1e3],
                20: [700, 899],
                70: [500, 699],
                100: [300, 499],
                140: [100, 299],
                180: [0, 99],
              })),
              (e.info.health || 0 == e.info.health) &&
                (t[1] = getInterval(e.info.health, {
                  500: "number" != typeof e.info.health,
                  0: [5, 5],
                  30: [4, 4],
                  80: [3, 3],
                  120: [2, 2],
                  160: [1, 1],
                  500: [0, 0],
                })),
              e.otherOptions.pinkDiamond &&
                (t[2] = -10 * (e.otherOptions.pinkDiamondLevel || 0)),
              e.otherOptions.sweetHeart && (t[4] = -10),
              e.info.hunger < 720 && (t[3] = 80),
              e.info.clean < 1080 && (t[3] = 80));
            let o = this.normalGrowthRate;
            for (let e in t) o -= t[e];
            return o <= 0 ? 0 : o;
          }
          getEffectHungerCleanMood(e) {
            let t = [getRandom(5, 8), getRandom(5, 8), getRandom(2, 4)];
            if (e.info.mood) {
              let o = getInterval(e.info.mood, {
                0: "number" != typeof e.info.mood,
                0: [600, 1e3],
                2: [0, 599],
              });
              ((t[0] = +t[0] + +o), (t[1] = +t[1] + +o));
            }
            // 注意：消耗不随「一键学完」放大（用户要求），一节课仍只扣一节课的
            // 饥饿/清洁/心情；放大的是学习值、属性和礼包物品。
            for (let o in e.activeOption) {
              if (!e.activeOption[o]) continue;
              const cur = e.activeOption[o];
              (cur?.starve && (t[0] += this.doGetMS(cur.starve, cur.overTime)),
                cur?.clean && (t[1] += this.doGetMS(cur.clean, cur.overTime)),
                cur?.mood && (t[2] += this.doGetMS(cur.mood, cur.overTime)));
            }
            return ($test && (t = [1, 1, 1]), t);
          }
          doGetMS(e, t) {
            return (e / t) | 0;
          }
          // 「贴心宝贝」（otherOptions.sweetHeart）的自动照料：
          // 饥饿掉到 720 以下自动用背包里的食物，清洁掉到 1080 以下自动用清洁
          // 品——阈值和 State.determineHealth 的判定保持一致。
          // 挑物品的规则：加上去不能让任何一项属性超过上限（避免溢出浪费），
          // 同样合格时选主属性最大的，一次补到最多、减少消耗次数；一次最多
          // 连用 3 件。走 Goods.useConsumables 而不是直接改数值，背包扣减、
          // 存档落盘、状态回调都沿用和手动喂食同一条链路。
          sweetHeartSayAt = 0;
          sweetHeartAuto() {
            try {
              let info = getPetInfo();
              if (!info?.otherOptions?.sweetHeart) return;
              // 生病 / 死亡 / 停止成长 时不接管，交给原有逻辑
              if (info.activeOption?.ill) return;
              if (0 == info.info?.health) return;
              if (info.maxInfo?.stopGrowth) return;
              let pet = global.petControl;
              if (!pet?.Goods?.useConsumables) return;
              // 先吃后洗：饿得比脏得快；一次只处理一项，另一项下一分钟再看
              let s =
                this.sweetHeartFeed(pet, "food", "hunger", "starve", 720) ||
                this.sweetHeartFeed(pet, "commodity", "clean", "clean", 1080);
              if (!s) return;
              // 连用了好几十件小道具时，别每分钟都弹一次，5 分钟内只提示一次
              let now = Date.now();
              if (this.sweetHeartSayAt && now - this.sweetHeartSayAt < 3e5)
                return;
              ((this.sweetHeartSayAt = now), (this.oldEvent = null));
              this.callBackState({
                type: "normal",
                // 第一人称、和手动喂食的台词区分开，一眼能看出是贴心宝贝干的。
                // 不传 change：那会强制把托盘图标刷成普通图标，学习/打工时
                // 正显示带等级的头像图标，不该被这条消息顶掉。
                msg:
                  "food" == s.kind
                    ? `[host]，肚子饿啦，吃了${s.name}~`
                    : `[host]，身上脏啦，用${s.name}洗了一下~`,
                speak: !0,
              });
            } catch (e) {
              console.log("sweetHeartAuto err", e);
            }
          }
          // 返回 { name, count } 表示用了东西，null 表示没动
          sweetHeartFeed(pet, cat, field, attr, line) {
            let used = 0,
              last = null;
            for (let n = 0; n < 3; n++) {
              let info = getPetInfo();
              if (!(isNumber(info.info?.[field]) < line)) break;
              let pick = this.sweetHeartPick(pet, cat, attr, info);
              if (!pick) break;
              let r = pet.Goods.useConsumables({
                // 必须把商品本身的字段（starve / clean / type）一起带上：
                // State.useConsumables 是遍历传入对象的属性来加值的，只给
                // keyName 和 num 的话物品会被扣掉但一点效果都没有。
                ...pick.item,
                keyName: pick.keyName,
                // 这里的 num 是「背包里这一堆的数量」，useConsumables 用它拼
                // keyName-num 定位数组元素，然后减 1 写回，不能传成 1
                num: pick.num,
              });
              if (!r || r.overType) break;
              (used++, (last = pick));
            }
            return used ? { name: last.name, count: used, kind: cat } : null;
          }
          // 在背包对应分类里挑一件「用下去不会顶破上限」的物品，主属性大的优先
          sweetHeartPick(pet, cat, attr, info) {
            let list = (pet.Goods.storeGoods && pet.Goods.storeGoods[cat]) || [],
              table = (this.getShopTable() && this.getShopTable()[cat]) || {},
              best = null;
            for (let i = 0; i < list.length; i++) {
              let raw = String(list[i]),
                at = raw.lastIndexOf("-");
              if (at <= 0) continue;
              let keyName = raw.slice(0, at),
                num = +raw.slice(at + 1);
              if (!(num > 0)) continue;
              let it = table[keyName];
              if (!it) continue;
              let add = isNumber(it[attr]);
              if (add <= 0) continue;
              // 食物可能同时加清洁、清洁品也可能同时加饥饿，两边都要检查
              if (this.sweetHeartOver(it, info)) continue;
              if (!best || add > best.add)
                best = { keyName, num, name: it.name, add, item: it };
            }
            return best;
          }
          // 这件物品用下去，饥饿值/清洁值会不会超过上限
          sweetHeartOver(it, info) {
            let pairs = [
              ["starve", "hunger"],
              ["clean", "clean"],
            ];
            for (let i = 0; i < pairs.length; i++) {
              let add = isNumber(it[pairs[i][0]]);
              if (add <= 0) continue;
              let max = isNumber(info.maxInfo?.[pairs[i][1]]);
              if (
                max > 0 &&
                isNumber(info.info?.[pairs[i][1]]) + add > max
              )
                return !0;
            }
            return !1;
          }
          countdownActiveTime(e, t, o, i) {
            let n = e?.work
              ? "work"
              : e?.study
                ? "study"
                : e?.trip
                  ? "trip"
                  : "";
            if (n) {
              if (e[n]?.stopNow)
                return (
                  this.callBackState({
                    type: "normal",
                    msg: "[host]，我回来了哦~~",
                    speak: !0,
                    change: !0,
                  }),
                  (e[n] = null),
                  e
                );
              if (e[n].stateTime + 1 > e[n].overTime) {
                // 快速学习（右键菜单里可开）：一节课把本科目剩余课时一次结算完。
                // 属性总额已在 studyPlan 里按各阶段课时算好，这里不再乘倍数。
                // 只作用于学习，打工/旅游保持原样。
                const plan = "study" == n ? this.studyPlan(e[n], t) : null,
                  boost = plan ? plan.step : 1,
                  planObtain =
                    plan && plan.obtain && Object.keys(plan.obtain).length
                      ? plan.obtain
                      : null;
                let obtain = planObtain || e[n].obtain || {};
                o(obtain);
                let a = "",
                  l = getRandom(1, 4),
                  // 这次结算跨过了几个阶段（每次跨阶段都该有一次升学礼包）
                  ups = 0;
                l = l <= 3 ? 1 : 2;
                if ("study" == n) {
                  const before = (t.study && t.study[e[n].value]) || 0;
                  // 逐次 +1，让每一节都算进学习值
                  for (let k = 0; k < boost; k++) i(e[n].value);
                  const after = (t.study && t.study[e[n].value]) || 0;
                  // 一次加多节会「跨过」9/20/40/95 而不是正好等于它，
                  // 所以用区间判断，否则加速后永远不提示升学。
                  // ups 是这次跨过的阶段数：小学→中学、中学→大学、大学→研究生、
                  // 研究生毕业各算一次，每个阶段都补一份升学礼包。
                  ups = [9, 20, 40, 95].filter(
                    (v) => before < v && after >= v,
                  ).length;
                  ups ? (a = "overStudyUp") : (a = "overStudy");
                } else "work" == n && (a = "overWork");
                // 礼包：每节课 1~2 份，快速学习时按课时数一次发完；
                // 跨过的每个阶段再补 1 份（原逻辑升学那节是 3 份），
                // 这份不跟着课时数放大。
                ((l = l * boost + ups),
                  ups && l < 3 && (l = 3),
                  (e[n] = null));
                let r = [],
                  s = () => {
                    let e = Math.random();
                    addGoods(
                      e <= 0.43 ? "commodity" : e <= 0.86 ? "food" : "medicine",
                      (e) => {
                        let t = e.split("*_");
                        ((t = `../assets/img_res/${t[0]}/${t[1]}.gif`),
                          r.push(t),
                          r.length < l
                            ? s()
                            : this.callBackState({
                                speakType: "seeTextImgs",
                                type: "normal",
                                communication: ["state", a],
                                speak: !0,
                                change: !0,
                                // 加速后一节课可能给 10~30 件，气泡横向放不下，
                                // 只展示前 8 个示意；东西照常全部入库。
                                otherData: { imgUrls: r.slice(0, 8) },
                              }));
                      },
                    );
                  };
                return (s(), e);
              }
              new Date().getTime() - e[n].startTime > this.growTime / 60 &&
                e[n].stateTime++;
            }
            return e;
          }
        }
        try {
          e && (e.exports = { GrowUp: a });
        } catch (e) {}
      },
      527: (e, t, o) => {
        e = o.nmd(e);
        const i = new (class {
            levels = [
              0, 100, 300, 600, 1100, 1800, 2800, 4200, 5900, 8e3, 10600, 13700,
              17400, 21700, 26700, 32500, 39e3, 46300, 54500, 63600, 73700,
              84800, 97e3, 110400, 124900, 140600, 157600, 175900, 195600,
              216700, 239300, 263500, 289200, 316500, 345500, 376200, 408700,
              443e3, 479200, 517400, 557500, 599600, 643800, 690100, 738600,
              789300, 842300, 897700, 955400, 1015500, 1078100, 1143200,
              1210900, 1281200, 1354200, 143e4, 1508500, 1589800, 1674e3,
              1761100, 1851200, 1944300, 2040500, 2139900, 2242400, 2348100,
              2457100, 2569400, 2685100, 2804200, 2926800, 3053e3, 3182700,
              3316e3, 3453e3, 3593700, 3738200, 3886500, 4038700, 4194900,
              4355e3, 4519100, 4687300, 4859600, 5036100, 5216800, 5401800,
              5591200, 5784900, 5983e3, 6185600, 6392700, 6604400, 6820700,
              7041700, 7267500, 7498e3, 7733300, 7973500, 8218600, 8468700,
              8723800, 8984e3, 9249400, 9519900, 9795600, 10076600, 10362900,
              10654600, 10951700, 11254300, 11562500, 11876200, 12195500,
              12520500, 12851200, 13187700, 1353e4, 13878200, 14232400,
              14592500, 14958600, 15330800, 15709100, 16093600, 16484300,
              16881300, 17284700, 17694400, 18110500, 18533100, 18962200,
              19397900, 19840200, 20289200, 20745e3, 21207500, 21676800,
              22153e3, 22636100, 23126200, 23623300, 24127500, 24638900,
              25157400, 25683100, 26216100, 26756400, 27304100, 27859200,
              28421800, 28992e3, 29569700, 30155e3, 30748e3, 31348700, 31957200,
              32573500, 33197700, 33829900, 3447e4, 35118100, 35774300,
              36438600, 37111100, 37791800, 38480800, 39178200, 39883900,
              40598e3, 41320600, 42051700, 42791400, 43539700, 44296700,
              45062500, 45837e3, 46620300, 47412500, 48213600, 49023700,
              49842800, 50671e3, 51508400, 52354900, 53210600, 54075600,
              54949900, 55833600, 56726700, 57629300, 58541500, 59463200,
              60394500, 61335500, 62286200, 63246700, 64217e3, 65197200,
              66187400, 67187500, 68197600, 69217800, 70248100, 71288600,
              72339300, 73400300, 74471700, 75553400, 76645500, 77748100,
              78861200, 79984900, 81119200, 82264200, 8342e4, 84586500,
              85763800, 86952e3, 88151100, 89361200, 90582300, 91814500,
              93057900, 94312400, 95578100, 96855100, 98143400, 99443100,
              100754200, 102076800, 103411e3, 104756700, 106114e3, 107483e3,
              108863700, 110256200, 111660500, 113076700, 114504900, 115945e3,
              117397100, 118861300, 120337600, 121826100, 123326800, 124839800,
              126365200, 127902900, 129453e3, 131015600, 132590700, 134178400,
              135778700, 137391700, 139017500, 140656e3, 142307300, 143971500,
              145648600, 147338700, 149041800, 150758e3, 152487400, 154229900,
              155985600, 157754600, 159536900, 161332600, 163141700, 164964300,
              166800500, 168650200, 170513500, 172390500, 174281200, 176185700,
              178104e3, 180036200, 181982400, 183942500, 185916600, 187904800,
              189907100, 191923600, 193954300, 195999300, 198058700, 200132400,
              202220500, 204323100, 206440200, 208571900, 210718200, 212879200,
              215055e3, 217245500, 219450800, 221671e3, 223906100, 226156200,
              228421300, 230701500, 232996900, 235307400, 237633100, 239974100,
              242330400, 244702100, 247089200, 249491800, 25191e4, 254343700,
              256793e3, 259258e3, 261738700, 264235200, 266747500, 269275700,
              271819900, 27438e4, 276956100, 279548300, 282156600, 284781100,
              287421800, 290078800, 292752200, 295441900, 298148e3, 300870600,
              303609700, 306365400, 309137700, 311926700, 314732500, 317555e3,
              320394300, 323250500, 326123600, 329013700, 331920800, 334845e3,
              337786400, 340744900, 343720600, 346713600, 349723900, 352751600,
              355796700, 358859300, 361939500, 365037200, 368152500, 371285500,
              374436200, 377604700, 380791e3, 383995200, 387217400, 390457500,
              393715600, 396991800, 400286100, 403598600, 406929300, 410278300,
              413645700, 417031400, 420435500, 423858100, 427299200, 430758900,
              434237200, 437734200, 44125e4, 444784500, 448337800, 45191e4,
              455501100, 459111200, 462740300, 466388500, 470055900, 473742400,
              477448100, 481173100, 484917400, 488681100, 492464200, 496266800,
              500089e3, 503930700, 507792e3, 511673e3, 515573700, 519494200,
              523434500, 527394700, 531374900, 535375e3, 539395200,
            ];
            level = 1;
            constructor() {}
            getNowLevel(e) {
              if (!e || +e != +e)
                return { upGrowth: 0, nextGrowth: this.levels[1], level: 1 };
              e = +e;
              let t = [];
              for (let o = 1; o <= 400; o++)
                if (e >= this.levels[o - 1] && e < this.levels[o]) {
                  ((t = [this.levels[o - 1], this.levels[o]]),
                    (this.level = o));
                  break;
                }
              return { upGrowth: t[0], nextGrowth: t[1], level: this.level };
            }
          })(),
          n = new (class {
            levels = [0, 100, 300, 600, 1100, 1800, 2800];
            constructor() {}
            getNowLevel(e) {
              if (!e || +e != +e)
                return { upGrowth: 0, nextGrowth: this.levels[1], level: 1 };
              e = +e;
              let t = [];
              for (let o = 1; o <= 7; o++)
                if (e >= this.levels[o - 1] && e < this.levels[o]) {
                  ((t = [this.levels[o - 1], this.levels[o]]),
                    (this.level = o));
                  break;
                }
              return { upGrowth: t[0], nextGrowth: t[1], level: this.level };
            }
            hour = 864e5;
            isExpirationDate(e) {
              let t = { growth: e.growth || 0 };
              if (e.pinkDiamondExpirationDate) {
                let o = 0,
                  i = new Date().getTime();
                i >= e.pinkDiamondExpirationDate
                  ? ((t.pinkDiamond = !1),
                    (o = e.pinkDiamondExpirationDate - e.pinkDiamondBeginDate),
                    (t.growthValue = 0),
                    (t.pinkDiamondBeginDate = 0),
                    (t.pinkDiamondExpirationDate = 0))
                  : ((t.pinkDiamond = !0),
                    (t.growthValue = t.growthValue || 20),
                    (o = i - e.pinkDiamondBeginDate));
                let n = (o / this.hour) | 0;
                n > 0 &&
                  (i < e.pinkDiamondExpirationDate &&
                    (t.pinkDiamondBeginDate = tool.getDayHourTime()),
                  (t.growth = t.growth + n * (e.growthValue || 5)));
                let a = this.getNowLevel(t.growth);
                ((t.pinkDiamondLevel = a.level),
                  (t.growthValue_next = a.nextGrowth || 100));
              }
              return (console.log("opt", t), t);
            }
            toChangeOtherDatas(e) {
              let t = {};
              return (
                e.pinkDiamond
                  ? ((t.allvipcnt = 2 * e.pinkDiamondLevel),
                    (t.canusecnt = t.allvipcnt))
                  : ((t.allvipcnt = 2 * e.pinkDiamondLevel), (t.canusecnt = 0)),
                { fishing: t }
              );
            }
          })();
        try {
          e && (e.exports = { Level: i, pinkDiamondLevel: n });
        } catch (e) {}
      },
    },
    t = {};
  function o(i) {
    var n = t[i];
    if (void 0 !== n) return n.exports;
    var a = (t[i] = { id: i, loaded: !1, exports: {} });
    return (e[i](a, a.exports, o), (a.loaded = !0), a.exports);
  }
  o.nmd = (e) => ((e.paths = []), e.children || (e.children = []), e);
  var i = o(303);
  module.exports = i;
})();
