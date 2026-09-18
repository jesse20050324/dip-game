(() => {
  const N = 24;
  const MIN_GAP = 10;
  const BLACK = "#2b241c";
  const WHITE = "#f4efe4";
  const FOG = "#9b8bb0";

  const SCENE = {
    path: "#eddfc6",
    ground: "#c4785a",
    mountain: "#6b8f71",
    sky: "#7ba7c9",
    sun: "#e8b84a",
  };

  const COLOR_LEGEND = [
    { color: SCENE.path, gray: 36 },
    { color: SCENE.ground, gray: 88 },
    { color: SCENE.mountain, gray: 142 },
    { color: SCENE.sky, gray: 210 },
    { color: SCENE.sun, gray: 248 },
  ];

  const srcCanvas = document.getElementById("srcCanvas");
  const dstCanvas = document.getElementById("dstCanvas");
  const histCanvas = document.getElementById("histCanvas");
  const bandsEl = document.getElementById("bands");
  const handlesEl = document.getElementById("handles");
  const hintEl = document.getElementById("hint");
  const statusEl = document.getElementById("status");
  const probeEl = document.getElementById("probe");
  const nextBtn = document.getElementById("next");
  const trayEl = document.getElementById("tray");
  const chipsEl = document.getElementById("chips");
  const showNumbersEl = document.getElementById("showNumbers");

  const state = {
    beat: 0,
    gray: [],
    cuts: [],
    colors: [],
    showNumbers: false,
    dragging: false,
    selectedBand: null,
    suppressClick: false,
    hoverGray: null,
  };

  function grid(fill) {
    return Array.from({ length: N }, () => Array(N).fill(fill));
  }

  function stampDisk(mask, cx, cy, r, value = 1) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) mask[y][x] = value;
      }
    }
  }

  function stampLine(mask, x0, y0, x1, y1, thickness) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      stampDisk(
        mask,
        x0 + (x1 - x0) * t,
        y0 + (y1 - y0) * t,
        thickness,
        1
      );
    }
  }

  function stampFinder(mask, x, y, size = 5) {
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const edge = i === 0 || j === 0 || i === size - 1 || j === size - 1;
        const core = i >= 2 && i <= size - 3 && j >= 2 && j <= size - 3;
        if (edge || core) mask[y + j][x + i] = 1;
      }
    }
  }

  function letterMask() {
    const m = grid(0);
    stampLine(m, 7, 19, 11, 5, 1.55);
    stampLine(m, 17, 19, 13, 5, 1.55);
    stampLine(m, 8.5, 13, 15.5, 13, 1.2);
    stampFinder(m, 0, 0);
    stampFinder(m, N - 5, 0);
    stampFinder(m, 0, N - 5);
    return m;
  }

  function paintByMask(mask, bg, fg) {
    const g = grid(bg);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (mask[y][x]) g[y][x] = fg;
      }
    }
    return g;
  }

  function addFog(gray, letter, fogGray) {
    const fog = grid(0);
    stampDisk(fog, 16.5, 8, 3.2, 1);
    stampDisk(fog, 18, 15, 2.6, 1);
    stampDisk(fog, 7, 9, 2.4, 1);
    stampDisk(fog, 14, 18.5, 2.2, 1);
    const out = gray.map((row) => row.slice());
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (fog[y][x] && !letter[y][x]) out[y][x] = fogGray;
      }
    }
    return out;
  }

  function landscape() {
    const g = grid(0);
    const GRAY = {
      sky: 210,
      sun: 248,
      mountain: 142,
      ground: 88,
      path: 36,
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let tone = GRAY.sky;
        const mountain =
          y > 8 &&
          y < 17 &&
          Math.abs(x - 10) < (y - 6) * 0.95;
        const mountain2 =
          y > 10 &&
          y < 17 &&
          Math.abs(x - 16) < (y - 8) * 0.85;
        if (y >= 16) tone = GRAY.ground;
        if (mountain || mountain2) tone = GRAY.mountain;
        if (Math.abs(x - 12) <= 1 && y >= 14) tone = GRAY.path;
        if ((x - 18.5) ** 2 + (y - 4.5) ** 2 <= 3.4 ** 2) tone = GRAY.sun;
        g[y][x] = tone;
      }
    }
    return g;
  }

  function histogram(gray) {
    const bins = new Array(256).fill(0);
    for (const row of gray) {
      for (const v of row) bins[v] += 1;
    }
    return bins;
  }

  function colorAt(gray, cuts, colors) {
    const ordered = cuts.slice().sort((a, b) => a - b);
    let i = 0;
    while (i < ordered.length && gray >= ordered[i]) i += 1;
    return colors[i];
  }

  function hexToRgb(hex) {
    const n = hex.replace("#", "");
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
    ];
  }

  function grayHex(v) {
    const h = v.toString(16).padStart(2, "0");
    return `#${h}${h}${h}`;
  }

  function grayForColor(hex) {
    const found = COLOR_LEGEND.find(
      (item) => item.color.toLowerCase() === hex.toLowerCase()
    );
    return found ? found.gray : null;
  }

  function inkOn(hex) {
    const [r, g, b] = hexToRgb(hex);
    return 0.3 * r + 0.59 * g + 0.11 * b > 140 ? "#3b3128" : "#f7efe1";
  }

  function drawGrid(canvas, colorOf, gray) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const gap = 2;
    const cell = (w - gap * (N + 1)) / N;
    ctx.clearRect(0, 0, w, w);
    ctx.fillStyle = "#e4d5b8";
    ctx.fillRect(0, 0, w, w);
    ctx.font = "9px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const px = gap + x * (cell + gap);
        const py = gap + y * (cell + gap);
        const hex = colorOf(x, y);
        ctx.fillStyle = hex;
        ctx.fillRect(px, py, cell, cell);
        if (state.showNumbers && canvas === srcCanvas) {
          ctx.fillStyle = inkOn(hex);
          ctx.fillText(String(gray[y][x]), px + cell / 2, py + cell / 2);
        }
      }
    }
  }

  function drawHist(gray, cuts) {
    const ctx = histCanvas.getContext("2d");
    const w = histCanvas.width;
    const h = histCanvas.height;
    const bins = histogram(gray);
    const max = Math.max(...bins, 1);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f7efe1";
    ctx.fillRect(0, 0, w, h);
    for (let g = 0; g < 256; g++) {
      if (!bins[g]) continue;
      const x = (g / 255) * w;
      const bh = (bins[g] / max) * (h - 10);
      ctx.fillStyle = "#c45c26";
      ctx.globalAlpha = 0.72;
      ctx.fillRect(x - 2, h - bh, 5, bh);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "#d7c4a6";
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();
    for (const cut of cuts) {
      const x = (cut / 255) * w + 0.5;
      ctx.strokeStyle = "#3b3128";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#3b3128";
    ctx.font = "11px Segoe UI, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let g = 0; g < 256; g++) {
      if (!bins[g]) continue;
      const x = (g / 255) * w;
      const bh = (bins[g] / max) * (h - 10);
      ctx.fillText(String(g), x, Math.max(14, h - bh - 2));
    }
  }

  function edges() {
    return [0, ...state.cuts, 256];
  }

  function bandWidths() {
    const e = edges();
    return e.slice(1).map((hi, i) => hi - e[i]);
  }

  function beat() {
    return BEATS[state.beat];
  }

  function isWon() {
    const spec = beat();
    const okCuts = spec.cutWindows.every(
      (win, i) => state.cuts[i] >= win[0] && state.cuts[i] <= win[1]
    );
    if (!okCuts) return false;
    if (!spec.matchColors) return true;
    return spec.targetColors.every(
      (c, i) => state.colors[i].toLowerCase() === c.toLowerCase()
    );
  }

  function syncStatus() {
    const won = isWon();
    state.won = won;
    statusEl.classList.toggle("ok", won);
    if (won) {
      statusEl.textContent = beat().winText;
      nextBtn.disabled = state.beat >= BEATS.length - 1;
      nextBtn.classList.toggle("ready", state.beat < BEATS.length - 1);
      if (state.beat >= BEATS.length - 1) {
        nextBtn.textContent = "做完了";
        nextBtn.disabled = true;
        nextBtn.classList.remove("ready");
      }
    } else {
      statusEl.textContent = beat().idleText;
      nextBtn.disabled = true;
      nextBtn.classList.remove("ready");
      nextBtn.textContent = "下一拍";
    }
  }

  function renderAxis() {
    const widths = bandWidths();
    const total = widths.reduce((a, b) => a + b, 0);
    bandsEl.innerHTML = "";
    state.colors.forEach((color, i) => {
      const band = document.createElement("button");
      band.type = "button";
      band.className = "band";
      band.style.flex = String(widths[i]);
      band.style.background = color;
      band.dataset.index = String(i);
      band.title = `这段现在切到灰度 ${edges()[i]}–${edges()[i + 1] - 1}`;
      if (beat().matchColors) {
        const mapped = grayForColor(color);
        if (mapped != null) {
          band.textContent = String(mapped);
          band.style.color = inkOn(color);
        }
        if (state.selectedBand === i) band.classList.add("selected");
        band.addEventListener("pointerdown", (ev) => startSwap(ev, i));
        band.addEventListener("click", (ev) => onBandClick(ev, i));
      }
      bandsEl.appendChild(band);
    });
    void total;
    handlesEl.innerHTML = "";
    state.cuts.forEach((cut, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "handle";
      btn.style.left = `${(cut / 255) * 100}%`;
      btn.innerHTML = "<span></span>";
      btn.setAttribute("aria-label", `切割点 ${i + 1}，灰度 ${cut}`);
      btn.addEventListener("pointerdown", (ev) => startCut(ev, i));
      btn.addEventListener("mousedown", (ev) => startCut(ev, i));
      handlesEl.appendChild(btn);
    });
  }

  function render() {
    const gray = state.gray;
    drawGrid(srcCanvas, (x, y) => grayHex(gray[y][x]), gray);
    drawGrid(
      dstCanvas,
      (x, y) => colorAt(gray[y][x], state.cuts, state.colors),
      gray
    );
    drawHist(gray, state.cuts);
    renderAxis();
    renderLegend();
    syncStatus();
  }

  function renderLegend() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    if (!beat().matchColors) return;
    COLOR_LEGEND.forEach((item) => {
      const row = document.createElement("div");
      row.className = "legend-item";
      if (state.hoverGray === item.gray) row.classList.add("hot");
      row.dataset.gray = String(item.gray);
      row.innerHTML = `
        <span class="swatch" style="background:${grayHex(item.gray)}"></span>
        <span class="legend-num">${item.gray}</span>
        <span class="legend-to">涂成</span>
        <span class="swatch" style="background:${item.color}"></span>
      `;
      chipsEl.appendChild(row);
    });
  }

  function clampCut(i, value) {
    const lo = i === 0 ? MIN_GAP : state.cuts[i - 1] + MIN_GAP;
    const hi =
      i === state.cuts.length - 1
        ? 255 - MIN_GAP
        : state.cuts[i + 1] - MIN_GAP;
    return Math.max(lo, Math.min(hi, Math.round(value)));
  }

  function grayFromClientX(clientX) {
    const rect = histCanvas.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(255, t * 255));
  }

  function startCut(ev, index) {
    if (state.dragging) return;
    if (ev.type === "mousedown" && ev.button !== 0) return;
    ev.preventDefault();
    state.dragging = true;
    const move = (e) => {
      state.cuts[index] = clampCut(index, grayFromClientX(e.clientX));
      render();
    };
    const up = () => {
      state.dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
    move(ev);
  }

  function swapColors(i, j) {
    if (i === j) return;
    const tmp = state.colors[i];
    state.colors[i] = state.colors[j];
    state.colors[j] = tmp;
    state.selectedBand = null;
  }

  function onBandClick(ev, index) {
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    ev.preventDefault();
    if (state.selectedBand == null) state.selectedBand = index;
    else if (state.selectedBand === index) state.selectedBand = null;
    else swapColors(state.selectedBand, index);
    render();
  }

  function startSwap(ev, index) {
    if (state.dragging) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    const startX = ev.clientX;
    const startY = ev.clientY;
    let moved = false;
    state.dragging = true;
    const ghost = document.createElement("div");
    ghost.className = "chip";
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "30";
    ghost.style.background = state.colors[index];
    ghost.style.opacity = "0";
    document.body.appendChild(ghost);
    const moveGhost = (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) {
        moved = true;
        ghost.style.opacity = "1";
      }
      ghost.style.left = `${e.clientX - 20}px`;
      ghost.style.top = `${e.clientY - 20}px`;
    };
    const up = (e) => {
      state.dragging = false;
      window.removeEventListener("pointermove", moveGhost);
      window.removeEventListener("pointerup", up);
      ghost.remove();
      if (!moved) return;
      state.suppressClick = true;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const band = target && target.closest ? target.closest(".band") : null;
      if (!band) return;
      const j = Number(band.dataset.index);
      if (Number.isNaN(j)) return;
      swapColors(index, j);
      render();
    };
    window.addEventListener("pointermove", moveGhost);
    window.addEventListener("pointerup", up);
  }

  function cellFromEvent(canvas, ev) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const px = (ev.clientX - rect.left) * scale;
    const py = (ev.clientY - rect.top) * scale;
    const gap = 2;
    const cell = (canvas.width - gap * (N + 1)) / N;
    const x = Math.floor((px - gap) / (cell + gap));
    const y = Math.floor((py - gap) / (cell + gap));
    if (x < 0 || y < 0 || x >= N || y >= N) return null;
    return { x, y };
  }

  function bindProbe(canvas) {
    canvas.addEventListener("pointermove", (ev) => {
      const cell = cellFromEvent(canvas, ev);
      if (!cell) return;
      const g = state.gray[cell.y][cell.x];
      const mapped = COLOR_LEGEND.find((item) => item.gray === g);
      probeEl.textContent = mapped
        ? `这一格灰度 ${g}，应对右边那种颜色`
        : `这一格灰度 ${g}`;
      if (state.hoverGray !== g) {
        state.hoverGray = g;
        renderLegend();
      }
    });
    canvas.addEventListener("pointerleave", () => {
      probeEl.textContent = "悬停格子看灰度";
      state.hoverGray = null;
      renderLegend();
    });
  }

  function loadBeat(index) {
    state.beat = index;
    const spec = BEATS[index];
    state.gray = spec.makeGray();
    state.cuts = spec.startCuts.slice();
    state.colors = spec.startColors.slice();
    state.won = false;
    hintEl.textContent = spec.hint;
    trayEl.hidden = !spec.matchColors;
    trayEl.setAttribute("aria-hidden", spec.matchColors ? "false" : "true");
    state.selectedBand = null;
    document.querySelectorAll(".beat-dot").forEach((btn) => {
      const on = Number(btn.dataset.beat) === index;
      if (on) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    render();
  }

  const maskA = letterMask();

  const BEATS = [
    {
      hint: "右边几乎是一片色。拖动那把刀，把它放在两座尖峰中间，字母就会从黑白里走出来。",
      idleText: "刀还没切在空档里。试试对着尖峰中间拖。",
      winText: "符号出来了。这一刀把灰图切成了两段。",
      makeGray: () => paintByMask(maskA, 48, 204),
      startCuts: [18],
      startColors: [BLACK, WHITE],
      cutWindows: [[70, 180]],
      matchColors: false,
    },
    {
      hint: "现在多了一层雾。一把刀会把雾和字母切到一起。用两把刀夹住字母：小于左边的当背景，大于右边的当符号。",
      idleText: "两把刀要分别落在三座峰之间的空档。",
      winText: "雾留在中间，字母单独出来了。两把刀就是双阈值。",
      makeGray: () => addFog(paintByMask(maskA, 36, 220), maskA, 112),
      startCuts: [22, 236],
      startColors: [BLACK, FOG, WHITE],
      cutWindows: [
        [50, 95],
        [140, 200],
      ],
      matchColors: false,
    },
    {
      hint: "轴上的颜色放错了。先看对照表：每种颜色绑一种灰度。把颜色放到轴上能包住这个灰度的那一段，再把刀插进尖峰中间。",
      idleText: "颜色还没放到对应灰度的那段，或刀还没落在空档里。",
      winText: "假彩色对上了。同一条轴，只是切得更细、每段换了颜色。",
      makeGray: landscape,
      startCuts: [28, 48, 68, 88],
      startColors: [
        SCENE.sun,
        SCENE.path,
        SCENE.sky,
        SCENE.ground,
        SCENE.mountain,
      ],
      targetColors: [
        SCENE.path,
        SCENE.ground,
        SCENE.mountain,
        SCENE.sky,
        SCENE.sun,
      ],
      cutWindows: [
        [48, 78],
        [100, 130],
        [160, 192],
        [220, 244],
      ],
      matchColors: true,
    },
  ];

  document.querySelectorAll(".beat-dot").forEach((btn) => {
    btn.addEventListener("click", () => loadBeat(Number(btn.dataset.beat)));
  });
  nextBtn.addEventListener("click", () => {
    if (state.beat < BEATS.length - 1 && state.won) loadBeat(state.beat + 1);
  });
  showNumbersEl.addEventListener("change", () => {
    state.showNumbers = showNumbersEl.checked;
    render();
  });
  bindProbe(srcCanvas);
  bindProbe(dstCanvas);

  histCanvas.addEventListener("pointerdown", (ev) => {
    const g = grayFromClientX(ev.clientX);
    let best = 0;
    let dist = Infinity;
    state.cuts.forEach((c, i) => {
      const d = Math.abs(c - g);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    startCut(ev, best);
  });

  loadBeat(0);
  window.__threshold = {
    setCuts(cuts) {
      state.cuts = cuts.slice();
      render();
      return { won: state.won, cuts: state.cuts.slice() };
    },
    setColors(colors) {
      state.colors = colors.slice();
      render();
      return { won: state.won, colors: state.colors.slice() };
    },
    get() {
      return {
        beat: state.beat,
        cuts: state.cuts.slice(),
        colors: state.colors.slice(),
        won: state.won,
        selectedBand: state.selectedBand,
      };
    },
  };
})();
