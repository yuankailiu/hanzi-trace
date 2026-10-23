// usage: node switch.js <base url> <shot dir> — the 播放方式 switch in the music row: click sound, spoken, saved, both looks
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
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    window.clacks = 0;
    const real = window.sfxClack;
    window.sfxClack = function () { window.clacks += 1; return real.apply(null, arguments); };
  });
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  await page.evaluate(function () { document.getElementById('loopSwitch').scrollIntoView({ block: 'center' }); });
  const box = await (await page.$('.opt-row[data-opt="music"]')).boundingBox();
  await page.screenshot({ path: process.argv[3] + '/sw-one.png', clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 } });
  const musicBefore = await page.evaluate(function () { return state.music; });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(function () { window.spoken = []; });
    await page.click('#loopSwitch');
    await page.waitForTimeout(400);
    console.log('click', i + 1, ':', await page.evaluate(function () {
      return 'musicLoop ' + state.musicLoop + ' saved ' + serializeProfile().settings.musicLoop + ' | checked ' + document.getElementById('loopSwitch').getAttribute('aria-checked') + ' | said ' + JSON.stringify(window.spoken) + ' | clacks ' + window.clacks + ' | music still ' + state.music;
    }), '(was ' + musicBefore + ')');
    if (i === 0) await page.screenshot({ path: process.argv[3] + '/sw-all.png', clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 } });
  }
  console.log('old row gone:', await page.evaluate(function () { return !document.querySelector('.opt-row[data-opt="musicLoop"]'); }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
