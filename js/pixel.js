// Pixel 俠客: drawn on a 48x36 canvas and shown scaled up with image-rendering: pixelated.

// Titles, items and slots are defined in hero.js; this file only draws the pixel style.

const AV_W = 48;
const AV_H = 36;
const AV_CX = 19;
const AV_GY = 32;
const PX = {
  skin: '#F2C49B',
  hair: '#2B2522',
  pants: '#4A4038',
  blush: '#E8968A',
  collar: '#F6F1E6',
  sweat: '#5FA8E0',
  straw: '#C9A35A',
  strawDark: '#8C6B32',
  band: '#C8463F',
  gold: '#E0B957',
  jade: '#4FA37A',
  aura: '#F2C84B',
};

// hand / back are offsets from (center, ground); ang is the weapon direction in degrees (0 = right, -90 = up)
const POSES = {
  stand: { b: 0, j: 0, s: 0, hand: [5, -13], back: [-6, -12], ang: -55, backAng: -125 },
  bob: { b: 1, j: 0, s: 0, hand: [5, -12], back: [-6, -11], ang: -50, backAng: -120 },
  raise: { b: 0, j: 0, s: 1, hand: [4, -21], back: [-7, -14], ang: -110, backAng: -70 },
  thrust: { b: 0, j: 0, s: 1, hand: [9, -16], back: [-8, -16], ang: -5, backAng: 185, fx: 'slash' },
  sweep: { b: 1, j: 0, s: 1, hand: [7, -10], back: [-7, -15], ang: 35, backAng: 145, fx: 'slash' },
  jump: { b: 0, j: 4, s: 0, hand: [5, -24], back: [-7, -24], ang: -80, backAng: -100, fx: 'spark', smile: true },
  hurt: { b: 1, j: 0, s: 0, hand: [4, -11], back: [-5, -11], ang: 25, backAng: -150, fx: 'sweat' },
};
const IDLE_SEQ = ['stand', 'stand', 'bob', 'bob', 'stand', 'stand', 'bob', 'bob', 'raise', 'thrust', 'thrust', 'sweep', 'sweep', 'stand', 'bob', 'bob'];
const ACTIONS = {
  attack: ['raise', 'thrust', 'sweep', 'stand'],
  cheer: ['jump', 'jump', 'stand', 'jump', 'jump', 'stand'],
  hurt: ['hurt', 'hurt', 'hurt', 'hurt', 'stand'],
};

function pxRect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

// 2-px-wide Bresenham line, for sleeves
function pxThickLine(ctx, x0, y0, x1, y1, c) {
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (true) {
    ctx.fillRect(x, y, 2, 2);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function drawWeapon(ctx, id, hx, hy, angDeg) {
  if (!id) return;
  const a = angDeg * Math.PI / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const ox = hx + 1;
  const oy = hy + 1;
  function dot(k, off, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(ox + dx * k - dy * off), Math.round(oy + dy * k + dx * off), 1, 1);
  }
  function span(k0, k1, off, c) {
    for (let k = k0; k <= k1; k += 0.7) dot(k, off, c);
  }

  if (id === 'wood') {
    span(-1, 0, 0, '#6B4A2A');
    for (const o of [-1, 0, 1]) dot(1, o, '#6B4A2A');
    span(2, 10, 0, '#B07A45');
    dot(11, 0, '#D7A56E');
  } else if (id === 'staff') {
    span(-7, 10, 0, '#8DA35A');
    for (const k of [-4, 1, 6]) dot(k, 0, '#5E7A36');
  } else if (id === 'fan') {
    for (let k = 1; k <= 6; k++) {
      const w = Math.floor(k * 0.7);
      for (let o = -w; o <= w; o++) {
        const edge = o === -w || o === w;
        dot(k, o, edge ? '#5F6B76' : '#AEB8C2');
      }
    }
  } else if (id === 'brush') {
    span(-2, 7, 0, '#8E5A34');
    dot(8, 0, '#E0B957');
    span(9, 11, 0, '#2B2522');
    dot(9, -1, '#2B2522');
    dot(9, 1, '#2B2522');
  } else if (id === 'whip') {
    span(-1, 1, 0, '#3B2A20');
    for (let k = 2; k <= 15; k++) dot(k, Math.round(Math.sin(k * 0.9) * 1.5), '#8E5A34');
  } else if (id === 'emei') {
    span(-4, 6, 0, '#C5CCD2');
    dot(-5, 0, '#FFFFFF');
    dot(7, 0, '#FFFFFF');
    dot(0, -1, '#C9A03A');
    dot(0, 1, '#C9A03A');
  } else if (id === 'spear') {
    span(-4, 12, 0, '#7A5230');
    span(13, 15, 0, '#E3E8EE');
    dot(13, -1, '#E3E8EE');
    dot(13, 1, '#E3E8EE');
    dot(12, -1, '#C8463F');
    dot(12, 1, '#C8463F');
    dot(11, 1, '#C8463F');
    dot(11, 2, '#C8463F');
  } else if (id === 'ring') {
    span(-1, 1, 0, '#6B4A2A');
    for (const o of [-1, 0, 1, 2]) dot(2, o, '#C9A03A');
    span(3, 10, 0, '#DDE3EA');
    span(3, 9, 1, '#B9C2CC');
    for (const k of [4, 6, 8]) dot(k, -1, '#C9A03A');
  } else if (id === 'hammer') {
    for (let k = 0; k <= 9; k += 1.4) dot(k, 0, '#9AA4AE');
    for (let k = 10; k <= 12; k++) {
      for (const o of [-1, 0, 1]) dot(k, o, '#5F6B76');
    }
    dot(11, 0, '#AEB8C2');
  } else if (id === 'guandao') {
    span(-7, 10, 0, '#3E6B4E');
    dot(10, -1, '#C8463F');
    span(11, 15, 0, '#DDE3EA');
    span(11, 14, 1, '#DDE3EA');
    span(12, 14, 2, '#B9C2CC');
  } else if (id === 'umbrella') {
    // 油紙傘, closed: a red canopy folded around the shaft, ribs in a darker red
    span(-2, 2, 0, '#6B4A2A');
    for (let k = 3; k <= 10; k++) {
      const w = k < 9 ? 1 : 0;
      for (let o = -w; o <= w; o++) dot(k, o, o === 0 ? '#D0473F' : '#9E2F2A');
    }
    dot(11, 0, '#3B2A20');
  } else if (id === 'whisk') {
    // 拂塵: a wooden handle and a spreading tail of white horsehair
    span(-1, 4, 0, '#8E5A34');
    dot(5, 0, '#E0B957');
    for (let k = 6; k <= 12; k++) {
      const w = k < 8 ? 1 : 2;
      for (let o = -w; o <= w; o++) dot(k, o, (k + o) % 2 ? '#F4F1EA' : '#C9C2B4');
    }
  } else if (id === 'flute') {
    // 玉笛: a jade flute with finger holes and a red tassel
    span(-3, 9, 0, '#4FA37A');
    for (const k of [2, 4, 6, 8]) dot(k, 0, '#2E6B4E');
    dot(-3, 0, '#E0B957');
    dot(-4, 1, '#C8463F');
    dot(-5, 2, '#C8463F');
  } else if (id === 'dao') {
    // 柳葉刀: a willow-leaf saber, widest in the middle of the blade
    dot(-2, 1, '#C8463F');
    span(-1, 0, 0, '#3B2A20');
    for (const o of [-1, 0, 1]) dot(1, o, '#C9A03A');
    span(2, 11, 0, '#DDE3EA');
    span(4, 9, 1, '#B9C2CC');
    dot(12, 0, '#FFFFFF');
  } else if (id === 'jian') {
    // 青鋼劍: a straight two-edged sword, blue-grey steel with a light and a dark edge
    dot(-3, 0, '#E0B957');
    span(-2, 0, 0, '#2B4A66');
    for (const o of [-1, 0, 1]) dot(1, o, '#E0B957');
    span(2, 12, 0, '#CFE0EE');
    span(2, 11, 1, '#7FA6C4');
    dot(13, 0, '#FFFFFF');
  } else if (id === 'halberd') {
    // 方天畫戟: a long red shaft, a spear point and a crescent blade on each side
    span(-7, 11, 0, '#7A2A26');
    dot(9, 1, '#C8463F');
    dot(9, 2, '#C8463F');
    dot(10, 0, '#D9A441');
    for (const o of [-2, -1, 1, 2]) dot(11, o, '#C5CCD2');
    for (const o of [-2, 2]) {
      dot(10, o, '#C5CCD2');
      dot(12, o, '#C5CCD2');
    }
    span(12, 15, 0, '#E3E8EE');
    dot(16, 0, '#FFFFFF');
  } else if (id === 'zhanlu') {
    span(-1, 0, 0, '#3B2A20');
    for (const o of [-1, 0, 1]) dot(1, o, '#C9A03A');
    span(2, 11, 0, '#A9C8F5');
    dot(12, 0, '#FFFFFF');
  } else if (id === 'gan') {
    span(-1, 0, 0, '#3B2A20');
    for (const o of [-1, 0, 1]) dot(1, o, '#3B2A20');
    span(2, 10, 0, '#7E8A99');
    dot(11, 0, '#AEB8C2');
  } else if (id === 'mo') {
    span(-1, 0, 0, '#3B2A20');
    for (const o of [-1, 0, 1]) dot(1, o, '#C9A03A');
    span(2, 10, 0, '#E5E9EE');
    dot(11, 0, '#FFFFFF');
  }
}

function drawGear(ctx, gear, cx, ht, f) {
  if (gear === 'band' || gear === 'bandTails') {
    pxRect(ctx, cx - 4, ht + 2, 8, 1, PX.band);
  }
  if (gear === 'bandTails') {
    pxRect(ctx, cx - 5, ht + 2, 1, 1, PX.band);
    pxRect(ctx, cx - 6, ht + 2 + f, 1, 1, PX.band);
    pxRect(ctx, cx - 7, ht + 3 + f, 1, 1, PX.band);
  }
  if (gear === 'topknot') {
    pxRect(ctx, cx - 4, ht - 2, 4, 1, PX.gold);
  }
  if (gear === 'goldBand') {
    pxRect(ctx, cx - 4, ht + 2, 8, 1, PX.gold);
    pxRect(ctx, cx - 5, ht + 3, 1, 3, PX.hair);
  }
  if (gear === 'hat') {
    pxRect(ctx, cx - 2, ht - 2, 4, 1, PX.straw);
    pxRect(ctx, cx - 4, ht - 1, 8, 1, PX.straw);
    pxRect(ctx, cx - 6, ht, 12, 1, PX.straw);
    pxRect(ctx, cx - 7, ht + 1, 14, 1, PX.strawDark);
  }
  if (gear === 'jadeCrown') {
    pxRect(ctx, cx - 2, ht - 3, 4, 3, PX.jade);
    pxRect(ctx, cx - 1, ht - 2, 2, 1, PX.gold);
    pxRect(ctx, cx - 4, ht + 2, 8, 1, PX.jade);
  }
  if (gear === 'crown') {
    pxRect(ctx, cx - 2, ht - 3, 4, 3, PX.gold);
    pxRect(ctx, cx - 1, ht - 2, 2, 1, PX.band);
    pxRect(ctx, cx - 4, ht + 2, 8, 1, PX.gold);
  }
}

// head accessory
function drawHeadAcc(ctx, id, cx, ht, f) {
  if (id === 'flower') {
    // 小紅花 behind the ear
    const x = cx - 5;
    const y = ht + 1;
    pxRect(ctx, x, y - 1, 1, 1, '#E5484D');
    pxRect(ctx, x - 1, y, 1, 1, '#E5484D');
    pxRect(ctx, x + 1, y, 1, 1, '#E5484D');
    pxRect(ctx, x, y + 1, 1, 1, '#E5484D');
    pxRect(ctx, x, y, 1, 1, '#F6D365');
  } else if (id === 'feather') {
    // 雉雞翎: two banded pheasant plumes sweeping back, the tips sway
    const long = [[-2, -1], [-3, -2], [-4, -3], [-5, -4], [-6, -4], [-7, -5 + f], [-8, -5 + f]];
    const short = [[0, -1], [0, -2], [-1, -3], [-2, -4], [-3, -5 + f], [-4, -5 + f]];
    long.forEach(function (d, i) { pxRect(ctx, cx + d[0], ht + d[1], 1, 1, i % 2 ? '#5A4632' : '#C9822E'); });
    short.forEach(function (d, i) { pxRect(ctx, cx + d[0], ht + d[1], 1, 1, i % 2 ? '#C9822E' : '#5A4632'); });
  } else if (id === 'hairpin') {
    // 玉簪: a white pin through the hair with a jade bead
    pxRect(ctx, cx - 5, ht, 1, 1, '#4FA37A');
    pxRect(ctx, cx - 4, ht - 1, 1, 1, '#7FC9A0');
    pxRect(ctx, cx - 3, ht - 1, 1, 1, '#F0EEE6');
    pxRect(ctx, cx - 2, ht - 2, 1, 1, '#F0EEE6');
    pxRect(ctx, cx - 1, ht - 3, 1, 1, '#F0EEE6');
  } else if (id === 'bellband') {
    // 金鈴髮帶: a red band with gold bells on the trailing ends
    pxRect(ctx, cx - 4, ht + 2, 8, 1, '#C8463F');
    pxRect(ctx, cx - 5, ht + 2, 1, 1, '#C8463F');
    pxRect(ctx, cx - 6, ht + 3 + f, 1, 1, '#C8463F');
    pxRect(ctx, cx - 7, ht + 4 + f, 1, 1, '#E0B957');
    pxRect(ctx, cx - 5, ht + 4, 1, 1, '#E0B957');
  } else if (id === 'phoenix') {
    // 鳳冠: a gold crown with a red jewel, blue kingfisher inlays and pearl strings
    pxRect(ctx, cx - 4, ht - 1, 8, 1, '#E0B957');
    pxRect(ctx, cx - 4, ht - 2, 1, 1, '#E0B957');
    pxRect(ctx, cx - 1, ht - 3, 2, 2, '#E0B957');
    pxRect(ctx, cx + 3, ht - 2, 1, 1, '#E0B957');
    pxRect(ctx, cx - 1, ht - 2, 1, 1, '#C8463F');
    pxRect(ctx, cx - 3, ht - 2, 1, 1, '#3F6FB0');
    pxRect(ctx, cx + 2, ht - 2, 1, 1, '#3F6FB0');
    pxRect(ctx, cx + 4, ht, 1, 1, '#F4F1EA');
    pxRect(ctx, cx + 4, ht + 2 + f, 1, 1, '#F4F1EA');
    pxRect(ctx, cx - 5, ht, 1, 1, '#F4F1EA');
    pxRect(ctx, cx - 5, ht + 2 + f, 1, 1, '#F4F1EA');
  }
}
// these take the place of the title's own headgear; the others only push off the straw hat
const HEADGEAR_ACC = ['bellband', 'phoenix'];

// back accessory, drawn behind the body
function drawBackAcc(ctx, id, cx, gy, b) {
  if (id === 'scroll') {
    // 書卷 slung across the back, sticking out over the left shoulder
    pxThickLine(ctx, cx - 11, gy - 21 + b, cx - 3, gy - 15 + b, '#E9DFC6');
    pxRect(ctx, cx - 12, gy - 22 + b, 2, 3, '#8E5A34');
    pxRect(ctx, cx - 9, gy - 20 + b, 1, 2, '#C8463F');
  } else if (id === 'swordbox') {
    // 劍匣: a wooden box with gold corners and a hilt showing at the top
    pxRect(ctx, cx - 8, gy - 22 + b, 4, 13, '#5A3A22');
    pxRect(ctx, cx - 8, gy - 22 + b, 4, 1, '#C9A03A');
    pxRect(ctx, cx - 8, gy - 10 + b, 4, 1, '#C9A03A');
    pxRect(ctx, cx - 7, gy - 17 + b, 1, 3, '#8E5A34');
    pxRect(ctx, cx - 7, gy - 24 + b, 1, 2, '#3B2A20');
    pxRect(ctx, cx - 7, gy - 25 + b, 1, 1, '#C9A03A');
  }
}

// waist accessory, drawn over the robe at the belt
function drawAcc(ctx, id, cx, beltY) {
  if (id === 'bell') {
    pxRect(ctx, cx + 2, beltY + 1, 2, 2, '#E0B957');
    pxRect(ctx, cx + 2, beltY + 3, 1, 1, '#8C6B32');
  } else if (id === 'gourd') {
    pxRect(ctx, cx - 3, beltY + 1, 2, 1, '#C9822E');
    pxRect(ctx, cx - 4, beltY + 2, 3, 2, '#D9963A');
    pxRect(ctx, cx - 2, beltY, 1, 1, '#B23A2E');
  } else if (id === 'jade') {
    pxRect(ctx, cx, beltY + 1, 2, 2, PX.jade);
    pxRect(ctx, cx, beltY + 3, 1, 2, '#C8463F');
  } else if (id === 'sachet') {
    // 香包: a small pink bag on a gold cord with a red tassel
    pxRect(ctx, cx - 3, beltY + 1, 1, 1, '#C9A03A');
    pxRect(ctx, cx - 4, beltY + 2, 3, 2, '#E86F9A');
    pxRect(ctx, cx - 3, beltY + 2, 1, 1, '#F6B8C6');
    pxRect(ctx, cx - 3, beltY + 4, 1, 1, '#C8463F');
  } else if (id === 'pouch') {
    // 錦囊: a red brocade pouch with a gold pattern and a tied neck
    pxRect(ctx, cx + 1, beltY + 1, 3, 1, '#8C6B32');
    pxRect(ctx, cx + 1, beltY + 2, 3, 3, '#B8322A');
    pxRect(ctx, cx + 2, beltY + 3, 1, 1, '#E0B957');
  }
}

// companion standing on the floor at the left, with a dark outline so white animals show on light tiles
function drawPet(ctx, id, x, gy, f) {
  for (const o of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.save();
    ctx.translate(o[0], o[1]);
    drawPetBody(ctx, id, x, gy, f, '#5c5f77');
    ctx.restore();
  }
  drawPetBody(ctx, id, x, gy, f, null);
}

function drawPetBody(ctx, id, x, gy, f, flat) {
  function pxRect(ctx, x, y, w, h, c) {
    ctx.fillStyle = flat || c;
    ctx.fillRect(x, y, w, h);
  }
  const h = f % 2;
  if (id === 'bunny') {
    const y = gy - 5 - h;
    pxRect(ctx, x, y + 1, 5, 4, '#F4F1EA');
    pxRect(ctx, x + 3, y - 1, 3, 3, '#F4F1EA');
    pxRect(ctx, x + 3, y - 4, 1, 3, '#F4F1EA');
    pxRect(ctx, x + 5, y - 4, 1, 3, '#F4F1EA');
    pxRect(ctx, x + 5, y, 1, 1, '#E8968A');
    pxRect(ctx, x - 1, y + 2, 1, 1, '#FFFFFF');
  } else if (id === 'dog') {
    const y = gy - 5;
    pxRect(ctx, x, y + 1, 6, 3, '#D9A441');
    pxRect(ctx, x + 5, y - 1, 3, 3, '#D9A441');
    pxRect(ctx, x + 5, y - 1, 1, 2, '#8E5A34');
    pxRect(ctx, x + 7, y, 1, 1, '#2B2522');
    pxRect(ctx, x, y + 4, 1, 1, '#8E5A34');
    pxRect(ctx, x + 4, y + 4, 1, 1, '#8E5A34');
    pxRect(ctx, x - 1, y + h, 1, 2, '#D9A441');
  } else if (id === 'panda') {
    const y = gy - 7 + h;
    pxRect(ctx, x, y + 2, 6, 5, '#F4F1EA');
    pxRect(ctx, x + 1, y - 1, 5, 4, '#F4F1EA');
    pxRect(ctx, x + 1, y - 2, 1, 1, '#2B2522');
    pxRect(ctx, x + 5, y - 2, 1, 1, '#2B2522');
    pxRect(ctx, x + 2, y, 1, 1, '#2B2522');
    pxRect(ctx, x + 4, y, 1, 1, '#2B2522');
    pxRect(ctx, x, y + 4, 6, 1, '#2B2522');
    pxRect(ctx, x, y + 6, 2, 1, '#2B2522');
    pxRect(ctx, x + 4, y + 6, 2, 1, '#2B2522');
  } else if (id === 'cat') {
    // 小花貓: a white cat with orange and black patches, the tail up
    const y = gy - 5;
    pxRect(ctx, x, y + 1, 6, 3, '#F4F1EA');
    pxRect(ctx, x + 1, y + 1, 2, 1, '#D9963A');
    pxRect(ctx, x + 3, y + 2, 1, 1, '#2B2522');
    pxRect(ctx, x + 5, y - 1, 3, 3, '#F4F1EA');
    pxRect(ctx, x + 5, y - 2, 1, 1, '#D9963A');
    pxRect(ctx, x + 7, y - 2, 1, 1, '#2B2522');
    pxRect(ctx, x + 7, y, 1, 1, '#2B2522');
    pxRect(ctx, x, y + 4, 1, 1, '#C9C2B4');
    pxRect(ctx, x + 4, y + 4, 1, 1, '#C9C2B4');
    pxRect(ctx, x - 1, y - 1 + h, 1, 3 - h, '#D9963A');
  } else if (id === 'monkey') {
    // 小猴子: sitting up, a pale face and belly, the tail curled behind
    const y = gy - 5 - h;
    pxRect(ctx, x + 1, y, 4, 4, '#8E5A34');
    pxRect(ctx, x + 2, y + 1, 2, 2, '#E8C49A');
    pxRect(ctx, x + 2, y - 3, 4, 3, '#8E5A34');
    pxRect(ctx, x + 3, y - 2, 2, 2, '#E8C49A');
    pxRect(ctx, x + 4, y - 2, 1, 1, '#2B2522');
    pxRect(ctx, x + 1, y - 2, 1, 1, '#E8C49A');
    pxRect(ctx, x + 1, y + 4, 1, 1, '#5A3A22');
    pxRect(ctx, x + 4, y + 4, 1, 1, '#5A3A22');
    pxRect(ctx, x, y + 2, 1, 2, '#8E5A34');
    pxRect(ctx, x - 1, y + h, 1, 2, '#8E5A34');
  } else if (id === 'koi') {
    // 錦鯉: a white and orange carp swimming in the air, with bubbles
    const y = gy - 9 + h;
    pxRect(ctx, x, y, 6, 3, '#F4F1EA');
    pxRect(ctx, x + 1, y, 2, 2, '#E8642E');
    pxRect(ctx, x + 4, y + 2, 1, 1, '#E8642E');
    pxRect(ctx, x + 5, y, 1, 1, '#C8463F');
    pxRect(ctx, x + 5, y + 1, 1, 1, '#2B2522');
    pxRect(ctx, x - 1, y + 1, 1, 1, '#E8642E');
    pxRect(ctx, x - 2, y - h, 1, 2, '#E8642E');
    pxRect(ctx, x - 2, y + 2, 1, 1 + h, '#E8642E');
    pxRect(ctx, x + 2, y + 3, 1, 1, '#E8642E');
    pxRect(ctx, x + 7, y - 2 - h, 1, 1, '#9FD3F0');
    pxRect(ctx, x + 8, y - 4, 1, 1, '#9FD3F0');
  } else if (id === 'dragon') {
    // 小青龍: a green dragon winding through the air, gold belly and horn
    const y = gy - 15;
    const phase = h * 1.5;
    for (let i = 0; i < 7; i++) {
      const yy = y + Math.round(Math.sin((i + phase) * 0.9) * 1.5);
      pxRect(ctx, x + i, yy, 1, 2, '#3E9E7E');
      pxRect(ctx, x + i, yy + 2, 1, 1, '#E0B957');
      if (i % 3 === 1) pxRect(ctx, x + i, yy - 1, 1, 1, '#2E6B4E');
    }
    const hy = y + Math.round(Math.sin((7 + phase) * 0.9) * 1.5);
    pxRect(ctx, x + 7, hy - 1, 3, 3, '#3E9E7E');
    pxRect(ctx, x + 8, hy, 1, 1, '#2B2522');
    pxRect(ctx, x + 7, hy - 2, 1, 1, '#E0B957');
    pxRect(ctx, x + 10, hy + 1, 1, 1, '#C8463F');
  } else if (id === 'qilin') {
    // 麒麟: a golden beast with a green horn, a dark mane and a flame tail
    const y = gy - 6;
    pxRect(ctx, x, y + 1, 7, 3, '#D9A441');
    pxRect(ctx, x + 1, y + 2, 1, 1, '#B07A2A');
    pxRect(ctx, x + 3, y + 1, 1, 1, '#B07A2A');
    pxRect(ctx, x + 5, y + 2, 1, 1, '#B07A2A');
    pxRect(ctx, x + 6, y - 2, 3, 3, '#D9A441');
    pxRect(ctx, x + 5, y - 2, 1, 3, '#5A4632');
    pxRect(ctx, x + 8, y - 1, 1, 1, '#2B2522');
    pxRect(ctx, x + 7, y - 3, 1, 1, '#4FA37A');
    pxRect(ctx, x + 6, y - 4, 1, 1, '#4FA37A');
    for (const lx of [0, 2, 4, 6]) pxRect(ctx, x + lx, y + 4, 1, 2, '#5A4632');
    pxRect(ctx, x - 1, y + h, 1, 2, '#E8642E');
    pxRect(ctx, x - 2, y - 1 + h, 1, 1, '#F2C84B');
  } else if (id === 'crane') {
    const y = gy - 12;
    pxRect(ctx, x + 1, y + 6, 4, 3, '#F4F1EA');
    pxRect(ctx, x, y + 7, 1, 2, '#2B2522');
    pxRect(ctx, x + 4, y + 1 + h, 1, 5, '#F4F1EA');
    pxRect(ctx, x + 4, y + h, 2, 1, '#F4F1EA');
    pxRect(ctx, x + 4, y - 1 + h, 1, 1, '#C8463F');
    pxRect(ctx, x + 6, y + h, 1, 1, '#D9963A');
    pxRect(ctx, x + 2, y + 9, 1, 3, '#2B2522');
    pxRect(ctx, x + 4, y + 9, 1, 3, '#2B2522');
  }
}

function drawFloor(ctx) {
  pxRect(ctx, 0, AV_GY, AV_W, 1, '#A8322A');
  pxRect(ctx, 0, AV_GY + 1, AV_W, AV_H - AV_GY - 1, '#6E4A2E');
  for (let x = 3; x < AV_W; x += 8) pxRect(ctx, x, AV_GY + 1, 1, AV_H - AV_GY - 1, '#55381F');
}

// the ranks of 傳世, the highest 大境, glow: flickering dots circle the body
function drawAura(ctx, titleIdx, cx, gy, frame) {
  const strength = titleIdx - 15;
  if (strength < 1) return;
  const n = strength * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + frame * 0.35;
    const r = 12 + ((i + frame) % 3);
    const x = Math.round(cx + Math.cos(a) * r * 0.8);
    const y = Math.round(gy - 14 + Math.sin(a) * r);
    if ((i + frame) % 2 === 0) pxRect(ctx, x, y, 1, 1, PX.aura);
  }
}

// gear: { weapon, head, waist, back, pet } item ids (pixel style draws the ones it has sprites for)
function drawAvatar(ctx, titleIdx, gear, poseName, frame, qi, gender) {
  const girl = gender === 'girl';
  const look = TITLES[titleIdx];
  const p = POSES[poseName];
  const cx = AV_CX;
  const gy = AV_GY - p.j;
  const b = p.b;
  const f = frame % 2;
  const ht = gy - 27 + b;
  const weaponId = gear.weapon || '';

  if (gear.pet) drawPet(ctx, gear.pet, 2, AV_GY, frame);
  drawAura(ctx, titleIdx, cx, gy, frame);

  // cape behind the body; the 披風 accessory brings one to titles that have none
  let cape = look.cape;
  if (gear.back === 'cloak') cape = '#2F5D7C';
  if (gear.back === 'goldcloak') cape = '#E0B957';
  if (cape) {
    pxRect(ctx, cx - 6, gy - 18 + b, 2, 11 + f, cape);
    pxRect(ctx, cx - 7, gy - 11 + b + f, 1, 4, cape);
    if (gear.back === 'goldcloak') pxRect(ctx, cx - 6, gy - 18 + b, 2, 1, '#FFF3B0');
  }
  drawBackAcc(ctx, gear.back, cx, gy, b);

  // back arm (and the second sword of 干將莫邪)
  const back = [cx + p.back[0], gy + p.back[1] + b];
  pxThickLine(ctx, cx - 4, gy - 17 + b, back[0], back[1], look.robe);
  if (weaponId === 'ganjiang') drawWeapon(ctx, 'mo', back[0], back[1], p.backAng);
  pxRect(ctx, back[0], back[1], 2, 2, PX.skin);

  // legs and shoes
  const s = p.s;
  pxRect(ctx, cx - 3 - s, gy - 6, 2, 5, PX.pants);
  pxRect(ctx, cx + 1 + s, gy - 6, 2, 5, PX.pants);
  pxRect(ctx, cx - 4 - s, gy - 1, 3, 1, PX.hair);
  pxRect(ctx, cx + 1 + s, gy - 1, 3, 1, PX.hair);

  // robe, flared hem, belt, collar
  pxRect(ctx, cx - 4, gy - 18 + b, 8, 12 - b, look.robe);
  if (girl) pxRect(ctx, cx - 6, gy - 8, 12, 2, look.robe);
  else pxRect(ctx, cx - 5, gy - 8, 10, 2, look.robe);
  pxRect(ctx, cx - 4, gy - 12 + b, 8, 1, look.belt);
  pxRect(ctx, cx - 1, gy - 18 + b, 1, 2, PX.collar);
  pxRect(ctx, cx, gy - 17 + b, 1, 1, PX.collar);
  drawAcc(ctx, gear.waist, cx, gy - 12 + b);

  // head: face, hair, bun
  pxRect(ctx, cx - 4, ht + 1, 8, 8, PX.skin);
  pxRect(ctx, cx - 4, ht, 8, 3, PX.hair);
  if (girl) {
    // 雙丫髻: a bun on each side with pink ribbons, hair down to the shoulders, a lock by the face
    pxRect(ctx, cx - 4, ht + 3, 2, 8, PX.hair);
    pxRect(ctx, cx + 3, ht + 3, 1, 3, PX.hair);
    pxRect(ctx, cx - 6, ht - 2, 3, 3, PX.hair);
    pxRect(ctx, cx + 3, ht - 2, 3, 3, PX.hair);
    pxRect(ctx, cx - 7, ht + 1, 1, 2 + f, '#EF6B73');
    pxRect(ctx, cx + 6, ht + 1, 1, 2 + f, '#EF6B73');
  } else {
    pxRect(ctx, cx - 4, ht + 3, 2, 3, PX.hair);
    pxRect(ctx, cx - 3, ht - 2, 2, 2, PX.hair);
  }
  pxRect(ctx, cx, ht + 4, 1, 1, PX.hair);
  pxRect(ctx, cx + 2, ht + 4, 1, 1, PX.hair);
  pxRect(ctx, cx + 3, ht + 6, 1, 1, PX.blush);
  pxRect(ctx, cx - 1, ht + 6, 1, 1, PX.blush);
  if (p.smile) pxRect(ctx, cx + 1, ht + 7, 1, 1, '#A8322A');
  let headgear = look.gear;
  if (gear.head && (HEADGEAR_ACC.indexOf(gear.head) >= 0 || headgear === 'hat')) headgear = 'none';
  drawGear(ctx, headgear, cx, ht, f);
  drawHeadAcc(ctx, gear.head, cx, ht, f);

  // front arm with the weapon, hand drawn over the hilt
  const hand = [cx + p.hand[0], gy + p.hand[1] + b];
  pxThickLine(ctx, cx + 3, gy - 17 + b, hand[0], hand[1], look.robe);
  drawWeapon(ctx, weaponId === 'ganjiang' ? 'gan' : weaponId, hand[0], hand[1], p.ang);
  pxRect(ctx, hand[0], hand[1], 2, 2, PX.skin);

  if (p.fx === 'slash' && qi) {
    for (let deg = -70; deg <= 50; deg += 9) {
      const r = deg * Math.PI / 180;
      pxRect(ctx, Math.round(cx + 3 + Math.cos(r) * 13), Math.round(gy - 17 + b + Math.sin(r) * 13), 1, 1, qi);
    }
  }
  if (p.fx === 'spark') {
    for (let i = 0; i < 5; i++) {
      pxRect(ctx, cx - 9 + Math.floor(Math.random() * 20), ht - 4 + Math.floor(Math.random() * 10), 1, 1, '#F2C84B');
    }
  }
  if (p.fx === 'sweat') {
    pxRect(ctx, cx + 5, ht + 1, 1, 2, PX.sweat);
  }
}

// picture for a shop card, on a 32x20 canvas
function drawItemCard(canvas, item) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const id = item.id;
  if (item.slot === 'pet') {
    ctx.save();
    ctx.translate(16, 19);
    ctx.scale(1.5, 1.5);
    drawPet(ctx, id, -4, 0, 0);
    ctx.restore();
  } else if (item.slot === 'acc') {
    if (id === 'cloak') {
      pxRect(ctx, 13, 4, 6, 12, '#2F5D7C');
      pxRect(ctx, 12, 14, 8, 2, '#2F5D7C');
      pxRect(ctx, 13, 4, 6, 1, '#E0B957');
    } else {
      ctx.save();
      ctx.translate(16, 8);
      ctx.scale(2, 2);
      drawAcc(ctx, id, 0, -2);
      ctx.restore();
    }
  } else if (id === 'ganjiang') {
    drawWeapon(ctx, 'gan', 6, 15, -40);
    drawWeapon(ctx, 'mo', 24, 15, -140);
  } else if (id === 'staff' || id === 'spear' || id === 'guandao' || id === 'whip') {
    drawWeapon(ctx, id, 10, 13, -28);
  } else {
    drawWeapon(ctx, id, 9, 14, -35);
  }
}
