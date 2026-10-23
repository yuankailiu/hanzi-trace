// usage: node fit_test.js <base url> <shot dir> — 給 written small and to the lower right, with and without the fit
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
  await page.click('#guestStart');
  await page.waitForTimeout(1200);

  // no celebration, level-up or 奇遇 may cover the box between runs
  await page.evaluate(function () {
    window.queueCelebration = function () {};
    window.announceLevels = function () {};
    window.checkHonors = function () {};
    window.checkEncounter = function () {};
  });
  async function run(useFit, scale, dx, dy) {
    await page.evaluate(function () {
      state.stars['給'] = { trace: 3 };
      state.mode = 'watch';
      loadText('給');
    });
    await page.waitForTimeout(900);
    await page.click('#modes button[data-mode="write"]');
    await page.waitForTimeout(900);
    await page.evaluate(function (on) {
      fit.on = on;
      window.fitTime = 0;
      const real = window.fitAdd;
      window.fitAdd = function () {
        const t0 = performance.now();
        real.apply(null, arguments);
        window.fitTime += performance.now() - t0;
      };
    }, useFit);
    const n = await page.evaluate(function () { return charData.medians.length; });
    let done = 0;
    for (let k = 0; k < n; k++) {
      // her stroke: the model's, smaller and moved; a stroke refused is tried again the same way (it would be refused again)
      const pts = await page.evaluate(function (a) {
        const rect = document.getElementById('box').getBoundingClientRect();
        const out = [];
        for (const p of charData.medians[a.k]) {
          // smaller around the middle of the character, then moved
          // drifting: each stroke a little further off and smaller than the one before, as a hand that wanders
          const s = 1 - (1 - a.s) * a.k / 11;
          const x = 512 + s * (p[0] - 512) + a.dx * a.k / 11;
          const y = 388 + s * (p[1] - 388) + a.dy * a.k / 11;
          const sc = toScreen(x, y, builtSize);
          out.push({ x: rect.left + sc.x, y: rect.top + sc.y });
        }
        return out;
      }, { k: k, s: scale, dx: dx, dy: dy });
      const before = await page.evaluate(function () {
        const q = writer._quiz;
        if (q && !q.traced) {
          q.traced = true;
          const hs = q._handleSuccess.bind(q);
          q._handleSuccess = function (m) { window.trace2.push('success@' + q._currentStrokeIndex); return hs(m); };
          const inner = q.endUserStroke;
          q.endUserStroke = function () { window.trace.push('end pts ' + (q._userStroke ? q._userStroke.points.length : 'none')); return inner.apply(q, arguments); };
        }
        window.trace = [];
        window.trace2 = window.trace2 || [];
        return q ? q._currentStrokeIndex : -1;
      });
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down();
      for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(350);
      const after = await page.evaluate(function () { return writer._quiz ? writer._quiz._currentStrokeIndex : n; });
      if (after > before || after === -1) done += 1;
      else {
        console.log('   trace', JSON.stringify(await page.evaluate(function () { return window.trace2.join(' ') + ' | active ' + writer._quiz._isActive + ' | same quiz ' + (writer._quiz.traced === true); })));
        console.log('   stuck at stroke', k, await page.evaluate(function () { return 'index ' + writer._quiz._currentStrokeIndex + ' mistakes ' + writer._quiz._mistakesOnStroke + ' fit.on ' + fit.on + ' model pts ' + fit.model.length + ' mode ' + state.mode + ' char ' + currentChar(); }));
        break;
      }
    }
    const out = await page.evaluate(function () {
      return 'fit sx ' + fit.sx.toFixed(2) + ' sy ' + fit.sy.toFixed(2) + ' tx ' + Math.round(fit.tx) + ' ty ' + Math.round(fit.ty) + ' | fitting took ' + window.fitTime.toFixed(2) + ' ms in all';
    });
    return done + ' of ' + n + ' strokes accepted first time | ' + out;
  }
  for (const c of [[0.75, 160, -160], [0.7, 220, -200], [0.8, -200, -150], [1.0, 260, 0], [1.0, 0, -260], [0.6, 250, -250], [1.0, 330, -200], [0.55, 300, -300]]) {
    console.log('scale ' + c[0] + ' shift ' + c[1] + ',' + c[2] + ' fit off:', await run(false, c[0], c[1], c[2]));
    console.log('scale ' + c[0] + ' shift ' + c[1] + ',' + c[2] + ' fit on :', await run(true, c[0], c[1], c[2]));
  }
  await page.screenshot({ path: process.argv[3] + '/fit-on.png' });
  console.log('as the model, fit on      :', await run(true, 1, 0, 0));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
