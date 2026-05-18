// Render each race × each clip as a side-by-side mp4 the user can watch.
// Drives clip_compare.html via Playwright, captures 30 frames, stitches to
// mp4 with ffmpeg at the clip's intended playback fps.
import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';

const RACES = ['humans', 'dwarves', 'elves', 'skeletons'];
// Durations match the Unity #219979 reference clips baked into the retargeted
// GLBs. displayFps = 30 frames / duration so the mp4 plays at real speed.
const CLIPS = [
  // [name, durationSeconds, displayFps]
  ['idle',   1.73, 17],
  ['walk',   0.67, 45],
  ['run',    0.60, 50],
  ['attack', 0.87, 34],
];
const OUTDIR = '/Users/lukaszbartoszcze/work/simple-rts-unity/.work/credential-hook/videos';
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });

const HTML = '/Users/lukaszbartoszcze/work/simple-rts-unity/web/demos/__pycache__/clip_compare.html';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

function setHtmlFor(race) {
  // Replace ONLY the race name in any _axe.glb reference, preserving ?cb= etc.
  // Also defensively ensure the prodUrl line still has '?cb='.
  let text = execFileSync('/bin/cat', [HTML], { encoding: 'utf8' });
  text = text.replace(/\b(humans|dwarves|elves|skeletons)_axe\.glb/g, `${race}_axe.glb`);
  text = text.replace(
    /(prodUrl\s*=\s*'\.\.\/\.\.\/art\/models\/[a-z]+_axe\.glb)(\?cb=)?'/,
    `$1?cb='`
  );
  writeFileSync(HTML, text);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });

for (const race of RACES) {
  setHtmlFor(race);
  for (const [clip, dur, fps] of CLIPS) {
    const tmpDir = `${OUTDIR}/_tmp_${race}_${clip}`;
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    // Clean previous frames.
    for (const f of readdirSync(tmpDir)) if (f.endsWith('.png')) unlinkSync(`${tmpDir}/${f}`);

    const N = 30;
    const page = await ctx.newPage();
    const url = `http://127.0.0.1:8765/demos/__pycache__/clip_compare.html?clip=${clip}&cb=${Date.now()}`;
    await page.goto(url, { waitUntil: 'load' });
    for (let i = 0; i < 60; i++) {
      const r = await page.evaluate(() => window.__readyAll && window.__readyAll());
      if (r) break;
      await page.waitForTimeout(500);
    }
    for (let f = 0; f < N; f++) {
      const t = (f / (N - 1)) * dur;
      await page.evaluate(time => window.__seekAll(time), t);
      await page.waitForTimeout(60);
      const png = await page.screenshot({ fullPage: false });
      writeFileSync(`${tmpDir}/f${String(f).padStart(2,'0')}.png`, png);
    }
    await page.close();

    const out = `${OUTDIR}/${race}_${clip}.mp4`;
    spawnSync(FFMPEG, [
      '-y', '-framerate', String(fps),
      '-i', `${tmpDir}/f%02d.png`,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', out
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
    console.log(`wrote ${out}`);
  }
}
await browser.close();
console.log(`\nAll videos in ${OUTDIR}/`);
