// usage: node send_errors.js <base url> — what 包打聽 says for each refusal of letter_send
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
  await page.waitForTimeout(800);
  const cases = [
    [400, '{"code":"22023","message":"letter too long"}'],
    [400, '{"code":"22023","message":"no such hero"}'],
    [403, '{"code":"42501","message":"not allowed"}'],
    [400, '{"message":"wrong passcode"}'],
    [0, 'network'],
  ];
  for (const c of cases) {
    const said = await page.evaluate(async function (c) {
      account.alias = '小龜';
      account.pass = '1234';
      account.admin = true;
      window.rpc = async function () {
        if (!c[0]) throw new TypeError('Failed to fetch');
        const err = new Error(c[1]);
        err.wrongPass = c[1].indexOf('wrong passcode') >= 0;
        err.tooLong = c[1].indexOf('letter too long') >= 0;
        err.noHero = c[1].indexOf('no such hero') >= 0;
        err.notAllowed = c[1].indexOf('not allowed') >= 0;
        err.notFound = false;
        throw err;
      };
      openSheet(document.getElementById('profileSheet'));
      openGift({ alias: '小恬', xp: 10, gear: {}, gender: 'girl', taels: 0, ingots: 0 });
      document.getElementById('giftHonor').value = '↖☆小書法家☆↘';
      document.getElementById('giftSend').click();
      await new Promise(function (r) { setTimeout(r, 200); });
      return document.getElementById('giftNote').textContent;
    }, c);
    console.log(c[1].slice(0, 40), '→', said);
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
