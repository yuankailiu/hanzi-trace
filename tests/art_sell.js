// usage: node art_sell.js <base url> <shot dir> — settings pictures, 九宮格 default, music read alone, 錢莊 opening, 賣回, item read aloud
const { chromium } = require('playwright');
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
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(1200);
  console.log('grid default:', await page.evaluate(function () { return state.grid + ' | box jiu ' + document.getElementById('box').classList.contains('jiu'); }));
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  await page.evaluate(function () { window.spoken = []; });
  await page.click('.opt-row[data-opt="music"] button[data-val="xiangqi"]');
  await page.click('.opt-row[data-opt="sound"] button[data-val="1"]');
  await page.click('.opt-row[data-opt="grid"] button[data-val="jiu"]');
  await page.click('.opt-row[data-opt="keep"] button[data-val="0"]');
  console.log('said:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  console.log('grid order:', await page.evaluate(function () { return Array.from(document.querySelectorAll('.opt-row[data-opt="grid"] button')).map(function (b) { return b.textContent; }).join(' '); }));
  await page.screenshot({ path: shotDir + '/a-settings1.png' });
  await page.evaluate(function () { document.querySelector('#settingsSheet .sheet-panel').scrollTop = 520; });
  await page.screenshot({ path: shotDir + '/a-settings2.png' });
  await page.click('.opt-row[data-opt="theme"] button[data-val="dark"]');
  await page.evaluate(function () { document.querySelector('#settingsSheet .sheet-panel').scrollTop = 0; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/a-settings-dark.png' });
  await page.click('.opt-row[data-opt="theme"] button[data-val="light"]');
  await page.click('#settingsSheet [data-close]');

  // 錢莊 opens with no change shown; after a change and reopening, still none
  await page.evaluate(function () { purse.taels = 300; purse.ingots = 2; purse.owned = ['sword_qinggang', 'pet_he']; purse.gear.weapon = 'sword_qinggang'; save(); renderAll(); });
  await page.click('#playerCard');
  await page.waitForTimeout(500);
  console.log('bank button:', await page.textContent('#bankBtn'));
  await page.click('#bankBtn');
  await page.waitForTimeout(200);
  await page.click('#bankSell');
  await page.click('#bankSheet [data-close]');
  await page.waitForTimeout(200);
  await page.click('#bankBtn');
  await page.waitForTimeout(200);
  console.log('bank reopened, deltas:', JSON.stringify(await page.evaluate(function () { return [document.getElementById('bankTaelsDelta').textContent, document.getElementById('bankIngotsDelta').textContent]; })));
  await page.click('#bankSheet [data-close]');

  // 賣回 the worn sword: two taps
  await page.click('#shopTabs button:has-text("兵器")');
  await page.waitForTimeout(400);
  await page.evaluate(function () { openItem(itemById('sword_qinggang')); });
  await page.waitForTimeout(500);
  await page.evaluate(function () { window.spoken = []; });
  await page.click('#itemTitle');
  await page.click('#itemBig');
  console.log('tap name and picture said:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  await page.screenshot({ path: shotDir + '/a-item.png' });
  const t0 = await page.evaluate(function () { return purse.taels; });
  await page.click('.sell-btn');
  await page.waitForTimeout(200);
  console.log('first tap:', await page.textContent('.sell-btn'), '| owned', await page.evaluate(function () { return purse.owned.join(','); }));
  await page.click('.sell-btn');
  await page.waitForTimeout(300);
  console.log('second tap: taels', t0, '→', await page.evaluate(function () { return purse.taels + ' | owned ' + purse.owned.join(',') + ' | weapon "' + purse.gear.weapon + '" | sheet open ' + !document.getElementById('itemSheet').hidden; }), '| price', await page.evaluate(function () { return itemById('sword_qinggang').taels; }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
