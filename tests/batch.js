// usage: node batch.js <base url> <shot dir> — 九宮格, 播放方式, 自己寫 locked until traced, 錢莊, missed strokes, portrait layout
const { chromium } = require('playwright');
const shotDir = process.argv[3];
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () {
    window.spoken = [];
    window.speechSynthesis.speak = function (u) { if (u.text) window.spoken.push(u.text); };
  });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1200);

  // settings
  await page.click('#settingsBtn');
  await page.click('.opt-row[data-opt="grid"] button[data-val="jiu"]');
  await page.click('#loopSwitch');
  console.log('九宮格:', await page.evaluate(function () {
    const shown = Array.from(document.querySelectorAll('#box .grid .guide')).filter(function (l) { return getComputedStyle(l).display !== 'none'; }).length;
    return 'box jiu ' + document.getElementById('box').classList.contains('jiu') + ' | lines shown ' + shown + ' | musicLoop ' + state.musicLoop + ' saved ' + serializeProfile().settings.musicLoop;
  }));
  await page.click('#settingsSheet [data-close]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/b-jiu.png' });

  // 自己寫 locked on a character never traced
  await page.evaluate(function () { state.stars = {}; loadText('木'); });
  await page.waitForTimeout(900);
  await page.evaluate(function () { window.spoken = []; });
  await page.click('#modes button[data-mode="write"]', { force: true });
  await page.waitForTimeout(300);
  console.log('write before trace:', await page.evaluate(function () {
    const b = document.querySelector('#modes button[data-mode="write"]');
    return 'mode ' + state.mode + ' | locked ' + b.classList.contains('locked') + ' | said ' + JSON.stringify(window.spoken);
  }));
  // trace it
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(800);
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
    for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  console.log('after trace:', await page.evaluate(function () {
    const b = document.querySelector('#modes button[data-mode="write"]');
    return 'locked ' + b.classList.contains('locked') + ' | stars ' + JSON.stringify(state.stars['木']);
  }));
  await page.click('#modes button[data-mode="write"]', { force: true });
  await page.waitForTimeout(900);
  // a stroke drawn in the wrong place four times: the fourth counts it done
  const before = await page.evaluate(function () { return writer._quiz ? writer._quiz._currentStrokeIndex : -1; });
  const r = await page.evaluate(function () { const b = document.getElementById('box').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width }; });
  for (let k = 0; k < 4; k++) {
    await page.mouse.move(r.x + r.w * 0.1, r.y + r.w * 0.9);
    await page.mouse.down();
    await page.mouse.move(r.x + r.w * 0.15, r.y + r.w * 0.6, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  console.log('write mode', await page.evaluate(function () { return state.mode; }), '| stroke index after 4 misses:', before, '→', await page.evaluate(function () { return writer._quiz ? writer._quiz._currentStrokeIndex : -1; }));

  // 錢莊
  await page.evaluate(function () { purse.taels = 250; purse.ingots = 2; save(); renderPurse(); });
  await page.click('#playerCard');
  await page.waitForTimeout(500);
  await page.click('#bankBtn');
  await page.waitForTimeout(300);
  await page.click('#bankSell');
  await page.waitForTimeout(250);
  await page.screenshot({ path: shotDir + '/b-bank.png' });
  await page.click('#bankBuy');
  await page.click('#bankBuy');
  console.log('錢莊:', await page.evaluate(function () {
    return 'taels ' + purse.taels + ' ingots ' + purse.ingots + ' | shows ' + document.getElementById('bankTaels').textContent + '/' + document.getElementById('bankIngots').textContent + ' | buy disabled ' + document.getElementById('bankBuy').disabled;
  }));
  await page.click('#bankSheet [data-close]');
  await page.click('#heroSheet [data-close]');

  for (const vp of [{ w: 820, h: 1180, name: 'ipad-port' }, { w: 390, h: 844, name: 'phone' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(900);
    console.log(vp.name + ':', await page.evaluate(function () {
      const p = document.getElementById('playerCard').getBoundingClientRect();
      const i = document.getElementById('info').getBoundingClientRect();
      return 'player ' + Math.round(p.left) + '-' + Math.round(p.right) + ' y' + Math.round(p.top) + ' | info ' + Math.round(i.left) + '-' + Math.round(i.right) + ' y' + Math.round(i.top) + ' | box ' + builtSize + ' | overflow x ' + (document.documentElement.scrollWidth - innerWidth) + ' y ' + (document.documentElement.scrollHeight - innerHeight);
    }));
    await page.screenshot({ path: shotDir + '/b-' + vp.name + '.png' });
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
