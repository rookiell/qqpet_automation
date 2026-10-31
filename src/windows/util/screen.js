// 窗口定位工具：把弹出面板钳制进显示器可视区域。
// 背景：control/rightMenu/stateInfo/tip 这些面板原来只按"相对宠物的偏移"算坐标，
// 没有任何边界修正。宠物贴在屏幕右下角时，1100x505 的控制面板会整体算到屏幕外，
// 用户点开就看不见、也点不到。这里统一做边界收敛。
const { screen } = require("electron");

// 取锚点（一般是宠物左上角坐标）所在显示器的可视区域。
// workArea 已排除任务栏/Dock，多显示器时按锚点就近选择。
function getWorkArea(anchor) {
  try {
    const d =
      anchor && anchor.length >= 2
        ? screen.getDisplayNearestPoint({
            x: Math.round(anchor[0]),
            y: Math.round(anchor[1]),
          })
        : screen.getPrimaryDisplay();
    return d?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  } catch (e) {
    return { x: 0, y: 0, width: 1920, height: 1080 };
  }
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

module.exports = { getWorkArea, clampToScreen };
