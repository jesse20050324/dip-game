/* Pocket: the bezel is the title. Carts are the select. Pause is the system menu. */
(() => {
  ShellUX.install("#playSlot");
  const sheet = ShellUX.covers(["pause", "wipe"]);
  let page = "home";

  const pages = ["home", "carts", "play", "done", "back"];
  const powerBtn = document.getElementById("powerBtn");
  const homeLine = document.getElementById("homeLine");

  const api = ShellUX.mount({
    id: "01-pocket",
    onPause() {
      sheet.show("pause");
      paintPower();
    },
    onEscape() {
      if (sheet.isOpen("wipe")) {
        sheet.hide();
        return;
      }
      if (page !== "play") return;
      if (sheet.isOpen("pause")) sheet.hide();
      else sheet.show("pause");
      paintPower();
    },
    onClear() {
      show("done");
    },
  });

  function show(name) {
    sheet.hide();
    page = name;
    pages.forEach((id) => {
      document.getElementById(id).hidden = id !== name;
    });
    document.body.classList.toggle("is-playing", name === "play");
    api.markFace();
    if (name === "home") renderHome();
    if (name === "carts") renderCarts();
    paintPower();
    window.scrollTo(0, 0);
  }

  function paintPower() {
    const verb = api.face();
    powerBtn.hidden = page !== "home" && page !== "play";
    if (page === "play") {
      powerBtn.textContent = sheet.isOpen("pause") ? "继续" : "暂停";
      return;
    }
    if (page === "home") {
      powerBtn.textContent = verb === "start" ? "开机" : verb === "continue" ? "继续" : "卡带";
    }
  }

  function renderHome() {
    const verb = api.face();
    homeLine.textContent =
      verb === "start" ? "卡带在槽里。" : verb === "continue" ? "还停在下一关。" : "两张都修好了。";
    const box = document.getElementById("miniCarts");
    box.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const locked = api.classify(i) === "locked";
      const el = document.createElement(locked ? "button" : "div");
      el.className = "mini-cart" + (locked ? " is-locked" : "");
      if (locked) {
        el.type = "button";
        el.dataset.locked = "1";
        el.dataset.i = String(i);
      }
      el.append(api.canvas(i, 140));
      const label = document.createElement("span");
      label.textContent = locked ? `${i + 1} 锁着` : `${i + 1} ${api.name(i)}`;
      el.append(label);
      box.appendChild(el);
    }
  }

  function renderCarts() {
    const list = document.getElementById("cartList");
    list.innerHTML = "";
    for (let i = 0; i < 2; i += 1) {
      const state = api.classify(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cart" + (state === "locked" ? " is-locked" : "");
      btn.dataset.i = String(i);
      if (state === "locked") btn.dataset.locked = "1";
      else btn.dataset.enter = String(i);
      btn.append(api.canvas(i, 180));
      const label = document.createElement("span");
      label.textContent =
        state === "locked" ? `${i + 1} ${api.name(i)} · 锁着` : `${i + 1} ${api.name(i)}`;
      btn.append(label);
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

  document.getElementById("miniCarts").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-locked]");
    if (!btn) return;
    api.deny(btn);
  });

  document.getElementById("cartList").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    enter(Number(btn.dataset.i), btn);
  });

  powerBtn.addEventListener("click", () => {
    if (page === "play") {
      api.tap();
      if (sheet.isOpen("pause")) sheet.hide();
      else sheet.show("pause");
      paintPower();
      return;
    }
    if (page !== "home") return;
    api.tap();
    if (api.face() === "clear") show("carts");
    else enter(api.kit.continueIndex(), powerBtn);
  });

  document.getElementById("toCarts").addEventListener("click", () => {
    api.tap();
    show("carts");
  });
  document.getElementById("flipBtn").addEventListener("click", () => {
    api.tap();
    show("back");
  });
  document.getElementById("cartsClose").addEventListener("click", () => {
    api.tap();
    show("home");
  });
  document.getElementById("backClose").addEventListener("click", () => {
    api.tap();
    show("home");
  });
  document.getElementById("doneClose").addEventListener("click", () => {
    api.tap();
    show("home");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    api.tap();
    sheet.hide();
    paintPower();
  });
  document.getElementById("pauseCarts").addEventListener("click", () => {
    api.tap();
    show("carts");
  });
  document.getElementById("pauseHome").addEventListener("click", () => {
    api.tap();
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
    show("home");
  });

  show("home");
})();
