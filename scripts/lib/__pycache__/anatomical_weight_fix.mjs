// Redirect anatomically-wrong skin weights on a rigged GLB.
//
// Root cause this targets: rignet_weights_on_canonical.mjs maps each RigNet
// joint to the nearest canonical bone by 3D position alone, with no
// anatomical constraint. On humans that mapped a leg-region RigNet joint to
// r_forearm; the result was 18.9% of lower-body verts weighted to r_forearm,
// so any arm pump during walk/run/attack yanked the lower body sideways into
// a shard fan. Dwarves through the same pipeline had no such bleed.
//
// Fix: for each vertex in the bottom Y-band, any weight share assigned to
// an arm/hand/finger/shoulder bone is redirected to that vertex's NEAREST
// LEG bone. Total weight is preserved; top-4 renormalised. Symmetric
// upper-body redirect (lower-body bone weights on upper-body verts -> nearest
// upper-body bone) catches the mirror error in case it ever appears.
//
// Usage: node anatomical_weight_fix.mjs <in.glb> <out.glb> [bandLow=0.40] [bandHigh=0.60]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const [inPath, outPath, bLowArg, bHighArg] = process.argv.slice(2);
if (!inPath || !outPath) { console.error('usage: anatomical_weight_fix.mjs <in.glb> <out.glb> [bandLow] [bandHigh]'); process.exit(1); }
const BLOW = bLowArg ? parseFloat(bLowArg) : 0.40;
const BHIGH = bHighArg ? parseFloat(bHighArg) : 0.60;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();
let meshNode = null;
for (const n of root.listNodes()) if (n.getMesh() && n.getSkin()) { meshNode = n; break; }
const skin = meshNode.getSkin();
const sJoints = skin.listJoints();

// classify bones
const ARM_RE = /^(l_|r_)?(shoulder|upperarm|forearm|hand|thumb|index|middle|ring|pinky|finger)|finger_/i;
const LEG_RE = /^(l_|r_)?(thigh|shin|calf|knee|ankle|foot|toe|_leg)/i;
const isArm = sJoints.map(j => ARM_RE.test(j.getName()));
const isLeg = sJoints.map(j => LEG_RE.test(j.getName()));
const armIdx = []; sJoints.forEach((j, i) => { if (isArm[i]) armIdx.push(i); });
const legIdx = []; sJoints.forEach((j, i) => { if (isLeg[i]) legIdx.push(i); });
console.log(`[anat] arm bones=${armIdx.length}, leg bones=${legIdx.length}`);

// joint world positions via parent-chain TRS accumulation
const allNodes = root.listNodes();
const idOf = new Map(allNodes.map((n, i) => [n, i]));
const par = new Int32Array(allNodes.length).fill(-1);
for (const n of allNodes) for (const c of n.listChildren()) par[idOf.get(c)] = idOf.get(n);
function compose(t, q, s) {
  const x=q[0],y=q[1],z=q[2],w=q[3], x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return [(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
    (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
    (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0, t[0],t[1],t[2],1]; }
function mmul(a, b) { const o = new Array(16);
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o; }
function jointWorldPos(joint) {
  const ch = []; let k = idOf.get(joint);
  while (k >= 0) { ch.unshift(k); k = par[k]; }
  let M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  for (const i of ch) { const n = allNodes[i]; M = mmul(M, compose(n.getTranslation(), n.getRotation(), n.getScale())); }
  return [M[12], M[13], M[14]];
}
const jPos = sJoints.map(j => jointWorldPos(j));

let totalRedirected = 0;
let primChanged = 0;
for (const prim of meshNode.getMesh().listPrimitives()) {
  const POS = prim.getAttribute('POSITION').getArray();
  const J = Array.from(prim.getAttribute('JOINTS_0').getArray());
  const W = Array.from(prim.getAttribute('WEIGHTS_0').getArray());
  const nv = POS.length / 3;
  let minY = Infinity, maxY = -Infinity;
  for (let v = 0; v < nv; v++) { const y = POS[v*3+1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const spanY = (maxY - minY) > 1e-9 ? (maxY - minY) : 1;

  let nRedirect = 0;
  for (let v = 0; v < nv; v++) {
    const yFrac = (POS[v*3+1] - minY) / spanY;
    const lowerBody = yFrac < BLOW;
    const upperBody = yFrac > BHIGH;
    if (!lowerBody && !upperBody) continue;
    const vx = POS[v*3], vy = POS[v*3+1], vz = POS[v*3+2];
    const bin = new Map();
    let needRedirect = false;
    for (let k = 0; k < 4; k++) {
      const w = W[v*4+k]; if (w <= 0) continue;
      const ji = J[v*4+k];
      const wrong = (lowerBody && isArm[ji]) || (upperBody && isLeg[ji]);
      if (wrong) {
        // distribute redirect across the K nearest correct-category bones via
        // 1/d^2 softmax — single-bone dump (previous version) made r_shin a
        // dominant outlier on humans and produced unbalanced motion (dwarves
        // shows a balanced 5-bone spread on the lower body which animates
        // cleanly).
        const pool = lowerBody ? legIdx : armIdx;
        const ranked = pool.map(cj => {
          const dx = vx-jPos[cj][0], dy = vy-jPos[cj][1], dz = vz-jPos[cj][2];
          return [cj, dx*dx + dy*dy + dz*dz];
        }).sort((a, b) => a[1] - b[1]).slice(0, 3);
        let total = 0; for (const [, d2] of ranked) total += 1 / Math.max(d2, 1e-6);
        for (const [cj, d2] of ranked) {
          const share = (1 / Math.max(d2, 1e-6)) / total;
          bin.set(cj, (bin.has(cj) ? bin.get(cj) : 0) + w * share);
        }
        needRedirect = true;
        continue;
      }
      bin.set(ji, (bin.has(ji) ? bin.get(ji) : 0) + w);
    }
    if (!needRedirect) continue;
    const arr = [...bin.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const e of arr) s += e[1];
    if (s <= 0) continue;
    for (let k = 0; k < 4; k++) {
      if (k < arr.length) { J[v*4+k] = arr[k][0]; W[v*4+k] = arr[k][1] / s; }
      else { J[v*4+k] = 0; W[v*4+k] = 0; }
    }
    nRedirect++;
  }
  if (nRedirect > 0) {
    const buf = root.listBuffers()[0];
    prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint16Array(J)).setBuffer(buf));
    prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(W)).setBuffer(buf));
    primChanged++;
  }
  totalRedirected += nRedirect;
  console.log(`[anat] prim ${nv} verts, redirected ${nRedirect}`);
}

await io.write(outPath, doc);
const st = await stat(outPath);
console.log(`[anat] wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB), prims changed=${primChanged}, total redirected=${totalRedirected}`);
