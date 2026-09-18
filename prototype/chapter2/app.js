(() => {
  "use strict";

  const DETENTS = [0, 85, 170, 255];
  const PRIM = { R: [255, 0, 0], G: [0, 255, 0], B: [0, 0, 255] };
  const RES = 432; // 与画布同分辨率，不再从小格子放大

  const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));

  // ---------- 高分辨率图像（真圆、连续风景，不是放大小格子） ----------

  function circleCover(u, v, cx, cy, r) {
    const d = Math.hypot(u - cx, v - cy);
    if (d <= r - 1.5 / RES) return 1;
    if (d >= r + 1.5 / RES) return 0;
    return (r + 1.5 / RES - d) / (3 / RES);
  }

  function makeRGBA(fn) {
    const data = new Uint8ClampedArray(RES * RES * 4);
    for (let y = 0; y < RES; y++) {
      for (let x = 0; x < RES; x++) {
        const [r, g, b] = fn((x + 0.5) / RES, (y + 0.5) / RES);
        const i = (y * RES + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    return data;
  }

  function channelOf(rgba, ch) {
    const g = new Uint8Array(RES * RES);
    for (let i = 0; i < RES * RES; i++) g[i] = rgba[i * 4 + ch];
    return g;
  }

  function vennRGBA() {
    return makeRGBA((u, v) => [
      255 * circleCover(u, v, 0.34, 0.32, 0.26),
      255 * circleCover(u, v, 0.66, 0.32, 0.26),
      255 * circleCover(u, v, 0.5, 0.61, 0.26),
    ]);
  }

  const PAL = {
    path: "#eddfc6",
    ground: "#c4785a",
    mountain: "#6b8f71",
    sky: "#7ba7c9",
    sun: "#e8b84a",
  };
  const LAND_RGB = {
    0: hexToRgb(PAL.sky),
    1: hexToRgb(PAL.ground),
    2: hexToRgb(PAL.mountain),
    3: hexToRgb(PAL.path),
    4: hexToRgb(PAL.sun),
  };

  function landRegionAt(u, v) {
    const x = u * 24;
    const y = v * 24;
    let id = 0;
    if (y >= 16) id = 1;
    if (y > 8 && y < 17 && Math.abs(x - 10) < (y - 6) * 0.95) id = 2;
    if (y > 10 && y < 17 && Math.abs(x - 16) < (y - 8) * 0.85) id = 2;
    if (circleCover(u, v, 18.5 / 24, 4.5 / 24, 3.4 / 24) > 0.5) id = 4;
    return id;
  }

  function landscapeRGBA() {
    const region = new Uint8Array(RES * RES);
    const data = new Uint8ClampedArray(RES * RES * 4);
    for (let y = 0; y < RES; y++) {
      for (let x = 0; x < RES; x++) {
        const id = landRegionAt((x + 0.5) / RES, (y + 0.5) / RES);
        region[y * RES + x] = id;
        const c = LAND_RGB[id];
        const i = (y * RES + x) * 4;
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = 255;
      }
    }
    return { data, region };
  }

  const vennImg = vennRGBA();
  const vennCh = { R: channelOf(vennImg, 0), G: channelOf(vennImg, 1), B: channelOf(vennImg, 2) };
  const land = landscapeRGBA();
  const landCh = { R: channelOf(land.data, 0), G: channelOf(land.data, 1), B: channelOf(land.data, 2) };

  function nearestDetent(v) {
    let best = DETENTS[0];
    let gap = 999;
    for (const d of DETENTS) {
      const g = Math.abs(d - v);
      if (g < gap) {
        gap = g;
        best = d;
      }
    }
    return best;
  }

  // 第 7 关：滑块只有 4 档，所以蓝通道必须全部落在档位上，否则「看着一样」判不过。
  // 天空坏掉 = 0，正确答案 170；山/地/日收到最近档，开局就已对齐，只需修天空。
  function brokenB() {
    const b = new Uint8Array(RES * RES);
    for (let i = 0; i < RES * RES; i++) {
      b[i] = land.region[i] === 0 ? 0 : nearestDetent(landCh.B[i]);
    }
    return b;
  }

  const land7 = (() => {
    const data = new Uint8ClampedArray(land.data);
    for (let i = 0; i < RES * RES; i++) {
      data[i * 4 + 2] = land.region[i] === 0 ? 170 : nearestDetent(landCh.B[i]);
    }
    return data;
  })();

  function solidRGBA(color) {
    return makeRGBA(() => color);
  }

  // 第 6 关：三个正确增益不能都是拉满。合成式是 gray * (档位/255) = 目标通道，
  // 所以灰度必须做成「目标 × 255 / 该通道正确档位」。目标通道值还必须 ≤ 该档位，
  // 否则会截断——当前风景太阳红到 232，正确档不能低于 255，除非把这关目标压暗。
  const GAIN6 = { R: 3, G: 2, B: 3 }; // 红满 / 绿 170 / 蓝满
  function scaleRGBA(src, k) {
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      out[i] = src[i] * k;
      out[i + 1] = src[i + 1] * k;
      out[i + 2] = src[i + 2] * k;
      out[i + 3] = 255;
    }
    return out;
  }
  function grayFromTarget(rgba, ch, detent) {
    const g = new Uint8Array(RES * RES);
    for (let i = 0; i < RES * RES; i++) {
      g[i] = Math.min(255, Math.round((rgba[i * 4 + ch] * 255) / detent));
    }
    return g;
  }
  const land6 = scaleRGBA(land.data, DETENTS[GAIN6.G] / 184); // 略压：绿最高 184 → 170
  const land6Ch = {
    R: grayFromTarget(land6, 0, DETENTS[GAIN6.R]),
    G: grayFromTarget(land6, 1, DETENTS[GAIN6.G]),
    B: grayFromTarget(land6, 2, DETENTS[GAIN6.B]),
  };

  // 第 5 关专用：红花 + 绿丘 + 蓝天。三块都接近原色，R/B 对调后
  // 花变蓝、天变暖、丘仍绿——可以从错图反推，不必乱试。
  function scene5RGBA() {
    const sky = [91, 159, 212];
    const hillBack = [45, 122, 72];
    const hillFore = [62, 168, 96];
    const stem = [36, 110, 58];
    const petal = [210, 32, 38];
    const center = [176, 28, 40];
    return makeRGBA((u, v) => {
      let c = sky;
      if (circleCover(u, v, 0.78, 1.18, 0.5) > 0.45) c = hillBack;
      if (circleCover(u, v, 0.22, 1.2, 0.52) > 0.45) c = hillFore;
      if (u > 0.365 && u < 0.395 && v > 0.4 && v < 0.74) c = stem;
      const leaf =
        ((u - 0.41) / 0.11) ** 2 + ((v - 0.62) / 0.035) ** 2 < 1 && u > 0.39;
      if (leaf) c = stem;
      const p1 = circleCover(u, v, 0.34, 0.34, 0.095);
      const p2 = circleCover(u, v, 0.42, 0.34, 0.095);
      const p3 = circleCover(u, v, 0.38, 0.28, 0.08);
      if (p1 > 0.35 || p2 > 0.35 || p3 > 0.35) c = petal;
      if (circleCover(u, v, 0.38, 0.345, 0.028) > 0.4) c = center;
      return c;
    });
  }
  const scene5 = scene5RGBA();
  const scene5Ch = { R: channelOf(scene5, 0), G: channelOf(scene5, 1), B: channelOf(scene5, 2) };

  // ---------- 关卡 ----------

  function solidItem(color, opts = {}) {
    return {
      kind: "solid",
      color,
      gainIdx: 3,
      gainLocked: false,
      placed: false,
      ...opts,
    };
  }

  function imgItem(gray, opts = {}) {
    return {
      kind: "img",
      gray,
      tint: null,
      gainIdx: 3,
      gainLocked: true,
      placed: false,
      ...opts,
    };
  }

  const LEVELS = [
    {
      auto: true,
      target: solidRGBA([255, 255, 255]),
      makeItems: () => [solidItem(PRIM.R), solidItem(PRIM.G), solidItem(PRIM.B)],
      dragMats: true,
    },
    {
      target: solidRGBA([255, 170, 0]),
      makeItems: () => [
        solidItem(PRIM.R, { gainIdx: 2, placed: true }),
        solidItem(PRIM.G, { gainIdx: 3, placed: true }),
        solidItem(PRIM.B, { gainIdx: 0, gainLocked: true, placed: true }),
      ],
      gains: true,
    },
    {
      target: vennImg,
      makeItems: () => [imgItem(vennCh.G), imgItem(vennCh.B), imgItem(vennCh.R)],
      chips: true,
      dragMats: true,
    },
    {
      target: land.data,
      makeItems: () => [imgItem(landCh.B), imgItem(landCh.R), imgItem(landCh.G)],
      chips: true,
      dragMats: true,
    },
    {
      target: scene5,
      makeItems: () => [
        imgItem(scene5Ch.R, { tint: PRIM.B, placed: true }),
        imgItem(scene5Ch.G, { tint: PRIM.G, placed: true }),
        imgItem(scene5Ch.B, { tint: PRIM.R, placed: true }),
      ],
      chips: true,
    },
    {
      // 正确：红满 / 绿 170 / 蓝满。开局三个都满，绿收回一格即过
      target: land6,
      makeItems: () => [
        imgItem(land6Ch.R, { tint: PRIM.R, placed: true, gainIdx: 3, gainLocked: false }),
        imgItem(land6Ch.G, { tint: PRIM.G, placed: true, gainIdx: 3, gainLocked: false }),
        imgItem(land6Ch.B, { tint: PRIM.B, placed: true, gainIdx: 3, gainLocked: false }),
      ],
      gains: true,
    },
    {
      target: land7,
      makeItems: () => [
        imgItem(landCh.R, { tint: PRIM.R, placed: true, editLocked: true }),
        imgItem(landCh.G, { tint: PRIM.G, placed: true, editLocked: true }),
        imgItem(brokenB(), { tint: PRIM.B, placed: true }),
      ],
      editable: true,
    },
  ];

  // ---------- 状态 ----------

  const beatsEl = document.getElementById("beats");
  const targetCanvas = document.getElementById("targetCanvas");
  const workCanvas = document.getElementById("workCanvas");
  const workBoard = document.getElementById("workBoard");
  const matsEl = document.getElementById("mats");
  const confirmBtn = document.getElementById("confirm");
  const resetBtn = document.getElementById("reset");

  let levelIndex = 0;
  let level = null;
  let items = [];
  let selection = null;
  let drag = null;
  let composedCache = null; // 已放置内容的 ImageData，拖拽中不更新

  // ---------- 像素：卡片自己的样子 / 已放置的合成 ----------

  function currentDetents() {
    return (level && level.detents) || DETENTS;
  }

  function itemLookAt(it, i) {
    const gain = currentDetents()[it.gainIdx] / 255;
    if (it.kind === "solid") {
      return [it.color[0] * gain, it.color[1] * gain, it.color[2] * gain];
    }
    const v = it.gray[i];
    if (it.tint) {
      const k = (v / 255) * gain;
      return [it.tint[0] * k, it.tint[1] * k, it.tint[2] * k];
    }
    return [v, v, v];
  }

  function itemLookData(it) {
    const data = new Uint8ClampedArray(RES * RES * 4);
    for (let i = 0; i < RES * RES; i++) {
      const [r, g, b] = itemLookAt(it, i);
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  function composeData() {
    const data = new Uint8ClampedArray(RES * RES * 4);
    for (let i = 0; i < RES * RES; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const it of items) {
        if (!it.placed) continue;
        const c = itemLookAt(it, i);
        r += c[0];
        g += c[1];
        b += c[2];
      }
      data[i * 4] = Math.min(255, r);
      data[i * 4 + 1] = Math.min(255, g);
      data[i * 4 + 2] = Math.min(255, b);
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  function putRGBA(canvas, data) {
    if (canvas.width !== RES) {
      canvas.width = RES;
      canvas.height = RES;
    }
    const ctx = canvas.getContext("2d");
    ctx.putImageData(new ImageData(data, RES, RES), 0, 0);
  }

  function drawRGBA(canvas, data, emptyPaper) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    ctx.clearRect(0, 0, w, w);
    if (emptyPaper) {
      ctx.fillStyle = "#f7efe1";
      ctx.fillRect(0, 0, w, w);
      return;
    }
    const off = document.createElement("canvas");
    putRGBA(off, data);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, w, w);
  }

  function refreshComposed() {
    composedCache = composeData();
  }

  function renderAll() {
    refreshComposed();
    const empty = !items.some((it) => it.placed);
    drawRGBA(targetCanvas, level.target, false);
    drawRGBA(workCanvas, composedCache, empty);
    workCanvas.classList.toggle("dropzone", !!level.dragMats && empty);
    renderMats();
  }

  function drawThumb(canvas, it) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    ctx.clearRect(0, 0, w, w);
    const off = document.createElement("canvas");
    putRGBA(off, itemLookData(it));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, 0, 0, w, w);
    if (selection && selection.item === it) {
      const overlay = new Uint8ClampedArray(RES * RES * 4);
      const set = new Set(selection.cells);
      for (const i of set) {
        overlay[i * 4] = 196;
        overlay[i * 4 + 1] = 92;
        overlay[i * 4 + 2] = 38;
        overlay[i * 4 + 3] = 115;
      }
      const ov = document.createElement("canvas");
      putRGBA(ov, overlay);
      ctx.drawImage(ov, 0, 0, w, w);
    }
  }

  function renderMats() {
    matsEl.innerHTML = "";
    items.forEach((it, i) => {
      const mat = document.createElement("div");
      mat.className =
        "mat" +
        (it.placed ? " placed" : "") +
        (it.placed && level.dragMats ? " used" : "");
      mat.dataset.index = String(i);

      if (it.kind === "solid") {
        const d = document.createElement("div");
        d.className = "solid";
        const k = currentDetents()[it.gainIdx] / 255;
        d.style.background = css([it.color[0] * k, it.color[1] * k, it.color[2] * k]);
        mat.appendChild(d);
      } else {
        const cv = document.createElement("canvas");
        cv.className = "thumb";
        cv.width = 120;
        cv.height = 120;
        mat.appendChild(cv);
        drawThumb(cv, it);
      }

      if (level.chips && it.kind === "img") {
        const bar = document.createElement("div");
        bar.className = "minimap";
        bar.dataset.index = String(i);
        if (it.tint) bar.style.background = `linear-gradient(90deg, #000, ${css(it.tint)})`;
        mat.appendChild(bar);
      }

      if (level.gains) mat.appendChild(buildGain(it, false));
      if (level.editable && it.kind === "img" && selection && selection.item === it) {
        mat.appendChild(buildGain(it, true));
      }

      if (level.dragMats) {
        mat.addEventListener("pointerdown", (ev) => startMatDrag(ev, it, mat));
      } else if (level.editable && it.kind === "img" && !it.editLocked) {
        mat.addEventListener("pointerdown", (ev) => selectRegion(ev, it, mat));
      }

      matsEl.appendChild(mat);
    });

    if (level.chips) {
      const tray = document.createElement("div");
      tray.className = "chiptray";
      for (const key of ["R", "G", "B"]) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "minichip";
        chip.style.background = css(PRIM[key]);
        chip.setAttribute("aria-label", key);
        chip.addEventListener("pointerdown", (ev) => startChipDrag(ev, PRIM[key]));
        tray.appendChild(chip);
      }
      matsEl.appendChild(tray);
    }
  }

  function buildGain(it, free) {
    const gain = document.createElement("div");
    const locked = !free && it.gainLocked;
    gain.className = "gain" + (free ? " free" : "") + (locked ? " locked" : "");
    const base = it.kind === "solid" ? it.color : it.tint || [255, 255, 255];
    gain.style.background = `linear-gradient(90deg, #000, ${css(base)})`;
    const knob = document.createElement("div");
    knob.className = "knob";
    const stops = free ? DETENTS : currentDetents();
    const frac = free
      ? selection
        ? DETENTS.indexOf(selection.value) / (DETENTS.length - 1)
        : 0
      : it.gainIdx / (stops.length - 1);
    knob.style.left = `${frac * 100}%`;
    gain.appendChild(knob);
    if (locked) return gain;

    gain.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const move = (e) => {
        const rect = gain.getBoundingClientRect();
        const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (free) {
          const idx = Math.round(t * (DETENTS.length - 1));
          const v = DETENTS[idx];
          selection.value = v;
          for (const i of selection.cells) it.gray[i] = v;
          knob.style.left = `${(idx / (DETENTS.length - 1)) * 100}%`;
        } else {
          it.gainIdx = Math.round(t * (stops.length - 1));
          knob.style.left = `${(it.gainIdx / (stops.length - 1)) * 100}%`;
        }
        refreshComposed();
        drawRGBA(workCanvas, composedCache, false);
        if (it.kind === "img") {
          const cv = gain.parentElement.querySelector(".thumb");
          if (cv) drawThumb(cv, it);
        } else {
          const d = gain.parentElement.querySelector(".solid");
          if (d) {
            const k = currentDetents()[it.gainIdx] / 255;
            d.style.background = css([it.color[0] * k, it.color[1] * k, it.color[2] * k]);
          }
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      move(ev);
    });
    return gain;
  }

  // ---------- 拖拽：手里的是一张真图，中间区只显示已放下的 ----------

  function sample(data, u, v) {
    const x = Math.max(0, Math.min(RES - 1, Math.floor(u * RES)));
    const y = Math.max(0, Math.min(RES - 1, Math.floor(v * RES)));
    const i = (y * RES + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  }

  // 卡片自己的图像始终跟着鼠标；只有和中间画布几何重叠的像素
  // 才做「画布已放内容 + 卡片像素」的加色。成品图不会提前对到画框上。
  function drawGhostCard(ghost, cardData, cssSize, clientX, clientY) {
    const W = Math.max(2, Math.round(cssSize));
    if (ghost.width !== W) {
      ghost.width = W;
      ghost.height = W;
    }
    const ctx = ghost.getContext("2d");
    const off = document.createElement("canvas");
    putRGBA(off, cardData);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(off, 0, 0, W, W);

    const wr = workCanvas.getBoundingClientRect();
    const scale = workCanvas.width / wr.width;
    const gx0 = clientX - cssSize / 2;
    const gy0 = clientY - cssSize / 2;
    const x0 = Math.max(0, Math.floor((wr.left - gx0) * (W / cssSize)));
    const y0 = Math.max(0, Math.floor((wr.top - gy0) * (W / cssSize)));
    const x1 = Math.min(W, Math.ceil((wr.right - gx0) * (W / cssSize)));
    const y1 = Math.min(W, Math.ceil((wr.bottom - gy0) * (W / cssSize)));
    if (x1 <= x0 || y1 <= y0) return;

    const img = ctx.getImageData(0, 0, W, W);
    const d = img.data;
    const empty = !items.some((it) => it.placed);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const pageX = gx0 + ((x + 0.5) * cssSize) / W;
        const pageY = gy0 + ((y + 0.5) * cssSize) / W;
        if (pageX < wr.left || pageX >= wr.right || pageY < wr.top || pageY >= wr.bottom)
          continue;
        const cu = (pageX - wr.left) / wr.width;
        const cv = (pageY - wr.top) / wr.height;
        const card = sample(cardData, (x + 0.5) / W, (y + 0.5) / W);
        const base = empty ? [0, 0, 0] : sample(composedCache, cu, cv);
        const i = (y * W + x) * 4;
        d[i] = Math.min(255, base[0] + card[0]);
        d[i + 1] = Math.min(255, base[1] + card[1]);
        d[i + 2] = Math.min(255, base[2] + card[2]);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function cardsOverlapCanvas(clientX, clientY, cssSize) {
    const wr = workCanvas.getBoundingClientRect();
    const left = clientX - cssSize / 2;
    const top = clientY - cssSize / 2;
    return left < wr.right && left + cssSize > wr.left && top < wr.bottom && top + cssSize > wr.top;
  }

  function startMatDrag(ev, it, matEl) {
    if (drag) return;
    ev.preventDefault();
    const ghost = document.createElement("canvas");
    ghost.className = "drag-ghost";
    document.body.appendChild(ghost);
    const cardData = itemLookData(it);
    const baseSize = matEl.querySelector(".solid, .thumb").getBoundingClientRect().width;
    const cw = workCanvas.getBoundingClientRect();
    const startX = ev.clientX;
    const startY = ev.clientY;
    let moved = false;
    let size = baseSize;
    drag = { type: "mat" };
    matEl.style.opacity = "0.25";

    const move = (e) => {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 6) moved = true;
      size = baseSize + (cw.width - baseSize) * Math.min(1, dist / 180);
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      ghost.style.width = `${size}px`;
      ghost.style.height = `${size}px`;
      drawGhostCard(ghost, cardData, size, e.clientX, e.clientY);
    };
    const up = (e) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      ghost.remove();
      drag = null;
      matEl.style.opacity = "";
      if (cardsOverlapCanvas(e.clientX, e.clientY, size)) {
        it.placed = true;
      } else if (!moved && it.placed) {
        it.placed = false;
      }
      renderAll();
      if (level.auto && checkWin()) {
        flash(true);
        if (levelIndex < LEVELS.length - 1) {
          setTimeout(() => loadLevel(levelIndex + 1), 700);
        }
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(ev);
  }

  function overEl(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function startChipDrag(ev, color) {
    if (drag) return;
    ev.preventDefault();
    ev.stopPropagation();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.background = css(color);
    document.body.appendChild(ghost);
    drag = { type: "chip" };
    const move = (e) => {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    const up = (e) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      ghost.remove();
      drag = null;
      const mats = matsEl.querySelectorAll(".mat");
      for (const m of mats) {
        const it = items[Number(m.dataset.index)];
        if (it && it.kind === "img" && overEl(m, e.clientX, e.clientY)) {
          it.tint = color;
          break;
        }
      }
      renderAll();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(ev);
  }

  function selectRegion(ev, it, matEl) {
    ev.preventDefault();
    const cv = matEl.querySelector(".thumb");
    const rect = cv.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - rect.left) / rect.width) * RES);
    const y = Math.floor(((ev.clientY - rect.top) / rect.height) * RES);
    if (x < 0 || y < 0 || x >= RES || y >= RES) return;
    const start = y * RES + x;
    const id = land.region[start];
    const cells = [];
    for (let i = 0; i < RES * RES; i++) if (land.region[i] === id) cells.push(i);
    selection = { item: it, cells, value: nearestDetent(it.gray[start]) };
    renderAll();
  }

  function checkWin() {
    const tol = level.tolerance || 2;
    const g = composeData();
    const t = level.target;
    for (let i = 0; i < RES * RES; i++) {
      const k = i * 4;
      if (
        Math.abs(g[k] - t[k]) > tol ||
        Math.abs(g[k + 1] - t[k + 1]) > tol ||
        Math.abs(g[k + 2] - t[k + 2]) > tol
      )
        return false;
    }
    return true;
  }

  function flash(good) {
    workBoard.classList.remove("good", "bad");
    void workBoard.offsetWidth;
    workBoard.classList.add(good ? "good" : "bad");
    setTimeout(() => workBoard.classList.remove("good", "bad"), 650);
  }

  confirmBtn.addEventListener("click", () => {
    if (checkWin()) {
      flash(true);
      if (levelIndex < LEVELS.length - 1) setTimeout(() => loadLevel(levelIndex + 1), 700);
    } else {
      flash(false);
    }
  });
  resetBtn.addEventListener("click", () => loadLevel(levelIndex));

  function renderDots() {
    beatsEl.innerHTML = "";
    LEVELS.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "beat-dot";
      b.textContent = String(i + 1);
      if (i === levelIndex) b.setAttribute("aria-current", "step");
      b.addEventListener("click", () => loadLevel(i));
      beatsEl.appendChild(b);
    });
  }

  function loadLevel(i) {
    levelIndex = i;
    level = LEVELS[i];
    items = level.makeItems();
    selection = null;
    drag = null;
    confirmBtn.hidden = !!level.auto;
    renderDots();
    renderAll();
  }

  loadLevel(0);
})();
