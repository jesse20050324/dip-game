/* Shared save / mute / sfx for ui-tests shells. Audio lives in game/audio/. */
(() => {
  const SPEAKER_SVG = `<svg class="speaker-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.6 9.2h3.4l4.6-3.7v13L7 14.8H3.6z"/>
    <path class="waves" d="M15.6 8.4c1.5 1.3 1.5 6 0 7.3"/>
    <path class="waves" d="M18.3 6.2c2.6 2.3 2.6 9.3 0 11.6"/>
    <path class="slash" d="M5 5l14 14"/>
  </svg>`;

  const SFX_FILES = {
    tap: "tap.wav",
    chip: "chip.wav",
    ok: "ok.wav",
    no: "no.wav",
    reset: "reset.wav",
  };

  window.ShellKit = {
    SPEAKER_SVG,
    create(options) {
      const {
        saveKey,
        muteKey,
        total = 2,
        audioBase = "../../audio/",
      } = options;

      const sfxNodes = {};
      let muted = localStorage.getItem(muteKey) === "1";

      function getCleared() {
        const raw = localStorage.getItem(saveKey);
        if (raw == null || raw === "") return -1;
        const n = Number(raw);
        return Number.isInteger(n) ? n : -1;
      }

      function markCleared(i) {
        if (i > getCleared()) localStorage.setItem(saveKey, String(i));
      }

      function isOpen(i) {
        return i <= getCleared() + 1;
      }

      function continueIndex() {
        const cleared = getCleared();
        if (cleared >= total - 1) return total - 1;
        return Math.min(cleared + 1, total - 1);
      }

      function homeVerb() {
        const cleared = getCleared();
        if (cleared < 0) return "start";
        if (cleared >= total - 1) return "clear";
        return "continue";
      }

      function resetProgress() {
        localStorage.removeItem(saveKey);
      }

      function primeAudio() {
        Object.entries(SFX_FILES).forEach(([name, file]) => {
          if (sfxNodes[name]) return;
          const a = new Audio(audioBase + file);
          a.preload = "auto";
          sfxNodes[name] = a;
        });
      }

      function playSfx(name, vol = 0.38) {
        if (muted) return;
        const src = sfxNodes[name];
        if (!src) return;
        const node = src.cloneNode();
        node.volume = vol;
        node.play().catch(() => {});
      }

      function isMuted() {
        return muted;
      }

      function setMuted(next) {
        muted = !!next;
        localStorage.setItem(muteKey, muted ? "1" : "0");
        syncMuteUi();
      }

      function toggleMute() {
        setMuted(!muted);
        if (!muted) playSfx("tap", 0.28);
      }

      function syncMuteUi() {
        document.querySelectorAll(".js-mute").forEach((btn) => {
          btn.classList.toggle("is-muted", muted);
          btn.setAttribute("aria-pressed", muted ? "true" : "false");
          btn.setAttribute("aria-label", muted ? "开启声音" : "关闭声音");
        });
      }

      function bindMuteButtons() {
        document.querySelectorAll(".js-mute").forEach((btn) => {
          if (btn.classList.contains("icon-btn") && !btn.querySelector(".speaker-svg")) {
            btn.innerHTML = SPEAKER_SVG;
          }
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            primeAudio();
            toggleMute();
          });
        });
        syncMuteUi();
      }

      return {
        total,
        getCleared,
        markCleared,
        isOpen,
        continueIndex,
        homeVerb,
        resetProgress,
        primeAudio,
        playSfx,
        isMuted,
        setMuted,
        toggleMute,
        syncMuteUi,
        bindMuteButtons,
      };
    },
  };
})();
