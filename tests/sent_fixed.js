// usage: node sent_fixed.js <base url> <shot dir> — the writing box stays put across short and long sentences; the source note
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
  for (const vp of [{ w: 1180, h: 820, n: 'land' }, { w: 820, h: 1180, n: 'port' }, { w: 390, h: 844, n: 'phone' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(700);
    const rows = [];
    for (const pick of ['short', 'long', 'mid', 'concised']) {
      const r = await page.evaluate(async function (pick) {
        let s;
        if (pick === 'short') s = sentences.find(function (x) { return x.s === '花開了。'; });
        if (pick === 'long') s = sentences.find(function (x) { return Array.from(x.s).length >= 25; });
        if (pick === 'mid') s = sentences.find(function (x) { return Array.from(x.s).length === 14; });
        if (pick === 'concised') s = sentences.find(function (x) { return x.src === 'c' && x.r === '縫隙'; }) || sentences.find(function (x) { return x.src === 'c'; });
        loadSentence(s);
        await new Promise(function (res) { setTimeout(res, 900); });
        const b = document.getElementById('box').getBoundingClientRect();
        const p = document.getElementById('sentence').getBoundingClientRect();
        const src = document.querySelector('#sentence .sentence-src');
        const cells = Array.from(document.querySelectorAll('#sentence .cell, #sentence button'));
        let outside = 0;
        for (const c of cells) {
          const r = c.getBoundingClientRect();
          if (r.right > p.right + 1 || r.left < p.left - 1 || r.bottom > p.bottom + 1 || r.top < p.top - 1) outside += 1;
        }
        return Array.from(s.s).length + ' chars: box ' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + ' | panel ' + Math.round(p.width) + 'x' + Math.round(p.height) + ' | cells outside ' + outside + ' | src ' + (src ? src.textContent : '-');
      }, pick);
      rows.push(r);
      if (pick === 'long' || pick === 'concised') await page.screenshot({ path: process.argv[3] + '/sf-' + vp.n + '-' + pick + '.png' });
    }
    console.log(vp.n + ':\n  ' + rows.join('\n  '));
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
