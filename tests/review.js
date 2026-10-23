// usage: node review.js <base url> <shot dir> — 錯字本: a hard character goes into review, comes back, moves on
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () {
    window.toasts = [];
    window.speechSynthesis.speak = function () {};
  });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    window.queueCelebration = function () {};
    window.announceLevels = function () {};
    window.checkEncounter = function () {};
    const real = window.toast;
    window.toast = function (t) { window.toasts.push(t); return real(t); };
    state.stars['木'] = { trace: 3 };
    state.content = 'chars';
    loadText('木');
  });
  await page.waitForTimeout(900);
  await page.click('#modes button[data-mode="write"]', { force: true });
  await page.waitForTimeout(900);
  // three wrong strokes, then the character written right
  const r = await page.evaluate(function () { const b = document.getElementById('box').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width }; });
  for (let k = 0; k < 3; k++) {
    await page.mouse.move(r.x + r.w * 0.85, r.y + r.w * 0.9);
    await page.mouse.down();
    await page.mouse.move(r.x + r.w * 0.9, r.y + r.w * 0.6, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  const n = await page.evaluate(function () { return charData.medians.length; });
  for (let k = 0; k < n; k++) {
    const pts = await page.evaluate(function (k) {
      const rect = document.getElementById('box').getBoundingClientRect();
      return charData.medians[k].map(function (p) { const s = toScreen(p[0], p[1], builtSize); return { x: rect.left + s.x, y: rect.top + s.y }; });
    }, k);
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  console.log('after a hard 木:', await page.evaluate(function () {
    return JSON.stringify(purse.review) + ' | toasts ' + JSON.stringify(window.toasts.filter(function (t) { return /複習|木/.test(t); })) + ' | due today ' + dueReviews().length;
  }));

  // the next day: 木 is due; the die shows 1; within four words it comes back, to be written alone
  await page.evaluate(function () { purse.review['木'].due = localDay(new Date()); renderPurse(); });
  console.log('badge:', await page.evaluate(function () { return document.getElementById('diceBtn').dataset.due; }));
  await page.screenshot({ path: process.argv[3] + '/rv-badge.png', clip: { x: 600, y: 40, width: 200, height: 140 } });
  const shown = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(function () { nextWord(false); });
    await page.waitForTimeout(700);
    shown.push(await page.evaluate(function () { return state.text + '/' + state.mode; }));
  }
  console.log('next four:', shown.join(' '), '| reviewing', await page.evaluate(function () { return reviewing; }));

  // 字訣本 lists it
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  await page.click('#shopTabs button:has-text("字訣本")');
  await page.waitForTimeout(400);
  console.log('字訣本:', await page.evaluate(function () {
    return Array.from(document.querySelectorAll('#items .review-card')).map(function (c) { return c.getAttribute('aria-label') + ' ' + c.querySelector('.review-when').textContent; }).join(', ') + ' | head ' + (document.querySelector('.review-head') || {}).textContent;
  }));
  await page.screenshot({ path: process.argv[3] + '/rv-book.png' });
  await page.click('#heroSheet [data-close]');

  // written well on its day: 3 days later; then through every box to done
  console.log('written well:', await page.evaluate(function () {
    reviewAfter('木', 0);
    const out = [JSON.stringify(purse.review['木'])];
    for (let i = 0; i < 4; i++) {
      if (!purse.review['木']) break;
      purse.review['木'].due = localDay(new Date());
      reviewAfter('木', 1);
      out.push(purse.review['木'] ? purse.review['木'].box + '@' + purse.review['木'].due : 'done');
    }
    return out.join(' → ');
  }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
