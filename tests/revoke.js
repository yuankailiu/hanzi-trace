// usage: node revoke.js <base url> <shot dir> — the 管理員 takes 稱號 back; the letter shows it and the receiver loses them
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

  // the 管理員's side
  await page.evaluate(function () {
    account.alias = '小龜';
    account.pass = '1234';
    account.admin = true;
    window.sent = null;
    window.rpc = async function (fn, body) { if (fn === 'letter_send') window.sent = body.p_body; return 1; };
    openSheet(document.getElementById('profileSheet'));
    document.getElementById('rosterPane').hidden = true;
    document.getElementById('newsPane').hidden = false;
    openGift({ alias: '小恬', xp: 10, gear: {}, gender: 'girl', taels: 0, ingots: 0, honors: ['firstWrite', 'streak3'], granted: ['jade|乂煞氣a文卍', '小書法家'], customHonor: '愛吃布丁' });
  });
  console.log('to take back:', await page.evaluate(function () {
    return Array.from(document.querySelectorAll('#giftRevoke .revoke-pick')).map(function (b) { return b.textContent; }).join(' ');
  }));
  await page.click('#giftRevoke .revoke-pick >> nth=2');
  await page.click('#giftRevoke .revoke-pick >> nth=4');
  await page.evaluate(function () { document.getElementById('giftRevoke').scrollIntoView({ block: 'center' }); });
  await page.screenshot({ path: process.argv[3] + '/r-detail.png' });
  await page.click('#giftSend');
  await page.waitForTimeout(400);
  const body = await page.evaluate(function () { return window.sent; });
  console.log('sent:', JSON.stringify(body));

  // the receiver's side
  console.log('received:', await page.evaluate(function (body) {
    closeSheet(document.getElementById('profileSheet'));
    account.alias = '小恬';
    account.admin = false;
    purse.honors = ['firstWrite', 'streak3'];
    purse.granted = ['jade|乂煞氣a文卍', '小書法家'];
    purse.customHonor = '愛吃布丁';
    purse.honor = 'g:jade|乂煞氣a文卍';
    receiveGifts(body);
    showLetters([{ from: '小龜', body: body }, { from: '小龜', body: Object.assign({}, body, { text: '這兩個稱號先收回，換這隻給你。', items: ['dog'], taels: 30 }) }]);
    return 'honors ' + JSON.stringify(purse.honors) + ' | granted ' + JSON.stringify(purse.granted) + ' | custom "' + purse.customHonor + '" | wearing "' + purse.honor + '" | voice ' + giftText(body, true);
  }, body));
  await page.waitForTimeout(800);
  await page.evaluate(function () { document.querySelector('#letterSheet .sheet-panel').scrollTop = 9999; });
  await page.screenshot({ path: process.argv[3] + '/r-letter.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
