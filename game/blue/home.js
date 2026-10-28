/* 主页底图是整屏海滩。拖动时马赛克收到清晰，拖过 0.9 松手才进游戏。滑条本身一直清楚。 */
(function () {
  var cv = PixelMask.cssVar;
  var stage = document.getElementById("boStage");
  var track = document.getElementById("boTrack");
  var fill = document.getElementById("boFill");
  var knob = document.getElementById("boKnob");
  var ctaEl = document.getElementById("boCta");
  var subEl = document.getElementById("boSub");
  var startBtn = document.getElementById("startBtn");
  var selectBtn = document.getElementById("selectBtn");
  var progEl = document.getElementById("homeProgress");
  var muteBtn = document.querySelector("#home .js-mute");

  var ART = PhotoArt.landscapeTarget();
  var bgCv = document.getElementById("boBg");
  var SKY = "#7eafd2";
  var SEA = "#2f6f88";
  var SAND = "#e0c8a0";
  var FOAM = "#e8e0d4";
  var artKey = "";
  var artGrid = null;
  var titleCv = document.getElementById("boTitle");
  var ctaCv = document.getElementById("boCtaCv");
  var subCv = document.getElementById("boSubCv");
  var progCv = document.getElementById("boProgCv");
  var dotsCv = document.getElementById("boDotsCv");
  var gearCv = document.getElementById("boGear");
  var muteCv = document.getElementById("boMute");
  var dotsSrc = document.createElement("canvas");
  dotsSrc.width = 220;
  dotsSrc.height = 28;
  var iconCache = {};

  var TITLE_G = null;
  var G_CACHE = {};
  var BTN_W = 260;
  var BTN_H = 68;

  function trimGrid(grid) {
    var top = 0;
    var bot = grid.length - 1;
    function ink(y) {
      var row = grid[y];
      for (var x = 0; x < row.length; x++) if (row[x]) return true;
      return false;
    }
    while (top <= bot && !ink(top)) top++;
    while (bot >= top && !ink(bot)) bot--;
    var out = [];
    for (var y = top; y <= bot; y++) out.push(grid[y]);
    return out;
  }

  function stackGrids(a, b, gap) {
    a = trimGrid(a);
    b = trimGrid(b);
    var w = Math.max(a[0].length, b[0].length);
    var h = a.length + gap + b.length;
    var grid = [];
    var y;
    var x;
    for (y = 0; y < h; y++) {
      var row = [];
      for (x = 0; x < w; x++) row.push(0);
      grid.push(row);
    }
    function blit(src, y0) {
      var sw = src[0].length;
      for (var yy = 0; yy < src.length; yy++) {
        for (var xx = 0; xx < sw; xx++) grid[y0 + yy][xx] = src[yy][xx];
      }
    }
    blit(a, 0);
    blit(b, a.length + gap);
    return grid;
  }

  function titleGrid() {
    if (!TITLE_G) {
      TITLE_G = stackGrids(
        PixelMask.textToGrid("The Gray", 1000, 140, "left"),
        PixelMask.textToGrid("Workshop", 1000, 140, "left"),
        14
      );
    }
    return TITLE_G;
  }

  function gridOf(text, w, h) {
    var k = text + "|" + w + "x" + h;
    if (!G_CACHE[k]) G_CACHE[k] = PixelMask.textToGrid(text, w, h);
    return G_CACHE[k];
  }

  function hexByte(n) {
    var s = n.toString(16);
    return s.length < 2 ? "0" + s : s;
  }

  function canvasToGrid(cv) {
    var w = cv.width;
    var h = cv.height;
    var data = cv.getContext("2d").getImageData(0, 0, w, h).data;
    var grid = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (data[i + 3] < 20) row.push(null);
        else row.push("#" + hexByte(data[i]) + hexByte(data[i + 1]) + hexByte(data[i + 2]));
      }
      grid.push(row);
    }
    return grid;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buttonFace(ctx) {
    ctx.clearRect(0, 0, 104, 104);
    ctx.fillStyle = "#e1edf6";
    roundRect(ctx, 2, 2, 100, 100, 28);
    ctx.fill();
  }

  function drawGear(ctx) {
    buttonFace(ctx);
    ctx.fillStyle = "#122133";
    ctx.font = "64px 'Segoe UI Symbol', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2699", 52, 56);
  }

  function drawSpeaker(ctx, muted) {
    buttonFace(ctx);
    ctx.save();
    var s = 2.15;
    ctx.translate((104 - 24 * s) / 2, (104 - 24 * s) / 2);
    ctx.scale(s, s);
    ctx.fillStyle = "#122133";
    ctx.strokeStyle = "#122133";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(3.6, 9.2);
    ctx.lineTo(7, 9.2);
    ctx.lineTo(11.6, 5.5);
    ctx.lineTo(11.6, 18.5);
    ctx.lineTo(7, 14.8);
    ctx.lineTo(3.6, 14.8);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (muted) {
      ctx.moveTo(5, 5);
      ctx.lineTo(19, 19);
    } else {
      ctx.moveTo(15.6, 8.4);
      ctx.bezierCurveTo(17.1, 9.7, 17.1, 14.4, 15.6, 15.7);
      ctx.moveTo(18.3, 6.2);
      ctx.bezierCurveTo(20.9, 8.5, 20.9, 15.5, 18.3, 17.8);
    }
    ctx.stroke();
    ctx.restore();
  }

  function iconGrid(kind) {
    if (iconCache[kind]) return iconCache[kind];
    var c = document.createElement("canvas");
    c.width = 104;
    c.height = 104;
    var x = c.getContext("2d");
    if (kind === "gear") drawGear(x);
    else drawSpeaker(x, kind === "mute");
    iconCache[kind] = canvasToGrid(c);
    return iconCache[kind];
  }

  function dotsGrid(t) {
    var ctx = dotsSrc.getContext("2d");
    ctx.clearRect(0, 0, dotsSrc.width, dotsSrc.height);
    var on = Math.round(Math.max(0, Math.min(1, t)) * 13);
    for (var i = 0; i < 13; i++) {
      ctx.fillStyle = i < on ? "#449df0" : "#5c6b7a";
      ctx.beginPath();
      ctx.arc(12 + i * 16, 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvasToGrid(dotsSrc);
  }

  /* 原图是 64×64 的方图。按屏幕比例把天空、海、沙滩接到四周。
     接出去的部分带淡云、波纹和沙粒，原图里的平天空也改成同一套渐变。 */
  function shoreY(sx) {
    if (sx <= 36) return 52;
    return Math.max(45, Math.round(52 - (sx - 36) / 3));
  }

  function hash2(x, y) {
    var h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h >>> 0) / 4294967295;
  }

  function mix(a, b, k) {
    var ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    var br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    var r = Math.round(ar + (br - ar) * k), g = Math.round(ag + (bg - ag) * k), bl = Math.round(ab + (bb - ab) * k);
    return "#" + hexByte(r) + hexByte(g) + hexByte(bl);
  }

  var SKY_HI = "#a8cbe8";
  var SKY_LO = "#8fbcdd";
  var SEA_DK = "#27607a";
  var SAND_DK = "#d4b98c";

  function skyColor(sx, sy) {
    var t = Math.min(1, Math.max(0, sy / 38));
    var c = mix(SKY_HI, SKY_LO, t);
    var r = hash2(sx, sy);
    if (r > 0.965) return mix(c, "#ffffff", 0.55);
    if (r > 0.945) return mix(c, "#ffffff", 0.3);
    return c;
  }

  function seaColor(sx, sy) {
    var depth = (sy - 38) / (52 - 38);
    var freq = depth > 0.6 ? 7 : 11;
    var wave = (sy * freq + Math.floor(sx / 3)) % 9 < 2;
    if (wave) return mix(SEA, FOAM, 0.18 + depth * 0.22);
    var r = hash2(sx * 3, sy * 5);
    if (r > 0.94) return mix(SEA, SEA_DK, 0.5);
    return SEA;
  }

  function sandColor(sx, sy) {
    var r = hash2(sx * 5, sy * 7);
    if (r > 0.93) return SAND_DK;
    if (r > 0.88) return mix(SAND, FOAM, 0.35);
    return SAND;
  }

  function extendColor(sx, sy) {
    var sandLine = shoreY(sx);
    if (sy === sandLine) return FOAM;
    if (sy > sandLine) return sandColor(sx, sy);
    if (sy >= 38) return seaColor(sx, sy);
    return skyColor(sx, sy);
  }

  function artForScreen(viewW, viewH) {
    var key = viewW + "x" + viewH;
    if (artKey === key) return artGrid;
    var aspect = viewW / viewH;
    var cols;
    var rows;
    if (aspect >= 1) {
      rows = 64;
      cols = Math.max(64, Math.round(64 * aspect));
    } else {
      cols = 64;
      rows = Math.max(64, Math.round(64 / aspect));
    }
    var ox = Math.round((cols - 64) * 0.66);
    var oy = Math.floor((rows - 64) / 2);
    var grid = [];
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < cols; x++) {
        var bx = x - ox;
        var by = y - oy;
        var cell;
        if (bx >= 0 && by >= 0 && bx < 64 && by < 64) {
          cell = ART[by][bx];
          if (cell === SKY) cell = skyColor(bx, by);
        } else {
          cell = extendColor(bx, by);
        }
        row.push(cell);
      }
      grid.push(row);
    }
    artKey = key;
    artGrid = grid;
    return grid;
  }

  function paintBg(t) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (bgCv.width !== w || bgCv.height !== h) {
      bgCv.width = w;
      bgCv.height = h;
    }
    SliderBoot.renderMosaic(bgCv, artForScreen(window.innerWidth, window.innerHeight), t, {
      maxBlock: 10,
      ease: "out",
    });
  }

  var lastT = 0;
  function paint(t) {
    lastT = t;
    paintBg(t);
    PixelMask.renderMaskCanvas(titleCv, titleGrid(), t, cv("--c-ink"), null, 12);
    PixelMask.renderMaskCanvas(
      ctaCv,
      gridOf((startBtn.textContent || "Play").trim(), BTN_W, BTN_H),
      t,
      cv("--c-on-pop"),
      cv("--c-accent"),
      12
    );
    PixelMask.renderMaskCanvas(
      subCv,
      gridOf((selectBtn.textContent || "Levels").trim(), BTN_W, BTN_H),
      t,
      cv("--c-ink"),
      cv("--c-ghost"),
      12
    );
    PixelMask.renderMaskCanvas(
      progCv,
      gridOf((progEl.textContent || "0 / 13").trim(), 180, 52),
      t,
      cv("--c-ink-soft"),
      null,
      6
    );
    SliderBoot.renderMosaic(dotsCv, dotsGrid(t), t, { maxBlock: 10, ease: "out" });
    var muted = muteBtn && muteBtn.classList.contains("is-muted");
    SliderBoot.renderMosaic(gearCv, iconGrid("gear"), t, { maxBlock: 36, ease: "out" });
    SliderBoot.renderMosaic(muteCv, iconGrid(muted ? "mute" : "sound"), t, { maxBlock: 36, ease: "out" });
  }

  var GEO = null;
  function geom() {
    if (GEO) return GEO;
    var pad = 3;
    var inner = track.clientWidth - pad * 2;
    var kw = parseFloat(getComputedStyle(knob).getPropertyValue("--kw")) || 46;
    var tr = track.getBoundingClientRect();
    var bl = parseFloat(getComputedStyle(track).borderLeftWidth) || 0;
    var core = knob.querySelector(".bo-knob-core") || knob;
    GEO = {
      start: tr.left + bl + pad + core.offsetWidth * 0.5,
      len: Math.max(1, inner - kw),
    };
    return GEO;
  }
  window.addEventListener("scroll", function () {
    GEO = null;
  }, true);
  function pctFromX(clientX) {
    var g = geom();
    return (clientX - g.start) / g.len;
  }

  function setVisual(t) {
    var pad = 3;
    var inner = track.clientWidth - pad * 2;
    var kw = parseFloat(getComputedStyle(knob).getPropertyValue("--kw")) || 46;
    var w = kw * 0.5 + (inner - kw) * t;
    fill.style.width = "calc(" + pad + "px + " + w + "px)";
    knob.style.setProperty("--p", String(t));
    paint(t);
  }

  var unlockT = 0.9;
  var UNLOCKED = false;

  var boot = SliderBoot.SliderBoot({
    range: track,
    knob: knob,
    pct: pctFromX,
    threshold: unlockT,
    onChange: function (t) {
      setVisual(t);
      if (t > 0.05) {
        stage.classList.add("on");
        stage.classList.remove("boot-idle");
      } else {
        stage.classList.remove("on");
      }
    },
    onDragStart: onGrab,
    onDragEnd: onRelease,
    onUnlock: function () {
      finish();
    },
  });

  function finish() {
    UNLOCKED = true;
    stage.classList.remove("boot-idle", "dragging");
    stage.classList.add("on");
    var from = boot.value;
    var t0 = performance.now();
    var DUR = 420;
    (function step(now) {
      var k = Math.min(1, (now - t0) / DUR);
      var e = 1 - Math.pow(1 - k, 3);
      setVisual(from + (1 - from) * e);
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(function () {
        stage.classList.add("released");
      }, 200);
    })(performance.now());
    setTimeout(function () {
      try {
        startBtn.click();
      } catch (err) {}
    }, 700);
  }

  function easeOutBack(k) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  }

  function springBack() {
    var from = boot.value;
    var t0 = performance.now();
    var DUR = 300;
    (function step(now) {
      var k = Math.min(1, (now - t0) / DUR);
      boot.set(Math.max(0, from * (1 - easeOutBack(k))));
      if (k < 1) requestAnimationFrame(step);
      else boot.set(0);
    })(performance.now());
  }

  function onGrab() {
    if (UNLOCKED) return;
    stage.classList.remove("boot-idle");
    stage.classList.add("dragging");
  }

  function onRelease() {
    stage.classList.remove("dragging");
    if (UNLOCKED) return;
    if (boot.value < unlockT && boot.value > 0.02) springBack();
    if (boot.value <= 0.05) {
      setTimeout(function () {
        if (!UNLOCKED && boot.value <= 0.05) stage.classList.add("boot-idle");
      }, 2400);
    }
  }

  stage.classList.add("boot-idle");

  ctaEl.addEventListener("click", function () {
    if (UNLOCKED) startBtn.click();
  });
  subEl.addEventListener("click", function () {
    if (UNLOCKED) selectBtn.click();
  });

  var mo = new MutationObserver(function () {
    paint(lastT);
  });
  mo.observe(startBtn, { childList: true, characterData: true, subtree: true });
  mo.observe(progEl, { childList: true, characterData: true, subtree: true });
  if (muteBtn) mo.observe(muteBtn, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", function () {
    GEO = null;
    paint(lastT);
  });

  function firstPaint() {
    setVisual(0);
    var m = window.location.search.match(/[?&]boT=([\d.]+)/);
    if (m) boot.set(Math.min(1, parseFloat(m[1])));
  }
  if (document.readyState === "complete") firstPaint();
  else window.addEventListener("load", firstPaint);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      iconCache = {};
      TITLE_G = null;
      G_CACHE = {};
      paint(lastT);
    });
  }
})();
