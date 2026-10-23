// usage: node perf2.js <base url> <rate> — time the main functions while writing a word with the CPU slowed
const { chromium } = require('playwright');
const rate = Number(process.argv[3] || 20);
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(2500);
  // wrap the functions that run while writing: total and worst time of each
  await page.evaluate(function () {
    window.timing = {};
    for (const name of ['drawBrush', 'dollDraw', 'fxFrame', 'skyFrame', 'build', 'loadText', 'save', 'renderAll', 'renderPurse', 'celebrate', 'stampSeal', 'swordQi', 'renderSentence', 'avatarRender', 'say', 'flyCoins', 'checkHonors', 'award']) {
      const real = window[name];
      if (typeof real !== 'function') continue;
      window[name] = function () {
        const t0 = performance.now();
        const out = real.apply(this, arguments);
        const dt = performance.now() - t0;
        const r = window.timing[name] || (window.timing[name] = { n: 0, total: 0, max: 0 });
        r.n += 1;
        r.total += dt;
        if (dt > r.max) r.max = dt;
        return out;
      };
    }
    window.gaps = [];
    let last = performance.now();
    function tick(now) {
      if (now - last > 60) window.gaps.push(Math.round(now - last));
      last = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: rate });
  await page.evaluate(function () { loadText('天空'); });
  await page.waitForTimeout(3000);
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(2000);
  const before = await cdp.send('Performance.getMetrics');
  const t0 = Date.now();
  for (let c = 0; c < 2; c++) {
    const n = await page.evaluate(function () { return charData.strokes.length; });
    for (let k = 0; k < n; k++) {
      const pts = await page.evaluate(function (k) {
        const rect = document.getElementById('box').getBoundingClientRect();
        const out = [];
        for (const p of charData.medians[k]) {
          const s = toScreen(p[0], p[1], builtSize);
          out.push({ x: rect.left + s.x, y: rect.top + s.y });
        }
        return out;
      }, k);
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down();
      for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(6000);
  const after = await cdp.send('Performance.getMetrics');
  const wall = (Date.now() - t0) / 1000;
  const m = {};
  for (const x of after.metrics) m[x.name] = x.value;
  for (const x of before.metrics) m[x.name] -= x.value;
  console.log('CPU x' + rate + ' over ' + wall.toFixed(1) + ' s: task ' + m.TaskDuration.toFixed(2) + ' s | script ' + m.ScriptDuration.toFixed(2) + ' | layout ' + m.LayoutDuration.toFixed(2) + ' (' + m.LayoutCount + ') | style ' + m.RecalcStyleDuration.toFixed(2) + ' (' + m.RecalcStyleCount + ')');
  const out = await page.evaluate(function () { return { timing: window.timing, gaps: window.gaps }; });
  const rows = Object.entries(out.timing).sort(function (a, b) { return b[1].total - a[1].total; });
  for (const [name, r] of rows) console.log('  ' + name.padEnd(14) + ' n ' + String(r.n).padStart(5) + ' | total ' + r.total.toFixed(0).padStart(6) + ' ms | worst ' + r.max.toFixed(0) + ' ms');
  out.gaps.sort(function (a, b) { return b - a; });
  console.log('frames over 60 ms:', out.gaps.length, '| worst', out.gaps.slice(0, 10).join(' '));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
