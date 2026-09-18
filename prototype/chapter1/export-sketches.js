const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

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

const AW = 64;
const AH = 88;
const CREAM = "#efe4c4";
const LETTERHEAD = "#c43c2e";
const LETTER_COLOR = { paper: CREAM, ink: INK, red: LETTERHEAD };
const LETTER_GRAY = { stain: 36, ink: 90, red: 150, paper: 220 };

function letterRoles(withStain) {
  const g = grid(AW, AH, "paper");
  if (withStain) {
    ellipse(g, 24, 54, 16, 9, "stain");
    ellipse(g, 18, 60, 11, 6, "stain");
    ellipse(g, 32, 58, 8, 5, "stain");
    ring(g, 22, 52, 7, 1.2, "stain");
    set(g, 38, 50, "stain");
    set(g, 40, 51, "stain");
  }
  rect(g, 8, 8, 3, 48, "red");
  text(g, 8, 16, "12 AUG", "ink", 5);
  text(g, 8, 28, "DEAR ANA", "ink", 5);
  text(g, 8, 40, "THE GARDEN", "ink", 5);
  text(g, 8, 50, "IS IN BLOOM", "ink", 5);
  text(g, 8, 60, "COME SOON", "ink", 5);
  signInk(g, 22, 70);
  return g;
}

function signInk(g, ox, oy) {
  const ink = "ink";
  function curve(pts) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      line(g, ox + x0, oy + y0, ox + x1, oy + y1, ink);
    }
  }
  // 起笔小钩 → 大回环（像花体首字母）
  curve([
    [2, 8],
    [4, 5],
    [8, 3],
    [12, 5],
    [13, 9],
    [10, 12],
    [6, 11],
    [5, 7],
    [9, 4],
    [14, 6],
    [16, 13],
  ]);
  curve([
    [13, 8],
    [12, 14],
    [8, 16],
    [4, 14],
    [3, 10],
  ]);
  // 连笔小波（不像三角峰，像 m 的圆肩）
  curve([
    [16, 13],
    [18, 9],
    [21, 13],
    [23, 8],
    [26, 13],
    [28, 10],
    [31, 14],
    [34, 11],
    [36, 15],
  ]);
  // 长尾甩出再反划穿过名字
  curve([
    [36, 15],
    [38, 12],
    [40, 16],
    [37, 17],
  ]);
  curve([
    [1, 15],
    [12, 17],
    [24, 16],
    [35, 18],
    [32, 14],
  ]);
  curve([
    [7, 2],
    [18, 14],
  ]);
}
function letterTarget() {
  return letterRoles(false).map((row) => row.map((r) => LETTER_COLOR[r] || CREAM));
}
function letterGray() {
  return letterRoles(true).map((row) => row.map((r) => grayHex(LETTER_GRAY[r] ?? 220)));
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
function meadowY(x) {
  const t = x / 63;
  const bowl = 50 + 8 * Math.cos(t * Math.PI * 2) + 3 * Math.cos(t * Math.PI * 6);
  return Math.round(bowl + (x % 4 === 0 ? 1 : 0));
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
function personGray() {
  const p = personRoles();
  const g = grid(N, N, grayHex(220));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (y >= meadowY(x) && !p[y][x]) g[y][x] = grayHex(36);
      if (p[y][x]) g[y][x] = grayHex(PERSON_GRAY[p[y][x]]);
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

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePng(file, pixels) {
  const raw = Buffer.alloc((N * 3 + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (N * 3 + 1)] = 0;
    for (let x = 0; x < N; x++) {
      const [r, g, b] = hexToRgb(pixels[y][x]);
      const o = y * (N * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

function nearestScale(src, scale) {
  const h = src.length * scale;
  const w = src[0].length * scale;
  const out = Array.from({ length: h }, () => Array(w));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y][x] = src[Math.floor(y / scale)][Math.floor(x / scale)];
  }
  return out;
}

const dir = path.join(__dirname, "sketches");
fs.mkdirSync(dir, { recursive: true });

const roles = portraitRoles();
const images = {
  "a-left": letterTarget(),
  "a-gray": letterGray(),
  "b-left": personTarget(),
  "b-gray": personGray(),
  "c-left": landscapeRoles(false).map((row) => row.map((r) => LAND_COLOR[r] || SKY)),
  "c-gray": landscapeRoles(true).map((row) => row.map((r) => grayHex(LAND_GRAY[r]))),
  "d-left": roles.map((row) => row.map((r) => PORTRAIT_FADE[r])),
  "d-gray": roles.map((row) => row.map((r) => grayHex(PORTRAIT_GRAY[r]))),
  "d-win": roles.map((row) => row.map((r) => PORTRAIT_VIVID[r])),
};

const SCALE = 6;
for (const [name, pix] of Object.entries(images)) {
  const big = nearestScale(pix, SCALE);
  const h = big.length;
  const w = big[0].length;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = hexToRgb(big[y][x]);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(dir, `${name}.png`), png);
}

console.log("wrote", Object.keys(images).length, "pngs to", dir);
