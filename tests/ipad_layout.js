// usage: node ipad_layout.js <base url> <shot dir> — iPad sizes and rotations in sentence mode: panel, box, plaque, die
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
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
  async function report(label, sentence) {
    await page.evaluate(function (pick) {
      const s = sentences.find(function (x) { return x.s === pick; }) || sentences.find(function (x) { return Array.from(x.s).length >= 24 && x.k.length >= 3; });
      if (!state.sentence || state.sentence.s !== s.s) loadSentence(s);
    }, sentence);
    await page.waitForTimeout(1000);
    const r = await page.evaluate(function () {
      function rect(id) { const b = document.getElementById(id).getBoundingClientRect(); return b; }
      const p = rect('sentence');
      const b = rect('box');
      const q = rect('plaque');
      const d = rect('diceBtn');
      const overlap = !(q.right <= d.left || q.left >= d.right || q.bottom <= d.top || q.top >= d.bottom);
      return 'box ' + Math.round(b.width) + ' | panel ' + Math.round(p.left) + ',' + Math.round(p.top) + ' ' + Math.round(p.width) + 'x' + Math.round(p.height) +
        (p.top < 0 || p.bottom > innerHeight + 1 ? ' OFF-SCREEN' : '') + ' | plaque ' + Math.round(q.width) + ' (' + Math.round(q.left) + '-' + Math.round(q.right) + ') die ' + Math.round(d.left) + '-' + Math.round(d.right) + (overlap ? ' OVERLAP' : '') +
        ' | scroll y ' + (document.documentElement.scrollHeight - innerHeight);
    });
    console.log(label.padEnd(26) + r);
    await page.screenshot({ path: process.argv[3] + '/ip-' + label.replace(/[^a-z0-9]+/gi, '-') + '.png' });
  }
  const long = '';
  for (const size of [[1180, 820], [1024, 768]]) {
    await page.setViewportSize({ width: size[0], height: size[1] });
    await page.waitForTimeout(800);
    await report(size[0] + 'x' + size[1] + ' land', long);
    await page.setViewportSize({ width: size[1], height: size[0] });
    await page.waitForTimeout(800);
    await report(size[0] + 'x' + size[1] + ' port', long);
    await page.setViewportSize({ width: size[0], height: size[1] });
    await page.waitForTimeout(800);
    await report(size[0] + 'x' + size[1] + ' land again', long);
  }
  // a word with many characters on the plaque
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.evaluate(function () { state.content = 'words'; loadText('五顏六色'); });
  await page.waitForTimeout(1000);
  console.log('word 五顏六色 port:', await page.evaluate(function () {
    const q = document.getElementById('plaque').getBoundingClientRect();
    const d = document.getElementById('diceBtn').getBoundingClientRect();
    return 'plaque ' + Math.round(q.left) + '-' + Math.round(q.right) + ' die ' + Math.round(d.left) + '-' + Math.round(d.right);
  }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
