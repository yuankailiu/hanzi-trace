// usage: node hero_phone.js <base url> <shot dir> — 我的俠客 on a phone: six tabs fit
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  await page.click('#playerCard');
  await page.waitForTimeout(800);
  await page.click('#shopTabs button:has-text("稱號")');
  await page.waitForTimeout(400);
  console.log('tabs:', await page.evaluate(function () {
    const tabs = document.getElementById('shopTabs');
    return Array.from(tabs.children).map(function (b) { return b.textContent; }).join(' ') + ' | overflow ' + (tabs.scrollWidth - tabs.clientWidth) + ' | decor buttons ' + document.querySelectorAll('#items .decor').length;
  }));
  await page.screenshot({ path: process.argv[3] + '/h-phone.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
