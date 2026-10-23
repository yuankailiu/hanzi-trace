// usage: node test3.js <base url> <screenshot dir>
const { chromium } = require('playwright');

const base = process.argv[2];
const shotDir = process.argv[3];

async function drawStroke(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(420);
}
async function strokePoints(page, n) {
  return page.evaluate(function (k) {
    const rect = document.getElementById('box').getBoundingClientRect();
    const out = [];
    for (const p of charData.medians[k]) {
      const s = toScreen(p[0], p[1], builtSize);
      out.push({ x: rect.left + s.x, y: rect.top + s.y });
    }
    return out;
  }, n);
}
async function writeWholeWord(page) {
  const chars = await page.evaluate(function () { return state.chars.length; });
  for (let c = 0; c < chars; c++) {
    await page.waitForTimeout(500);
    const n = await page.evaluate(function () { return charData.strokes.length; });
    for (let s = 0; s < n; s++) await drawStroke(page, await strokePoints(page, s));
    await page.waitForTimeout(700);
    if (c < chars - 1) await page.click('#nextBtn');
  }
}
async function layoutReport(page, label) {
  return page.evaluate(function (l) {
    const d = document.documentElement;
    return l + ': ' + innerWidth + 'x' + innerHeight +
      ' | overflow x=' + (d.scrollWidth - innerWidth) + ' y=' + (d.scrollHeight - innerHeight) + ' | box ' + builtSize + 'px';
  }, label);
}

(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage();
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  console.log('start:', await page.evaluate(function () {
    return state.text + ' | theme attr ' + document.documentElement.getAttribute('data-theme') +
      ' | src ' + charData.src + ' | words ' + words.length + ' tier ' + wordTier();
  }));
  await page.screenshot({ path: shotDir + '/g-start.png' });

  // 看筆順: tap the box to step through strokes
  await page.waitForTimeout(2500);
  const rect = await page.evaluate(function () { const r = document.getElementById('box').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(rect.x + i * 20, rect.y);
    await page.waitForTimeout(250);
  }
  console.log('tap stepping: stepNum', await page.evaluate(function () { return stepNum; }), '| hint', await page.textContent('#watchActions span'));
  console.log('before practice: recent', JSON.stringify(await page.evaluate(function () { return state.recent; })),
    '| music', await page.evaluate(function () { return music.track + ' paused=' + (music.el ? music.el.paused : 'none'); }));
  await page.screenshot({ path: shotDir + '/g-step.png' });

  // pick the 2nd character, switch mode: stays there; double-tap the mode: back to the 1st
  const len = await page.evaluate(function () { return state.chars.length; });
  if (len > 1) {
    await page.locator('#chips .chip').nth(1).click();
    await page.waitForTimeout(500);
    await page.click('#modes button[data-mode="trace"]');
    await page.waitForTimeout(700);
    console.log('mode switch keeps idx:', await page.evaluate(function () { return state.idx; }));
    await page.click('#modes button[data-mode="trace"]');
    await page.waitForTimeout(100);
    await page.click('#modes button[data-mode="trace"]');
    await page.waitForTimeout(700);
    console.log('double tap → idx:', await page.evaluate(function () { return state.idx; }));
  }

  // 描字 then 自己寫 the whole word
  await page.click('#modes button[data-mode="trace"]');
  await writeWholeWord(page);
  await page.waitForTimeout(2200);
  console.log('after trace:', await page.evaluate(function () { const i = levelInfo(purse.xp); return 'xp ' + purse.xp + ' Lv ' + i.level + ' title ' + TITLES[titleIndex()].name + ' recent ' + JSON.stringify(state.recent); }), '| next', await page.getAttribute('#nextBtn', 'data-action'));
  await page.waitForTimeout(4000);
  await page.click('#nextBtn');
  await writeWholeWord(page);
  await page.waitForTimeout(2200);
  console.log('after write:', await page.evaluate(function () { const i = levelInfo(purse.xp); return 'xp ' + purse.xp + ' Lv ' + i.level + ' taels ' + purse.taels + ' ingots ' + purse.ingots; }));
  await page.waitForTimeout(4500);

  // push XP to just below the next title and finish one character: expect a title celebration
  await page.evaluate(function () { purse.xp = 135; save(); renderPurse(); });
  await page.click('#nextBtn');
  await page.waitForTimeout(800);
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(600);
  const n = await page.evaluate(function () { return charData.strokes.length; });
  for (let s = 0; s < n; s++) await drawStroke(page, await strokePoints(page, s));
  await page.waitForTimeout(2300);
  console.log('level-up label visible:', await page.isVisible('#lvup'), '|', await page.textContent('#lvup'));
  await page.screenshot({ path: shotDir + '/g-levelup.png' });
  await page.waitForTimeout(1500);
  console.log('title banner:', await page.isVisible('#banner'), '|', await page.textContent('#bannerSub'));
  await page.screenshot({ path: shotDir + '/g-title.png' });
  await page.waitForTimeout(5000);

  // 我的俠客 sheet: buy a pet and an accessory
  await page.evaluate(function () { purse.taels = 500; purse.ingots = 6; shown.taels = 500; shown.ingots = 6; save(); renderPurse(); });
  await page.click('#playerCard');
  await page.click('#shopTabs button:has-text("字訣本")');
  await page.waitForTimeout(600);
  console.log('字訣本:', await page.textContent('#scrollCount'), '| cards', await page.evaluate(function () { return document.querySelectorAll('#items .scroll-card').length + ' ' + purse.words.join('/') + ' | ' + purse.scrolls.join(''); }));
  await page.screenshot({ path: shotDir + '/g-scrollbook.png' });
  await page.locator('#shopTabs button').filter({ hasText: '夥伴' }).click();
  await page.locator('#items .item button').nth(3).click();
  await page.locator('#shopTabs button').filter({ hasText: '兵器' }).click();
  await page.locator('#items .item button').nth(2).click();
  await page.locator('#shopTabs button').filter({ hasText: '飾品' }).click();
  await page.locator('#items .item button').nth(2).click();
  // tap a companion card: the zoomed card shows its name with 注音
  await page.locator('#items .item').nth(0).click({ position: { x: 40, y: 30 } });
  await page.waitForTimeout(700);
  console.log('item card:', await page.isVisible('#itemSheet'), '| zhuyin', await page.evaluate(function () { return Array.from(document.querySelectorAll('#itemTitle .zy-v')).map(function (e) { return e.textContent; }).join(' '); }));
  await page.screenshot({ path: shotDir + '/g-item.png' });
  await page.click('#itemSheet [data-close]');
  await page.locator('#items .item').nth(5).click({ position: { x: 40, y: 30 } });
  await page.waitForTimeout(500);
  console.log('mystery card:', await page.textContent('#itemTitle'), '|', await page.textContent('#itemNote'));
  await page.click('#itemSheet [data-close]');
  console.log('gear:', JSON.stringify(await page.evaluate(function () { return purse.gear; })), '| ladder items', await page.evaluate(function () { return document.querySelectorAll('#ladder .ladder-item').length; }));
  await page.screenshot({ path: shotDir + '/g-hero.png' });
  await page.click('#heroSheet .opt-row[data-opt="gender"] button[data-val="girl"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/g-hero-girl.png' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/g-hero-pixel.png' });
  console.log('looks:', await page.evaluate(function () { return state.gender + ' avatar canvas ' + document.getElementById('avatar').width + 'x' + document.getElementById('avatar').height; }));
  await page.locator('#shopTabs button').nth(2).click();
  console.log('weapons: known', await page.evaluate(function () { return document.querySelectorAll('#items .item:not(.mystery)').length + ' mystery ' + document.querySelectorAll('#items .item.mystery').length; }));
  await page.click('#heroSheet [data-close]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: shotDir + '/g-gear.png', clip: { x: 830, y: 70, width: 350, height: 150 } });

  // the signed-in name shows on the card and in 我的俠客 (set directly, no cloud account is made)
  await page.evaluate(function () { account.alias = '小恬'; renderPurse(); });
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  console.log('alias:', await page.textContent('#aliasTag'), '|', await page.textContent('#heroTitle'));
  await page.screenshot({ path: shotDir + '/g-alias.png' });
  await page.click('#heroSheet [data-close]');
  await page.evaluate(function () { account.alias = ''; renderPurse(); });

  // polyphones read by the word: 長大 → ㄓㄤˇ, 音樂 → ㄩㄝˋ on its 2nd character
  await page.evaluate(function () { loadText('長大'); });
  await page.waitForTimeout(900);
  const zy1 = await page.textContent('#zy');
  await page.evaluate(function () { loadText('音樂'); state.idx = 1; build(); });
  await page.waitForTimeout(900);
  console.log('word readings: 長大 →', zy1, '| 音樂[1] →', await page.textContent('#zy'));

  // dark theme from settings
  await page.click('#settingsBtn');
  await page.click('.opt-row[data-opt="theme"] button[data-val="dark"]');
  await page.click('#settingsSheet [data-close]');
  await page.waitForTimeout(500);
  console.log('theme attr:', await page.evaluate(function () { return document.documentElement.getAttribute('data-theme'); }));
  await page.screenshot({ path: shotDir + '/g-dark.png' });
  await page.click('#settingsBtn');
  await page.click('.opt-row[data-opt="theme"] button[data-val="light"]');
  await page.click('#settingsSheet [data-close]');

  // practice content: single characters, then the parent's 生字本
  await page.click('#settingsBtn');
  await page.click('.opt-row[data-opt="content"] button[data-val="chars"]');
  await page.click('#settingsSheet [data-close]');
  await page.waitForTimeout(600);
  const picks = [];
  for (let i = 0; i < 5; i++) {
    await page.click('#diceBtn');
    await page.waitForTimeout(250);
    picks.push(await page.evaluate(function () { return state.text; }));
  }
  console.log('只練單字 picks:', picks.join(' '));
  await page.click('#customBtn');
  await page.click('#customTabs button[data-pane="listPane"]');
  await page.fill('#listInput', '太陽，月亮 星星、白雲');
  await page.click('#saveListBtn');
  await page.waitForTimeout(500);
  const listPicks = [];
  for (let i = 0; i < 5; i++) {
    await page.click('#diceBtn');
    await page.waitForTimeout(250);
    listPicks.push(await page.evaluate(function () { return state.text; }));
  }
  console.log('生字本:', await page.evaluate(function () { return state.content + ' ' + state.list.join('/'); }), '| picks', listPicks.join(' '));
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/g-settings.png' });
  await page.click('#settingsSheet [data-close]');

  const sizes = [
    ['iPad portrait', 820, 1180],
    ['iPad landscape', 1180, 820],
    ['iPhone portrait', 390, 844],
    ['iPhone landscape', 844, 390],
    ['desktop', 1440, 900],
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s[1], height: s[2] });
    await page.waitForTimeout(900);
    console.log(await layoutReport(page, s[0]));
    await page.screenshot({ path: shotDir + '/h-' + s[0].replace(' ', '-') + '.png' });
  }

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
