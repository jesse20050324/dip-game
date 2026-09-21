(() => {
  const kit = ShellKit.create({
    saveKey: "dip-ui-b-cleared",
    muteKey: "dip-ui-b-muted",
    total: 2,
    audioBase: "../../audio/",
  });

  const NAMES = ["第一张", "蘑菇"];
  const screens = {
    home: document.getElementById("home"),
    levels: document.getElementById("levels"),
    play: document.getElementById("play"),
    done: document.getElementById("done"),
    credits: document.getElementById("credits"),
    settings: document.getElementById("settings"),
  };
  const overlays = {
    pause: document.getElementById("pause"),
    confirmReset: document.getElementById("confirmReset"),
  };

  const primaryBtn = document.getElementById("primaryBtn");
  const selectBtn = document.getElementById("selectBtn");
  const homeProgress = document.getElementById("homeProgress");
  const muteVal = document.getElementById("muteVal");
  const levelGrid = document.getElementById("levelGrid");

  function hideAll() {
    Object.values(screens).forEach((el) => {
      el.hidden = true;
    });
    Object.values(overlays).forEach((el) => {
      el.hidden = true;
    });
  }

  function showScreen(name) {
    hideAll();
    screens[name].hidden = false;
    if (name === "home") renderHome();
    if (name === "levels") renderLevels();
    if (name === "settings") muteVal.textContent = kit.isMuted() ? "关" : "开";
  }

  function renderHome() {
    const verb = kit.homeVerb();
    const doneCount = Math.max(0, kit.getCleared() + 1);
    homeProgress.textContent = `${doneCount} / ${kit.total}`;
    if (verb === "start") {
      primaryBtn.textContent = "打开";
      selectBtn.hidden = false;
    } else if (verb === "continue") {
      primaryBtn.textContent = "继续";
      selectBtn.hidden = false;
    } else {
      primaryBtn.textContent = "图鉴";
      selectBtn.hidden = true;
    }
  }

  function renderLevels() {
    const cleared = kit.getCleared();
    const next = kit.continueIndex();
    levelGrid.innerHTML = "";
    Puzzle.LEVELS.forEach((spec, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 220;
      Puzzle.paintThumb(canvas, spec);
      const num = document.createElement("span");
      num.className = "level-num";
      num.textContent = NAMES[i];
      card.append(canvas, num);
      if (i <= cleared) card.classList.add("is-done");
      if (!kit.isOpen(i)) {
        card.classList.add("is-locked");
        card.addEventListener("click", () => {
          kit.primeAudio();
          kit.playSfx("no", 0.3);
          card.classList.remove("shake");
          void card.offsetWidth;
          card.classList.add("shake");
        });
      } else {
        if (i === next && cleared < kit.total - 1) card.classList.add("is-next");
        card.addEventListener("click", () => {
          kit.playSfx("tap", 0.28);
          enterPlay(i);
        });
      }
      levelGrid.appendChild(card);
    });
  }

  const puzzle = Puzzle.mount({
    playSfx: kit.playSfx,
    primeAudio: kit.primeAudio,
    onWin(index) {
      kit.markCleared(index);
      if (index < kit.total - 1) puzzle.enter(index + 1);
      else showScreen("done");
    },
  });

  function enterPlay(i) {
    if (!kit.isOpen(i)) return;
    hideAll();
    screens.play.hidden = false;
    puzzle.enter(i);
  }

  kit.bindMuteButtons();
  document.querySelectorAll(".js-mute").forEach((btn) => {
    btn.addEventListener("click", () => {
      muteVal.textContent = kit.isMuted() ? "关" : "开";
    });
  });

  primaryBtn.addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.3);
    if (kit.homeVerb() === "clear") showScreen("levels");
    else enterPlay(kit.continueIndex());
  });
  selectBtn.addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    showScreen("levels");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    showScreen("settings");
  });
  document.getElementById("creditsBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    showScreen("credits");
  });
  document.getElementById("levelsBack").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("home");
  });
  document.getElementById("settingsBack").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("home");
  });
  document.getElementById("creditsBack").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("home");
  });
  document.getElementById("pauseBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    overlays.pause.hidden = false;
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    overlays.pause.hidden = true;
  });
  document.getElementById("pauseLevelsBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("levels");
  });
  document.getElementById("pauseHomeBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("home");
  });
  document.getElementById("resetAskBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    overlays.confirmReset.hidden = false;
  });
  document.getElementById("resetNoBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    overlays.confirmReset.hidden = true;
  });
  document.getElementById("resetYesBtn").addEventListener("click", () => {
    kit.playSfx("reset", 0.32);
    kit.resetProgress();
    showScreen("home");
  });
  document.getElementById("againBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showScreen("home");
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !screens.play.hidden) {
      overlays.pause.hidden = !overlays.pause.hidden;
    }
  });

  renderHome();
})();
