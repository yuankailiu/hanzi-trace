// usage: node doll_shots.js <base url> <shot dir> — the sprite-pack hero on every screen, and the shop with its icons
const { chromium } = require('playwright');
const shotDir = process.argv[3];
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  const missing = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  page.on('response', function (r) { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url().replace(/.*\/sprites\//, 'sprites/')); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1500);
  console.log('doll:', await page.evaluate(function () { return doll.state + ' from ' + doll.base + ' | items ' + ITEMS.length; }));
  await page.screenshot({ path: shotDir + '/d-main.png' });

  // a 大俠 with a sword, a hat, a gourd, a cloak, a dog and a treasure
  await page.evaluate(function () {
    purse.xp = 200000;
    purse.owned = ['sword_qinggang', 'head_douli', 'waist_hulu', 'back_pifeng', 'pet_gou', 'tr_yemingzhu', 'hair_red', 'spear_huaji'];
    Object.assign(purse.gear, { weapon: 'sword_qinggang', head: 'head_douli', waist: 'waist_hulu', back: 'back_pifeng', pet: 'pet_gou', treasure: 'tr_yemingzhu', hair: '' });
    purse.gear.outfit = 7;
    save();
    renderAll();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shotDir + '/d-geared.png' });
  await page.evaluate(function () { avatarPlay('attack'); });
  await page.waitForTimeout(350);
  await page.screenshot({ path: shotDir + '/d-attack1.png', clip: { x: 830, y: 480, width: 350, height: 340 } });
  await page.evaluate(function () { avatarPlay('cheer'); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: shotDir + '/d-attack2.png', clip: { x: 830, y: 480, width: 350, height: 340 } });
  console.log('lengths attack1/attack2:', await page.evaluate(function () {
    const look = { title: outfitIndex(), gear: purse.gear };
    return dollActionLength(look, 'attack1') + ' / ' + dollActionLength(look, 'attack2');
  }));

  // a girl at the top, a halberd and red hair
  await page.evaluate(function () {
    state.gender = 'girl';
    Object.assign(purse.gear, { weapon: 'spear_huaji', hair: 'hair_red', head: '', outfit: 19 });
    purse.xp = 9e9;
    renderAll();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shotDir + '/d-girl.png', clip: { x: 830, y: 60, width: 350, height: 760 } });

  // the shop tabs
  await page.click('#playerCard');
  await page.waitForTimeout(800);
  for (const tab of ['兵器', '飾品', '夥伴', '寶物']) {
    await page.click('#shopTabs button:has-text("' + tab + '")');
    await page.waitForTimeout(900);
    await page.screenshot({ path: shotDir + '/d-shop-' + tab + '.png' });
  }
  await page.click('#heroSheet [data-close]');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: shotDir + '/d-phone.png' });
  console.log('missing files:', missing.length ? missing.slice(0, 10) : 'none');
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
