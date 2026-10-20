// Pixel 俠客: drawn on a 48x36 canvas and shown scaled up with image-rendering: pixelated.

// 江湖名號 by 修為 (all taels ever earned); each rank changes the outfit
const RANKS = [
  { at: 0, name: '初入江湖', robe: '#9A948A', belt: '#5A4632', gear: 'none' },
  { at: 30, name: '武館學徒', robe: '#3F6FB0', belt: '#2A3F66', gear: 'band' },
  { at: 100, name: '少俠', robe: '#2E8B7A', belt: '#1D5A4F', gear: 'bandTails' },
  { at: 250, name: '俠客', robe: '#3A3A44', belt: '#B23A2E', gear: 'hat' },
  { at: 500, name: '大俠', robe: '#E9E4D8', belt: '#2F5D7C', gear: 'hat', cape: '#A8322A' },
  { at: 900, name: '一代宗師', robe: '#6B4C9A', belt: '#D9B25A', gear: 'goldBand', cape: '#2F2A44' },
  { at: 1500, name: '武林盟主', robe: '#B8322A', belt: '#E0B957', gear: 'crown', cape: '#E0B957' },
];

// 武功境界 by 字訣 (characters written alone with three marks); higher levels add an aura
const KUNGFU = [
  { at: 0, name: '初學乍練' },
  { at: 3, name: '略有小成' },
  { at: 8, name: '駕輕就熟' },
  { at: 15, name: '融會貫通' },
  { at: 25, name: '爐火純青' },
  { at: 40, name: '登峰造極' },
  { at: 60, name: '出神入化' },
  { at: 90, name: '返璞歸真' },
];

// 兵器譜: price in taels or ingots; the held weapon also tints the 劍氣
const WEAPONS = [
  { id: 'wood', name: '木劍', taels: 20, qi: '#A9834F' },
  { id: 'staff', name: '竹棍', taels: 35, qi: '#7E9A4E' },
  { id: 'fan', name: '鐵扇', taels: 60, qi: '#7F8C99' },
  { id: 'spear', name: '紅纓槍', taels: 100, qi: '#C2453C' },
  { id: 'ring', name: '九環刀', taels: 160, qi: '#C9A03A' },
  { id: 'guandao', name: '青龍偃月刀', taels: 260, qi: '#3E8E7E' },
  { id: 'zhanlu', name: '湛盧劍', ingots: 3, qi: '#5B7FB5' },
  { id: 'ganjiang', name: '干將莫邪', ingots: 5, qi: '#8E6FB8' },
];

const AV_W = 48;
const AV_H = 36;
const AV_CX = 17;
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
  } else if (id === 'guandao') {
    span(-7, 10, 0, '#3E6B4E');
    dot(10, -1, '#C8463F');
    span(11, 15, 0, '#DDE3EA');
    span(11, 14, 1, '#DDE3EA');
    span(12, 14, 2, '#B9C2CC');
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
  if (gear === 'crown') {
    pxRect(ctx, cx - 2, ht - 3, 4, 3, PX.gold);
    pxRect(ctx, cx - 1, ht - 2, 2, 1, PX.band);
    pxRect(ctx, cx - 4, ht + 2, 8, 1, PX.gold);
  }
}

function drawFloor(ctx) {
  pxRect(ctx, 0, AV_GY, AV_W, 1, '#A8322A');
  pxRect(ctx, 0, AV_GY + 1, AV_W, AV_H - AV_GY - 1, '#6E4A2E');
  for (let x = 3; x < AV_W; x += 8) pxRect(ctx, x, AV_GY + 1, 1, AV_H - AV_GY - 1, '#55381F');
}

// aura: 武功 level index; from 略有小成 up, flickering dots circle the body
function drawAura(ctx, aura, cx, gy, frame) {
  if (aura < 1) return;
  const n = aura * 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + frame * 0.35;
    const r = 12 + ((i + frame) % 3);
    const x = Math.round(cx + Math.cos(a) * r * 0.8);
    const y = Math.round(gy - 14 + Math.sin(a) * r);
    if ((i + frame) % 2 === 0) pxRect(ctx, x, y, 1, 1, PX.aura);
  }
}

function drawAvatar(ctx, rankIdx, weaponId, poseName, frame, qi, aura) {
  const look = RANKS[rankIdx];
  const p = POSES[poseName];
  const cx = AV_CX;
  const gy = AV_GY - p.j;
  const b = p.b;
  const f = frame % 2;
  const ht = gy - 27 + b;

  drawAura(ctx, aura || 0, cx, gy, frame);

  // cape behind the body
  if (look.cape) {
    pxRect(ctx, cx - 6, gy - 18 + b, 2, 11 + f, look.cape);
    pxRect(ctx, cx - 7, gy - 11 + b + f, 1, 4, look.cape);
  }

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
  pxRect(ctx, cx - 5, gy - 8, 10, 2, look.robe);
  pxRect(ctx, cx - 4, gy - 12 + b, 8, 1, look.belt);
  pxRect(ctx, cx - 1, gy - 18 + b, 1, 2, PX.collar);
  pxRect(ctx, cx, gy - 17 + b, 1, 1, PX.collar);

  // head: face, hair, bun
  pxRect(ctx, cx - 4, ht + 1, 8, 8, PX.skin);
  pxRect(ctx, cx - 4, ht, 8, 3, PX.hair);
  pxRect(ctx, cx - 4, ht + 3, 2, 3, PX.hair);
  pxRect(ctx, cx - 3, ht - 2, 2, 2, PX.hair);
  pxRect(ctx, cx, ht + 4, 1, 1, PX.hair);
  pxRect(ctx, cx + 2, ht + 4, 1, 1, PX.hair);
  pxRect(ctx, cx + 3, ht + 6, 1, 1, PX.blush);
  pxRect(ctx, cx - 1, ht + 6, 1, 1, PX.blush);
  if (p.smile) pxRect(ctx, cx + 1, ht + 7, 1, 1, '#A8322A');
  drawGear(ctx, look.gear, cx, ht, f);

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

function drawWeaponCard(canvas, id) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (id === 'ganjiang') {
    drawWeapon(ctx, 'gan', 6, 15, -40);
    drawWeapon(ctx, 'mo', 24, 15, -140);
  } else if (id === 'staff' || id === 'spear' || id === 'guandao') {
    drawWeapon(ctx, id, 10, 13, -28);
  } else {
    drawWeapon(ctx, id, 8, 14, -35);
  }
}
