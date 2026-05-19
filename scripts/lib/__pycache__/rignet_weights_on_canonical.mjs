// RigNet's trained-model weights on the proven canonical skeleton.
// <canonical.glb> : a GLB whose skin uses the canonical auto-rig biped
//   (hips/spine_01.. l_thigh.. — the skeleton retarget_clip already drives
//   correctly with the #219979 reference). Its skeleton + IBM + clips are
//   kept byte-identical; only the mesh geometry + skin weights are replaced.
// <geom.glb>      : humans_full.glb (the exact mesh RigNet ran on).
// <rig.txt>       : RigNet output (joints + per-vertex skin).
// Each RigNet joint -> nearest canonical bone by world position; per-vertex
// RigNet weights are accumulated into canonical bones, top-4 normalized.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';

const [canonPath, geomPath, rigPath, outPath] = process.argv.slice(2);
if (!canonPath || !geomPath || !rigPath || !outPath) {
  console.error('usage: rignet_weights_on_canonical.mjs <canonical.glb> <geom.glb> <rig.txt> <out.glb>');
  process.exit(1);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---- canonical skeleton: joint list + bind world positions ----------------
const doc = await io.read(canonPath);
const root = doc.getRoot();
const nodes = root.listNodes();
const idOf = new Map(nodes.map((n, i) => [n, i]));
const par = new Int32Array(nodes.length).fill(-1);
for (const n of nodes) for (const c of n.listChildren()) par[idOf.get(c)] = idOf.get(n);
function compose(t, q, s) {
  const x=q[0],y=q[1],z=q[2],w=q[3], x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return [(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
    (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
    (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0, t[0],t[1],t[2],1];
}
function mmul(a, b) { const o = new Array(16);
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return o; }
function worldPos(i) {
  // full TRS-matrix accumulation through the parent chain. The auto-rig has
  // non-identity bind rotations (axe pose) and an armature root transform,
  // so a translation-only sum gave wrong joint world positions, which made
  // RigNet joints map to the wrong canonical bones.
  const chain = []; let k = i;
  while (k >= 0) { chain.unshift(k); k = par[k]; }
  let M = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  for (const n of chain) {
    const nd = nodes[n];
    M = mmul(M, compose(nd.getTranslation(), nd.getRotation(), nd.getScale()));
  }
  return [M[12], M[13], M[14]];
}
let meshNode = null;
for (const n of nodes) if (n.getMesh() && n.getSkin()) { meshNode = n; break; }
const skin = meshNode.getSkin();
const cJoints = skin.listJoints();
const cPos = cJoints.map(j => worldPos(idOf.get(j)));
console.log(`[syn] canonical skeleton: ${cJoints.length} joints (${cJoints.slice(0,3).map(j=>j.getName()).join(',')}...)`);

// ---- RigNet joints + skin -------------------------------------------------
const jPos = new Map();
const skinRows = [];
for (const line of readFileSync(rigPath, 'utf8').split('\n')) {
  if (!line) continue;
  const p = line.split(/\s+/);
  if (p[0] === 'joints') jPos.set(p[1], [parseFloat(p[2]), parseFloat(p[3]), parseFloat(p[4])]);
  else if (p[0] === 'skin') {
    const ws = [];
    for (let i = 2; i + 1 < p.length; i += 2) ws.push([p[i], parseFloat(p[i + 1])]);
    skinRows[parseInt(p[1], 10)] = ws;
  }
}
// RigNet joint -> SOFT distribution over canonical bones.
// SOFTNESS=0 (default) reproduces the hard nearest-bone assignment; SOFTNESS>0
// spreads each RigNet joint's contribution across the K nearest canonical
// bones via softmax(-d^2/sigma^2), which smooths the weight discontinuity at
// the skirt/leg boundary that drives the tearing score up.
const SOFTNESS = process.env.SOFTNESS ? parseFloat(process.env.SOFTNESS) : 0;
const K_NEAR = 4;
const rjSoft = new Map(); // name -> [[boneIdx, w], ...]
for (const [nm, p] of jPos) {
  const ds = [];
  for (let c = 0; c < cPos.length; c++) {
    const dx = p[0]-cPos[c][0], dy = p[1]-cPos[c][1], dz = p[2]-cPos[c][2];
    ds.push([c, dx*dx + dy*dy + dz*dz]);
  }
  ds.sort((a, b) => a[1] - b[1]);
  if (SOFTNESS <= 0) { rjSoft.set(nm, [[ds[0][0], 1]]); continue; }
  const top = ds.slice(0, K_NEAR);
  const s2 = SOFTNESS * SOFTNESS;
  const exps = top.map(([, d2]) => Math.exp(-d2 / s2));
  const Z = exps.reduce((a, b) => a + b, 0);
  rjSoft.set(nm, top.map(([c], i) => [c, exps[i] / Z]));
}
console.log(`[syn] mapped ${rjSoft.size} RigNet joints -> canonical bones (SOFTNESS=${SOFTNESS})`);

// ---- merged geometry from geom.glb (same concat order as RigNet vids) ------
const gsrc = await io.read(geomPath);
const POS = [], NRM = [], IDX = [];
let base = 0;
for (const mesh of gsrc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const pos = prim.getAttribute('POSITION').getArray();
  const nrm = prim.getAttribute('NORMAL') ? prim.getAttribute('NORMAL').getArray() : null;
  const idx = prim.getIndices() ? prim.getIndices().getArray() : null;
  const nvp = pos.length / 3;
  for (let i = 0; i < pos.length; i++) POS.push(pos[i]);
  for (let i = 0; i < nvp * 3; i++) NRM.push(nrm ? nrm[i] : 0);
  if (idx) for (let i = 0; i < idx.length; i++) IDX.push(base + idx[i]);
  base += nvp;
}
const nv = POS.length / 3;
console.log(`[syn] geom ${nv} verts, rig rows ${skinRows.length}`);

// ---- per-vertex canonical weights from RigNet -----------------------------
const J = new Uint16Array(nv * 4);
const W = new Float32Array(nv * 4);
for (let v = 0; v < nv; v++) {
  const ws = skinRows[v];
  const bin = new Map();
  if (ws) for (const [nm, w] of ws) {
    if (!rjSoft.has(nm) || w <= 0) continue;
    for (const [c, sw] of rjSoft.get(nm)) {
      bin.set(c, (bin.has(c) ? bin.get(c) : 0) + w * sw);
    }
  }
  const arr = [...bin.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  let s = 0; for (const e of arr) s += e[1];
  if (s <= 0) { J[v*4] = 0; W[v*4] = 1; continue; }
  for (let k = 0; k < 4; k++) {
    if (k < arr.length) { J[v*4+k] = arr[k][0]; W[v*4+k] = arr[k][1] / s; }
    else { J[v*4+k] = 0; W[v*4+k] = 0; }
  }
}

// Laplacian weight smoothing across the mesh edge graph. Each iteration
// averages a vertex's weight vector with its mesh-graph neighbours, then
// re-keeps top-4 and renormalises. Directly minimises edge-disagreement
// (the tear metric), which is what causes the skirt/leg boundary to tear
// when adjacent verts are bound to bones whose rotations diverge.
const LAP = process.env.LAPLACIAN_ITERS ? parseInt(process.env.LAPLACIAN_ITERS, 10) : 0;
if (LAP > 0) {
  // dense per-bone weight vector per vertex, then iterate.
  const NB = cJoints.length;
  let Wfull = new Float32Array(nv * NB);
  for (let v = 0; v < nv; v++) for (let k = 0; k < 4; k++) {
    const w = W[v*4+k]; if (w > 0) Wfull[v*NB + J[v*4+k]] = w;
  }
  // CSR adjacency from IDX.
  const deg = new Int32Array(nv);
  for (let i = 0; i < IDX.length; i += 3) { deg[IDX[i]] += 2; deg[IDX[i+1]] += 2; deg[IDX[i+2]] += 2; }
  const off = new Int32Array(nv + 1);
  for (let v = 0; v < nv; v++) off[v+1] = off[v] + deg[v];
  const nbr = new Int32Array(off[nv]);
  const cur = off.slice(0, nv);
  for (let i = 0; i < IDX.length; i += 3) {
    const a=IDX[i], b=IDX[i+1], c=IDX[i+2];
    nbr[cur[a]++] = b; nbr[cur[a]++] = c;
    nbr[cur[b]++] = a; nbr[cur[b]++] = c;
    nbr[cur[c]++] = a; nbr[cur[c]++] = b;
  }
  const LAMBDA = 0.5;
  for (let it = 0; it < LAP; it++) {
    const Wnext = new Float32Array(nv * NB);
    for (let v = 0; v < nv; v++) {
      const s = off[v], e = off[v+1]; const n = e - s;
      if (n === 0) { for (let b = 0; b < NB; b++) Wnext[v*NB+b] = Wfull[v*NB+b]; continue; }
      for (let b = 0; b < NB; b++) {
        let avg = 0; for (let p = s; p < e; p++) avg += Wfull[nbr[p]*NB+b];
        avg /= n;
        Wnext[v*NB+b] = (1 - LAMBDA) * Wfull[v*NB+b] + LAMBDA * avg;
      }
    }
    Wfull = Wnext;
  }
  // re-extract top-4 per vertex.
  for (let v = 0; v < nv; v++) {
    const top = [];
    for (let b = 0; b < NB; b++) { const w = Wfull[v*NB+b]; if (w > 0) top.push([b, w]); }
    top.sort((a, b) => b[1] - a[1]);
    const sel = top.slice(0, 4);
    let s = 0; for (const t of sel) s += t[1];
    if (s <= 0) { J[v*4]=0; W[v*4]=1; J[v*4+1]=J[v*4+2]=J[v*4+3]=0; W[v*4+1]=W[v*4+2]=W[v*4+3]=0; continue; }
    for (let k = 0; k < 4; k++) {
      if (k < sel.length) { J[v*4+k] = sel[k][0]; W[v*4+k] = sel[k][1] / s; }
      else { J[v*4+k] = 0; W[v*4+k] = 0; }
    }
  }
  console.log(`[syn] laplacian smooth: ${LAP} iters, lambda=${LAMBDA}`);
}

// ---- replace the canonical mesh primitive (skeleton/IBM/clips untouched) ---
const buf = root.listBuffers()[0];
const prim = meshNode.getMesh().listPrimitives()[0];
prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(POS)).setBuffer(buf));
prim.setAttribute('NORMAL',   doc.createAccessor().setType('VEC3').setArray(new Float32Array(NRM)).setBuffer(buf));
prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J).setBuffer(buf));
prim.setAttribute('WEIGHTS_0',doc.createAccessor().setType('VEC4').setArray(W).setBuffer(buf));
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(IDX)).setBuffer(buf));
for (const p2 of meshNode.getMesh().listPrimitives()) if (p2 !== prim) p2.dispose();

await io.write(outPath, doc);
const st = await stat(outPath);
console.log(`[syn] wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB) — RigNet weights on canonical skeleton`);
