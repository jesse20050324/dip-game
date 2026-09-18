window.PhotoArt = (function () {
const N = 64;
const PAPER = "#e4c896";
const INK = "#2a1c14";
const SKY = "#7eafd2";
const GROUND = "#c17a4a";
const MOUNTAIN = "#4f7d58";
const WHITE = "#f3eee4";
const PERSON = "#b84332";
const HAIR = "#4a3228";
const SKIN = "#e0a882";
const CLOTHES = "#b84332";
const WALL = "#c4a078";
const COLLAR = "#efe6d0";
const FADE = {
  ground: "#d5c2b0",
  person: "#d2b8b0",
  wall: "#d4c8b8",
  sky: "#d8e2ea",
  collar: "#e8e4dc",
};

function grid(w, h, fill) {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}
function set(g, x, y, v) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = v;
}
function rect(g, r0, c0, h, w, v) {
  for (let y = r0; y < r0 + h; y++) for (let x = c0; x < c0 + w; x++) set(g, x, y, v);
}
function ellipse(g, cx, cy, rx, ry, v) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1) set(g, x, y, v);
    }
  }
}
function ring(g, cx, cy, r, thick, v) {
  const inner = (r - thick) * (r - thick);
  const outer = r * r;
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d <= outer && d >= inner) g[y][x] = v;
    }
  }
}
function line(g, x0, y0, x1, y1, v) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    set(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), v);
  }
}
function blit(g, ox, oy, rows, v) {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === "#") set(g, ox + i, oy + j, v);
    });
  });
}
function hexToRgb(hex) {
  const h = hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function grayHex(v) {
  const h = v.toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
}

const F = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: ["###", "#..", "#..", "#..", "###"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  G: ["###", "#..", "#.#", "#.#", "###"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: [".##", "..#", "..#", "#.#", ".#."],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "#.#", "#.#", "#.#"],
  N: ["#.#", "##.", "#.#", "#.#", "#.#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  R: ["###", "#.#", "##.", "#.#", "#.#"],
  S: ["###", "#..", "###", "..#", "###"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  " ": ["...", "...", "...", "...", "..."],
};
function text(g, x, y, str, v, gap = 4) {
  let cx = x;
  for (const ch of str) {
    blit(g, cx, y, F[ch] || F[" "], v);
    cx += gap;
  }
}
function blit2x(g, ox, oy, rows, v) {
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch !== "#") return;
      set(g, ox + i * 2, oy + j * 2, v);
      set(g, ox + i * 2 + 1, oy + j * 2, v);
      set(g, ox + i * 2, oy + j * 2 + 1, v);
      set(g, ox + i * 2 + 1, oy + j * 2 + 1, v);
    });
  });
}
function text2x(g, x, y, str, v, gap = 8) {
  let cx = x;
  for (const ch of str) {
    blit2x(g, cx, y, F[ch] || F[" "], v);
    cx += gap;
  }
}

const AW = 128;
const AH = 176;
const CREAM = "#efe4c4";
const LETTERHEAD = "#c43c2e";
const BLOT = "#1f1410";
const LETTER_COLOR = { paper: CREAM, ink: INK, red: LETTERHEAD, stain: BLOT };
const LETTER_GRAY = { stain: 36, ink: 90, red: 150, paper: 220 };

function letterRoles(withStain) {
  const g = grid(AW, AH, "paper");
  if (withStain) {
    ellipse(g, 48, 88, 32, 18, "stain");
    ellipse(g, 36, 100, 22, 12, "stain");
    ellipse(g, 64, 96, 16, 10, "stain");
    ring(g, 44, 84, 14, 2.2, "stain");
    set(g, 76, 80, "stain");
    set(g, 80, 82, "stain");
  }
  rect(g, 16, 16, 5, 96, "red");
  text2x(g, 16, 28, "12 AUG", "ink", 8);
  text2x(g, 16, 46, "DEAR ANA", "ink", 8);
  text2x(g, 16, 64, "THE GARDEN", "ink", 8);
  text2x(g, 16, 82, "IS IN BLOOM", "ink", 8);
  text2x(g, 16, 100, "COME SOON", "ink", 8);
  signInk(g, 20, 122);
  return g;
}

function signInk(g, ox, oy) {
  // traced from a real signature photo
  blit(g, ox, oy, [
    "......#................................................................................",
    "......#................................................................................",
    "......##...................#######..........................#..........................",
    "......######.............###.....##.........................#..........................",
    "....####....#..........##.........#........................##..........................",
    "...##..#.....#.......###..........#........................##..........................",
    "...#...#......#.....##............#........................##..........................",
    "..##...##......#...##.............#........................#.......##..................",
    "..#....##......##.##..............#.......................##......###..................",
    ".##....##.......###..............#........................##......###..................",
    ".#......#.......##..............##........................##......##...................",
    ".#......#.......##..............#.................#.......##.....##....................",
    ".#......#......###.............#..........................#....####....................",
    ".#......#......#.#...........##...........................#..###.#.....................",
    ".#......#......#.#.......................................#####...#.....................",
    "##......#......###........###...................#####..#####....##.....................",
    "##......#......###......##...........##.........###########.....##.....................",
    "##.......#....###......##...........###...............##.##.....##.....#...............",
    ".#.......#.###..##....##...........####.#...............###.....##...###...............",
    ".#.......#........#..##...........##.####...##...###.....##.....##..####...............",
    ".#.......#.........####..........##..####..###..##.#.....##.....#####.##...............",
    ".#.......#.........##.###################.#######..#.....###..........##...............",
    ".#.......#.........#..........############...##...##......##..........##...............",
    ".##......#........##..........#.........##................###..........##.......##.....",
    "..#......#........#..........#..........##................###............#######.......",
    "..#......##.......#........##.........###..................##..........................",
    "..##......####....#.......##.......####................................................",
    "...#......###.....##....##......####...................................................",
    "...#......#.#......#####.....###.........................#########################.....",
    "....#.....#...............###...................######............................#....",
    "....#.....#............###................####.........................................",
    ".....#....#..........###..............###..............................................",
    ".....##...##.......##.............###..................................................",
    "......#....#.....##............###.....................................................",
    ".......#...#...##............##........................................................",
    ".......#...#.###...........##..........................................................",
    "........#..###...........#..........................##################.................",
    ".........####..........##................##########....................#######.........",
    ".........####.........#..........########.....................................####.....",
    "........#####........##...#######.................................................###..",
    ".......#...##..........###..........................................................##.",
    "......#....###.......................................................................##",
    "............##......................................................................###",
    ".............................................................................########..",
    "....................................................................####..............."
  ], "ink");
}
function letterTarget() {
  return letterRoles(false).map((row) => row.map((r) => LETTER_COLOR[r] || CREAM));
}
function letterStained() {
  return letterRoles(true).map((row) => row.map((r) => LETTER_COLOR[r] || CREAM));
}
function letterGray() {
  return letterRoles(true).map((row) => row.map((r) => LETTER_GRAY[r] ?? 220));
}

function personRoles() {
  const m = grid(N, N, 0);
  ellipse(m, 32, 50, 20, 18, "clothes");
  rect(m, 28, 30, 6, 8, "skin");
  ellipse(m, 30, 14, 13, 10, "hair");
  ellipse(m, 33, 20, 8, 9, "skin");
  ellipse(m, 24, 22, 2.2, 3, "skin");
  ellipse(m, 30, 12, 11, 6, "hair");
  set(m, 30, 20, "hair");
  set(m, 31, 20, "hair");
  set(m, 36, 20, "hair");
  set(m, 37, 20, "hair");
  for (let y = 36; y <= 46; y++) {
    const w = Math.floor((y - 36) * 0.4);
    for (let x = 32 - w; x <= 32 + w; x++) set(m, x, y, 0);
  }
  return m;
}
function branchMask() {
  const t = grid(N, N, 0);
  function stroke(x0, y0, x1, y1, r) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 3;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const rr = r * (1 - u * 0.28);
      ellipse(t, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, rr, rr * 0.8, 1);
    }
  }
  stroke(7, 0, 13, 15, 1.9);
  stroke(13, 15, 4, 27, 1.35);
  stroke(13, 15, 21, 21, 1.25);
  stroke(4, 27, 9, 34, 1.05);
  stroke(21, 21, 15, 31, 1.05);
  stroke(21, 21, 29, 14, 1.15);
  stroke(29, 14, 26, 8, 0.85);
  ellipse(t, 3, 27, 4.2, 3.1, 1);
  ellipse(t, 9, 34, 3.6, 2.8, 1);
  ellipse(t, 16, 32, 3.2, 2.4, 1);
  ellipse(t, 29, 13, 3.1, 2.2, 1);
  stroke(57, 0, 53, 13, 1.8);
  stroke(53, 13, 61, 23, 1.25);
  stroke(53, 13, 45, 19, 1.2);
  stroke(61, 23, 56, 32, 1.05);
  stroke(45, 19, 41, 8, 1.0);
  stroke(45, 19, 39, 27, 1.0);
  ellipse(t, 62, 24, 4.1, 3.0, 1);
  ellipse(t, 55, 32, 3.4, 2.6, 1);
  ellipse(t, 39, 27, 3.5, 2.5, 1);
  ellipse(t, 41, 8, 2.8, 2.1, 1);
  stroke(32, 0, 36, 7, 1.05);
  stroke(36, 7, 40, 3, 0.85);
  ellipse(t, 40, 2, 2.6, 2.0, 1);
  return t;
}
const PERSON_COLOR = { hair: HAIR, skin: SKIN, clothes: CLOTHES };
const PERSON_GRAY = { hair: 70, clothes: 115, skin: 165 };
function personTarget() {
  const p = personRoles();
  const g = grid(N, N, WHITE);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (p[y][x]) g[y][x] = PERSON_COLOR[p[y][x]];
    }
  }
  return g;
}
function personBrought() {
  const p = personRoles();
  const b = branchMask();
  const g = grid(N, N, SKY);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (b[y][x] && !p[y][x]) g[y][x] = MOUNTAIN;
      if (p[y][x]) g[y][x] = PERSON_COLOR[p[y][x]];
    }
  }
  return g;
}
function personGray() {
  const p = personRoles();
  const b = branchMask();
  const g = grid(N, N, 220);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (b[y][x] && !p[y][x]) g[y][x] = 36;
      if (p[y][x]) g[y][x] = PERSON_GRAY[p[y][x]];
    }
  }
  return g;
}

function ridgeY(x) {
  const a = 18 * Math.exp(-Math.pow((x - 16) / 8, 2));
  const b = 22 * Math.exp(-Math.pow((x - 34) / 10, 2));
  const c = 14 * Math.exp(-Math.pow((x - 52) / 8, 2));
  return Math.round(44 - a - b - c);
}
function hillY(x) {
  return Math.round(52 + 2 * Math.sin(x / 5) + (x % 5 === 0 ? 1 : 0));
}
function pine(g, bx, top, h, v) {
  for (let i = 0; i < h; i++) {
    const w = 1 + Math.floor(i / 2);
    for (let x = bx - w; x <= bx + w; x++) set(g, x, top + i, v);
  }
}
function landscapeRoles(withStamp) {
  const g = grid(N, N, "sky");
  for (let x = 0; x < N; x++) {
    const r = ridgeY(x);
    const h = hillY(x);
    for (let y = r; y < 46; y++) g[y][x] = "mountain";
    for (let y = h; y < N; y++) g[y][x] = "ground";
  }
  for (let x = 18; x <= 50; x++) {
    for (let y = 46; y < hillY(x); y++) g[y][x] = "sky";
  }
  for (const x of [10, 14, 18, 22, 28, 33, 38, 44, 50, 55]) {
    pine(g, x, ridgeY(x) - 6, 6 + (x % 3), "mountain");
  }
  if (withStamp) text(g, 34, 56, "98 8 12", "stamp");
  return g;
}
const LAND_COLOR = { sky: SKY, ground: GROUND, mountain: MOUNTAIN, stamp: "#f2efe4" };
const LAND_GRAY = { sky: 180, ground: 50, mountain: 110, stamp: 240 };

function portraitRoles() {
  const g = grid(N, N, "sky");
  for (let y = 10; y < 50; y++) {
    for (let x = 0; x < 30; x++) g[y][x] = "wall";
  }
  rect(g, 16, 4, 22, 10, "sky");
  rect(g, 16, 16, 22, 10, "sky");
  rect(g, 26, 4, 2, 22, "wall");
  rect(g, 16, 13, 22, 3, "wall");
  for (let x = 0; x < N; x++) {
    const fy = 50 + (x > 36 ? 1 : 0);
    for (let y = fy; y < N; y++) g[y][x] = "ground";
  }
  const p = grid(N, N, 0);
  ellipse(p, 44, 20, 11, 8, 1);
  ellipse(p, 46, 24, 8, 10, 1);
  rect(p, 32, 22, 5, 6, 1);
  ellipse(p, 46, 50, 16, 16, 1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (p[y][x]) g[y][x] = "person";
  }
  set(g, 45, 36, "collar");
  set(g, 46, 36, "collar");
  set(g, 47, 36, "collar");
  set(g, 46, 37, "collar");
  return g;
}
const PORTRAIT_VIVID = { sky: SKY, ground: GROUND, wall: WALL, person: PERSON, collar: COLLAR };
const PORTRAIT_FADE = {
  sky: FADE.sky,
  ground: FADE.ground,
  wall: FADE.wall,
  person: FADE.person,
  collar: FADE.collar,
};
const PORTRAIT_GRAY = { ground: 40, person: 90, wall: 140, sky: 190, collar: 230 };
  function landscapeTarget() {
    return landscapeRoles(false).map((row) => row.map((r) => LAND_COLOR[r] || SKY));
  }
  function landscapeStamped() {
    return landscapeRoles(true).map((row) => row.map((r) => LAND_COLOR[r] || SKY));
  }
  function landscapeStampGray() {
    return landscapeRoles(true).map((row) => row.map((r) => LAND_GRAY[r]));
  }
  function portraitFaded() {
    const roles = portraitRoles();
    return roles.map((row) => row.map((r) => PORTRAIT_FADE[r]));
  }
  function portraitVivid() {
    const roles = portraitRoles();
    return roles.map((row) => row.map((r) => PORTRAIT_VIVID[r]));
  }
  function portraitGray() {
    const roles = portraitRoles();
    return roles.map((row) => row.map((r) => PORTRAIT_GRAY[r]));
  }
  return {
    C: {
      cream: CREAM,
      ink: INK,
      letterhead: LETTERHEAD,
      hair: HAIR,
      skin: SKIN,
      clothes: CLOTHES,
      white: WHITE,
      sky: SKY,
      ground: GROUND,
      mountain: MOUNTAIN,
      wall: WALL,
      collar: COLLAR,
      person: PERSON,
    },
    letterTarget,
    letterStained,
    letterGray,
    personTarget,
    personBrought,
    personGray,
    landscapeTarget,
    landscapeStamped,
    landscapeStampGray,
    portraitFaded,
    portraitVivid,
    portraitGray,
  };
})();
