/* Contact sheet: the loupe sits on the next frame. Checks are progress. The lamp is mute. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "10-proof",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      table();
    },
  });

  function table() {
    playing = false;
    sheet.hide();
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    api.markFace();
    const verb = api.face();
    const loupe = verb === "clear" ? -1 : api.kit.continueIndex();
    const margin = document.getElementById("margin");
    const base =
      "页边：灰度。把右边修成左边。0.4。声音 Kenney CC0：click_003、drop_002、confirmation_001、error_005、back_003。";
    margin.textContent = verb === "clear" ? `${base} 可以送印。` : base;
    const host = document.getElementById("sheet");
    host.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "frame" +
        (state === "locked" ? " is-locked" : "") +
        (state === "done" ? " is-done" : "") +
        (i === loupe ? " is-loupe" : "");
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      else btn.dataset.enter = String(i);
      if (i === loupe) btn.dataset.action = "primary";
      const cap = document.createElement("span");
      cap.textContent = state === "locked" ? "还不能看" : i === loupe ? `放大镜 · ${api.name(i)}` : api.name(i);
      btn.append(api.canvas(i, 200), cap);
      host.appendChild(btn);
    }
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

  document.getElementById("sheet").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseSheet").addEventListener("click", () => {
    api.tap();
    table();
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
    table();
  });

  table();
})();
