// usage: node step.js <base url> — 看筆順 tapped stroke by stroke: next character, then 描一描
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
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1000);
  await page.evaluate(function () { loadText('大人'); });
  await page.waitForTimeout(900);
  await page.click('#modes button[data-mode="watch"]');
  await page.waitForTimeout(400);
  console.log('mode button:', await page.textContent('#modes button[data-mode="trace"]'));
  const box = await page.$('#box');
  const r = await box.boundingBox();
  for (let c = 0; c < 2; c++) {
    const n = await page.evaluate(function () { return strokeCount[currentChar()]; });
    for (let k = 0; k < n; k++) {
      await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
      await page.waitForTimeout(150);
    }
    // impatient taps right after the last stroke must not start the character over
    for (let k = 0; k < 3; k++) {
      await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
      await page.waitForTimeout(90);
    }
    console.log('  stepNum after extra taps:', await page.evaluate(function () { return stepNum + ' of ' + strokeCount[currentChar()]; }));
    await page.waitForTimeout(2600);
    console.log('after stepping char', c + 1, '(' + n + ' strokes):', await page.evaluate(function () {
      return 'mode ' + state.mode + ' | idx ' + state.idx + ' | char ' + currentChar() + ' | said ' + JSON.stringify(window.spoken.slice(-1));
    }));
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
