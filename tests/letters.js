// usage: node letters.js <base url> <shot dir> — the letter paper and seal, the 群俠譜 detail, plaques and decorations
const { chromium } = require('playwright');
const base = process.argv[2];
const shotDir = process.argv[3];
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  await page.addInitScript(function () {
    window.spoken = [];
    window.speechSynthesis.speak = function (u) { if (u.text) window.spoken.push(u.text); };
  });
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);

  // letters
  await page.evaluate(function () {
    account.alias = '小恬';
    window.spoken = [];
    showLetters([
      { from: '小龜', body: { text: '小恬，今天寫字寫得很漂亮！明天也要一起來練功喔。送你一點銀兩買糖葫蘆。', taels: 50, items: [] } },
      { from: '劉大俠客', body: { text: '加油！', honor: '㊣↙煞氣a華仔↗', honorTier: 'legend', items: ['crane', 'dog'], ingots: 2, gender: 'girl' } },
    ]);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shotDir + '/l-letters.png' });
  await page.evaluate(function () { document.querySelector('#letterSheet .sheet-panel').scrollTop = 9999; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: shotDir + '/l-letters-end.png' });
  console.log('letters said:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  await page.evaluate(function () {
    window.spoken = [];
    document.querySelectorAll('#letterList .letter button')[1].click();
  });
  console.log('read 2nd:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  console.log('fonts:', await page.evaluate(async function () {
    await document.fonts.ready;
    const p = document.querySelector('.letter-text');
    return getComputedStyle(p).fontFamily + ' | Iansui loaded ' + document.fonts.check('20px Iansui', '漂亮');
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shotDir + '/l-letters-phone.png' });
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.click('#letterSheet [data-close]');

  // received: a jade 稱號 granted, worn
  await page.evaluate(function () {
    receiveGifts({ honor: '乂煞氣a文卍', honorTier: 'jade' });
    receiveGifts({ honor: '小書法家' });
    save();
  });
  console.log('granted:', await page.evaluate(function () { return JSON.stringify(purse.granted) + ' | wearing ' + purse.honor + ' | badge ' + honorBadge(purse.honor, '').textContent + ' ' + honorBadge(purse.honor, '').className; }));

  // the 群俠譜 detail as the 管理員
  await page.evaluate(function () {
    account.alias = '小龜';
    account.admin = true;
    openSheet(document.getElementById('profileSheet'));
    document.getElementById('rosterPane').hidden = true;
    document.getElementById('newsPane').hidden = false;
    openGift({ alias: '小恬', xp: 400, gear: {}, gender: 'girl', taels: 80, ingots: 1, updated_at: new Date(Date.now() - 3 * 86400000).toISOString() });
  });
  await page.fill('#giftHonor', '小書法家');
  await page.click('#giftDecor button:has-text("↖☆…☆↘")');
  await page.click('#giftPlaques .plaque-pick[aria-label="玉牌"]');
  await page.waitForTimeout(300);
  console.log('detail:', await page.textContent('#newsNote'), '| honor', await page.inputValue('#giftHonor'), '| tier', await page.evaluate(function () { return gift.honorTier; }), '| button', await page.textContent('#giftSend'));
  await page.evaluate(function () { document.getElementById('giftDecor').scrollIntoView({ block: 'center' }); });
  await page.screenshot({ path: shotDir + '/l-detail.png' });
  await page.evaluate(function () { closeSheet(document.getElementById('profileSheet')); });

  // the grade seal, three impressions
  for (let i = 0; i < 3; i++) {
    await page.evaluate(function () { stampSeal(3); });
    await page.waitForTimeout(600);
    await page.screenshot({ path: shotDir + '/l-seal' + i + '.png', clip: await page.evaluate(function () {
      const r = document.getElementById('seal').getBoundingClientRect();
      return { x: r.left - 30, y: r.top - 30, width: r.width + 60, height: r.height + 60 };
    }) });
    console.log('tilt', await page.evaluate(function () { return document.getElementById('seal').style.getPropertyValue('--tilt'); }));
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
