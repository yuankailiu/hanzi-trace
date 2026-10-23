// usage: node ceremony.js <base url> <shot dir> — the opening gong, the entrance announcement, the reworked sheets
const { chromium } = require('playwright');
const base = process.argv[2];
const shotDir = process.argv[3];

(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  // a voice that starts at once and ends after 400 ms; every sound and utterance is logged with its time
  await page.addInitScript(function () {
    window.events = [];
    window.speechSynthesis.speak = function (u) {
      if (!u.text) return;
      window.events.push([Math.round(performance.now()), 'say ' + u.text]);
      setTimeout(function () { if (u.onstart) u.onstart(); }, 20);
      setTimeout(function () { if (u.onend) u.onend(); }, 400);
    };
  });
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.evaluate(function () {
    for (const name of ['sfxGong', 'sfxPage', 'sfxDrum']) {
      const real = window[name];
      window[name] = function () { window.events.push([Math.round(performance.now()), name]); return real.apply(null, arguments); };
    }
  });
  console.log('opening shown:', await page.isVisible('#opening'), '| gate open:', await page.isVisible('#profileSheet'));
  await page.screenshot({ path: shotDir + '/c-opening.png' });
  await page.click('#gongBtn');
  await page.waitForTimeout(1150);
  await page.screenshot({ path: shotDir + '/c-rising.png' });
  await page.waitForTimeout(900);
  console.log('after gong: opening', await page.isVisible('#opening'), '| gate', await page.isVisible('#profileSheet'));
  await page.screenshot({ path: shotDir + '/c-gate.png' });
  await page.evaluate(function () { window.events = []; window.t0 = performance.now(); });
  await page.click('#guestStart');
  await page.waitForTimeout(3500);
  console.log('entrance:', JSON.stringify(await page.evaluate(function () {
    return window.events.map(function (e) { return Math.round(e[0] - window.t0) + 'ms ' + e[1]; });
  })));

  // 自己出題: three tabs
  await page.click('#customBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotDir + '/c-custom-one.png' });
  await page.click('#editNameBtn');
  await page.fill('#nameInput', '劉岱恬');
  await page.press('#nameInput', 'Enter');
  await page.waitForTimeout(300);
  console.log('name:', await page.evaluate(function () {
    return state.myName + ' | card ' + document.getElementById('myNameText').textContent + ' | edit hidden ' + document.getElementById('nameEdit').hidden + ' | sheet open ' + !document.getElementById('customSheet').hidden;
  }));
  await page.screenshot({ path: shotDir + '/c-custom-name.png' });
  await page.click('#customTabs button[data-pane="listPane"]');
  await page.screenshot({ path: shotDir + '/c-custom-list.png' });
  await page.click('#customTabs button[data-pane="mySentPane"]');
  await page.screenshot({ path: shotDir + '/c-custom-sent.png' });
  await page.click('#customSheet [data-close]');

  // 設定
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotDir + '/c-settings.png' });
  console.log('label columns:', await page.evaluate(function () {
    const lefts = Array.from(document.querySelectorAll('#settingsSheet .opt-choices')).map(function (c) { return Math.round(c.getBoundingClientRect().left); });
    return Array.from(new Set(lefts)).join(',');
  }));
  await page.evaluate(function () { document.querySelector('#settingsSheet .sheet-panel').scrollTop = 9999; });
  await page.screenshot({ path: shotDir + '/c-settings-end.png' });
  await page.click('.opt-row[data-opt="theme"] button[data-val="dark"]');
  await page.evaluate(function () { document.querySelector('#settingsSheet .sheet-panel').scrollTop = 0; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/c-settings-dark.png' });
  await page.click('.opt-row[data-opt="theme"] button[data-val="light"]');
  await page.click('#settingsSheet [data-close]');
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotDir + '/c-hero.png' });
  await page.click('#heroSheet [data-close]');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotDir + '/c-settings-phone.png' });
  await page.click('#settingsSheet [data-close]');
  await page.click('#customBtn');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotDir + '/c-custom-phone.png' });
  console.log('overflow x:', await page.evaluate(function () { return document.documentElement.scrollWidth - innerWidth; }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
