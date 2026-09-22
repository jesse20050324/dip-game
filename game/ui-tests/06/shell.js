/* Film gate: the strip is both home and level select. Knobs are settings, never a page. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let gate = 0;
  let mode = "home";

  const api = ShellUX.mount({
    id: "06-film",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (mode !== "play") return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      show("leader");
    },
  });

  gate = api.kit.continueIndex();

  function show(name) {
    sheet.hide();
    mode = name;
    document.getElementById("home").hidden = name !== "home";
    document.getElementById("play").hidden = name !== "play";
    document.getElementById("leader").hidden = name !== "leader";
    document.getElementById("project").hidden = name !== "home";
    document.body.classList.toggle("is-playing", name === "play");
    api.markFace();
    if (name === "home") render();
    window.scrollTo(0, 0);
  }

  function render() {
    const view = document.getElementById("frameView");
    view.innerHTML = "";
    view.appendChild(api.canvas(gate, 320));
    const state = api.classify(gate);
    document.getElementById("frameName").textContent = `${gate + 1}　${api.name(gate)}${
      state === "done" ? " · 放过" : state === "locked" ? " · 还不能居中" : ""
    }`;
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    prev.hidden = gate === 0;
    next.hidden = gate === 1;
    if (!api.kit.isOpen(1)) next.dataset.locked = "1";
    else delete next.dataset.locked;
    const verb = api.face();
    const project = document.getElementById("project");
    if (verb === "start") project.textContent = "放映";
    else if (verb === "continue" && gate === api.kit.continueIndex()) project.textContent = "接着放";
    else project.textContent = "放映这格";
  }

  function nudgeGate(dir, el) {
    const to = gate + dir;
    if (to < 0 || to > 1) return;
    if (!api.kit.isOpen(to)) {
      api.deny(el);
      return;
    }
    api.tap();
    gate = to;
    render();
  }

  document.getElementById("prev").addEventListener("click", (ev) => nudgeGate(-1, ev.currentTarget));
  document.getElementById("next").addEventListener("click", (ev) => nudgeGate(1, ev.currentTarget));
  document.getElementById("project").addEventListener("click", () => {
    if (!api.kit.isOpen(gate)) {
      api.deny(document.getElementById("project"));
      return;
    }
    api.tap();
    show("play");
    api.enter(gate);
  });
  document.getElementById("leaderClose").addEventListener("click", () => {
    api.tap();
    gate = 0;
    show("home");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseGate").addEventListener("click", () => {
    api.tap();
    show("home");
  });
  document.getElementById("pauseHead").addEventListener("click", () => {
    api.tap();
    gate = api.face() === "clear" ? 0 : api.kit.continueIndex();
    show("home");
  });
  document.getElementById("resetAsk").addEventListener("click", () => {
    api.tap();
    sheet.show("wipe");
  });
  document.getElementById("wipeNo").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("wipeYes").addEventListener("click", () => {
    api.kit.playSfx("reset", 0.32);
    api.kit.resetProgress();
    gate = 0;
    show("home");
  });

  show("home");
})();
