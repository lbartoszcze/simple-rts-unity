// Diagnostic: tally which skeleton joints dominate the lower-body vertices of
// a skinned GLB. Confirms whether the production leg mesh is actually weighted
// to thigh/shin (so retargeted leg rotation deforms it) or mis-weighted to
// hips/root (bones rotate but legs visually do not move).
import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const d = await io.read(process.argv[2]);
const root = d.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints().map(j => j.getName());
let mesh = null;
for (const n of root.listNodes()) { if (n.getMesh() && n.getSkin()) { mesh = n.getMesh(); break; } }
const prims = mesh.listPrimitives();
let minY = 1e9, maxY = -1e9;
for (const p of prims) { const a = p.getAttribute('POSITION').getArray(); for (let i = 0; i < a.length; i += 3) { if (a[i+1] < minY) minY = a[i+1]; if (a[i+1] > maxY) maxY = a[i+1]; } }
const span = maxY - minY;
const tally = {};
let cnt = 0;
for (const prim of prims) {
  const pos = prim.getAttribute('POSITION').getArray();
  const J = prim.getAttribute('JOINTS_0').getArray();
  const W = prim.getAttribute('WEIGHTS_0').getArray();
  const nv = pos.length / 3;
  for (let i = 0; i < nv; i++) {
    if ((pos[i*3+1] - minY) / span > 0.35) continue;
    cnt++;
    for (let k = 0; k < 4; k++) { const w = W[i*4+k]; if (w <= 0) continue; const jn = joints[J[i*4+k]]; tally[jn] = (tally[jn] || 0) + w; }
  }
}
const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('lower-body (bottom 35% Y) verts:', cnt, ' Yspan=', span.toFixed(2));
for (const [b, w] of sorted) console.log('  ' + b.padEnd(13) + (w / cnt).toFixed(3));
