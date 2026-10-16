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

  var TITLE_G = PixelMask.textToGrid("像素修理铺", 336, 84);
  var SUB_G = PixelMask.textToGrid("选关", 132, 52);
  var G_CACHE = {};

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

  /* 原图是 64×64 的方图。按屏幕比例把天空、海、沙滩接到四周，整张图和窗口同比例。 */
  function shoreY(sx) {
    if (sx <= 36) return 52;
    return Math.max(45, Math.round(52 - (sx - 36) / 3));
  }

  function extendColor(sx, sy) {
    var sandLine = shoreY(sx);
    if (sy === sandLine) return FOAM;
    if (sy > sandLine) return SAND;
    if (sy >= 38) return SEA;
    return SKY;
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
    var ox = Math.floor((cols - 64) / 2);
    var oy = Math.floor((rows - 64) / 2);
    var grid = [];
    for (var y = 0; y < rows; y++) {
      var row = [];
      for (var x = 0; x < cols; x++) {
        var bx = x - ox;
        var by = y - oy;
        if (bx >= 0 && by >= 0 && bx < 64 && by < 64) row.push(ART[by][bx]);
        else row.push(extendColor(bx, by));
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
      maxBlock: 32,
      ease: "out",
    });
  }

  var lastT = 0;
  function paint(t) {
    lastT = t;
    paintBg(t);
    PixelMask.renderMaskCanvas(titleCv, TITLE_G, t, cv("--c-ink"), null, 12);
    PixelMask.renderMaskCanvas(
      ctaCv,
      gridOf((startBtn.textContent || "开始游戏").trim(), 300, 76),
      t,
      cv("--c-on-pop"),
      cv("--c-accent"),
      13
    );
    PixelMask.renderMaskCanvas(subCv, SUB_G, t, cv("--c-ink"), null, 7);
    PixelMask.renderMaskCanvas(
      progCv,
      gridOf((progEl.textContent || "0 / 13").trim(), 150, 44),
      t,
      cv("--c-ink-soft"),
      null,
      5
    );
    SliderBoot.renderMosaic(dotsCv, dotsGrid(t), t, { maxBlock: 10, ease: "out" });
    var muted = muteBtn && muteBtn.classList.contains("is-muted");
    SliderBoot.renderMosaic(gearCv, iconGrid("gear"), t, { maxBlock: 36, ease: "out" });
    SliderBoot.renderMosaic(muteCv, iconGrid(muted ? "mute" : "sound"), t, { maxBlock: 36, ease: "out" });
  }

  function pctFromX(clientX) {
    var pad = 3;
    var tr = track.getBoundingClientRect();
    var kw = knob.getBoundingClientRect().width || 86;
    var start = tr.left + pad + kw * 0.5;
    var len = Math.max(1, tr.width - pad * 2 - kw);
    return (clientX - start) / len;
  }

  function setVisual(t) {
    var pad = 3;
    var inner = track.clientWidth - pad * 2;
    var kw = parseFloat(getComputedStyle(knob).getPropertyValue("--kw")) || 86;
    var w = kw * 0.5 + (inner - kw) * t;
    fill.style.width = pad + w + "px";
    knob.style.setProperty("--p", String(t));
    paint(t);
  }

  var unlockT = 0.9;
  var UNLOCKED = false;
  var value = 0;
  var dragging = false;
  var activeId = null;
  var animToken = 0;

  var boot = {
    get value() {
      return value;
    },
    set: function (v) {
      value = Math.max(0, Math.min(1, v));
      setVisual(value);
      if (value > 0.05) {
        stage.classList.add("on");
        stage.classList.remove("boot-idle");
      } else if (!dragging) {
        stage.classList.remove("on");
      }
    },
  };

  function eventPoint(ev) {
    if (ev.touches && ev.touches[0]) return ev.touches[0];
    if (ev.changedTouches && ev.changedTouches[0]) return ev.changedTouches[0];
    return ev;
  }

  function beginDrag(ev) {
    if (UNLOCKED || dragging) return;
    animToken++;
    dragging = true;
    activeId = ev.pointerId != null ? ev.pointerId : "touch";
    if (ev.cancelable) ev.preventDefault();
    try {
      if (ev.pointerId != null && track.setPointerCapture) track.setPointerCapture(ev.pointerId);
    } catch (err) {}
    onGrab();
    boot.set(pctFromX(eventPoint(ev).clientX));
  }

  function moveDrag(ev) {
    if (!dragging || UNLOCKED) return;
    if (ev.pointerId != null && activeId !== ev.pointerId) return;
    if (ev.cancelable) ev.preventDefault();
    boot.set(pctFromX(eventPoint(ev).clientX));
  }

  function endDrag(ev) {
    if (!dragging) return;
    if (ev && ev.pointerId != null && activeId !== ev.pointerId) return;
    dragging = false;
    activeId = null;
    onRelease();
    if (!UNLOCKED && boot.value >= unlockT) finish();
  }

  track.addEventListener("pointerdown", beginDrag);
  window.addEventListener("pointermove", moveDrag, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  if (typeof window.PointerEvent !== "function") {
    track.addEventListener("touchstart", beginDrag, { passive: false });
    window.addEventListener("touchmove", moveDrag, { passive: false });
    window.addEventListener("touchend", endDrag);
    window.addEventListener("touchcancel", endDrag);
  }

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
    var token = ++animToken;
    var from = boot.value;
    var t0 = performance.now();
    var DUR = 300;
    (function step(now) {
      if (token !== animToken) return;
      var k = Math.min(1, (now - t0) / DUR);
      boot.set(Math.max(0, from * (1 - easeOutBack(k))));
      if (k < 1) requestAnimationFrame(step);
      else if (token === animToken) boot.set(0);
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
    paint(lastT);
  });

  function firstPaint() {
    setVisual(0);
  }
  if (document.readyState === "complete") firstPaint();
  else window.addEventListener("load", firstPaint);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      iconCache = {};
      paint(lastT);
    });
  }
})();
