// Wire RigNet's trained-model output into a skinned GLB.
// Inputs : <geom.glb> (humans_full.glb, the mesh RigNet was run on) and
//          <rig.txt> (RigNet quick_start output: joints/hier/root/skin).
// Output : <out.glb> — same geometry, RigNet's predicted skeleton + the
//          model's per-vertex skin weights (top-4, normalized).
// RigNet's skin vertex ids are in the exact concatenated order of the OBJ
// exported from geom.glb, so we merge all primitives in that same order.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';

const [geomPath, rigPath, outPath] = process.argv.slice(2);
if (!geomPath || !rigPath || !outPath) { console.error('usage: rignet_to_glb.mjs <geom.glb> <rig.txt> <out.glb>'); process.exit(1); }

// ---- parse rig.txt --------------------------------------------------------
const jointPos = new Map();           // name -> [x,y,z]
const childToParent = new Map();      // child -> parent
let rootName = null;
const skinRows = [];                  // vid -> [[name,w],...]
for (const line of readFileSync(rigPath, 'utf8').split('\n')) {
  if (!line) continue;
  const p = line.split(/\s+/);
  if (p[0] === 'joints') jointPos.set(p[1], [parseFloat(p[2]), parseFloat(p[3]), parseFloat(p[4])]);
  else if (p[0] === 'root') rootName = p[1];
  else if (p[0] === 'hier') childToParent.set(p[2], p[1]);
  else if (p[0] === 'skin') {
    const vid = parseInt(p[1], 10);
    const ws = [];
    for (let i = 2; i + 1 < p.length; i += 2) ws.push([p[i], parseFloat(p[i + 1])]);
    skinRows[vid] = ws;
  }
}
const jointNames = [...jointPos.keys()];
const jIdx = new Map(jointNames.map((n, i) => [n, i]));
console.log(`[rignet] ${jointNames.length} joints, root=${rootName}, ${skinRows.length} skin rows`);

// ---- load + merge geometry (same concat order as the exported OBJ) --------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read(geomPath);
const POS = [];
const NRM = [];
const IDX = [];
let base = 0;
for (const mesh of src.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const pos = prim.getAttribute('POSITION').getArray();
  const nrm = prim.getAttribute('NORMAL') ? prim.getAttribute('NORMAL').getArray() : null;
  const idx = prim.getIndices() ? prim.getIndices().getArray() : null;
  const nv = pos.length / 3;
  for (let i = 0; i < pos.length; i++) POS.push(pos[i]);
  for (let i = 0; i < nv * 3; i++) NRM.push(nrm ? nrm[i] : 0);
  if (idx) for (let i = 0; i < idx.length; i++) IDX.push(base + idx[i]);
  base += nv;
}
const nv = POS.length / 3;
if (nv !== skinRows.length) console.warn(`[rignet] WARN vert mismatch geom=${nv} rig=${skinRows.length}`);

// ---- build skinned document ----------------------------------------------
const dst = new Document();
const buf = dst.createBuffer();
const scene = dst.createScene();

// joint nodes; local translation = worldPos - parentWorldPos
const nodeByName = new Map();
for (const n of jointNames) nodeByName.set(n, dst.createNode(n));
for (const n of jointNames) {
  const wp = jointPos.get(n);
  const par = childToParent.get(n);
  const pp = par && jointPos.has(par) ? jointPos.get(par) : [0, 0, 0];
  nodeByName.get(n).setTranslation([wp[0] - pp[0], wp[1] - pp[1], wp[2] - pp[2]]);
  if (par && nodeByName.has(par)) nodeByName.get(par).addChild(nodeByName.get(n));
}
const rootNode = nodeByName.get(rootName);
scene.addChild(rootNode);

// inverse bind = translate(-worldPos) (joints are pure-translation bind)
const ibmArr = new Float32Array(jointNames.length * 16);
for (let i = 0; i < jointNames.length; i++) {
  const w = jointPos.get(jointNames[i]);
  const m = [1,0,0,0, 0,1,0,0, 0,0,1,0, -w[0],-w[1],-w[2],1];
  ibmArr.set(m, i * 16);
}

// per-vertex top-4 normalized weights
const J = new Uint16Array(nv * 4);
const W = new Float32Array(nv * 4);
for (let v = 0; v < nv; v++) {
  const ws = skinRows[v] ? skinRows[v].slice() : [];
  ws.sort((a, b) => b[1] - a[1]);
  const top = ws.slice(0, 4);
  let s = 0; for (const t of top) s += t[1];
  if (s <= 0) { J[v*4] = 0; W[v*4] = 1; continue; }
  for (let k = 0; k < 4; k++) {
    if (k < top.length && jIdx.has(top[k][0])) { J[v*4+k] = jIdx.get(top[k][0]); W[v*4+k] = top[k][1] / s; }
    else { J[v*4+k] = 0; W[v*4+k] = 0; }
  }
}

const posA = dst.createAccessor().setType('VEC3').setArray(new Float32Array(POS)).setBuffer(buf);
const nrmA = dst.createAccessor().setType('VEC3').setArray(new Float32Array(NRM)).setBuffer(buf);
const idxA = dst.createAccessor().setType('SCALAR').setArray(new Uint32Array(IDX)).setBuffer(buf);
const jA = dst.createAccessor().setType('VEC4').setArray(J).setBuffer(buf);
const wA = dst.createAccessor().setType('VEC4').setArray(W).setBuffer(buf);
const ibmA = dst.createAccessor().setType('MAT4').setArray(ibmArr).setBuffer(buf);

const prim = dst.createPrimitive()
  .setAttribute('POSITION', posA)
  .setAttribute('NORMAL', nrmA)
  .setAttribute('JOINTS_0', jA)
  .setAttribute('WEIGHTS_0', wA)
  .setIndices(idxA);
const mesh = dst.createMesh('rignet').addPrimitive(prim);
const skin = dst.createSkin('rignet_skin').setInverseBindMatrices(ibmA).setSkeleton(rootNode);
for (const n of jointNames) skin.addJoint(nodeByName.get(n));
const meshNode = dst.createNode('rignet_mesh').setMesh(mesh).setSkin(skin);
scene.addChild(meshNode);

await io.write(outPath, dst);
const st = await stat(outPath);
console.log(`[rignet] wrote ${outPath} (${(st.size/1024/1024).toFixed(1)} MB), ${nv} verts, ${jointNames.length} joints`);
