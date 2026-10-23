// 一筆江湖: practice flow, MOE word bank, 俠客 levels and shop, profiles (local + optional cloud).

const N_CHUNKS = 128;
const TRANSPARENT = 'rgba(0,0,0,0)';
const COMPARE_RED = 'rgba(210,15,57,0.35)';
const ARENA_PAD = 18;   // arena padding + its border + the paper border
const SEAL_TEXT = { 3: '甲上', 2: '甲', 1: '加油' };
// the plaques the 管理員 can grant a 稱號 on
const GRANT_TIERS = ['gold', 'jade', 'ink', 'bronze', 'legend', 'plain'];
const TIER_NAMES = { gold: '金匾', jade: '玉牌', ink: '墨匾', bronze: '竹牌', legend: '紫光', plain: '素字' };
// 中二 decorations: pairs to wrap a 稱號 in, and single marks to add anywhere
const DECOR_PAIRS = [
  ['【', '】'], ['乂', '卍'], ['↖☆', '☆↘'], ['☆㊣↙', '↗㊣☆'], ['★彡', '彡★'], ['♛', '♛'],
  ['亗', '亗'], ['『', '』'], ['〖', '〗'], ['✧', '✧'], ['o', 'o'], ['一', '一'], ['ღ', 'ღ'], ['━╋', '╋━'],
];
const DECOR_MARKS = ['☆', '★', '㊣', '♛', '亗', 'ツ', '乂', '卍', '↖', '↗', '↘', '↙', '彡', '♪', '♥', '✿', '❀', '✦', 'ღ', '☠', '∞', '煞氣a'];
const DECOR_CHARS = new Set(Array.from('【】乂卍↖↗↘↙☆★㊣♛亗ツ☠彡♪♥✿❀✦✧ღ∞『』〖〗o一━╋'));
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
  musicLoop: 'one',
  voice: 'meijia',
  volume: 0.8,
  gender: 'boy',
  genderLock: '',
  theme: 'light',
  grid: 'jiu',
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
  slist: [],
  sentence: null,
};
// xp: every tael ever earned (spending never lowers it); gear: what the 俠客 holds, wears, brings along
const purse = {
  taels: 0,
  ingots: 0,
  xp: 0,
  owned: [],
  gear: { weapon: '', head: '', waist: '', back: '', hair: '', pet: '', treasure: '' },
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
// homophones.json: {注音: a common character with only that reading}. A voice takes only text, so a
// 破音字 is spoken as such a character with the reading its 注音 gives (還 ㄏㄞˊ as 孩); see make_sentences.py
let homophones = {};
function voiceChar(ch, zy, readingsOfChar) {
  const many = readingsOfChar && readingsOfChar.length > 1;
  if (!many || !zy || zy[0] === '˙' || '一不'.indexOf(ch) >= 0) return ch;
  return homophones[zy] || ch;
}
// the reading of the character at idx: the sentence's, else the word's, else the character's usual one
function readingAt(idx) {
  const sent = state.sentence;
  if (sent && sent.z && sent.z[sent.k[idx]]) return sent.z[sent.k[idx]];
  return zhuyinAt(state.text, idx, glyphData[state.chars[idx]]);
}
function sayCharAt(idx) {
  const ch = state.chars[idx];
  const data = glyphData[ch];
  const sent = state.sentence;
  // in a sentence, the character as its spoken text has it (rare ones are swapped there too)
  if (sent && sent.v && sent.k[idx] !== undefined) {
    say(ch, Array.from(sent.v)[sent.k[idx]]);
    return;
  }
  say(ch, voiceChar(ch, readingAt(idx), data && data.zy));
}
function saySentence(sent) {
  say(sent.s, sent.v);
}
function zhuyinAt(text, i, data) {
  const r = readings[text];
  if (r && r.length === Array.from(text).length && r[i]) return r[i];
  return data && data.zy && data.zy.length ? data.zy[0] : '';
}
let shopSlot = 'weapon';
const HERO_TABS = SLOTS.concat([{ id: 'scrolls', name: '字訣本' }, { id: 'honors', name: '稱號' }]);
const TAB_ICONS = {
  weapon: '<path d="M19 3h2v2L9 17l-2-2zM6 14l4 4M4 20l3-3M5 15l4 4"/>',
  acc: '<path d="M12 3l4 5-4 12-4-12z"/><path d="M8 8h8"/>',
  pet: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17c0-3 2-5 4.5-5S17 14 17 17c0 2-2 2.5-4.5 2.5S8 19 8 17z"/>',
  treasure: '<path d="M4 11h16v9H4zM4 11a8 5 0 0 1 16 0M12 13v3M4 14h16"/>',
  scrolls: '<path d="M7 4h11a2 2 0 0 1 0 4H7zM7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 4 0V8M9 20h9a2 2 0 0 0 2-2V8M12 12h5M12 15h5"/>',
  honors: '<path d="M8 3l4 6 4-6"/><circle cx="12" cy="15" r="5.5"/><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
};

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
  let w = stage.clientWidth - 2 * ARENA_PAD;
  let h = stage.clientHeight - 2 * ARENA_PAD - plaqueH;
  const sent = document.getElementById('sentence');
  if (!sent.hidden) {
    if (isLandscape()) w -= sent.offsetWidth + SENTENCE_GAP;
    else h -= sent.offsetHeight + SENTENCE_GAP;
  }
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
// the 名望 outfit worn: gear.outfit, a rank already reached and picked in 我的俠客; '' follows the rank
function outfitFor(xp, gear) {
  const rank = titleIndexFor(levelInfo(xp || 0).level);
  const o = gear ? gear.outfit : '';
  return typeof o === 'number' && o >= 0 && o <= rank ? o : rank;
}
function outfitIndex() {
  return outfitFor(purse.xp, purse.gear);
}
// the first items (v0) by the ids they have in the sprite pack: the same things, the same names
const OLD_ITEM_IDS = {
  wood: 'sword_mujian', staff: 'spear_zhugun', umbrella: 'spear_san', fan: 'sword_tieshan', brush: 'sword_panguan',
  whisk: 'sword_fuchen', whip: 'spear_bian', flute: 'sword_yudi', spear: 'spear_hongying', dao: 'sabre_liuye',
  emei: 'fist_emei', ring: 'sabre_jiuhuan', jian: 'sword_qinggang', hammer: 'hidden_liuxing', guandao: 'spear_yanyue',
  halberd: 'spear_huaji', zhanlu: 'sword_zhanlu', ganjiang: 'sword_ganjiang',
  bunny: 'pet_tuzi', cat: 'pet_mao', dog: 'pet_gou', monkey: 'pet_houzi', panda: 'pet_xiongmao', koi: 'pet_jinli',
  crane: 'pet_he', dragon: 'pet_qinglong', qilin: 'pet_qilin',
  flower: 'head_hong', feather: 'head_zhiling', hairpin: 'head_yuzan', bellband: 'head_jinling', phoenix: 'head_fengguan',
  bell: 'waist_lingdang', sachet: 'waist_xiangbao', gourd: 'waist_hulu', jade: 'waist_yupei', pouch: 'waist_jinnang',
  scroll: 'back_shujuan', cloak: 'back_pifeng', swordbox: 'back_jianxia', goldcloak: 'back_jinlv',
};
function newItemId(id) {
  return OLD_ITEM_IDS[id] || id;
}
function newGear(gear) {
  const out = {};
  for (const place in gear || {}) {
    out[place] = place === 'outfit' ? gear[place] : newItemId(gear[place]);
  }
  return out;
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
      content: state.content, music: state.music, musicLoop: state.musicLoop, voice: state.voice, volume: state.volume, gender: state.gender, genderLock: state.genderLock, theme: state.theme, grid: state.grid, lenient: state.lenient,
      slow: state.slow, sound: state.sound, radical: state.radical, keep: state.keep,
    },
    stars: state.stars,
    myName: state.myName,
    recent: state.recent,
    list: state.list,
    slist: state.slist,
    sentence: state.sentence,
    text: state.text,
    purse: purse,
  };
}
function resetProgress() {
  state.stars = {};
  state.myName = '';
  state.recent = [];
  state.list = [];
  state.slist = [];
  state.sentence = null;
  state.text = '';
  Object.assign(purse, { taels: 0, ingots: 0, xp: 0, owned: [], gear: { weapon: '', head: '', waist: '', back: '', hair: '', pet: '', treasure: '' }, scrolls: [], words: [], lastDay: '', streak: 0, honors: [], honor: '', customHonor: '', granted: [], perfectRun: 0 });
}
function applyProfile(source) {
  // work on a copy: a carried-over guest profile shares the live purse object
  const p = JSON.parse(JSON.stringify(source));
  resetProgress();
  state.genderLock = '';
  if (p.settings) {
    for (const key of ['content', 'music', 'musicLoop', 'voice', 'gender', 'genderLock', 'theme', 'grid']) {
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
  if (p.slist) state.slist = p.slist;
  if (p.sentence) state.sentence = p.sentence;
  if (p.text) state.text = p.text;
  if (p.purse) {
    const old = p.purse;
    purse.taels = old.taels || 0;
    purse.ingots = old.ingots || 0;
    // earlier versions called it 'earned' and held one weapon in 'equipped'
    purse.xp = old.xp !== undefined ? old.xp : (old.earned || 0);
    purse.owned = [];
    for (const id of old.owned || []) {
      if (purse.owned.indexOf(newItemId(id)) < 0) purse.owned.push(newItemId(id));
    }
    if (old.gear) Object.assign(purse.gear, newGear(old.gear));
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
    err.tooLong = text.indexOf('letter too long') >= 0;
    err.noHero = text.indexOf('no such hero') >= 0;
    err.notAllowed = text.indexOf('not allowed') >= 0;
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
    note.textContent = '飛鴿傳書中…';
    let res = null;
    try {
      res = await rpc('profile_load', { p_alias: alias, p_pass: pass });
    } catch (e) {
      note.textContent = e.wrongPass ? '暗號不對喔，再試一次。' : '連不上雲端，請稍後再試。';
      return;
    }
    if (accountMode === 'login' && !res) {
      note.textContent = '江湖上沒有「' + alias + '」這號人物。第一次來的話，請按上面的「拜師入門」。';
      return;
    }
    if (accountMode === 'create' && res) {
      note.textContent = '「' + alias + '」這個名號已經有人用了，換一個吧；如果是你，請按「報到」。';
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
        toast('「' + alias + '」拜師入門！');
      } catch (e) {
        note.textContent = '飛鴿迷路了，連不上雲端，等一下再試。';
        return;
      }
    } else {
      toast(alias + ' 回來了！');
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
    note.textContent = '暗號不對喔，再試一次。';
    return;
  }
  localStorage.setItem(PASSHASH_PREFIX + alias, hash);
  let data = loadLocalProfile(alias);
  if (accountMode === 'login' && !data) {
    note.textContent = '江湖上沒有「' + alias + '」這號人物。第一次來的話，請按上面的「拜師入門」。';
    return;
  }
  if (accountMode === 'create' && data) {
    note.textContent = '「' + alias + '」這個名號已經有人用了，換一個吧；如果是你，請按「報到」。';
    return;
  }
  if (data) {
    toast(alias + ' 回來了！');
  } else {
    if (!newGender) {
      note.textContent = '新俠客要先選：少俠還是女俠。';
      return;
    }
    data = withGender(carry, newGender);
    toast('「' + alias + '」拜師入門！');
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
  document.getElementById('accountSubmit').textContent = mode === 'create' ? '拜師' : '報到';
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
// the next word is chosen while this one is practised and its stroke data fetched meanwhile, so a slow
// connection does not hold up the next word
let upcoming = null;
function prepareNext() {
  upcoming = null;
  if (sentenceContent()) return;
  if (!words.length && !(state.content === 'list' && state.list.length)) return;
  const text = pickWord().w;
  if (text === state.text) return;
  upcoming = { content: state.content, text: text };
  for (const ch of Array.from(text)) getCharData(ch);
}
function nextWord(speak) {
  if (sentenceContent()) {
    const sent = pickSentence();
    if (sent) loadSentence(sent, speak);
    return;
  }
  if (!words.length && !(state.content === 'list' && state.list.length)) return;
  let text = pickWord().w;
  if (upcoming && upcoming.content === state.content && upcoming.text !== state.text) text = upcoming.text;
  upcoming = null;
  loadText(text, speak);
  setTimeout(prepareNext, 2500);
}

// ---------- 句子: a sentence to read with 注音; its marked characters are written one by one ----------
// data/sentences.json: { s: sentence, z: 注音 per character, k: positions to write, t: tier, src: 'b' | 'm' },
// from the app's own graded sentences and 教育部《國語小字典》 (tools/make_sentences.py).
let sentences = [];
const VERTICAL_PUNCT = {
  '，': '︐', '。': '︒', '、': '︑', '：': '︓', '；': '︔', '！': '︕', '？': '︖',
  '「': '﹁', '」': '﹂', '『': '﹃', '』': '﹄', '（': '︵', '）': '︶', '…': '︙', '—': '︱',
};
function sentenceContent() {
  return state.content === 'sentences' || state.content === 'mysentences';
}
// a line of 我的句子本: [ ] or ［ ］ mark the characters to write; without marks every character is written
function parseMySentence(line) {
  const chars = [];
  const k = [];
  let marked = false;
  let anyMark = false;
  for (const ch of Array.from(line.trim())) {
    if (ch === '[' || ch === '［') {
      marked = true;
      anyMark = true;
      continue;
    }
    if (ch === ']' || ch === '］') {
      marked = false;
      continue;
    }
    if (marked && /\p{Script=Han}/u.test(ch)) k.push(chars.length);
    chars.push(ch);
  }
  if (!anyMark) {
    chars.forEach(function (ch, i) {
      if (/\p{Script=Han}/u.test(ch)) k.push(i);
    });
  }
  return { s: chars.join(''), z: null, k: k.slice(0, 12), src: 'own' };
}
function pickSentence() {
  if (state.content === 'mysentences') {
    const mine = state.slist.map(parseMySentence).filter(function (x) { return x.k.length; });
    if (!mine.length) return null;
    const fresh = mine.filter(function (x) { return seen.indexOf(x.s) < 0; });
    const from = fresh.length ? fresh : mine;
    return from[Math.floor(Math.random() * from.length)];
  }
  if (!sentences.length) return null;
  const tier = wordTier();
  const pool = [];
  let total = 0;
  for (const s of sentences) {
    if (s.t > tier || seen.indexOf(s.s) >= 0) continue;
    let weight = 1;
    if (s.t === tier) weight = 4;
    else if (s.t === tier - 1) weight = 2;
    pool.push({ s: s, weight: weight });
    total += weight;
  }
  if (!pool.length) return sentences[Math.floor(Math.random() * sentences.length)];
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item.s;
  }
  return pool[pool.length - 1].s;
}
function loadSentence(sent, speak) {
  const chars = Array.from(sent.s);
  const targets = [];
  for (const i of sent.k) targets.push(chars[i]);
  loadText(targets.join(''), false, sent);
  if (speak && state.sound) saySentence(sent);
}
// 注音 for a sentence of 我的句子本: the longest word with known readings, else each character's usual one;
// and the spoken form from it
async function sentenceVoice(sent) {
  const chars = Array.from(sent.s);
  const z = await sentenceZhuyin(sent);
  let v = '';
  for (let i = 0; i < chars.length; i++) {
    const d = /\p{Script=Han}/u.test(chars[i]) ? await getCharData(chars[i]) : null;
    v += voiceChar(chars[i], z[i], d && d.zy);
  }
  return { z: z, v: v };
}
async function sentenceZhuyin(sent) {
  const chars = Array.from(sent.s);
  const z = [];
  let i = 0;
  while (i < chars.length) {
    let n = 4;
    while (n >= 2 && !readings[chars.slice(i, i + n).join('')]) n -= 1;
    if (n >= 2 && i + n <= chars.length) {
      for (const r of readings[chars.slice(i, i + n).join('')]) z.push(r);
      i += n;
      continue;
    }
    const ch = chars[i];
    let zy = '';
    if (ch === '一') zy = 'ㄧ';
    else if (ch === '不') zy = 'ㄅㄨˋ';
    else if (/\p{Script=Han}/u.test(ch)) {
      const d = await getCharData(ch);
      zy = d && d.zy && d.zy.length ? d.zy[0] : '';
    }
    z.push(zy);
    i += 1;
  }
  return z;
}

// the sentence beside the box: a column read top to bottom, right to left, in landscape; a strip below
// the box in portrait. The character being written is framed, the ones written are inked in.
const sentenceEl = document.getElementById('sentence');
const SENTENCE_PAD = 10;
// 挑字: while on, a tap on a character adds it to the draft of characters to write, or takes it out,
// in any order; turning it off writes the draft, which must keep at least one character
let picking = false;
let pickDraft = [];
const SENTENCE_GAP = 30;
// below the characters: the small source note
const SOURCE_ROOM = 16;
let justInked = -1;
function isLandscape() {
  return window.matchMedia('(min-aspect-ratio: 1001/1000)').matches;
}
function renderSentence() {
  const sent = state.sentence;
  stage.classList.toggle('with-sentence', Boolean(sent));
  sentenceEl.hidden = !sent;
  if (!sent) return;
  const vertical = isLandscape();
  sentenceEl.classList.toggle('vertical', vertical);
  const chars = Array.from(sent.s);
  const now = sent.k[state.idx];
  // The panel keeps one size for every sentence, so the writing box does not move: two columns of the full
  // character size (portrait: two rows) along the whole stage. A longer sentence gets smaller characters to fit
  // in those two; the speaker and the 挑字 pencil take a cell each, the source note sits below.
  const pad = 2 * SENTENCE_PAD;
  const half = Math.ceil((chars.length + 2) / 2);
  const along = (vertical ? stage.clientHeight : stage.clientWidth) - 2 * ARENA_PAD;
  const room = along - pad - SOURCE_ROOM;
  let full;
  let g;
  if (vertical) {
    full = Math.max(26, Math.min(40, stage.clientHeight / 17));
    g = Math.max(12, Math.min(full, room / (1.34 * half)));
    sentenceEl.style.width = Math.round(2 * 2 * full + pad) + 'px';
    sentenceEl.style.height = Math.round(along) + 'px';
  } else {
    full = Math.max(22, Math.min(34, stage.clientWidth / 13));
    g = Math.max(12, Math.min(full, room / (2 * half)));
    sentenceEl.style.width = Math.round(along) + 'px';
    sentenceEl.style.height = Math.round(2 * 1.34 * full + pad + SOURCE_ROOM) + 'px';
  }
  sentenceEl.style.setProperty('--g', g + 'px');
  sentenceEl.innerHTML = '';
  const whole = document.createElement('button');
  whole.type = 'button';
  whole.className = 'sentence-say';
  whole.setAttribute('aria-label', '念整句');
  whole.setAttribute('data-quiet', '');
  whole.innerHTML = '<svg aria-hidden="true"><use href="#i-speaker"></use></svg>';
  const pick = document.createElement('button');
  pick.type = 'button';
  pick.className = 'sentence-pick';
  pick.setAttribute('aria-label', '挑字');
  pick.setAttribute('aria-pressed', picking ? 'true' : 'false');
  pick.setAttribute('data-quiet', '');
  pick.innerHTML = '<svg aria-hidden="true"><use href="#i-pencil"></use></svg>';
  sentenceEl.append(whole, pick);
  sentenceEl.classList.toggle('picking', picking);
  // where the sentence comes from, in small letters at the corner
  const source = document.createElement('span');
  source.className = 'sentence-src';
  if (sent.src === 'c') {
    source.textContent = '簡編本「' + sent.r + '」';
    source.title = '教育部《國語辭典簡編本》「' + sent.r + '」條';
  } else if (sent.src === 'm') {
    source.textContent = '小字典「' + sent.r + '」';
    source.title = '教育部《國語小字典》「' + sent.r + '」條';
  } else if (sent.src === 'b') {
    source.textContent = '自編';
  }
  if (source.textContent) sentenceEl.append(source);
  chars.forEach(function (ch, i) {
    const cell = document.createElement('span');
    cell.className = 'cell';
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.textContent = vertical && VERTICAL_PUNCT[ch] ? VERTICAL_PUNCT[ch] : ch;
    const zy = document.createElement('span');
    zy.className = 'zy-v';
    if (sent.z && sent.z[i]) renderZhuyin(zy, sent.z[i]);
    cell.append(glyph, zy);
    cell.dataset.i = i;
    if (picking) {
      // while picking, the draft shows which characters are chosen, all alike
      if (pickDraft.indexOf(i) >= 0) cell.classList.add('target');
    } else {
      const j = sent.k.indexOf(i);
      if (j >= 0) {
        cell.classList.add('target');
        cell.dataset.j = j;
        if (i === now) cell.classList.add('now');
        if (sessionDone.has(j)) cell.classList.add('done');
        if (j === justInked) cell.classList.add('inked');
      }
    }
    sentenceEl.append(cell);
  });
  justInked = -1;
  if (!sent.z) {
    sentenceVoice(sent).then(function (r) {
      sent.z = r.z;
      sent.v = r.v;
      if (state.sentence === sent) {
        renderSentence();
        if (charData) renderInfo(charData);
      }
    });
  }
}
// the speaker reads the whole sentence; a character is read on its own, in its reading here,
// and a framed one is also the next to write
sentenceEl.addEventListener('click', function (e) {
  const sent = state.sentence;
  if (!sent) return;
  if (e.target.closest('.sentence-say')) {
    if (state.sound) saySentence(sent);
    return;
  }
  if (e.target.closest('.sentence-pick')) {
    if (!picking) {
      picking = true;
      pickDraft = sent.k.slice();
      if (state.sound) say('挑字：點一下字，加進或拿掉');
      renderSentence();
      return;
    }
    if (!pickDraft.length) {
      // nothing chosen: refuse with a shake
      sfxWood();
      restartAnimation(sentenceEl, 'shake');
      if (state.sound) say('至少挑一個字');
      return;
    }
    picking = false;
    if (state.sound) say('挑好了');
    const k = pickDraft.slice().sort(function (a, b) { return a - b; });
    if (k.join() === sent.k.join()) renderSentence();
    else loadSentence(Object.assign({}, sent, { k: k }));
    return;
  }
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const i = Number(cell.dataset.i);
  const ch = Array.from(sent.s)[i];
  if (!/\p{Script=Han}/u.test(ch)) return;
  if (state.sound) say(ch, Array.from(sent.v || sent.s)[i]);
  if (picking) {
    const at = pickDraft.indexOf(i);
    if (at >= 0) pickDraft.splice(at, 1);
    else if (pickDraft.length < 12) pickDraft.push(i);
    renderSentence();
    return;
  }
  if (cell.dataset.j !== undefined && Number(cell.dataset.j) !== state.idx) {
    state.idx = Number(cell.dataset.j);
    renderChips();
    build();
  }
});

// ---------- the current exercise ----------
// sent: the sentence these characters are written in, if any
function loadText(text, speak, sent) {
  const chars = parseText(text);
  if (chars.length === 0) {
    toast('請輸入中文字');
    return;
  }
  state.text = chars.join('');
  state.chars = chars;
  state.sentence = sent || null;
  state.idx = 0;
  state.mode = 'watch';
  sessionDone.clear();

  const seenAs = sent ? sent.s : state.text;
  const at = seen.indexOf(seenAs);
  if (at >= 0) seen.splice(at, 1);
  seen.unshift(seenAs);
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
  if (state.sentence) loadSentence(state.sentence);
  else if (state.text) loadText(state.text);
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
  inkSeal(sealEl);
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
// The 俠客 on a canvas: o = { title, gear, gender, view card / stage, action idle / attack1 / attack2, t ms
// into it, hurt }. From the sprite pack once it has loaded; the v0 pixel hero (pose, frame) if it cannot be.
function drawHeroOn(canvas, o) {
  if (doll.state === 'ready') {
    const look = { title: o.title, gear: o.gear, gender: o.gender || state.gender, action: o.action, t: o.t, hurt: o.hurt, shadow: o.shadow };
    if (!dollDraw(canvas, look, o.view)) doll.waiting.set(canvas, function () { drawHeroOn(canvas, o); });
    return;
  }
  if (doll.state === 'loading') {
    doll.waiting.set(canvas, function () { drawHeroOn(canvas, o); });
    return;
  }
  drawHeroV0(canvas, o);
}
// v0: the pixel hero on a 48 x 36 canvas, shown scaled up (it knows only its own first items)
function drawHeroV0(canvas, o) {
  canvas.classList.add('pixel');
  canvas.classList.remove('doll');
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
  drawAvatar(ctx, o.title, {}, o.pose || 'stand', o.frame || 0, o.qi, o.gender || state.gender);
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
    // a new rank puts on its new outfit
    purse.gear.outfit = '';
    save();
    queueCelebration(2600, function () {
      let sub = '晉升「' + titleName(titleAfter, state.gender) + '」';
      if (realmOf(titleAfter) !== realmOf(titleBefore)) sub += '　踏入「' + realmOf(titleAfter) + '」';
      celebrate([titleCanvas(titleAfter)], sub);
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
  document.getElementById('rankTag').textContent = titleName(titleIndexFor(info.level), state.gender);
  document.getElementById('lvTag').textContent = 'Lv ' + info.level;
  document.getElementById('xpBar').style.width = (info.level >= MAX_LEVEL ? 100 : Math.round(100 * info.into / info.need)) + '%';
  renderCounters();
}

// ---------- 我的俠客: avatar, titles so far, shop ----------
// an item stays a shadow named ？？？ until the title is high enough and its price is within reach
function itemKnown(it, owned, tIdx) {
  if (owned) return true;
  if (it.shop === false) return false;
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
  document.getElementById('heroRank').textContent = titleName(tIdx, state.gender);
  const realm = document.getElementById('heroRealm');
  realm.textContent = realmOf(tIdx);
  realm.className = 'realm r' + Math.floor(tIdx / 4);
  document.getElementById('fameLabel').setAttribute('aria-label', '名望，' + realmOf(tIdx));
  const worn = outfitIndex();
  document.getElementById('outfitText').textContent = titleName(worn, state.gender);
  markOutfitEnds();
  document.getElementById('heroLv').textContent = 'Lv ' + info.level;
  document.getElementById('heroXp').style.width = (info.level >= MAX_LEVEL ? 100 : Math.round(100 * info.into / info.need)) + '%';
  document.getElementById('heroTaels').textContent = purse.taels;
  document.getElementById('heroIngots').textContent = purse.ingots;
  drawHeroOn(document.getElementById('heroAvatar'), { title: worn, gear: purse.gear, qi: qiColor() });

  const tabs = document.getElementById('shopTabs');
  tabs.innerHTML = '';
  for (const slot of HERO_TABS) {
    const t = document.createElement('button');
    t.type = 'button';
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', slot.id === shopSlot ? 'true' : 'false');
    t.innerHTML = '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">' + (TAB_ICONS[slot.id] || '') + '</svg>' + slot.name;
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
    drawItemIcon(c, it, known ? '' : '#2b2233');
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

// ---------- 錢莊: one 元寶 for 100 兩, both ways ----------
const INGOT_TAELS = 100;
function renderBank() {
  document.getElementById('bankTaels').textContent = purse.taels;
  document.getElementById('bankIngots').textContent = purse.ingots;
  document.getElementById('bankSell').disabled = purse.ingots < 1;
  document.getElementById('bankBuy').disabled = purse.taels < INGOT_TAELS;
}
function bankDelta(id, text) {
  const el = document.getElementById(id);
  el.textContent = text;
  restartAnimation(el, 'pop');
}
function exchange(ingots) {
  purse.ingots += ingots;
  purse.taels -= ingots * INGOT_TAELS;
  shown.taels = purse.taels;
  shown.ingots = purse.ingots;
  save();
  renderPurse();
  renderHero();
  renderBank();
  bankDelta('bankIngotsDelta', (ingots > 0 ? '+' : '−') + Math.abs(ingots));
  bankDelta('bankTaelsDelta', (ingots > 0 ? '−' : '+') + Math.abs(ingots) * INGOT_TAELS);
  sfxTick(ingots > 0 ? 2093 : 1568);
}
document.getElementById('bankBtn').addEventListener('click', function () {
  for (const id of ['bankTaelsDelta', 'bankIngotsDelta']) {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('pop');
  }
  renderBank();
  openSheet(document.getElementById('bankSheet'));
});
document.getElementById('bankSell').addEventListener('click', function () {
  if (purse.ingots >= 1) exchange(-1);
});
document.getElementById('bankBuy').addEventListener('click', function () {
  if (purse.taels >= INGOT_TAELS) exchange(1);
});

// the zoomed item card: a big picture, the name with 注音 (read aloud), and buy or wear
// 賣回: nine tenths of the price, in 兩 (a 元寶 counts 100); a thing met by chance has no price and is kept
function sellValue(it) {
  const price = it.ingots ? it.ingots * INGOT_TAELS : (it.taels || 0);
  return Math.floor(price * 0.9);
}
function sellItem(it) {
  const value = sellValue(it);
  const at = purse.owned.indexOf(it.id);
  if (at < 0 || value <= 0) return;
  purse.owned.splice(at, 1);
  for (const place in purse.gear) {
    if (purse.gear[place] === it.id) purse.gear[place] = '';
  }
  purse.taels += value;
  shown.taels = purse.taels;
  save();
  renderPurse();
  renderHero();
  sfxTick(2093);
  toast('賣出「' + it.name + '」，得到 ' + value + ' 兩');
}
let itemShown = null;
function sayItemShown() {
  if (itemShown && state.sound) say(itemShown.name);
}
document.getElementById('itemTitle').addEventListener('click', sayItemShown);
document.getElementById('itemBig').addEventListener('click', sayItemShown);
function openItem(it) {
  const tIdx = titleIndex();
  itemShown = null;
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
      // 賣回 asks once more: a second tap within three seconds sells
      const value = sellValue(it);
      if (value > 0) {
        const sell = document.createElement('button');
        sell.type = 'button';
        sell.className = 'sell-btn';
        sell.setAttribute('data-quiet', '');
        sell.innerHTML = '賣回　' + syceeHtml('silver') + value + ' 兩';
        let armed = 0;
        sell.addEventListener('click', function () {
          if (!armed) {
            sell.classList.add('armed');
            sell.textContent = '確定賣掉？再按一次';
            if (state.sound) say('確定要賣掉嗎？再按一次');
            armed = setTimeout(function () {
              armed = 0;
              sell.classList.remove('armed');
              sell.innerHTML = '賣回　' + syceeHtml('silver') + value + ' 兩';
            }, 3000);
            return;
          }
          clearTimeout(armed);
          if (state.sound) say('賣出' + it.name + '，得到' + value + '兩');
          sellItem(it);
          closeSheet(sheet);
        });
        actions.append(sell);
      }
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary';
      const canBuy = it.ingots ? purse.ingots >= it.ingots : purse.taels >= it.taels;
      btn.innerHTML = '買　' + (it.ingots ? syceeHtml('gold') + it.ingots + ' 元寶' : syceeHtml('silver') + it.taels + ' 兩');
      btn.disabled = !canBuy;
      if (!canBuy) note.textContent = '銀兩不夠喔，多練幾個字再來買。';
      btn.addEventListener('click', function () {
        buy(it);
        closeSheet(sheet);
      });
      actions.append(btn);
    }
  } else {
    title.innerHTML = '<span class="mystery">？？？</span>';
    if (it.shop === false) note.textContent = '這件寶貝買不到，要靠奇遇才遇得到。';
    else note.textContent = tIdx < it.minTitle ? '名望再高一點，就能看清楚這是什麼。' : '再多存一些銀兩，就能看清楚這是什麼。';
  }

  openSheet(sheet);
  const big = document.getElementById('itemBig');
  drawItemIcon(big, it, known ? '' : '#2b2233');
  if (known) itemShown = it;
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
// sprite hero: attack = 普攻 (attack1), cheer = 招式 (attack2), hurt = standing, shaken; then idle again
const avatar = { canvases: [], queue: [], idle: 0, frame: 0, last: 0, action: 'idle', since: 0, until: 0 };
const DOLL_ACTIONS = { attack: 'attack1', cheer: 'attack2', hurt: 'hurt' };
const HURT_MS = 420;
function avatarPlay(name) {
  avatar.queue = ACTIONS[name].slice();
  avatar.action = DOLL_ACTIONS[name] || 'idle';
  avatar.since = performance.now();
  const look = { title: outfitIndex(), gear: purse.gear };
  avatar.until = avatar.since + (avatar.action === 'hurt' ? HURT_MS : dollActionLength(look, avatar.action));
  if (reducedMotion()) avatarRender(performance.now());
}
function avatarRender(now) {
  if (doll.state === 'ready') {
    if (avatar.action !== 'idle' && now >= avatar.until) {
      avatar.action = 'idle';
      avatar.since = now;
    }
    const hurt = avatar.action === 'hurt';
    const look = { title: outfitIndex(), gear: purse.gear, action: hurt ? 'idle' : avatar.action, t: now - avatar.since, hurt: hurt };
    // the card: the hero standing at ease, idle, the weapon put away
    const bare = Object.assign({}, look.gear, { weapon: '' });
    drawHeroOn(avatar.canvases[0], { view: 'bust', title: look.title, gear: bare, t: now });
    if (avatar.canvases[1].offsetParent !== null) {
      drawHeroOn(avatar.canvases[1], Object.assign({ view: 'stage', shadow: true }, look));
    }
    return;
  }
  let pose;
  if (avatar.queue.length) {
    pose = avatar.queue.shift();
  } else {
    pose = IDLE_SEQ[avatar.idle % IDLE_SEQ.length];
    avatar.idle += 1;
  }
  avatar.frame += 1;
  const look = { title: outfitIndex(), gear: purse.gear, pose: pose, frame: avatar.frame, qi: qiColor() };
  drawHeroOn(avatar.canvases[0], look);
  // the landscape stage: no floor, just a soft shadow under the feet
  drawHeroOn(avatar.canvases[1], Object.assign({ floor: false, shadow: true }, look));
}
// the pixel hero steps like a sprite, faster during an action
function avatarTick(now) {
  let wait = avatar.queue.length ? 95 : 170;
  if (doll.state === 'ready') wait = 80;
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
  glyphData[state.chars[state.idx]] = data;
  renderZhuyin(zyEl, readingAt(state.idx));

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
      if (state.sound) sayCharAt(i);
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
  renderSentence();
  resultEl.hidden = true;
  hideNextHint();
  brush.live = false;
  hideSeal();
  writerEl.classList.remove('ink');
  mineEl.classList.remove('ink');
  mineEl.innerHTML = '';
  mineEl.style.transform = '';
  if (!ch) return;
  // a character not traced yet is traced first
  if (state.mode === 'write' && !canWrite()) state.mode = 'trace';
  renderModes();

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
  fitReset(state.mode === 'write');

  const quizWriter = writer;
  const quizStarted = writer.quiz({
    leniency: state.lenient ? 1.5 : 1.0,
    showHintAfterMisses: hintAfter,
    markStrokeCorrectAfterMisses: 4,
    highlightOnComplete: false,
    onCorrectStroke: function (d) {
      // where she really drew it; a stroke let through after many misses tells nothing about her placement
      const drawn = fit.drawn || d.drawnPath.points;
      if (fit.on && d.mistakesOnStroke < 3) fitAdd(drawn, charData.medians[d.strokeNum]);
      if (keepMode()) {
        addMine();
        swordQi(drawn, qiColor());
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
  // the quiz exists once the character is laid out: the fit goes in when it has begun
  fitWriter(quizWriter);
  if (quizStarted && quizStarted.then) quizStarted.then(function () { fitWriter(quizWriter); });
}

// ---------- 自己寫: judged where the child put her own character ----------
// Hanzi Writer compares each stroke with the model stroke at the model's place. A child who writes the
// character a little small, large or off to one side gets later strokes refused although they sit right in her
// own character (給: the dots of 糸 under her 幺). So in 自己寫, from the strokes accepted so far we estimate how
// her character sits against the model, user = s * model + t on each axis (least squares over matched points,
// pulled towards no change while there is little to go on). A stroke is judged as drawn first; only if Hanzi
// Writer refuses it is it judged again mapped back into the model's frame, so the fit can only help. Shape,
// direction and order are still checked by Hanzi Writer as before. 對照字帖 uses the same fit to lay her
// strokes over the model.
const FIT_POINTS = 12;
const FIT_PULL = 800;
const FIT_MIN_SPREAD = 70;
const FIT_SCALE = [0.65, 1.35];
const FIT_SHIFT = 256;
const fit = { on: false, sx: 1, sy: 1, tx: 0, ty: 0, model: [], user: [], drawn: null };
function fitReset(on) {
  fit.on = on;
  fit.sx = 1;
  fit.sy = 1;
  fit.tx = 0;
  fit.ty = 0;
  fit.model = [];
  fit.user = [];
  fit.drawn = null;
}
function fitToModel(p) {
  return { x: (p.x - fit.tx) / fit.sx, y: (p.y - fit.ty) / fit.sy };
}
function fitFromModel(p) {
  return { x: fit.sx * p.x + fit.tx, y: fit.sy * p.y + fit.ty };
}
// n points evenly spaced along a polyline of {x, y}
function resample(points, n) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths[lengths.length - 1];
  const out = [];
  let k = 1;
  for (let i = 0; i < n; i++) {
    const at = total * i / (n - 1);
    while (k < points.length - 1 && lengths[k] < at) k += 1;
    const span = lengths[k] - lengths[k - 1] || 1;
    const r = Math.min(1, Math.max(0, (at - lengths[k - 1]) / span));
    out.push({
      x: points[k - 1].x + (points[k].x - points[k - 1].x) * r,
      y: points[k - 1].y + (points[k].y - points[k - 1].y) * r,
    });
  }
  return out;
}
// one axis: the scale and shift that best carry the model values onto the user's, pulled towards 1 and 0
function fitAxis(model, user) {
  const n = model.length;
  let mm = 0;
  let mu = 0;
  for (let i = 0; i < n; i++) {
    mm += model[i];
    mu += user[i];
  }
  mm /= n;
  mu /= n;
  let varM = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    varM += (model[i] - mm) * (model[i] - mm);
    cov += (model[i] - mm) * (user[i] - mu);
  }
  let scale = 1;
  // a scale only once the strokes so far reach across this axis
  if (Math.sqrt(varM / n) >= FIT_MIN_SPREAD) scale = (cov + FIT_PULL * n) / (varM + FIT_PULL * n);
  scale = Math.min(FIT_SCALE[1], Math.max(FIT_SCALE[0], scale));
  const shift = Math.min(FIT_SHIFT, Math.max(-FIT_SHIFT, mu - scale * mm));
  return { scale: scale, shift: shift };
}
// an accepted stroke: where she drew it (character coordinates, before mapping) and the model's median
function fitAdd(drawn, median) {
  const model = [];
  for (const p of median) model.push({ x: p[0], y: p[1] });
  const u = resample(drawn, FIT_POINTS);
  const m = resample(model, FIT_POINTS);
  for (let i = 0; i < FIT_POINTS; i++) {
    fit.user.push(u[i]);
    fit.model.push(m[i]);
  }
  const xs = fitAxis(fit.model.map(function (p) { return p.x; }), fit.user.map(function (p) { return p.x; }));
  const ys = fitAxis(fit.model.map(function (p) { return p.y; }), fit.user.map(function (p) { return p.y; }));
  fit.sx = xs.scale;
  fit.tx = xs.shift;
  fit.sy = ys.scale;
  fit.ty = ys.shift;
}
// as a stroke ends: judged as drawn, quietly; if refused, judged again (for real) mapped back through the fit
function fitWriter(w) {
  const quiz = w._quiz;
  if (!quiz || quiz.fitted) return;
  const end = quiz.endUserStroke.bind(quiz);
  quiz.endUserStroke = function () {
    const stroke = quiz._userStroke;
    fit.drawn = stroke && stroke.points.length > 1 ? stroke.points.slice() : null;
    if (!fit.on || !fit.drawn || !fit.model.length) return end();
    // the first look: a refusal is not yet a mistake, shows no hint and is not let through
    const failure = quiz._handleFailure;
    const opts = quiz._options;
    const hint = opts.showHintAfterMisses;
    const force = opts.markStrokeCorrectAfterMisses;
    let refused = false;
    quiz._handleFailure = function () { refused = true; };
    opts.showHintAfterMisses = false;
    opts.markStrokeCorrectAfterMisses = false;
    end();
    quiz._handleFailure = failure;
    opts.showHintAfterMisses = hint;
    opts.markStrokeCorrectAfterMisses = force;
    if (!refused) return;
    stroke.points = fit.drawn.map(fitToModel);
    quiz._userStroke = stroke;
    return end();
  };
  quiz.fitted = true;
}
// 對照字帖: her kept strokes (screen pixels of the box) moved and scaled onto the model, by the fit
function fitScreenMatrix() {
  const pad = boxPadding(builtSize);
  const k = (builtSize - 2 * pad) / 1024;
  const c0 = builtSize - pad - 124 * k;
  const ex = pad * (1 - 1 / fit.sx) - k * fit.tx / fit.sx;
  const ey = c0 * (1 - 1 / fit.sy) + k * fit.ty / fit.sy;
  return 'matrix(' + (1 / fit.sx) + ', 0, 0, ' + (1 / fit.sy) + ', ' + ex + ', ' + ey + ')';
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
  // every stroke shown: the next character or 描一描 is on its way
  if (stepNum > 0 && stepNum >= strokeCount[currentChar()] && !watchStep.busy) return;
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
        return;
      }
      if (state.mode === 'watch' && stepNum >= total) afterSteppedThrough(myWriter);
    },
  });
}
// every stroke tapped through: the next character, and after the last one 描一描 from the first
function afterSteppedThrough(myWriter) {
  setTimeout(function () {
    if (writer !== myWriter || state.mode !== 'watch' || watchStep.busy) return;
    if (state.idx < state.chars.length - 1) {
      state.idx += 1;
      renderChips();
      build();
      return;
    }
    state.idx = 0;
    if (state.sound) say('描一描');
    setMode('trace');
  }, 700);
}
box.addEventListener('pointerdown', stepStroke);

// ---------- brush ----------
// The child's stroke drawn like a brush: wide where the finger moves slowly or an Apple Pencil
// presses hard, narrow where it moves fast. The start presses down (頓筆); a quick lift tapers
// the end to a point (出鋒). The shape is a chain of circles joined by trapezoids, one SVG path.
const brushEl = document.getElementById('brush');
const brush = { live: false, id: null, points: [], color: '', rect: null, raf: 0 };

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
  const rect = brush.rect || box.getBoundingClientRect();
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
  brush.rect = box.getBoundingClientRect();
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
  // a pencil reports far more often than the screen shows: draw once per frame
  if (!brush.raf) {
    brush.raf = requestAnimationFrame(function () {
      brush.raf = 0;
      if (brush.id !== null) drawBrush(false);
    });
  }
});
function endBrush(e) {
  if (e.pointerId !== brush.id) return;
  brush.id = null;
  brush.rect = null;
  cancelAnimationFrame(brush.raf);
  brush.raf = 0;
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
  renderModes();

  const reward = award(grade, mistakes);
  // written alone: the character goes into the 字訣本
  if (state.mode === 'write' && purse.scrolls.indexOf(ch) < 0) {
    purse.scrolls.unshift(ch);
    toast('習得「' + ch + '」字訣');
  }
  checkHonors(mistakes);
  checkEncounter();
  // a character traced or written counts the word as practiced
  if (!state.sentence) {
    const at = state.recent.indexOf(state.text);
    if (at >= 0) state.recent.splice(at, 1);
    state.recent.unshift(state.text);
    state.recent = state.recent.slice(0, RECENT_MAX);
  }
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
  if (state.sentence) {
    justInked = state.idx;
    renderSentence();
  }
  let allDone = true;
  state.chars.forEach(function (c, i) {
    if (!sessionDone.has(i) && strokeCount[c] !== 0) allDone = false;
  });
  if (allDone) {
    sessionDone.clear();
    if (state.mode === 'write' && state.chars.length > 1 && !state.sentence && purse.words.indexOf(state.text) < 0) {
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
      if (!state.sound) return;
      if (state.sentence) saySentence(state.sentence);
      else say(state.text);
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
      if (myToken === buildToken && state.sound) sayCharAt(state.idx);
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
  let label = state.sentence ? '下一句' : '下一個詞';
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
// 自己寫 opens for a character once it has been traced (or written before): rewards come with writing alone,
// and a child should not skip 描一描 to get them
function canWrite() {
  const marks = state.stars[currentChar()] || {};
  return Boolean(marks.trace || marks.write);
}
function renderModes() {
  document.querySelectorAll('#modes button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false');
    if (b.dataset.mode === 'write') {
      b.classList.toggle('locked', !canWrite());
      b.setAttribute('aria-disabled', canWrite() ? 'false' : 'true');
    }
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
    if (b.dataset.mode === 'write' && !canWrite()) {
      sfxWood();
      restartAnimation(b, 'nudge');
      toast('先描一描這個字，才能自己寫');
      if (state.sound) say('先描一描，再自己寫');
      return;
    }
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
  if (label && text.length === 1) text = label.textContent.trim() + ' ' + text;
  say(text);
});

// iOS Safari applies :active only when the page listens for touches
document.addEventListener('touchstart', function () {}, { passive: true });

document.getElementById('restartBtn').addEventListener('click', function () { build(); });
document.getElementById('againBtn').addEventListener('click', function () { build(); });
document.getElementById('sayBtn').addEventListener('click', function () {
  if (currentChar()) sayCharAt(state.idx);
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
  // her strokes glide onto the model by the fit of this character (none in 描一描: they are drawn on it)
  mineEl.style.transform = on && fit.model.length ? fitScreenMatrix() : '';
});
document.getElementById('nextBtn').addEventListener('click', function (e) {
  const action = e.currentTarget.dataset.action;
  if (action === 'next') {
    state.idx += 1;
    renderChips();
    build();
    if (state.sound) sayCharAt(state.idx);
  } else if (action === 'to-write') {
    state.idx = 0;
    setMode('write');
    if (state.sound) sayCharAt(state.idx);
  } else {
    nextWord(true);
  }
});
// 擲骰換題: an ivory Chinese die, its one and four pips in red; it tumbles and lands on a new face
const diceBtn = document.getElementById('diceBtn');
const DIE_PIPS = {
  1: [[30, 30]],
  2: [[19, 19], [41, 41]],
  3: [[18, 18], [30, 30], [42, 42]],
  4: [[19, 19], [41, 19], [19, 41], [41, 41]],
  5: [[18, 18], [42, 18], [30, 30], [18, 42], [42, 42]],
  6: [[19, 16], [41, 16], [19, 30], [41, 30], [19, 44], [41, 44]],
};
function drawDie(n) {
  const red = n === 1 || n === 4;
  let pips = '';
  for (const p of DIE_PIPS[n]) {
    pips += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (n === 1 ? 8 : 5) + '" fill="' + (red ? '#c8352a' : '#2b2522') + '"></circle>';
  }
  diceBtn.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true">' +
    '<defs><linearGradient id="dieFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"></stop><stop offset="1" stop-color="#e6d8bd"></stop></linearGradient></defs>' +
    '<rect x="3" y="3" width="54" height="54" rx="13" fill="url(#dieFace)" stroke="#7a5638" stroke-width="3"></rect>' +
    '<path d="M12 9 h36" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7"></path>' + pips + '</svg>';
}
drawDie(4);
diceBtn.addEventListener('click', function () {
  restartAnimation(diceBtn, 'rolling');
  setTimeout(function () { drawDie(1 + Math.floor(Math.random() * 6)); }, 260);
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
    if (sheet.classList.contains('gate')) return;
    if (e.target === sheet || e.target.closest('[data-close]')) closeSheet(sheet);
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.sheet:not(.gate)').forEach(function (sheet) { closeSheet(sheet); });
});

document.getElementById('playerCard').addEventListener('click', function () {
  shopSlot = 'weapon';
  renderHero();
  openSheet(document.getElementById('heroSheet'));
});
document.getElementById('settingsBtn').addEventListener('click', function () {
  openSheet(document.getElementById('settingsSheet'));
});

function renderRecent() {
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  list.parentElement.hidden = state.recent.length === 0;
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
document.getElementById('saveSentencesBtn').addEventListener('click', function () {
  const lines = [];
  for (const line of document.getElementById('sentenceInput').value.split('\n')) {
    if (parseMySentence(line).k.length) lines.push(line.trim());
  }
  if (!lines.length) {
    toast('請輸入中文句子');
    return;
  }
  state.slist = lines;
  state.content = 'mysentences';
  renderOptions();
  renderSentenceCount();
  save();
  toast('句子本：' + lines.length + ' 句');
  closeSheet(document.getElementById('customSheet'));
  nextWord(true);
});
function renderSentenceCount() {
  document.getElementById('sentenceCount').textContent = state.slist.length ? '目前 ' + state.slist.length + ' 句' : '';
}
// 自己出題: 出一題 (a few characters now, and 我的名字), 生字本, 句子本
function showCustomPane(id) {
  document.querySelectorAll('#customTabs button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.pane === id ? 'true' : 'false');
  });
  for (const pane of ['onePane', 'listPane', 'mySentPane']) {
    document.getElementById(pane).hidden = id !== pane;
  }
}
document.querySelectorAll('#customTabs button').forEach(function (b) {
  b.addEventListener('click', function () { showCustomPane(b.dataset.pane); });
});
// 我的名字 is the child's real name to practise writing; the 江湖 name of the hero is separate
function renderMyName() {
  const has = Boolean(state.myName);
  document.getElementById('myNameText').textContent = has ? state.myName : '還沒寫';
  document.getElementById('myNameText').classList.toggle('quiet', !has);
  document.getElementById('useNameBtn').hidden = !has;
  document.getElementById('editNameBtn').textContent = has ? '改名字' : '寫上名字';
  document.getElementById('nameEdit').hidden = true;
}
document.getElementById('customBtn').addEventListener('click', function () {
  document.getElementById('listInput').value = state.list.join(' ');
  document.getElementById('sentenceInput').value = state.slist.join('\n');
  document.getElementById('customInput').value = '';
  renderSentenceCount();
  renderListCount();
  renderMyName();
  renderRecent();
  let pane = 'onePane';
  if (state.content === 'list') pane = 'listPane';
  else if (state.content === 'mysentences') pane = 'mySentPane';
  showCustomPane(pane);
  openSheet(document.getElementById('customSheet'));
});
document.getElementById('customForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (document.activeElement && document.activeElement.id === 'nameInput') {
    saveMyName();
    return;
  }
  const text = document.getElementById('customInput').value;
  if (parseText(text).length === 0) {
    toast('請輸入中文字');
    return;
  }
  loadText(text, true);
  closeSheet(document.getElementById('customSheet'));
});
document.getElementById('useNameBtn').addEventListener('click', function () {
  loadText(state.myName, true);
  closeSheet(document.getElementById('customSheet'));
});
document.getElementById('editNameBtn').addEventListener('click', function () {
  const input = document.getElementById('nameInput');
  document.getElementById('nameEdit').hidden = false;
  input.value = state.myName;
  input.focus();
});
function saveMyName() {
  const chars = parseText(document.getElementById('nameInput').value);
  if (chars.length === 0) {
    toast('先寫上名字');
    return;
  }
  state.myName = chars.join('');
  save();
  renderMyName();
  toast('記住了：' + state.myName);
}
document.getElementById('saveNameBtn').addEventListener('click', saveMyName);

function showProfilePane(id) {
  document.querySelectorAll('#profileTabs button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.pane === id ? 'true' : 'false');
  });
  for (const pane of ['rosterPane', 'accountPane', 'newsPane']) {
    document.getElementById(pane).hidden = id !== pane;
  }
  if (id === 'rosterPane') renderGate();
  else clearInterval(gate.timer);
  if (id === 'newsPane') renderNews();
}
document.querySelectorAll('#profileTabs button').forEach(function (b) {
  b.addEventListener('click', function () { showProfilePane(b.dataset.pane); });
});
document.getElementById('profileBtn').addEventListener('click', function () {
  showProfilePane('rosterPane');
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
document.getElementById('profileForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const fromGate = profileSheet.classList.contains('gate');
  if (fromGate) unlockSound();
  await login(document.getElementById('aliasInput').value, document.getElementById('passInput').value);
  if (fromGate && profileSheet.hidden) {
    leaveGate();
    if (state.music !== 'off') playMusic(state.music);
    announceEntry();
  }
});
document.getElementById('logoutBtn').addEventListener('click', function () {
  switchTo('', '', loadLocalProfile(''));
  closeSheet(document.getElementById('profileSheet'));
  toast('改當路人甲');
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
// 語音: a voice this device does not have is greyed out; if the chosen one is missing, the note says which speaks
function renderVoices() {
  document.querySelectorAll('.opt-row[data-opt="voice"] button').forEach(function (b) {
    b.disabled = !voiceFor(b.dataset.val);
  });
  // what this device offers, in small letters: when a voice is missing, this says what the browser gives
  const names = [];
  if ('speechSynthesis' in window) {
    for (const v of chineseVoices()) names.push(v.name);
  }
  document.getElementById('voiceList').textContent = '這台裝置的中文語音：' + (names.length ? names.join('、') : '（沒有）');
  const note = document.getElementById('voiceNote');
  const used = speakingVoice();
  if (!used) {
    note.hidden = false;
    note.textContent = '這台裝置找不到中文語音。';
    return;
  }
  if (voiceFor(state.voice)) {
    note.hidden = true;
    return;
  }
  note.hidden = false;
  note.textContent = '這台裝置沒有「' + VOICE_CHOICES[state.voice].name + '」，先用「' + used.name + '」。在 iPad 的「設定 → 輔助使用 → 朗讀內容 → 聲音 → 中文（台灣）」可以下載。';
}
if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', renderVoices);
// 播放方式 switch: 單曲重複 or 依序輪播 (looked up here, not in constants: the first render runs before this point)
function loopName(mode) {
  return mode === 'all' ? '依序輪播' : '單曲重複';
}
function renderLoopSwitch() {
  const sw = document.getElementById('loopSwitch');
  sw.setAttribute('aria-checked', state.musicLoop === 'all' ? 'true' : 'false');
  sw.setAttribute('aria-label', loopName(state.musicLoop));
  sw.title = loopName(state.musicLoop);
}
document.getElementById('loopSwitch').addEventListener('click', function () {
  state.musicLoop = state.musicLoop === 'all' ? 'one' : 'all';
  if (music.el) music.el.loop = state.musicLoop !== 'all';
  renderLoopSwitch();
  save();
  sfxClack();
  say(loopName(state.musicLoop));
});
function renderOptions() {
  renderLoopSwitch();
  applyTheme();
  volumeRange.value = Math.round(state.volume * 100);
  setVolume(state.volume);
  box.classList.toggle('mi', state.grid === 'mi');
  box.classList.toggle('jiu', state.grid === 'jiu');
  keepBtn.setAttribute('aria-pressed', state.keep ? 'true' : 'false');
  document.querySelectorAll('.opt-row[data-opt]').forEach(function (row) {
    const opt = row.dataset.opt;
    let current;
    if (['grid', 'theme', 'content', 'music', 'gender', 'voice'].indexOf(opt) >= 0) current = state[opt];
    else current = state[opt] ? '1' : '0';
    row.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.val === current ? 'true' : 'false');
    });
  });
  renderVoices();
}
document.querySelectorAll('.opt-row[data-opt]').forEach(function (row) {
  row.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b || b.classList.contains('loop-switch')) return;
    const opt = row.dataset.opt;
    if (opt === 'content') {
      if (b.dataset.val === 'list' && state.list.length === 0) {
        toast('先在「自己出題」存一份生字本');
        return;
      }
      if (b.dataset.val === 'mysentences' && state.slist.length === 0) {
        toast('先在「自己出題」寫幾句我的句子本');
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
    if (opt === 'voice') {
      state.voice = b.dataset.val;
      renderOptions();
      save();
      say('你好，我是' + VOICE_CHOICES[state.voice].name.replace('（加強）', ''));
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
document.documentElement.style.setProperty('--paper-tex', 'url(' + paperTexture() + ')');
inkSeal(sealEl);


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
  const sentencesReady = fetch('data/sentences.json').then(function (r) { return r.json(); }).then(function (list) {
    sentences = list;
  }, function () {});
  fetch('data/homophones.json').then(function (r) { return r.json(); }).then(function (table) {
    homophones = table;
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
  await sentencesReady;
  if (!state.chars.length) startText();
})();

// what a 俠客 looks like, from experience, worn gear and gender
function lookFor(xp, gear, gender) {
  const level = levelInfo(xp || 0).level;
  return { title: titleIndexFor(level), outfit: outfitFor(xp, gear), level: level, gear: newGear(gear), gender: gender || 'boy' };
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
  clearInterval(gate.timer);
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
    rank.textContent = titleName(look.title, look.gender) + ' Lv ' + look.level;
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
    drawHeroOn(s.canvas, { view: 'full', title: s.look.outfit, gear: s.look.gear, gender: s.look.gender, pose: pose, frame: gate.frame, t: performance.now() + s.phase * 230 });
  }
}
function enterGame(alias) {
  leaveGate();
  audioContext();
  if (alias !== account.alias) enterAs(alias);
  rememberHero(alias);
  if (state.music !== 'off') playMusic(state.music);
  announceEntry();
}
// entering the 擂台: first the hero's name and 名望 (a guest is 訪客), then two drum strokes, then the
// first word or sentence; anything said in between (a tapped button) cancels the rest
function announceEntry() {
  if (!state.sound) return;
  const who = account.alias ? account.alias + '，' + titleName(titleIndex(), state.gender) : '訪客';
  say(who, '', function () {
    const token = sayToken;
    sfxDrum();
    setTimeout(function () {
      if (token !== sayToken) return;
      if (state.sentence) saySentence(state.sentence);
      else if (state.text || state.myName) say(state.text || state.myName);
    }, 1100);
  });
}
// at start the 俠客帳號 sheet opens on its 客棧 tab (the 俠客 of this device) and stays until someone is chosen, a guest included;
// rise: after the opening gong, the sheet comes up from below like a page turned up
const profileSheet = document.getElementById('profileSheet');
function openGate(rise) {
  profileSheet.classList.add('gate');
  profileSheet.classList.toggle('rising', Boolean(rise));
  showProfilePane('rosterPane');
  openSheet(profileSheet);
}
function leaveGate() {
  clearInterval(gate.timer);
  profileSheet.classList.remove('gate', 'rising');
  closeSheet(profileSheet);
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

// 開場: strike the gong (the first tap also lets the page make sound), then the 客棧 turns up
const opening = document.getElementById('opening');
const gongBtn = document.getElementById('gongBtn');
gongBtn.addEventListener('click', function () {
  if (gongBtn.disabled) return;
  gongBtn.disabled = true;
  audioContext();
  if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  sfxGong(1.1);
  restartAnimation(gongBtn, 'struck');
  const wait = reducedMotion() ? 200 : 900;
  setTimeout(function () {
    opening.classList.add('leaving');
    sfxPage();
    openGate(true);
  }, wait);
  setTimeout(function () { opening.hidden = true; }, wait + 500);
});

// 裝束: the arrows step through the 名望 outfits reached so far, from the first to the current one
function markOutfitEnds() {
  const worn = outfitIndex();
  document.getElementById('outfitPrev').classList.toggle('end', worn === 0);
  document.getElementById('outfitNext').classList.toggle('end', worn === titleIndex());
}
function stepOutfit(d) {
  const rank = titleIndex();
  const next = outfitIndex() + d;
  const text = document.getElementById('outfitText');
  if (next < 0 || next > rank) {
    // no more this way: a dull knock, and the name pushes against the edge and springs back
    sfxWood();
    text.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(' + (d * 14) + 'px)' },
      { transform: 'translateX(' + (-d * 4) + 'px)' },
      { transform: 'translateX(0)' },
    ], { duration: 280, easing: 'ease-out' });
    return;
  }
  purse.gear.outfit = next === rank ? '' : next;
  save();
  sfxTick(1175);
  drawHeroOn(document.getElementById('heroAvatar'), { title: next, gear: purse.gear, qi: qiColor() });
  avatarRender(performance.now());
  markOutfitEnds();
  // the old name slides out one way, the new one comes in from the other side
  const out = text.animate([
    { transform: 'translateX(0)', opacity: 1 },
    { transform: 'translateX(' + (-d * 120) + '%)', opacity: 0 },
  ], { duration: 150, easing: 'ease-in' });
  out.onfinish = function () {
    text.textContent = titleName(next, state.gender);
    text.animate([
      { transform: 'translateX(' + (d * 120) + '%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ], { duration: 200, easing: 'ease-out' });
  };
  say(titleName(next, state.gender));
}
document.getElementById('outfitPrev').addEventListener('click', function () { stepOutfit(-1); });
document.getElementById('outfitNext').addEventListener('click', function () { stepOutfit(1); });

// ---------- 我的俠客: tap the hero and it moves ----------
const SHEET_ACTIONS = ['attack', 'cheer', 'hurt'];
const sheetHero = { timer: 0, next: 0, raf: 0 };
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
  if (doll.state === 'ready') {
    const look = { title: outfitIndex(), gear: purse.gear };
    const action = DOLL_ACTIONS[name] === 'hurt' ? 'idle' : DOLL_ACTIONS[name];
    const length = name === 'hurt' ? HURT_MS : dollActionLength(look, action);
    const start = performance.now();
    cancelAnimationFrame(sheetHero.raf);
    const step = function (now) {
      const t = now - start;
      if (t >= length) {
        drawHeroOn(canvas, look);
        return;
      }
      drawHeroOn(canvas, Object.assign({ action: action, t: t, hurt: name === 'hurt' }, look));
      sheetHero.raf = requestAnimationFrame(step);
    };
    sheetHero.raf = requestAnimationFrame(step);
    return;
  }
  const queue = ACTIONS[name].slice();
  let frame = 0;
  clearInterval(sheetHero.timer);
  sheetHero.timer = setInterval(function () {
    const pose = queue.length ? queue.shift() : 'stand';
    frame += 1;
    drawHeroOn(canvas, { title: outfitIndex(), gear: purse.gear, pose: pose, frame: frame, qi: qiColor() });
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
  for (const old of body.items || []) {
    const id = newItemId(old);
    if (itemById(id) && purse.owned.indexOf(id) < 0) purse.owned.push(id);
  }
  // from the 管理員: a gender, a 稱號
  if (body.gender === 'boy' || body.gender === 'girl') {
    state.genderLock = body.gender;
    state.gender = body.gender;
  }
  // taken back by the 管理員: a won one by its id, a granted one by its entry, the typed one as custom
  for (const r of body.revoke || []) {
    const v = String(r.v || '');
    if (v === 'custom') {
      purse.customHonor = '';
    } else if (v.indexOf('g:') === 0) {
      const at = purse.granted.indexOf(v.slice(2));
      if (at >= 0) purse.granted.splice(at, 1);
    } else {
      const at = purse.honors.indexOf(v);
      if (at >= 0) purse.honors.splice(at, 1);
    }
    if (purse.honor === v) purse.honor = '';
  }
  const honor = String(body.honor || '').trim();
  const tier = GRANT_TIERS.indexOf(body.honorTier) >= 0 ? body.honorTier : 'gold';
  const entry = tier === 'gold' ? honor : tier + '|' + honor;
  if (honor && purse.granted.indexOf(entry) < 0) {
    purse.granted.push(entry);
    if (!purse.honor) purse.honor = 'g:' + entry;
  }
}
// voice: the 稱號 without its decorations, for reading aloud
function giftText(body, voice) {
  const parts = [];
  if (wholeNumber(body.taels)) parts.push('銀兩 ' + wholeNumber(body.taels));
  if (wholeNumber(body.ingots)) parts.push('元寶 ' + wholeNumber(body.ingots));
  for (const id of body.items || []) {
    const it = itemById(newItemId(id));
    if (it) parts.push(it.name);
  }
  if (body.gender === 'boy') parts.push('變成少俠');
  if (body.gender === 'girl') parts.push('變成女俠');
  if (body.honor) parts.push('稱號' + (voice ? spokenHonor(body.honor) : framedHonor(body.honor)));
  for (const r of body.revoke || []) {
    parts.push('收回稱號' + (voice ? spokenHonor(String(r.name || '')) : framedHonor(String(r.name || ''))));
  }
  return parts.join('、');
}
function showLetters(letters) {
  // 包打聽 runs the letters over
  const herald = '包打聽氣喘吁吁跑來：「有你的 ' + letters.length + ' 封信！」';
  document.getElementById('letterHerald').textContent = herald;
  if (state.sound) say(herald);
  const list = document.getElementById('letterList');
  list.innerHTML = '';
  for (const letter of letters) {
    const body = letter.body || {};
    const card = document.createElement('article');
    card.className = 'letter';
    const paper = document.createElement('div');
    paper.className = 'letter-paper';
    const head = document.createElement('p');
    head.className = 'letter-to';
    head.textContent = '給　' + account.alias;
    paper.append(head);
    if (body.text) {
      const p = document.createElement('p');
      p.className = 'letter-text';
      p.textContent = body.text;
      paper.append(p);
    }
    paper.append(nameSeal(letter.from));
    card.append(paper);
    const gifts = giftText(body);
    if (gifts) card.append(giftSlip(body));
    const read = document.createElement('button');
    read.type = 'button';
    read.textContent = '念給我聽';
    read.addEventListener('click', function () {
      const text = body.text || '';
      const pause = text && !/[。！？!?]$/.test(text) ? '。' : '';
      say(letter.from + ' 說：' + text + (gifts ? pause + '送你' + giftText(body, true) : ''));
    });
    card.append(read);
    list.append(card);
  }
  openSheet(document.getElementById('letterSheet'));
  // the pictures are drawn once the sheet is open and the canvases have a size
  list.querySelectorAll('.gift-slip canvas[data-item]').forEach(function (c) { drawItemIcon(c, itemById(c.dataset.item)); });
  sfxPage();
}
// 隨信送上: the gifts on a red-edged slip under the letter, each as it looks: the 稱號 on its plaque,
// the things and companions as their pictures, the money as 銀兩 and 元寶
function giftSlip(body) {
  const slip = document.createElement('div');
  slip.className = 'gift-slip';
  const title = document.createElement('b');
  title.className = 'gift-slip-title';
  title.textContent = '隨信送上';
  slip.append(title);
  function add(content, caption) {
    const cell = document.createElement('span');
    cell.className = 'gift-slip-item';
    cell.append(content);
    if (caption) {
      const small = document.createElement('small');
      small.textContent = caption;
      cell.append(small);
    }
    slip.append(cell);
  }
  if (body.honor) {
    const tier = GRANT_TIERS.indexOf(body.honorTier) >= 0 ? body.honorTier : 'gold';
    const badge = document.createElement('span');
    badge.className = 'honor ' + tier;
    badge.textContent = framedHonor(body.honor);
    add(badge, '稱號');
  }
  for (const old of body.items || []) {
    const id = newItemId(old);
    const it = itemById(id);
    if (!it) continue;
    const c = document.createElement('canvas');
    c.dataset.item = id;
    add(c, it.name);
  }
  const taels = wholeNumber(body.taels);
  const ingots = wholeNumber(body.ingots);
  if (taels) {
    const m = document.createElement('span');
    m.className = 'gift-slip-money';
    m.innerHTML = syceeHtml('silver') + taels;
    add(m, '銀兩');
  }
  if (ingots) {
    const m = document.createElement('span');
    m.className = 'gift-slip-money';
    m.innerHTML = syceeHtml('gold') + ingots;
    add(m, '元寶');
  }
  if (body.gender === 'boy' || body.gender === 'girl') {
    const g = document.createElement('span');
    g.className = 'gift-slip-word';
    g.textContent = body.gender === 'boy' ? '少俠' : '女俠';
    add(g, '從此是');
  }
  // only 稱號 taken back: no 隨信送上, just their own line
  if (slip.children.length === 1) title.remove();
  const revoked = body.revoke || [];
  if (revoked.length) {
    if (slip.children.length) {
      const br = document.createElement('span');
      br.className = 'gift-slip-break';
      slip.append(br);
    }
    const back = document.createElement('b');
    back.className = 'gift-slip-title';
    back.textContent = '收回';
    slip.append(back);
    for (const r of revoked) {
      const badge = document.createElement('span');
      badge.className = 'honor revoked ' + (r.tier || 'plain');
      badge.textContent = framedHonor(String(r.name || ''));
      add(badge, '');
    }
  }
  return slip;
}
// the sender's name seal: 白文 (red ground, the characters left blank), read top to bottom from the right;
// up to three characters in one column, four to six in two
function nameSeal(name) {
  const chars = Array.from(name).slice(0, 6);
  const seal = document.createElement('span');
  seal.className = 'name-seal';
  seal.style.setProperty('--rows', String(chars.length <= 3 ? chars.length : Math.ceil(chars.length / 2)));
  seal.textContent = chars.join('');
  seal.setAttribute('aria-label', name + ' 的印章');
  inkSeal(seal);
  return seal;
}
// 包打聽 on when a 俠客 was last seen in the 江湖
function lastSeen(iso) {
  const t = Date.parse(iso || '');
  if (!t) return '';
  const minutes = Math.floor((Date.now() - t) / 60000);
  if (minutes < 5) return '剛剛還在';
  if (minutes < 60) return minutes + ' 分鐘前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' 小時前';
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 30) return days + ' 天前';
  const d = new Date(t);
  return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
}

// ---------- 群俠譜: every 俠客, and a letter with gifts to one of them, all through 包打聽 the messenger ----------
async function renderNews() {
  const note = document.getElementById('newsNote');
  const cards = document.getElementById('heroCards');
  document.getElementById('heroDetail').hidden = true;
  cards.hidden = false;
  cards.innerHTML = '';
  if (!cloudEnabled() || !account.alias) {
    note.textContent = '先報到，包打聽才肯幫你打聽。';
    return;
  }
  note.textContent = '包打聽跑去打聽了……';
  let heroes = [];
  try {
    heroes = await rpc('hero_list', { p_alias: account.alias, p_pass: account.pass }) || [];
  } catch (e) {
    note.textContent = e.notFound ? '包打聽還沒開張：請在 Supabase 執行 supabase/letters.sql。' : '包打聽空手而回，晚點再問。';
    return;
  }
  note.textContent = '包打聽說：「江湖上目前有 ' + heroes.length + ' 位俠客。」';
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
    rank.textContent = titleName(look.title, look.gender) + ' Lv ' + look.level;
    const money = document.createElement('span');
    money.innerHTML = moneyHtml(h.taels, h.ingots);
    b.append(c);
    const badge = honorBadge(h.honor, h.customHonor);
    if (badge) b.append(badge);
    b.append(name, rank, money);
    cards.append(b);
    drawHeroOn(c, { title: look.outfit, gear: look.gear, gender: look.gender });
    if (h.alias === account.alias) b.classList.add('me');
    else b.addEventListener('click', function () { openGift(h); });
  }
}

let gift = { to: null, taels: 0, ingots: 0, items: [], gender: '' };
function openGift(h) {
  gift = { to: h, taels: 0, ingots: 0, items: [], gender: '', honorTier: 'gold', revoke: [] };
  const seen = lastSeen(h.updated_at);
  let news = '包打聽說：「' + h.alias + '最近沒什麼消息。」';
  if (h.alias === account.alias) news = '包打聽說：「這不就是你嗎？」';
  else if (seen === '剛剛還在') news = '包打聽說：「' + h.alias + '剛剛還在江湖上走動。」';
  else if (seen) news = '包打聽說：「' + h.alias + '上次露面是' + (/^\d/.test(seen) ? ' ' : '') + seen + '。」';
  document.getElementById('newsNote').textContent = news;
  document.getElementById('heroCards').hidden = true;
  document.getElementById('heroDetail').hidden = false;
  document.getElementById('letterText').value = '';
  document.getElementById('giftNote').textContent = '';
  const look = lookFor(h.xp, h.gear, h.gender);
  drawHeroOn(document.getElementById('giftAvatar'), { title: look.outfit, gear: look.gear, gender: look.gender });
  document.getElementById('giftName').textContent = h.alias;
  document.getElementById('giftRank').textContent = titleName(look.title, look.gender) + ' Lv ' + look.level;
  document.getElementById('giftMoney').innerHTML = moneyHtml(h.taels, h.ingots);
  document.getElementById('giftAdmin').hidden = !account.admin;
  document.getElementById('giftRemove').hidden = !account.admin;
  document.getElementById('giftHonor').value = '';
  renderPlaques();
  if (account.admin) renderRevoke(h);

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
  if (!text && !gift.taels && !gift.ingots && !gift.items.length && !gift.gender && !honor && !gift.revoke.length) {
    note.textContent = '寫幾句話，或選個禮物';
    return;
  }
  const body = { text: text, taels: gift.taels, ingots: gift.ingots, items: gift.items.slice() };
  if (gift.gender) body.gender = gift.gender;
  if (honor) {
    body.honor = honor;
    body.honorTier = gift.honorTier;
  }
  if (gift.revoke.length) body.revoke = gift.revoke.slice();
  note.textContent = '包打聽拿著信跑出去了……';
  try {
    await rpc('letter_send', { p_alias: account.alias, p_pass: account.pass, p_to: gift.to.alias, p_body: body });
  } catch (e) {
    // what the 雲端 refused, in 包打聽's words; a network failure is the only real 迷路
    console.warn('letter_send:', e.message);
    let why = '包打聽半路迷路，信沒送到，等一下再試。';
    if (e.notFound) why = '包打聽還沒開張：請在 Supabase 執行 supabase/heroes.sql。';
    else if (e.tooLong) why = '包打聽說：「信太重了，帶不動！」信最多 200 字，稱號最多 20 字（符號也算）。';
    else if (e.noHero) why = '包打聽說：「江湖上找不到這個人。」';
    else if (e.notAllowed) why = '包打聽說：「賜稱號、改性別，要掌門才行。」';
    else if (e.wrongPass) why = '包打聽說：「你的密碼對不上，先回帳號重新報到。」';
    note.textContent = why;
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
  toast('包打聽拿了信，一溜煙跑去找「' + gift.to.alias + '」了');
  renderNews();
});

// ---------- 稱號 ----------
// the worn 稱號: an earned or granted one in its tier's frame, a typed one as plain words
// a granted entry: 'jade|名字', or a bare name on a gold plaque
function grantedInfo(entry) {
  const bar = entry.indexOf('|');
  if (bar > 0 && GRANT_TIERS.indexOf(entry.slice(0, bar)) >= 0) return { name: entry.slice(bar + 1), tier: entry.slice(0, bar) };
  return { name: entry, tier: 'gold' };
}
// a 稱號 that starts and ends with decorations brings its own frame; the rest are shown in 【】
function framedHonor(name) {
  const chars = Array.from(name);
  if (chars.length > 1 && DECOR_CHARS.has(chars[0]) && DECOR_CHARS.has(chars[chars.length - 1])) return name;
  return '【' + name + '】';
}
// for the voice: the words only (乂 and 卍 are characters too, but not words)
function spokenHonor(name) {
  let out = '';
  for (const ch of Array.from(name)) {
    if (!DECOR_CHARS.has(ch) && /[\p{Script=Han}\p{L}\p{N}]/u.test(ch)) out += ch;
  }
  return out;
}
function honorInfo(value, custom) {
  if (!value) return null;
  if (value === 'custom') return custom ? { name: custom, tier: 'plain' } : null;
  if (value.indexOf('g:') === 0) return grantedInfo(value.slice(2));
  const h = honorById(value);
  return h ? { name: h.name, tier: h.tier } : null;
}
function honorBadge(value, custom) {
  const info = honorInfo(value, custom);
  if (!info) return null;
  const el = document.createElement('span');
  el.className = 'honor ' + info.tier;
  el.textContent = framedHonor(info.name);
  return el;
}
// the decoration buttons under a 稱號 input: 包起來 replaces the frame, 加符號 adds at the cursor
function stripFrame(text) {
  let chars = Array.from(text.trim());
  while (chars.length && DECOR_CHARS.has(chars[0]) && chars[0] !== '一' && chars[0] !== 'o') chars.shift();
  while (chars.length && DECOR_CHARS.has(chars[chars.length - 1]) && chars[chars.length - 1] !== '一' && chars[chars.length - 1] !== 'o') chars.pop();
  return chars.join('');
}
function buildDecor(box, input, onChange) {
  box.innerHTML = '';
  const wrapRow = document.createElement('div');
  wrapRow.className = 'decor-row';
  const wrapLabel = document.createElement('span');
  wrapLabel.className = 'label';
  wrapLabel.textContent = '包起來';
  wrapRow.append(wrapLabel);
  for (const pair of DECOR_PAIRS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-quiet', '');
    b.textContent = pair[0] + '…' + pair[1];
    b.addEventListener('click', function () {
      const core = stripFrame(input.value);
      input.value = pair[0] === '【' ? core : pair[0] + core + pair[1];
      sfxTick(1568);
      onChange();
    });
    wrapRow.append(b);
  }
  const markRow = document.createElement('div');
  markRow.className = 'decor-row';
  const markLabel = document.createElement('span');
  markLabel.className = 'label';
  markLabel.textContent = '加符號';
  markRow.append(markLabel);
  for (const mark of DECOR_MARKS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-quiet', '');
    b.textContent = mark;
    b.addEventListener('click', function () {
      const at = input.selectionStart === null ? input.value.length : input.selectionStart;
      const end = input.selectionEnd === null ? at : input.selectionEnd;
      input.value = input.value.slice(0, at) + mark + input.value.slice(end);
      input.focus();
      input.setSelectionRange(at + mark.length, at + mark.length);
      sfxTick(2093);
      onChange();
    });
    markRow.append(b);
  }
  box.append(wrapRow, markRow);
}
// the plaque buttons for a granted 稱號, each showing the typed name on it
function renderPlaques() {
  const row = document.getElementById('giftPlaques');
  row.querySelectorAll('button').forEach(function (b) { b.remove(); });
  const name = document.getElementById('giftHonor').value.trim() || '稱號';
  for (const tier of GRANT_TIERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'plaque-pick';
    b.setAttribute('aria-pressed', gift.honorTier === tier ? 'true' : 'false');
    b.setAttribute('aria-label', TIER_NAMES[tier]);
    const badge = document.createElement('span');
    badge.className = 'honor ' + tier;
    badge.textContent = framedHonor(name);
    const caption = document.createElement('small');
    caption.textContent = TIER_NAMES[tier];
    b.append(badge, caption);
    b.addEventListener('click', function () {
      gift.honorTier = tier;
      renderPlaques();
    });
    row.append(b);
  }
}
buildDecor(document.getElementById('giftDecor'), document.getElementById('giftHonor'), renderPlaques);
// 收回稱號: every 稱號 this 俠客 has (won, granted, typed); a tap marks one to take back with the letter
function renderRevoke(h) {
  const list = document.getElementById('giftRevoke');
  list.innerHTML = '';
  const entries = [];
  for (const id of h.honors || []) {
    const won = honorById(id);
    if (won) entries.push({ v: id, name: won.name, tier: won.tier });
  }
  for (const g of h.granted || []) {
    const info = grantedInfo(g);
    entries.push({ v: 'g:' + g, name: info.name, tier: info.tier });
  }
  if (h.customHonor) entries.push({ v: 'custom', name: h.customHonor, tier: 'plain' });
  if (!entries.length) {
    const none = document.createElement('span');
    none.className = 'quiet';
    none.textContent = h.honors === undefined ? '要先在 Supabase 更新 hero_list，才看得到別人的稱號。' : '還沒有稱號';
    list.append(none);
    return;
  }
  for (const e of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'revoke-pick';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', '收回 ' + (spokenHonor(e.name) || '稱號'));
    const badge = document.createElement('span');
    badge.className = 'honor ' + e.tier;
    badge.textContent = framedHonor(e.name);
    b.append(badge);
    b.addEventListener('click', function () {
      const at = gift.revoke.findIndex(function (r) { return r.v === e.v; });
      if (at >= 0) gift.revoke.splice(at, 1);
      else gift.revoke.push(e);
      b.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
    });
    list.append(b);
  }
}
document.getElementById('giftHonor').addEventListener('input', renderPlaques);
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
    const info = grantedInfo(g);
    entries.push({ value: 'g:' + g, name: info.name, tier: info.tier, hint: '管理員賜的稱號', won: true });
  }
  for (const e of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'honor-card';
    const badge = document.createElement('span');
    badge.className = 'honor ' + (e.won ? e.tier : 'shadow');
    badge.textContent = e.won ? framedHonor(e.name) : '【？？？】';
    const hint = document.createElement('span');
    hint.className = 'quiet';
    hint.textContent = e.hint;
    b.append(badge, hint);
    if (e.won) {
      const wearing = purse.honor === e.value;
      b.setAttribute('aria-pressed', wearing ? 'true' : 'false');
      b.setAttribute('aria-label', spokenHonor(e.name) || '稱號');
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
  input.maxLength = 8;
  input.placeholder = '自己取一個稱號';
  input.value = purse.customHonor;
  const wear = document.createElement('button');
  wear.type = 'button';
  wear.textContent = '掛上';
  wear.addEventListener('click', function () {
    purse.customHonor = input.value.trim();
    wearHonor(purse.customHonor ? 'custom' : '');
    if (purse.customHonor && state.sound) say('自稱，' + spokenHonor(purse.customHonor));
  });
  const off = document.createElement('button');
  off.type = 'button';
  off.textContent = '摘下稱號';
  off.addEventListener('click', function () { wearHonor(''); });
  own.append(input, wear, off);
  grid.append(list, own);
}

// 奇遇: after each finished character, one thing not yet owned that the 名望 has reached is tried at its rate
function checkEncounter() {
  const tIdx = titleIndex();
  const candidates = [];
  for (const it of ITEMS) {
    if (it.encounter && it.encounter.minTitle <= tIdx && purse.owned.indexOf(it.id) < 0) candidates.push(it);
  }
  if (!candidates.length) return;
  const it = candidates[Math.floor(Math.random() * candidates.length)];
  if (Math.random() >= it.encounter.rate) return;
  purse.owned.push(it.id);
  save();
  queueCelebration(1800, function () {
    sfxGong(0.6);
    avatarPlay('cheer');
    toast('奇遇！得到「' + it.name + '」');
    if (state.sound) say('奇遇！得到 ' + it.name);
  });
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
  document.getElementById('honorPopName').textContent = framedHonor(name);
  honorPop.className = 'honor-pop ' + tier;
  honorPop.hidden = false;
  sfxGong(0.4);
  if (state.sound) say('解鎖稱號，' + name);
  setTimeout(function () { honorPop.hidden = true; }, 3400);
}
honorPop.addEventListener('click', function () { honorPop.hidden = true; });

// 逐出江湖: the 管理員 slides all the way and holds there a moment; a gong, then one last question.
// Letting go early springs the knob back.
const removeSlider = document.getElementById('removeSlider');
const slideBox = document.getElementById('giftRemove');
const confirmSheet = document.getElementById('confirmSheet');
let removeHold = 0;
function setSlide(v) {
  removeSlider.value = v;
  slideBox.style.setProperty('--p', v / 100);
  slideBox.classList.toggle('full', v >= 100);
  if (v < 100) slideBox.classList.remove('pressed');
}
function springBack() {
  const from = Number(removeSlider.value);
  const start = performance.now();
  function frame(now) {
    const k = Math.min(1, (now - start) / 220);
    setSlide(Math.round(from * (1 - k)));
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
removeSlider.addEventListener('input', function () {
  const v = Number(removeSlider.value);
  setSlide(v);
  clearTimeout(removeHold);
  if (v >= 100) removeHold = setTimeout(pressRemove, 1500);
});
removeSlider.addEventListener('change', function () {
  clearTimeout(removeHold);
  springBack();
});
function pressRemove() {
  slideBox.classList.add('pressed');
  sfxClack();
  removeHold = setTimeout(askRemove, 380);
}
function askRemove() {
  if (!gift.to || !account.admin) return;
  sfxGong(0.5);
  document.getElementById('confirmText').textContent = '確定要把「' + gift.to.alias + '」逐出江湖嗎？他的進度會全部刪除，救不回來。';
  setSlide(0);
  openSheet(confirmSheet);
}
document.getElementById('confirmYes').addEventListener('click', function () {
  closeSheet(confirmSheet);
  removeHero();
});
async function removeHero() {
  const h = gift.to;
  if (!h || !account.admin) return;
  const note = document.getElementById('giftNote');
  try {
    await rpc('hero_delete', { p_alias: account.alias, p_pass: account.pass, p_target: h.alias });
  } catch (e) {
    note.textContent = '沒有成功，等一下再試。';
    return;
  }
  toast('包打聽已把消息傳遍江湖：「' + h.alias + '」被逐出江湖了');
  renderNews();
}
