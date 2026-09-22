/* Shared install + save/sfx/pause helpers. Each scheme still owns its routes. */
(() => {
  const NAMES = ["深浅", "蘑菇"];

  const PLAY_HTML = `
    <div id="play" hidden>
      <header class="play-head">
        <button type="button" class="icon-btn" id="pauseBtn" aria-label="暂停">
          <span class="pause-mark" aria-hidden="true"><i></i><i></i></span>
        </button>
        <p class="level-label" id="levelLabel">1 / 2</p>
        <button type="button" class="icon-btn speaker js-mute" aria-label="声音"></button>
      </header>
      <section class="boards" aria-label="图像对照">
        <figure class="board" id="targetBoard">
          <canvas id="targetCanvas" width="432" height="432" aria-label="目标图"></canvas>
        </figure>
        <figure class="board" id="workBoard">
          <canvas id="workCanvas" width="432" height="432" aria-label="操作图"></canvas>
        </figure>
      </section>
      <section class="axis-card">
        <div class="axis">
          <div class="axis-marker" id="axisMarker" hidden></div>
          <div class="bars">
            <div class="gray-bar" id="grayBar"></div>
            <div class="handles-layer" id="handlesLayer"></div>
          </div>
        </div>
      </section>
      <footer class="play-bar">
        <button type="button" class="reset" id="reset" aria-label="重置本关">↺</button>
        <button type="button" class="confirm" id="confirm" hidden aria-label="确定">✓</button>
      </footer>
    </div>`;

  function install(slotSelector) {
    const slot = document.querySelector(slotSelector);
    if (!slot || document.getElementById("targetCanvas")) return;
    slot.insertAdjacentHTML("beforeend", PLAY_HTML);
  }

  function covers(ids) {
    const nodes = {};
    ids.forEach((id) => {
      nodes[id] = document.getElementById(id);
    });
    return {
      show(name) {
        Object.entries(nodes).forEach(([id, el]) => {
          if (el) el.hidden = id !== name;
        });
      },
      hide() {
        this.show("");
      },
      isOpen(name) {
        return !!(nodes[name] && !nodes[name].hidden);
      },
    };
  }

  function mount(options) {
    const kit = ShellKit.create({
      saveKey: `dip-ui-${options.id}-cleared`,
      muteKey: `dip-ui-${options.id}-muted`,
      total: 2,
      audioBase: "../../audio/",
    });

    const puzzle = Puzzle.mount({
      playSfx: (name, vol) => kit.playSfx(name, vol),
      primeAudio: () => kit.primeAudio(),
      onWin(index) {
        kit.markCleared(index);
        if (index < kit.total - 1) {
          puzzle.enter(index + 1);
          options.onAdvance?.(index + 1);
        } else {
          options.onClear?.();
        }
      },
    });

    kit.bindMuteButtons();

    const api = {
      kit,
      puzzle,
      names: NAMES,
      name(i) {
        return NAMES[i];
      },
      face() {
        return kit.homeVerb();
      },
      classify(i) {
        if (!kit.isOpen(i)) return "locked";
        if (i <= kit.getCleared()) return "done";
        return "next";
      },
      tap(vol = 0.28) {
        kit.primeAudio();
        kit.playSfx("tap", vol);
      },
      deny(el) {
        kit.primeAudio();
        kit.playSfx("no", 0.3);
        if (!el) return;
        el.classList.remove("nudge");
        void el.offsetWidth;
        el.classList.add("nudge");
      },
      canvas(i, size = 180) {
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        Puzzle.paintThumb(c, Puzzle.LEVELS[i]);
        return c;
      },
      enter(i) {
        if (!kit.isOpen(i)) return false;
        kit.primeAudio();
        options.beforeEnter?.(i);
        puzzle.enter(i);
        return true;
      },
      refreshMute() {
        const on = !kit.isMuted();
        document.querySelectorAll("[data-mute-label]").forEach((el) => {
          el.textContent = on ? "声音开着" : "声音关着";
        });
        document.body.classList.toggle("is-quiet", !on);
      },
      markFace() {
        document.body.dataset.face = kit.homeVerb();
      },
    };

    document.addEventListener(
      "click",
      (ev) => {
        if (ev.target.closest(".js-mute")) setTimeout(() => api.refreshMute(), 0);
      },
      true
    );

    const pauseBtn = document.getElementById("pauseBtn");
    if (pauseBtn && options.onPause) {
      pauseBtn.addEventListener("click", () => {
        api.tap();
        options.onPause();
      });
    }

    window.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      const play = document.getElementById("play");
      if (!play || play.hidden) return;
      options.onEscape?.();
    });

    api.refreshMute();
    api.markFace();
    return api;
  }

  window.ShellUX = { NAMES, install, covers, mount };
})();
