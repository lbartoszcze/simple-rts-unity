const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 760 }, deviceScaleFactor: 2, bypassCSP: true });
  await ctx.route('**/*', (r) => r.continue({ headers: { ...r.request().headers(), 'Cache-Control': 'no-cache' } }));
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  page.on('console', (msg) => console.error('CONSOLE [' + msg.type() + ']:', msg.text()));
  page.on('requestfailed', (req) => console.error('REQ FAILED:', req.url(), req.failure()?.errorText));
  await page.goto('https://lbartoszcze.github.io/simple-rts-unity/demos/tiers.html?cb=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000); // wait for soldier glb to download
  await page.screenshot({ path: '/tmp/_smoketest/tiers-page.png', fullPage: true });
  await browser.close();
})();
