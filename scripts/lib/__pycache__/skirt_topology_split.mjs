// Mesh topology surgery: duplicate skirt verts so the welded one-piece
// armored skirt can move independently from the body at the seam.
//
// Detection: drape signature on the rigged GLB (Y in bottom band + distance
// to nearest leg-bone position exceeds the 30th-percentile leg-skin radius
// by THRESH x). The same discriminator as skirt_pin.
//
// Surgery: for every skirt vertex, append a duplicate (new ID, same POS +
// NORMAL but JOINTS_0 = hips, WEIGHTS_0 = [1,0,0,0]). Walk the index buffer:
// any triangle in which ALL 3 verts are skirt verts is "pure skirt" - rewrite
// its 3 indices to point at the duplicates. Triangles with 1 or 2 skirt verts
// are "boundary" - replace each skirt vert with its duplicate so the boundary
// also splits (the body-side verts stay original and continue moving with
// body bones; the skirt-side duplicates stay rigid with hips). At motion
// peaks the boundary opens into a thin gap rather than a stretched band.
//
// Usage: node skirt_topology_split.mjs <in.glb> <out.glb> [bandFrac=0.55] [threshMult=2.2]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const [inPath, outPath, bandArg, threshArg] = process.argv.slice(2);
if (!inPath || !outPath) { console.error('usage: skirt_topology_split.mjs <in.glb> <out.glb> [bandFrac] [threshMult]'); process.exit(1); }
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
  const chain = []; let k = idOf.get(joint);
  while (k >= 0) { chain.unshift(k); k = par[k]; }
  let M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  for (const i of chain) { const n = allNodes[i]; M = mmul(M, compose(n.getTranslation(), n.getRotation(), n.getScale())); }
  return [M[12], M[13], M[14]];
}
let hipsBi = -1;
for (let bi = 0; bi < sJoints.length; bi++) if (/^(hips|pelvis)$/i.test(sJoints[bi].getName())) { hipsBi = bi; break; }
if (hipsBi < 0) { console.error('hips/pelvis joint not found'); process.exit(3); }
const legBi = [];
for (let bi = 0; bi < sJoints.length; bi++) if (/thigh|shin|calf|knee|ankle|foot|toe|_leg/i.test(sJoints[bi].getName())) legBi.push(bi);
const legPos = legBi.map(bi => jointWorldPos(sJoints[bi]));

const prim = meshNode.getMesh().listPrimitives()[0];
const POS = Array.from(prim.getAttribute('POSITION').getArray());
const NRM = prim.getAttribute('NORMAL') ? Array.from(prim.getAttribute('NORMAL').getArray()) : null;
const J = Array.from(prim.getAttribute('JOINTS_0').getArray());
const W = Array.from(prim.getAttribute('WEIGHTS_0').getArray());
const IDX = Array.from(prim.getIndices().getArray());
const nv = POS.length / 3;

let minY = Infinity, maxY = -Infinity;
for (let v = 0; v < nv; v++) { const y = POS[v*3+1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
const spanY = (maxY - minY) > 1e-9 ? (maxY - minY) : 1;

const isSkirt = new Uint8Array(nv);
const band = [];
const dLeg = new Float32Array(nv).fill(-1);
for (let v = 0; v < nv; v++) {
  if ((POS[v*3+1] - minY) / spanY >= BAND) continue;
  const vx = POS[v*3], vy = POS[v*3+1], vz = POS[v*3+2];
  let d = Infinity;
  for (const lp of legPos) { const dd = Math.hypot(vx-lp[0], vy-lp[1], vz-lp[2]); if (dd < d) d = dd; }
  dLeg[v] = d; band.push(d);
}
band.sort((a,b) => a-b);
const legR = band[Math.floor(band.length * 0.30)];
const skirtThresh = legR * THRESH;
let nSkirt = 0;
for (let v = 0; v < nv; v++) if (dLeg[v] > skirtThresh) { isSkirt[v] = 1; nSkirt++; }
console.log(`[split] skirt verts: ${nSkirt}/${nv} (legR=${legR.toFixed(4)}, thresh=${skirtThresh.toFixed(4)})`);

// duplicate every skirt vert; build old->new map.
const dup = new Int32Array(nv).fill(-1);
let added = 0;
for (let v = 0; v < nv; v++) {
  if (!isSkirt[v]) continue;
  dup[v] = nv + added; added++;
  POS.push(POS[v*3], POS[v*3+1], POS[v*3+2]);
  if (NRM) NRM.push(NRM[v*3], NRM[v*3+1], NRM[v*3+2]);
  // rigid hips weights on the duplicate
  J.push(hipsBi, 0, 0, 0);
  W.push(1, 0, 0, 0);
}
const nv2 = POS.length / 3;
console.log(`[split] duplicated ${added} skirt verts -> total verts now ${nv2}`);

// Rewrite indices for PURE-skirt triangles only (all 3 verts are skirt).
// Boundary triangles (mixed body+skirt) keep the original skirt-vert IDs so
// they deform smoothly with the body-side verts under bone motion — no
// rigid-vs-flexible mismatch inside one triangle. Pure-skirt triangles use
// the rigid-hips duplicates so the skirt interior moves as one panel. The
// seam between them shares no triangles, only positions; at motion peaks
// the seam opens into a small gap rather than producing a stretched band.
let pureSkirtTris = 0, boundaryTris = 0;
for (let i = 0; i < IDX.length; i += 3) {
  const a = IDX[i], b = IDX[i+1], c = IDX[i+2];
  const ka = isSkirt[a], kb = isSkirt[b], kc = isSkirt[c];
  if (ka && kb && kc) {
    IDX[i]   = dup[a];
    IDX[i+1] = dup[b];
    IDX[i+2] = dup[c];
    pureSkirtTris++;
  } else if (ka || kb || kc) {
    boundaryTris++;
  }
}
console.log(`[split] pure-skirt triangles -> duplicates: ${pureSkirtTris}; boundary triangles kept on originals: ${boundaryTris}`);

const buf = root.listBuffers()[0];
prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(POS)).setBuffer(buf));
if (NRM) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(NRM)).setBuffer(buf));
prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint16Array(J)).setBuffer(buf));
prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(W)).setBuffer(buf));
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(IDX)).setBuffer(buf));

await io.write(outPath, doc);
const st = await stat(outPath);
console.log(`[split] wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB)`);
