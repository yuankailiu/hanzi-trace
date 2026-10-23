// usage: node lite.js <base url> — an iPad 6 starts with 特效 精簡; writing goes on under the celebration banner
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  for (const dev of [
    { name: 'iPad 6', ua: 'Mozilla/5.0 (iPad; CPU OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Mobile/15E148 Safari/604.1', w: 1024, h: 768, touch: true },
    { name: 'Mac', ua: '', w: 1180, h: 820, touch: false },
  ]) {
    const opts = { viewport: { width: dev.w, height: dev.h }, screen: { width: dev.w, height: dev.h }, hasTouch: dev.touch };
    if (dev.ua) opts.userAgent = dev.ua;
    const context = await browser.newContext(opts);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', function (e) { errors.push(e.message); });
    await page.addInitScript(function (d) {
      window.speechSynthesis.speak = function () {};
      // an iPad 6 screen, as Safari reports it (the test browser keeps its own otherwise)
      if (d.touch) {
        Object.defineProperty(screen, 'width', { get: function () { return 768; } });
        Object.defineProperty(screen, 'height', { get: function () { return 1024; } });
      }
    }, dev);
    await context.route(/supabase/, function (route) { route.abort(); });
    await page.goto(process.argv[2] + '/index.html');
    await page.waitForSelector('#writer svg');
    await page.click('#gongBtn');
    await page.waitForTimeout(1500);
    await page.click('#guestStart');
    await page.waitForTimeout(1200);
    console.log(dev.name + ':', await page.evaluate(function () {
      return 'slowDevice ' + slowDevice() + ' ua iPad ' + /iPad/.test(navigator.userAgent) + ' screen ' + screen.width + 'x' + screen.height + ' | lite ' + state.lite + ' | html.lite ' + document.documentElement.classList.contains('lite') + ' | sheet backdrop blur "' + getComputedStyle(document.getElementById('settingsSheet')).backdropFilter + '"';
    }));
    // the banner up, a stroke on the box still counts
    await page.evaluate(function () {
      state.stars['一'] = { trace: 3 };
      loadText('一');
    });
    await page.waitForTimeout(900);
    await page.click('#modes button[data-mode="trace"]');
    await page.waitForTimeout(900);
    await page.evaluate(function () { celebrate([], '練成了！'); });
    await page.waitForTimeout(300);
    const pts = await page.evaluate(function () {
      const rect = document.getElementById('box').getBoundingClientRect();
      return charData.medians[0].map(function (p) { const s = toScreen(p[0], p[1], builtSize); return { x: rect.left + s.x, y: rect.top + s.y }; });
    });
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    console.log('  under the banner:', await page.evaluate(function () {
      return 'banner shown ' + !document.getElementById('banner').hidden + ' | stroke taken ' + (!writer._quiz || writer._quiz._currentStrokeIndex > 0 || !resultEl.hidden);
    }));
    console.log('  errors:', errors.length ? errors : 'none');
    await context.close();
  }
  await browser.close();
})();
