// usage: node voice_names.js <base url> — how voices named as on an iPad (any language, older names, ids) are sorted out
const { chromium } = require('playwright');
(async function () {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.addInitScript(function () { window.speechSynthesis.speak = function () {}; });
  await page.route(/supabase/, function (route) { route.abort(); });
  await page.goto(process.argv[2] + '/index.html');
  await page.waitForSelector('#writer svg');
  console.log(await page.evaluate(function () {
    const voices = [
      { name: '美佳', lang: 'zh-TW', voiceURI: 'com.apple.voice.compact.zh-TW.Meijia' },
      { name: '美佳（增強版）', lang: 'zh-TW', voiceURI: 'com.apple.voice.enhanced.zh-TW.Meijia' },
      { name: '美佳（高品質）', lang: 'zh-TW', voiceURI: 'com.apple.voice.premium.zh-TW.Meijia' },
      { name: 'Mei-Jia', lang: 'zh-TW', voiceURI: 'com.apple.ttsbundle.Mei-Jia-compact' },
      { name: 'Meijia', lang: 'zh-TW', voiceURI: 'com.apple.voice.enhanced.zh-TW.Meijia' },
      { name: 'Meijia (Enhanced)', lang: 'zh-TW', voiceURI: 'x' },
      { name: 'Tingting', lang: 'zh-CN', voiceURI: 'com.apple.voice.compact.zh-CN.Tingting' },
    ];
    const rows = [];
    for (const v of voices) {
      const kinds = [];
      for (const id in VOICE_CHOICES) {
        if (VOICE_CHOICES[id].test(v)) kinds.push(id);
      }
      rows.push(v.name + ' [' + v.voiceURI.split('.').slice(-3).join('.') + '] → ' + (kinds.join(',') || '-') + ' score ' + voiceScore(v));
    }
    return rows.join('\n');
  }));
  await browser.close();
})();
