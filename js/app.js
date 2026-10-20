// 筆順描字本: practice flow, word bank, 俠客 profile (local + optional cloud), 江湖 rewards.

const N_CHUNKS = 128;
const TRANSPARENT = 'rgba(0,0,0,0)';
const COMPARE_RED = 'rgba(178,58,46,0.38)';
const ARENA_PAD = 12;
const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const SEAL_TEXT = { 3: '甲上', 2: '甲', 1: '加油' };
const TAELS_FOR_GRADE = { 3: 10, 2: 6, 1: 3 };
const RECENT_MAX = 15;

const CURRENT_KEY = 'bishun.current';
const PROFILE_PREFIX = 'bishun.profile.';
const PASS_PREFIX = 'bishun.pass.';
const PASSHASH_PREFIX = 'bishun.passhash.';
const LEGACY_STORE = 'bishun-trace.v1';
const LEGACY_PURSE = 'bishun-trace.purse.v1';

const box = document.getElementById('box');
const arena = document.getElementById('arena');
const stage = document.getElementById('stage');
const writerEl = document.getElementById('writer');
const mineEl = document.getElementById('mine');
const chipsEl = document.getElementById('chips');
const watchActions = document.getElementById('watchActions');
const quizActions = document.getElementById('quizActions');
const resultEl = document.getElementById('result');
const sealEl = document.getElementById('seal');
const keepBtn = document.getElementById('keepBtn');
const compareBtn = document.getElementById('compareBtn');
const stepCountEl = document.getElementById('stepCount');

const RADICAL_NAMES = {
  '氵': '三點水', '冫': '兩點水', '口': '口字旁', '艹': '草字頭', '艸': '草字頭', '木': '木字旁',
  '扌': '提手旁', '手': '手字底', '亻': '單人旁', '人': '人字旁', '彳': '雙人旁',
  '钅': '金字旁', '釒': '金字旁', '金': '金字旁', '虫': '虫字旁', '土': '土字旁',
  '⺼': '肉月旁', '月': '月字旁', '忄': '豎心旁', '心': '心字底', '阝': '耳朵旁', '卩': '單耳旁',
  '女': '女字旁', '言': '言字旁', '訁': '言字旁', '讠': '言字旁', '⺮': '竹字頭', '竹': '竹字頭',
  '纟': '絞絲旁', '糹': '絞絲旁', '糸': '絞絲旁', '辶': '走馬旁', '辵': '走馬旁',
  '火': '火字旁', '灬': '四點火', '疒': '病字旁', '足': '足字旁', '日': '日字旁', '石': '石字旁',
  '山': '山字旁', '王': '斜玉旁', '玉': '玉字底', '目': '目字旁', '犭': '反犬旁', '犬': '犬字旁',
  '魚': '魚字旁', '鱼': '魚字旁', '鳥': '鳥字旁', '鸟': '鳥字旁', '衤': '衣字旁', '衣': '衣字底',
  '刂': '立刀旁', '刀': '刀字旁', '宀': '寶蓋頭', '冖': '禿寶蓋', '穴': '穴寶蓋', '酉': '酉字旁',
  '禾': '禾木旁', '貝': '貝字旁', '贝': '貝字旁', '广': '廣字頭', '厂': '廠字頭', '尸': '尸字頭',
  '馬': '馬字旁', '马': '馬字旁', '巾': '巾字旁', '車': '車字旁', '车': '車字旁', '米': '米字旁',
  '門': '門字框', '门': '門字框', '囗': '國字框', '冂': '同字框', '匚': '匚字框',
  '頁': '頁字旁', '页': '頁字旁', '力': '力字旁', '飠': '食字旁', '饣': '食字旁', '食': '食字旁',
  '礻': '示字旁', '示': '示字底', '雨': '雨字頭', '攵': '反文旁', '攴': '反文旁', '舟': '舟字旁',
  '戈': '戈字旁', '牛': '牛字旁', '耳': '耳字旁', '子': '子字旁', '弓': '弓字旁', '歹': '歹字旁',
  '皿': '皿字底', '欠': '欠字旁', '羽': '羽字旁', '革': '革字旁', '儿': '兒字底', '罒': '四字頭',
  '羊': '羊字旁', '走': '走字旁', '白': '白字旁', '又': '又字旁', '骨': '骨字旁', '亠': '文字頭',
  '寸': '寸字旁', '方': '方字旁', '黑': '黑字旁', '水': '水字底', '彡': '三撇', '立': '立字旁',
  '勹': '包字頭', '見': '見字旁', '见': '見字旁', '角': '角字旁', '虍': '虎字頭', '斤': '斤字旁',
  '止': '止字旁', '行': '行字旁', '缶': '缶字旁', '士': '士字旁', '夕': '夕字旁', '矢': '矢字旁',
  '小': '小字頭', '⺌': '小字頭', '廾': '廾字底', '風': '風字旁', '豆': '豆字旁', '舌': '舌字旁',
  '工': '工字旁', '文': '文字旁', '爫': '爪字頭', '片': '片字旁', '皮': '皮字旁', '身': '身字旁',
  '覀': '西字頭', '廴': '建字底', '耂': '老字頭', '老': '老字頭', '大': '大字頭', '田': '田字旁',
  '十': '十字旁', '气': '氣字頭', '髟': '髮字頭', '鬼': '鬼字旁', '殳': '殳字旁', '毛': '毛字旁',
};

const state = {
  // current exercise
  text: '',
  meaning: '',
  chars: [],
  idx: 0,
  mode: 'watch',
  // settings
  grid: 'tian',
  lenient: true,
  slow: true,
  sound: true,
  radical: true,
  keep: false,
  // progress
  stars: {},
  myName: '',
  recent: [],
};
const purse = {
  taels: 0,
  ingots: 0,
  earned: 0,
  owned: [],
  equipped: '',
  scrolls: [],
  lastDay: '',
  streak: 0,
};
const account = { alias: '', pass: '', sync: 'local' };
const strokeCount = {};
const glyphData = {};
const sessionDone = new Set();
let words = [];

let writer = null;
let charData = null;
let builtSize = 0;
let buildToken = 0;
let stepNum = 0;

// ---------- helpers ----------
function keepMode() {
  return state.keep && state.mode !== 'watch';
}
function writerColors() {
  if (keepMode()) {
    return {
      strokeColor: TRANSPARENT,
      outlineColor: token('--outline'),
      drawingColor: token('--ink'),
      highlightColor: token('--hint'),
      radicalColor: TRANSPARENT,
    };
  }
  return {
    strokeColor: token(state.mode === 'watch' ? '--ink' : '--ink-wet'),
    outlineColor: token('--outline'),
    drawingColor: token('--accent'),
    highlightColor: token('--hint'),
    radicalColor: state.radical ? token('--radical') : null,
  };
}
function parseText(text) {
  const out = [];
  for (const c of Array.from(text)) {
    if (/\p{Script=Han}/u.test(c)) out.push(c);
  }
  return out.slice(0, 12);
}
function boxSize() {
  const w = stage.clientWidth - 2 * ARENA_PAD;
  const h = stage.clientHeight - 2 * ARENA_PAD - 14;
  return Math.floor(Math.max(200, Math.min(w, h, 760)));
}
function boxPadding(size) {
  return Math.round(size * 0.06);
}
function drawingWidth(size) {
  return Math.max(6, Math.round(size / 36));
}
function gradeFor(mistakes) {
  if (mistakes <= 1) return 3;
  if (mistakes <= 4) return 2;
  return 1;
}
function marksHtml(n) {
  let s = '';
  for (let i = 0; i < 3; i++) {
    s += i < n ? '<span class="on">●</span>' : '<span class="off">○</span>';
  }
  return s;
}
function syceeHtml(kind) {
  return '<svg class="sycee ' + kind + '" aria-hidden="true"><use href="#sycee"></use></svg>';
}
function currentChar() {
  return state.chars[state.idx];
}
function localDay(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Hanzi Writer's coordinate frame: x in [0, 1024], y in [-124, 900] pointing up.
function toScreen(x, y, size) {
  const pad = boxPadding(size);
  const scale = (size - 2 * pad) / 1024;
  return {
    x: pad + x * scale,
    y: size - pad - 124 * scale - y * scale,
  };
}

// The same stroke outlines the writing box uses, so every glyph on the page has one shape.
function glyphSvg(data) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1024 1024');
  svg.setAttribute('class', 'glyph-svg');
  svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', 'scale(1,-1) translate(0,-900)');
  for (const d of data.strokes) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    g.append(p);
  }
  svg.append(g);
  return svg;
}

// ---------- stroke data (bundled in 128 chunk files) ----------
const chunkCache = new Map();
function loadChunk(i) {
  if (!chunkCache.has(i)) {
    const url = 'data/c' + String(i).padStart(3, '0') + '.json';
    const p = fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    p.catch(function () { chunkCache.delete(i); });
    chunkCache.set(i, p);
  }
  return chunkCache.get(i);
}
function getCharData(ch) {
  const i = ch.codePointAt(0) % N_CHUNKS;
  return loadChunk(i).then(function (chunk) { return chunk[ch] || null; });
}

// ---------- profile: what gets saved per 俠客 ----------
function serializeProfile() {
  return {
    savedAt: Date.now(),
    settings: {
      grid: state.grid, lenient: state.lenient, slow: state.slow,
      sound: state.sound, radical: state.radical, keep: state.keep,
    },
    stars: state.stars,
    myName: state.myName,
    recent: state.recent,
    text: state.text,
    meaning: state.meaning,
    purse: purse,
  };
}
function resetProgress() {
  state.stars = {};
  state.myName = '';
  state.recent = [];
  state.text = '';
  state.meaning = '';
  Object.assign(purse, { taels: 0, ingots: 0, earned: 0, owned: [], equipped: '', scrolls: [], lastDay: '', streak: 0 });
}
function applyProfile(source) {
  // work on a copy: a carried-over guest profile shares the live purse object
  const p = JSON.parse(JSON.stringify(source));
  resetProgress();
  if (p.settings) {
    if (p.settings.grid) state.grid = p.settings.grid;
    for (const key of ['lenient', 'slow', 'sound', 'radical', 'keep']) {
      if (typeof p.settings[key] === 'boolean') state[key] = p.settings[key];
    }
  }
  if (p.stars) state.stars = p.stars;
  if (p.myName) state.myName = p.myName;
  if (p.recent) state.recent = p.recent;
  if (p.text) state.text = p.text;
  if (p.meaning) state.meaning = p.meaning;
  if (p.purse) Object.assign(purse, p.purse);
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
}

// one-time move of the progress saved by earlier versions into the guest profile
function legacyProfile() {
  const raw = localStorage.getItem(LEGACY_STORE);
  const rawPurse = localStorage.getItem(LEGACY_PURSE);
  if (!raw && !rawPurse) return null;
  const p = { settings: {}, purse: {} };
  if (raw) {
    const old = JSON.parse(raw);
    p.settings = old;
    p.stars = old.stars;
    p.myName = old.name;
    p.text = old.name;
  }
  if (rawPurse) p.purse = JSON.parse(rawPurse);
  return p;
}

function loadLocalProfile(alias) {
  try {
    const raw = localStorage.getItem(PROFILE_PREFIX + alias);
    if (raw) return JSON.parse(raw);
    if (alias === '') return legacyProfile();
  } catch (e) {}
  return null;
}
function save() {
  try {
    localStorage.setItem(PROFILE_PREFIX + account.alias, JSON.stringify(serializeProfile()));
  } catch (e) {}
  scheduleCloudSave();
}

// ---------- cloud sync (Supabase RPC, see supabase/schema.sql) ----------
function cloudEnabled() {
  return Boolean(CLOUD.url && CLOUD.anonKey);
}
async function rpc(fn, body) {
  const r = await fetch(CLOUD.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      apikey: CLOUD.anonKey,
      Authorization: 'Bearer ' + CLOUD.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    const err = new Error(text);
    err.wrongPass = text.indexOf('wrong passcode') >= 0;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}
let cloudTimer = 0;
function scheduleCloudSave() {
  if (!cloudEnabled() || !account.alias) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudSave, 1500);
}
async function cloudSave() {
  try {
    await rpc('profile_save', { p_alias: account.alias, p_pass: account.pass, p_data: serializeProfile() });
    account.sync = 'cloud';
  } catch (e) {
    account.sync = 'offline';
  }
  renderProfileStatus();
}
// on start, take the cloud copy if another device saved more recently
async function cloudRefresh() {
  if (!cloudEnabled() || !account.alias || !account.pass) return;
  try {
    const res = await rpc('profile_load', { p_alias: account.alias, p_pass: account.pass });
    account.sync = 'cloud';
    const local = loadLocalProfile(account.alias);
    const localAt = local && local.savedAt ? local.savedAt : 0;
    if (res && res.data && (res.data.savedAt || 0) > localAt) {
      applyProfile(res.data);
      save();
      renderAll();
      startText();
    }
  } catch (e) {
    account.sync = 'offline';
  }
  renderProfileStatus();
}

async function passHash(alias, pass) {
  const bytes = new TextEncoder().encode(alias + ':' + pass);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  let hex = '';
  for (const b of new Uint8Array(digest)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function switchTo(alias, pass, data) {
  account.alias = alias;
  account.pass = pass;
  account.sync = cloudEnabled() && alias ? 'cloud' : 'local';
  try {
    localStorage.setItem(CURRENT_KEY, alias);
    if (alias) localStorage.setItem(PASS_PREFIX + alias, pass);
  } catch (e) {}
  if (data) applyProfile(data);
  else resetProgress();
  save();
  renderAll();
  startText();
}

async function login(alias, pass) {
  const note = document.getElementById('profileNote');
  alias = alias.trim().toLowerCase();
  if (!alias || alias.length > 24) {
    note.textContent = '請輸入江湖名字。';
    return;
  }
  if (!/^[0-9]{4}$/.test(pass)) {
    note.textContent = '密碼要是 4 個數字。';
    return;
  }
  // a guest's progress comes along into a brand-new account
  const carry = account.alias === '' ? serializeProfile() : null;

  if (cloudEnabled()) {
    note.textContent = '連線中…';
    let res = null;
    try {
      res = await rpc('profile_load', { p_alias: alias, p_pass: pass });
    } catch (e) {
      note.textContent = e.wrongPass ? '密碼不對喔，再試一次。' : '連不上雲端，請稍後再試。';
      return;
    }
    let data = res ? res.data : carry;
    if (!res) {
      try {
        await rpc('profile_save', { p_alias: alias, p_pass: pass, p_data: data || {} });
        toast('建立新俠客「' + alias + '」');
      } catch (e) {
        note.textContent = '連不上雲端，請稍後再試。';
        return;
      }
    } else {
      toast('歡迎回來，' + alias);
    }
    note.textContent = '';
    switchTo(alias, pass, data);
    closeSheet(document.getElementById('profileSheet'));
    return;
  }

  // device-only accounts: the passcode keeps siblings' progress apart on a shared tablet
  const hash = await passHash(alias, pass);
  const stored = localStorage.getItem(PASSHASH_PREFIX + alias);
  if (stored && stored !== hash) {
    note.textContent = '密碼不對喔，再試一次。';
    return;
  }
  localStorage.setItem(PASSHASH_PREFIX + alias, hash);
  let data = loadLocalProfile(alias);
  if (data) toast('歡迎回來，' + alias);
  else {
    data = carry;
    toast('建立新俠客「' + alias + '」');
  }
  note.textContent = '';
  switchTo(alias, pass, data);
  closeSheet(document.getElementById('profileSheet'));
}

function renderProfileStatus() {
  const status = document.getElementById('profileStatus');
  const note = document.getElementById('profileNote');
  const name = account.alias || '訪客';
  let where = '只存在這台裝置';
  if (account.alias && cloudEnabled()) where = account.sync === 'offline' ? '雲端暫時連不上，先存在這台裝置' : '雲端同步';
  status.innerHTML = '目前：<b></b>（' + where + '）';
  status.querySelector('b').textContent = name;
  if (!note.textContent) {
    note.textContent = cloudEnabled()
      ? '第一次輸入的名字會建立新帳號；在其他裝置用同一個名字和密碼登入，就能接著練。'
      : '雲端同步還沒開通，帳號只存在這台裝置。一台平板有好幾個小朋友時，可以各自登入。';
  }
  const btn = document.getElementById('profileBtn');
  let badge = btn.querySelector('.badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'badge';
    btn.append(badge);
  }
  badge.textContent = account.alias ? Array.from(account.alias)[0] : '';
  btn.title = '俠客帳號：' + name;
}

// ---------- word bank ----------
function pickWord() {
  const tier = Math.min(rankIndex(purse.earned), 6);
  const pool = [];
  let total = 0;
  for (const w of words) {
    if (w.t > tier) continue;
    if (state.recent.indexOf(w.w) >= 0) continue;
    let weight = 1;
    if (w.t === tier) weight = 4;
    else if (w.t === tier - 1) weight = 2;
    pool.push({ w: w, weight: weight });
    total += weight;
  }
  if (pool.length === 0) return words[Math.floor(Math.random() * words.length)];
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item.w;
  }
  return pool[pool.length - 1].w;
}
function meaningFor(text) {
  for (const w of words) {
    if (w.w === text) return w.m;
  }
  return '';
}
function nextWord(speak) {
  if (!words.length) return;
  const w = pickWord();
  loadText(w.w, w.m, speak);
}

// ---------- the current exercise ----------
function loadText(text, meaning, speak) {
  const chars = parseText(text);
  if (chars.length === 0) {
    toast('請輸入中文字');
    return;
  }
  state.text = chars.join('');
  state.meaning = meaning || meaningFor(state.text);
  state.chars = chars;
  state.idx = 0;
  state.mode = 'watch';
  sessionDone.clear();

  const at = state.recent.indexOf(state.text);
  if (at >= 0) state.recent.splice(at, 1);
  state.recent.unshift(state.text);
  state.recent = state.recent.slice(0, RECENT_MAX);

  save();
  renderModes();
  renderMeaning();
  renderChips();
  build();
  if (speak && state.sound) say(state.text);
  chars.forEach(function (ch) {
    getCharData(ch).then(function (d) {
      strokeCount[ch] = d ? d.strokes.length : 0;
      if (d) glyphData[ch] = d;
      renderChips();
    }, function () {});
  });
}
// resume what this 俠客 was practicing, else their name, else a word from the bank
function startText() {
  if (state.text) loadText(state.text, state.meaning);
  else if (state.myName) loadText(state.myName);
  else if (words.length) nextWord(false);
}

function renderMeaning() {
  const el = document.getElementById('meaning');
  el.textContent = state.meaning;
  el.title = state.meaning;
}

// ---------- seal + ink ----------
function hideSeal() {
  sealEl.hidden = true;
  sealEl.classList.remove('stamp');
}
function stampSeal(grade) {
  const text = SEAL_TEXT[grade];
  const span = document.getElementById('sealText');
  span.textContent = text;
  const scale = text.length === 1 ? 0.15 : 0.09;
  span.style.fontSize = Math.round(builtSize * scale) + 'px';
  sealEl.hidden = false;
  restartAnimation(sealEl, 'stamp');
  setTimeout(function () {
    sfxStamp();
    restartAnimation(arena, 'thump');
  }, reducedMotion() ? 0 : 230);
}
function inkBleed() {
  if (keepMode()) {
    restartAnimation(mineEl, 'ink');
    return;
  }
  restartAnimation(writerEl, 'ink');
  if (writer) writer.updateColor('strokeColor', token('--ink'), { duration: 1400 });
}
// the child's own strokes, kept in place of the standard ones
function addMine(points) {
  const size = builtSize;
  let attr = '';
  for (const p of points) {
    const s = toScreen(p.x, p.y, size);
    attr += s.x.toFixed(1) + ',' + s.y.toFixed(1) + ' ';
  }
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', attr.trim());
  line.setAttribute('stroke-width', String(Math.round(drawingWidth(size) * 1.25)));
  mineEl.append(line);
}

// ---------- 江湖: ranks, 武功, purse, weapons ----------
function rankIndex(earned) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (earned >= RANKS[i].at) idx = i;
  }
  return idx;
}
function kungfuIndex() {
  let idx = 0;
  for (let i = 0; i < KUNGFU.length; i++) {
    if (purse.scrolls.length >= KUNGFU[i].at) idx = i;
  }
  return idx;
}
function weaponById(id) {
  for (const w of WEAPONS) {
    if (w.id === id) return w;
  }
  return null;
}
function qiColor() {
  const w = weaponById(purse.equipped);
  if (w) return w.qi;
  return token('--qi');
}
function renderPurse() {
  document.getElementById('rankTag').textContent = RANKS[rankIndex(purse.earned)].name;
  let kf = '武功・' + KUNGFU[kungfuIndex()].name;
  if (purse.streak > 1) kf += '　<small>連續 ' + purse.streak + ' 天</small>';
  document.getElementById('kungfuTag').innerHTML = kf;
  renderCounters();
}

function award(ch, grade, mistakes) {
  let taels = TAELS_FOR_GRADE[grade];
  if (state.mode === 'write') taels *= 2;

  const today = localDay(new Date());
  if (purse.lastDay !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (purse.lastDay === localDay(yesterday)) purse.streak += 1;
    else purse.streak = 1;
    purse.lastDay = today;
    const bonus = 5 + Math.min(purse.streak, 7);
    taels += bonus;
    let note = '今日練功　+' + bonus + ' 兩';
    if (purse.streak > 1) note += '（連續 ' + purse.streak + ' 天）';
    toast(note);
  }

  let ingots = 0;
  if (state.mode === 'write' && mistakes === 0) ingots += 1;

  const rankBefore = rankIndex(purse.earned);
  purse.taels += taels;
  purse.earned += taels;
  purse.ingots += ingots;
  const rankAfter = rankIndex(purse.earned);
  if (rankAfter > rankBefore) {
    toast('晉升「' + RANKS[rankAfter].name + '」');
    setTimeout(function () { sfxGong(0.5); }, 600);
  }

  if (state.mode === 'write' && grade === 3 && purse.scrolls.indexOf(ch) < 0) {
    const kfBefore = kungfuIndex();
    purse.scrolls.push(ch);
    toast('習得「' + ch + '字訣」');
    const kfAfter = kungfuIndex();
    if (kfAfter > kfBefore) {
      toast('武功精進：「' + KUNGFU[kfAfter].name + '」');
      setTimeout(function () { sfxGong(0.4); }, 1200);
    }
  }

  save();
  renderPurse();
  return { taels: taels, ingots: ingots };
}

function renderArmory() {
  const idx = rankIndex(purse.earned);
  document.getElementById('armoryRank').textContent = RANKS[idx].name;
  const next = RANKS[idx + 1];
  const nextEl = document.getElementById('armoryNext');
  const bar = document.getElementById('rankBar');
  if (next) {
    nextEl.textContent = '再 ' + (next.at - purse.earned) + ' 兩 →「' + next.name + '」';
    const span = next.at - RANKS[idx].at;
    bar.style.width = Math.round(100 * (purse.earned - RANKS[idx].at) / span) + '%';
  } else {
    nextEl.textContent = '最高名號';
    bar.style.width = '100%';
  }

  // every rank as a little 俠客; ranks not reached yet are shown as a shadow
  const ladder = document.getElementById('ladder');
  ladder.innerHTML = '';
  RANKS.forEach(function (r, i) {
    const item = document.createElement('div');
    item.className = 'ladder-item';
    if (i === idx) item.classList.add('now');
    if (i > idx) item.classList.add('locked');
    const c = document.createElement('canvas');
    c.width = AV_W;
    c.height = AV_H;
    const ctx = c.getContext('2d');
    drawAvatar(ctx, i, '', 'stand', 0, null, 0);
    if (i > idx) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(110, 100, 90, 0.9)';
      ctx.fillRect(0, 0, AV_W, AV_H);
      ctx.globalCompositeOperation = 'source-over';
    }
    const label = document.createElement('span');
    label.textContent = r.name;
    item.append(c, label);
    ladder.append(item);
  });

  const kf = kungfuIndex();
  document.getElementById('armoryKungfu').textContent = KUNGFU[kf].name;
  const kfNext = KUNGFU[kf + 1];
  document.getElementById('armoryKungfuNext').textContent = kfNext
    ? '字訣 ' + purse.scrolls.length + ' / ' + kfNext.at + ' →「' + kfNext.name + '」'
    : '武功已達最高境界';
  const kfLadder = document.getElementById('kungfuLadder');
  kfLadder.innerHTML = '';
  KUNGFU.forEach(function (k, i) {
    const s = document.createElement('span');
    s.textContent = k.name;
    if (i < kf) s.className = 'reached';
    if (i === kf) s.className = 'now';
    kfLadder.append(s);
  });

  const grid = document.getElementById('weapons');
  grid.innerHTML = '';
  for (const w of WEAPONS) {
    const owned = purse.owned.indexOf(w.id) >= 0;
    const card = document.createElement('div');
    card.className = 'weapon';
    if (!owned) card.classList.add('locked');
    if (purse.equipped === w.id) card.classList.add('equipped');

    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 20;
    drawWeaponCard(c, w.id);

    const name = document.createElement('div');
    name.className = 'w-name';
    name.textContent = w.name;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (owned) {
      if (purse.equipped === w.id) {
        btn.textContent = '✓ 拿著';
        btn.addEventListener('click', function () { equip(''); });
      } else {
        btn.textContent = '拿起來';
        btn.addEventListener('click', function () { equip(w.id); });
      }
    } else {
      const canBuy = w.ingots ? purse.ingots >= w.ingots : purse.taels >= w.taels;
      btn.innerHTML = w.ingots ? syceeHtml('gold') + w.ingots : syceeHtml('silver') + w.taels;
      btn.setAttribute('aria-label', '買' + w.name);
      btn.disabled = !canBuy;
      btn.addEventListener('click', function () { buy(w); });
    }

    card.append(c, name, btn);
    grid.append(card);
  }

  const scrolls = document.getElementById('scrolls');
  scrolls.innerHTML = '';
  if (purse.scrolls.length === 0) {
    const p = document.createElement('span');
    p.className = 'quiet';
    p.textContent = '還沒有';
    scrolls.append(p);
  }
  for (const ch of purse.scrolls) {
    const s = document.createElement('span');
    s.className = 'scroll-item';
    s.textContent = ch + '字訣';
    scrolls.append(s);
  }
}

function buy(w) {
  if (w.ingots) {
    if (purse.ingots < w.ingots) return;
    purse.ingots -= w.ingots;
  } else {
    if (purse.taels < w.taels) return;
    purse.taels -= w.taels;
  }
  purse.owned.push(w.id);
  purse.equipped = w.id;
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
  save();
  renderPurse();
  renderArmory();
  sfxTick(1568);
  avatarPlay('attack');
  toast('得到「' + w.name + '」');
}
function equip(id) {
  purse.equipped = id;
  save();
  renderPurse();
  renderArmory();
  avatarPlay('attack');
}

// ---------- pixel 俠客 loop ----------
const avatar = { ctx: null, queue: [], idle: 0, frame: 0, last: 0 };
function avatarPlay(name) {
  avatar.queue = ACTIONS[name].slice();
  if (reducedMotion()) avatarDraw(avatar.queue[0]);
}
function avatarDraw(poseName) {
  const ctx = avatar.ctx;
  ctx.clearRect(0, 0, AV_W, AV_H);
  drawFloor(ctx);
  drawAvatar(ctx, rankIndex(purse.earned), purse.equipped, poseName, avatar.frame, qiColor(), kungfuIndex());
}
function avatarTick(now) {
  const wait = avatar.queue.length ? 95 : 170;
  if (now - avatar.last >= wait) {
    avatar.last = now;
    let pose;
    if (avatar.queue.length) {
      pose = avatar.queue.shift();
    } else {
      pose = IDLE_SEQ[avatar.idle % IDLE_SEQ.length];
      avatar.idle += 1;
    }
    avatar.frame += 1;
    avatarDraw(pose);
  }
  requestAnimationFrame(avatarTick);
}
function startAvatar() {
  avatar.ctx = document.getElementById('avatar').getContext('2d');
  if (reducedMotion()) {
    avatarDraw('stand');
    return;
  }
  requestAnimationFrame(avatarTick);
}

// ---------- info: vertical 注音, radical ----------
function renderZhuyin(el, zy) {
  el.innerHTML = '';
  if (!zy) return;
  let body = zy;
  let tone = '';
  let neutral = false;
  if (body[0] === '˙') {
    neutral = true;
    body = body.slice(1);
  }
  const last = body[body.length - 1];
  if ('ˊˇˋ'.indexOf(last) >= 0) {
    tone = last;
    body = body.slice(0, -1);
  }
  if (neutral) {
    const d = document.createElement('span');
    d.className = 'dot';
    d.textContent = '˙';
    el.append(d);
  }
  for (const sym of Array.from(body)) {
    const s = document.createElement('span');
    s.textContent = sym;
    el.append(s);
  }
  if (tone) {
    const t = document.createElement('span');
    t.className = 'tone';
    t.textContent = tone;
    el.append(t);
  }
}

function renderInfo(data) {
  const zyEl = document.getElementById('zy');
  const radLine = document.getElementById('radLine');
  const mini = document.getElementById('mini');
  if (!data) {
    zyEl.innerHTML = '';
    radLine.textContent = '';
    mini.innerHTML = '';
    return;
  }

  renderZhuyin(zyEl, data.zy && data.zy.length ? data.zy[0] : '');

  const rad = data.rad || '';
  if (rad) {
    const name = RADICAL_NAMES[rad];
    radLine.innerHTML = '部首 <b></b>' + (name ? '　' + name : '');
    radLine.querySelector('b').textContent = rad;
  } else {
    radLine.textContent = '';
  }

  // the model character, with the radical strokes colored
  const radSet = new Set(data.radStrokes || []);
  let paths = '<g transform="scale(1,-1) translate(0,-900)">';
  for (let i = 0; i < data.strokes.length; i++) {
    const cls = radSet.has(i) && state.radical ? 'r' : 'o';
    paths += '<path class="' + cls + '" d="' + data.strokes[i] + '"></path>';
  }
  mini.innerHTML = paths + '</g>';
}

// ---------- name tags in the top bar ----------
function renderChips() {
  chipsEl.innerHTML = '';
  state.chars.forEach(function (ch, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-label', ch);
    if (strokeCount[ch] === 0) b.classList.add('missing');
    b.setAttribute('aria-current', i === state.idx ? 'true' : 'false');

    let g;
    if (glyphData[ch]) {
      g = glyphSvg(glyphData[ch]);
    } else {
      g = document.createElement('span');
      g.className = 'text-glyph';
      g.textContent = ch;
    }

    const meta = document.createElement('span');
    meta.className = 'meta';
    if (strokeCount[ch] === 0) {
      meta.textContent = '沒有資料';
    } else if (state.mode === 'watch') {
      if (strokeCount[ch]) meta.textContent = strokeCount[ch] + ' 筆';
    } else {
      const best = (state.stars[ch] && state.stars[ch][state.mode]) || 0;
      meta.innerHTML = '<span class="marks">' + marksHtml(best) + '</span>';
    }

    b.append(g, meta);
    b.addEventListener('click', function () {
      state.idx = i;
      if (state.sound) say(ch);
      renderChips();
      build();
    });
    chipsEl.append(b);
  });
}

// ---------- writer ----------
async function build() {
  const myToken = ++buildToken;
  const ch = currentChar();
  resultEl.hidden = true;
  hideSeal();
  writerEl.classList.remove('ink');
  mineEl.classList.remove('ink');
  mineEl.innerHTML = '';
  if (!ch) return;

  let data = null;
  try {
    data = await getCharData(ch);
  } catch (e) {
    if (myToken !== buildToken) return;
    showMissing('筆順資料載入失敗，請檢查網路後重新整理。');
    return;
  }
  if (myToken !== buildToken) return;

  if (writer) writer.cancelQuiz();
  writer = null;
  charData = data;
  writerEl.innerHTML = '';

  const size = boxSize();
  builtSize = size;
  box.style.width = size + 'px';
  box.style.height = size + 'px';
  mineEl.setAttribute('width', size);
  mineEl.setAttribute('height', size);
  mineEl.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  setupFx(document.getElementById('fx'), size);
  renderInfo(data);
  document.getElementById('plaque').textContent = '第' + NUMERALS[state.idx] + '回合';

  if (!data) {
    strokeCount[ch] = 0;
    renderChips();
    showMissing('「' + ch + '」目前沒有筆順資料，換一個字試試看。');
    return;
  }
  strokeCount[ch] = data.strokes.length;
  glyphData[ch] = data;

  const colors = writerColors();
  writer = HanziWriter.create(writerEl, ch, {
    width: size,
    height: size,
    padding: boxPadding(size),
    showCharacter: false,
    showOutline: state.mode !== 'write',
    strokeColor: colors.strokeColor,
    outlineColor: colors.outlineColor,
    drawingColor: colors.drawingColor,
    highlightColor: colors.highlightColor,
    radicalColor: colors.radicalColor,
    drawingWidth: drawingWidth(size),
    strokeAnimationSpeed: state.slow ? 0.6 : 1.2,
    delayBetweenStrokes: state.slow ? 600 : 250,
    charDataLoader: function (c, onLoad, onError) {
      getCharData(c).then(function (d) { d ? onLoad(d) : onError(new Error('missing')); }, onError);
    },
  });
  startMode(myToken);
}

function showMissing(msg) {
  watchActions.hidden = true;
  quizActions.hidden = true;
  const div = document.createElement('div');
  div.className = 'missing-msg';
  div.textContent = msg;
  writerEl.append(div);
}

function startMode(myToken) {
  stepNum = 0;
  stepCountEl.textContent = '';
  resultEl.hidden = true;
  watchActions.hidden = state.mode !== 'watch';
  quizActions.hidden = state.mode === 'watch';
  keepBtn.setAttribute('aria-pressed', state.keep ? 'true' : 'false');

  if (state.mode === 'watch') {
    // watch each character in turn; after the last one, point at 描字
    writer.animateCharacter({
      onComplete: function () {
        if (myToken !== buildToken || state.mode !== 'watch' || stepNum > 0) return;
        if (state.idx < state.chars.length - 1) {
          setTimeout(function () {
            if (myToken !== buildToken || state.mode !== 'watch') return;
            state.idx += 1;
            renderChips();
            build();
          }, 700);
        } else {
          restartAnimation(document.querySelector('#modes button[data-mode="trace"]'), 'nudge');
        }
      },
    });
    return;
  }

  const hintAfter = state.mode === 'trace' ? 2 : 3;
  if (state.mode === 'write') writer.hideOutline();
  else writer.showOutline();

  writer.quiz({
    leniency: state.lenient ? 1.5 : 1.0,
    showHintAfterMisses: hintAfter,
    highlightOnComplete: false,
    onCorrectStroke: function (d) {
      if (keepMode()) {
        addMine(d.drawnPath.points);
        swordQi(d.drawnPath.points, qiColor());
      } else {
        const median = [];
        for (const p of charData.medians[d.strokeNum]) median.push({ x: p[0], y: p[1] });
        swordQi(median, qiColor());
      }
      sfxSwish();
      avatarPlay('attack');
    },
    onMistake: function () {
      sfxWood();
      restartAnimation(arena, 'shake');
      avatarPlay('hurt');
    },
    onComplete: function (d) {
      finish(d.totalMistakes);
    },
  });
}

function finish(mistakes) {
  const myToken = buildToken;
  const ch = currentChar();
  const grade = gradeFor(mistakes);
  if (!state.stars[ch]) state.stars[ch] = {};
  const prev = state.stars[ch][state.mode] || 0;
  if (grade > prev) state.stars[ch][state.mode] = grade;

  const reward = award(ch, grade, mistakes);
  renderChips();
  avatarPlay('cheer');

  inkBleed();
  setTimeout(function () {
    if (myToken === buildToken) stampSeal(grade);
  }, 450);
  setTimeout(function () {
    flyCoins('silver', reward.taels);
    if (reward.ingots) setTimeout(function () { flyCoins('gold', reward.ingots); }, 500);
  }, 800);

  // the whole word done in this mode: fireworks and read the whole word
  sessionDone.add(ch);
  let allDone = true;
  for (const c of state.chars) {
    if (!sessionDone.has(c) && strokeCount[c] !== 0) allDone = false;
  }
  if (allDone) {
    sessionDone.clear();
    if (state.mode === 'write' && state.chars.length > 1) {
      purse.ingots += 1;
      save();
      toast('整個詞都自己寫完　+1 元寶');
      setTimeout(function () { flyCoins('gold', 1); }, 2000);
    }
    setTimeout(function () {
      if (state.sound) say(state.text);
      if (state.chars.length > 1) {
        const glyphs = [];
        for (const c of state.chars) {
          if (glyphData[c]) glyphs.push(glyphSvg(glyphData[c]));
        }
        celebrate(glyphs);
        avatarPlay('cheer');
      }
    }, 1500);
  } else {
    setTimeout(function () {
      if (myToken === buildToken && state.sound) say(ch);
    }, 1300);
  }

  quizActions.hidden = true;
  document.getElementById('resultMarks').innerHTML = marksHtml(grade);
  let rewardHtml = syceeHtml('silver') + '<b>+' + reward.taels + '</b>';
  if (reward.ingots) rewardHtml += ' ' + syceeHtml('gold') + '<b>+' + reward.ingots + '</b>';
  document.getElementById('resultReward').innerHTML = rewardHtml;

  compareBtn.hidden = !keepMode();
  compareBtn.setAttribute('aria-pressed', 'false');

  const nextBtn = document.getElementById('nextBtn');
  let action = 'next-word';
  let label = '下一個詞';
  if (state.idx < state.chars.length - 1) {
    action = 'next';
    label = '下一個字';
  } else if (state.mode === 'trace') {
    action = 'to-write';
    label = '換自己寫';
  }
  nextBtn.dataset.action = action;
  nextBtn.setAttribute('aria-label', label);
  nextBtn.title = label;
  resultEl.hidden = false;
}

// ---------- controls ----------
function renderModes() {
  document.querySelectorAll('#modes button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false');
  });
}
function setMode(mode) {
  state.mode = mode;
  sessionDone.clear();
  renderModes();
  renderChips();
  build();
}
document.querySelectorAll('#modes button').forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.mode !== 'watch') state.idx = state.mode === 'watch' ? 0 : state.idx;
    setMode(b.dataset.mode);
  });
});

document.getElementById('playBtn').addEventListener('click', function () {
  if (!writer) return;
  startMode(buildToken);
});
document.getElementById('stepBtn').addEventListener('click', function () {
  if (!writer) return;
  const total = strokeCount[currentChar()];
  if (stepNum === 0 || stepNum >= total) {
    writer.hideCharacter();
    stepNum = 0;
  }
  writer.animateStroke(stepNum);
  stepNum += 1;
  stepCountEl.textContent = stepNum + '/' + total;
});
document.getElementById('restartBtn').addEventListener('click', function () { build(); });
document.getElementById('demoBtn').addEventListener('click', function () { setMode('watch'); });
document.getElementById('againBtn').addEventListener('click', function () { build(); });
document.getElementById('sayBtn').addEventListener('click', function () {
  const ch = currentChar();
  if (ch) say(ch);
});
keepBtn.addEventListener('click', function () {
  state.keep = !state.keep;
  save();
  renderOptions();
  build();
});
compareBtn.addEventListener('click', function () {
  if (!writer) return;
  const on = compareBtn.getAttribute('aria-pressed') !== 'true';
  compareBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const color = on ? COMPARE_RED : TRANSPARENT;
  writer.updateColor('strokeColor', color, { duration: 300 });
  writer.updateColor('radicalColor', color, { duration: 300 });
});
document.getElementById('nextBtn').addEventListener('click', function (e) {
  const action = e.currentTarget.dataset.action;
  if (action === 'next') {
    state.idx += 1;
    renderChips();
    build();
  } else if (action === 'to-write') {
    state.idx = 0;
    setMode('write');
  } else {
    nextWord(true);
  }
});
document.getElementById('diceBtn').addEventListener('click', function () { nextWord(true); });

// ---------- sheets ----------
function openSheet(el) {
  el.hidden = false;
  const focusable = el.querySelector('input, [data-close]');
  if (focusable) focusable.focus();
}
function closeSheet(el) {
  el.hidden = true;
}
document.querySelectorAll('.sheet').forEach(function (sheet) {
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet || e.target.closest('[data-close]')) closeSheet(sheet);
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.sheet').forEach(function (sheet) { closeSheet(sheet); });
});

function openArmory() {
  renderArmory();
  openSheet(document.getElementById('armory'));
}
document.getElementById('armoryBtn').addEventListener('click', openArmory);
document.getElementById('avatarTile').addEventListener('click', openArmory);
document.getElementById('settingsBtn').addEventListener('click', function () {
  openSheet(document.getElementById('settingsSheet'));
});

function renderRecent() {
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  for (const t of state.recent) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.addEventListener('click', function () {
      loadText(t, '', true);
      closeSheet(document.getElementById('customSheet'));
    });
    list.append(b);
  }
}
document.getElementById('customBtn').addEventListener('click', function () {
  const input = document.getElementById('customInput');
  input.value = '';
  input.placeholder = state.myName ? '例如：' + state.myName : '例如：劉岱恬';
  renderRecent();
  openSheet(document.getElementById('customSheet'));
});
document.getElementById('customForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const text = document.getElementById('customInput').value;
  if (parseText(text).length === 0) {
    toast('請輸入中文字');
    return;
  }
  loadText(text, '', true);
  closeSheet(document.getElementById('customSheet'));
});
document.getElementById('useNameBtn').addEventListener('click', function () {
  if (!state.myName) {
    toast('先輸入名字，再按「設為我的名字」');
    return;
  }
  loadText(state.myName, '', true);
  closeSheet(document.getElementById('customSheet'));
});
document.getElementById('saveNameBtn').addEventListener('click', function () {
  const chars = parseText(document.getElementById('customInput').value);
  if (chars.length === 0) {
    toast('先輸入名字');
    return;
  }
  state.myName = chars.join('');
  save();
  toast('記住了：' + state.myName);
});

document.getElementById('profileBtn').addEventListener('click', function () {
  document.getElementById('profileNote').textContent = '';
  document.getElementById('aliasInput').value = account.alias;
  document.getElementById('passInput').value = '';
  renderProfileStatus();
  openSheet(document.getElementById('profileSheet'));
});
document.getElementById('profileForm').addEventListener('submit', function (e) {
  e.preventDefault();
  login(document.getElementById('aliasInput').value, document.getElementById('passInput').value);
});
document.getElementById('logoutBtn').addEventListener('click', function () {
  switchTo('', '', loadLocalProfile(''));
  closeSheet(document.getElementById('profileSheet'));
  toast('換回訪客');
});

// settings
function renderOptions() {
  box.classList.toggle('mi', state.grid === 'mi');
  keepBtn.setAttribute('aria-pressed', state.keep ? 'true' : 'false');
  document.querySelectorAll('.opt-row').forEach(function (row) {
    const opt = row.dataset.opt;
    let current;
    if (opt === 'grid') current = state.grid;
    else current = state[opt] ? '1' : '0';
    row.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.val === current ? 'true' : 'false');
    });
  });
}
document.querySelectorAll('.opt-row').forEach(function (row) {
  row.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    const opt = row.dataset.opt;
    if (opt === 'grid') {
      state.grid = b.dataset.val;
      renderOptions();
      save();
      return;
    }
    state[opt] = b.dataset.val === '1';
    renderOptions();
    save();
    if (opt === 'sound') {
      if (state.sound) sfxStamp();
      return;
    }
    build();
  });
});

function renderAll() {
  renderOptions();
  renderPurse();
  renderModes();
  renderMeaning();
  renderProfileStatus();
}

// rebuild only when the box would change size noticeably (rotation, window resize)
new ResizeObserver(function () {
  if (!state.chars.length) return;
  if (Math.abs(boxSize() - builtSize) > 16) build();
}).observe(stage);

// follow theme changes without resetting progress
function recolor() {
  if (!writer) return;
  const colors = writerColors();
  for (const key in colors) {
    if (colors[key]) writer.updateColor(key, colors[key]);
  }
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ---------- start ----------
box.style.backgroundImage = 'url(' + paperTexture() + ')';
const sealMaskUrl = 'url(' + sealMask() + ')';
sealEl.style.webkitMaskImage = sealMaskUrl;
sealEl.style.maskImage = sealMaskUrl;

getCharData('武').then(function (d) {
  if (d) document.getElementById('titleSeal').append(glyphSvg(d));
}, function () {});

(function boot() {
  let alias = '';
  try {
    alias = localStorage.getItem(CURRENT_KEY) || '';
    account.pass = alias ? localStorage.getItem(PASS_PREFIX + alias) || '' : '';
  } catch (e) {}
  account.alias = alias;
  account.sync = cloudEnabled() && alias ? 'cloud' : 'local';
  const data = loadLocalProfile(alias);
  if (data) applyProfile(data);
  renderAll();
  startAvatar();

  fetch('data/words.json').then(function (r) { return r.json(); }).then(function (list) {
    words = list;
    if (!state.text) startText();
    else if (!state.meaning) {
      state.meaning = meaningFor(state.text);
      renderMeaning();
    }
  }, function () {});
  if (state.text || state.myName) startText();
  cloudRefresh();
})();
