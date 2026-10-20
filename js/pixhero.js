// Pixel 俠客, items and the scene, built on pixart.js. Items are 24 x 24 grids drawn on the diagonal
// (grip low left, tip high right); the hero is a 40 x 50 grid facing right; the scene tile is 72 x 54.

// ---------- items ----------
// a point along the item's diagonal: u from grip (0) to tip (1), v across it
function along(u, v) {
  const k = 0.7071;
  return [3 + 18 * u + v * k, 20 - 18 * u + v * k];
}
function strip(px, u0, u1, half, m) {
  px.poly([along(u0, -half), along(u1, -half), along(u1, half), along(u0, half)], m);
}

const PIX_ITEMS = {
  jian: function (px) {
    strip(px, 0.24, 0.9, 1.7, 'steel');
    px.poly([along(0.9, -1.7), along(1.02, 0), along(0.9, 1.7)], 'steel');
    px.line(along(0.28, 0)[0], along(0.28, 0)[1], along(0.88, 0)[0], along(0.88, 0)[1], 'iron');
    strip(px, 0.19, 0.24, 4.2, 'gold');
    strip(px, 0.02, 0.19, 1.3, 'red');
    px.oval(along(0, 0)[0], along(0, 0)[1], 1.6, 1.6, 'gold');
    px.line(2, 21, 1, 23, 'red');
  },
  spear: function (px) {
    strip(px, -0.08, 0.74, 0.9, 'wood');
    for (const c of [[0.62, -1.6], [0.6, 1.6], [0.66, 0]]) {
      const p = along(c[0], c[1]);
      px.oval(p[0], p[1], 2, 2, 'red');
    }
    strip(px, 0.72, 0.77, 1.8, 'gold');
    px.poly([along(0.77, -2), along(0.86, -2.2), along(1.04, 0), along(0.86, 2.2), along(0.77, 2)], 'steel');
  },
  fan: function (px) {
    const cx = 4.5;
    const cy = 19.5;
    const r = 17.5;
    // pleats: wedges alternating between two paper tones
    for (let a = -84; a < -6; a += 9) {
      const pts = [[cx, cy]];
      for (let k = 0; k <= 3; k++) {
        const t = (a + k * 3) * Math.PI / 180;
        pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
      }
      px.poly(pts, ((a + 84) / 9) % 2 ? 'paper' : 'paper2');
    }
    for (let a = -84; a <= -6; a += 1.5) {
      const t = a * Math.PI / 180;
      px.set(cx + Math.cos(t) * (r - 0.5), cy + Math.sin(t) * (r - 0.5), 'iron');
    }
    px.oval(12.5, 10.5, 2.6, 2.6, 'red');
    px.oval(cx, cy, 1.7, 1.7, 'gold');
  },
};
const pixItemCache = {};
function pixItem(id) {
  if (!pixItemCache[id]) {
    const px = new Pix(24, 24);
    PIX_ITEMS[id](px);
    pixItemCache[id] = px.render(Object.assign({ paper2: tones('#ddd3c2') }, PAL));
  }
  return pixItemCache[id];
}

// ---------- the hero ----------
// look: { robe, belt, gear, cape } from TITLES; gender 'boy' | 'girl'
function heroPalettes(look, gender) {
  const p = Object.assign({}, PAL);
  p.hair = PIX_HAIR[gender];
  p.robe = tones(look.robe);
  p.robe2 = tones(tones(look.robe)[2]);
  p.belt = tones(gender === 'girl' && look.belt === '#5A4632' ? '#E0B957' : look.belt);
  if (look.cape) p.cape = tones(look.cape);
  return p;
}

// pose: { bob, blink, sweat } — bob lowers the upper body a pixel, blink closes the eyes.
// stage: the title index; higher titles add shoulder guards, a ponytail, gold trim and hair ornaments.
function pixHeroBody(look, gender, pose, stage) {
  const px = new Pix(40, 50);
  const girl = gender === 'girl';
  const b = pose.bob || 0;
  const st = stage || 0;

  // a high ponytail for the boy from 大俠 up, behind everything
  if (!girl && st >= 8) px.poly([[13, 2 + b], [9, 3 + b], [5, 9 + b], [5, 18 + b], [7, 12 + b], [10, 8 + b], [13, 6 + b]], 'hair');

  if (look.cape) px.poly([[11, 21 + b], [26, 21 + b], [30, 41], [6, 41]], 'cape');
  if (girl) px.poly([[9, 11 + b], [15, 11 + b], [15, 30 + b], [10, 31 + b], [7, 24 + b]], 'hair');

  // legs and footwear
  if (girl) {
    px.rect(13, 44, 4, 3, 'red');
    px.rect(20, 44, 4, 3, 'red');
  } else {
    px.rect(13, 39, 4, 6, 'pants');
    px.rect(20, 39, 4, 6, 'pants');
    px.rect(12, 44, 5, 4, 'boot');
    px.rect(17, 46, 1, 2, 'boot');
    px.rect(19, 44, 5, 4, 'boot');
    px.rect(24, 46, 1, 2, 'boot');
  }

  // back sleeve and hand
  px.poly([[9, 22 + b], [13, 22 + b], [13, 30 + b], [9, 31 + b]], 'robe2');
  px.oval(10.6, 31.4 + b, 1.7, 1.7, 'skin');

  // robe: torso, skirt (long for the girl), crossed white collar, belt or sash
  px.poly([[12, 21 + b], [25, 21 + b], [26, 31 + b], [11, 31 + b]], 'robe');
  if (girl) px.poly([[11, 30 + b], [26, 30 + b], [29, 45], [8, 45]], 'robe');
  else px.poly([[11, 30 + b], [26, 30 + b], [28, 39], [9, 39]], 'robe');
  px.poly([[15.5, 21 + b], [21.5, 21 + b], [18.5, 25.5 + b]], 'white');
  px.line(18, 31 + b, 18, girl ? 44 : 38, 'white');
  px.rect(11, 28 + b, 16, 2, 'belt');
  if (st >= 9) {
    if (girl) px.line(9, 44, 28, 44, 'gold');
    else px.line(10, 38, 27, 38, 'gold');
  }
  if (girl) {
    px.oval(18.5, 29 + b, 1.8, 1.6, 'pink');
    px.line(17, 31 + b, 16, 36 + b, 'pink');
    px.line(20, 31 + b, 21, 36 + b, 'pink');
  } else {
    px.rect(18, 28 + b, 2, 2, 'gold');
  }

  // front sleeve and hand (the weapon goes in this hand)
  if (girl) px.poly([[24, 22 + b], [28, 22 + b], [30, 31 + b], [25, 32 + b]], 'robe2');
  else px.poly([[24, 22 + b], [27, 22 + b], [29, 29 + b], [26, 30 + b]], 'robe2');
  px.oval(28.6, 30.6 + b, 1.8, 1.8, 'skin');
  // silver shoulder guards from 成名高手 up
  if (st >= 7) {
    px.oval(11.6, 22.6 + b, 2.2, 1.8, 'silver');
    px.oval(25.6, 22.4 + b, 2.8, 2.1, 'silver');
  }

  // neck, head: hair cap, face low and forward, ear, fringe
  px.rect(17, 19 + b, 4, 3, 'skin');
  px.oval(18.5, 12 + b, 8.8, 8.2, 'hair');
  if (girl) {
    px.oval(11.5, 4.5 + b, 3.2, 3, 'hair');
    px.oval(24.5, 4 + b, 3.2, 3, 'hair');
  } else {
    px.oval(14, 3.6 + b, 2.8, 2.6, 'hair');
  }
  px.oval(21, 14.6 + b, 6.4, 5.9, 'skin');
  px.oval(13.6, 14.6 + b, 1.4, 1.9, 'skin');
  if (girl) {
    px.poly([[12, 7 + b], [27.5, 8 + b], [27.5, 11 + b], [26, 10.6 + b], [24.5, 11.6 + b], [22.5, 10.4 + b], [21, 11.6 + b], [19.2, 10.4 + b], [17.6, 11.8 + b], [16, 10.4 + b], [15, 13 + b], [12, 13 + b]], 'hair');
    px.poly([[14.6, 12 + b], [16.2, 12 + b], [15.6, 20 + b], [14, 19 + b]], 'hair');
  } else {
    px.poly([[12, 7 + b], [27.5, 8 + b], [27.5, 11.4 + b], [26, 10 + b], [24.8, 12 + b], [23, 10 + b], [21.4, 12.2 + b], [19.8, 10 + b], [18.2, 12 + b], [16.6, 10 + b], [15.2, 12.6 + b], [12, 13 + b]], 'hair');
  }

  // hair ornaments for the girl: a flower from 入門弟子, gold pins from 一方豪傑
  if (girl && st >= 2) {
    px.oval(9.6, 3.2 + b, 1.5, 1.5, 'pink');
    px.dot(10, 3 + b, '#fff3b0');
  }
  if (girl && st >= 9) px.line(23, 2 + b, 29, 0 + b, 'gold');

  // title gear on the head
  const g = look.gear;
  if (g === 'band' || g === 'bandTails' || g === 'goldBand') {
    const m = g === 'goldBand' ? 'gold' : 'red';
    px.rect(11, 9 + b, 17, 2, m);
    if (g !== 'goldBand') {
      px.line(11, 10 + b, 7, 12 + b, m);
      px.line(10, 11 + b, 7, 15 + b, m);
      if (g === 'bandTails') {
        px.line(7, 12 + b, 3, 13 + b, m);
        px.line(7, 15 + b, 4, 18 + b, m);
      }
    }
  } else if (g === 'hat') {
    px.poly([[18.5, 0], [32, 9.5 + b], [5, 9.5 + b]], 'straw');
    px.rect(5, 9 + b, 27, 1, 'straw');
  } else if (g === 'topknot') {
    px.line(10, 4 + b, 18, 3 + b, 'gold');
  } else if (g === 'jadeCrown' || g === 'crown') {
    const m = g === 'crown' ? 'gold' : 'jade';
    px.poly([[14, 5 + b], [14.5, 0.5 + b], [16.5, 2.5 + b], [18.5, 0 + b], [20.5, 2.5 + b], [22.5, 0.5 + b], [23, 5 + b]], m);
  }

  // the face, placed by hand
  const ey = 14 + b;
  if (pose.blink) {
    for (const x of [18, 19, 23, 24]) px.dot(x, ey + 1, FLAT.lash);
  } else {
    const iris = girl ? FLAT.irisGirl : FLAT.iris;
    px.dot(23, ey, FLAT.lash); px.dot(24, ey, FLAT.lash);
    px.dot(23, ey + 1, FLAT.shine); px.dot(24, ey + 1, FLAT.lash);
    px.dot(23, ey + 2, iris); px.dot(24, ey + 2, iris);
    px.dot(18, ey, FLAT.lash); px.dot(19, ey, FLAT.lash);
    px.dot(18, ey + 1, FLAT.shine); px.dot(19, ey + 1, FLAT.lash);
    px.dot(18, ey + 2, iris); px.dot(19, ey + 2, iris);
    if (girl) {
      px.dot(25, ey - 1, FLAT.lash);
      px.dot(17, ey - 1, FLAT.lash);
    }
  }
  if (!girl) {
    px.dot(22, ey - 1, FLAT.lash); px.dot(23, ey - 1, FLAT.lash); px.dot(24, ey - 2, FLAT.lash); px.dot(25, ey - 2, FLAT.lash);
    px.dot(17, ey - 2, FLAT.lash); px.dot(18, ey - 2, FLAT.lash); px.dot(19, ey - 1, FLAT.lash); px.dot(20, ey - 1, FLAT.lash);
  }
  px.dot(22, ey + 4, FLAT.mouth);
  if (girl) px.dot(23, ey + 4, FLAT.mouth);
  px.dot(25, ey + 3, FLAT.blush); px.dot(26, ey + 3, FLAT.blush);
  px.dot(16, ey + 3, FLAT.blush);
  if (pose.sweat) {
    px.dot(27, ey - 3, FLAT.sweat);
    px.dot(27, ey - 2, FLAT.sweat);
  }
  return px.render(heroPalettes(look, gender));
}

// the hero with a weapon: returns a 64 x 54 raster, feet at y 51
function pixHero(look, gender, weapon, pose, stage) {
  const out = new Raster(64, 54);
  const body = pixHeroBody(look, gender, pose, stage);
  const b = pose.bob || 0;
  if (weapon && PIX_ITEMS[weapon]) {
    // grip of the 24 x 24 item (at 4, 21 after outline) sits in the front hand (29, 31 of the body)
    out.blit(pixItem(weapon), 8 + 30 - 4, 2 + 32 + b - 21, 0, false);
  }
  out.blit(body, 8, 2, 0, false);
  return out;
}

// ---------- scene: misty trees, a grass field, a dirt path, a blossoming tree ----------
function pixScene(seed, night) {
  const rnd = seeded(seed || 7);
  const w = 72;
  const h = 54;
  const out = new Raster(w, h);
  const sky = night ? ['#28304a', '#323b58'] : ['#c9d8b6', '#dfe8cf'];
  const far = night ? ['#26402f', '#2f4d37'] : ['#6f9455', '#7fa562'];
  const grass = night ? ['#35553a', '#3e6243', '#2c4731'] : ['#7fae4a', '#8fbd55', '#6d983f'];
  const path = night ? ['#6b5a44', '#7a684f'] : ['#d6b878', '#e2c78c'];
  const mist = night ? ['#2c3550', '#36405e'] : ['#b7cc9e', '#c6d8ae'];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c;
      const back = 9 + Math.round(Math.sin(x * 0.22 + 1) * 2.5 + Math.sin(x * 0.7) * 1);
      const front = 16 + Math.round(Math.sin(x * 0.31) * 2 + Math.sin(x * 0.95 + 2) * 1.2);
      if (y < back) c = sky[(x + y) % 2 && y > back - 3 ? 1 : 0];
      else if (y < front - 3) c = mist[(x + y) % 2 && y > front - 6 ? 1 : 0];
      else if (y < front) c = far[(x * 3 + y) % 4 === 0 ? 1 : 0];
      else c = grass[1];
      out.set(x, y, c);
    }
  }
  // grass tufts and darker patches
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * w);
    const y = 16 + Math.floor(rnd() * (h - 16));
    out.set(x, y, grass[2]);
    out.set(x, y - 1, grass[0]);
    if (rnd() < 0.5) out.set(x + 1, y, grass[2]);
  }
  // small flowers in the grass
  const petals = night ? ['#c9c3a0', '#b7a0b5'] : ['#fff6d8', '#f6b8c6', '#ffe38a'];
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(rnd() * (w - 4));
    const y = 20 + Math.floor(rnd() * 20);
    out.set(x, y, petals[i % petals.length]);
  }
  // a dirt path along the bottom
  for (let x = 0; x < w; x++) {
    const top = 44 + Math.round(Math.sin(x * 0.12) * 1.5);
    for (let y = top; y < h; y++) out.set(x, y, path[(x + y) % 3 === 0 ? 1 : 0]);
    out.set(x, top - 1, grass[2]);
  }
  // a blossoming tree on the right, shaded and outlined like everything else
  const tree = new Pix(28, 34);
  tree.line(16, 33, 15, 18, 'wood', 2);
  tree.line(15, 22, 9, 14, 'wood');
  tree.line(16, 20, 22, 12, 'wood');
  for (const c of [[14, 9, 6], [8, 12, 4.5], [21, 9, 5], [24, 15, 3.5], [11, 6, 4], [18, 5, 4]]) tree.oval(c[0], c[1], c[2], c[2] * 0.85, 'blossom');
  const treePal = Object.assign({}, PAL, { blossom: night ? tones('#b0404a') : tones('#e2565c') });
  out.blit(tree.render(treePal), 42, 6, 0, false);
  const stone = new Pix(9, 6);
  stone.oval(4.5, 3.5, 4.2, 2.8, 'stone');
  out.blit(stone.render({ stone: night ? tones('#5d6474') : tones('#a3a8b0') }), 2, 38, 0, false);
  return out;
}

// the tile the game shows: scene, the hero standing on the path, a soft ground shadow
function pixTile(look, gender, weapon, pose, night, stage) {
  const out = pixScene(11, night);
  // the ground under the feet, one shade darker
  for (let x = 13; x <= 35; x++) {
    for (const y of [48, 49, 50]) {
      if ((y === 48 || y === 50) && (x < 16 || x > 32)) continue;
      out.set(x, y, tones(out.get(x, y))[2]);
    }
  }
  out.blit(pixHero(look, gender, weapon, pose, stage), 2, -1, 0, false);
  return out;
}
