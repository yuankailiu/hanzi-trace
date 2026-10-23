// usage: node test_sentences.js <base url> <shot dir> — 句子 and 我的句子本 in landscape and portrait
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
async function drawStroke(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(420);
}
function report(page) {
  return page.evaluate(function () {
    const s = state.sentence;
    const el = document.getElementById('sentence');
    const r = el.getBoundingClientRect();
    const box = document.getElementById('box').getBoundingClientRect();
    return (s ? s.s + ' | write ' + state.chars.join('') + ' | 注音 ' + (s.z ? s.z.filter(Boolean).length : 0) + '/' + Array.from(s.s).length : 'no sentence') +
      ' | panel ' + Math.round(r.width) + 'x' + Math.round(r.height) + (el.classList.contains('vertical') ? ' vertical' : ' strip') +
      ' | box ' + builtSize + ' | overlap ' + !(r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom) +
      ' | overflow x=' + (document.documentElement.scrollWidth - innerWidth) + ' y=' + (document.documentElement.scrollHeight - innerHeight);
  });
}

(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.goto(base + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.evaluate(function () {
    window.spoken = [];
    const real = window.say;
    window.say = function (t, a) { window.spoken.push(a ? t + '→' + a : t); real(t, a); };
  });
  await page.click('#settingsBtn');
  await page.click('#settingsSheet .opt-row[data-opt="content"] button[data-val="sentences"]');
  await page.click('#settingsSheet [data-close]');
  await page.waitForTimeout(1500);
  console.log('iPad landscape:', await report(page), '| said', JSON.stringify(await page.evaluate(function () { return window.spoken.slice(-1); })));
  await page.screenshot({ path: shotDir + '/s-land.png' });

  // a sentence of the bank with two characters to write: trace both
  await page.evaluate(function () {
    const s = sentences.find(function (x) { return x.s === '媽媽出門上班。'; });
    loadSentence(s, true);
  });
  await page.waitForTimeout(900);
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(800);
  for (let c = 0; c < 2; c++) {
    const n = await page.evaluate(function () { return charData.strokes.length; });
    for (let k = 0; k < n; k++) await drawStroke(page, await strokePoints(page, k));
    await page.waitForTimeout(900);
    if (c === 0) {
      console.log('after 出:', await page.evaluate(function () {
        return Array.from(document.querySelectorAll('#sentence .cell.target')).map(function (c) { return c.className; }).join(' / ') + ' | 注音卡 ' + document.getElementById('zy').textContent;
      }));
      await page.click('#nextBtn');
      await page.waitForTimeout(900);
    }
  }
  await page.waitForTimeout(1800);
  console.log('done:', await page.evaluate(function () {
    return 'next action ' + document.getElementById('nextBtn').dataset.action + ' | said ' + JSON.stringify(window.spoken.slice(-2)) + ' | done cells ' + document.querySelectorAll('#sentence .cell.done').length;
  }));
  await page.screenshot({ path: shotDir + '/s-done.png' });

  // reading: a tap on 還 says it as 孩; the speaker reads the whole sentence in its readings; 挑字 adds 事
  await page.evaluate(function () {
    window.spoken = [];
    loadSentence(sentences.find(function (x) { return x.s.indexOf('他還敢來') >= 0; }));
  });
  await page.waitForTimeout(1200);
  await page.evaluate(function () {
    const cells = Array.from(document.querySelectorAll('#sentence .cell'));
    cells.find(function (c) { return c.textContent.indexOf('還') === 0; }).click();
    document.querySelector('#sentence .sentence-say').click();
  });
  console.log('還 and the sentence:', JSON.stringify(await page.evaluate(function () { return window.spoken; })));
  // 挑字: a draft in any order; an empty draft is refused with a shake; tiles all stand alike
  function tap(page, ch) {
    return page.evaluate(function (c) {
      Array.from(document.querySelectorAll('#sentence .cell')).find(function (x) { return x.textContent.indexOf(c) === 0; }).click();
    }, ch);
  }
  await page.click('#sentence .sentence-pick');
  await tap(page, '事');
  await tap(page, '還');
  await tap(page, '事');
  console.log('draft emptied:', await page.evaluate(function () { return pickDraft.length + ' | still writing ' + state.chars.join(''); }));
  await page.click('#sentence .sentence-pick');
  await page.waitForTimeout(150);
  console.log('confirm empty:', await page.evaluate(function () { return 'picking ' + picking + ' | shake ' + document.getElementById('sentence').classList.contains('shake'); }), '| said', JSON.stringify(await page.evaluate(function () { return window.spoken.slice(-1); })));
  await tap(page, '事');
  await tap(page, '他');
  await page.screenshot({ path: shotDir + '/s-pick.png' });
  await page.click('#sentence .sentence-pick');
  await page.waitForTimeout(1000);
  console.log('after 挑字 事他:', await page.evaluate(function () { return state.chars.join('') + ' | picking ' + picking; }));
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(800);
  console.log('tile tops:', await page.evaluate(function () {
    return Array.from(document.querySelectorAll('#sentence .cell.target')).map(function (c) {
      return Math.round(c.querySelector('.glyph').getBoundingClientRect().top - c.getBoundingClientRect().top);
    }).join(',');
  }));
  await page.evaluate(function () {
    window.spoken = [];
    loadSentence(sentences.find(function (x) { return x.s === '化悲憤為力量'; }), true);
  });
  await page.waitForTimeout(1000);
  console.log('化悲憤為力量:', JSON.stringify(await page.evaluate(function () { return window.spoken; })), '| 注音卡', await page.textContent('#zy'));

  // 我的句子本
  await page.click('#customBtn');
  await page.click('#customTabs button[data-pane="mySentPane"]');
  await page.fill('#sentenceInput', '我［愛］吃蘋果。\n今天天氣很好');
  await page.click('#saveSentencesBtn');
  await page.waitForTimeout(1500);
  console.log('my sentence:', await report(page), '| content', await page.evaluate(function () { return state.content + ' ' + state.slist.length; }));

  // portrait
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(1200);
  console.log('iPad portrait:', await report(page));
  await page.screenshot({ path: shotDir + '/s-ipad-port.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(function () { const s = sentences.find(function (x) { return x.s === '弟弟把玩具收好了。'; }); loadSentence(s); });
  await page.waitForTimeout(1200);
  console.log('iPhone portrait:', await report(page));
  await page.screenshot({ path: shotDir + '/s-phone.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(function () { const s = sentences.find(function (x) { return x.src === 'm' && Array.from(x.s).length > 18; }); loadSentence(s); });
  await page.waitForTimeout(1200);
  console.log('desktop long:', await report(page));
  await page.screenshot({ path: shotDir + '/s-desktop-long.png' });
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
