// 俠客 data (titles, shop items) and the shop pictures of the items, drawn as vector shapes on canvas.
// The hero itself is the pixel 俠客 in pixel.js.
// Every item picture works in a 160 x 120 logical frame; callers scale it to the canvas.

// 頭銜: one title spans LEVELS_PER_TITLE levels; the outfit changes only when the title changes
const LEVELS_PER_TITLE = 5;
const TITLES = [
  { name: '新手', robe: '#9A948A', belt: '#5A4632', gear: 'none' },
  { name: '學徒', robe: '#B9A27A', belt: '#5A4632', gear: 'band' },
  { name: '入門弟子', robe: '#3F6FB0', belt: '#2A3F66', gear: 'band' },
  { name: '練家子', robe: '#2E8B7A', belt: '#1D5A4F', gear: 'bandTails' },
  { name: '武師', robe: '#7A4A2A', belt: '#2B2522', gear: 'bandTails' },
  { name: '俠客', robe: '#3A3A44', belt: '#B23A2E', gear: 'hat' },
  { name: '江湖好手', robe: '#4C6A3A', belt: '#C9A03A', gear: 'hat', cape: '#6E4A2E' },
  { name: '成名高手', robe: '#2F4A6E', belt: '#C5CCD2', gear: 'hat', cape: '#A8322A' },
  { name: '大俠', robe: '#E9E4D8', belt: '#2F5D7C', gear: 'hat', cape: '#B8322A' },
  { name: '一方豪傑', robe: '#8E2F2A', belt: '#E0B957', gear: 'topknot', cape: '#3A3A44' },
  { name: '武林名宿', robe: '#5E5A7A', belt: '#E0B957', gear: 'goldBand', cape: '#2F2A44' },
  { name: '宗師', robe: '#6B4C9A', belt: '#E0B957', gear: 'goldBand', cape: '#2F2A44' },
  { name: '大宗師', robe: '#F2EEE4', belt: '#C9A03A', gear: 'goldBand', cape: '#C9A03A' },
  { name: '武林泰斗', robe: '#1F3A5A', belt: '#E0B957', gear: 'jadeCrown', cape: '#B8322A' },
  { name: '盟主', robe: '#B8322A', belt: '#E0B957', gear: 'crown', cape: '#E0B957' },
  { name: '天下第一', robe: '#E0B957', belt: '#B8322A', gear: 'crown', cape: '#B8322A' },
];

// shop: weapons are held, accessories are worn at the head, waist or back, companions stand beside.
// minTitle: the title index needed before an item even shows; price in taels or ingots.
const ITEMS = [
  { id: 'wood', slot: 'weapon', name: '木劍', taels: 20, minTitle: 0, qi: '#A9834F' },
  { id: 'staff', slot: 'weapon', name: '竹棍', taels: 35, minTitle: 0, qi: '#7E9A4E' },
  { id: 'umbrella', slot: 'weapon', name: '油紙傘', taels: 50, minTitle: 1, qi: '#D0473F' },
  { id: 'fan', slot: 'weapon', name: '鐵扇', taels: 60, minTitle: 1, qi: '#7F8C99' },
  { id: 'brush', slot: 'weapon', name: '判官筆', taels: 80, minTitle: 2, qi: '#3B3B3B' },
  { id: 'whisk', slot: 'weapon', name: '拂塵', taels: 100, minTitle: 2, qi: '#C9C2B4' },
  { id: 'whip', slot: 'weapon', name: '長鞭', taels: 120, minTitle: 3, qi: '#8E5A34' },
  { id: 'flute', slot: 'weapon', name: '玉笛', taels: 140, minTitle: 3, qi: '#4FA37A' },
  { id: 'spear', slot: 'weapon', name: '紅纓槍', taels: 160, minTitle: 4, qi: '#C2453C' },
  { id: 'dao', slot: 'weapon', name: '柳葉刀', taels: 180, minTitle: 4, qi: '#AEB8C2' },
  { id: 'emei', slot: 'weapon', name: '峨嵋刺', taels: 200, minTitle: 5, qi: '#9AA4AE' },
  { id: 'ring', slot: 'weapon', name: '九環刀', taels: 240, minTitle: 5, qi: '#C9A03A' },
  { id: 'jian', slot: 'weapon', name: '青鋼劍', taels: 280, minTitle: 6, qi: '#6F9FC0' },
  { id: 'hammer', slot: 'weapon', name: '流星錘', taels: 320, minTitle: 6, qi: '#5F6B76' },
  { id: 'guandao', slot: 'weapon', name: '青龍偃月刀', taels: 380, minTitle: 7, qi: '#3E8E7E' },
  { id: 'halberd', slot: 'weapon', name: '方天畫戟', taels: 450, minTitle: 8, qi: '#D9A441' },
  { id: 'zhanlu', slot: 'weapon', name: '湛盧劍', ingots: 3, minTitle: 9, qi: '#5B7FB5' },
  { id: 'ganjiang', slot: 'weapon', name: '干將莫邪', ingots: 5, minTitle: 11, qi: '#8E6FB8' },

  { id: 'flower', slot: 'acc', place: 'head', name: '小紅花', taels: 30, minTitle: 0 },
  { id: 'feather', slot: 'acc', place: 'head', name: '雉雞翎', taels: 70, minTitle: 2 },
  { id: 'hairpin', slot: 'acc', place: 'head', name: '玉簪', taels: 120, minTitle: 4 },
  { id: 'bellband', slot: 'acc', place: 'head', name: '金鈴髮帶', taels: 180, minTitle: 6 },
  { id: 'phoenix', slot: 'acc', place: 'head', name: '鳳冠', ingots: 4, minTitle: 10 },
  { id: 'bell', slot: 'acc', place: 'waist', name: '鈴鐺', taels: 30, minTitle: 0 },
  { id: 'sachet', slot: 'acc', place: 'waist', name: '香包', taels: 50, minTitle: 1 },
  { id: 'gourd', slot: 'acc', place: 'waist', name: '葫蘆', taels: 60, minTitle: 1 },
  { id: 'jade', slot: 'acc', place: 'waist', name: '玉佩', taels: 90, minTitle: 2 },
  { id: 'pouch', slot: 'acc', place: 'waist', name: '錦囊', taels: 140, minTitle: 4 },
  { id: 'scroll', slot: 'acc', place: 'back', name: '書卷', taels: 80, minTitle: 1 },
  { id: 'cloak', slot: 'acc', place: 'back', name: '披風', taels: 120, minTitle: 2 },
  { id: 'swordbox', slot: 'acc', place: 'back', name: '劍匣', taels: 220, minTitle: 5 },
  { id: 'goldcloak', slot: 'acc', place: 'back', name: '金縷披風', ingots: 5, minTitle: 9 },

  { id: 'bunny', slot: 'pet', name: '小白兔', taels: 60, minTitle: 0 },
  { id: 'cat', slot: 'pet', name: '小花貓', taels: 70, minTitle: 0 },
  { id: 'dog', slot: 'pet', name: '小黃狗', taels: 90, minTitle: 1 },
  { id: 'monkey', slot: 'pet', name: '小猴子', taels: 130, minTitle: 2 },
  { id: 'panda', slot: 'pet', name: '熊貓寶寶', ingots: 2, minTitle: 3 },
  { id: 'koi', slot: 'pet', name: '錦鯉', taels: 180, minTitle: 4 },
  { id: 'crane', slot: 'pet', name: '仙鶴', ingots: 4, minTitle: 6 },
  { id: 'dragon', slot: 'pet', name: '小青龍', ingots: 8, minTitle: 10 },
  { id: 'qilin', slot: 'pet', name: '麒麟', ingots: 10, minTitle: 13 },
];
const SLOTS = [
  { id: 'weapon', name: '兵器' },
  { id: 'acc', name: '飾品' },
  { id: 'pet', name: '夥伴' },
];
// where an item goes on the hero: gear.weapon / gear.head / gear.waist / gear.back / gear.pet
function placeOf(item) {
  return item.slot === 'acc' ? item.place : item.slot;
}

// ---------- drawing helpers ----------
const HERO_W = 160;
const HERO_H = 120;
const OUTLINE = '#3b2a20';

function deg(a) {
  return a * Math.PI / 180;
}
// fill, then outline; lw 0 means no outline (eyes, inner ears), leaving it out means the usual 2.4
function paint(ctx, fill, lw) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw === 0) return;
  ctx.lineWidth = lw || 2.4;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}
function circleAt(ctx, x, y, r, fill, lw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  paint(ctx, fill, lw);
}
function ovalAt(ctx, x, y, rx, ry, rot, fill, lw) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  paint(ctx, fill, lw);
}
function boxAt(ctx, x, y, w, h, r, fill, lw) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  paint(ctx, fill, lw);
}
// an outlined capsule from (x0,y0) to (x1,y1)
function limb(ctx, x0, y0, x1, y1, width, fill) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width + 4.8;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
}
// ---------- weapons, drawn along +x from the grip ----------
function drawWeaponVec(ctx, id, x, y, angDeg, s) {
  if (!id) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg(angDeg));
  ctx.scale(s || 1, s || 1);
  const lw = 1.8;
  ctx.lineJoin = 'round';

  if (id === 'wood' || id === 'jian' || id === 'zhanlu' || id === 'gan' || id === 'mo') {
    const blade = { wood: '#c99764', jian: '#a9c7d8', zhanlu: '#cfe2ff', gan: '#7e8a99', mo: '#eef1f5' }[id];
    const guard = id === 'wood' ? '#7a5638' : (id === 'gan' ? '#3b2a20' : '#e0b957');
    if (id === 'zhanlu') {
      ctx.shadowColor = '#9fc4ff';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(4, -2.4);
    ctx.lineTo(34, -2.4);
    ctx.lineTo(39, 0);
    ctx.lineTo(34, 2.4);
    ctx.lineTo(4, 2.4);
    ctx.closePath();
    paint(ctx, blade, lw);
    ctx.shadowBlur = 0;
    boxAt(ctx, 2, -6, 3, 12, 1.5, guard, lw);
    boxAt(ctx, -7, -2, 9, 4, 2, '#5a3a24', lw);
  } else if (id === 'staff') {
    boxAt(ctx, -22, -2, 54, 4, 2, '#9dbb63', lw);
    for (const k of [-10, 4, 18]) {
      ctx.beginPath();
      ctx.moveTo(k, -2);
      ctx.lineTo(k, 2);
      ctx.strokeStyle = '#5e7a36';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  } else if (id === 'umbrella') {
    boxAt(ctx, -4, -1.2, 30, 2.4, 1, '#7a5638', lw);
    ctx.beginPath();
    ctx.moveTo(26, -15);
    ctx.quadraticCurveTo(42, 0, 26, 15);
    ctx.closePath();
    paint(ctx, '#e8635a', lw);
    for (const t of [-9, 0, 9]) {
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(34, t);
      ctx.strokeStyle = '#fbe3c0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (id === 'fan') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 20, -0.55, 0.55);
    ctx.closePath();
    paint(ctx, '#c5ccd2', lw);
    for (const t of [-0.35, 0, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(t) * 20, Math.sin(t) * 20);
      ctx.strokeStyle = '#5f6b76';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (id === 'brush') {
    boxAt(ctx, -4, -2, 26, 4, 2, '#8e5a34', lw);
    boxAt(ctx, 22, -2.6, 4, 5.2, 1, '#e0b957', lw);
    ctx.beginPath();
    ctx.moveTo(26, -3);
    ctx.quadraticCurveTo(34, -2, 38, 0);
    ctx.quadraticCurveTo(34, 2, 26, 3);
    ctx.closePath();
    paint(ctx, '#2b2522', lw);
  } else if (id === 'whisk') {
    boxAt(ctx, -4, -1.8, 18, 3.6, 1.8, '#a8754a', lw);
    for (const t of [-6, -3, 0, 3, 6]) {
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.quadraticCurveTo(24, t * 0.6, 34, t + 4);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.strokeStyle = '#f4f1ea';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  } else if (id === 'whip') {
    boxAt(ctx, -4, -2, 9, 4, 2, '#3b2a20', lw);
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.bezierCurveTo(14, -10, 22, 10, 36, 4);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#a8754a';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (id === 'flute') {
    boxAt(ctx, -4, -2.2, 34, 4.4, 2.2, '#6fbf8e', lw);
    for (const k of [8, 14, 20]) circleAt(ctx, k, 0, 0.9, '#2e6b4a', 0.6);
    limb(ctx, 30, 0, 32, 9, 1.4, '#d0473f');
  } else if (id === 'spear') {
    boxAt(ctx, -14, -1.6, 44, 3.2, 1.6, '#8e5a34', lw);
    ctx.beginPath();
    ctx.moveTo(30, -3.2);
    ctx.lineTo(42, 0);
    ctx.lineTo(30, 3.2);
    ctx.closePath();
    paint(ctx, '#e3e8ee', lw);
    circleAt(ctx, 29, 3, 3, '#d0473f', 1.2);
  } else if (id === 'dao' || id === 'ring') {
    boxAt(ctx, -7, -2, 9, 4, 2, '#5a3a24', lw);
    boxAt(ctx, 2, -5, 3, 10, 1.5, '#e0b957', lw);
    ctx.beginPath();
    ctx.moveTo(5, -3);
    if (id === 'dao') {
      ctx.quadraticCurveTo(22, -6, 36, -1);
      ctx.quadraticCurveTo(24, 4, 5, 3);
    } else {
      ctx.lineTo(32, -4.5);
      ctx.quadraticCurveTo(37, 0, 32, 5);
      ctx.lineTo(5, 4);
    }
    ctx.closePath();
    paint(ctx, '#dde3ea', lw);
    if (id === 'ring') {
      for (const k of [11, 17, 23]) circleAt(ctx, k, -5, 1.6, '#e0b957', 0.9);
    }
  } else if (id === 'emei') {
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(0, -2.2);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 2.2);
    ctx.closePath();
    paint(ctx, '#c5ccd2', lw);
    circleAt(ctx, 0, 0, 3.4, '#e0b957', 1.4);
  } else if (id === 'hammer') {
    for (let k = 2; k <= 26; k += 4) circleAt(ctx, k, Math.sin(k / 5) * 2, 1.4, '#9aa4ae', 0.8);
    circleAt(ctx, 31, 0, 6, '#5f6b76', lw);
    circleAt(ctx, 29.5, -1.5, 1.6, '#aeb8c2', 0);
  } else if (id === 'guandao' || id === 'halberd') {
    boxAt(ctx, -18, -1.8, 50, 3.6, 1.8, id === 'guandao' ? '#3e6b4e' : '#b23a2e', lw);
    if (id === 'guandao') {
      ctx.beginPath();
      ctx.moveTo(30, -2);
      ctx.quadraticCurveTo(40, -12, 46, -4);
      ctx.quadraticCurveTo(42, 2, 30, 3);
      ctx.closePath();
      paint(ctx, '#dde3ea', lw);
      circleAt(ctx, 29, 4, 2.6, '#d0473f', 1);
    } else {
      ctx.beginPath();
      ctx.moveTo(32, -2.6);
      ctx.lineTo(46, 0);
      ctx.lineTo(32, 2.6);
      ctx.closePath();
      paint(ctx, '#e3e8ee', lw);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.quadraticCurveTo(30, side * 12, 38, side * 9);
        ctx.quadraticCurveTo(33, side * 5, 31, side * 1);
        ctx.closePath();
        paint(ctx, '#e0b957', 1.4);
      }
    }
  }
  ctx.restore();
}

// ---------- worn accessories ----------
function drawBack(ctx, id, cx, top, by, t) {
  if (id === 'scroll') {
    ctx.save();
    ctx.translate(cx, top + 18 + by);
    ctx.rotate(deg(-35));
    boxAt(ctx, -24, -4, 48, 8, 4, '#f3e3c1', 2);
    circleAt(ctx, -24, 0, 4.5, '#a8754a', 1.8);
    circleAt(ctx, 24, 0, 4.5, '#a8754a', 1.8);
    ctx.restore();
  } else if (id === 'swordbox') {
    ctx.save();
    ctx.translate(cx + 12, top + 14 + by);
    ctx.rotate(deg(18));
    boxAt(ctx, -6, -22, 12, 40, 3, '#7a4a2a', 2);
    boxAt(ctx, -4, -26, 8, 6, 2, '#e0b957', 1.6);
    ctx.restore();
  }
}
function drawCape(ctx, color, cx, top, by, t) {
  const wave = Math.sin(t / 260) * 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 14, top + 2 + by);
  ctx.lineTo(cx + 14, top + 2 + by);
  ctx.quadraticCurveTo(cx + 22, top + 20 + by, cx + 20 + wave, top + 36 + by);
  ctx.quadraticCurveTo(cx, top + 32 + by + wave, cx - 24 - wave, top + 36 + by);
  ctx.quadraticCurveTo(cx - 22, top + 20 + by, cx - 14, top + 2 + by);
  ctx.closePath();
  paint(ctx, color, 2.4);
}
function drawWaist(ctx, id, cx, beltY) {
  if (id === 'bell') {
    circleAt(ctx, cx + 9, beltY + 6, 3.6, '#e0b957', 1.8);
    ctx.beginPath();
    ctx.moveTo(cx + 9, beltY + 6.5);
    ctx.lineTo(cx + 9, beltY + 9.4);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (id === 'gourd') {
    circleAt(ctx, cx - 12, beltY + 13, 4.8, '#e09a43', 1.8);
    circleAt(ctx, cx - 12, beltY + 6.5, 3.2, '#e09a43', 1.8);
    boxAt(ctx, -0.6 + cx - 12 - 1, beltY + 1.5, 2.4, 2.4, 0.6, '#b23a2e', 1);
  } else if (id === 'jade') {
    ctx.beginPath();
    ctx.arc(cx, beltY + 9, 4, 0, Math.PI * 2);
    ctx.arc(cx, beltY + 9, 1.6, 0, Math.PI * 2, true);
    paint(ctx, '#6fbf8e', 1.6);
    limb(ctx, cx, beltY + 13, cx, beltY + 18, 1.2, '#d0473f');
  } else if (id === 'sachet') {
    ctx.beginPath();
    ctx.moveTo(cx + 6, beltY + 4);
    ctx.quadraticCurveTo(cx + 14, beltY + 4, cx + 13, beltY + 13);
    ctx.quadraticCurveTo(cx + 9, beltY + 17, cx + 5, beltY + 13);
    ctx.quadraticCurveTo(cx + 4, beltY + 6, cx + 6, beltY + 4);
    paint(ctx, '#f2a7b5', 1.8);
  } else if (id === 'pouch') {
    boxAt(ctx, cx + 5, beltY + 4, 9, 10, 3, '#c0392b', 1.8);
    boxAt(ctx, cx + 7, beltY + 7, 5, 4, 1, '#e0b957', 1);
  }
}
function drawHead(ctx, id, cx, cy, r, t, gender) {
  if (id === 'flower') {
    const fx = cx + r * 0.72;
    const fy = cy - r * 0.62;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      circleAt(ctx, fx + Math.cos(a) * 3.6, fy + Math.sin(a) * 3.6, 3, '#ef6b73', 1.4);
    }
    circleAt(ctx, fx, fy, 2, '#f9e2af', 1.2);
  } else if (id === 'feather') {
    const sway = Math.sin(t / 400) * 3;
    for (const dx of [-3, 3]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy - r - 4);
      ctx.bezierCurveTo(cx + dx * 4, cy - r - 24, cx - 18 + sway, cy - r - 34, cx - 30 + sway, cy - r - 30);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = dx < 0 ? '#c9822e' : '#3e6b4e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (id === 'hairpin') {
    const x = gender === 'girl' ? cx + 15 : cx;
    const y = gender === 'girl' ? cy - r + 1 : cy - r - 5;
    limb(ctx, x - 9, y + 3, x + 10, y - 4, 1.6, '#6fbf8e');
    circleAt(ctx, x + 11, y - 4, 2, '#e0b957', 1);
    limb(ctx, x + 11, y - 2, x + 12, y + 6, 0.8, '#e0b957');
    circleAt(ctx, x + 12, y + 7, 1.6, '#6fbf8e', 1);
  } else if (id === 'bellband') {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, deg(200), deg(340));
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5.6;
    ctx.stroke();
    ctx.strokeStyle = '#e0b957';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const s of [-1, 1]) circleAt(ctx, cx + s * (r - 1), cy - 6, 2.6, '#e0b957', 1.4);
  } else if (id === 'phoenix') {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - r + 4);
    ctx.quadraticCurveTo(cx, cy - r - 16, cx + 16, cy - r + 4);
    ctx.quadraticCurveTo(cx, cy - r - 4, cx - 16, cy - r + 4);
    paint(ctx, '#e0b957', 2);
    for (const k of [-8, 0, 8]) circleAt(ctx, cx + k, cy - r - 4 - (k === 0 ? 4 : 0), 2.2, '#d0473f', 1);
    for (const s of [-1, 1]) limb(ctx, cx + s * 16, cy - r + 4, cx + s * 18, cy - r + 14, 0.8, '#e0b957');
  }
}

// ---------- companions ----------
function drawPetVec(ctx, id, x, floor, t) {
  const hop = Math.abs(Math.sin(t / 380)) * 2.5;
  const wag = Math.sin(t / 160) * 4;
  if (id === 'bunny') {
    const y = floor - hop;
    ovalAt(ctx, x, y - 8, 10, 8, 0, '#fbfaf6');
    ovalAt(ctx, x + 2, y - 23, 3, 9, -0.15, '#fbfaf6');
    ovalAt(ctx, x + 9, y - 23, 3, 9, 0.2, '#fbfaf6');
    ovalAt(ctx, x + 2, y - 23, 1.2, 6, -0.15, '#f5b9c4', 0);
    ovalAt(ctx, x + 9, y - 23, 1.2, 6, 0.2, '#f5b9c4', 0);
    circleAt(ctx, x + 5, y - 14, 7.5, '#fbfaf6');
    circleAt(ctx, x + 8, y - 15, 1.2, OUTLINE, 0);
    circleAt(ctx, x + 11, y - 12, 1, '#ef6b73', 0);
  } else if (id === 'cat') {
    const y = floor;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 8);
    ctx.quadraticCurveTo(x - 20, y - 14 + wag * 0.4, x - 16, y - 24);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#f2a65a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ovalAt(ctx, x - 2, y - 7, 11, 7, 0, '#f2a65a');
    for (const k of [-6, -1, 4]) limb(ctx, x + k, y - 13, x + k + 1, y - 9, 0.8, '#c9822e');
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 22);
    ctx.lineTo(x + 4, y - 30);
    ctx.lineTo(x + 8, y - 24);
    ctx.lineTo(x + 13, y - 30);
    ctx.lineTo(x + 15, y - 22);
    paint(ctx, '#f2a65a');
    circleAt(ctx, x + 9, y - 18, 7, '#f2a65a');
    circleAt(ctx, x + 6.5, y - 19, 1.1, OUTLINE, 0);
    circleAt(ctx, x + 11.5, y - 19, 1.1, OUTLINE, 0);
  } else if (id === 'dog') {
    const y = floor;
    limb(ctx, x - 12, y - 10, x - 16, y - 16 + wag * 0.5, 2, '#d9a441');
    ovalAt(ctx, x - 2, y - 8, 12, 7, 0, '#e0b46a');
    circleAt(ctx, x + 10, y - 17, 7.5, '#e0b46a');
    ovalAt(ctx, x + 5, y - 17, 3, 6, 0.3, '#a8754a');
    circleAt(ctx, x + 12, y - 18, 1.2, OUTLINE, 0);
    circleAt(ctx, x + 16.5, y - 15, 1.6, OUTLINE, 0);
  } else if (id === 'monkey') {
    const y = floor - hop;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 6);
    ctx.bezierCurveTo(x - 22, y - 4, x - 20, y - 24, x - 12, y - 22);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#a8754a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ovalAt(ctx, x, y - 8, 8, 8, 0, '#a8754a');
    circleAt(ctx, x - 7, y - 21, 3, '#a8754a');
    circleAt(ctx, x + 9, y - 21, 3, '#a8754a');
    circleAt(ctx, x + 1, y - 20, 7.5, '#a8754a');
    ovalAt(ctx, x + 2, y - 18, 5, 4.4, 0, '#f3d9b8', 1.4);
    circleAt(ctx, x, y - 19, 1, OUTLINE, 0);
    circleAt(ctx, x + 4, y - 19, 1, OUTLINE, 0);
  } else if (id === 'panda') {
    const y = floor - hop * 0.5;
    ovalAt(ctx, x, y - 9, 11, 9, 0, '#fbfaf6');
    ovalAt(ctx, x - 7, y - 4, 4, 4, 0, '#2b2522');
    ovalAt(ctx, x + 7, y - 4, 4, 4, 0, '#2b2522');
    circleAt(ctx, x - 6, y - 26, 3.6, '#2b2522');
    circleAt(ctx, x + 8, y - 26, 3.6, '#2b2522');
    circleAt(ctx, x + 1, y - 20, 9, '#fbfaf6');
    ovalAt(ctx, x - 2.5, y - 20, 2.6, 3.2, -0.4, '#2b2522', 0);
    ovalAt(ctx, x + 4.5, y - 20, 2.6, 3.2, 0.4, '#2b2522', 0);
    circleAt(ctx, x - 2, y - 20.5, 0.9, '#ffffff', 0);
    circleAt(ctx, x + 5, y - 20.5, 0.9, '#ffffff', 0);
  } else if (id === 'koi') {
    const y = floor - 34 + Math.sin(t / 500) * 3;
    const tail = Math.sin(t / 150) * 0.35;
    ctx.save();
    ctx.translate(x - 12, y);
    ctx.rotate(tail);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    paint(ctx, '#f2a65a', 1.8);
    ctx.restore();
    ovalAt(ctx, x, y, 13, 7, 0, '#fbfaf6');
    ovalAt(ctx, x + 2, y - 2, 6, 4, 0.2, '#ef6b4a', 0);
    ovalAt(ctx, x - 6, y + 2, 4, 2.6, 0, '#ef6b4a', 0);
    circleAt(ctx, x + 9, y - 1, 1.2, OUTLINE, 0);
  } else if (id === 'crane') {
    const y = floor;
    limb(ctx, x - 2, y - 14, x - 3, y, 0.8, '#2b2522');
    limb(ctx, x + 4, y - 14, x + 5, y, 0.8, '#2b2522');
    ovalAt(ctx, x, y - 20, 11, 7, -0.2, '#fbfaf6');
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 22);
    ctx.lineTo(x - 17, y - 18);
    ctx.lineTo(x - 10, y - 16);
    paint(ctx, '#2b2522', 1.6);
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 24);
    ctx.quadraticCurveTo(x + 12, y - 34 - hop, x + 10, y - 42 - hop);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5.4;
    ctx.stroke();
    ctx.strokeStyle = '#fbfaf6';
    ctx.lineWidth = 3;
    ctx.stroke();
    circleAt(ctx, x + 10, y - 43 - hop, 4, '#fbfaf6', 1.8);
    circleAt(ctx, x + 10, y - 46.5 - hop, 1.6, '#d0473f', 0.8);
    ctx.beginPath();
    ctx.moveTo(x + 13, y - 44 - hop);
    ctx.lineTo(x + 20, y - 42 - hop);
    ctx.lineTo(x + 13, y - 41.5 - hop);
    paint(ctx, '#e09a43', 1);
  } else if (id === 'dragon') {
    const y = floor - 30 + Math.sin(t / 600) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 8);
    ctx.bezierCurveTo(x - 10, y - 10 + Math.sin(t / 300) * 4, x, y + 14, x + 10, y - 2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#6fbf8e';
    ctx.lineWidth = 6;
    ctx.stroke();
    circleAt(ctx, x + 12, y - 4, 6.5, '#6fbf8e');
    limb(ctx, x + 9, y - 10, x + 6, y - 17, 0.8, '#e0b957');
    limb(ctx, x + 14, y - 10, x + 15, y - 17, 0.8, '#e0b957');
    circleAt(ctx, x + 14, y - 5, 1.2, OUTLINE, 0);
    limb(ctx, x + 17, y - 2, x + 24, y + 1 + Math.sin(t / 200) * 2, 0.5, '#e0b957');
  } else if (id === 'qilin') {
    const y = floor - hop * 0.5;
    for (const k of [-7, -1, 5, 10]) limb(ctx, x + k, y - 10, x + k, y - 1, 1.2, '#d9a441');
    ovalAt(ctx, x + 1, y - 13, 12, 7, 0, '#e0b957');
    for (const k of [-6, 0, 6]) circleAt(ctx, x + k, y - 14, 1.6, '#c9822e', 0);
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 14);
    ctx.quadraticCurveTo(x - 18, y - 20, x - 14, y - 26 + Math.sin(t / 250) * 2);
    ctx.strokeStyle = '#e8635a';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    circleAt(ctx, x + 12, y - 22, 6.5, '#e0b957');
    limb(ctx, x + 12, y - 28, x + 14, y - 35, 0.8, '#f9e2af');
    ctx.beginPath();
    ctx.arc(x + 9, y - 22, 6, deg(150), deg(260));
    ctx.strokeStyle = '#e8635a';
    ctx.lineWidth = 3;
    ctx.stroke();
    circleAt(ctx, x + 14, y - 23, 1.2, OUTLINE, 0);
  }
}

// ---------- canvas wrappers ----------
// size the canvas backing store to its CSS box, then draw in the 160 x 120 frame
function prepareHeroCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(w / HERO_W, 0, 0, h / HERO_H, 0, 0);
  ctx.clearRect(0, 0, HERO_W, HERO_H);
  return ctx;
}
// turn whatever was drawn into a solid shadow
function silhouette(canvas, color) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// shop picture of one item, centered in the 160 x 120 frame
function drawItemIcon(canvas, item) {
  const ctx = prepareHeroCanvas(canvas);
  const id = item.id;
  if (item.slot === 'weapon') {
    const long = ['staff', 'spear', 'guandao', 'halberd', 'whip'];
    if (id === 'ganjiang') {
      drawWeaponVec(ctx, 'gan', 46, 92, -45, 1.9);
      drawWeaponVec(ctx, 'mo', 114, 92, -135, 1.9);
    } else if (long.indexOf(id) >= 0) {
      drawWeaponVec(ctx, id, 52, 82, -28, 1.7);
    } else {
      drawWeaponVec(ctx, id, 44, 86, -35, 2.1);
    }
  } else if (item.slot === 'pet') {
    ctx.save();
    ctx.translate(80, 104);
    ctx.scale(1.7, 1.7);
    drawPetVec(ctx, id, 0, 0, 0);
    ctx.restore();
  } else if (item.place === 'waist') {
    // shown hanging from a short length of belt
    ctx.save();
    ctx.translate(80, 34);
    ctx.scale(4, 4);
    const ox = { bell: -9, gourd: 12, jade: 0, sachet: -9, pouch: -9 }[id] || 0;
    boxAt(ctx, -9, -2, 18, 4, 1.5, '#7a5638', 0.8);
    drawWaist(ctx, id, ox, -2);
    ctx.restore();
  } else if (item.place === 'head') {
    // shown on a pale head so it sits where it will be worn
    ctx.save();
    ctx.translate(80, 74);
    ctx.scale(1.9, 1.9);
    circleAt(ctx, 0, 0, 18, 'rgba(255, 217, 184, 0.6)', 1.2);
    drawHead(ctx, id, 0, 0, 18, 0, 'boy');
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(80, 60);
    ctx.scale(2.4, 2.4);
    if (id === 'cloak' || id === 'goldcloak') drawCape(ctx, id === 'cloak' ? '#2f5d7c' : '#e0b957', 0, -18, 0, 0);
    else drawBack(ctx, id, 0, -18, 0, 0);
    ctx.restore();
  }
}
