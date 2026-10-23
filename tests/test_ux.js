// usage: node test_ux.js <base url> <screenshot dir>
// rapid taps in 看筆順, the 起筆 ripple, the hint ripple, brush strokes, tap-to-continue, spoken buttons
const { chromium } = require('playwright');
const base = process.argv[2];
const shotDir = process.argv[3];

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
async function drawStroke(page, pts, steps) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: steps || 6 });
  await page.mouse.up();
  await page.waitForTimeout(450);
}

(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.evaluate(function () {
    window.spoken = [];
    const real = window.say;
    window.say = function (t) { window.spoken.push(t); real(t); };
  });
  await page.evaluate(function () { loadText('永'); });
  await page.waitForTimeout(4500);

  // 看筆順: five taps in quick succession; every stroke must end fully drawn
  const c = await page.evaluate(function () { const r = document.getElementById('box').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const ripples = [];
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(40);
    ripples.push(await page.evaluate(function () {
      const r = document.querySelector('#box .ripple:last-of-type');
      return r ? r.style.left + ',' + r.style.top : 'none';
    }));
  }
  await page.waitForTimeout(3000);
  console.log('watch taps:', await page.evaluate(function () {
    const strokes = writer._renderState.state.character.main.strokes;
    const portions = [];
    for (let i = 0; i < stepNum; i++) portions.push(strokes[i].displayPortion.toFixed(2));
    const s0 = charData.medians[0][0];
    const p0 = toScreen(s0[0], s0[1], builtSize);
    return 'stepNum ' + stepNum + ' | portions ' + portions.join(' ') + ' | stroke 1 start at ' + p0.x.toFixed(0) + ',' + p0.y.toFixed(0);
  }), '| first ripples', ripples.slice(0, 2).join(' / '));

  // 描字 with 保留我寫的: wrong strokes until the hint shows, then a correct brush stroke
  await page.evaluate(function () { state.keep = true; });
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(900);
  const wrong = [{ x: c.x - 150, y: c.y + 150 }, { x: c.x - 60, y: c.y + 200 }];
  await drawStroke(page, wrong);
  await drawStroke(page, wrong);
  console.log('hint ripple after 2 misses:', await page.evaluate(function () { return document.querySelectorAll('#box .ripple').length; }));
  await page.waitForTimeout(1300);
  const n = await page.evaluate(function () { return charData.strokes.length; });
  for (let s = 0; s < n; s++) await drawStroke(page, await strokePoints(page, s), s === 1 ? 2 : 8);
  await page.waitForTimeout(300);
  console.log('kept brush strokes:', await page.evaluate(function () {
    const paths = document.querySelectorAll('#mine path');
    return paths.length + ' paths, first d length ' + (paths[0] ? paths[0].getAttribute('d').length : 0) + ' | HW drawing color ' + writer._options.drawingColor;
  }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: shotDir + '/u-brush.png', clip: await page.evaluate(function () { const r = document.getElementById('box').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }) });

  // tap-to-continue: the hint shows, a tap on the box goes on (永 is one character: 換自己寫)
  await page.waitForTimeout(800);
  console.log('next hint:', await page.evaluate(function () { return !nextHint.hidden + ' ' + nextHint.textContent; }));
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(800);
  console.log('after tap on box: mode', await page.evaluate(function () { return state.mode + ' hint hidden ' + nextHint.hidden; }));

  // spoken buttons: gender, tabs, settings rows
  await page.evaluate(function () { window.spoken = []; });
  await page.click('#playerCard');
  await page.waitForTimeout(400);
  await page.click('#heroSheet .opt-row[data-opt="gender"] button[data-val="boy"]');
  await page.waitForTimeout(100);
  await page.locator('#shopTabs button').nth(1).click();
  await page.waitForTimeout(100);
  await page.locator('#shopTabs button').nth(0).click();
  await page.waitForTimeout(100);
  await page.click('#heroSheet [data-close]');
  await page.waitForTimeout(300);
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.click('#settingsSheet .opt-row[data-opt="radical"] button[data-val="1"]');
  await page.waitForTimeout(100);
  await page.click('#settingsSheet .opt-row[data-opt="grid"] button[data-val="tian"]');
  await page.waitForTimeout(100);
  console.log('spoken:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  await page.click('#settingsSheet [data-close]');
  await page.waitForTimeout(300);
  await page.evaluate(function () { window.spoken = []; });
  await page.click('#sayBtn');
  await page.waitForTimeout(150);
  await page.click('#diceBtn');
  await page.waitForTimeout(1500);
  console.log('say button then dice:', JSON.stringify(await page.evaluate(function () { return window.spoken; })), '| new word', await page.evaluate(function () { return state.text; }));
  await page.screenshot({ path: shotDir + '/u-plaque.png' });
  console.log('hero style row gone:', await page.evaluate(function () { return !document.querySelector('[data-opt="heroStyle"]'); }));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
