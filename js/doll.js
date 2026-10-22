// ---------- the 俠客 from the sprite pack (paper doll) ----------
// The pack is made separately and copied in by tools/sync_sprites.py; its README is the reference. Every sheet
// stores one clip per row, cropped to a cell placed at offset inside the full 268 x 134 frame; the feet stand at
// the pivot 134, 122. A missing left row is the right row mirrored. Layers, bottom to top: back accessory, body,
// hair dye, waist and head accessories, weapon, effect.
// The hand-drawn pixel hero (pixel.js, v0) is still drawn when the pack cannot be loaded.

// sprites/ next to the page; elsewhere (the Claude artifact) the copy on GitHub Pages
const DOLL_BASES = ['sprites/', 'https://yuankailiu.github.io/hanzi-trace/sprites/'];
// state: loading, ready or failed; waiting: canvases to draw again once their pictures arrive
const doll = { base: '', M: null, state: 'loading', images: new Map(), waiting: new Map() };

// the part of the full frame a canvas shows: bust = head and shoulders for the small tile, full = the whole hero
// close up (the 客棧); card and stage leave room for a companion on the left and a treasure on the right, the
// stage with some ground under the feet so the hero stands mid-stage
const DOLL_VIEWS = {
  bust: { x: 110, y: 76, w: 48, h: 36 },
  full: { x: 110, y: 74, w: 48, h: 54 },
  card: { x: 90, y: 69, w: 76, h: 57 },
  stage: { x: 88, y: 75, w: 84, h: 78 },
};
// views that show the hero alone, without companion or treasure
const DOLL_ALONE = ['bust', 'full'];
const PET_GAP = 12;
const FLY_LIFT = 26;

async function dollLoad() {
  for (const base of DOLL_BASES) {
    try {
      const r = await fetch(base + 'manifest.json');
      if (!r.ok) continue;
      doll.M = await r.json();
      doll.base = base;
      doll.state = 'ready';
      break;
    } catch (e) {}
  }
  if (doll.state !== 'ready') doll.state = 'failed';
  dollWake();
}
// draw again whatever waited for a picture
function dollWake() {
  const waiting = doll.waiting;
  doll.waiting = new Map();
  waiting.forEach(function (redraw) { redraw(); });
}
// one picture of the pack: { img } once loaded, { failed } if it is not there
function dollImage(path) {
  let entry = doll.images.get(path);
  if (!entry) {
    entry = { img: null, failed: false };
    doll.images.set(path, entry);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      entry.img = img;
      dollWake();
    };
    img.onerror = function () {
      entry.failed = true;
      dollWake();
    };
    img.src = doll.base + path;
  }
  return entry;
}

function dollFrameAt(durations, t, loop) {
  let total = 0;
  for (const d of durations) total += d;
  let x = loop ? t % total : Math.min(t, total - 1);
  for (let i = 0; i < durations.length; i++) {
    if (x < durations[i]) return i;
    x -= durations[i];
  }
  return durations.length - 1;
}
function dollClipLength(clip) {
  let total = 0;
  for (const d of clip.durations) total += d;
  return total;
}

// a sheet's row for a clip, or null; a missing left row is the right one mirrored
function dollRow(sheet, prefix, action, dir) {
  const meta = doll.M.sheets[sheet];
  if (!meta) return null;
  let key = prefix + action + '_' + dir;
  let mirror = false;
  if (!meta.rows[key] && dir === 'L') {
    key = prefix + action + '_R';
    mirror = true;
  }
  if (!meta.rows[key]) return null;
  return { sheet: sheet, meta: meta, row: meta.rows[key][0], mirror: mirror };
}

function dollRankId(title, gender) {
  const n = Math.max(1, Math.min(20, (title || 0) + 1));
  return (gender === 'girl' ? 'F' : 'R') + (n < 10 ? '0' : '') + n;
}
// the effect level from the rank and the weapon's tier (README: fxFormula)
function dollFxLevel(rankN, tier) {
  const f = doll.M.fxFormula;
  const score = f.rank_weight * (rankN - 1) / 19 + f.weapon_weight * (tier - 1) / 4;
  let level = 0;
  for (const t of f.thresholds) {
    if (score >= t) level += 1;
  }
  return level;
}

// the layers of one look doing one action: o = { title, gear, gender }, action idle / attack1 / attack2
function dollLayers(o, action, dir) {
  const M = doll.M;
  const rankId = dollRankId(o.title, o.gender || state.gender);
  let rank = null;
  for (const r of M.ranks) {
    if (r.id === rankId) rank = r;
  }
  const gear = o.gear || {};
  const weapon = itemById(gear.weapon);
  let cls = weapon && weapon.slot === 'weapon' ? weapon.cls : 'None';
  // bare hands fight with the fists
  const unarmed = cls === 'None';
  if (unarmed && action !== 'idle') cls = 'Fist';
  const src = rank.sources[cls];
  let clip = M.clips[src + '|' + cls + '|' + action + '|' + dir];
  if (!clip) {
    action = 'idle';
    clip = M.clips[src + '|' + cls + '|idle|' + dir];
  }
  const sheets = [];
  const back = gear.back ? 'layers/acc/' + src + '/' + gear.back + '/' + cls + '.png' : '';
  if (back) sheets.push([back, '']);
  sheets.push(['layers/body/' + rank.id + '/' + cls + '.png', '']);
  if (gear.hair) sheets.push(['layers/hair/' + src + '/' + gear.hair + '/' + cls + '.png', '']);
  if (gear.waist) sheets.push(['layers/acc/' + src + '/' + gear.waist + '/' + cls + '.png', '']);
  if (gear.head) sheets.push(['layers/acc/' + src + '/' + gear.head + '/' + cls + '.png', '']);
  if (!unarmed) {
    sheets.push(['layers/weapon/' + src + '/' + weapon.id + '.png', '']);
    if (action !== 'idle') sheets.push(['layers/fx/' + src + '/' + weapon.id + '.png', 'L' + dollFxLevel(rank.n, weapon.tier) + '_']);
  }
  const layers = [];
  for (const s of sheets) {
    const row = dollRow(s[0], s[1], action, dir);
    if (row) layers.push(row);
  }
  // 傳世 skills of spear, sabre and fist shake the scene for three frames from the impact
  const shakes = rank.realm >= 5 && action === 'attack2' && ['Spear', 'Sabre', 'Fist'].indexOf(cls) >= 0;
  return { rank: rank, cls: cls, action: action, clip: clip, layers: layers, shakes: shakes };
}

// frame i of a layer, with the full frame's top-left at (fx, fy)
function dollBlit(ctx, layer, img, i, fx, fy) {
  const cw = layer.meta.cell[0];
  const ch = layer.meta.cell[1];
  const ox = layer.meta.offset[0];
  const oy = layer.meta.offset[1];
  const fullW = layer.meta.frame[0];
  const x = layer.mirror ? fullW - ox - cw : ox;
  if (layer.mirror) {
    ctx.save();
    ctx.translate(fx + x + cw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, i * cw, layer.row * ch, cw, ch, 0, fy + oy, cw, ch);
    ctx.restore();
  } else {
    ctx.drawImage(img, i * cw, layer.row * ch, cw, ch, fx + x, fy + oy, cw, ch);
  }
}

// every picture of these layers, or null while one is still on its way
function dollImagesOf(layers) {
  const out = [];
  for (const layer of layers) {
    const entry = dollImage(layer.sheet);
    if (entry.failed) {
      out.push(null);
      continue;
    }
    if (!entry.img) return null;
    out.push(entry.img);
  }
  return out;
}

// the companion behind the hero, on the side it does not face; fliers hover higher with a gentle bob
function dollPet(id, t) {
  const p = doll.M.pets[id];
  if (!p) return null;
  const layer = dollRow('pets/' + id + '.png', '', 'idle', 'R');
  if (!layer) return null;
  const entry = dollImage(layer.sheet);
  if (entry.failed) return { skip: true };
  if (!entry.img) return null;
  const pivotX = doll.M.frame.pivot[0];
  const pivotY = doll.M.frame.pivot[1];
  let groundY = pivotY;
  if (p.habitat === 'fly') groundY -= FLY_LIFT + Math.round(Math.sin(t / 420) * 1.5);
  const footX = pivotX - PET_GAP - (p.width - p.pivot[0]);
  return {
    layer: layer,
    img: entry.img,
    frame: dollFrameAt(p.clips.idle_R.durations, t, true),
    // the pet's own full frame, its feet at its pivot
    fx: footX - p.pivot[0],
    fy: groundY - p.pivot[1],
  };
}
// a treasure floating at the hero's shoulder
function dollTreasure(id, t) {
  const tr = doll.M.treasures[id];
  if (!tr) return null;
  const entry = dollImage('treasures/' + id + '.png');
  if (entry.failed) return { skip: true };
  if (!entry.img) return null;
  const pivotX = doll.M.frame.pivot[0];
  const pivotY = doll.M.frame.pivot[1];
  return {
    img: entry.img,
    x: pivotX + 13,
    y: pivotY - 32 - tr.height / 2 + Math.round(Math.sin(t / 500) * 1.5),
  };
}

// Draw o = { title, gear, gender, action, t, hurt } in canvas through a view; false while pictures load.
// action idle loops; attack1 / attack2 play once and then hold their last frame. hurt: shaken sideways.
function dollDraw(canvas, o, viewName) {
  const view = DOLL_VIEWS[viewName] || DOLL_VIEWS.card;
  const t = o.t || 0;
  const L = dollLayers(o, o.action || 'idle', 'R');
  const images = dollImagesOf(L.layers);
  if (!images || !L.clip) return false;
  const gear = o.gear || {};
  // the bust is the hero alone
  const alone = DOLL_ALONE.indexOf(viewName) >= 0;
  const pet = gear.pet && !alone ? dollPet(gear.pet, t) : null;
  const treasure = gear.treasure && !alone ? dollTreasure(gear.treasure, t) : null;
  if ((gear.pet && !alone && !pet) || (gear.treasure && !alone && !treasure)) return false;

  canvas.classList.add('pixel', 'doll');
  if (canvas.width !== view.w || canvas.height !== view.h) {
    canvas.width = view.w;
    canvas.height = view.h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, view.w, view.h);

  const i = dollFrameAt(L.clip.durations, t, L.action === 'idle');
  let shake = 0;
  if (L.shakes && L.clip.impact !== undefined) {
    const since = i - L.clip.impact;
    if (since >= 0 && since < 3) shake = since % 2 ? -1 : 1;
  }
  if (o.hurt) shake = Math.round(Math.sin(t / 30) * 2);
  const fx = -view.x + shake;
  const fy = -view.y;

  if (o.shadow) {
    ctx.fillStyle = 'rgba(70, 45, 25, 0.18)';
    ctx.fillRect(fx + 124, fy + 122, 21, 2);
  }
  if (pet && !pet.skip) dollBlit(ctx, pet.layer, pet.img, pet.frame, fx + pet.fx, fy + pet.fy);
  for (let k = 0; k < L.layers.length; k++) {
    if (images[k]) dollBlit(ctx, L.layers[k], images[k], i, fx, fy);
  }
  if (treasure && !treasure.skip) ctx.drawImage(treasure.img, fx + treasure.x, fy + treasure.y);
  return true;
}
// how long an action of this look plays, in ms
function dollActionLength(o, action) {
  if (doll.state !== 'ready') return 0;
  const L = dollLayers(o, action, 'R');
  return L.clip ? dollClipLength(L.clip) : 0;
}

// ---------- shop pictures: the pack's 96 px icon; a pet, treasure or hair dye without one is drawn from its sprite ----------
const ICON_W = 128;
const ICON_H = 96;
// shade: a colour to turn the picture into a shadow (an item not yet known)
function dollIcon(canvas, item, shade) {
  canvas.classList.add('pixel');
  if (canvas.width !== ICON_W || canvas.height !== ICON_H) {
    canvas.width = ICON_W;
    canvas.height = ICON_H;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ICON_W, ICON_H);
  if (doll.state === 'loading') {
    doll.waiting.set(canvas, function () { dollIcon(canvas, item, shade); });
    return;
  }
  if (doll.state === 'failed') return;
  let path = item.art || '';
  let crop = null;
  if (!path && item.slot === 'pet') {
    const layer = dollRow('pets/' + item.id + '.png', '', 'idle', 'R');
    if (layer) {
      path = layer.sheet;
      crop = { x: 0, y: layer.row * layer.meta.cell[1], w: layer.meta.cell[0], h: layer.meta.cell[1] };
    }
  } else if (!path && item.slot === 'treasure') {
    path = 'treasures/' + item.id + '.png';
  } else if (!path && item.place === 'hair') {
    const layer = dollRow('layers/hair/Hero/' + item.id + '/None.png', '', 'idle', 'R');
    if (layer) {
      path = layer.sheet;
      crop = { x: 0, y: layer.row * layer.meta.cell[1], w: layer.meta.cell[0], h: layer.meta.cell[1] };
    }
  }
  if (!path) return;
  const entry = dollImage(path);
  if (entry.failed) return;
  if (!entry.img) {
    doll.waiting.set(canvas, function () { dollIcon(canvas, item, shade); });
    return;
  }
  const img = entry.img;
  if (!crop) crop = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  // the largest whole-number scale that fits, centred
  const k = Math.max(1, Math.floor(Math.min((ICON_W - 8) / crop.w, (ICON_H - 8) / crop.h)));
  const w = crop.w * k;
  const h = crop.h * k;
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, Math.round((ICON_W - w) / 2), Math.round((ICON_H - h) / 2), w, h);
  if (shade) silhouette(canvas, shade);
}
function drawItemIcon(canvas, item, shade) {
  dollIcon(canvas, item, shade);
}
dollLoad();
