/* Book: cover, bookmark, contents, colophon. Continue opens at the ribbon. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  const pages = ["cover", "toc", "colo", "play", "endpage"];
  let page = "cover";

  const api = ShellUX.mount({
    id: "02-book",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (page !== "play") return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear: () => show("endpage"),
  });

  function show(name) {
    sheet.hide();
    page = name;
    pages.forEach((id) => {
      document.getElementById(id).hidden = id !== name;
    });
    document.body.classList.toggle("is-playing", name === "play");
    api.markFace();
    renderChrome();
    window.scrollTo(0, 0);
  }

  function renderChrome() {
    const verb = api.face();
    const ribbon = document.getElementById("ribbon");
    ribbon.hidden = verb === "start";
    const primary = document.getElementById("primaryBtn");
    primary.textContent = verb === "start" ? "翻开" : verb === "continue" ? "从缎带" : "目录";
    document.getElementById("deck").textContent =
      verb === "start"
        ? "一本两章的薄书。"
        : verb === "continue"
          ? "缎带夹在没读完的那一章。"
          : "两章都读完了。";
    const preview = document.getElementById("preview");
    preview.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const li = document.createElement("li");
      const el = document.createElement(state === "locked" ? "button" : "div");
      el.className = "line" + (state === "locked" ? " is-locked" : "");
      if (state === "locked") {
        el.type = "button";
        el.dataset.locked = "1";
      }
      el.innerHTML = `<span>第 ${i + 1} 章　${api.name(i)}</span><span>${
        state === "locked" ? "未切" : state === "done" ? "读过" : "这一章"
      }</span>`;
      li.appendChild(el);
      preview.appendChild(li);
    }
    const list = document.getElementById("tocList");
    list.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter" + (state === "locked" ? " is-locked" : state === "next" ? " is-next" : "");
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      else btn.dataset.enter = String(i);
      btn.textContent = `${i + 1}　${api.name(i)}　${state === "locked" ? "还没切到" : state === "done" ? "读过" : "从这里"}`;
      list.appendChild(btn);
    }
  }

  function enter(i, el) {
    if (!api.kit.isOpen(i)) {
      api.deny(el);
      return;
    }
    api.tap();
    show("play");
    api.enter(i);
  }

  document.getElementById("preview").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-locked]");
    if (btn) api.deny(btn);
  });
  document.getElementById("tocList").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });
  document.getElementById("primaryBtn").addEventListener("click", () => {
    api.tap();
    if (api.face() === "clear") show("toc");
    else enter(api.kit.continueIndex());
  });
  document.getElementById("tocBtn").addEventListener("click", () => {
    api.tap();
    show("toc");
  });
  document.getElementById("coloBtn").addEventListener("click", () => {
    api.tap();
    show("colo");
  });
  document.getElementById("tocClose").addEventListener("click", () => {
    api.tap();
    show("cover");
  });
  document.getElementById("coloClose").addEventListener("click", () => {
    api.tap();
    show("cover");
  });
  document.getElementById("endClose").addEventListener("click", () => {
    api.tap();
    show("cover");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseToc").addEventListener("click", () => {
    api.tap();
    show("toc");
  });
  document.getElementById("pauseCover").addEventListener("click", () => {
    api.tap();
    show("cover");
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
    show("cover");
  });

  show("cover");
})();
