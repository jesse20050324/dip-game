/* 主页只有一条滑块。拖动时整页从马赛克收到清晰，拖过 0.9 松手才进游戏。 */
(function () {
  var cv = PixelMask.cssVar;
  var stage = document.getElementById("boStage");
  var track = document.getElementById("boTrack");
  var fill = document.getElementById("boFill");
  var knob = document.getElementById("boKnob");
  var hint = document.getElementById("boHint");
  var dotsEl = document.getElementById("boDots");
  var ctaEl = document.getElementById("boCta");
  var subEl = document.getElementById("boSub");
  var startBtn = document.getElementById("startBtn");
  var selectBtn = document.getElementById("selectBtn");
  var progEl = document.getElementById("homeProgress");

  var ART = PhotoArt.landscapeTarget();
  var artCv = document.getElementById("boArt");
  var titleCv = document.getElementById("boTitle");
  var ctaCv = document.getElementById("boCtaCv");
  var subCv = document.getElementById("boSubCv");
  var progCv = document.getElementById("boProgCv");

  var TITLE_G = PixelMask.textToGrid("像素修理铺", 336, 84);
  var SUB_G = PixelMask.textToGrid("选关", 132, 52);
  var G_CACHE = {};

  function gridOf(text, w, h) {
    var k = text + "|" + w + "x" + h;
    if (!G_CACHE[k]) G_CACHE[k] = PixelMask.textToGrid(text, w, h);
    return G_CACHE[k];
  }

  var DOTS = [];
  for (var di = 0; di < 13; di++) {
    var dot = document.createElement("i");
    dotsEl.appendChild(dot);
    DOTS.push(dot);
  }

  var lastT = 0;
  function paint(t) {
    lastT = t;
    SliderBoot.renderMosaic(artCv, ART, t, { maxBlock: 34, ease: "out" });
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
    var k = Math.round(t * DOTS.length);
    for (var i = 0; i < DOTS.length; i++) DOTS[i].classList.toggle("on", i < k);
  }

  var GEO = null;
  function geom() {
    if (GEO) return GEO;
    var pad = 3;
    var inner = track.clientWidth - pad * 2;
    var kw = parseFloat(getComputedStyle(knob).getPropertyValue("--kw")) || 86;
    var tr = track.getBoundingClientRect();
    var core = knob.querySelector(".bo-knob-core") || knob;
    GEO = {
      start: tr.left + pad + core.offsetWidth * 0.5,
      len: Math.max(1, inner - kw),
    };
    return GEO;
  }
  window.addEventListener("resize", function () {
    GEO = null;
  });

  function pctFromX(clientX) {
    var g = geom();
    return (clientX - g.start) / g.len;
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
    hint.classList.add("show");
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
  setTimeout(function () {
    if (!UNLOCKED && boot.value <= 0.05) hint.classList.add("show");
  }, 5000);

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

  function firstPaint() {
    setVisual(0);
  }
  if (document.readyState === "complete") firstPaint();
  else window.addEventListener("load", firstPaint);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      paint(lastT);
    });
  }
})();
