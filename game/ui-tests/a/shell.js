(() => {
  const kit = ShellKit.create({
    saveKey: "dip-ui-a-cleared",
    muteKey: "dip-ui-a-muted",
    total: 2,
    audioBase: "../../audio/",
  });

  const screens = {
    home: document.getElementById("home"),
    levels: document.getElementById("levels"),
    play: document.getElementById("play"),
    done: document.getElementById("done"),
    credits: document.getElementById("credits"),
  };
  const overlays = {
    pause: document.getElementById("pause"),
    settings: document.getElementById("settings"),
    confirmReset: document.getElementById("confirmReset"),
  };

  const primaryBtn = document.getElementById("primaryBtn");
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
  }

  function showOverlay(name) {
    Object.values(overlays).forEach((el) => {
      el.hidden = true;
    });
    if (name) overlays[name].hidden = false;
    if (name === "settings") muteVal.textContent = kit.isMuted() ? "关" : "开";
  }

  function renderHome() {
    const verb = kit.homeVerb();
    const doneCount = Math.max(0, kit.getCleared() + 1);
    homeProgress.textContent = `${doneCount} / ${kit.total}`;
    primaryBtn.textContent =
      verb === "start" ? "开始" : verb === "continue" ? "继续" : "选关";
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
      canvas.width = 200;
      canvas.height = 200;
      Puzzle.paintThumb(canvas, spec);
      const num = document.createElement("span");
      num.className = "level-num";
      num.textContent = String(i + 1);
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
      if (index < kit.total - 1) {
        puzzle.enter(index + 1);
      } else {
        showScreen("done");
      }
    },
  });

  function enterPlay(i) {
    if (!kit.isOpen(i)) return;
    hideAll();
    screens.play.hidden = false;
    puzzle.enter(i);
  }

  function onPrimary() {
    kit.primeAudio();
    kit.playSfx("tap", 0.3);
    const verb = kit.homeVerb();
    if (verb === "clear") showScreen("levels");
    else enterPlay(kit.continueIndex());
  }

  kit.bindMuteButtons();
  document.querySelectorAll(".js-mute").forEach((btn) => {
    btn.addEventListener("click", () => {
      muteVal.textContent = kit.isMuted() ? "关" : "开";
    });
  });

  primaryBtn.addEventListener("click", onPrimary);
  document.getElementById("selectBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    showScreen("levels");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => {
    kit.primeAudio();
    kit.playSfx("tap", 0.28);
    showOverlay("settings");
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
  document.getElementById("settingsClose").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    overlays.settings.hidden = true;
    if (screens.home.hidden === false) renderHome();
  });
  document.getElementById("resetAskBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showOverlay("confirmReset");
  });
  document.getElementById("resetNoBtn").addEventListener("click", () => {
    kit.playSfx("tap", 0.28);
    showOverlay("settings");
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
  document.getElementById("settingsMute").addEventListener("click", () => {
    muteVal.textContent = kit.isMuted() ? "关" : "开";
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !screens.play.hidden) {
      overlays.pause.hidden = !overlays.pause.hidden;
    }
  });

  renderHome();
})();
