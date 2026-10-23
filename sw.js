// 一筆江湖 offline: the page, its scripts, the word and sentence banks, the 標楷 font and the sprite manifest are
// kept when the app is first opened; stroke data, sprites and icons are kept as they are used. Everything is
// served from the device first and refreshed from the network in the background, so the app opens and plays
// without a connection. Progress lives in the device's storage already and goes to the cloud when online.
// Music is not kept (players read it in ranges) and the cloud (Supabase) is never cached.
const VERSION = 'v1.0.0';
const SHELL = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;
const SHELL_FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/config.js',
  'js/catalog.js',
  'js/hero.js',
  'js/pixel.js',
  'js/doll.js',
  'js/effects.js',
  'js/app.js',
  'data/words.json',
  'data/sentences.json',
  'data/homophones.json',
  'data/readings.json',
  'sprites/manifest.json',
  'fonts/tw-kai.woff2',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js',
];
// at most this many stroke-data chunks are kept (about 330 KB each); the oldest go first
const MAX_CHUNKS = 60;

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(SHELL).then(function (cache) { return cache.addAll(SHELL_FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    const old = keys.filter(function (k) { return k !== SHELL && k !== RUNTIME; });
    return Promise.all(old.map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keepable(url) {
  if (/supabase/.test(url.hostname)) return false;
  if (/\.(mp3|mp4|m4a)$/.test(url.pathname)) return false;
  return url.origin === self.location.origin || /jsdelivr\.net$|googleapis\.com$|gstatic\.com$/.test(url.hostname);
}

async function trimChunks(cache) {
  const keys = await cache.keys();
  const chunks = keys.filter(function (r) { return /\/data\/c\d{3}\.json$/.test(r.url); });
  for (let i = 0; i < chunks.length - MAX_CHUNKS; i++) await cache.delete(chunks[i]);
}

// from the device first; the network refreshes the copy for next time
async function fromDevice(request) {
  const cached = await caches.match(request);
  const fetched = fetch(request).then(async function (response) {
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(RUNTIME);
      await cache.put(request, response.clone());
      if (/\/data\/c\d{3}\.json$/.test(request.url)) await trimChunks(cache);
    }
    return response;
  }).catch(function () { return null; });
  if (cached) return cached;
  const response = await fetched;
  return response || new Response('', { status: 504, statusText: 'offline' });
}

// the page itself: the network first (the newest version when online), the kept copy without a connection
async function page(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL);
    await cache.put('index.html', response.clone());
    return response;
  } catch (e) {
    return (await caches.match('index.html')) || (await caches.match('./'));
  }
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
    return;
  }
  if (!keepable(url) || request.headers.has('range')) return;
  event.respondWith(fromDevice(request));
});
