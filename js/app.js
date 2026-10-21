// 筆順描字本: practice flow, MOE word bank, 俠客 levels and shop, profiles (local + optional cloud).

const N_CHUNKS = 128;
const TRANSPARENT = 'rgba(0,0,0,0)';
const COMPARE_RED = 'rgba(210,15,57,0.35)';
const ARENA_PAD = 18;   // arena padding + its border + the paper border
const SEAL_TEXT = { 3: '甲上', 2: '甲', 1: '加油' };
const TAELS_FOR_GRADE = { 3: 10, 2: 6, 1: 3 };
const RECENT_MAX = 15;
const MAX_TIER = 6;
const MAX_LEVEL = TITLES.length * LEVELS_PER_TITLE;

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
const hintText = watchActions.querySelector('span');

const state = {
  // current exercise
  text: '',
  chars: [],
  idx: 0,
  mode: 'watch',
  // settings
  content: 'mix',
  music: 'xiangqi',
  volume: 0.8,
  gender: 'boy',
  genderLock: '',
  theme: 'light',
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
  list: [],
};
// xp: every tael ever earned (spending never lowers it); gear: what the 俠客 holds, wears, brings along
const purse = {
  taels: 0,
  ingots: 0,
  xp: 0,
  owned: [],
  gear: { weapon: '', head: '', waist: '', back: '', pet: '' },
  scrolls: [],
  words: [],
  lastDay: '',
  streak: 0,
  // 稱號: won ids, the worn one ('' / an id / 'custom' / 'g:' + a granted name), the typed one, granted names
  honors: [],
  honor: '',
  customHonor: '',
  granted: [],
  perfectRun: 0,
};
// words shown lately (practiced or not), so the dice does not repeat itself
const seen = [];
// admin: this 俠客 is the 管理員 (set in Supabase, see supabase/heroes.sql)
const account = { alias: '', pass: '', sync: 'local', admin: false };
const strokeCount = {};
const glyphData = {};
const sessionDone = new Set();
let words = [];
// whole-word 注音 from the MOE dictionary, so 長大 reads ㄓㄤˇ and 音樂 ㄩㄝˋ
let readings = {};
function zhuyinAt(text, i, data) {
  const r = readings[text];
  if (r && r.length === Array.from(text).length && r[i]) return r[i];
  return data && data.zy && data.zy.length ? data.zy[0] : '';
}
let shopSlot = 'scrolls';
const HERO_TABS = [{ id: 'scrolls', name: '字訣本' }, { id: 'honors', name: '稱號' }].concat(SLOTS);

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
  const plaqueH = parseFloat(getComputedStyle(arena).getPropertyValue('--plaque-h')) || 0;
  const w = stage.clientWidth - 2 * ARENA_PAD;
  const h = stage.clientHeight - 2 * ARENA_PAD - plaqueH;
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

// ---------- levels and titles ----------
function xpForLevel(level) {
  return 20 + 4 * (level - 1);
}
function levelInfo(xp) {
  let level = 1;
  let rest = xp;
  while (level < MAX_LEVEL && rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level += 1;
  }
  return { level: level, into: rest, need: xpForLevel(level) };
}
function titleIndexFor(level) {
  return Math.min(TITLES.length - 1, Math.floor((level - 1) / LEVELS_PER_TITLE));
}
function titleIndex() {
  return titleIndexFor(levelInfo(purse.xp).level);
}
function itemById(id) {
  for (const it of ITEMS) {
    if (it.id === id) return it;
  }
  return null;
}
function qiColor() {
  const w = itemById(purse.gear.weapon);
  if (w && w.qi) return w.qi;
  return token('--qi');
}

// ---------- profile: what gets saved per 俠客 ----------
function serializeProfile() {
  return {
    v: 4,
    savedAt: Date.now(),
    settings: {
      content: state.content, music: state.music, volume: state.volume, gender: state.gender, genderLock: state.genderLock, theme: state.theme, grid: state.grid, lenient: state.lenient,
      slow: state.slow, sound: state.sound, radical: state.radical, keep: state.keep,
    },
    stars: state.stars,
    myName: state.myName,
    recent: state.recent,
    list: state.list,
    text: state.text,
    purse: purse,
  };
}
function resetProgress() {
  state.stars = {};
  state.myName = '';
  state.recent = [];
  state.list = [];
  state.text = '';
  Object.assign(purse, { taels: 0, ingots: 0, xp: 0, owned: [], gear: { weapon: '', head: '', waist: '', back: '', pet: '' }, scrolls: [], words: [], lastDay: '', streak: 0, honors: [], honor: '', customHonor: '', granted: [], perfectRun: 0 });
}
function applyProfile(source) {
  // work on a copy: a carried-over guest profile shares the live purse object
  const p = JSON.parse(JSON.stringify(source));
  resetProgress();
  state.genderLock = '';
  if (p.settings) {
    for (const key of ['content', 'music', 'gender', 'genderLock', 'theme', 'grid']) {
      if (typeof p.settings[key] === 'string') state[key] = p.settings[key];
    }
    for (const key of ['lenient', 'slow', 'sound', 'radical', 'keep']) {
      if (typeof p.settings[key] === 'boolean') state[key] = p.settings[key];
    }
    if (typeof p.settings.volume === 'number') state.volume = p.settings.volume;
  }
  // accounts made before the gender was chosen at sign-up keep the one they had
  if (state.genderLock !== 'boy' && state.genderLock !== 'girl') state.genderLock = '';
  if (account.alias && !state.genderLock) state.genderLock = state.gender;
  if (state.genderLock) state.gender = state.genderLock;
  if (p.stars) state.stars = p.stars;
  if (p.myName) state.myName = p.myName;
  if (p.recent) state.recent = p.recent;
  if (p.list) state.list = p.list;
  if (p.text) state.text = p.text;
  if (p.purse) {
    const old = p.purse;
    purse.taels = old.taels || 0;
    purse.ingots = old.ingots || 0;
    // earlier versions called it 'earned' and held one weapon in 'equipped'
    purse.xp = old.xp !== undefined ? old.xp : (old.earned || 0);
    purse.owned = old.owned || [];
    if (old.gear) Object.assign(purse.gear, old.gear);
    else if (old.equipped) purse.gear.weapon = old.equipped;
    // earlier versions had one accessory slot
    if (purse.gear.acc) {
      if (purse.gear.acc === 'cloak') purse.gear.back = 'cloak';
      else purse.gear.waist = purse.gear.acc;
    }
    delete purse.gear.acc;
    purse.scrolls = old.scrolls || [];
    purse.words = old.words || [];
    purse.lastDay = old.lastDay || '';
    purse.streak = old.streak || 0;
    purse.honors = old.honors || [];
    purse.honor = old.honor || '';
    purse.customHonor = old.customHonor || '';
    purse.granted = old.granted || [];
    purse.perfectRun = old.perfectRun || 0;
  }
  // a character with a 自己寫 grade has been written alone, even if an older version did not record it
  for (const ch in state.stars) {
    if (state.stars[ch].write && purse.scrolls.indexOf(ch) < 0) purse.scrolls.push(ch);
  }
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
}

// one-time move of the progress saved by the first versions into the guest profile
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
    err.notFound = r.status === 404;
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
  // the 俠客 may have switched to a guest while the save waited
  if (!account.alias) return;
  try {
    await rpc('profile_save', { p_alias: account.alias, p_pass: account.pass, p_data: serializeProfile() });
    account.sync = 'cloud';
  } catch (e) {
    account.sync = 'offline';
  }
  renderProfileStatus();
}
// on start, before anything is saved locally: take the cloud copy if another device saved more recently
async function cloudRefresh() {
  if (!cloudEnabled() || !account.alias || !account.pass) return;
  const alias = account.alias;
  try {
    const res = await rpc('profile_load', { p_alias: alias, p_pass: account.pass });
    if (account.alias !== alias) return false;
    account.sync = 'cloud';
    setAdmin(Boolean(res && res.admin));
    const local = loadLocalProfile(account.alias);
    const localAt = local && local.savedAt ? local.savedAt : 0;
    if (res && res.data && (res.data.savedAt || 0) > localAt) {
      applyProfile(res.data);
      try {
        localStorage.setItem(PROFILE_PREFIX + account.alias, JSON.stringify(res.data));
      } catch (e) {}
      renderAll();
      renderProfileStatus();
      return true;
    }
  } catch (e) {
    account.sync = 'offline';
  }
  renderProfileStatus();
  return false;
}
// coming back to the app (another device may have practiced meanwhile)
document.addEventListener('visibilitychange', function () {
  if (document.hidden) return;
  cloudRefresh().then(function (changed) {
    if (changed) startText();
    checkInbox();
  });
});
// waits for the cloud at most a few seconds, so a slow network never blocks practice
function cloudRefreshWithin(ms) {
  return Promise.race([
    cloudRefresh(),
    new Promise(function (resolve) { setTimeout(resolve, ms); }),
  ]);
}

async function passHash(alias, pass) {
  const bytes = new TextEncoder().encode(alias + ':' + pass);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  let hex = '';
  for (const b of new Uint8Array(digest)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

// the 管理員 wears 武林神工 and may change genders, grant 稱號 and remove 俠客
function setAdmin(on) {
  account.admin = on;
  const has = purse.honors.indexOf('master') >= 0;
  if (on && !has) {
    purse.honors.push('master');
    if (!purse.honor) purse.honor = 'master';
    save();
  } else if (!on && has) {
    purse.honors.splice(purse.honors.indexOf('master'), 1);
    if (purse.honor === 'master') purse.honor = '';
    save();
  }
  renderPurse();
}

function switchTo(alias, pass, data) {
  account.alias = alias;
  account.pass = pass;
  account.admin = false;
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
  rememberHero(alias);
  checkInbox();
}

let accountMode = 'login';
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
    if (accountMode === 'login' && !res) {
      note.textContent = '找不到「' + alias + '」。第一次來的話，請按上面的「建立新俠客」。';
      return;
    }
    if (accountMode === 'create' && res) {
      note.textContent = '「' + alias + '」已經有人用了，換一個名字吧；如果是你，請按「登入」。';
      return;
    }
    let data = res ? res.data : carry;
    if (!res) {
      if (!newGender) {
        note.textContent = '新俠客要先選：少俠還是女俠。';
        return;
      }
      data = withGender(data, newGender);
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
    setAdmin(Boolean(res && res.admin));
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
  if (accountMode === 'login' && !data) {
    note.textContent = '找不到「' + alias + '」。第一次來的話，請按上面的「建立新俠客」。';
    return;
  }
  if (accountMode === 'create' && data) {
    note.textContent = '「' + alias + '」已經有人用了，換一個名字吧；如果是你，請按「登入」。';
    return;
  }
  if (data) {
    toast('歡迎回來，' + alias);
  } else {
    if (!newGender) {
      note.textContent = '新俠客要先選：少俠還是女俠。';
      return;
    }
    data = withGender(carry, newGender);
    toast('建立新俠客「' + alias + '」');
  }
  note.textContent = '';
  switchTo(alias, pass, data);
  closeSheet(document.getElementById('profileSheet'));
}

// the profile a new 俠客 starts from, with the gender picked at sign-up
let newGender = '';
function withGender(data, g) {
  const out = JSON.parse(JSON.stringify(data || {}));
  out.settings = out.settings || {};
  out.settings.genderLock = g;
  out.settings.gender = g;
  return out;
}
function setAccountMode(mode) {
  accountMode = mode;
  document.querySelectorAll('#accountModes button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.mode === mode ? 'true' : 'false');
  });
  document.getElementById('newGenderRow').hidden = mode !== 'create';
  document.getElementById('accountSubmit').textContent = mode === 'create' ? '建立' : '登入';
  document.getElementById('profileNote').textContent = '';
}
document.querySelectorAll('#accountModes button').forEach(function (b) {
  b.addEventListener('click', function () { setAccountMode(b.dataset.mode); });
});
document.getElementById('passEye').addEventListener('click', function (e) {
  const input = document.getElementById('passInput');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  e.currentTarget.setAttribute('aria-pressed', show ? 'true' : 'false');
  e.currentTarget.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
});
document.querySelectorAll('#newGenderRow button').forEach(function (b) {
  b.addEventListener('click', function () {
    newGender = b.dataset.g;
    document.querySelectorAll('#newGenderRow button').forEach(function (x) {
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
  });
});

function renderProfileStatus() {
  const status = document.getElementById('profileStatus');
  const note = document.getElementById('profileNote');
  const name = account.alias || '訪客';
  let where = '只存在這台裝置';
  if (account.alias && cloudEnabled()) where = account.sync === 'offline' ? '雲端暫時連不上，先存在這台裝置' : '雲端同步';
  status.innerHTML = '目前：<b></b>（' + where + (account.admin ? '・管理員' : '') + '）';
  status.querySelector('b').textContent = name;
  if (!note.textContent) {
    note.textContent = cloudEnabled()
      ? '在其他裝置用同一個名字和密碼登入，就能接著練。'
      : '雲端同步還沒開通，帳號只存在這台裝置。一台平板有好幾個小朋友時，可以各自登入。';
  }
  document.getElementById('logoutBtn').hidden = !account.alias;
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

// ---------- word bank (教育部 國小學童常用字詞, tiered by character frequency) ----------
function wordTier() {
  return Math.min(MAX_TIER, Math.floor(titleIndex() / 2));
}
function pickFromList() {
  const fresh = [];
  for (const t of state.list) {
    if (seen.indexOf(t) < 0) fresh.push(t);
  }
  if (fresh.length) return { w: fresh[Math.floor(Math.random() * fresh.length)] };
  // every item practiced lately: take the one practiced longest ago, so the list goes round
  let oldest = state.list[0];
  for (const t of state.list) {
    if (seen.indexOf(t) > seen.indexOf(oldest)) oldest = t;
  }
  return { w: oldest };
}
function pickWord() {
  if (state.content === 'list' && state.list.length) return pickFromList();
  let single = Math.random() < 0.4;
  if (state.content === 'words') single = false;
  if (state.content === 'chars') single = true;
  const tier = wordTier();
  const pool = [];
  let total = 0;
  for (const w of words) {
    if (w.t > tier) continue;
    if ((w.w.length === 1) !== single) continue;
    if (seen.indexOf(w.w) >= 0 || state.recent.indexOf(w.w) >= 0) continue;
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
function nextWord(speak) {
  if (!words.length && !(state.content === 'list' && state.list.length)) return;
  loadText(pickWord().w, speak);
}

// ---------- the current exercise ----------
function loadText(text, speak) {
  const chars = parseText(text);
  if (chars.length === 0) {
    toast('請輸入中文字');
    return;
  }
  state.text = chars.join('');
  state.chars = chars;
  state.idx = 0;
  state.mode = 'watch';
  sessionDone.clear();

  const at = seen.indexOf(state.text);
  if (at >= 0) seen.splice(at, 1);
  seen.unshift(state.text);
  seen.length = Math.min(seen.length, 40);

  save();
  renderModes();
  renderChips();
  unrollPlaque();
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
  if (state.text) loadText(state.text);
  else if (state.myName) loadText(state.myName);
  else if (words.length) nextWord(false);
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
// the child's own stroke, kept in place of the standard one, in the brush shape it was written with
function addMine() {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', brushPath(brush.points, builtSize, true));
  mineEl.append(path);
}

// ---------- rewards, level-ups, celebrations ----------
// big moments (a finished word, a new title) wait for each other instead of overlapping
let celebrationFreeAt = 0;
function queueCelebration(delay, fn) {
  const now = performance.now();
  const at = Math.max(now + delay, celebrationFreeAt);
  celebrationFreeAt = at + 5200;
  setTimeout(fn, at - now);
}
// the pixel hero on a 48 x 36 canvas, shown scaled up
function drawHeroOn(canvas, o) {
  canvas.classList.add('pixel');
  if (canvas.width !== AV_W || canvas.height !== AV_H) {
    canvas.width = AV_W;
    canvas.height = AV_H;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, AV_W, AV_H);
  if (o.floor !== false) drawFloor(ctx);
  if (o.shadow) {
    ctx.fillStyle = 'rgba(70, 45, 25, 0.18)';
    ctx.fillRect(AV_CX - 8, AV_GY, 17, 1);
    ctx.fillRect(AV_CX - 6, AV_GY + 1, 13, 1);
    if (o.gear && o.gear.pet) ctx.fillRect(1, AV_GY, 10, 1);
  }
  drawAvatar(ctx, o.title, o.gear, o.pose || 'stand', o.frame || 0, o.qi, o.gender || state.gender);
}
function titleCanvas(idx) {
  const c = document.createElement('canvas');
  drawHeroOn(c, { title: idx, gear: purse.gear, pose: 'jump', qi: qiColor() });
  return c;
}
function showLevelUp(level) {
  const card = document.getElementById('playerCard');
  const tag = document.getElementById('lvup');
  tag.textContent = 'Lv ' + level + '！';
  tag.hidden = false;
  restartAnimation(tag, 'lvup');
  restartAnimation(card, 'leveled');
  setTimeout(function () { tag.hidden = true; }, 1700);
  sfxGong(0.35);
  avatarPlay('cheer');
}

function award(grade, mistakes) {
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
    let note = '今日練功　+' + bonus;
    if (purse.streak > 1) note += '（連續 ' + purse.streak + ' 天）';
    toast(note);
  }

  let ingots = 0;
  if (state.mode === 'write' && mistakes === 0) ingots += 1;

  const before = levelInfo(purse.xp).level;
  purse.taels += taels;
  purse.xp += taels;
  purse.ingots += ingots;
  const after = levelInfo(purse.xp).level;

  save();
  return { taels: taels, ingots: ingots, levelBefore: before, levelAfter: after };
}

// level-ups land when the coins reach the purse
function announceLevels(before, after) {
  if (after <= before) return;
  const titleBefore = titleIndexFor(before);
  const titleAfter = titleIndexFor(after);
  setTimeout(function () {
    showLevelUp(after);
    renderPurse();
  }, 1900);
  if (titleAfter > titleBefore) {
    queueCelebration(2600, function () {
      celebrate([titleCanvas(titleAfter)], '晉升「' + TITLES[titleAfter].name + '」');
      avatarPlay('cheer');
    });
  }
}

function renderPurse() {
  const aliasTag = document.getElementById('aliasTag');
  aliasTag.textContent = account.alias;
  aliasTag.hidden = !account.alias;
  const honorTag = document.getElementById('honorTag');
  honorTag.innerHTML = '';
  const badge = honorBadge(purse.honor, purse.customHonor);
  if (badge) honorTag.append(badge);
  const info = levelInfo(purse.xp);
  document.getElementById('rankTag').textContent = TITLES[titleIndexFor(info.level)].name;
  document.getElementById('lvTag').textContent = 'Lv ' + info.level;
  document.getElementById('xpBar').style.width = (info.level >= MAX_LEVEL ? 100 : Math.round(100 * info.into / info.need)) + '%';
  renderCounters();
}

// ---------- 我的俠客: avatar, titles so far, shop ----------
// an item stays a shadow named ？？？ until the title is high enough and its price is within reach
function itemKnown(it, owned, tIdx) {
  if (owned) return true;
  if (tIdx < it.minTitle) return false;
  if (it.ingots) return it.ingots <= purse.ingots * 2 + 1;
  return it.taels <= purse.taels * 2 + 20;
}
function renderHero() {
  const info = levelInfo(purse.xp);
  const tIdx = titleIndexFor(info.level);
  document.getElementById('heroTitle').textContent = account.alias || '我的俠客';
  const heroHonor = document.getElementById('heroHonor');
  heroHonor.innerHTML = '';
  const badge = honorBadge(purse.honor, purse.customHonor);
  if (badge) heroHonor.append(badge);
  document.querySelector('#heroSheet .opt-row[data-opt="gender"]').hidden = Boolean(state.genderLock) && !account.admin;
  document.getElementById('heroRank').textContent = TITLES[tIdx].name;
  document.getElementById('heroLv').textContent = 'Lv ' + info.level;
  document.getElementById('heroXp').style.width = (info.level >= MAX_LEVEL ? 100 : Math.round(100 * info.into / info.need)) + '%';
  document.getElementById('heroTaels').textContent = purse.taels;
  document.getElementById('heroIngots').textContent = purse.ingots;
  drawHeroOn(document.getElementById('heroAvatar'), { title: tIdx, gear: purse.gear, qi: qiColor() });

  // titles reached so far, the current one framed, the next one as a black silhouette
  const ladder = document.getElementById('ladder');
  ladder.innerHTML = '';
  for (let i = 0; i <= Math.min(tIdx + 1, TITLES.length - 1); i++) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ladder-item plain-btn';
    const c = document.createElement('canvas');
    drawHeroOn(c, { title: i, gear: {} });
    const label = document.createElement('span');
    if (i < tIdx) {
      item.classList.add('past');
      item.addEventListener('click', function () {
        const was = item.classList.contains('lifted');
        ladder.querySelectorAll('.lifted').forEach(function (x) { x.classList.remove('lifted'); });
        if (!was) item.classList.add('lifted');
      });
    }
    item.style.zIndex = String(i + 1);
    if (i === tIdx) {
      item.classList.add('now');
      label.textContent = TITLES[i].name;
    } else if (i > tIdx) {
      item.classList.add('next');
      silhouette(c, '#1e1a26');
      label.textContent = '？？？';
      item.setAttribute('aria-label', '還沒解鎖');
    } else {
      label.textContent = TITLES[i].name;
    }
    item.append(c, label);
    ladder.append(item);
  }

  const tabs = document.getElementById('shopTabs');
  tabs.innerHTML = '';
  for (const slot of HERO_TABS) {
    const t = document.createElement('button');
    t.type = 'button';
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', slot.id === shopSlot ? 'true' : 'false');
    t.textContent = slot.name;
    t.addEventListener('click', function () {
      shopSlot = slot.id;
      renderHero();
    });
    tabs.append(t);
  }

  const grid = document.getElementById('items');
  grid.innerHTML = '';
  grid.classList.toggle('scrollbook', shopSlot === 'scrolls');
  document.getElementById('scrollCount').hidden = shopSlot !== 'scrolls';
  grid.classList.toggle('honorbook', shopSlot === 'honors');
  if (shopSlot === 'scrolls') {
    renderScrollbook(grid);
    return;
  }
  if (shopSlot === 'honors') {
    renderHonors(grid);
    return;
  }
  for (const it of ITEMS) {
    if (it.slot !== shopSlot) continue;
    const place = placeOf(it);
    const owned = purse.owned.indexOf(it.id) >= 0;
    const wearing = purse.gear[place] === it.id;
    const known = itemKnown(it, owned, tIdx);
    const card = document.createElement('div');
    card.className = 'item';
    if (!owned) card.classList.add('locked');
    if (wearing) card.classList.add('equipped');
    if (!known) card.classList.add('mystery');

    const c = document.createElement('canvas');
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = known ? it.name : '？？？';
    card.append(c, name);

    if (owned) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = wearing ? '✓ 使用中' : '換上';
      btn.addEventListener('click', function () { equip(place, wearing ? '' : it.id); });
      card.append(btn);
    } else if (known) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const canBuy = it.ingots ? purse.ingots >= it.ingots : purse.taels >= it.taels;
      btn.innerHTML = it.ingots ? syceeHtml('gold') + it.ingots : syceeHtml('silver') + it.taels;
      btn.setAttribute('aria-label', '買' + it.name);
      btn.disabled = !canBuy;
      btn.addEventListener('click', function () { buy(it); });
      card.append(btn);
    }
    card.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      openItem(it);
    });
    grid.append(card);
    // drawn once the card is laid out, so the picture matches its box
    drawItemIcon(c, it);
    if (!known) silhouette(c, '#2b2233');
  }
}

// characters drawn from the stroke data into el; zyEl (optional) gets their 注音 in one line
function fillGlyphs(el, text, zyEl) {
  el.innerHTML = '';
  const chars = Array.from(text);
  const zys = [];
  chars.forEach(function (ch, i) {
    zys.push('');
    const slot = document.createElement('span');
    slot.className = 'text-glyph';
    slot.textContent = ch;
    el.append(slot);
    getCharData(ch).then(function (d) {
      if (!d) return;
      glyphData[ch] = d;
      slot.replaceWith(glyphSvg(d));
      zys[i] = zhuyinAt(text, i, d);
      if (zyEl) zyEl.textContent = zys.join(' ');
    }, function () {});
  });
}
// each character with its vertical 注音 at the right, as in a textbook
function fillGlyphsWithZhuyin(el, text) {
  el.innerHTML = '';
  Array.from(text).forEach(function (ch, i) {
    const pair = document.createElement('span');
    pair.className = 'char-zy';
    const slot = document.createElement('span');
    slot.className = 'text-glyph';
    slot.textContent = ch;
    const zy = document.createElement('span');
    zy.className = 'zy-v';
    pair.append(slot, zy);
    el.append(pair);
    getCharData(ch).then(function (d) {
      if (!d) return;
      slot.replaceWith(glyphSvg(d));
      renderZhuyin(zy, zhuyinAt(text, i, d));
    }, function () {});
  });
}

function renderScrollbook(grid) {
  const nChars = purse.scrolls.length;
  const nWords = purse.words.length;
  document.getElementById('scrollCount').textContent = '自己寫學會的：' + nChars + ' 個字、' + nWords + ' 個詞。點一下會念出來。';
  if (nChars + nWords === 0) {
    const p = document.createElement('p');
    p.className = 'scroll-empty';
    p.textContent = '還是空的。用「自己寫」寫完一個字，它就會收進字訣本。';
    grid.append(p);
    return;
  }
  for (const text of purse.words.concat(purse.scrolls)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scroll-card';
    if (Array.from(text).length > 1) b.classList.add('word');
    b.setAttribute('aria-label', text);
    const glyphs = document.createElement('span');
    glyphs.className = 'glyphs';
    const zy = document.createElement('span');
    zy.className = 'zy-line';
    b.append(glyphs, zy);
    fillGlyphs(glyphs, text, zy);
    b.addEventListener('click', function () { say(text); });
    grid.append(b);
  }
}

// the zoomed item card: a big picture, the name with 注音 (read aloud), and buy or wear
function openItem(it) {
  const tIdx = titleIndex();
  const place = placeOf(it);
  const owned = purse.owned.indexOf(it.id) >= 0;
  const wearing = purse.gear[place] === it.id;
  const known = itemKnown(it, owned, tIdx);
  const sheet = document.getElementById('itemSheet');
  const title = document.getElementById('itemTitle');
  const note = document.getElementById('itemNote');
  const actions = document.getElementById('itemActions');
  actions.innerHTML = '';
  note.textContent = '';

  if (known) {
    fillGlyphsWithZhuyin(title, it.name);
    if (owned) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = wearing ? '' : 'primary';
      btn.textContent = wearing ? '拿下來' : '換上';
      btn.addEventListener('click', function () {
        equip(place, wearing ? '' : it.id);
        closeSheet(sheet);
      });
      actions.append(btn);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary';
      const canBuy = it.ingots ? purse.ingots >= it.ingots : purse.taels >= it.taels;
      btn.innerHTML = '買　' + (it.ingots ? syceeHtml('gold') + it.ingots + ' 元寶' : syceeHtml('silver') + it.taels + ' 兩');
      btn.disabled = !canBuy;
      if (!canBuy) note.textContent = '銀兩還不夠，多寫幾個字再來。';
      btn.addEventListener('click', function () {
        buy(it);
        closeSheet(sheet);
      });
      actions.append(btn);
    }
  } else {
    title.innerHTML = '<span class="mystery">？？？</span>';
    note.textContent = tIdx < it.minTitle ? '江湖身分再高一點，就能看清楚這是什麼。' : '再多存一些銀兩，就能看清楚這是什麼。';
  }

  openSheet(sheet);
  const big = document.getElementById('itemBig');
  drawItemIcon(big, it);
  if (!known) silhouette(big, '#2b2233');
  if (known && state.sound) say(it.name);
}

function buy(it) {
  if (it.ingots) {
    if (purse.ingots < it.ingots) return;
    purse.ingots -= it.ingots;
  } else {
    if (purse.taels < it.taels) return;
    purse.taels -= it.taels;
  }
  purse.owned.push(it.id);
  purse.gear[placeOf(it)] = it.id;
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
  save();
  renderPurse();
  renderHero();
  sfxTick(1568);
  avatarPlay('attack');
  toast('得到「' + it.name + '」');
}
function equip(place, id) {
  purse.gear[place] = id;
  save();
  renderHero();
  avatarPlay('attack');
}

// ---------- the 俠客 on the main screen ----------
const avatar = { canvases: [], queue: [], idle: 0, frame: 0, last: 0 };
function avatarPlay(name) {
  avatar.queue = ACTIONS[name].slice();
  if (reducedMotion()) avatarRender(performance.now());
}
function avatarRender(now) {
  let pose;
  if (avatar.queue.length) {
    pose = avatar.queue.shift();
  } else {
    pose = IDLE_SEQ[avatar.idle % IDLE_SEQ.length];
    avatar.idle += 1;
  }
  avatar.frame += 1;
  const look = { title: titleIndex(), gear: purse.gear, pose: pose, frame: avatar.frame, qi: qiColor() };
  drawHeroOn(avatar.canvases[0], look);
  // the landscape stage: no floor, just a soft shadow under the feet
  drawHeroOn(avatar.canvases[1], Object.assign({ floor: false, shadow: true }, look));
}
// the pixel hero steps like a sprite, faster during an action
function avatarTick(now) {
  const wait = avatar.queue.length ? 95 : 170;
  if (now - avatar.last >= wait) {
    avatar.last = now;
    avatarRender(now);
  }
  requestAnimationFrame(avatarTick);
}
function startAvatar() {
  avatar.canvases = [document.getElementById('avatar'), document.getElementById('stageCanvas')];
  if (reducedMotion()) {
    avatarRender(1000);
    return;
  }
  requestAnimationFrame(avatarTick);
}

// ---------- character card: model glyph, vertical 注音 ----------
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
  const mini = document.getElementById('mini');
  if (!data) {
    zyEl.innerHTML = '';
    mini.innerHTML = '';
    return;
  }
  renderZhuyin(zyEl, zhuyinAt(state.text, state.idx, data));

  // the model character, with the radical strokes colored
  const radSet = new Set(data.radStrokes || []);
  let paths = '<g transform="scale(1,-1) translate(0,-900)">';
  for (let i = 0; i < data.strokes.length; i++) {
    const cls = radSet.has(i) && state.radical ? 'r' : 'o';
    paths += '<path class="' + cls + '" d="' + data.strokes[i] + '"></path>';
  }
  mini.innerHTML = paths + '</g>';
}

// ---------- the word's characters in the top bar ----------
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
    b.append(g);
    b.addEventListener('click', function () {
      state.idx = i;
      if (state.sound) say(ch);
      renderChips();
      build();
    });
    chipsEl.append(b);
  });
  renderBoxMeta();
}
// the scroll unrolls from the middle, its rollers moving out to the ends
function unrollPlaque() {
  const plaque = document.getElementById('plaque');
  const cloth = plaque.querySelector('.cloth');
  plaque.style.setProperty('--unroll', Math.round(cloth.offsetWidth / 2) + 'px');
  restartAnimation(plaque, 'unroll');
}
// the current character's stroke count, and its best marks in 描字 / 自己寫
function renderBoxMeta() {
  const el = document.getElementById('boxMeta');
  const ch = currentChar();
  el.classList.toggle('missing', strokeCount[ch] === 0);
  if (!ch || strokeCount[ch] === undefined) {
    el.innerHTML = '';
  } else if (strokeCount[ch] === 0) {
    el.textContent = '沒有資料';
  } else if (state.mode === 'watch') {
    el.textContent = strokeCount[ch] + ' 筆';
  } else {
    const best = (state.stars[ch] && state.stars[ch][state.mode]) || 0;
    el.innerHTML = '<span>' + strokeCount[ch] + ' 筆</span><span class="marks">' + marksHtml(best) + '</span>';
  }
}

// ---------- writer ----------
async function build() {
  const myToken = ++buildToken;
  const ch = currentChar();
  resultEl.hidden = true;
  hideNextHint();
  brush.live = false;
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
  setupBrush(size);
  renderInfo(data);

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
    drawingColor: TRANSPARENT,
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
  watchStep.busy = false;
  watchStep.pending = 0;
  brush.color = writerColors().drawingColor;
  hintText.textContent = '點格子：下一筆';
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
            if (myToken !== buildToken || state.mode !== 'watch' || stepNum > 0) return;
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
  brush.live = true;
  quizStartedAt = performance.now();

  writer.quiz({
    leniency: state.lenient ? 1.5 : 1.0,
    showHintAfterMisses: hintAfter,
    highlightOnComplete: false,
    onCorrectStroke: function (d) {
      if (keepMode()) {
        addMine();
        swordQi(d.drawnPath.points, qiColor());
      } else {
        const median = [];
        for (const p of charData.medians[d.strokeNum]) median.push({ x: p[0], y: p[1] });
        swordQi(median, qiColor());
      }
      sfxSwish();
      avatarPlay('attack');
    },
    onMistake: function (d) {
      sfxWood();
      restartAnimation(arena, 'shake');
      avatarPlay('hurt');
      // the hint stroke is showing: also mark where the brush goes down
      if (d.mistakesOnStroke >= hintAfter) strokeRipple(d.strokeNum);
    },
    onComplete: function (d) {
      finish(d.totalMistakes);
    },
  });
}

// a ripple at the starting point (起筆) of a stroke
function strokeRipple(strokeNum) {
  if (!charData || reducedMotion()) return;
  const start = charData.medians[strokeNum][0];
  const s = toScreen(start[0], start[1], builtSize);
  const ring = document.createElement('span');
  ring.className = 'ripple';
  ring.style.left = s.x + 'px';
  ring.style.top = s.y + 'px';
  box.append(ring);
  setTimeout(function () { ring.remove(); }, 520);
}

// 看筆順: each tap on the box shows the next stroke. A tap during a stroke waits for it to finish,
// so no stroke is left half drawn; while taps are waiting the strokes play faster to catch up.
const watchStep = { busy: false, pending: 0 };
let quizStartedAt = 0;
function strokeSpeed() {
  return state.slow ? 0.6 : 1.2;
}
function stepStroke() {
  if (state.mode !== 'watch' || !writer) return;
  restartAnimation(box, 'press');
  sfxTick(1318);
  if (watchStep.busy) {
    const left = strokeCount[currentChar()] - stepNum;
    watchStep.pending = Math.min(watchStep.pending + 1, Math.max(left, 0));
    return;
  }
  playStep();
}
function playStep() {
  const total = strokeCount[currentChar()];
  if (stepNum === 0 || stepNum >= total) {
    writer.hideCharacter();
    stepNum = 0;
  }
  const n = stepNum;
  stepNum += 1;
  hintText.textContent = stepNum + ' / ' + total;
  strokeRipple(n);

  // Hanzi Writer reads the speed from its options each time a stroke starts
  writer._options.strokeAnimationSpeed = watchStep.pending > 0 ? strokeSpeed() * 2.5 : strokeSpeed();
  watchStep.busy = true;
  const myWriter = writer;
  writer.animateStroke(n, {
    onComplete: function () {
      if (writer !== myWriter) return;
      writer._options.strokeAnimationSpeed = strokeSpeed();
      watchStep.busy = false;
      if (watchStep.pending > 0 && state.mode === 'watch') {
        watchStep.pending -= 1;
        playStep();
      }
    },
  });
}
box.addEventListener('pointerdown', stepStroke);

// ---------- brush ----------
// The child's stroke drawn like a brush: wide where the finger moves slowly or an Apple Pencil
// presses hard, narrow where it moves fast. The start presses down (頓筆); a quick lift tapers
// the end to a point (出鋒). The shape is a chain of circles joined by trapezoids, one SVG path.
const brushEl = document.getElementById('brush');
const brush = { live: false, id: null, points: [], color: '' };

function setupBrush(size) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  brushEl.width = Math.round(size * dpr);
  brushEl.height = Math.round(size * dpr);
  const ctx = brushEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  brush.points = [];
}

// width at each point, in px
function brushWidths(points, size, finished) {
  const base = size * 0.036;
  const widths = [];
  let w = base * 1.05;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let target = base;
    if (i > 0) {
      // speed in box widths per second, over the last few points so event timing jitter averages out
      const q = points[Math.max(0, i - 3)];
      const dt = Math.max(1, p.t - q.t);
      const speed = Math.hypot(p.x - q.x, p.y - q.y) / dt / size * 1000;
      target = base * Math.min(1.15, Math.max(0.45, 1.25 - 0.3 * speed));
    }
    if (p.pen) target = target * (0.35 + 1.1 * p.pressure);
    w = 0.85 * w + 0.15 * target;
    widths.push(w);
  }
  // 頓筆: the first points press down
  for (let i = 0; i < Math.min(3, widths.length); i++) {
    widths[i] = Math.max(widths[i], base * 1.05);
  }
  // 出鋒: a quick lift tapers the last part of the stroke
  const n = points.length;
  if (finished && n > 5) {
    const a = points[n - 4];
    const b = points[n - 1];
    const endSpeed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t) / size * 1000;
    if (endSpeed > 1.0) {
      const tail = Math.max(3, Math.round(n * 0.25));
      for (let k = 0; k < tail; k++) {
        const i = n - tail + k;
        const f = 1 - 0.8 * ((k + 1) / tail);
        widths[i] = widths[i] * f;
      }
    }
  }
  return widths;
}

// polygon as path data, wound clockwise so overlapping pieces never cancel under the nonzero rule
function brushPolygon(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  if (area < 0) pts.reverse();
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
  return d + 'Z';
}
function brushCircle(x, y, r) {
  const left = (x - r).toFixed(1) + ' ' + y.toFixed(1);
  const right = (x + r).toFixed(1) + ' ' + y.toFixed(1);
  const rr = r.toFixed(1);
  return 'M' + left + 'A' + rr + ' ' + rr + ' 0 1 1 ' + right + 'A' + rr + ' ' + rr + ' 0 1 1 ' + left + 'Z';
}
function brushPath(points, size, finished) {
  if (!points.length) return '';
  const widths = brushWidths(points, size, finished);
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    d += brushCircle(p.x, p.y, widths[i] / 2);
    if (i === 0) continue;
    const q = points[i - 1];
    const len = Math.hypot(p.x - q.x, p.y - q.y);
    if (len < 0.5) continue;
    const nx = -(p.y - q.y) / len;
    const ny = (p.x - q.x) / len;
    const hq = widths[i - 1] / 2;
    const hp = widths[i] / 2;
    d += brushPolygon([
      [q.x + nx * hq, q.y + ny * hq],
      [p.x + nx * hp, p.y + ny * hp],
      [p.x - nx * hp, p.y - ny * hp],
      [q.x - nx * hq, q.y - ny * hq],
    ]);
  }
  return d;
}
function drawBrush(finished) {
  const ctx = brushEl.getContext('2d');
  ctx.clearRect(0, 0, builtSize, builtSize);
  const d = brushPath(brush.points, builtSize, finished);
  if (!d) return;
  ctx.fillStyle = brush.color;
  ctx.fill(new Path2D(d));
}
function brushPoint(e) {
  const rect = box.getBoundingClientRect();
  const k = builtSize / rect.width;
  return {
    x: (e.clientX - rect.left) * k,
    y: (e.clientY - rect.top) * k,
    t: e.timeStamp,
    pen: e.pointerType === 'pen' && e.pressure > 0,
    pressure: e.pressure,
  };
}
box.addEventListener('pointerdown', function (e) {
  if (!brush.live || brush.id !== null) return;
  brush.id = e.pointerId;
  brush.points = [brushPoint(e)];
  brushEl.classList.remove('fade');
  drawBrush(false);
});
window.addEventListener('pointermove', function (e) {
  if (e.pointerId !== brush.id) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of events.length ? events : [e]) {
    const p = brushPoint(ev);
    const last = brush.points[brush.points.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 1.5) brush.points.push(p);
  }
  drawBrush(false);
});
function endBrush(e) {
  if (e.pointerId !== brush.id) return;
  brush.id = null;
  drawBrush(true);
  brushEl.classList.add('fade');
}
window.addEventListener('pointerup', endBrush);
window.addEventListener('pointercancel', endBrush);

// after a character is done, a tap anywhere on the box does what the next button does
let finishedAt = 0;
const nextHint = document.getElementById('nextHint');
function hideNextHint() {
  finishedAt = 0;
  nextHint.hidden = true;
}
box.addEventListener('pointerdown', function () {
  if (!finishedAt || state.mode === 'watch') return;
  if (performance.now() - finishedAt < 800) return;
  restartAnimation(box, 'press');
  sfxTick(1318);
  document.getElementById('nextBtn').click();
});

function finish(mistakes) {
  const myToken = buildToken;
  brush.live = false;
  const ch = currentChar();
  const grade = gradeFor(mistakes);
  if (!state.stars[ch]) state.stars[ch] = {};
  const prev = state.stars[ch][state.mode] || 0;
  if (grade > prev) state.stars[ch][state.mode] = grade;

  const reward = award(grade, mistakes);
  // written alone: the character goes into the 字訣本
  if (state.mode === 'write' && purse.scrolls.indexOf(ch) < 0) {
    purse.scrolls.unshift(ch);
    toast('習得「' + ch + '」字訣');
  }
  checkHonors(mistakes);
  // a character traced or written counts the word as practiced
  const at = state.recent.indexOf(state.text);
  if (at >= 0) state.recent.splice(at, 1);
  state.recent.unshift(state.text);
  state.recent = state.recent.slice(0, RECENT_MAX);
  save();
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

  // the whole word done in this mode: read the whole word, fireworks for words of 2+ characters
  // positions, not characters, so a word like 弟弟 needs both written
  sessionDone.add(state.idx);
  let allDone = true;
  state.chars.forEach(function (c, i) {
    if (!sessionDone.has(i) && strokeCount[c] !== 0) allDone = false;
  });
  if (allDone) {
    sessionDone.clear();
    if (state.mode === 'write' && state.chars.length > 1 && purse.words.indexOf(state.text) < 0) {
      purse.words.unshift(state.text);
      toast('收進字訣本：「' + state.text + '」');
      save();
    }
    if (state.mode === 'write' && state.chars.length > 1) {
      purse.ingots += 1;
      save();
      toast('整個詞都自己寫完　+1 元寶');
      setTimeout(function () { flyCoins('gold', 1); }, 2000);
    }
    setTimeout(function () {
      if (state.sound) say(state.text);
    }, 1500);
    if (state.chars.length > 1) {
      queueCelebration(1500, function () {
        const glyphs = [];
        for (const c of state.chars) {
          if (glyphData[c]) glyphs.push(glyphSvg(glyphData[c]));
        }
        celebrate(glyphs, '練成了！');
        avatarPlay('cheer');
      });
    }
  } else {
    setTimeout(function () {
      if (myToken === buildToken && state.sound) say(ch);
    }, 1300);
  }
  announceLevels(reward.levelBefore, reward.levelAfter);

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

  finishedAt = performance.now();
  setTimeout(function () {
    if (myToken !== buildToken || !finishedAt) return;
    nextHint.textContent = '點格子：' + label;
    nextHint.hidden = false;
  }, 800);
}

// ---------- controls ----------
function renderModes() {
  document.querySelectorAll('#modes button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false');
  });
}
// switching modes stays on the character the child picked
function setMode(mode) {
  state.mode = mode;
  sessionDone.clear();
  renderModes();
  renderChips();
  build();
}
// a quick second tap on the same mode goes back to the word's first character
let lastModeTap = { mode: '', at: 0 };
document.querySelectorAll('#modes button').forEach(function (b) {
  b.addEventListener('click', function () {
    const now = performance.now();
    const doubleTap = lastModeTap.mode === b.dataset.mode && now - lastModeTap.at < 450;
    lastModeTap = { mode: b.dataset.mode, at: now };
    if (doubleTap) state.idx = 0;
    else if (state.sound) say(b.textContent.trim());
    setMode(b.dataset.mode);
  });
});

// press feedback: a ripple spreads from the finger on the main buttons
document.addEventListener('pointerdown', function (e) {
  const el = e.target.closest('.icon-btn, .seg button, .say, .chip, .player, .tabs button');
  if (!el || el.disabled || reducedMotion()) return;
  const rect = el.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'tap-ripple';
  dot.style.left = (e.clientX - rect.left) + 'px';
  dot.style.top = (e.clientY - rect.top) + 'px';
  el.append(dot);
  setTimeout(function () { dot.remove(); }, 480);
});
// every button with Chinese on it reads its name aloud (its aria-label, else its words), unless its
// own handler already spoke or it is marked data-quiet. A one- or two-character choice such as
// 開 / 關 is read with its row's label: 「音效 開」. This runs last in the same click, so the
// speech still counts as started by the tap (iOS plays nothing that starts later).
let clickStartedAt = 0;
document.addEventListener('click', function () { clickStartedAt = performance.now(); }, true);
document.addEventListener('click', function (e) {
  const el = e.target.closest('button');
  if (!el || el.disabled || !state.sound || el.hasAttribute('data-quiet')) return;
  if (lastSaidAt >= clickStartedAt) return;
  const found = (el.getAttribute('aria-label') || el.textContent).match(/\p{Script=Han}+/gu);
  if (!found) return;
  let text = found.join(' ');
  const label = el.closest('.opt-row') ? el.closest('.opt-row').querySelector('.label') : null;
  if (label && text.length <= 2) text = label.textContent.trim() + ' ' + text;
  say(text);
});

// iOS Safari applies :active only when the page listens for touches
document.addEventListener('touchstart', function () {}, { passive: true });

document.getElementById('restartBtn').addEventListener('click', function () { build(); });
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
    if (state.sound) say(currentChar());
  } else if (action === 'to-write') {
    state.idx = 0;
    setMode('write');
    if (state.sound) say(currentChar());
  } else {
    nextWord(true);
  }
});
document.getElementById('diceBtn').addEventListener('click', function () {
  sfxDice();
  nextWord(true);
});
document.getElementById('banner').addEventListener('click', function (e) { e.currentTarget.hidden = true; });

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

document.getElementById('playerCard').addEventListener('click', function () {
  shopSlot = 'scrolls';
  renderHero();
  openSheet(document.getElementById('heroSheet'));
});
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
      loadText(t, true);
      closeSheet(document.getElementById('customSheet'));
    });
    list.append(b);
  }
}
function renderListCount() {
  document.getElementById('listCount').textContent = state.list.length ? '目前 ' + state.list.length + ' 個' : '';
}
document.getElementById('saveListBtn').addEventListener('click', function () {
  const raw = document.getElementById('listInput').value;
  const items = [];
  for (const part of raw.split(/[\s,，、;；]+/)) {
    const t = parseText(part).join('');
    if (t && items.indexOf(t) < 0) items.push(t);
  }
  if (items.length === 0) {
    toast('請輸入中文字');
    return;
  }
  state.list = items;
  state.content = 'list';
  renderOptions();
  renderListCount();
  save();
  toast('生字本：' + items.length + ' 個');
  closeSheet(document.getElementById('customSheet'));
  nextWord(true);
});
document.getElementById('customBtn').addEventListener('click', function () {
  const input = document.getElementById('customInput');
  document.getElementById('listInput').value = state.list.join(' ');
  renderListCount();
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
  loadText(text, true);
  closeSheet(document.getElementById('customSheet'));
});
document.getElementById('useNameBtn').addEventListener('click', function () {
  if (!state.myName) {
    toast('先輸入名字，再按「設為我的名字」');
    return;
  }
  loadText(state.myName, true);
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

function showProfilePane(id) {
  document.querySelectorAll('#profileTabs button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.pane === id ? 'true' : 'false');
  });
  document.getElementById('accountPane').hidden = id !== 'accountPane';
  document.getElementById('newsPane').hidden = id !== 'newsPane';
  if (id === 'newsPane') renderNews();
}
document.querySelectorAll('#profileTabs button').forEach(function (b) {
  b.addEventListener('click', function () { showProfilePane(b.dataset.pane); });
});
document.getElementById('profileBtn').addEventListener('click', function () {
  showProfilePane('accountPane');
  newGender = '';
  document.querySelectorAll('#newGenderRow button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
  setAccountMode('login');
  document.getElementById('passInput').type = 'password';
  document.getElementById('passEye').setAttribute('aria-pressed', 'false');
  document.getElementById('passEye').querySelector('use').setAttribute('href', '#i-eye');
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

// ---------- settings ----------
function applyTheme() {
  if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', state.theme);
}
const volumeRange = document.getElementById('volumeRange');
volumeRange.addEventListener('input', function () {
  state.volume = Number(volumeRange.value) / 100;
  setVolume(state.volume);
});
volumeRange.addEventListener('change', function () {
  save();
  sfxTick(1568);
});
function renderOptions() {
  applyTheme();
  volumeRange.value = Math.round(state.volume * 100);
  setVolume(state.volume);
  box.classList.toggle('mi', state.grid === 'mi');
  keepBtn.setAttribute('aria-pressed', state.keep ? 'true' : 'false');
  document.querySelectorAll('.opt-row[data-opt]').forEach(function (row) {
    const opt = row.dataset.opt;
    let current;
    if (['grid', 'theme', 'content', 'music', 'gender'].indexOf(opt) >= 0) current = state[opt];
    else current = state[opt] ? '1' : '0';
    row.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.val === current ? 'true' : 'false');
    });
  });
}
document.querySelectorAll('.opt-row[data-opt]').forEach(function (row) {
  row.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    const opt = row.dataset.opt;
    if (opt === 'content') {
      if (b.dataset.val === 'list' && state.list.length === 0) {
        toast('先在「自己出題」存一份生字本');
        return;
      }
      state.content = b.dataset.val;
      renderOptions();
      save();
      nextWord(true);
      return;
    }
    if (opt === 'music') {
      state.music = b.dataset.val;
      renderOptions();
      save();
      playMusic(state.music);
      return;
    }
    if (opt === 'gender') {
      if (state.genderLock && !account.admin) return;
      state.gender = b.dataset.val;
      if (state.genderLock) state.genderLock = state.gender;
      renderOptions();
      save();
      renderHero();
      avatar.last = 0;
      if (reducedMotion()) avatarRender(1000);
      return;
    }
    if (opt === 'grid' || opt === 'theme') {
      state[opt] = b.dataset.val;
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


let bootAlias = '';
(async function boot() {
  let alias = '';
  try {
    alias = localStorage.getItem(CURRENT_KEY) || '';
    account.pass = alias ? localStorage.getItem(PASS_PREFIX + alias) || '' : '';
  } catch (e) {}
  account.alias = alias;
  bootAlias = alias;
  account.sync = cloudEnabled() && alias ? 'cloud' : 'local';
  const data = loadLocalProfile(alias);
  if (data) applyProfile(data);
  renderAll();
  startAvatar();

  const wordsReady = fetch('data/words.json').then(function (r) { return r.json(); }).then(function (list) {
    words = list;
  }, function () {});
  fetch('data/readings.json').then(function (r) { return r.json(); }).then(function (map) {
    readings = map;
    if (charData) renderInfo(charData);
  }, function () {});
  await cloudRefreshWithin(4000);
  if (account.alias !== bootAlias) return;
  if (state.text || state.myName) startText();
  checkInbox();
  await wordsReady;
  if (!state.chars.length) startText();
})();

// what a 俠客 looks like, from experience, worn gear and gender
function lookFor(xp, gear, gender) {
  const level = levelInfo(xp || 0).level;
  return { title: titleIndexFor(level), level: level, gear: gear || {}, gender: gender || 'boy' };
}

// ---------- 開始: one of the recent 俠客 on this device, or a guest ----------
// The tap that enters also starts the music and reads the word (browsers play sound only after a tap).
// the three 俠客 on this device used most recently: every saved profile with a passcode, by the later of
// its last save and its last entry here
const LAST_USED_KEY = 'bishun.lastUsed';
function recentHeroes() {
  const out = [];
  try {
    const used = JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.indexOf(PROFILE_PREFIX) !== 0) continue;
      const alias = key.slice(PROFILE_PREFIX.length);
      if (!alias || !localStorage.getItem(PASS_PREFIX + alias)) continue;
      const p = JSON.parse(localStorage.getItem(key)) || {};
      out.push({ alias: alias, at: Math.max(p.savedAt || 0, used[alias] || 0) });
    }
  } catch (e) {}
  out.sort(function (a, b) { return b.at - a.at; });
  return out.slice(0, 3).map(function (h) { return h.alias; });
}
function rememberHero(alias) {
  if (!alias) return;
  try {
    const used = JSON.parse(localStorage.getItem(LAST_USED_KEY) || '{}');
    used[alias] = Date.now();
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(used));
  } catch (e) {}
}

const gate = { timer: 0, frame: 0, slots: [] };
function renderGate() {
  const el = document.getElementById('recentHeroes');
  el.innerHTML = '';
  gate.slots = [];
  const list = recentHeroes();
  for (let i = 0; i < 3; i++) {
    const alias = list[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero-slot';
    el.append(b);
    if (!alias) {
      b.classList.add('empty');
      b.disabled = true;
      continue;
    }
    const p = loadLocalProfile(alias) || {};
    const pp = p.purse || {};
    const look = lookFor(pp.xp, pp.gear, p.settings ? p.settings.gender : '');
    const c = document.createElement('canvas');
    const name = document.createElement('b');
    name.textContent = alias;
    const rank = document.createElement('span');
    rank.textContent = TITLES[look.title].name + ' Lv ' + look.level;
    b.append(c);
    const badge = honorBadge(pp.honor, pp.customHonor);
    if (badge) b.append(badge);
    b.append(name, rank);
    b.setAttribute('data-quiet', '');
    b.addEventListener('click', function () { enterGame(alias); });
    gate.slots.push({ canvas: c, look: look, phase: i * 5 });
  }
  drawGate();
  if (!reducedMotion()) gate.timer = setInterval(drawGate, 170);
}
function drawGate() {
  gate.frame += 1;
  for (const s of gate.slots) {
    const pose = IDLE_SEQ[(gate.frame + s.phase) % IDLE_SEQ.length];
    drawHeroOn(s.canvas, { title: s.look.title, gear: s.look.gear, gender: s.look.gender, pose: pose, frame: gate.frame });
  }
}
function enterGame(alias) {
  clearInterval(gate.timer);
  document.getElementById('startGate').hidden = true;
  audioContext();
  if (alias !== account.alias) enterAs(alias);
  rememberHero(alias);
  if (state.music !== 'off') playMusic(state.music);
  const text = state.text || state.myName;
  if (state.sound && text) say(text);
}
// switch without saving first, so a newer copy in the cloud is still taken
function enterAs(alias) {
  let pass = '';
  try {
    pass = alias ? localStorage.getItem(PASS_PREFIX + alias) || '' : '';
    localStorage.setItem(CURRENT_KEY, alias);
  } catch (e) {}
  account.alias = alias;
  account.pass = pass;
  account.admin = false;
  account.sync = cloudEnabled() && alias ? 'cloud' : 'local';
  const data = loadLocalProfile(alias);
  if (data) applyProfile(data);
  else resetProgress();
  renderAll();
  cloudRefreshWithin(4000).then(function () {
    if (account.alias !== alias) return;
    startText();
    checkInbox();
  });
}
document.getElementById('guestStart').addEventListener('click', function () { enterGame(''); });
renderGate();

// ---------- 我的俠客: tap the hero and it moves ----------
const SHEET_ACTIONS = ['attack', 'cheer', 'hurt'];
const sheetHero = { timer: 0, next: 0 };
// the next of 出招 / 歡呼 / 受傷, with its sound
function nextHeroAction() {
  const name = SHEET_ACTIONS[sheetHero.next % SHEET_ACTIONS.length];
  sheetHero.next += 1;
  if (name === 'attack') sfxSwish();
  else if (name === 'cheer') sfxTick(1568);
  else sfxWood();
  return name;
}
document.getElementById('heroStage').addEventListener('click', function () {
  avatarPlay(nextHeroAction());
});
document.getElementById('heroAvatar').addEventListener('click', function (e) {
  const canvas = e.currentTarget;
  const name = nextHeroAction();
  const queue = ACTIONS[name].slice();
  let frame = 0;
  clearInterval(sheetHero.timer);
  sheetHero.timer = setInterval(function () {
    const pose = queue.length ? queue.shift() : 'stand';
    frame += 1;
    drawHeroOn(canvas, { title: titleIndex(), gear: purse.gear, pose: pose, frame: frame, qi: qiColor() });
    if (!queue.length) clearInterval(sheetHero.timer);
  }, 110);
});

// ---------- 江湖來信: letters and gifts, collected on login and when the app comes back ----------
async function checkInbox() {
  if (!cloudEnabled() || !account.alias || !account.pass) return;
  const alias = account.alias;
  let letters = [];
  try {
    letters = await rpc('letter_inbox', { p_alias: alias, p_pass: account.pass });
  } catch (e) {
    return;
  }
  if (account.alias !== alias || !letters || !letters.length) return;
  for (const letter of letters) receiveGifts(letter.body || {});
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
  save();
  renderAll();
  showLetters(letters);
}
function wholeNumber(v) {
  return Math.max(0, Math.floor(Number(v) || 0));
}
function receiveGifts(body) {
  purse.taels += wholeNumber(body.taels);
  purse.ingots += wholeNumber(body.ingots);
  for (const id of body.items || []) {
    if (itemById(id) && purse.owned.indexOf(id) < 0) purse.owned.push(id);
  }
  // from the 管理員: a gender, a 稱號
  if (body.gender === 'boy' || body.gender === 'girl') {
    state.genderLock = body.gender;
    state.gender = body.gender;
  }
  const honor = String(body.honor || '').trim();
  if (honor && purse.granted.indexOf(honor) < 0) {
    purse.granted.push(honor);
    if (!purse.honor) purse.honor = 'g:' + honor;
  }
}
function giftText(body) {
  const parts = [];
  if (wholeNumber(body.taels)) parts.push('銀兩 ' + wholeNumber(body.taels));
  if (wholeNumber(body.ingots)) parts.push('元寶 ' + wholeNumber(body.ingots));
  for (const id of body.items || []) {
    const it = itemById(id);
    if (it) parts.push(it.name);
  }
  if (body.gender === 'boy') parts.push('變成少俠');
  if (body.gender === 'girl') parts.push('變成女俠');
  if (body.honor) parts.push('稱號【' + body.honor + '】');
  return parts.join('、');
}
function showLetters(letters) {
  const list = document.getElementById('letterList');
  list.innerHTML = '';
  for (const letter of letters) {
    const body = letter.body || {};
    const card = document.createElement('article');
    card.className = 'letter';
    const head = document.createElement('h3');
    head.textContent = '來自「' + letter.from + '」';
    card.append(head);
    if (body.text) {
      const p = document.createElement('p');
      p.textContent = body.text;
      card.append(p);
    }
    const gifts = giftText(body);
    if (gifts) {
      const g = document.createElement('p');
      g.className = 'gifts';
      g.textContent = '附上：' + gifts;
      card.append(g);
    }
    const read = document.createElement('button');
    read.type = 'button';
    read.textContent = '念出來';
    read.addEventListener('click', function () {
      say(letter.from + ' 說：' + (body.text || '') + (gifts ? '。送你' + gifts : ''));
    });
    card.append(read);
    list.append(card);
  }
  openSheet(document.getElementById('letterSheet'));
  sfxGong(0.25);
}

// ---------- 包打聽: every 俠客, and a letter with gifts to one of them ----------
async function renderNews() {
  const note = document.getElementById('newsNote');
  const cards = document.getElementById('heroCards');
  document.getElementById('heroDetail').hidden = true;
  cards.hidden = false;
  cards.innerHTML = '';
  if (!cloudEnabled() || !account.alias) {
    note.textContent = '登入俠客帳號後，才能打聽江湖消息。';
    return;
  }
  note.textContent = '打聽中…';
  let heroes = [];
  try {
    heroes = await rpc('hero_list', { p_alias: account.alias, p_pass: account.pass }) || [];
  } catch (e) {
    note.textContent = e.notFound ? '包打聽還沒開張：請在 Supabase 執行 supabase/letters.sql。' : '連不上雲端，請稍後再試。';
    return;
  }
  note.textContent = '江湖上有 ' + heroes.length + ' 位俠客';
  for (const h of heroes) {
    const look = lookFor(h.xp, h.gear, h.gender);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero-card';
    b.setAttribute('aria-label', h.alias);
    const c = document.createElement('canvas');
    const name = document.createElement('b');
    name.textContent = h.alias === account.alias ? h.alias + '（你）' : h.alias;
    const rank = document.createElement('span');
    rank.textContent = TITLES[look.title].name + ' Lv ' + look.level;
    const money = document.createElement('span');
    money.innerHTML = moneyHtml(h.taels, h.ingots);
    b.append(c);
    const badge = honorBadge(h.honor, h.customHonor);
    if (badge) b.append(badge);
    b.append(name, rank, money);
    cards.append(b);
    drawHeroOn(c, { title: look.title, gear: look.gear, gender: look.gender });
    if (h.alias === account.alias) b.classList.add('me');
    else b.addEventListener('click', function () { openGift(h); });
  }
}

let gift = { to: null, taels: 0, ingots: 0, items: [], gender: '' };
function openGift(h) {
  gift = { to: h, taels: 0, ingots: 0, items: [], gender: '' };
  document.getElementById('heroCards').hidden = true;
  document.getElementById('heroDetail').hidden = false;
  document.getElementById('letterText').value = '';
  document.getElementById('giftNote').textContent = '';
  const look = lookFor(h.xp, h.gear, h.gender);
  drawHeroOn(document.getElementById('giftAvatar'), { title: look.title, gear: look.gear, gender: look.gender });
  document.getElementById('giftName').textContent = h.alias;
  document.getElementById('giftRank').textContent = TITLES[look.title].name + ' Lv ' + look.level;
  document.getElementById('giftMoney').innerHTML = moneyHtml(h.taels, h.ingots);
  document.getElementById('giftAdmin').hidden = !account.admin;
  document.getElementById('giftRemove').hidden = !account.admin;
  document.getElementById('giftHonor').value = '';

  // what this 俠客 owns and could give away; the 管理員 can give anything
  const grid = document.getElementById('giftItems');
  grid.innerHTML = '';
  const giveable = account.admin ? ITEMS.map(function (it) { return it.id; }) : purse.owned;
  if (!giveable.length) {
    const none = document.createElement('span');
    none.className = 'quiet';
    none.textContent = '還沒有東西';
    grid.append(none);
  }
  for (const id of giveable) {
    const it = itemById(id);
    if (!it) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', it.name);
    b.setAttribute('aria-pressed', 'false');
    const c = document.createElement('canvas');
    b.append(c);
    grid.append(b);
    drawItemIcon(c, it);
    b.addEventListener('click', function () {
      const at = gift.items.indexOf(id);
      if (at >= 0) gift.items.splice(at, 1);
      else gift.items.push(id);
      b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
    });
  }
  renderGiftAmounts();
}
// silver and gold counts with their icons
function moneyHtml(taels, ingots) {
  return syceeHtml('silver') + (taels || 0) + '　' + syceeHtml('gold') + (ingots || 0);
}
function renderGiftAmounts() {
  document.getElementById('giftTaels').textContent = '送 ' + gift.taels + (account.admin ? '（賞賜）' : '（剩 ' + (purse.taels - gift.taels) + '）');
  document.getElementById('giftIngots').textContent = '送 ' + gift.ingots + (account.admin ? '（賞賜）' : '（剩 ' + (purse.ingots - gift.ingots) + '）');
  document.querySelectorAll('#giftGenderRow button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.gender === gift.gender ? 'true' : 'false');
  });
}
document.querySelectorAll('#heroDetail [data-taels]').forEach(function (b) {
  b.addEventListener('click', function () {
    const n = Number(b.dataset.taels);
    gift.taels = n ? gift.taels + n : 0;
    if (!account.admin) gift.taels = Math.min(purse.taels, gift.taels);
    renderGiftAmounts();
  });
});
document.querySelectorAll('#heroDetail [data-ingots]').forEach(function (b) {
  b.addEventListener('click', function () {
    const n = Number(b.dataset.ingots);
    gift.ingots = n ? gift.ingots + n : 0;
    if (!account.admin) gift.ingots = Math.min(purse.ingots, gift.ingots);
    renderGiftAmounts();
  });
});
document.querySelectorAll('#giftGenderRow button').forEach(function (b) {
  b.addEventListener('click', function () {
    gift.gender = b.dataset.gender;
    renderGiftAmounts();
  });
});
document.getElementById('newsBack').addEventListener('click', renderNews);
document.getElementById('giftSend').addEventListener('click', async function () {
  const note = document.getElementById('giftNote');
  const text = document.getElementById('letterText').value.trim();
  const honor = account.admin ? document.getElementById('giftHonor').value.trim() : '';
  if (!text && !gift.taels && !gift.ingots && !gift.items.length && !gift.gender && !honor) {
    note.textContent = '寫幾句話，或選個禮物';
    return;
  }
  const body = { text: text, taels: gift.taels, ingots: gift.ingots, items: gift.items.slice() };
  if (gift.gender) body.gender = gift.gender;
  if (honor) body.honor = honor;
  note.textContent = '飛鴿傳書中…';
  try {
    await rpc('letter_send', { p_alias: account.alias, p_pass: account.pass, p_to: gift.to.alias, p_body: body });
  } catch (e) {
    note.textContent = e.notFound ? '包打聽還沒開張：請在 Supabase 執行 supabase/letters.sql。' : '沒送出去，請稍後再試。';
    return;
  }
  // the gifts leave this 俠客's purse, and come off if worn; the 管理員's cost nothing
  if (!account.admin) {
    purse.taels -= gift.taels;
    purse.ingots -= gift.ingots;
    for (const id of gift.items) {
      purse.owned.splice(purse.owned.indexOf(id), 1);
      for (const slot in purse.gear) {
        if (purse.gear[slot] === id) purse.gear[slot] = '';
      }
    }
  }
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
  save();
  renderAll();
  toast('信已經送到「' + gift.to.alias + '」');
  renderNews();
});

// ---------- 稱號 ----------
// the worn 稱號: an earned or granted one in its tier's frame, a typed one as plain words
function honorInfo(value, custom) {
  if (!value) return null;
  if (value === 'custom') return custom ? { name: custom, tier: 'plain' } : null;
  if (value.indexOf('g:') === 0) return { name: value.slice(2), tier: 'gold' };
  const h = honorById(value);
  return h ? { name: h.name, tier: h.tier } : null;
}
function honorBadge(value, custom) {
  const info = honorInfo(value, custom);
  if (!info) return null;
  const el = document.createElement('span');
  el.className = 'honor ' + info.tier;
  el.textContent = '【' + info.name + '】';
  return el;
}
function wearHonor(value) {
  purse.honor = value;
  save();
  renderPurse();
  renderHero();
}

// the 稱號 tab: won ones to wear (tap again to take off), the rest as shadows saying how to win them,
// and one of your own words
function renderHonors(grid) {
  const list = document.createElement('div');
  list.className = 'honor-list';
  const entries = [];
  for (const h of HONORS) {
    const won = purse.honors.indexOf(h.id) >= 0;
    if (h.admin && !won) continue;
    entries.push({ value: h.id, name: h.name, tier: h.tier, hint: h.hint, won: won });
  }
  for (const g of purse.granted) {
    entries.push({ value: 'g:' + g, name: g, tier: 'gold', hint: '管理員賜的稱號', won: true });
  }
  for (const e of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'honor-card';
    const badge = document.createElement('span');
    badge.className = 'honor ' + (e.won ? e.tier : 'shadow');
    badge.textContent = '【' + (e.won ? e.name : '？？？') + '】';
    const hint = document.createElement('span');
    hint.className = 'quiet';
    hint.textContent = e.hint;
    b.append(badge, hint);
    if (e.won) {
      const wearing = purse.honor === e.value;
      b.setAttribute('aria-pressed', wearing ? 'true' : 'false');
      b.setAttribute('aria-label', e.name);
      b.addEventListener('click', function () { wearHonor(wearing ? '' : e.value); });
    } else {
      // tapping a shadow reads how to win it
      b.setAttribute('aria-label', e.hint);
    }
    list.append(b);
  }

  const own = document.createElement('div');
  own.className = 'row honor-own';
  const input = document.createElement('input');
  input.maxLength = 6;
  input.placeholder = '自己取一個稱號';
  input.value = purse.customHonor;
  const wear = document.createElement('button');
  wear.type = 'button';
  wear.textContent = '掛上';
  wear.addEventListener('click', function () {
    purse.customHonor = input.value.trim();
    wearHonor(purse.customHonor ? 'custom' : '');
  });
  const off = document.createElement('button');
  off.type = 'button';
  off.textContent = '不掛稱號';
  off.addEventListener('click', function () { wearHonor(''); });
  own.append(input, wear, off);
  grid.append(list, own);
}

// 稱號 won with the character just finished, each shown as a token after the stamp
function checkHonors(mistakes) {
  const won = [];
  function win(id) {
    if (purse.honors.indexOf(id) >= 0) return;
    purse.honors.push(id);
    won.push(honorById(id));
  }
  const strokes = strokeCount[currentChar()] || 0;
  const seconds = (performance.now() - quizStartedAt) / 1000;
  if (state.mode === 'write') {
    purse.perfectRun = mistakes === 0 ? purse.perfectRun + 1 : 0;
    if (mistakes === 0) win('firstWrite');
    if (mistakes === 0 && strokes >= 8 && seconds <= strokes * 1.5) win('quick');
    if (strokes >= 20) win('heavy');
    if (purse.perfectRun >= 10) win('perfect10');
  }
  if (mistakes >= 3) win('stubborn');
  if (purse.streak >= 3) win('streak3');
  if (purse.streak >= 7) win('streak7');
  if (purse.scrolls.length >= 20) win('chars20');
  if (purse.scrolls.length >= 50) win('chars50');
  if (purse.scrolls.length >= 200) win('chars200');
  if (!won.length) return;
  if (!purse.honor) purse.honor = won[0].id;
  save();
  renderPurse();
  for (const h of won) {
    queueCelebration(1800, function () { showHonor(h.name, h.tier); });
  }
}
const honorPop = document.getElementById('honorPop');
function showHonor(name, tier) {
  document.getElementById('honorPopName').textContent = '【' + name + '】';
  honorPop.className = 'honor-pop ' + tier;
  honorPop.hidden = false;
  sfxGong(0.4);
  if (state.sound) say('解鎖稱號，' + name);
  setTimeout(function () { honorPop.hidden = true; }, 3400);
}
honorPop.addEventListener('click', function () { honorPop.hidden = true; });

// 逐出江湖: the 管理員 removes a 俠客 for good by sliding all the way; let go early and it springs back
const removeSlider = document.getElementById('removeSlider');
removeSlider.addEventListener('input', function () {
  if (Number(removeSlider.value) >= 100) removeHero();
});
removeSlider.addEventListener('change', function () {
  removeSlider.value = 0;
});
async function removeHero() {
  removeSlider.value = 0;
  const h = gift.to;
  if (!h || !account.admin) return;
  const note = document.getElementById('giftNote');
  try {
    await rpc('hero_delete', { p_alias: account.alias, p_pass: account.pass, p_target: h.alias });
  } catch (e) {
    note.textContent = '沒有成功，請稍後再試。';
    return;
  }
  toast('「' + h.alias + '」已經離開江湖');
  renderNews();
}
