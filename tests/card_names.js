// usage: node card_names.js <base url> <shot dir> — the card and 我的俠客: the name large in red, the 名望 in a pill
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
  await page.evaluate(function () { account.alias = '小龜'; purse.xp = 3000; renderAll(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: process.argv[3] + '/c-card.png', clip: { x: 830, y: 60, width: 350, height: 130 } });
  await page.click('#playerCard');
  await page.waitForTimeout(600);
  await page.screenshot({ path: process.argv[3] + '/c-herosheet.png', clip: { x: 230, y: 30, width: 720, height: 280 } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#heroSheet [data-close]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: process.argv[3] + '/c-card-phone.png', clip: { x: 0, y: 60, width: 390, height: 180 } });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
