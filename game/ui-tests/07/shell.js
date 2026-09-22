/* Calendar: only today opens. Tomorrow is a corner. Finished days are a torn pile. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "07-calendar",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    beforeEnter(i) {
      document.getElementById("calHead").textContent = api.name(i);
    },
    onAdvance(i) {
      document.getElementById("calHead").textContent = api.name(i);
    },
    onClear() {
      rest();
    },
  });

  function rest() {
    playing = false;
    sheet.hide();
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("drawer").hidden = true;
    document.getElementById("mark").hidden = true;
    api.markFace();
    const verb = api.face();
    const today = document.getElementById("today");
    const blank = document.getElementById("blank");
    const tomorrow = document.getElementById("tomorrow");
    document.getElementById("calHead").textContent = verb === "clear" ? "月底" : "今天";
    if (verb === "clear") {
      today.hidden = true;
      blank.hidden = false;
      tomorrow.hidden = true;
    } else {
      today.hidden = false;
      blank.hidden = true;
      const day = api.kit.continueIndex();
      document.getElementById("daynum").textContent = String(day + 1);
      document.getElementById("dayname").textContent = api.name(day);
      document.getElementById("openDay").textContent = verb === "start" ? "撕开今天" : "继续今天";
      tomorrow.hidden = day === 1;
      if (api.kit.isOpen(1)) delete tomorrow.dataset.locked;
      else tomorrow.dataset.locked = "1";
    }
    const pile = document.getElementById("torn");
    pile.innerHTML = "";
    const cleared = api.kit.getCleared();
    for (let i = 0; i <= cleared && i < 2; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scrap";
      btn.dataset.enter = String(i);
      btn.textContent = `已撕　${i + 1}　${api.name(i)}`;
      pile.appendChild(btn);
    }
  }

  function enter(i) {
    api.tap();
    playing = true;
    document.getElementById("today").hidden = true;
    document.getElementById("blank").hidden = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  document.getElementById("openDay").addEventListener("click", () => {
    enter(api.kit.continueIndex());
  });
  document.getElementById("tomorrow").addEventListener("click", () => {
    if (api.kit.isOpen(1) && api.face() !== "continue") {
      enter(1);
      return;
    }
    if (!api.kit.isOpen(1)) api.deny(document.getElementById("tomorrow"));
  });
  document.getElementById("seeTorn").addEventListener("click", () => {
    api.tap();
    document.getElementById("torn").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("torn").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-enter]");
    if (!btn) return;
    enter(Number(btn.dataset.enter));
  });
  document.getElementById("drawerBtn").addEventListener("click", () => {
    api.tap();
    document.getElementById("mark").hidden = true;
    document.getElementById("drawer").hidden = false;
  });
  document.getElementById("markBtn").addEventListener("click", () => {
    api.tap();
    document.getElementById("drawer").hidden = true;
    document.getElementById("mark").hidden = false;
  });
  document.getElementById("drawerClose").addEventListener("click", () => {
    api.tap();
    document.getElementById("drawer").hidden = true;
  });
  document.getElementById("markClose").addEventListener("click", () => {
    api.tap();
    document.getElementById("mark").hidden = true;
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseStand").addEventListener("click", () => {
    api.tap();
    rest();
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
    rest();
  });

  rest();
})();
