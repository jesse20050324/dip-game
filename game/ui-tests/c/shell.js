(() => {
  const kit = ShellKit.create({
    saveKey: "dip-ui-c-cleared",
    muteKey: "dip-ui-c-muted",
    total: 2,
    audioBase: "../../audio/",
  });

  const folio = document.getElementById("folio");
  const folioMark = document.getElementById("folioMark");
  const leftBtn = document.getElementById("leftBtn");
  const panels = {
    home: document.getElementById("home"),
    levels: document.getElementById("levels"),
    play: document.getElementById("play"),
    pause: document.getElementById("pause"),
    settings: document.getElementById("settings"),
    confirmReset: document.getElementById("confirmReset"),
    credits: document.getElementById("credits"),
    done: document.getElementById("done"),
  };

  const primaryBtn = document.getElementById("primaryBtn");
  const homeProgress = document.getElementById("homeProgress");
  const muteVal = document.getElementById("muteVal");
  const levelGrid = document.getElementById("levelGrid");

  let view = "home";

  function show(name) {
    view = name;
    Object.entries(panels).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
    folio.classList.toggle("is-home", name === "home");
    const marks = {
      home: "灰度",
      levels: "选关",
      play: `${puzzle.currentIndex() + 1} / ${kit.total}`,
      pause: "暂停",
      settings: "设置",
      confirmReset: "设置",
      credits: "关于",
      done: "灰度",
    };
    folioMark.textContent = marks[name] || "灰度";
    leftBtn.setAttribute(
      "aria-label",
      name === "play" ? "暂停" : "返回"
    );
    leftBtn.innerHTML =
      name === "play"
        ? '<span class="pause-mark" aria-hidden="true"><i></i><i></i></span>'
        : '<span class="back-mark"></span>';
    if (name === "home") renderHome();
    if (name === "levels") renderLevels();
    if (name === "settings") muteVal.textContent = kit.isMuted() ? "关" : "开";
  }

  function renderHome() {
    const verb = kit.homeVerb();
    const doneCount = Math.max(0, kit.getCleared() + 1);
    homeProgress.textContent = `${doneCount} / ${kit.total}`;
    if (verb === "start") primaryBtn.textContent = "开始";
    else if (verb === "continue") {
      primaryBtn.textContent = `继续第 ${kit.continueIndex() + 1} 关`;
    } else primaryBtn.textContent = "选关";
  }

  function renderLevels() {
    const cleared = kit.getCleared();
    const next = kit.continueIndex();
    levelGrid.innerHTML = "";
    Puzzle.LEVELS.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.textContent = String(i + 1);
      if (i <= cleared) dot.classList.add("is-done");
      if (!kit.isOpen(i)) {
        dot.classList.add("is-locked");
        dot.addEventListener("click", () => {
          kit.primeAudio();
          kit.playSfx("no", 0.3);
          dot.classList.remove("shake");
          void dot.offsetWidth;
          dot.classList.add("shake");
        });
      } else {
        if (i === next && cleared < kit.total - 1) dot.classList.add("is-next");
        dot.addEventListener("click", () => {
          kit.playSfx("tap", 0.28);
          enterPlay(i);
        });
      }
      levelGrid.appendChild(dot);
    });
  }

  const puzzle = Puzzle.mount({
    playSfx: kit.playSfx,
    primeAudio: kit.primeAudio,
    onWin(index) {
      kit.markCleared(index);
      if (index < kit.total - 1) {
        puzzle.enter(index + 1);
        folioMark.textContent = `${index + 2} / ${kit.total}`;
      } else show("done");
    },
  });

  function enterPlay(i) {
    if (!kit.isOpen(i)) return;
    show("play");
    puzzle.enter(i);
    folioMark.textContent = `${i + 1} / ${kit.total}`;
    leftBtn.innerHTML = '<span class="pause-mark" aria-hidden="true"><i></i><i></i></span>';
  }

  kit.bindMuteButtons();
  document.querySelectorAll(".js-mute").forEach((btn) => {
    btn.addEventListener("click", () => {
      muteVal.textContent = kit.isMuted() ? "关" : "开";
    });
  });

  leftBtn.addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    if (view === "play") show("pause");
    else if (view === "pause") show("play");
    else if (view === "confirmReset") show("settings");
    else show("home");
  });

  primaryBtn.addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.3);
    if (kit.homeVerb() === "clear") show("levels");
    else enterPlay(kit.continueIndex());
  });
  document.getElementById("selectBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    show("levels");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    fromSettings = "home";
    show("settings");
  });
  document.getElementById("creditsBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    show("credits");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("play");
    folioMark.textContent = `${puzzle.currentIndex() + 1} / ${kit.total}`;
    leftBtn.innerHTML = '<span class="pause-mark" aria-hidden="true"><i></i><i></i></span>';
  });
  document.getElementById("pauseLevelsBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("levels");
  });
  document.getElementById("pauseHomeBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("home");
  });
  document.getElementById("resetAskBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("confirmReset");
  });
  document.getElementById("resetNoBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("settings");
  });
  document.getElementById("resetYesBtn").addEventListener("click", () => {
    kit.playSfx("reset", 0.32);
    kit.resetProgress();
    show("home");
  });
  document.getElementById("againBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    show("home");
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (view === "play") show("pause");
    else if (view === "pause") {
      show("play");
      folioMark.textContent = `${puzzle.currentIndex() + 1} / ${kit.total}`;
      leftBtn.innerHTML = '<span class="pause-mark" aria-hidden="true"><i></i><i></i></span>';
    }
  });

  show("home");
})();
