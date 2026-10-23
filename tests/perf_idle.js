// usage: node perf_idle.js <base url> — what the page costs while nobody touches it, with parts switched off in turn
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  await page.click('#gongBtn');
  await page.waitForTimeout(1500);
  await page.click('#guestStart');
  await page.waitForTimeout(3000);
  await page.click('#modes button[data-mode="trace"]');
  await page.waitForTimeout(3000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  async function measure(label) {
    const a = await cdp.send('Performance.getMetrics');
    await page.waitForTimeout(8000);
    const b = await cdp.send('Performance.getMetrics');
    const m = {};
    for (const x of b.metrics) m[x.name] = x.value;
    for (const x of a.metrics) m[x.name] -= x.value;
    console.log(label.padEnd(36) + ' busy ' + (100 * m.TaskDuration / 8).toFixed(0).padStart(3) + '% | script ' + m.ScriptDuration.toFixed(2) + ' s | style ' + m.RecalcStyleCount + ' | layout ' + m.LayoutCount);
  }
  await measure('idle, as it is');
  await page.evaluate(function () { window.avatarTick = function () {}; });
  await page.waitForTimeout(500);
  await measure('hero animation stopped');
  await page.evaluate(function () { if (music.el) music.el.pause(); });
  await measure('music paused too');
  await page.evaluate(function () { document.querySelectorAll('*').forEach(function (el) { el.style.animation = 'none'; }); });
  await measure('every CSS animation off too');
  await page.evaluate(function () { document.getElementById('stageCanvas').style.display = 'none'; });
  await measure('stage canvas hidden too');
  await browser.close();
})();
