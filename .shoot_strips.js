const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEAPONS = 'axe spear mace halberd lance pike scythe'.split(' ');
const RACES = 'humans dwarves elves skeletons'.split(' ');

async function captureStrip(page, selector, frames, intervalMs, outDir, prefix) {
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < frames; i++) {
    const handle = await page.$(selector);
    const box = await handle.boundingBox();
    if (!box) throw new Error('no box for ' + selector);
    await page.screenshot({ path: path.join(outDir, `${prefix}-${i.toString().padStart(2, '0')}.png`), clip: box });
    if (i < frames - 1) await page.waitForTimeout(intervalMs);
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 2000 }, deviceScaleFactor: 2 });
  await ctx.route('**/*', (r) => r.continue({ headers: { ...r.request().headers(), 'Cache-Control': 'no-cache' } }));
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  await page.goto('https://lbartoszcze.github.io/simple-rts-unity/demos/tiers.html?cb=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  const out = '/tmp/_smoketest/anim-strips';
  fs.mkdirSync(out, { recursive: true });
  console.log('soldier walk');
  await captureStrip(page, 'canvas[data-soldier="Walk"]', 6, 200, out, 'soldier-walk');
  console.log('soldier idle');
  await captureStrip(page, 'canvas[data-soldier="TPose"]', 6, 200, out, 'soldier-idle');
  for (const w of WEAPONS) {
    console.log('weapon', w);
    await captureStrip(page, `canvas[data-weapon="${w}"]`, 6, 250, out, `weapon-${w}`);
  }
  for (const r of RACES) {
    console.log('race', r);
    await captureStrip(page, `canvas[data-race="${r}"]`, 4, 300, out, `race-${r}`);
  }
  await browser.close();
  console.log('DONE');
})();
