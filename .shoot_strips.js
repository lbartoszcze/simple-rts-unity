// Also: poly counter — run with `node .shoot_strips.js polys`
if (process.argv.includes('polys')) {
  const fs = require('fs'); const path = require('path');
  const dir = __dirname + '/web/art/models';
  for (const fn of fs.readdirSync(dir).sort()) {
    if (!fn.endsWith('.glb')) continue;
    const buf = fs.readFileSync(path.join(dir, fn));
    const jsonLen = buf.readUInt32LE(12);
    const j = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
    const acc = j.accessors || [];
    let tri = 0, vert = 0;
    for (const mesh of j.meshes || []) for (const prim of mesh.primitives || []) {
      const mode = prim.mode == null ? 4 : prim.mode;
      if (prim.indices != null) tri += mode === 4 ? Math.floor(acc[prim.indices].count / 3) : 0;
      else if (prim.attributes && prim.attributes.POSITION != null) tri += mode === 4 ? Math.floor(acc[prim.attributes.POSITION].count / 3) : 0;
      if (prim.attributes && prim.attributes.POSITION != null) vert += acc[prim.attributes.POSITION].count;
    }
    console.log(fn.padEnd(20), 'tris=' + tri.toString().padStart(6), 'verts=' + vert.toString().padStart(6), 'size=' + (buf.length / 1024).toFixed(1) + 'KB');
  }
  process.exit(0);
}

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
