(() => {
  const MIN_GAP = 10;
  const DARK = "#2b241c";
  const LIGHT = "#f4efe4";

  const PAL = {
    red: "#c94f3d",
    blue: "#3d5a99",
    yellow: "#e8b84a",
    white: "#f4efe4",
    path: "#eddfc6",
    ground: "#c4785a",
    mountain: "#6b8f71",
    sky: "#7ba7c9",
    sun: "#e8b84a",
    dark: "#2b241c",
  };

  // ---------- 基础工具 ----------

  function makeGrid(n, fill) {
    return Array.from({ length: n }, () => Array(n).fill(fill));
  }

  function fillRect(g, r0, c0, h, w, v) {
    for (let y = r0; y < r0 + h; y++) {
      for (let x = c0; x < c0 + w; x++) g[y][x] = v;
    }
  }

  function grayHex(v) {
    const h = Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
    return `#${h}${h}${h}`;
  }

  function hexRgb(hex) {
    const h = hex.slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  let blitCanvas = null;

  // ---------- 图章工具（24×24 用） ----------

  function stampDisk(mask, cx, cy, r, value = 1) {
    const n = mask.length;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) mask[y][x] = value;
      }
    }
  }


  // ---------- 各关图像（程序生成） ----------

  function mushroomTarget() {
    const BG = 230;
    const CAP = 70;
    const ST = 150;
    return [
      [BG, BG, CAP, CAP, BG],
      [BG, CAP, CAP, CAP, CAP],
      [CAP, CAP, CAP, CAP, CAP],
      [BG, BG, ST, BG, BG],
      [BG, BG, ST, BG, BG],
    ];
  }

  function mushroomSource() {
    const g = mushroomTarget().map((r) => r.slice());
    g[0][2] = 235; // 帽子上的白洞
    g[2][0] = 235; // 帽子上的白洞
    g[3][3] = 40; // 背景里的黑点
    return g;
  }

  function mondrianGray() {
    const g = makeGrid(16, 235);
    fillRect(g, 0, 10, 7, 6, 40); // 红块区
    fillRect(g, 10, 0, 6, 6, 100); // 蓝块区
    fillRect(g, 12, 12, 4, 4, 170); // 黄块区
    fillRect(g, 1, 1, 2, 2, 170); // 小黄块
    return g;
  }

  function mondrianTarget() {
    const g = makeGrid(16, PAL.white);
    fillRect(g, 0, 10, 7, 6, PAL.red);
    fillRect(g, 10, 0, 6, 6, PAL.blue);
    fillRect(g, 12, 12, 4, 4, PAL.yellow);
    fillRect(g, 1, 1, 2, 2, PAL.yellow);
    return g;
  }

  // 复刻蒙德里安《红、黄、蓝的构成》（20 行 × 19 列）
  // white 用 220 而非 240、line 用 40 而非 25：与映射色 #F5F5F5 / #141414 拉开差距，
  // 拖色块进区间时有可见反馈；黄块藏灰跟随 MOND.white，依然隐形
  const MOND = { line: 40, red: 70, blue: 120, yellow: 180, white: 220 };
  // 第 4 关专用配色（目标图与托盘必须用同一份，否则判定过不了）
  const MONDC = {
    line: "#141414",
    red: "#c82828",
    blue: "#0f478c",
    yellow: "#fcd200",
    white: "#f5f5f5",
  };

  function mondrianClassicBase(fillValue) {
    // 20 行 × 19 列（去掉最左列，接近原画比例）
    const g = Array.from({ length: 20 }, () => Array(19).fill(fillValue("white")));
    fillRect(g, 0, 4, 20, 1, fillValue("line")); // 贯通竖线 x=4
    fillRect(g, 14, 0, 1, 19, fillValue("line")); // 贯通横线 y=14
    fillRect(g, 5, 0, 1, 5, fillValue("line")); // 左侧短横 y=5, x=0–4
    fillRect(g, 14, 17, 6, 1, fillValue("line")); // 右下短竖 x=17, y=14–19
    fillRect(g, 17, 17, 1, 2, fillValue("line")); // 黄块上短横 y=17, x=17–18
    fillRect(g, 0, 5, 14, 14, fillValue("red")); // 大红块（通到右边缘）
    fillRect(g, 15, 0, 5, 4, fillValue("blue")); // 左下蓝块
    fillRect(g, 18, 18, 2, 1, fillValue("yellow")); // 右下黄块（2 格）
    return g;
  }

  function mondrianClassicGray() {
    const g = mondrianClassicBase((role) => MOND[role]);
    g[18][18] = MOND.white; // 黄块藏进背景灰度，灰度图里隐形
    g[19][18] = MOND.white;
    return g;
  }

  function mondrianClassicTarget() {
    return mondrianClassicBase((role) => MONDC[role]);
  }

  function ringsGray() {
    const n = 24;
    const c = 11.5;
    const g = makeGrid(n, 0);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const d = Math.hypot(x - c, y - c);
        const ring = Math.min(9, Math.floor(d / 1.63));
        g[y][x] = 25 + ring * 25;
      }
    }
    return g;
  }

  function ringsTarget() {
    const n = 24;
    const c = 11.5;
    const g = makeGrid(n, DARK);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (Math.hypot(x - c, y - c) < 8.15) g[y][x] = LIGHT;
      }
    }
    return g;
  }

  function stampLine(mask, x0, y0, x1, y1, thickness) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      stampDisk(mask, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness, 1);
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

  // 符号「A」识别图（显现关用）
  function letterMask() {
    const m = makeGrid(24, 0);
    stampLine(m, 7, 19, 11, 5, 1.55);
    stampLine(m, 17, 19, 13, 5, 1.55);
    stampLine(m, 8.5, 13, 15.5, 13, 1.2);
    stampFinder(m, 0, 0);
    stampFinder(m, 19, 0);
    stampFinder(m, 0, 19);
    return m;
  }

  // 显现关：无左图，颜色预设好，玩家拖边界让符号「A」浮现。
  // A 灰度 112、背景 220，初始边界在 40（A 与背景同段、画面空白）；
  // 边界拖进 (112, 220) 即过——容差天然就宽，拖对了符号清晰可辨。
  function revealGray() {
    const mask = letterMask();
    return mask.map((row) => row.map((v) => (v ? 112 : 220)));
  }

  function revealTarget() {
    const mask = letterMask();
    return mask.map((row) => row.map((v) => (v ? DARK : LIGHT)));
  }

  // 第 6 关「雾中爱心」：三层灰度——雾 36、爱心 112、背景 220。
  // 主体灰度故意夹在雾和背景中间：单边界怎么放都无解，必须双边界夹出主体；
  // 托盘只有 2 色，雾必须涂成和背景一样的淡色（雾属于背景）。
  function heartMask() {
    const m = makeGrid(24, 0);
    stampDisk(m, 8, 8, 3.6); // 左圆肩
    stampDisk(m, 16, 8, 3.6); // 右圆肩
    // 下三角：显式指定每行宽度，保证逐行递减（公式取整会出现相邻两行同宽）；
    // 斜边整体加厚 1 格（每行 +2 宽），心尖 1 格不变
    const ROW_W = [17, 17, 17, 15, 13, 11, 9, 7, 5, 3, 1];
    ROW_W.forEach((w, i) => {
      const y = 8 + i;
      const x0 = 12 - (w - 1) / 2;
      for (let x = x0; x < x0 + w; x++) m[y][x] = 1;
    });
    return m;
  }

  function heartGray() {
    const mask = heartMask();
    const g = makeGrid(24, 220); // 背景
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        if (mask[y][x]) g[y][x] = 112; // 爱心（灰度夹在雾和背景中间）
      }
    }
    const fog = makeGrid(24, 0);
    stampDisk(fog, 16.5, 8, 3.2);
    stampDisk(fog, 18, 15, 2.6);
    stampDisk(fog, 7, 9, 2.4);
    stampDisk(fog, 14, 18.5, 2.2);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        if (fog[y][x] && !mask[y][x]) g[y][x] = 36; // 雾只浮在背景上
      }
    }
    return g;
  }

  function heartTarget() {
    const mask = heartMask();
    return mask.map((row) => row.map((v) => (v ? PAL.red : PAL.white))); // 红心 + 淡色底
  }

  function landscapeGray() {
    const n = 24;
    const g = makeGrid(n, 0);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let tone = 210; // 天
        const m1 = y > 8 && y < 17 && Math.abs(x - 10) < (y - 6) * 0.95;
        const m2 = y > 10 && y < 17 && Math.abs(x - 16) < (y - 8) * 0.85;
        if (y >= 16) tone = 88; // 地
        if (m1 || m2) tone = 142; // 山
        if (Math.abs(x - 12) <= 1 && y >= 14) tone = 36; // 路
        if ((x - 18.5) ** 2 + (y - 4.5) ** 2 <= 3.4 ** 2) tone = 248; // 日
        g[y][x] = tone;
      }
    }
    return g;
  }

  const LAND_COLOR = {
    36: PAL.path,
    88: PAL.ground,
    142: PAL.mountain,
    210: PAL.sky,
    248: PAL.sun,
  };

  function landscapeTarget() {
    return landscapeGray().map((row) => row.map((v) => LAND_COLOR[v]));
  }

  // 删太阳关：目标 = 没有太阳的风景。太阳灰度 248，把天空/太阳边界拖过 248
  // （挤出轴外），太阳并入天空色即「删除」——关 6「雾属于背景」的主动运用。
  function landscapeNoSunTarget() {
    return landscapeGray().map((row) =>
      row.map((v) => (v === 248 ? PAL.sky : LAND_COLOR[v]))
    );
  }

  // ---------- 关卡配置 ----------

  const LEVELS = [
    {
      size: 1,
      mode: "slider",
      judge: "release",
      tolerance: 12,
      targetIsColor: false,
      target: [[96]],
      source: [[220]],
    },
    {
      size: 5,
      mode: "slider",
      judge: "button",
      tolerance: 12,
      targetIsColor: false,
      target: mushroomTarget(),
      source: mushroomSource(),
      initialSelect: { x: 2, y: 0 },
    },
    {
      size: 16,
      mode: "regions",
      movable: false,
      boundaries: [70, 135, 200],
      tray: [PAL.red, PAL.blue, PAL.yellow, PAL.white],
      judge: "button",
      targetIsColor: true,
      target: mondrianTarget(),
      source: mondrianGray(),
      prefill: [[3, PAL.white]], // 背景奶白预涂好：首次接触映射轴，留一个样本防看不懂
    },
    {
      size: 20,
      mode: "regions",
      movable: false,
      adjustable: true,
      boundaries: [47, 95, 150, 210],
      tray: [MONDC.line, MONDC.red, MONDC.blue, MONDC.yellow, MONDC.white],
      judge: "button",
      targetIsColor: true,
      target: mondrianClassicTarget(),
      source: mondrianClassicGray(),
      initialSelect: { x: 10, y: 7 },
    },
    {
      size: 24,
      mode: "regions",
      movable: true,
      boundaries: [60],
      tray: [DARK, LIGHT],
      judge: "button",
      targetIsColor: true,
      target: ringsTarget(),
      source: ringsGray(),
    },
    {
      // 显现关：没有左图，颜色已预设，拖边界让符号「A」浮现
      size: 24,
      mode: "regions",
      movable: true,
      reveal: true,
      boundaries: [40],
      prefill: [[0, DARK], [1, LIGHT]],
      judge: "button",
      targetIsColor: true,
      target: revealTarget(),
      source: revealGray(),
    },
    {
      size: 24,
      mode: "regions",
      movable: true,
      boundaries: [20, 240],
      tray: [PAL.white, PAL.red],
      judge: "button",
      targetIsColor: true,
      target: heartTarget(),
      source: heartGray(),
    },
    {
      size: 24,
      mode: "regions",
      movable: true,
      boundaries: [30, 60, 100, 130],
      tray: [PAL.path, PAL.ground, PAL.mountain, PAL.sky, PAL.sun],
      judge: "button",
      targetIsColor: true,
      target: landscapeTarget(),
      source: landscapeGray(),
    },
    {
      // 删太阳关：左图是没有太阳的风景。⭐预设的是滑块位置（已在正确处），
      // 颜色不预填——玩家涂完色能看到太阳，才发现复刻不了，
      // 才会去想「怎么把一个元素删掉」（把天空/太阳边界拖出轴右端）
      size: 24,
      mode: "regions",
      movable: true,
      boundaries: [40, 110, 170, 230],
      tray: [PAL.path, PAL.ground, PAL.mountain, PAL.sky, PAL.sun],
      judge: "button",
      targetIsColor: true,
      target: landscapeNoSunTarget(),
      source: landscapeGray(),
    },
    {
      size: 64,
      mode: "regions",
      movable: true,
      seamless: true,
      boundaries: [20, 120, 185],
      tray: [PhotoArt.C.ink, PhotoArt.C.letterhead, PhotoArt.C.cream],
      prefill: [[3, PhotoArt.C.cream]],
      lockedRegions: [3],
      judge: "button",
      targetIsColor: true,
      prompt: "Oh damn, the ink.",
      leftDisplay: PhotoArt.letterStained(),
      target: PhotoArt.letterTarget(),
      source: PhotoArt.letterGray(),
    },
    {
      size: 64,
      mode: "regions",
      movable: true,
      seamless: true,
      boundaries: [20, 80, 200, 240],
      tray: [PhotoArt.C.white, PhotoArt.C.hair, PhotoArt.C.clothes, PhotoArt.C.skin],
      judge: "button",
      targetIsColor: true,
      prompt: "Just her.",
      leftDisplay: PhotoArt.personBrought(),
      target: PhotoArt.personTarget(),
      source: PhotoArt.personGray(),
    },
    {
      size: 64,
      mode: "regions",
      movable: true,
      seamless: true,
      boundaries: [80, 145, 210],
      tray: [PhotoArt.C.ground, PhotoArt.C.mountain],
      prefill: [[2, PhotoArt.C.sky]],
      lockedRegions: [2],
      judge: "button",
      targetIsColor: true,
      prompt: "Who watermarks this?",
      leftDisplay: PhotoArt.landscapeStamped(),
      target: PhotoArt.landscapeTarget(),
      source: PhotoArt.landscapeStampGray(),
    },
    {
      size: 64,
      mode: "regions",
      movable: true,
      seamless: true,
      boundaries: [25, 70, 200, 245],
      tray: [
        PhotoArt.C.ground,
        PhotoArt.C.person,
        PhotoArt.C.wall,
        PhotoArt.C.sky,
        PhotoArt.C.collar,
      ],
      judge: "button",
      targetIsColor: true,
      prompt: "A faded old photo.",
      leftDisplay: PhotoArt.portraitFaded(),
      target: PhotoArt.portraitVivid(),
      source: PhotoArt.portraitGray(),
    },
  ];

  // ---------- DOM ----------

  const targetCanvas = document.getElementById("targetCanvas");
  const workCanvas = document.getElementById("workCanvas");
  const workBoard = document.getElementById("workBoard");
  const grayBar = document.getElementById("grayBar");
  const mapBar = document.getElementById("mapBar");
  const handlesLayer = document.getElementById("handlesLayer");
  const axisMarker = document.getElementById("axisMarker");
  const trayEl = document.getElementById("tray");
  const confirmBtn = document.getElementById("confirm");
  const resetBtn = document.getElementById("reset");
  const beatsEl = document.getElementById("beats");
  const sceneEl = document.getElementById("scene");

  // ---------- 状态 ----------

  let levelIndex = 0;
  let level = null;
  let grays = [];
  let boundaries = [];
  let regionColors = [];
  let selected = null;
  let sliderValue = 128;
  let selectedChip = null;
  let dragging = false;
  let showContours = false;
  let markerTimer = null;
  let answerRevealed = false;

  // ---------- 渲染 ----------

  function gridLayout(canvas, rows, cols) {
    const w = canvas.width;
    const gap = level.seamless ? 0 : rows <= 5 ? 8 : 2;
    const raw = Math.min(
      (w - gap * (cols + 1)) / cols,
      (w - gap * (rows + 1)) / rows
    );
    let cell = Math.max(1, Math.floor(raw));
    if (level.seamless && rows !== cols) {
      const n = 64;
      const squareCell = Math.max(1, Math.floor((w - gap * (n + 1)) / n));
      const inset = Math.floor((w - (n * (squareCell + gap) + gap)) / 2);
      cell = Math.max(
        1,
        Math.min(
          (w - inset * 2 - gap * (cols + 1)) / cols,
          (w - inset * 2 - gap * (rows + 1)) / rows
        )
      );
    }
    const destW = Math.round(cols * cell);
    const destH = Math.round(rows * cell);
    const ox = Math.floor((w - (level.seamless ? destW : cols * (cell + gap) + gap)) / 2);
    const oy = Math.floor((w - (level.seamless ? destH : rows * (cell + gap) + gap)) / 2);
    return { gap, cell, ox, oy, destW, destH };
  }

  function drawGrid(canvas, rows, cols, colorOf, selectedCell, contourGrid) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const { gap, cell, ox, oy, destW, destH } = gridLayout(canvas, rows, cols);
    ctx.clearRect(0, 0, w, w);
    ctx.fillStyle = "#e4d5b8";
    ctx.fillRect(0, 0, w, w);
    const sx = destW / cols;
    const sy = destH / rows;
    if (level.seamless) {
      if (!blitCanvas || blitCanvas.width !== cols || blitCanvas.height !== rows) {
        blitCanvas = document.createElement("canvas");
        blitCanvas.width = cols;
        blitCanvas.height = rows;
      }
      const bctx = blitCanvas.getContext("2d");
      const img = bctx.createImageData(cols, rows);
      const data = img.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const [r, g, b] = hexRgb(colorOf(x, y));
          const i = (y * cols + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(blitCanvas, 0, 0, cols, rows, ox, oy, destW, destH);
    } else {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = ox + gap + x * (cell + gap);
          const py = oy + gap + y * (cell + gap);
          ctx.fillStyle = colorOf(x, y);
          ctx.fillRect(px, py, cell, cell);
        }
      }
    }
    if (selectedCell) {
      const px = ox + gap + selectedCell.x * (level.seamless ? sx : cell + gap);
      const py = oy + gap + selectedCell.y * (level.seamless ? sy : cell + gap);
      const cw = level.seamless ? sx : cell;
      const ch = level.seamless ? sy : cell;
      ctx.strokeStyle = "#c45c26";
      ctx.lineWidth = 4;
      ctx.strokeRect(px + 2, py + 2, cw - 4, ch - 4);
    }
    if (contourGrid) {
      ctx.strokeStyle = "rgba(59, 49, 40, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = ox + gap + x * (level.seamless ? sx : cell + gap);
          const py = oy + gap + y * (level.seamless ? sy : cell + gap);
          const cw = level.seamless ? sx : cell;
          const ch = level.seamless ? sy : cell;
          if (x + 1 < cols && contourGrid[y][x + 1] !== contourGrid[y][x]) {
            ctx.moveTo(px + cw + gap / 2, py);
            ctx.lineTo(px + cw + gap / 2, py + ch);
          }
          if (y + 1 < rows && contourGrid[y + 1][x] !== contourGrid[y][x]) {
            ctx.moveTo(px, py + ch + gap / 2);
            ctx.lineTo(px + cw, py + ch + gap / 2);
          }
        }
      }
      ctx.stroke();
    }
  }

  function regionIndex(gray) {
    let i = 0;
    while (i < boundaries.length && gray >= boundaries[i]) i += 1;
    return i;
  }

  function displayHex(x, y) {
    const g = grays[y][x];
    if (level.mode === "slider") return grayHex(g);
    return regionColors[regionIndex(g)] || grayHex(g);
  }

  function renderBoards() {
    const rows = level.target.length;
    const cols = level.target[0].length;
    if (level.reveal) {
      // 显现关没有左图：画个「?」占位，目标要玩家自己拖出来
      const ctx = targetCanvas.getContext("2d");
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.fillStyle = "#e4d5b8";
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.fillStyle = "rgba(59, 49, 40, 0.35)";
      ctx.font = `${targetCanvas.width * 0.4}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", targetCanvas.width / 2, targetCanvas.height / 2);
    } else {
      const left =
        answerRevealed || !level.leftDisplay ? level.target : level.leftDisplay;
      drawGrid(targetCanvas, rows, cols, (x, y) =>
        level.targetIsColor ? left[y][x] : grayHex(left[y][x])
      );
    }
    drawGrid(
      workCanvas,
      rows,
      cols,
      (x, y) => displayHex(x, y),
      selected,
      showContours ? grays : null
    );
  }

  function grayFromClientX(clientX) {
    const rect = grayBar.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(255, t * 255));
  }

  function renderAxis() {
    grayBar.innerHTML = "";
    mapBar.innerHTML = "";
    handlesLayer.innerHTML = "";

    if (level.mode === "slider") {
      mapBar.hidden = true;
      grayBar.classList.add("clickable");
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "shandle";
      handle.style.left = `${(sliderValue / 256) * 100}%`;
      handle.innerHTML = "<span></span>";
      handle.setAttribute("aria-label", "滑块");
      handle.addEventListener("pointerdown", startSliderDrag);
      handlesLayer.appendChild(handle);
      return;
    }

    grayBar.classList.remove("clickable");
    mapBar.hidden = false;

    const edges = [0, ...boundaries, 256];
    for (let i = 0; i < edges.length - 1; i++) {
      const seg = document.createElement("button");
      seg.type = "button";
      seg.className = "seg" + (regionColors[i] ? "" : " hatched");
      seg.style.flex = String(edges[i + 1] - edges[i]);
      if (regionColors[i]) seg.style.background = regionColors[i];
      seg.dataset.index = String(i);
      seg.setAttribute("aria-label", `区间 ${i + 1}`);
      seg.addEventListener("click", () => onSegClick(i));
      mapBar.appendChild(seg);
    }

    if (level.movable) {
      boundaries.forEach((b, i) => {
        const h = document.createElement("button");
        h.type = "button";
        h.className = "bhandle";
        h.style.left = `${(b / 256) * 100}%`;
        h.innerHTML = "<span></span>";
        h.setAttribute("aria-label", `边界 ${i + 1}`);
        h.addEventListener("pointerdown", (ev) => startBoundaryDrag(ev, i));
        handlesLayer.appendChild(h);
      });
    } else {
      boundaries.forEach((b) => {
        const line = document.createElement("div");
        line.className = "fixed-line";
        line.style.left = `${(b / 256) * 100}%`;
        grayBar.appendChild(line);
      });
    }

    if (level.adjustable) {
      grayBar.classList.add("clickable");
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "shandle";
      handle.style.left = `${(sliderValue / 256) * 100}%`;
      handle.innerHTML = "<span></span>";
      handle.setAttribute("aria-label", "滑块");
      handle.addEventListener("pointerdown", startSliderDrag);
      handlesLayer.appendChild(handle);
    }
  }

  function renderTray() {
    trayEl.innerHTML = "";
    if (!level.tray) {
      trayEl.hidden = true;
      return;
    }
    trayEl.hidden = false;
    level.tray.forEach((color) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (selectedChip === color ? " selected" : "");
      chip.style.background = color;
      chip.setAttribute("aria-label", "色块");
      chip.addEventListener("pointerdown", (ev) => startChipDrag(ev, color));
      chip.addEventListener("click", () => {
        selectedChip = selectedChip === color ? null : color;
        renderTray();
      });
      trayEl.appendChild(chip);
    });
  }

  function renderDots() {
    beatsEl.innerHTML = "";
    LEVELS.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "beat-dot";
      dot.textContent = String(i + 1);
      if (i === levelIndex) dot.setAttribute("aria-current", "step");
      dot.addEventListener("click", () => loadLevel(i));
      beatsEl.appendChild(dot);
    });
  }

  function renderPrompt() {
    if (!level.prompt) {
      sceneEl.hidden = true;
      sceneEl.textContent = "";
      return;
    }
    sceneEl.hidden = false;
    sceneEl.textContent = level.prompt;
  }

  function renderAll() {
    renderPrompt();
    renderBoards();
    renderAxis();
    renderTray();
    confirmBtn.hidden = level.judge !== "button";
  }

  // ---------- 交互：滑块 ----------

  function startSliderDrag(ev) {
    if (dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging = true;
    const move = (e) => {
      sliderValue = Math.round(grayFromClientX(e.clientX));
      if (selected) {
        grays[selected.y][selected.x] = sliderValue;
        renderBoards();
      }
      const handle = handlesLayer.querySelector(".shandle");
      if (handle) handle.style.left = `${(sliderValue / 256) * 100}%`;
    };
    const up = () => {
      dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (level.judge === "release") judgeNow();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(ev);
  }

  grayBar.addEventListener("pointerdown", (ev) => {
    if (level.mode !== "slider" && !level.adjustable) return;
    if (ev.target !== grayBar) return;
    startSliderDrag(ev);
  });

  // ---------- 交互：边界 ----------

  function clampBoundary(i, value) {
    // 首尾把手可以拖到轴的两端（0 / 255）：允许把某层灰度「挤出轴外」，
    // 让它并入相邻区间——「删除某元素」靠这个操作（如删太阳关）
    const lo = i === 0 ? 0 : boundaries[i - 1] + MIN_GAP;
    const hi =
      i === boundaries.length - 1 ? 255 : boundaries[i + 1] - MIN_GAP;
    return Math.max(lo, Math.min(hi, Math.round(value)));
  }

  function startBoundaryDrag(ev, index) {
    if (dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
    dragging = true;
    showContours = true;
    renderBoards();
    const move = (e) => {
      boundaries[index] = clampBoundary(index, grayFromClientX(e.clientX));
      renderBoards();
      renderAxis();
    };
    const up = () => {
      dragging = false;
      showContours = false;
      renderBoards();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---------- 交互：色块 ----------

  function paintRegion(i, color) {
    if (level.lockedRegions && level.lockedRegions.includes(i)) return;
    regionColors[i] = color;
    selectedChip = null;
    renderAll();
  }

  function onSegClick(i) {
    if (selectedChip) paintRegion(i, selectedChip);
  }

  function startChipDrag(ev, color) {
    if (dragging) return;
    ev.preventDefault();
    dragging = true;
    const ghost = document.createElement("div");
    ghost.className = "chip ghost";
    ghost.style.background = color;
    document.body.appendChild(ghost);
    const move = (e) => {
      ghost.style.left = `${e.clientX - 21}px`;
      ghost.style.top = `${e.clientY - 21}px`;
    };
    move(ev);
    const up = (e) => {
      dragging = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      ghost.remove();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const seg = el && el.closest ? el.closest(".seg") : null;
      if (seg) paintRegion(Number(seg.dataset.index), color);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---------- 交互：点格子出轴标记 ----------

  function showMarker(gray) {
    axisMarker.style.left = `${(gray / 256) * 100}%`;
    axisMarker.hidden = false;
    clearTimeout(markerTimer);
    markerTimer = setTimeout(() => {
      axisMarker.hidden = true;
    }, 1200);
  }

  function cellFromEvent(ev) {
    const rect = workCanvas.getBoundingClientRect();
    const scale = workCanvas.width / rect.width;
    const px = (ev.clientX - rect.left) * scale;
    const py = (ev.clientY - rect.top) * scale;
    const rows = grays.length;
    const cols = grays[0].length;
    const { gap, cell, ox, oy, destW, destH } = gridLayout(workCanvas, rows, cols);
    const x = level.seamless
      ? Math.floor(((px - ox) * cols) / destW)
      : Math.floor((px - ox - gap) / (cell + gap));
    const y = level.seamless
      ? Math.floor(((py - oy) * rows) / destH)
      : Math.floor((py - oy - gap) / (cell + gap));
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }

  workCanvas.addEventListener("click", (ev) => {
    const cell = cellFromEvent(ev);
    if (!cell) return;
    if (level.mode === "slider" && level.size > 1) {
      selected = cell;
      sliderValue = grays[cell.y][cell.x];
      renderAll();
      return;
    }
    if (level.mode === "regions") {
      if (level.adjustable) {
        selected = cell;
        sliderValue = grays[cell.y][cell.x];
        renderAll();
      }
      showMarker(grays[cell.y][cell.x]);
    }
  });

  // ---------- 判定与反馈 ----------

  function checkWin() {
    const rows = level.target.length;
    const cols = level.target[0].length;
    if (level.mode === "slider") {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (Math.abs(grays[y][x] - level.target[y][x]) > level.tolerance) {
            return false;
          }
        }
      }
      return true;
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (displayHex(x, y) !== level.target[y][x]) return false;
      }
    }
    return true;
  }

  function flash(good) {
    workBoard.classList.remove("good", "bad");
    void workBoard.offsetWidth;
    workBoard.classList.add(good ? "good" : "bad");
    setTimeout(() => workBoard.classList.remove("good", "bad"), 650);
  }

  function judgeNow() {
    if (checkWin()) {
      if (level.leftDisplay && !answerRevealed) {
        answerRevealed = true;
        renderBoards();
      }
      flash(true);
      if (levelIndex < LEVELS.length - 1) {
        setTimeout(() => loadLevel(levelIndex + 1), level.leftDisplay ? 1400 : 700);
      }
    } else {
      flash(false);
      if (level.judge === "release") {
        grays = level.source.map((r) => r.slice());
        sliderValue = grays[0][0];
        renderAll();
      }
    }
  }

  confirmBtn.addEventListener("click", judgeNow);
  resetBtn.addEventListener("click", () => loadLevel(levelIndex));

  // ---------- 关卡装载 ----------

  function loadLevel(i) {
    levelIndex = i;
    level = LEVELS[i];
    grays = level.source.map((r) => r.slice());
    boundaries = level.boundaries ? level.boundaries.slice() : [];
    regionColors = new Array(boundaries.length + 1).fill(null);
    if (level.prefill) {
      for (const [region, color] of level.prefill) regionColors[region] = color;
    }
    selected =
      level.size === 1
        ? { x: 0, y: 0 }
        : level.initialSelect
          ? { ...level.initialSelect }
          : null;
    sliderValue = selected ? grays[selected.y][selected.x] : 128;
    selectedChip = null;
    showContours = false;
    answerRevealed = false;
    dragging = false;
    axisMarker.hidden = true;
    renderDots();
    renderAll();
  }

  loadLevel(0);
})();
