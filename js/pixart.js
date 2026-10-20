// Pixel-art engine: shapes are painted on an integer grid as materials, then every material is
// shaded the same way (light from the upper left, 4 tones: highlight, base, shade, outline) and
// outlined with its own darkest tone ("sel-out"), so heroes, items and scenes share one look.

// ---------- colors ----------
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255;
  const g = (n >> 8 & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  function f(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  let r = l;
  let g = l;
  let b = l;
  if (s) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1 / 3);
    g = f(p, q, h);
    b = f(p, q, h - 1 / 3);
  }
  function hx(v) { return Math.round(v * 255).toString(16).padStart(2, '0'); }
  return '#' + hx(r) + hx(g) + hx(b);
}
// four tones from one base color: highlight, base, shade (warmer, darker), outline
function tones(hex) {
  const hsl = hexToHsl(hex);
  const h = hsl[0];
  const s = hsl[1];
  const l = hsl[2];
  return [
    hslToHex(h - 0.01, Math.min(1, s * 0.95), Math.min(0.95, l + 0.16)),
    hex,
    hslToHex(h + 0.015, Math.min(1, s * 1.08), Math.max(0.06, l - 0.17)),
    hslToHex(h + 0.03, Math.min(1, s * 0.9), Math.max(0.04, l * 0.38)),
  ];
}

const PAL = {
  skin: ['#fff0df', '#f8cfae', '#dd9f80', '#7c4535'],
  white: ['#ffffff', '#efe9de', '#c8bdab', '#62574a'],
  gold: ['#fff2b0', '#efc355', '#bf892b', '#5e3f10'],
  pants: tones('#4b4660'),
  boot: tones('#3d302c'),
  red: ['#ff9a86', '#e0473f', '#a92927', '#4f1212'],
  pink: ['#ffd0d8', '#f2879a', '#cf566e', '#61202f'],
  jade: ['#c8f5d9', '#6fc79a', '#3a8f62', '#173e29'],
  steel: ['#ffffff', '#d4e0e9', '#93a8b8', '#33414d'],
  iron: tones('#6a7280'),
  wood: ['#efbe85', '#b97c45', '#84502c', '#3f2412'],
  bamboo: tones('#8fb35a'),
  straw: ['#fbe6a8', '#dcb760', '#a8812f', '#553f15'],
  paper: ['#ffffff', '#f3ece0', '#d3c6b2', '#6a5d4c'],
  leather: tones('#5a4038'),
  silver: ['#ffffff', '#dde3ea', '#a5b0bd', '#3f4955'],
};
const PIX_HAIR = { boy: tones('#3a3346'), girl: tones('#3e2a36') };
// pixels painted with an exact color, never shaded (eyes, mouth, blush, sparkles)
const FLAT = {
  lash: '#1b1216',
  iris: '#6a3a26',
  irisGirl: '#7a3550',
  shine: '#ffffff',
  mouth: '#a24a44',
  blush: '#f39a8e',
  sweat: '#7fc4f0',
};

// ---------- a grid of materials ----------
function Pix(w, h) {
  this.w = w;
  this.h = h;
  this.mat = new Array(w * h).fill(null);
  this.flat = new Array(w * h).fill(null);
}
Pix.prototype.set = function (x, y, m) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  this.mat[y * this.w + x] = m;
  this.flat[y * this.w + x] = null;
};
Pix.prototype.dot = function (x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  this.flat[y * this.w + x] = color;
};
Pix.prototype.rect = function (x, y, w, h, m) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) this.set(x + i, y + j, m);
  }
};
// filled ellipse, sampled at pixel centers
Pix.prototype.oval = function (cx, cy, rx, ry, m) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, m);
    }
  }
};
// filled polygon (even-odd), sampled at pixel centers
Pix.prototype.poly = function (pts, m) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
        xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    xs.sort(function (p, q) { return p - q; });
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, m);
    }
  }
};
// 1-px line (Bresenham), optionally thicker as a square brush
Pix.prototype.line = function (x0, y0, x1, y1, m, thick) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const t = thick || 1;
  while (true) {
    for (let j = 0; j < t; j++) {
      for (let i = 0; i < t; i++) this.set(x0 + i, y0 + j, m);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
};

// shade and outline every material, returning a color for each pixel of a (w+2) x (h+2) raster
// palettes: material name → [highlight, base, shade, outline]
Pix.prototype.render = function (palettes) {
  const w = this.w;
  const h = this.h;
  const mat = this.mat;
  const out = new Raster(w + 2, h + 2);
  function at(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? null : mat[y * w + x]; }

  for (let y = 0; y < h; y++) {
    // horizontal runs of one material: the right quarter is in shade, the leftmost pixel catches light
    let x = 0;
    while (x < w) {
      const m = mat[y * w + x];
      if (!m) { x++; continue; }
      let end = x;
      while (end + 1 < w && mat[y * w + end + 1] === m) end++;
      const len = end - x + 1;
      const shadeFrom = len >= 5 ? end - Math.floor(len / 4) + 1 : end + 1;
      for (let i = x; i <= end; i++) {
        const pal = palettes[m];
        let tone = 1;
        const below = at(i, y + 1);
        const above = at(i, y - 1);
        if (i >= shadeFrom || i === end && len > 1) tone = 2;
        if (below !== m) tone = 2;
        if (tone === 1 && (i === x || above !== m) && len > 2) tone = 0;
        // whatever sits on top of skin (hair, a hat) casts a shadow onto it
        if (m === 'skin' && above && above !== 'skin' && palettes[above]) tone = 2;
        out.set(i + 1, y + 1, pal[tone]);
      }
      x = end + 1;
    }
  }
  // sel-out: an outline one pixel outside, in each neighbour's own darkest tone
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (at(x, y)) continue;
      const n = at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1);
      if (n) out.set(x + 1, y + 1, palettes[n][3]);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = this.flat[y * w + x];
      if (f) out.set(x + 1, y + 1, f);
    }
  }
  return out;
};

// ---------- a grid of final colors ----------
function Raster(w, h) {
  this.w = w;
  this.h = h;
  this.px = new Array(w * h).fill(null);
}
Raster.prototype.set = function (x, y, c) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  this.px[y * this.w + x] = c;
};
Raster.prototype.get = function (x, y) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
  return this.px[y * this.w + x];
};
// copy src onto this raster at (dx, dy); rot: quarter turns clockwise, flipX mirrors first
Raster.prototype.blit = function (src, dx, dy, rot, flipX) {
  const r = ((rot || 0) % 4 + 4) % 4;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (!c) continue;
      let sx = flipX ? src.w - 1 - x : x;
      let sy = y;
      let tx = sx;
      let ty = sy;
      if (r === 1) { tx = src.h - 1 - sy; ty = sx; }
      else if (r === 2) { tx = src.w - 1 - sx; ty = src.h - 1 - sy; }
      else if (r === 3) { tx = sy; ty = src.w - 1 - sx; }
      this.set(dx + tx, dy + ty, c);
    }
  }
};
Raster.prototype.silhouette = function (color) {
  for (let i = 0; i < this.px.length; i++) {
    if (this.px[i]) this.px[i] = color;
  }
  return this;
};
// draw onto a canvas at an integer scale, crisp
Raster.prototype.paint = function (canvas, scale) {
  const s = scale || 1;
  canvas.width = this.w * s;
  canvas.height = this.h * s;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < this.h; y++) {
    for (let x = 0; x < this.w; x++) {
      const c = this.px[y * this.w + x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
};

// a small seeded random, so scenes look the same every time
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
