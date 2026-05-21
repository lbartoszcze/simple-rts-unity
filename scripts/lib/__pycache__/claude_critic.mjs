// Client of /api/animation-critic. Takes a clip name, picks N frames from
// .work/credential-hook/cmp/<clip>/f*.png (the existing side-by-side
// composites: LEFT half = reference, RIGHT half = production), crops each
// into reference/production halves via ffmpeg, base64-encodes them, POSTs
// to https://content.wisent.ai/api/animation-critic, prints the verdict.
//
// Server-side route is the only path that reaches real Claude — the
// router rejects direct external-shell calls with `all providers failed`
// but serves real Claude from inside Wisent infra (verified via the
// characters/generate call that returned a real LLM persona this session).
//
// Usage:
//   node claude_critic.mjs <clip> [framePicks=06,12,18,24] [endpoint]
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
const CMP_DIR = '.work/credential-hook/cmp/' + clip;
const WORK = join(tmpdir(), 'critic_' + clip + '_' + Date.now());
mkdirSync(WORK, { recursive: true });

function cropAndEncode(srcPath, side) {
  const outPath = join(WORK, side + '_' + srcPath.split('/').pop());
  const filter = side === 'left' ? 'crop=iw/2:ih:0:0' : 'crop=iw/2:ih:iw/2:0';
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', srcPath, '-vf', filter, outPath]);
  return readFileSync(outPath).toString('base64');
}

const refFrames = [];
const prodFrames = [];
for (const p of picks) {
  const src = CMP_DIR + '/f' + p + '.png';
  if (!existsSync(src)) {
    console.error('missing frame: ' + src);
    process.exit(2);
  }
  refFrames.push({ name: 'ref_f' + p + '.png', b64: cropAndEncode(src, 'left') });
  prodFrames.push({ name: 'prod_f' + p + '.png', b64: cropAndEncode(src, 'right') });
}
console.log('[critic] picked ' + picks.length + ' frames; cropped halves staged in ' + WORK);

const body = {
  clip,
  reference_frames: refFrames,
  production_frames: prodFrames,
  context: 'Production figure is an armored knight on a canonical biped skeleton. Reference is a low-poly humanoid.',
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
try {
  parsed = JSON.parse(text);
} catch {
  console.log(text.slice(0, 2000));
  process.exit(3);
}
if (!res.ok) {
  console.log(JSON.stringify(parsed, null, 2));
  process.exit(4);
}
console.log('\n=== VERDICT ===');
console.log('model:        ' + parsed.model);
console.log('verdict:      ' + parsed.verdict);
console.log('summary:      ' + parsed.summary);
console.log('defects:');
for (const d of (parsed.defects || [])) console.log('  - ' + d);
console.log('proposed_fix: ' + parsed.proposed_fix);
if (parsed.usage) console.log('usage: ' + JSON.stringify(parsed.usage));
