/* Museum label: approach the work already on the wall. The list only changes which work. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let spot = 0;
  let playing = false;

  const api = ShellUX.mount({
    id: "04-label",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      leave();
    },
  });

  spot = api.face() === "clear" ? 0 : api.kit.continueIndex();

  function render() {
    api.markFace();
    const verb = api.face();
    const canvas = document.getElementById("spotCanvas");
    Puzzle.paintThumb(canvas, Puzzle.LEVELS[spot]);
    document.getElementById("spotCap").textContent = `1.${spot + 1}　${api.name(spot)}`;
    document.getElementById("meta").textContent =
      verb === "start" ? "无题，两件" : verb === "continue" ? "还停在这一件" : "两件都对照过";
    document.getElementById("approach").textContent =
      verb === "start" ? "走近" : verb === "continue" && spot === api.kit.continueIndex() ? "继续看" : "再看这件";
    const list = document.getElementById("accessions");
    list.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "acc" + (i === spot ? " is-spot" : "") + (state === "locked" ? " is-locked" : "");
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      btn.innerHTML = `<span>1.${i + 1}　${api.name(i)}</span><span>${
        state === "locked" ? "未开放" : state === "done" ? "已对照" : "在墙上"
      }</span>`;
      li.appendChild(btn);
      list.appendChild(li);
    }
  }

  function enter(i) {
    api.tap();
    playing = true;
    document.getElementById("gallery").hidden = true;
    document.getElementById("note").hidden = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  function leave() {
    playing = false;
    sheet.hide();
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("gallery").hidden = false;
    if (api.face() !== "clear") spot = api.kit.continueIndex();
    render();
  }

  document.getElementById("accessions").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    const i = Number(btn.dataset.i);
    if (!api.kit.isOpen(i)) {
      api.deny(btn);
      return;
    }
    api.tap();
    spot = i;
    render();
  });

  document.getElementById("approach").addEventListener("click", () => {
    if (!api.kit.isOpen(spot)) {
      api.deny(document.getElementById("approach"));
      return;
    }
    enter(spot);
  });
  document.getElementById("noteBtn").addEventListener("click", () => {
    api.tap();
    document.getElementById("gallery").hidden = true;
    document.getElementById("note").hidden = false;
  });
  document.getElementById("noteClose").addEventListener("click", () => {
    api.tap();
    document.getElementById("note").hidden = true;
    document.getElementById("gallery").hidden = false;
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseWall").addEventListener("click", () => {
    api.tap();
    leave();
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
    spot = 0;
    document.getElementById("note").hidden = true;
    leave();
  });

  render();
})();
