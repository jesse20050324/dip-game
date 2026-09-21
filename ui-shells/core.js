(function () {
  const CHAPTERS = [
    {
      id: "ch1",
      kicker: "CHAPTER 01",
      title: "灰度与阈值",
      blurb: "把糊住的图一层层切开。",
      levels: [
        { id: "ch1-01", name: "对颜色", scene: "先认深浅。" },
        { id: "ch1-02", name: "补瓦片", scene: "哪一块不对。" },
        { id: "ch1-03", name: "涂区间", scene: "一段灰，一种色。" },
        { id: "ch1-04", name: "同值同色", scene: "同灰必同色。" },
        { id: "ch1-05", name: "一把刀", scene: "一刀切开两层。" },
        { id: "ch1-06", name: "雾中月牙", scene: "两刀夹出一层。" },
        { id: "ch1-07", name: "小风景", scene: "边界和颜色一起用。" },
        { id: "ch1-08", name: "字母浮现", scene: "让字自己出来。" },
        { id: "ch1-09", name: "删掉太阳", scene: "并进背景，就是删。" },
        { id: "ch1-10", name: "发黄旧信", scene: "Oh damn, the ink." },
        { id: "ch1-11", name: "只要一个人", scene: "Just her." },
        { id: "ch1-12", name: "去掉日期戳", scene: "Who watermarks this?" },
        { id: "ch1-13", name: "老照片上色", scene: "A faded old photo." },
      ],
    },
    {
      id: "ch2",
      kicker: "CHAPTER 02",
      title: "颜色合成",
      blurb: "灰度变成颜色的原料。",
      levels: [
        { id: "ch2-01", name: "叠白", scene: "光先叠上去。" },
        { id: "ch2-02", name: "浓度条", scene: "调一杯颜色。" },
        { id: "ch2-03", name: "原料映射", scene: "灰度当颜料。" },
        { id: "ch2-04", name: "合成原图", scene: "三路合一。" },
      ],
    },
  ];

  const ALL = CHAPTERS.flatMap((chapter, chapterIndex) =>
    chapter.levels.map((level, levelIndex) => ({
      ...level,
      chapter,
      chapterIndex,
      levelIndex,
    }))
  );

  function indexOf(id) {
    return ALL.findIndex((level) => level.id === id);
  }

  function loadState(key, seedCount) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cleared)) return parsed;
      }
    } catch (err) {
      /* ignore broken storage */
    }
    return {
      cleared: ALL.slice(0, seedCount).map((level) => level.id),
    };
  }

  function saveState(key, state) {
    localStorage.setItem(key, JSON.stringify(state));
  }

  function unlockedIndex(state) {
    let i = 0;
    while (i < ALL.length && state.cleared.includes(ALL[i].id)) i += 1;
    return Math.min(i, ALL.length - 1);
  }

  function isCleared(state, id) {
    return state.cleared.includes(id);
  }

  function isUnlocked(state, id) {
    const i = indexOf(id);
    if (i <= 0) return true;
    return isCleared(state, ALL[i - 1].id);
  }

  function statusOf(state, id) {
    if (!isUnlocked(state, id)) return "locked";
    if (isCleared(state, id)) return "cleared";
    return "current";
  }

  function statusLabel(status) {
    if (status === "cleared") return "已修复";
    if (status === "current") return "进行中";
    return "未解锁";
  }

  function chapterUnlocked(state, chapter) {
    return isUnlocked(state, chapter.levels[0].id);
  }

  window.GameShell = {
    CHAPTERS,
    ALL,
    create(options) {
      const {
        storageKey,
        seedCount = 3,
        lockedText = "还没走到这里。先修完上一张。",
        wordless = false,
        onChange,
      } = options;

      const root = document.body;
      let state = loadState(storageKey, seedCount);
      let playingId = ALL[unlockedIndex(state)].id;
      let toastTimer = 0;

      function persist() {
        saveState(storageKey, state);
      }

      function currentLevel() {
        return ALL.find((level) => level.id === playingId) || ALL[0];
      }

      function showScreen(name) {
        root.dataset.screen = name;
        root.querySelectorAll("[data-screen]").forEach((node) => {
          node.hidden = node.dataset.screen !== name;
        });
      }

      function showOverlay(name) {
        root.dataset.overlay = name || "";
        root.querySelectorAll("[data-overlay]").forEach((node) => {
          node.hidden = name ? node.dataset.overlay !== name : true;
        });
      }

      function toast(message) {
        if (wordless || !message) return;
        const el = root.querySelector("[data-toast]");
        if (!el) return;
        el.textContent = message;
        el.dataset.on = "1";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          el.dataset.on = "0";
        }, 1600);
      }

      function deny(btn) {
        if (wordless) {
          root.classList.add("is-denied");
          if (btn) btn.classList.add("is-shake");
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            root.classList.remove("is-denied");
            if (btn) btn.classList.remove("is-shake");
          }, 420);
          return;
        }
        toast(lockedText);
      }

      function paint() {
        const level = currentLevel();
        const frontier = ALL[unlockedIndex(state)];
        const clearedCount = state.cleared.length;
        const chapterDone = chapterUnlocked(state, CHAPTERS[1]);

        root.querySelectorAll("[data-bind]").forEach((node) => {
          const key = node.dataset.bind;
          const map = {
            "level-name": level.name,
            "level-id": String(indexOf(level.id) + 1).padStart(2, "0"),
            "level-index": String(level.levelIndex + 1),
            "chapter-kicker": level.chapter.kicker,
            "chapter-title": level.chapter.title,
            scene: level.scene,
            progress: `${indexOf(level.id) + 1} / ${ALL.length}`,
            "cleared-count": String(clearedCount),
            "continue-name": frontier ? frontier.name : level.name,
            "next-name": ALL[indexOf(level.id) + 1]
              ? ALL[indexOf(level.id) + 1].name
              : "全部修完",
            "ch2-lock": chapterDone ? "已开启" : "上一章未完成",
          };
          if (key in map) node.textContent = map[key];
        });

        root.querySelectorAll("[data-if-continue]").forEach((node) => {
          node.hidden = clearedCount === 0;
        });

        root.querySelectorAll("[data-chapter]").forEach((node) => {
          const chapter = CHAPTERS.find((item) => item.id === node.dataset.chapter);
          const open = chapter ? chapterUnlocked(state, chapter) : false;
          node.dataset.state = open ? "open" : "locked";
        });

        const template = root.querySelector("[data-level-template]");
        root.querySelectorAll("[data-level-list]").forEach((list) => {
          if (!template) return;
          const chapter = CHAPTERS.find((item) => item.id === list.dataset.levelList);
          if (!chapter) return;
          list.innerHTML = "";
          chapter.levels.forEach((item, i) => {
            const status = statusOf(state, item.id);
            const node = template.content.firstElementChild.cloneNode(true);
            node.dataset.level = item.id;
            node.dataset.state = status;
            node.setAttribute("aria-disabled", status === "locked" ? "true" : "false");
            node.querySelectorAll("[data-bind]").forEach((slot) => {
              const key = slot.dataset.bind;
              const map = {
                index: String(i + 1).padStart(2, "0"),
                name: item.name,
                scene: item.scene,
                status,
                "status-label": statusLabel(status),
              };
              if (key in map) slot.textContent = map[key];
            });
            list.appendChild(node);
          });
        });

        if (typeof onChange === "function") onChange({ state, level, statusOf });
      }

      function openLevel(id, btn) {
        if (!isUnlocked(state, id)) {
          deny(btn);
          return false;
        }
        playingId = id;
        showOverlay("");
        showScreen("play");
        paint();
        return true;
      }

      function confirmLevel() {
        if (!isCleared(state, playingId)) {
          state.cleared.push(playingId);
          persist();
        }
        showOverlay("clear");
        paint();
      }

      function nextLevel() {
        const i = indexOf(playingId);
        const next = ALL[i + 1];
        showOverlay("");
        if (!next) {
          showScreen("select");
          toast("整条流水线都修完了。");
          paint();
          return;
        }
        openLevel(next.id);
      }

      function resetProgress() {
        state = { cleared: [] };
        persist();
        playingId = ALL[0].id;
        showOverlay("");
        showScreen("title");
        paint();
        toast("进度已清空，从第一关重新开始。");
      }

      root.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-go],[data-act],[data-level]");
        if (!btn) return;

        if (btn.dataset.level) {
          openLevel(btn.dataset.level, btn);
          return;
        }

        const go = btn.dataset.go;
        if (go === "title" || go === "select" || go === "play") {
          showOverlay("");
          if (go === "play") openLevel(playingId);
          else showScreen(go);
          paint();
          return;
        }

        const act = btn.dataset.act;
        if (act === "continue") openLevel(ALL[unlockedIndex(state)].id);
        if (act === "start") openLevel(ALL[0].id);
        if (act === "new") {
          if (state.cleared.length && !confirm(wordless ? "Reset?" : "清空进度，从第一关重新开始？")) return;
          resetProgress();
          openLevel(ALL[0].id);
        }
        if (act === "pause") showOverlay("pause");
        if (act === "settings") showOverlay("settings");
        if (act === "close") showOverlay("");
        if (act === "reset") toast("本关已重置。游戏内容在此留白。");
        if (act === "confirm") confirmLevel();
        if (act === "next") nextLevel();
        if (act === "replay") {
          showOverlay("");
          showScreen("play");
        }
        if (act === "wipe") resetProgress();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (root.dataset.overlay) showOverlay("");
          else if (root.dataset.screen === "play") showOverlay("pause");
        }
      });

      showOverlay("");
      showScreen("title");
      paint();

      return { toast, paint, openLevel };
    },
  };
})();
