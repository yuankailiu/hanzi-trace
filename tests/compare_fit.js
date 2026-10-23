// usage: node compare_fit.js <base url> <shot dir> — 對照字帖 moves her kept strokes onto the model by the fit
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    window.queueCelebration = function () {};
    window.announceLevels = function () {};
    state.keep = true;
    state.stars['口'] = { trace: 3 };
    loadText('口');
  });
  await page.waitForTimeout(900);
  await page.click('#modes button[data-mode="write"]');
  await page.waitForTimeout(900);
  const n = await page.evaluate(function () { return charData.medians.length; });
  for (let k = 0; k < n; k++) {
    const pts = await page.evaluate(function (k) {
      const rect = document.getElementById('box').getBoundingClientRect();
      const out = [];
      for (const p of charData.medians[k]) {
        const sc = toScreen(512 + 0.7 * (p[0] - 512) + 150, 388 + 0.7 * (p[1] - 388) - 150, builtSize);
        out.push({ x: rect.left + sc.x, y: rect.top + sc.y });
      }
      return out;
    }, k);
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: process.argv[3] + '/cmp-before.png' });
  await page.click('#compareBtn');
  await page.waitForTimeout(900);
  console.log('compare:', await page.evaluate(function () {
    return 'fit ' + fit.sx.toFixed(2) + ',' + fit.sy.toFixed(2) + ' ' + Math.round(fit.tx) + ',' + Math.round(fit.ty) + ' | mine transform ' + document.getElementById('mine').style.transform;
  }));
  await page.screenshot({ path: process.argv[3] + '/cmp-after.png' });
  await page.click('#compareBtn');
  await page.waitForTimeout(700);
  console.log('off again:', JSON.stringify(await page.evaluate(function () { return document.getElementById('mine').style.transform; })));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
