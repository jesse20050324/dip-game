/* First two official levels only. Shell screens stay outside this file. */
(() => {
  function grayHex(v) {
    const h = Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
    return `#${h}${h}${h}`;
  }

  function mushroomTarget() {
    const BG = 230;
    const CAP = 70;
    const ST = 150;
    return [
      [BG, BG, CAP, CAP, BG],
      [BG, CAP, CAP, CAP, CAP],
      [CAP, CAP, CAP, CAP, CAP],
      [BG, BG, ST, BG, BG],
      [BG, BG, ST, BG, BG],
    ];
  }

  function mushroomSource() {
    const g = mushroomTarget().map((r) => r.slice());
    g[0][2] = 235;
    g[2][0] = 235;
    g[3][3] = 40;
    return g;
  }

  const LEVELS = [
    {
      size: 1,
      mode: "slider",
      judge: "release",
      tolerance: 12,
      target: [[96]],
      source: [[220]],
    },
    {
      size: 5,
      mode: "slider",
      judge: "button",
      tolerance: 12,
      target: mushroomTarget(),
      source: mushroomSource(),
      initialSelect: { x: 2, y: 0 },
    },
  ];

  function paintThumb(canvas, spec) {
    const cells = spec.target;
    const rows = cells.length;
    const cols = cells[0].length;
    const w = canvas.width;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e4d5b8";
    ctx.fillRect(0, 0, w, w);
    const gap = rows <= 5 ? 4 : 1;
    const cell = Math.max(
      1,
      Math.floor(Math.min((w - gap * (cols + 1)) / cols, (w - gap * (rows + 1)) / rows))
    );
    const destW = cols * (cell + gap) + gap;
    const destH = rows * (cell + gap) + gap;
    const ox = Math.floor((w - destW) / 2);
    const oy = Math.floor((w - destH) / 2);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = grayHex(cells[y][x]);
        ctx.fillRect(ox + gap + x * (cell + gap), oy + gap + y * (cell + gap), cell, cell);
      }
    }
  }

  window.Puzzle = {
    LEVELS,
    paintThumb,
    mount(options) {
      const {
        playSfx,
        primeAudio,
        onWin,
      } = options;

      const targetCanvas = document.getElementById("targetCanvas");
      const workCanvas = document.getElementById("workCanvas");
      const workBoard = document.getElementById("workBoard");
      const grayBar = document.getElementById("grayBar");
      const handlesLayer = document.getElementById("handlesLayer");
      const axisMarker = document.getElementById("axisMarker");
      const confirmBtn = document.getElementById("confirm");
      const resetBtn = document.getElementById("reset");
      const levelLabel = document.getElementById("levelLabel");

      let levelIndex = 0;
      let level = LEVELS[0];
      let grays = [];
      let selected = null;
      let sliderValue = 128;
      let dragging = false;
      let markerTimer = null;

      function gridLayout(canvas, rows, cols) {
        const w = canvas.width;
        const gap = rows <= 5 ? 8 : 2;
        const raw = Math.min(
          (w - gap * (cols + 1)) / cols,
          (w - gap * (rows + 1)) / rows
        );
        const cell = Math.max(1, Math.floor(raw));
        const destW = Math.round(cols * cell);
        const destH = Math.round(rows * cell);
        const ox = Math.floor((w - (cols * (cell + gap) + gap)) / 2);
        const oy = Math.floor((w - (rows * (cell + gap) + gap)) / 2);
        return { gap, cell, ox, oy, destW, destH };
      }

      function drawGrid(canvas, rows, cols, colorOf, selectedCell) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const { gap, cell, ox, oy } = gridLayout(canvas, rows, cols);
        ctx.clearRect(0, 0, w, w);
        ctx.fillStyle = "#e4d5b8";
        ctx.fillRect(0, 0, w, w);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const px = ox + gap + x * (cell + gap);
            const py = oy + gap + y * (cell + gap);
            ctx.fillStyle = colorOf(x, y);
            ctx.fillRect(px, py, cell, cell);
          }
        }
        if (selectedCell) {
          const px = ox + gap + selectedCell.x * (cell + gap);
          const py = oy + gap + selectedCell.y * (cell + gap);
          ctx.strokeStyle = "#c45c26";
          ctx.lineWidth = 4;
          ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
        }
      }

      function renderBoards() {
        const rows = level.target.length;
        const cols = level.target[0].length;
        drawGrid(targetCanvas, rows, cols, (x, y) => grayHex(level.target[y][x]));
        drawGrid(
          workCanvas,
          rows,
          cols,
          (x, y) => grayHex(grays[y][x]),
          selected
        );
      }

      function grayFromClientX(clientX) {
        const rect = grayBar.getBoundingClientRect();
        const t = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(255, t * 255));
      }

      function renderAxis() {
        grayBar.innerHTML = "";
        handlesLayer.innerHTML = "";
        grayBar.classList.add("clickable");
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "shandle";
        handle.style.left = `${(sliderValue / 256) * 100}%`;
        handle.innerHTML = "<span></span>";
        handle.setAttribute("aria-label", "滑块");
        handle.addEventListener("pointerdown", startSliderDrag);
        handlesLayer.appendChild(handle);
      }

      function renderAll() {
        renderBoards();
        renderAxis();
        confirmBtn.hidden = level.judge !== "button";
      }

      function startSliderDrag(ev) {
        if (dragging) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragging = true;
        const move = (e) => {
          sliderValue = Math.round(grayFromClientX(e.clientX));
          if (selected) {
            grays[selected.y][selected.x] = sliderValue;
            renderBoards();
          }
          const handle = handlesLayer.querySelector(".shandle");
          if (handle) handle.style.left = `${(sliderValue / 256) * 100}%`;
        };
        const up = () => {
          dragging = false;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          if (level.judge === "release") judgeNow();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        move(ev);
      }

      function cellFromEvent(ev) {
        const rect = workCanvas.getBoundingClientRect();
        const scale = workCanvas.width / rect.width;
        const px = (ev.clientX - rect.left) * scale;
        const py = (ev.clientY - rect.top) * scale;
        const rows = grays.length;
        const cols = grays[0].length;
        const { gap, cell, ox, oy } = gridLayout(workCanvas, rows, cols);
        const x = Math.floor((px - ox - gap) / (cell + gap));
        const y = Math.floor((py - oy - gap) / (cell + gap));
        if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
        return { x, y };
      }

      function showMarker(gray) {
        axisMarker.style.left = `${(gray / 256) * 100}%`;
        axisMarker.hidden = false;
        clearTimeout(markerTimer);
        markerTimer = setTimeout(() => {
          axisMarker.hidden = true;
        }, 1200);
      }

      function checkWin() {
        const rows = level.target.length;
        const cols = level.target[0].length;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (Math.abs(grays[y][x] - level.target[y][x]) > level.tolerance) {
              return false;
            }
          }
        }
        return true;
      }

      function flash(good) {
        workBoard.classList.remove("good", "bad");
        void workBoard.offsetWidth;
        workBoard.classList.add(good ? "good" : "bad");
        setTimeout(() => workBoard.classList.remove("good", "bad"), 650);
      }

      function judgeNow() {
        if (checkWin()) {
          playSfx("ok", 0.42);
          flash(true);
          const wait = 700;
          setTimeout(() => onWin(levelIndex), wait);
        } else {
          playSfx("no", 0.34);
          flash(false);
          if (level.judge === "release") {
            grays = level.source.map((r) => r.slice());
            sliderValue = grays[0][0];
            renderAll();
          }
        }
      }

      function loadLevel(i) {
        levelIndex = i;
        level = LEVELS[i];
        grays = level.source.map((r) => r.slice());
        selected =
          level.size === 1
            ? { x: 0, y: 0 }
            : level.initialSelect
              ? { ...level.initialSelect }
              : null;
        sliderValue = selected ? grays[selected.y][selected.x] : 128;
        dragging = false;
        axisMarker.hidden = true;
        if (levelLabel) levelLabel.textContent = `${i + 1} / ${LEVELS.length}`;
        renderAll();
      }

      workCanvas.addEventListener("click", (ev) => {
        const cell = cellFromEvent(ev);
        if (!cell) return;
        if (level.size > 1) {
          selected = cell;
          sliderValue = grays[cell.y][cell.x];
          renderAll();
        }
        showMarker(grays[cell.y][cell.x]);
      });

      confirmBtn.addEventListener("click", () => {
        primeAudio();
        judgeNow();
      });
      resetBtn.addEventListener("click", () => {
        primeAudio();
        playSfx("reset", 0.32);
        loadLevel(levelIndex);
      });

      return {
        enter(i) {
          primeAudio();
          loadLevel(i);
        },
        currentIndex() {
          return levelIndex;
        },
      };
    },
  };
})();
