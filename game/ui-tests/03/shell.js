/* Stamp card: the card is home and level select. The back is settings and credits. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "03-stamp",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      playing = false;
      document.body.classList.remove("is-playing");
      document.getElementById("play").hidden = true;
      showFace("front");
      render();
    },
  });

  function showFace(which) {
    document.getElementById("front").hidden = which !== "front";
    document.getElementById("back").hidden = which !== "back";
    document.getElementById("pass").hidden = false;
  }

  function render() {
    api.markFace();
    const verb = api.face();
    document.getElementById("deck").textContent =
      verb === "start" ? "还没盖章" : verb === "continue" ? "还差一枚" : "两枚都盖好了";
    const row = document.getElementById("stampRow");
    row.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stamp is-" + state;
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      if (state === "next") btn.dataset.action = "primary";
      if (state !== "locked") btn.dataset.enter = String(i);
      btn.append(api.canvas(i, 120));
      const em = document.createElement("em");
      em.textContent = state === "done" ? "好" : state === "locked" ? "未盖" : api.name(i);
      btn.append(em);
      row.appendChild(btn);
    }
  }

  function enter(i, el) {
    if (!api.kit.isOpen(i)) {
      api.deny(el);
      return;
    }
    api.tap();
    sheet.hide();
    playing = true;
    document.getElementById("pass").hidden = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  document.getElementById("stampRow").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });

  function backToCard() {
    playing = false;
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    showFace("front");
    render();
  }

  document.getElementById("flipBtn").addEventListener("click", () => {
    api.tap();
    showFace("back");
  });
  document.getElementById("unflip").addEventListener("click", () => {
    api.tap();
    showFace("front");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseCard").addEventListener("click", () => {
    api.tap();
    backToCard();
  });
  document.getElementById("pauseBack").addEventListener("click", () => {
    api.tap();
    playing = false;
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    sheet.hide();
    showFace("back");
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
    backToCard();
  });

  render();
})();
