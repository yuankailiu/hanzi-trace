// Effects: shared helpers, synthesized sound, speech, toast, 劍氣 canvas, flying coins, fireworks.
// Reads app globals (state, purse, sealEl, box, builtSize, toScreen, weaponById) only at call time.

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------- helpers ----------
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function rand(a, b) {
  return a + Math.random() * (b - a);
}
function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
function restartAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---------- textures (rice paper fibers, worn seal edge) ----------
function paperTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(128, 110, 80, 0.07)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const a = Math.random() * Math.PI * 2;
    const len = rand(3, 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.6) * len * 0.5,
      y + Math.sin(a + 0.6) * len * 0.5,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len
    );
    ctx.stroke();
  }
  return c.toDataURL();
}
function sealMask() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 160; i++) {
    const edge = Math.random() < 0.6;
    let x = Math.random() * 128;
    let y = Math.random() * 128;
    if (edge) {
      if (Math.random() < 0.5) x = Math.random() < 0.5 ? rand(0, 6) : rand(122, 128);
      else y = Math.random() < 0.5 ? rand(0, 6) : rand(122, 128);
    }
    ctx.globalAlpha = rand(0.3, 1);
    ctx.beginPath();
    ctx.arc(x, y, rand(0.4, edge ? 2.6 : 1.4), 0, Math.PI * 2);
    ctx.fill();
  }
  return c.toDataURL();
}

// ---------- sound (synthesized with Web Audio, no files) ----------
let audioCtx = null;
let noiseBuf = null;
// play through the iPhone/iPad silent switch, like a game would (Safari 16.4+)
if (navigator.audioSession) navigator.audioSession.type = 'playback';
function getAudio() {
  if (!state.sound) return null;
  return audioContext();
}
// the app's own volume (the device buttons still control the hardware volume)
let masterGain = null;
function audioOut() {
  audioContext();
  return masterGain;
}
function setVolume(v) {
  if (masterGain) masterGain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
}
function audioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.volume;
    masterGain.connect(audioCtx.destination);
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const samples = noiseBuf.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
['pointerdown', 'touchend', 'click'].forEach(function (ev) {
  document.addEventListener(ev, function () { getAudio(); }, { capture: true, passive: true });
});

function envelope(ac, t, peak, attack, decay) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}
function noiseSource(ac) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

// 唰: a band-passed noise sweep plus a faint metallic ring
function sfxSwish() {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;

  const src = noiseSource(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(4200, t);
  bp.frequency.exponentialRampToValueAtTime(700, t + 0.2);
  const g = envelope(ac, t, 0.35, 0.03, 0.2);
  src.connect(bp).connect(g).connect(audioOut());
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.26);

  for (const f of [2350, 3170]) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const og = envelope(ac, t + 0.05, 0.025, 0.01, 0.35);
    o.connect(og).connect(audioOut());
    o.start(t + 0.05);
    o.stop(t + 0.45);
  }
}

// 碰: a seal hitting paper on a desk
function sfxStamp() {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;

  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  const g = envelope(ac, t, 0.9, 0.005, 0.28);
  o.connect(g).connect(audioOut());
  o.start(t);
  o.stop(t + 0.32);

  const src = noiseSource(ac);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const ng = envelope(ac, t, 0.4, 0.003, 0.08);
  src.connect(lp).connect(ng).connect(audioOut());
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.1);
}

// 木魚: a gentle wooden knock for a wrong stroke
// 擲骰子: a few quick wooden clacks
function sfxDice() {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const hits = [0, 0.055, 0.1, 0.17];
  for (let i = 0; i < hits.length; i++) {
    const at = t + hits[i];
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(rand(900, 1300), at);
    o.frequency.exponentialRampToValueAtTime(rand(500, 700), at + 0.03);
    const g = envelope(ac, at, 0.22 - i * 0.03, 0.002, 0.045);
    o.connect(g).connect(audioOut());
    o.start(at);
    o.stop(at + 0.06);
  }
}
function sfxWood() {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(660, t);
  o.frequency.exponentialRampToValueAtTime(500, t + 0.06);
  const g = envelope(ac, t, 0.28, 0.004, 0.12);
  o.connect(g).connect(audioOut());
  o.start(t);
  o.stop(t + 0.16);
}

// 銅鑼: inharmonic partials with a slight pitch drop after the strike
function sfxGong(level) {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.8 * (level || 1);
  master.connect(audioOut());

  const base = 92;
  const ratios = [1, 1.52, 2.03, 2.61, 3.15, 3.76, 4.42];
  for (let i = 0; i < ratios.length; i++) {
    const f = base * ratios[i];
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.6);
    const decay = 4.2 - i * 0.45;
    const g = envelope(ac, t, 0.32 / (i + 1), 0.015, decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay + 0.1);
  }

  const src = noiseSource(ac);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2000;
  const ng = envelope(ac, t, 0.3, 0.003, 0.06);
  src.connect(lp).connect(ng).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.1);
}

// 鞭炮: a cluster of short high-passed noise pops
function sfxCrackle() {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 9; i++) {
    const at = t + Math.random() * 0.45;
    const src = noiseSource(ac);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = envelope(ac, at, rand(0.15, 0.4), 0.002, 0.03);
    src.connect(hp).connect(g).connect(audioOut());
    src.start(at, Math.random() * 0.5);
    src.stop(at + 0.05);
  }
}

// 叮: one coin landing in the purse
function sfxTick(pitch) {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = pitch || 2093;
  const g = envelope(ac, t, 0.07, 0.003, 0.18);
  o.connect(g).connect(audioOut());
  o.start(t);
  o.stop(t + 0.22);
}

// ---------- background music: loops one track, fading out at the end and back in at the start ----------
const TRACKS = {
  xiangqi: 'audio/xiangqi.mp4',
  arisan: 'audio/arisan.mp3',
  scions: 'audio/scions-village.mp3',
  eren: 'audio/eren-valley.mp3',
  chungum: 'audio/chungumgwan.mp3',
};
const MUSIC_VOLUME = 0.3;
const MUSIC_FADE = 1.6;
const music = { el: null, gain: null, track: '', fadingOut: false, started: false };

function musicGraph() {
  if (music.el) return true;
  const ac = audioContext();
  if (!ac) return false;
  music.el = new Audio();
  music.el.preload = 'auto';
  music.el.playsInline = true;
  music.gain = ac.createGain();
  music.gain.gain.value = 0;
  ac.createMediaElementSource(music.el).connect(music.gain).connect(audioOut());
  music.el.addEventListener('timeupdate', function () {
    const el = music.el;
    if (!music.fadingOut && el.duration && el.duration - el.currentTime < MUSIC_FADE) {
      music.fadingOut = true;
      musicFade(0, MUSIC_FADE);
    }
  });
  music.el.addEventListener('ended', function () {
    music.el.currentTime = 0;
    music.fadingOut = false;
    music.el.play().then(function () { musicFade(MUSIC_VOLUME, MUSIC_FADE); }, function () {});
  });
  return true;
}
function musicFade(to, seconds) {
  if (!music.gain) return;
  const t = audioCtx.currentTime;
  const g = music.gain.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(to, t + seconds);
}
// called from a tap (browsers start sound only after the user touches the page)
function playMusic(id) {
  if (!id || id === 'off' || !TRACKS[id]) {
    stopMusic();
    return;
  }
  if (!musicGraph()) return;
  if (music.track !== id) {
    music.track = id;
    music.el.src = TRACKS[id];
    music.el.currentTime = 0;
  }
  music.fadingOut = false;
  music.started = true;
  music.el.play().then(function () { musicFade(MUSIC_VOLUME, MUSIC_FADE); }, function () {});
}
function stopMusic() {
  if (!music.el) return;
  musicFade(0, 0.8);
  const el = music.el;
  setTimeout(function () { if (music.gain && music.gain.gain.value < 0.01) el.pause(); }, 900);
}
// start on the first touch, pause while the app is in the background
document.addEventListener('pointerdown', function () {
  if (!music.started && state.music !== 'off') playMusic(state.music);
}, { capture: true });
document.addEventListener('visibilitychange', function () {
  if (!music.el || state.music === 'off') return;
  if (document.hidden) music.el.pause();
  else playMusic(state.music);
});

// ---------- speech ----------
// Apple's novelty voices (Eloquence) read Chinese oddly; they are never used
const NOVELTY_VOICES = /Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox/i;

// rank: Taiwan Mandarin first, 美佳 (Meijia) and its Enhanced/Premium versions above the rest
function voiceScore(v) {
  let score = 0;
  if (/TW/i.test(v.lang)) score += 100;
  else if (/CN|cmn/i.test(v.lang)) score += 50;
  if (/Meijia|美佳/i.test(v.name)) score += 40;
  if (/Premium|Enhanced|高品質|優化|加強/i.test(v.name)) score += 30;
  if (v.localService) score += 5;
  return score;
}
// Chinese voices on this device, best first
function chineseVoices() {
  const out = [];
  for (const v of window.speechSynthesis.getVoices()) {
    if (!/^zh/i.test(v.lang) && !/^cmn/i.test(v.lang)) continue;
    if (NOVELTY_VOICES.test(v.name)) continue;
    out.push(v);
  }
  out.sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
  return out;
}
// when speech last started, so a generic button handler can tell a specific one already spoke
let lastSaidAt = 0;
let sayToken = 0;
// Speech starts right inside the tap (iOS plays nothing that starts later). Chrome's synthesizer
// can get stuck after an interrupted utterance and then says nothing: if an utterance has not
// started after 1.5 s, cancel and try it once more.
function say(text) {
  if (!('speechSynthesis' in window)) return;
  lastSaidAt = performance.now();
  const myToken = ++sayToken;
  // cancel only what is playing: Safari can drop a speak() that follows a needless cancel()
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) synth.cancel();
  speakOnce(text, myToken, true);
}
function speakOnce(text, myToken, retry) {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const v = chineseVoices()[0];
  u.lang = v ? v.lang : 'zh-TW';
  u.rate = 0.75;
  u.volume = state.volume;
  if (v) u.voice = v;
  let started = false;
  u.onstart = function () { started = true; };
  synth.resume();
  synth.speak(u);
  if (!retry) return;
  setTimeout(function () {
    if (started || myToken !== sayToken) return;
    synth.cancel();
    speakOnce(text, myToken, false);
  }, 1500);
}
if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

// ---------- toast ----------
const toastQueue = [];
let toastBusy = false;
function toast(text) {
  toastQueue.push(text);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const el = document.getElementById('toast');
  const text = toastQueue.shift();
  if (!text) {
    toastBusy = false;
    return;
  }
  toastBusy = true;
  el.textContent = text;
  el.hidden = false;
  restartAnimation(el, 'toast');
  setTimeout(function () {
    el.hidden = true;
    setTimeout(nextToast, 200);
  }, 2400);
}

// ---------- box effects: 劍氣 along each correct stroke ----------
const fx = { canvas: null, ctx: null, size: 0, slashes: [], sparks: [], rings: [], running: false, last: 0 };

function setupFx(canvas, size) {
  fx.canvas = canvas;
  fx.ctx = setupCanvas(canvas, size, size);
  fx.size = size;
  fx.slashes = [];
  fx.sparks = [];
  fx.rings = [];
}

// pts: points in Hanzi Writer's character frame, as {x, y}
function swordQi(pts, color) {
  if (reducedMotion() || !pts || pts.length < 2) return;

  const screen = [];
  for (const p of pts) screen.push(toScreen(p.x, p.y, fx.size));

  // resample every ~5 px so the glow travels smoothly
  const samples = [{ x: screen[0].x, y: screen[0].y, d: 0 }];
  let total = 0;
  for (let i = 1; i < screen.length; i++) {
    const dx = screen[i].x - screen[i - 1].x;
    const dy = screen[i].y - screen[i - 1].y;
    const seg = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(seg / 5));
    for (let k = 1; k <= n; k++) {
      samples.push({
        x: screen[i - 1].x + dx * k / n,
        y: screen[i - 1].y + dy * k / n,
        d: total + seg * k / n,
      });
    }
    total += seg;
  }
  const dur = Math.min(320, 140 + total * 0.6);
  fx.slashes.push({ samples: samples, length: total, start: performance.now(), dur: dur, ended: false, color: color });
  if (!fx.running) {
    fx.running = true;
    fx.last = performance.now();
    requestAnimationFrame(fxFrame);
  }
}

function fxFrame(now) {
  const dt = Math.min(48, Math.max(0, now - fx.last)) / 16.7;
  fx.last = now;
  const ctx = fx.ctx;
  const size = fx.size;
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const width = size / 44;
  const keep = [];
  for (const s of fx.slashes) {
    const p = Math.min(1, Math.max(0, (now - s.start) / s.dur));
    let fade = 1;
    if (p >= 1) fade = Math.max(0, 1 - (now - s.start - s.dur) / 320);
    const head = s.length * p;
    const samples = s.samples;

    let headPt = samples[0];
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 5;
    ctx.strokeStyle = s.color;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].d > head) break;
      const ratio = head > 0 ? samples[i].d / head : 1;
      ctx.globalAlpha = fade * 0.55 * (0.1 + 0.9 * ratio * ratio);
      ctx.lineWidth = width * (0.4 + 0.6 * ratio);
      ctx.beginPath();
      ctx.moveTo(samples[i - 1].x, samples[i - 1].y);
      ctx.lineTo(samples[i].x, samples[i].y);
      ctx.stroke();
      headPt = samples[i];
    }
    ctx.shadowBlur = 0;

    // small bright tip at the leading edge
    ctx.globalAlpha = fade * 0.6;
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(headPt.x, headPt.y, width * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (p < 1) {
      if (Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        const v = rand(0.5, 1.6) * size / 400;
        fx.sparks.push({ x: headPt.x, y: headPt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rand(220, 400), color: s.color });
      }
    } else if (!s.ended) {
      s.ended = true;
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + rand(-0.3, 0.3);
        const v = rand(1, 2.2) * size / 400;
        fx.sparks.push({ x: headPt.x, y: headPt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rand(260, 420), color: s.color });
      }
      fx.rings.push({ x: headPt.x, y: headPt.y, age: 0, life: 360, color: s.color });
    }
    if (fade > 0) keep.push(s);
  }
  fx.slashes = keep;

  const liveSparks = [];
  for (const sp of fx.sparks) {
    sp.age += dt * 16.7;
    if (sp.age >= sp.life) continue;
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vx *= 0.94;
    sp.vy = sp.vy * 0.94 + 0.04 * dt;
    ctx.globalAlpha = 0.7 * (1 - sp.age / sp.life);
    ctx.fillStyle = sp.color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, width * 0.16, 0, Math.PI * 2);
    ctx.fill();
    liveSparks.push(sp);
  }
  fx.sparks = liveSparks;

  const liveRings = [];
  for (const r of fx.rings) {
    r.age += dt * 16.7;
    if (r.age >= r.life) continue;
    const k = r.age / r.life;
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = width * 0.25 * (1 - k) + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, size * 0.05 * k + 2, 0, Math.PI * 2);
    ctx.stroke();
    liveRings.push(r);
  }
  fx.rings = liveRings;
  ctx.globalAlpha = 1;

  if (fx.slashes.length || fx.sparks.length || fx.rings.length) {
    requestAnimationFrame(fxFrame);
  } else {
    ctx.clearRect(0, 0, size, size);
    fx.running = false;
  }
}

// ---------- coins flying from the seal up to the purse ----------
// shown: the counters on screen, which lag behind the purse while coins fly
const shown = { taels: 0, ingots: 0 };
function renderCounters() {
  document.getElementById('taels').textContent = shown.taels;
  document.getElementById('ingots').textContent = shown.ingots;
}
function flyCoins(kind, amount) {
  const key = kind === 'gold' ? 'ingots' : 'taels';
  if (amount <= 0) return;
  if (reducedMotion()) {
    shown[key] = purse[key];
    renderCounters();
    return;
  }

  const targetBox = document.getElementById(key + 'Box');
  const target = document.getElementById(key).getBoundingClientRect();
  const from = sealEl.hidden ? box.getBoundingClientRect() : sealEl.getBoundingClientRect();
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;

  let n = Math.min(8, Math.max(3, Math.ceil(amount / 3)));
  if (kind === 'gold') n = Math.min(amount, 5);
  const share = Math.ceil(amount / n);
  let landed = 0;

  for (let i = 0; i < n; i++) {
    const coin = document.createElementNS(SVG_NS, 'svg');
    coin.setAttribute('class', 'sycee flying ' + kind);
    coin.setAttribute('viewBox', '0 0 24 16');
    coin.innerHTML = '<use href="#sycee"></use>';
    coin.style.left = (sx - 14) + 'px';
    coin.style.top = (sy - 10) + 'px';
    document.body.append(coin);

    const ox = rand(-50, 50);
    const oy = rand(-70, -25);
    const anim = coin.animate([
      { transform: 'translate(0px, 0px) scale(0.5)', opacity: 0 },
      { transform: 'translate(' + ox + 'px, ' + oy + 'px) scale(1.3)', opacity: 1, offset: 0.3 },
      { transform: 'translate(' + (tx - sx) + 'px, ' + (ty - sy) + 'px) scale(0.75)', opacity: 1 },
    ], { duration: 950, delay: i * 90, easing: 'cubic-bezier(0.5, 0, 0.75, 0.45)', fill: 'both' });
    anim.onfinish = function () {
      coin.remove();
      landed += 1;
      if (landed === n) shown[key] = purse[key];
      else shown[key] = Math.min(purse[key], shown[key] + share);
      renderCounters();
      restartAnimation(targetBox, 'pulse');
      sfxTick(kind === 'gold' ? 2637 : 2093);
    };
  }
}

// ---------- celebrations: night sky, gold fireworks, red lanterns, firecracker paper ----------
const sky = { canvas: null, ctx: null, w: 0, h: 0, parts: [], lanterns: [], paper: [], bursts: [], start: 0, running: false, last: 0 };
const BURST_COLORS = ['#FFD36A', '#FFB33B', '#FF6B4A', '#FFF1D6', '#E8392B'];
const PAPER_COLORS = ['#D62828', '#B5171C', '#E84A3A', '#F2B705'];
let bannerTimer = 0;

// nodes: what to show large (the word's glyph SVGs, or the 俠客 canvas); sub: the line under it
function celebrate(nodes, sub) {
  const bannerEl = document.getElementById('banner');
  const nameEl = document.getElementById('bannerName');
  nameEl.innerHTML = '';
  for (const g of nodes) nameEl.append(g);
  document.getElementById('bannerSub').textContent = sub;
  bannerEl.hidden = false;
  bannerEl.style.animation = 'none';
  void bannerEl.offsetWidth;
  bannerEl.style.animation = '';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(function () { bannerEl.hidden = true; }, reducedMotion() ? 3500 : 4800);
  sfxGong();
  if (reducedMotion()) return;

  sky.canvas = document.getElementById('sky');
  sky.w = window.innerWidth;
  sky.h = window.innerHeight;
  sky.ctx = setupCanvas(sky.canvas, sky.w, sky.h);
  sky.parts = [];
  sky.lanterns = [];
  sky.paper = [];
  sky.start = performance.now();
  sky.bursts = [];
  for (const t of [150, 500, 900, 1300, 1750, 2250, 2800, 3300]) sky.bursts.push({ t: t, done: false });

  const unit = Math.min(sky.w, sky.h);
  for (let i = 0; i < 6; i++) {
    sky.lanterns.push({
      x0: sky.w * (0.1 + 0.8 * (i + rand(0.2, 0.8)) / 6),
      y: sky.h + rand(40, 260),
      size: unit * rand(0.06, 0.1),
      speed: rand(1.4, 2.4) * unit / 700,
      phase: Math.random() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 60; i++) {
    sky.paper.push({
      x: Math.random() * sky.w,
      y: -rand(10, sky.h * 0.6),
      vx: rand(-0.6, 0.6),
      vy: rand(1.2, 2.6),
      rot: Math.random() * Math.PI,
      vr: rand(-0.15, 0.15),
      w: rand(5, 10),
      h: rand(8, 16),
      color: PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)],
    });
  }

  sky.canvas.hidden = false;
  if (!sky.running) {
    sky.running = true;
    sky.last = performance.now();
    requestAnimationFrame(skyFrame);
  }
}

function burst(x, y) {
  const unit = Math.min(sky.w, sky.h) / 700;
  const count = 64;
  const hue = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + rand(-0.1, 0.1);
    const v = rand(2.2, 5) * unit;
    let color = hue;
    if (Math.random() < 0.3) color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
    sky.parts.push({
      x: x, y: y, px: x, py: y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      age: 0, life: rand(1000, 1600),
      color: color, size: rand(1.6, 3) * unit + 0.6,
    });
  }
  sfxCrackle();
}

function drawLantern(ctx, x, y, s, t) {
  const glow = ctx.createRadialGradient(x, y, s * 0.2, x, y, s * 1.7);
  glow.addColorStop(0, 'rgba(255, 170, 60, 0.45)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, s * 1.7, 0, Math.PI * 2);
  ctx.fill();

  // string
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.62);
  ctx.lineTo(x, y - s * 1.1);
  ctx.stroke();

  // body
  const body = ctx.createLinearGradient(x - s * 0.62, 0, x + s * 0.62, 0);
  body.addColorStop(0, '#8E1510');
  body.addColorStop(0.5, '#E8392B');
  body.addColorStop(1, '#8E1510');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.62, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ribs
  ctx.strokeStyle = 'rgba(120, 15, 10, 0.55)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (const rx of [0.36, 0.14]) {
    ctx.beginPath();
    ctx.ellipse(x, y, s * rx, s * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // gold caps
  ctx.fillStyle = '#F2B705';
  ctx.fillRect(x - s * 0.24, y - s * 0.6, s * 0.48, s * 0.13);
  ctx.fillRect(x - s * 0.24, y + s * 0.47, s * 0.48, s * 0.13);

  // tassel, swinging a little
  const swing = Math.sin(t * 0.004) * s * 0.08;
  ctx.strokeStyle = '#F2B705';
  ctx.lineWidth = Math.max(1, s * 0.04);
  for (const dx of [-0.06, 0, 0.06]) {
    ctx.beginPath();
    ctx.moveTo(x + s * dx, y + s * 0.6);
    ctx.lineTo(x + s * dx + swing, y + s * 1.1);
    ctx.stroke();
  }
}

function skyFrame(now) {
  const dt = Math.min(48, Math.max(0, now - sky.last)) / 16.7;
  sky.last = now;
  const elapsed = now - sky.start;
  const ctx = sky.ctx;
  ctx.clearRect(0, 0, sky.w, sky.h);

  for (const b of sky.bursts) {
    if (!b.done && elapsed >= b.t) {
      b.done = true;
      burst(sky.w * rand(0.15, 0.85), sky.h * rand(0.12, 0.45));
    }
  }

  let fadeOut = 1;
  if (elapsed > 4200) fadeOut = Math.max(0, 1 - (elapsed - 4200) / 700);

  // lanterns rise behind everything
  ctx.globalAlpha = fadeOut;
  for (const L of sky.lanterns) {
    L.y -= L.speed * dt;
    const x = L.x0 + Math.sin(now * 0.0012 + L.phase) * L.size * 0.5;
    drawLantern(ctx, x, L.y, L.size, now + L.phase * 1000);
  }

  // firecracker paper drifting down
  for (const p of sky.paper) {
    p.x += p.vx * dt + Math.sin(now * 0.002 + p.rot) * 0.3;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
    ctx.restore();
  }

  // firework sparks, additive so they glow on the night veil
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const live = [];
  for (const q of sky.parts) {
    q.age += dt * 16.7;
    if (q.age >= q.life) continue;
    q.px = q.x;
    q.py = q.y;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.975;
    q.vy = q.vy * 0.975 + 0.045 * dt;
    const k = q.age / q.life;
    let twinkle = 1;
    if (k > 0.6 && Math.random() < 0.3) twinkle = 0.3;
    ctx.globalAlpha = (1 - k) * fadeOut * twinkle;
    ctx.strokeStyle = q.color;
    ctx.lineWidth = q.size;
    ctx.beginPath();
    ctx.moveTo(q.px, q.py);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    live.push(q);
  }
  sky.parts = live;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  if (elapsed < 4900) {
    requestAnimationFrame(skyFrame);
  } else {
    ctx.clearRect(0, 0, sky.w, sky.h);
    sky.canvas.hidden = true;
    sky.running = false;
  }
}
