// usage: node three.js <base url> — what is shown and said for the three reported sentences
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () {
    window.spoken = [];
    window.speechSynthesis.speak = function (u) { if (u.text) window.spoken.push(u.text); };
  });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(800);
  await page.waitForFunction(function () { return sentences.length > 0; });
  for (const [text, ch] of [['難以下嚥', '嚥'], ['子欲養', '養'], ['說早安', '說']]) {
    const out = await page.evaluate(async function (args) {
      const s = sentences.find(function (x) { return x.s.indexOf(args[0]) >= 0; });
      const pos = Array.from(s.s).indexOf(args[1]);
      loadSentence(Object.assign({}, s, { k: [pos] }));
      await new Promise(function (r) { setTimeout(r, 900); });
      window.spoken = [];
      document.querySelector('#sentence .sentence-say').click();
      Array.from(document.querySelectorAll('#sentence .cell'))[pos].click();
      sayCharAt(0);
      return s.s + ' | ' + args[1] + ' 注音 ' + s.z[pos] + ' | said ' + JSON.stringify(window.spoken);
    }, [text, ch]);
    console.log(out);
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
