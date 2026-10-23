// usage: node kai.js <base url> <shot dir> — the sentence and 注音 in 標楷體
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
  await page.evaluate(function () { loadSentence(sentences.find(function (x) { return x.s === '媽媽出門上班。'; })); });
  await page.waitForTimeout(2500);
  console.log(await page.evaluate(async function () {
    await document.fonts.ready;
    const g = document.querySelector('#sentence .glyph');
    return 'glyph font ' + getComputedStyle(g).fontFamily.slice(0, 30) + ' | TW-Kai loaded ' + document.fonts.check('40px "TW-Kai"', '媽') + ' | zy ' + getComputedStyle(document.getElementById('zy')).fontFamily.slice(0, 20);
  }));
  await page.screenshot({ path: process.argv[3] + '/k-sentence.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
