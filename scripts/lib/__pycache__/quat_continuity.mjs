// Enforce quaternion-sign continuity on every rotation channel in a GLB.
// retarget_clip back-solves newLocal = inv(parentWorld) * newW per frame
// and writes the raw quat without comparing to the previous keyframe.
// q and -q encode the same rotation but linear interpolation in the mixer
// takes the long way around when they alternate, producing flip-pops and
// 180-degree artefacts in any rotation-magnitude metric. Walking each
// sampler from frame 0 and negating any quat whose dot with its predecessor
// is negative fixes both the rendered playback and the score in one pass.
// Usage: node quat_continuity.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) { console.error('usage: quat_continuity.mjs <in.glb> <out.glb>'); process.exit(1); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

let chFixed = 0, qFlipped = 0;
for (const anim of root.listAnimations()) {
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'rotation') continue;
    const acc = ch.getSampler().getOutput();
    const arr = acc.getArray();
    const n = arr.length / 4;
    if (n < 2) continue;
    chFixed++;
    let px = arr[0], py = arr[1], pz = arr[2], pw = arr[3];
    for (let i = 1; i < n; i++) {
      const x = arr[i*4], y = arr[i*4+1], z = arr[i*4+2], w = arr[i*4+3];
      const dot = px*x + py*y + pz*z + pw*w;
      if (dot < 0) {
        arr[i*4]   = -x;
        arr[i*4+1] = -y;
        arr[i*4+2] = -z;
        arr[i*4+3] = -w;
        px = -x; py = -y; pz = -z; pw = -w;
        qFlipped++;
      } else {
        px = x; py = y; pz = z; pw = w;
      }
    }
    acc.setArray(arr);
  }
}

await io.write(outPath, doc);
const st = await stat(outPath);
console.log(`[qc] processed ${chFixed} rotation channels, negated ${qFlipped} keyframes, wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB)`);
