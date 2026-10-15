/* ============================================================
   pixel-mask.js —— 「文字/按钮 → 真马赛克」渲染工具
   ------------------------------------------------------------
   🔴 为什么要单独抽出来：
   第一版做 A2/A3（按钮/标题被解锁）时，我用 CSS 格子 + opacity 去「盖住」文字，
   结果 t=0 时只是一片黑网格，**没有任何"马赛克 → 清晰"的信息量**，像糊了一层脏东西。
   正解是：把文字先渲染进一张隐藏 canvas，二值化成网格（1=笔迹 / 0=空），
   再按块平均去填色 —— 这样才真的能把「开始游戏」渲染成一格格色块，再逐渐收敛。

   本文件只提供工具，不含任何配色硬编码（颜色一律由调用方从 --c-* 令牌取）。
   ============================================================ */
window.PixelMask = (function () {

  /**
   * 把一段文字渲染成二值网格
   * @param {string} text
   * @param {number} W 网格宽（同时也是采样 canvas 宽）
   * @param {number} H 网格高
   * @returns {number[][]} 1 = 有笔迹，0 = 空
   */
  function textToGrid(text, W, H) {
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d");
    x.clearRect(0, 0, W, H);
    x.fillStyle = "#000000";
    // 字号取高度的 0.52：再大就会上下顶格，马赛克阶段会糊出画布
    x.font = "900 " + Math.round(H * 0.52) + "px 'Arial Black', 'Microsoft YaHei', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, W / 2, H / 2 + 1);
    var d = x.getImageData(0, 0, W, H).data;
    var grid = [];
    for (var y = 0; y < H; y++) {
      var row = [];
      for (var xx = 0; xx < W; xx++) {
        row.push(d[(y * W + xx) * 4 + 3] > 110 ? 1 : 0);   // 用 alpha 判笔迹
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * 把二值网格按 t 从马赛克渲染到清晰
   * @param {HTMLCanvasElement} cv
   * @param {number[][]} grid
   * @param {number} t 0 = 最糊，1 = 完全清晰
   * @param {string} fg 笔迹色（CSS 色值，通常取 --c-ink / --c-on-pop）
   * @param {string|null} bg 底色；传 null = 透明底（只画笔迹块）
   * @param {number} maxBlock 起始最大块边长（px）
   */
  function renderMaskCanvas(cv, grid, t, fg, bg, maxBlock) {
    var H = grid.length, W = grid[0].length;
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    // 揭晓感：越到后面越快（大哥点名要这个，不要两段式）
    var e = 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 2);
    var block = Math.max(1, Math.round((maxBlock || 12) * (1 - e)));
    var nx = Math.ceil(W / block), ny = Math.ceil(H / block);
    var cw = cv.width / nx, ch = cv.height / ny;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (var by = 0; by < H; by += block) {
      for (var bx = 0; bx < W; bx += block) {
        var n = 0, tot = 0;
        for (var y = by; y < Math.min(by + block, H); y++)
          for (var x = bx; x < Math.min(bx + block, W); x++) { tot++; n += grid[y][x]; }
        var fill = n / tot > 0.42;   // 块内笔迹够多 → 填笔迹色
        if (fill) ctx.fillStyle = fg;
        else if (bg) ctx.fillStyle = bg;
        else continue;               // 透明底：留空
        ctx.fillRect(Math.round((bx / block) * cw), Math.round((by / block) * ch),
                     Math.ceil(cw) + 1, Math.ceil(ch) + 1);
      }
    }
  }

  /** 读 CSS 自定义属性的计算值（🔴 必须在样式表应用之后再调，否则返回空串） */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  return { textToGrid: textToGrid, renderMaskCanvas: renderMaskCanvas, cssVar: cssVar };
})();
