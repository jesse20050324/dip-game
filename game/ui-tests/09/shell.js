/* Gallery: first visit is a door. After that you are already at the wall. Frames are the menu. */
(() => {
  ShellUX.install("#playSlot");
  const SEEN = "dip-ui-09-wall-seen";
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "09-wall",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      room();
    },
  });

  function seen() {
    return localStorage.getItem(SEEN) === "1" || api.kit.getCleared() >= 0;
  }

  function room() {
    playing = false;
    sheet.hide();
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("plaque").hidden = true;
    document.getElementById("door").hidden = true;
    document.getElementById("room").hidden = false;
    api.markFace();
    const verb = api.face();
    const next = verb === "clear" ? -1 : api.kit.continueIndex();
    document.getElementById("hint").textContent =
      verb === "clear" ? "看完了" : next === 0 ? "先看左边" : "先看右边";
    const hang = document.getElementById("hang");
    hang.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "art" + (state === "locked" ? " is-locked" : "") + (i === next ? " is-next" : "");
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      else btn.dataset.enter = String(i);
      const cap = document.createElement("span");
      cap.textContent = state === "locked" ? `${api.name(i)} · 蒙着` : api.name(i);
      btn.append(api.canvas(i, 220), cap);
      hang.appendChild(btn);
    }
  }

  function door() {
    document.getElementById("room").hidden = true;
    document.getElementById("door").hidden = false;
    document.getElementById("play").hidden = true;
    api.markFace();
  }

  function enter(i, el) {
    if (!api.kit.isOpen(i)) {
      api.deny(el);
      return;
    }
    api.tap();
    playing = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  document.getElementById("enterRoom").addEventListener("click", () => {
    api.tap();
    localStorage.setItem(SEEN, "1");
    room();
  });
  document.getElementById("hang").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });
  document.getElementById("plaqueBtn").addEventListener("click", () => {
    api.tap();
    document.getElementById("room").hidden = true;
    document.getElementById("plaque").hidden = false;
  });
  document.getElementById("plaqueClose").addEventListener("click", () => {
    api.tap();
    room();
  });
  document.getElementById("leaveBtn").addEventListener("click", () => {
    api.tap();
    localStorage.removeItem(SEEN);
    door();
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseRoom").addEventListener("click", () => {
    api.tap();
    room();
  });
  document.getElementById("pauseLeave").addEventListener("click", () => {
    api.tap();
    localStorage.removeItem(SEEN);
    playing = false;
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    sheet.hide();
    door();
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
    localStorage.removeItem(SEEN);
    playing = false;
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("plaque").hidden = true;
    sheet.hide();
    door();
  });

  if (seen()) room();
  else door();
})();
