// usage: node voice.js <base url> <shot dir> — the 語音 row: voices this browser has, greyed ones, which one speaks
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () {
    window.spoken = [];
    if (location.search.indexOf('only=') >= 0) {
      const keep = new RegExp(decodeURIComponent(location.search.split('only=')[1]));
      const real = window.speechSynthesis.getVoices.bind(window.speechSynthesis);
      window.speechSynthesis.getVoices = function () { return real().filter(function (v) { return keep.test(v.name) || !/^zh|^cmn/i.test(v.lang); }); };
    }
    window.speechSynthesis.speak = function (u) { if (u.text) window.spoken.push(u.text + ' [' + (u.voice ? u.voice.name : 'no voice') + ']'); };
  });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html' + (process.argv[4] ? '?only=' + encodeURIComponent(process.argv[4]) : ''));
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  console.log('Chinese voices here:', await page.evaluate(function () { return chineseVoices().map(function (v) { return v.name + ' ' + v.lang; }).join(' | ') || 'none'; }));
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  const row = function () {
    return page.evaluate(function () {
      return Array.from(document.querySelectorAll('.opt-row[data-opt="voice"] button')).map(function (b) {
        return b.textContent + (b.disabled ? '(灰)' : '') + (b.getAttribute('aria-pressed') === 'true' ? '✓' : '');
      }).join(' ') + ' | note ' + (document.getElementById('voiceNote').hidden ? '-' : document.getElementById('voiceNote').textContent);
    });
  };
  console.log('row:', await row());
  const usable = await page.evaluate(function () {
    return Array.from(document.querySelectorAll('.opt-row[data-opt="voice"] button')).filter(function (b) { return !b.disabled; }).map(function (b) { return b.dataset.val; });
  });
  for (const v of usable) {
    await page.evaluate(function () { window.spoken = []; });
    await page.click('.opt-row[data-opt="voice"] button[data-val="' + v + '"]');
    console.log('chose', v, '→ said', JSON.stringify(await page.evaluate(function () { return window.spoken; })), '| saved', await page.evaluate(function () { return serializeProfile().settings.voice; }));
  }
  // a chosen voice this device lacks: the note says which one speaks instead
  await page.evaluate(function () { state.voice = 'meijiaPlus'; renderOptions(); });
  console.log('missing chosen:', await row());
  await page.evaluate(function () { state.voice = 'meijia'; renderOptions(); });
  await page.screenshot({ path: process.argv[3] + '/v-settings.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
