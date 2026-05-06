const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 760 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.error('CONSOLE:', msg.text()); });
  await page.goto('https://lbartoszcze.github.io/simple-rts-unity/demos/tiers.html?cb=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/tmp/_smoketest/tiers-page.png', fullPage: true });
  await browser.close();
})();
