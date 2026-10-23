// usage: node name_card.js <base url> <shot dir> — 一筆江湖 title, one name for the 俠客 sheet, the card's bust idle without weapon
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
  console.log('title:', await page.title(), '| opening', await page.textContent('.opening-title h1'));
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  console.log('sheet at the start:', await page.textContent('#profileTitle'));
  await page.click('#guestStart');
  await page.waitForTimeout(1200);
  await page.click('#profileBtn');
  await page.waitForTimeout(400);
  console.log('sheet from the game:', await page.textContent('#profileTitle'));
  await page.click('#profileSheet [data-close]');
  await page.evaluate(function () {
    purse.xp = 5000;
    purse.owned = ['sword_qinggang', 'head_douli'];
    Object.assign(purse.gear, { weapon: 'sword_qinggang', head: 'head_douli' });
    save();
    renderAll();
  });
  await page.waitForTimeout(800);
  const a = await page.evaluate(function () { return document.getElementById('avatar').toDataURL(); });
  await page.waitForTimeout(700);
  const b = await page.evaluate(function () { return document.getElementById('avatar').toDataURL(); });
  console.log('card bust moves:', a !== b);
  await page.screenshot({ path: process.argv[3] + '/n-card.png', clip: { x: 830, y: 60, width: 350, height: 130 } });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
