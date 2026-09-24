/* Four plain game menus. Layout comes from body[data-layout]. */
(() => {
  const layout = document.body.dataset.layout;
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "settings", "wipe", "about"]);
  const screens = ["home", "levels", "play", "done"];

  const api = ShellUX.mount({
    id: "plain-" + layout,
    onPause: () => sheet.show("pause"),
    onEscape() {
      if (sheet.isOpen("wipe") || sheet.isOpen("settings") || sheet.isOpen("about")) {
        sheet.hide();
        return;
      }
      const play = document.getElementById("play");
      if (!play || play.hidden) return;
      sheet.show(sheet.isOpen("pause") ? "" : "pause");
    },
    onClear: () => show("done"),
  });

  function show(name) {
    sheet.hide();
    screens.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== name;
    });
    document.body.classList.toggle("is-playing", name === "play");
    document.querySelectorAll(".tabs button").forEach((btn) => {
      const on = btn.dataset.tab === name || (name === "home" && btn.dataset.tab === "home");
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    api.markFace();
    paint();
    window.scrollTo(0, 0);
  }

  function verbLabel() {
    const verb = api.face();
    const n = api.kit.continueIndex() + 1;
    if (verb === "start") return "开始游戏";
    if (verb === "continue") return "继续";
    return "选关";
  }

  function statusWord(state) {
    if (state === "locked") return "未解锁";
    if (state === "done") return "已完成";
    return "当前";
  }

  function fillList(root) {
    if (!root) return;
    root.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level-line is-" + state;
      btn.appendChild(api.canvas(i, 128));
      const text = document.createElement("div");
      text.innerHTML = `<strong>${i + 1}　${api.name(i)}</strong><span>${statusWord(state)}</span>`;
      const em = document.createElement("em");
      em.textContent = state === "locked" ? "锁" : state === "done" ? "✓" : "▶";
      btn.append(text, em);
      btn.addEventListener("click", () => enter(i, btn));
      root.appendChild(btn);
    }
  }

  function paint() {
    document.querySelectorAll("[data-verb]").forEach((el) => {
      el.textContent = verbLabel();
    });
    const sub = document.getElementById("sub");
    if (sub) {
      const verb = api.face();
      sub.textContent =
        verb === "start" ? "第 1 关" : verb === "continue" ? `第 ${api.kit.continueIndex() + 1} 关` : "两关都过了";
    }
    fillList(document.getElementById("levelList"));
    fillList(document.getElementById("homeList"));
    api.refreshMute();
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

  function primary() {
    const verb = api.face();
    if (verb === "clear") {
      api.tap();
      show(layout === "board" ? "home" : "levels");
      return;
    }
    enter(api.kit.continueIndex());
  }

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const go = btn.dataset.go;
      if (go === "primary") primary();
      else if (go === "levels") {
        api.tap();
        show("levels");
      } else if (go === "home") {
        api.tap();
        show("home");
      } else if (go === "settings") {
        api.tap();
        sheet.show("settings");
        api.refreshMute();
      } else if (go === "about") {
        api.tap();
        sheet.show("about");
      } else if (go === "resume") {
        api.tap();
        sheet.hide();
      } else if (go === "restart") {
        api.tap();
        sheet.hide();
        api.puzzle.enter(api.puzzle.currentIndex());
      } else if (go === "wipe-ask") {
        api.tap();
        sheet.show("wipe");
      } else if (go === "wipe-no") {
        api.tap();
        sheet.show("settings");
      } else if (go === "wipe-yes") {
        api.kit.resetProgress();
        api.kit.playSfx("reset", 0.32);
        sheet.hide();
        show("home");
      } else if (go === "close") {
        api.tap();
        sheet.hide();
      }
    });
  });

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      api.tap();
      const tab = btn.dataset.tab;
      if (tab === "settings") {
        show("home");
        sheet.show("settings");
        btn.setAttribute("aria-current", "page");
        return;
      }
      show(tab);
    });
  });

  show("home");
})();
