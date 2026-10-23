// usage: node boot_honor.js <base url> <shot dir> — a hero wearing a 稱號 loads, is chosen, and the page has its words
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  // never reach the real cloud
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.evaluate(function () {
    enterAs('小龜');
    purse.xp = 900;
    purse.honors.push('firstWrite');
    purse.honor = 'firstWrite';
    purse.granted.push('jade|乂煞氣a文卍');
    save();
    localStorage.setItem(PASS_PREFIX + '小龜', '1234');
    rememberHero('小龜');
    enterAs('小恬');
    purse.granted.push('↖☆煞氣a小恬☆↘');
    purse.honor = 'g:↖☆煞氣a小恬☆↘';
    save();
    localStorage.setItem(PASS_PREFIX + '小恬', '1234');
    rememberHero('小恬');
  });
  for (const pass of [0, 1]) {
    await page.reload();
    await page.waitForTimeout(2500);
    console.log('after load errors:', JSON.stringify(errors), '| opening', await page.isVisible('#opening'));
    await page.click('#gongBtn', { timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: process.argv[3] + '/b-gate' + pass + '.png' });
    console.log('slots:', await page.evaluate(function () {
      return Array.from(document.querySelectorAll('#recentHeroes .hero-slot')).map(function (s) { return s.textContent || '(empty)'; }).join(' / ');
    }));
    await page.click('#recentHeroes .hero-slot >> nth=' + pass);
    await page.waitForTimeout(1500);
    console.log('entered', await page.evaluate(function () { return account.alias; }), '| plaque', JSON.stringify(await page.textContent('#plaque')), '| card', JSON.stringify((await page.textContent('#playerCard')).replace(/\s+/g, ' ').trim()));
    await page.screenshot({ path: process.argv[3] + '/b-entered' + pass + '.png' });
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
