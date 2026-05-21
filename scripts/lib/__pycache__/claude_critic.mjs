// Vision-capable client for /api/animation-critic. The model-router upstream
// (Claude Code subscription) accepts text prompts only — but rev 00021 now
// pre-approves WebFetch via --settings JSON, so the agent can pull HTTPS
// URLs from its prompt and actually look at the bytes.
//
// Pipeline:
//   1. Pick N composite frames from .work/credential-hook/cmp/<clip>/
//   2. Stack them into one tall PNG (1 frame per row, side-by-side
//      reference|production already in the composite).
//   3. Upload to gs://wisent-gcp-bucket/critic-frames/<ts>.png
//   4. Generate a 10-minute signed URL.
//   5. POST to /api/animation-critic mode=diagnostic, embedding the URL
//      in the context field with a WebFetch instruction.
//   6. Real Claude pulls the URL and describes actual pixel content.
//
// Usage: node claude_critic.mjs <clip> [framePicks=06,12,18,24] [endpoint]

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [clip, picksArg, endpointArg] = process.argv.slice(2);
if (!clip) {
  console.error('usage: claude_critic.mjs <clip> [framePicks=06,12,18,24] [endpoint]');
  process.exit(1);
}
const picks = (picksArg ? picksArg.split(',') : ['06', '12', '18', '24']).map(p => p.padStart(2, '0'));
const ENDPOINT = endpointArg || process.env.CRITIC_ENDPOINT || 'https://content.wisent.ai/api/animation-critic';
const CRON_SECRET = process.env.CRON_SECRET || 'wisent-content-cron-secret-2024';
const FF = '/opt/homebrew/bin/ffmpeg';
const GSUTIL = '/opt/homebrew/bin/gsutil';
const CMP_DIR = '.work/credential-hook/cmp/' + clip;
const TS = Date.now();
const WORK = join(tmpdir(), 'critic_' + clip + '_' + TS);
mkdirSync(WORK, { recursive: true });

const framePaths = [];
for (const p of picks) {
  const src = CMP_DIR + '/f' + p + '.png';
  if (!existsSync(src)) { console.error('missing frame: ' + src); process.exit(2); }
  framePaths.push(src);
}
const stackInput = join(WORK, 'concat.txt');
execFileSync('/bin/sh', ['-c', 'printf "%s\\n" ' + framePaths.map(p => "'" + p + "'").join(' ') + ' > ' + stackInput]);
const stackedPath = join(WORK, 'stacked_' + clip + '.png');
execFileSync(FF, ['-y', '-loglevel', 'error', ...framePaths.flatMap(p => ['-i', p]),
  '-filter_complex', framePaths.map((_, i) => `[${i}:v]`).join('') + `vstack=inputs=${framePaths.length}`,
  stackedPath]);
const sz = statSync(stackedPath).size;
console.log('[critic] stacked ' + framePaths.length + ' frames -> ' + stackedPath + ' (' + sz + ' bytes)');

// Upload + v4-sign a 15-minute URL via the google-cloud-storage Python SDK.
// gsutil signurl can't load pyopenssl on this machine (its bundled Python
// ignores user-site packages); the small helper script uses pure Python 3.12
// and the user's ADC end-to-end.
const objPath = 'critic-frames/' + clip + '_' + TS + '.png';
const SIGN = '/Users/lukaszbartoszcze/work/simple-rts-unity/scripts/lib/__pycache__/sign_gcs_url.py';
const PY = '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12';
const signedUrl = execFileSync(PY, [SIGN, stackedPath, 'wisent-gcp-bucket', objPath, '900'], { encoding: 'utf8' }).trim();
console.log('[critic] uploaded + signed (' + signedUrl.slice(0, 120) + '...)');

const ctxText = [
  'A side-by-side comparison grid has been uploaded for you to inspect.',
  `Use the WebFetch tool to retrieve this URL and analyze the actual pixel content:`,
  signedUrl,
  ``,
  `The grid is ${framePaths.length} frames stacked vertically (one per row).`,
  `Within EACH row: LEFT half is the REFERENCE figure (low-poly humanoid, ground-truth animation).`,
  `RIGHT half of each row is the PRODUCTION figure (armored knight on canonical biped, retargeted).`,
  `Clip being inspected: ${clip}.`,
  ``,
  `After fetching the image, describe what the production figure looks like in each frame and identify any visible defects: tearing, shards, collapsed mesh, drag-along, skirt fan, leg/arm asymmetry. Compare to the reference. Then emit your JSON verdict.`,
].join('\n');

const body = {
  clip,
  mode: 'diagnostic',
  diagnostic: {
    build_id: clip + ' composite via WebFetch URL @ ' + new Date().toISOString(),
    notes: 'See context for the WebFetch URL. Inspect the image before producing the verdict.',
  },
  context: ctxText,
};

console.log('[critic] POST ' + ENDPOINT);
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-cron-secret': CRON_SECRET },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log('HTTP ' + res.status);
let parsed;
try { parsed = JSON.parse(text); } catch { console.log(text.slice(0, 2000)); process.exit(4); }
if (!res.ok) { console.log(JSON.stringify(parsed, null, 2)); process.exit(5); }
console.log('\n=== VERDICT ===');
console.log('model:        ' + parsed.model);
console.log('verdict:      ' + parsed.verdict);
console.log('summary:      ' + parsed.summary);
console.log('defects:');
for (const d of (parsed.defects || [])) console.log('  - ' + d);
console.log('proposed_fix: ' + parsed.proposed_fix);
if (parsed.usage) console.log('usage: ' + JSON.stringify(parsed.usage));
console.log('\n=== RAW (first 2KB) ===');
console.log((parsed.raw || '').slice(0, 2000));
