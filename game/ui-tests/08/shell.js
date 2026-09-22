/* Mail: only the top envelope is the verb. The one underneath stays sealed. Read mail is a side pile. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "08-post",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      desk();
    },
  });

  function desk() {
    playing = false;
    sheet.hide();
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("backside").hidden = true;
    api.markFace();
    const verb = api.face();
    const top = document.getElementById("top");
    const empty = document.getElementById("empty");
    const under = document.getElementById("under");
    if (verb === "clear") {
      top.hidden = true;
      empty.hidden = false;
      under.hidden = true;
    } else {
      top.hidden = false;
      empty.hidden = true;
      const i = api.kit.continueIndex();
      document.getElementById("subject").textContent = `第 ${i + 1} 封 · ${api.name(i)}`;
      document.getElementById("openLetter").textContent = verb === "start" ? "拆开" : "拆开这封";
      const sealed = i === 0 && !api.kit.isOpen(1);
      under.hidden = !sealed;
      if (sealed) under.dataset.locked = "1";
    }
    const read = document.getElementById("read");
    read.innerHTML = "";
    const cleared = api.kit.getCleared();
    for (let i = 0; i <= cleared && i < 2; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.enter = String(i);
      btn.textContent = `已读　${api.name(i)}`;
      read.appendChild(btn);
    }
  }

  function enter(i) {
    api.tap();
    playing = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  document.getElementById("openLetter").addEventListener("click", () => {
    enter(api.kit.continueIndex());
  });
  document.getElementById("under").addEventListener("click", () => {
    api.deny(document.getElementById("under"));
  });
  document.getElementById("toRead").addEventListener("click", () => {
    api.tap();
    document.getElementById("read").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("read").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-enter]");
    if (!btn) return;
    enter(Number(btn.dataset.enter));
  });
  document.getElementById("flipBtn").addEventListener("click", () => {
    api.tap();
    document.getElementById("backside").hidden = false;
    document.getElementById("backside").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("backClose").addEventListener("click", () => {
    api.tap();
    document.getElementById("backside").hidden = true;
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseDesk").addEventListener("click", () => {
    api.tap();
    desk();
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
    desk();
  });

  desk();
})();
