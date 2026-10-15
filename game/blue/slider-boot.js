/* ============================================================
   slider-boot.js —— 「滑动条启动器」核心引擎
   ------------------------------------------------------------
   大哥的灵感：第一关的通关方式就是"拉动互动条"，
   那就把主界面的「开始游戏」也做成一个滑动条 ——
   拖动 = 开始游戏 = 第一关操作的教学前瞻。

   本文件只提供引擎（渲染 + 交互），方案的外观由 CSS 决定。
   10 个方案共用这一个引擎，保证行为一致、只换形态。

   核心能力：
     1. renderMosaic(canvas, grid, t)  —— 把像素画按 t∈[0,1] 从马赛克渲染到清晰
     2. SliderBoot(el, opts)           —— 绑定滑块，拖动改 t，拖到底触发 onUnlock
   ============================================================ */
window.SliderBoot = (function () {
  /* ---------- 1. 马赛克 → 清晰 渲染 ---------- */

  /**
   * @param {HTMLCanvasElement} cv  目标画布
   * @param {string[][]} grid       像素画（色值十六进制二维数组）
   * @param {number} t              0 = 最马赛克，1 = 完全清晰
   * @param {object} opt            {maxBlock, ease}
   */
  function renderMosaic(cv, grid, t, opt) {
    opt = opt || {};
    const maxBlock = opt.maxBlock || 32;
    const ease = opt.ease || "linear";
    t = Math.max(0, Math.min(1, t));
    // 缓动：让"变清晰"的重头戏发生在后半段（越到后面变化越剧烈）
    let e = t;
    if (ease === "out") e = 1 - Math.pow(1 - t, 2);        // 快-慢
    else if (ease === "in") e = t * t;                      // 慢-快
    else if (ease === "smooth") e = t * t * (3 - 2 * t);    // 两端缓

    const rows = grid.length, cols = grid[0].length;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const block = Math.max(1, Math.round(maxBlock * (1 - e)));
    const W = cv.width, H = cv.height;
    const nx = Math.ceil(cols / block);
    const ny = Math.ceil(rows / block);
    const cellW = W / nx, cellH = H / ny;

    ctx.clearRect(0, 0, W, H);
    for (let by = 0; by < rows; by += block) {
      for (let bx = 0; bx < cols; bx += block) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = by; y < Math.min(by + block, rows); y++) {
          const row = grid[y];
          for (let x = bx; x < Math.min(bx + block, cols); x++) {
            const c = row[x];
            if (!c) continue;
            r += parseInt(c.slice(1, 3), 16);
            g += parseInt(c.slice(3, 5), 16);
            b += parseInt(c.slice(5, 7), 16);
            n++;
          }
        }
        if (!n) continue;
        ctx.fillStyle = "rgb(" + ((r / n) | 0) + "," + ((g / n) | 0) + "," + ((b / n) | 0) + ")";
        ctx.fillRect(
          Math.round((bx / block) * cellW),
          Math.round((by / block) * cellH),
          Math.ceil(cellW) + 1,
          Math.ceil(cellH) + 1
        );
      }
    }
  }

  /* ---------- 2. 滑动条绑定 ---------- */

  /**
   * @param {object} o
   *   o.range      <input type=range> 或自绘轨道的宿主元素
   *   o.onChange   (t) => void
   *   o.onUnlock   ()   => void     拖到底（松手）时触发
   *   o.threshold  触发阈值，默认 0.985
   *   o.mode       "range"（原生 input）| "drag"（自绘轨道）
   */
  function SliderBoot(o) {
    const threshold = o.threshold == null ? 0.985 : o.threshold;
    let t = 0;
    let fired = false;

    function emit(v, isUnlock) {
      t = v;
      if (o.onChange) o.onChange(v, t >= threshold);
      if (isUnlock && t >= threshold && !fired) {
        fired = true;
        if (o.onUnlock) o.onUnlock();
      }
    }

    if (o.range && o.range.tagName === "INPUT") {
      const el = o.range;
      el.addEventListener("input", function () {
        // 已解锁后回拉就不算了（避免重复触发）
        if (fired) return;
        emit(parseFloat(el.value) / parseFloat(el.max || 100), false);
      });
      const done = function () {
        if (fired) return;
        emit(parseFloat(el.value) / parseFloat(el.max || 100), true);
      };
      el.addEventListener("change", done);
      el.addEventListener("pointerup", done);
      el.addEventListener("touchend", done);
      emit(parseFloat(el.value) / parseFloat(el.max || 100), false);
    } else if (o.range) {
      // 自绘轨道：必须「按住把手拖」，点空白不跳（大哥 2026-10-06 明确）
      const host = o.range;
      // 把手元素：优先用调用方给的 knob；否则自动找轨道内的把手
      const knobEl = o.knob || host.querySelector(".bo-knob, .sb-knob, [data-knob]");
      // 热区半径：把手本身 + 一点余量，手指不用精确戳中球心
      const grabPad = o.grabPad == null ? 10 : o.grabPad;

      /**
       * 指针横坐标 → 进度 0~1。
       * 🔴 默认按「整条轨道宽度」线性换算，这对「把手圆心能走满整条轨道」的
       *    老页面（boot10 的 .sb-knob，left:0 + margin:-26px）是对的。
       *    但 bootone 的把手圆心只能走「轨道内容宽 - 6px - 把手宽」这一段 ——
       *    两者尺度不同，直接用整条轨道宽会让光标和把手差一截。
       *    所以允许调用方传 o.pct 覆盖（bootone 就是用它把两者对齐到同一套几何）。
       */
      function ratioFromX(clientX) {
        if (o.pct) return Math.max(0, Math.min(1, o.pct(clientX)));
        const r = host.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      }
      // 指针是否落在把手上
      // 🔴 用「矩形命中区 + 一圈余量」，不要用圆：
      //    W3 的把手是 36×72 的竖条，用 max(w,h)/2 当半径会得到一个 46px 的圆 ——
      //    在竖条旁边 40px 按下也算"抓住"，手感很糊，违背"必须抓住它"的本意。
      function hitKnob(ev) {
        if (!knobEl) return false;
        const pt = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
        const cx = pt.clientX, cy = pt.clientY;
        let r = knobEl.getBoundingClientRect();
        // 🔴 knobEl 可能是 0×0 的居中锚点（.bo-knob），rect 完全是空的 →
        //    退回它内部真正有尺寸的 core 取（位置和尺寸都从 core 拿）。
        if (r.width < 2 || r.height < 2) {
          const core = knobEl.querySelector(".bo-knob-core, .sb-knob-core");
          if (core) r = core.getBoundingClientRect();
        }
        return cx >= r.left - grabPad && cx <= r.right + grabPad &&
               cy >= r.top - grabPad && cy <= r.bottom + grabPad;
      }

      let dragging = false;
      let dragId = null;     // 正在拖的那根指针
      let dragOffset = 0;    // 抓住把手时，指针与把手中心的比例差（避免一抓就跳）

      host.addEventListener("pointerdown", function (ev) {
        if (fired) return;
        if (!hitKnob(ev)) return;                 // 🔴 没戳到把手 → 什么都不做
        dragging = true;
        dragId = ev.pointerId;
        // 🔴 顺序有讲究：先把「偏移」和「回调」做完，再尝试捕获指针。
        //    setPointerCapture 对非活动 pointerId 会抛 NotFoundError，
        //    而异常会静默中断后面的语句 —— 曾导致 dragOffset 永远是 0、
        //    onDragStart 永不触发（页面看起来"按了没反应"）。
        dragOffset = ratioFromX(ev.clientX) - t;
        try { host.setPointerCapture && host.setPointerCapture(ev.pointerId); } catch (e) { /* 忽略 */ }
        if (o.onDragStart) o.onDragStart();
      });

      /**
       * 结束拖动。
       * 🔴 必须挂在 window 上，不能只挂轨道：
       *    W3 的轨道只有 22px 高，把手却有 66px —— 松手时指针很容易已经不在轨道上，
       *    这时 pointerup 落在页面主体上、**不会冒泡到轨道** → dragging 永远卡在 true。
       *    卡住之后的后果（大哥 2026-10-06 报的 bug）：
       *      ③ 鼠标【不用按键】在轨道上移动，pointermove 照样改 t（幽灵拖动）
       *      ④ 光标扫到右端 → t ≥ 阈值 → 下一次点一下松手就误触发解锁
       *         → 把手冲到最右、整条滑条淡出 =「不管拖到哪松手都弹到最右」
       */
      function endDrag(ev) {
        if (!dragging) return;
        // 只认当初按下的那根指针（别的指头抬起不该结束本次拖动）
        if (ev && dragId != null && ev.pointerId != null && ev.pointerId !== dragId) return;
        dragging = false;
        dragId = null;
        if (o.onDragEnd) o.onDragEnd();
        emit(t, true);
      }

      /* 拖动中的移动也放 window 上：这样即使指针滑到轨道外面，
         滑条也照样跟着走（不依赖 setPointerCapture 是否生效）。 */
      window.addEventListener("pointermove", function (ev) {
        if (!dragging || fired) return;
        // 🔴 已经没有按键按着了 → 这不是拖动，是上一轮没收尾留下的悬空状态，就地收掉。
        //    没有这道闸，幽灵拖动就会一直存在。
        if (ev.buttons === 0) { endDrag(ev); return; }
        emit(ratioFromX(ev.clientX) - dragOffset, false);
      }, true);

      window.addEventListener("pointerup", endDrag, true);
      window.addEventListener("pointercancel", endDrag, true);
      emit(0, false);
    }

    return {
      get value() { return t; },
      get unlocked() { return fired; },
      set: function (v) { emit(Math.max(0, Math.min(1, v)), false); },
      reset: function () { fired = false; emit(0, false); },
    };
  }

  return { renderMosaic: renderMosaic, SliderBoot: SliderBoot };
})();
