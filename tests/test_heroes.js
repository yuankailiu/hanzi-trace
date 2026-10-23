// usage: node test_heroes.js <base url> <shot dir>
// start gate, login / create, 稱號, stacked 江湖身分, 包打聽 with gifts, letters and the 管理員 — mock Supabase
const { chromium } = require('playwright');
const base = process.argv[2];
const shotDir = process.argv[3];

function profile(gender, xp, taels, ingots, owned, gear, text, streak, scrolls) {
  return {
    v: 4, savedAt: 1000,
    settings: { gender: gender, genderLock: gender, music: 'xiangqi', sound: true },
    text: text,
    purse: { taels: taels, ingots: ingots, xp: xp, owned: owned, gear: gear, scrolls: scrolls || [], words: [], lastDay: '', streak: streak || 0 },
  };
}
const db = {
  profiles: {
    '小龜': { pass: '1111', admin: false, data: profile('boy', 900, 300, 3, ['wood', 'dog', 'bell'], { weapon: 'wood', head: '', waist: 'bell', back: '', pet: 'dog' }, '小狗', 3) },
    '小恬': { pass: '2222', admin: false, data: profile('girl', 150, 80, 0, ['fan'], { weapon: 'fan', head: '', waist: '', back: '', pet: '' }, '月亮') },
  },
  letters: [],
};
function handle(fn, b) {
  const key = (b.p_alias || '').trim().toLowerCase();
  const p = db.profiles[key];
  const ok = p && p.pass === b.p_pass;
  if (fn === 'profile_load') {
    if (!p) return [200, null];
    if (!ok) return [400, { message: 'wrong passcode' }];
    return [200, { data: p.data, updated_at: 'x', admin: p.admin }];
  }
  if (fn === 'profile_save') {
    if (!p) {
      db.profiles[key] = { pass: b.p_pass, admin: false, data: b.p_data };
      return [200, 'now'];
    }
    if (!ok) return [400, { message: 'wrong passcode' }];
    p.data = b.p_data;
    return [200, 'now'];
  }
  if (!ok) return [400, { message: 'wrong passcode' }];
  if (fn === 'hero_list') {
    const out = [];
    for (const alias in db.profiles) {
      const d = db.profiles[alias].data;
      const pp = d.purse || {};
      out.push({ alias: alias, admin: db.profiles[alias].admin, gender: d.settings && d.settings.gender, xp: pp.xp, taels: pp.taels, ingots: pp.ingots, gear: pp.gear, honor: pp.honor, customHonor: pp.customHonor });
    }
    return [200, out];
  }
  if (fn === 'letter_send') {
    if ((b.p_body.gender || b.p_body.honor) && !p.admin) return [403, { message: 'not allowed' }];
    db.letters.push({ to: b.p_to, from: key, body: b.p_body, claimed: false });
    return [200, db.letters.length];
  }
  if (fn === 'letter_inbox') {
    const out = [];
    for (const l of db.letters) {
      if (l.to === key && !l.claimed) {
        l.claimed = true;
        out.push({ id: 1, from: l.from, body: l.body, at: 'x' });
      }
    }
    return [200, out];
  }
  if (fn === 'hero_delete') {
    if (!p.admin) return [403, { message: 'not allowed' }];
    delete db.profiles[b.p_target];
    return [200, true];
  }
  return [404, { message: 'no function' }];
}

(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('dialog', function (d) { d.accept(); });
  await page.route('**/rest/v1/rpc/*', function (route) {
    const fn = route.request().url().split('/').pop();
    const res = handle(fn, JSON.parse(route.request().postData() || '{}'));
    route.fulfill({ status: res[0], contentType: 'application/json', body: JSON.stringify(res[1]) });
  });
  await page.addInitScript(function (profiles) {
    window.speechSynthesis.speak = function () {};
    if (localStorage.getItem('test.seeded')) return;
    localStorage.setItem('test.seeded', '1');
    for (const alias in profiles) {
      localStorage.setItem('bishun.profile.' + alias, JSON.stringify(profiles[alias].data));
      localStorage.setItem('bishun.pass.' + alias, profiles[alias].pass);
    }
    localStorage.setItem('bishun.current', '小龜');
  }, db.profiles);
  async function slots() {
    return page.evaluate(function () {
      return Array.from(document.querySelectorAll('#recentHeroes .hero-slot')).map(function (s) { return s.textContent || '(empty)'; }).join(' / ');
    });
  }

  // the gate, then a guest, then the gate again: the heroes stay
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  console.log('gate 1:', await slots());
  await page.click('#guestStart');
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  console.log('gate 2 after guest:', await slots());
  await page.locator('#recentHeroes .hero-slot', { hasText: '小龜' }).click();
  await page.waitForTimeout(1500);

  // login mode with an unknown name; create mode needs 少俠 / 女俠; the eye shows the passcode
  await page.click('#profileBtn');
  await page.click('#profileTabs button[data-pane="accountPane"]');
  await page.fill('#aliasInput', '沒這人');
  await page.fill('#passInput', '1234');
  await page.click('#passEye');
  const passType = await page.getAttribute('#passInput', 'type');
  await page.click('#accountSubmit');
  await page.waitForTimeout(500);
  console.log('login unknown:', await page.textContent('#profileNote'), '| eye shows passcode', passType === 'text', '| gender row hidden in login', await page.evaluate(function () { return document.getElementById('newGenderRow').hidden; }));
  await page.click('#accountModes button[data-mode="create"]');
  await page.screenshot({ path: shotDir + '/k-create.png' });
  await page.click('#profileSheet [data-close]');

  // 稱號: a perfect 自己寫 wins 妙筆生花 (and 聞雞起舞 from the 3-day streak); a typed one
  await page.evaluate(function () { state.mode = 'write'; checkHonors(0); state.mode = 'watch'; });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: shotDir + '/k-pop.png' });
  console.log('won:', await page.evaluate(function () { return purse.honors.join(',') + ' | wearing ' + purse.honor + ' | card ' + document.getElementById('honorTag').textContent; }));
  await page.waitForTimeout(6000);
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  await page.locator('#shopTabs button', { hasText: '稱號' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotDir + '/k-honors.png' });
  await page.fill('.honor-own input', '愛吃布丁');
  await page.locator('.honor-own button', { hasText: '掛上' }).click();
  console.log('typed:', await page.evaluate(function () { return purse.honor + ' ' + purse.customHonor + ' | sheet ' + document.getElementById('heroHonor').textContent; }));
  await page.locator('.honor-card', { hasText: '妙筆生花' }).click();
  await page.click('#outfitNext');
  await page.waitForTimeout(400);
  console.log('right at the end stays:', await page.evaluate(function () { return outfitIndex() + ' of ' + titleIndex(); }));
  await page.click('#outfitPrev');
  await page.waitForTimeout(400);
  console.log('outfit:', await page.evaluate(function () {
    return document.getElementById('outfitText').textContent + ' | worn ' + outfitIndex() + ' of rank ' + titleIndex() + ' | realm ' + document.getElementById('heroRealm').className;
  }));
  await page.locator('#heroSheet .sheet-panel').screenshot({ path: shotDir + '/k-fame.png' });
  await page.click('#outfitNext');
  await page.click('#heroSheet [data-close]');

  // the 管理員: 掌門 is created, made admin in the cloud, and logs in again
  await page.click('#profileBtn');
  await page.click('#profileTabs button[data-pane="accountPane"]');
  await page.click('#accountModes button[data-mode="create"]');
  await page.fill('#aliasInput', '掌門');
  await page.fill('#passInput', '9999');
  await page.click('#accountSubmit');
  await page.waitForTimeout(400);
  console.log('create without gender:', await page.textContent('#profileNote'));
  await page.click('#newGenderRow button[data-g="boy"]');
  await page.click('#accountSubmit');
  await page.waitForTimeout(1200);
  db.profiles['掌門'].admin = true;
  await page.evaluate(function () { cloudRefresh(); });
  await page.waitForTimeout(800);
  console.log('admin:', await page.evaluate(function () { return account.alias + ' admin ' + account.admin + ' honor ' + purse.honor + ' | gender row in sheet hidden ' + (renderHero(), document.querySelector('#heroSheet .opt-row[data-opt="gender"]').hidden); }));
  await page.click('#profileBtn');
  await page.click('#profileTabs button[data-pane="newsPane"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotDir + '/k-news.png' });
  await page.locator('#heroCards .hero-card', { hasText: '小恬' }).click();
  await page.waitForTimeout(300);
  await page.click('#heroDetail [data-taels="100"]');
  await page.click('#heroDetail [data-taels="100"]');
  await page.click('#giftItems button[aria-label="仙鶴"]');
  await page.click('#giftGenderRow button[data-gender="boy"]');
  await page.fill('#giftHonor', '小書法家');
  await page.screenshot({ path: shotDir + '/k-admin-gift.png' });
  const before = await page.evaluate(function () { return purse.taels; });
  await page.click('#giftSend');
  await page.waitForTimeout(700);
  console.log('admin sent:', JSON.stringify(db.letters[db.letters.length - 1]), '| admin taels unchanged', before === await page.evaluate(function () { return purse.taels; }));
  await page.locator('#heroCards .hero-card', { hasText: '小恬' }).click();
  await page.waitForTimeout(300);
  // half a slide springs back and removes nobody; a full slide removes
  await page.evaluate(function () {
    const r = document.getElementById('removeSlider');
    r.value = 50;
    r.dispatchEvent(new Event('input'));
    r.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(300);
  console.log('half slide:', Object.keys(db.profiles).join(','), '| slider back to', await page.evaluate(function () { return document.getElementById('removeSlider').value; }));
  await page.screenshot({ path: shotDir + '/k-slider.png' });
  await page.evaluate(function () {
    const r = document.getElementById('removeSlider');
    r.value = 100;
    r.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(400);
  console.log('held 0.4 s, asked yet:', await page.evaluate(function () { return !document.getElementById('confirmSheet').hidden; }), '| full shine', await page.evaluate(function () { return document.getElementById('giftRemove').classList.contains('full'); }));
  await page.locator('#giftRemove').screenshot({ path: shotDir + '/k-slide-full.png' });
  await page.waitForTimeout(1250);
  console.log('held 1.65 s: pressed', await page.evaluate(function () { return document.getElementById('giftRemove').classList.contains('pressed'); }), '| asked yet', await page.evaluate(function () { return !document.getElementById('confirmSheet').hidden; }));
  await page.locator('#giftRemove').screenshot({ path: shotDir + '/k-slide-pressed.png' });
  await page.waitForTimeout(400);
  console.log('held 2 s, asked:', await page.evaluate(function () { return !document.getElementById('confirmSheet').hidden + ' | ' + document.getElementById('confirmText').textContent; }));
  await page.screenshot({ path: shotDir + '/k-confirm.png' });
  await page.click('#confirmYes');
  await page.waitForTimeout(800);
  console.log('after 逐出江湖:', Object.keys(db.profiles).join(','), '|', await page.evaluate(function () {
    return Array.from(document.querySelectorAll('#heroCards .hero-card')).map(function (c) { return c.getAttribute('aria-label'); }).join(',');
  }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
