// Fully-automated, LLM-free, LBS-free skinning quality scorer.
// Predicts tearing/no-stride from the skin weights + bone rotation magnitudes
// in the rigged+animated GLB itself. Two scores per clip:
//
//   tear   = mean over mesh edges (a,b) of
//              sum_{i,j} Wa[i] * Wb[j] * |rotMag(jointA[i]) - rotMag(jointB[j])|
//            high  = adjacent verts driven by bones whose motion diverges
//            low   = adjacent verts move together (cohesive skinning)
//
//   stride = mean over lower-body verts (Y in bottom band) of
//              sum_k W[k] * rotMag(joint[k])
//            high  = lower body actually moves
//            low   = legs do not drive
//
// rotMag = max axis-angle delta from frame-0 of each bone's rotation channel.
// Usage: node tear_score.mjs <glb> [bandFraction=0.45]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [glb, bandArg] = process.argv.slice(2);
if (!glb) { console.error('usage: tear_score.mjs <glb> [bandFraction]'); process.exit(1); }
const BAND = bandArg ? parseFloat(bandArg) : 0.45;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(glb);
const root = doc.getRoot();

let meshNode = null;
for (const n of root.listNodes()) if (n.getMesh() && n.getSkin()) { meshNode = n; break; }
if (!meshNode) { console.error('no skinned primitive'); process.exit(2); }
const skin = meshNode.getSkin();
const sJoints = skin.listJoints();
const NJ = sJoints.length;

let prim = null, primNV = 0;
for (const p of meshNode.getMesh().listPrimitives()) {
  const nvp = p.getAttribute('POSITION').getArray().length / 3;
  if (nvp > primNV) { primNV = nvp; prim = p; }
}
const POS = prim.getAttribute('POSITION').getArray();
const JOI = prim.getAttribute('JOINTS_0').getArray();
const WEI = prim.getAttribute('WEIGHTS_0').getArray();
const IDX = prim.getIndices().getArray();
const nv = POS.length / 3;

let minY = Infinity, maxY = -Infinity;
for (let v = 0; v < nv; v++) { const y = POS[v*3+1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
const spanY = (maxY - minY) > 1e-9 ? (maxY - minY) : 1;
const isLower = new Uint8Array(nv);
let nLower = 0;
for (let v = 0; v < nv; v++) if ((POS[v*3+1] - minY) / spanY < BAND) { isLower[v] = 1; nLower++; }

const edges = new Set();
for (let i = 0; i < IDX.length; i += 3) {
  const a = IDX[i], b = IDX[i+1], c = IDX[i+2];
  const pairs = [[a,b],[b,c],[c,a]];
  for (const [x,y] of pairs) edges.add(x < y ? x * 0x40000000 + y : y * 0x40000000 + x);
}
const edgeList = [...edges];

function rotMagFromOutputs(arr) {
  const n = arr.length / 4;
  if (n < 2) return 0;
  const f0 = [arr[0], arr[1], arr[2], arr[3]];
  function ang(q) {
    const wx = -f0[0]*q[0] - f0[1]*q[1] - f0[2]*q[2] + f0[3]*q[3];
    const aw = Math.min(1, Math.abs(wx));
    return 2 * Math.acos(aw);
  }
  let mx = 0;
  for (let i = 0; i < n; i++) {
    const a = ang([arr[i*4], arr[i*4+1], arr[i*4+2], arr[i*4+3]]);
    if (a > mx) mx = a;
  }
  return mx;
}

console.log(`clip      tear    stride  maxJoint   verdict`);

for (const anim of root.listAnimations()) {
  const rot = new Float64Array(NJ);
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'rotation') continue;
    const tn = ch.getTargetNode(); if (!tn) continue;
    const ji = sJoints.indexOf(tn);
    if (ji < 0) continue;
    rot[ji] = rotMagFromOutputs(ch.getSampler().getOutput().getArray());
  }
  let maxR = 0; for (let i = 0; i < NJ; i++) if (rot[i] > maxR) maxR = rot[i];

  let tearSum = 0;
  for (const e of edgeList) {
    const a = Math.floor(e / 0x40000000); const b = e % 0x40000000;
    let d = 0;
    for (let i = 0; i < 4; i++) {
      const wa = WEI[a*4+i]; if (wa <= 0) continue;
      const ra = rot[JOI[a*4+i]];
      for (let j = 0; j < 4; j++) {
        const wb = WEI[b*4+j]; if (wb <= 0) continue;
        const rb = rot[JOI[b*4+j]];
        d += wa * wb * Math.abs(ra - rb);
      }
    }
    tearSum += d;
  }
  const tear = tearSum / edgeList.length;

  let strideSum = 0;
  for (let v = 0; v < nv; v++) {
    if (!isLower[v]) continue;
    let m = 0;
    for (let k = 0; k < 4; k++) { const w = WEI[v*4+k]; if (w > 0) m += w * rot[JOI[v*4+k]]; }
    strideSum += m;
  }
  const stride = nLower > 0 ? strideSum / nLower : 0;

  const torn = tear > 0.18;
  const noStride = stride < 0.18;
  const verdict = torn ? 'TORN' : (noStride ? 'NO-STRIDE' : 'OK');
  console.log(`${anim.getName().padEnd(8)}  ${tear.toFixed(3)}   ${stride.toFixed(3)}   ${maxR.toFixed(2)}rad    ${verdict}`);
}
console.log(`# band frac=${BAND}, nLower=${nLower}/${nv}, edges=${edgeList.length}, joints=${NJ}`);
