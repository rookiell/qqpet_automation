// 窗口定位工具：把弹出面板钳制进显示器可视区域。
// 背景：control/rightMenu/stateInfo/tip 这些面板原来只按"相对宠物的偏移"算坐标，
// 没有任何边界修正。宠物贴在屏幕右下角时，1100x505 的控制面板会整体算到屏幕外，
// 用户点开就看不见、也点不到。这里统一做边界收敛。
const { screen } = require("electron");

// 取锚点（一般是宠物左上角坐标）所在的显示器对象。
// 多显示器时按锚点就近选择；拿不到就退回主显示器。
function getDisplay(anchor) {
  try {
    const d =
      anchor && anchor.length >= 2
        ? screen.getDisplayNearestPoint({
            x: Math.round(anchor[0]),
            y: Math.round(anchor[1]),
          })
        : screen.getPrimaryDisplay();
    return d?.workArea ? d : null;
  } catch (e) {
    return null;
  }
}

// 取锚点所在显示器的可视区域。
// workArea 已排除任务栏/Dock，多显示器时按锚点就近选择。
function getWorkArea(anchor) {
  const d = getDisplay(anchor);
  return d?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
}

// 判断任务栏/菜单栏贴在哪条边：用「整块屏幕 bounds」减去「workArea」的四条边差值，
// 差值最大且 >0 的那条边就是它。这样 macOS 顶部菜单栏、Windows 底部任务栏、
// Windows 10 左侧/右侧竖排任务栏都能统一识别，不依赖任何平台判断。
function getTaskbarEdge(displayBounds, workArea) {
  const s = displayBounds || workArea;
  const insets = {
    top: workArea.y - s.y,
    bottom: s.y + s.height - (workArea.y + workArea.height),
    left: workArea.x - s.x,
    right: s.x + s.width - (workArea.x + workArea.width),
  };
  let edge = null,
    max = 0;
  for (const k in insets) {
    if (insets[k] > max) ((max = insets[k]), (edge = k));
  }
  return edge;
}

// 把 (x, y) 收敛到可视区域内，保证 [x, x+w] / [y, y+h] 不越界。
// 面板比屏幕还大时退化为左上对齐，至少保证左上角可点。
function clampToScreen(x, y, w, h, anchor) {
  const a = getWorkArea(anchor);
  const maxX = a.x + a.width - w;
  const maxY = a.y + a.height - h;
  return [
    Math.max(a.x, Math.min(Math.round(x), maxX)),
    Math.max(a.y, Math.min(Math.round(y), maxY)),
  ];
}

// 托盘右键菜单的窗口摆放。
// 托盘图标（system tray / 菜单栏）不像宠物那样有"左上角"可当锚点，菜单必须贴着图标走：
// 图标在顶部就往下展开，图标在底部任务栏就往上翻，水平方向居中对齐图标且不出屏。
// 窗口里菜单只占一侧（另一侧留给子菜单展开），所以返回值带上对齐方式给渲染层用：
//   align = "right" → 菜单贴窗口右侧（left: winW - menuW），子菜单朝左展开
//   align = "left"  → 菜单贴窗口左侧，子菜单朝右展开
//   menuTop → 菜单在窗口内的 y 偏移（渲染层用 top 定位，不再写死 60px）
//
// 关键：窗口不能摆到 workArea 之外。macOS 上把窗口 y 设成负值（想靠"窗口内留余量"
// 把菜单顶到菜单栏下方），系统会直接把窗口钳回 workArea.y，菜单于是被整个推下来
// 60px，看起来离菜单栏还有一段距离。所以这里先算菜单的屏幕顶边，再把窗口贴着它摆。
function placeTrayMenu(trayBounds, winW, winH) {
  const MENU_W = 130; // .bk_body 的实际宽度
  const MENU_H = 128; // 六项菜单的实测高度（含头尾装饰）
  const gap = 1; // 菜单与图标/菜单栏的最小间隙
  let b = trayBounds || {};
  // Linux 上 tray.getBounds() 返回空矩形（Electron 未实现），此时按任务栏所在边
  // 造一个虚拟图标位置，至少保证菜单贴在任务栏那一侧、不出屏。
  let valid = (b.width | 0) > 0 && (b.height | 0) > 0;
  const d = getDisplay(
    valid ? [(b.x || 0) + b.width / 2, (b.y || 0) + b.height / 2] : null,
  );
  const area = d?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const edge = getTaskbarEdge(d?.bounds, area) || "bottom";
  if (!valid) {
    // 沿任务栏那条边造一个 32x32 的虚拟图标（就在工作区外侧）
    const P = 32;
    b =
      "top" === edge
        ? { x: area.x + area.width - 48, y: area.y - P, width: P, height: P }
        : "left" === edge
          ? { x: area.x - P, y: area.y + area.height - 48, width: P, height: P }
          : "right" === edge
            ? { x: area.x + area.width, y: area.y + area.height - 48, width: P, height: P }
            : { x: area.x + area.width - 48, y: area.y + area.height, width: P, height: P };
    valid = true;
  }
  const cx = Math.round((b.x || 0) + (b.width || 0) / 2);
  const cy = Math.round((b.y || 0) + (b.height || 0) / 2);
  const tipTop = Math.round(b.y || 0);
  const tipLeft = Math.round(b.x || 0);
  const tipRight = Math.round((b.x || 0) + (b.width || 0));
  const tipBottom = Math.round((b.y || 0) + (b.height || 0));
  const maxWinY = area.y + area.height - winH;
  // 横向居中对齐图标，但不许把菜单推出一侧屏幕
  const clampX = (v) =>
    Math.max(area.x, Math.min(Math.round(v), area.x + area.width - MENU_W));

  // —— 竖排任务栏（Windows 10 把任务栏拖到左/右）：菜单贴在图标内侧，纵向对齐图标 ——
  if ("left" === edge || "right" === edge) {
    // 图标在左 → 菜单向右展开；图标在右 → 菜单向左展开
    const menuX = clampX("left" === edge ? tipRight + gap : tipLeft - gap - MENU_W);
    const menuY = Math.max(
      area.y,
      Math.min(Math.round(cy - MENU_H / 2), area.y + area.height - MENU_H),
    );
    const align = "left" === edge ? "left" : "right";
    const winX = Math.round(menuX - ("right" === align ? winW - MENU_W : 0));
    const winY = Math.max(area.y, Math.min(menuY, maxWinY));
    return {
      x: winX,
      y: Math.round(winY),
      // 窗口比菜单高时菜单顶边可能被窗口底边裁掉，收敛到窗口内
      menuTop: Math.max(0, Math.min(menuY - winY, winH - MENU_H)),
      align,
      vertical: "top",
      menuW: MENU_W,
      menuH: MENU_H,
    };
  }

  // —— 顶部菜单栏 / 底部任务栏：菜单贴着这条边展开，横向居中于图标 ——
  const align = cx > area.x + area.width / 2 ? "right" : "left";
  // 图标下方放得下就向下展开，否则翻到图标上方（底部任务栏）
  const flip = tipBottom + gap + MENU_H > area.y + area.height;
  const menuY = flip ? tipTop - gap - MENU_H : area.y + gap;
  // 窗口顶边不能高于可用区域，否则会被系统钳回来、菜单跟着错位
  const winY = Math.max(area.y, Math.min(menuY, maxWinY));
  const menuX = clampX(cx - MENU_W / 2);
  return {
    x: Math.round(menuX - (align === "right" ? winW - MENU_W : 0)),
    y: Math.round(winY),
    // 窗口底边可能高于菜单底边，同样收敛，避免菜单被窗口裁掉
    menuTop: Math.max(0, Math.min(menuY - winY, winH - MENU_H)),
    align,
    vertical: flip ? "bottom" : "top",
    menuW: MENU_W,
    menuH: MENU_H,
  };
}

module.exports = { getWorkArea, clampToScreen, placeTrayMenu };
