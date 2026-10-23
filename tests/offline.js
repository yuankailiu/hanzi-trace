// usage: node offline.js <base url> <shot dir> — opened once online, the app opens and plays offline; storage used
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await context.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.waitForFunction(function () { return navigator.serviceWorker && navigator.serviceWorker.controller; }, null, { timeout: 20000 }).catch(function () {});
  await page.reload();
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  // a few words online, so some stroke data is kept
  for (let i = 0; i < 5; i++) {
    await page.click('#diceBtn');
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);
  console.log('online: controlled', await page.evaluate(function () { return Boolean(navigator.serviceWorker.controller); }), '| kept chunks', await page.evaluate(function () { return keptChunks.size; }));
  console.log('storage:', await page.evaluate(async function () {
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    const names = await caches.keys();
    let n = 0;
    let bytes = 0;
    let opaque = 0;
    const kinds = {};
    for (const name of names) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        n += 1;
        const res = await cache.match(req);
        if (res.type === 'opaque') { opaque += 1; continue; }
        const size = (await res.blob()).size;
        bytes += size;
        const kind = /\/data\/c\d+/.test(req.url) ? 'stroke data' : /sprites\//.test(req.url) ? 'sprites' : /\.woff2/.test(req.url) ? 'fonts' : /\.json/.test(req.url) ? 'banks' : 'page and scripts';
        kinds[kind] = (kinds[kind] || 0) + size;
      }
    }
    const parts = Object.keys(kinds).map(function (k) { return k + ' ' + (kinds[k] / 1048576).toFixed(1) + ' MB'; });
    return 'browser estimate ' + (est ? (est.usage / 1048576).toFixed(1) : '?') + ' MB | real ' + (bytes / 1048576).toFixed(1) + ' MB in ' + n + ' files (' + opaque + ' opaque) | ' + parts.join(', ');
  }));

  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('#writer svg', { timeout: 15000 });
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  const words = [];
  for (let i = 0; i < 6; i++) {
    await page.click('#diceBtn');
    await page.waitForTimeout(900);
    words.push(await page.evaluate(function () { return state.text + (charData ? '' : '(no data)') + (document.querySelector('.missing') ? '(missing)' : ''); }));
  }
  console.log('offline: onLine', await page.evaluate(function () { return navigator.onLine; }), '| words', words.join(' '), '| font', await page.evaluate(async function () { await document.fonts.ready; return document.fonts.check('30px "TW-Kai"', '天'); }), '| sprites', await page.evaluate(function () { return doll.state; }));
  await page.screenshot({ path: process.argv[3] + '/off-play.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
