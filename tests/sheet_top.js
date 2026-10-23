// usage: node sheet_top.js <base url> <shot dir> — tabbed sheets keep their top edge while tabs change
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
  console.log('title at start:', await page.textContent('#profileTitle'));
  await page.click('#guestStart');
  await page.waitForTimeout(1000);
  async function tops(sheetSel, tabsSel) {
    const out = [];
    const n = (await page.$$(tabsSel + ' button')).length;
    for (let i = 0; i < n; i++) {
      await page.locator(tabsSel + ' button').nth(i).click();
      await page.waitForTimeout(350);
      out.push(await page.evaluate(function (sel) { return Math.round(document.querySelector(sel + ' .sheet-panel').getBoundingClientRect().top); }, sheetSel));
    }
    return out.join(',');
  }
  await page.click('#profileBtn');
  await page.waitForTimeout(400);
  console.log('俠客帳號 (' + await page.textContent('#profileTitle') + ') tops:', await tops('#profileSheet', '#profileTabs'));
  await page.screenshot({ path: process.argv[3] + '/t-profile.png' });
  await page.click('#profileSheet [data-close]');
  await page.click('#customBtn');
  await page.waitForTimeout(400);
  console.log('自己出題 tops:', await tops('#customSheet', '#customTabs'));
  await page.click('#customSheet [data-close]');
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  console.log('我的俠客 tops:', await tops('#heroSheet', '#shopTabs'));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
