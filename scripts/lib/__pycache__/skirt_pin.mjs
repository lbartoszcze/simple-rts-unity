// Pin true skirt vertices rigidly to the canonical hips bone.
// Detection is purely geometric on the skinned GLB:
//   skirt vert = in the bottom Y band AND Euclidean distance to the nearest
//                leg-bone joint position exceeds the tight-leg-skin radius
//                (30th percentile of leg-distance over band verts) by 2.2x.
// Override their JOINTS_0/WEIGHTS_0 to single bone hips, weight 1, so the
// skirt swings as a rigid panel with the pelvis and cannot tear under leg
// rotation. Bare-leg verts (close to a leg-bone axis) keep their existing
// weights and animate normally underneath.
// Usage: node skirt_pin.mjs <in.glb> <out.glb> [bandFrac=0.55] [threshMult=2.2]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const [inPath, outPath, bandArg, threshArg] = process.argv.slice(2);
if (!inPath || !outPath) { console.error('usage: skirt_pin.mjs <in.glb> <out.glb> [bandFrac] [threshMult]'); process.exit(1); }
const BAND = bandArg ? parseFloat(bandArg) : 0.55;
const THRESH = threshArg ? parseFloat(threshArg) : 2.2;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

let meshNode = null;
for (const n of root.listNodes()) if (n.getMesh() && n.getSkin()) { meshNode = n; break; }
if (!meshNode) { console.error('no skinned primitive'); process.exit(2); }
const skin = meshNode.getSkin();
const sJoints = skin.listJoints();
const idOf = new Map(root.listNodes().map((n, i) => [n, i]));
const par = new Int32Array(root.listNodes().length).fill(-1);
for (const n of root.listNodes()) for (const c of n.listChildren()) par[idOf.get(c)] = idOf.get(n);

function mmul(a, b) { const o = new Array(16);
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o; }
function compose(t, q, s) {
  const x=q[0],y=q[1],z=q[2],w=q[3], x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return [(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
    (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
    (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0, t[0],t[1],t[2],1]; }
function jointWorldPos(joint) {
  const chain = []; let k = idOf.get(joint);
  while (k >= 0) { chain.unshift(k); k = par[k]; }
  let M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  for (const i of chain) { const n = root.listNodes()[i]; M = mmul(M, compose(n.getTranslation(), n.getRotation(), n.getScale())); }
  return [M[12], M[13], M[14]];
}

let hipsBi = -1;
for (let bi = 0; bi < sJoints.length; bi++) if (/^(hips|pelvis)$/i.test(sJoints[bi].getName())) { hipsBi = bi; break; }
if (hipsBi < 0) { console.error('hips/pelvis joint not found'); process.exit(3); }
const legBi = [];
for (let bi = 0; bi < sJoints.length; bi++) if (/thigh|shin|calf|knee|ankle|foot|toe|_leg/i.test(sJoints[bi].getName())) legBi.push(bi);
console.log(`[pin] hipsBi=${hipsBi} legBones=${legBi.length}`);

const legPos = legBi.map(bi => jointWorldPos(sJoints[bi]));

let totalPinned = 0;
for (const prim of meshNode.getMesh().listPrimitives()) {
  const POS = prim.getAttribute('POSITION').getArray();
  const J = prim.getAttribute('JOINTS_0').getArray();
  const W = prim.getAttribute('WEIGHTS_0').getArray();
  const nv = POS.length / 3;
  let minY = Infinity, maxY = -Infinity;
  for (let v = 0; v < nv; v++) { const y = POS[v*3+1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const spanY = (maxY - minY) > 1e-9 ? (maxY - minY) : 1;
  const dLeg = new Float32Array(nv).fill(-1);
  const band = [];
  for (let v = 0; v < nv; v++) {
    if ((POS[v*3+1] - minY) / spanY >= BAND) continue;
    const vx = POS[v*3], vy = POS[v*3+1], vz = POS[v*3+2];
    let d = Infinity;
    for (const lp of legPos) { const dd = Math.hypot(vx-lp[0], vy-lp[1], vz-lp[2]); if (dd < d) d = dd; }
    dLeg[v] = d; band.push(d);
  }
  if (band.length === 0) continue;
  band.sort((a,b) => a-b);
  const legR = band[Math.floor(band.length * 0.30)];
  const skirtThresh = legR * THRESH;
  let pinned = 0;
  const Jw = new Uint16Array(J);
  const Ww = new Float32Array(W);
  for (let v = 0; v < nv; v++) {
    if (dLeg[v] < 0 || dLeg[v] <= skirtThresh) continue;
    Jw[v*4] = hipsBi; Ww[v*4] = 1;
    Jw[v*4+1] = 0;    Ww[v*4+1] = 0;
    Jw[v*4+2] = 0;    Ww[v*4+2] = 0;
    Jw[v*4+3] = 0;    Ww[v*4+3] = 0;
    pinned++;
  }
  totalPinned += pinned;
  const buf = root.listBuffers()[0];
  prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(Jw).setBuffer(buf));
  prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(Ww).setBuffer(buf));
  console.log(`[pin] prim ${nv} verts: band=${band.length} legR=${legR.toFixed(4)} thresh=${skirtThresh.toFixed(4)} pinned=${pinned}`);
}

await io.write(outPath, doc);
const st = await stat(outPath);
console.log(`[pin] wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB), total pinned=${totalPinned}`);
