/* Drawer: closed desk is home. A sticking tab is continue. Folders are the select. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let playing = false;

  const api = ShellUX.mount({
    id: "05-drawer",
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe")) return sheet.hide();
      if (!playing) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear() {
      closeDesk();
    },
  });

  function renderClosed() {
    api.markFace();
    const verb = api.face();
    const tab = document.getElementById("tabOut");
    const pull = document.getElementById("pull");
    const note = document.querySelector(".inside-note");
    if (verb === "continue") {
      tab.hidden = false;
      tab.textContent = `抽出 · ${api.name(api.kit.continueIndex())}`;
      tab.dataset.action = "primary";
      delete pull.dataset.action;
      pull.classList.add("cta", "cta-ghost");
      pull.textContent = "拉开看看";
      note.textContent = "有一夹还露在外面。";
    } else {
      tab.hidden = true;
      delete tab.dataset.action;
      pull.dataset.action = "primary";
      pull.classList.add("cta");
      pull.classList.remove("cta-ghost");
      pull.textContent = "拉开";
      note.textContent = verb === "start" ? "里面两夹。第二夹先系着。" : "两夹都放回去了。";
    }
  }

  function renderOpen() {
    const box = document.getElementById("folders");
    box.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder is-" + state;
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      else btn.dataset.enter = String(i);
      const text = document.createElement("span");
      text.innerHTML = `<b>${i + 1}　${api.name(i)}</b><br><small>${
        state === "locked" ? "绳还系着" : state === "done" ? "放回去了" : "这夹探出来"
      }</small>`;
      btn.append(api.canvas(i, 140), text);
      box.appendChild(btn);
    }
  }

  function openDrawer() {
    document.getElementById("closed").hidden = true;
    document.getElementById("open").hidden = false;
    document.getElementById("play").hidden = true;
    playing = false;
    document.body.classList.remove("is-playing");
    renderOpen();
  }

  function closeDesk() {
    sheet.hide();
    playing = false;
    document.body.classList.remove("is-playing");
    document.getElementById("play").hidden = true;
    document.getElementById("open").hidden = true;
    document.getElementById("closed").hidden = false;
    renderClosed();
    window.scrollTo(0, 0);
  }

  function enter(i, el) {
    if (!api.kit.isOpen(i)) {
      api.deny(el);
      return;
    }
    api.tap();
    playing = true;
    document.getElementById("closed").hidden = true;
    document.getElementById("open").hidden = true;
    document.getElementById("play").hidden = false;
    document.body.classList.add("is-playing");
    api.enter(i);
    window.scrollTo(0, 0);
  }

  document.getElementById("pull").addEventListener("click", () => {
    api.tap();
    openDrawer();
  });
  document.getElementById("tabOut").addEventListener("click", () => {
    enter(api.kit.continueIndex(), document.getElementById("tabOut"));
  });
  document.getElementById("folders").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });
  document.getElementById("shut").addEventListener("click", () => {
    api.tap();
    closeDesk();
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
  });
  document.getElementById("pauseDrawer").addEventListener("click", () => {
    api.tap();
    openDrawer();
    sheet.hide();
  });
  document.getElementById("pauseDesk").addEventListener("click", () => {
    api.tap();
    closeDesk();
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
    closeDesk();
  });

  renderClosed();
})();
