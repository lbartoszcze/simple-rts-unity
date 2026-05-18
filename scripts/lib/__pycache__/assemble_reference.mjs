// Assemble a multi-clip reference GLB from an animation starter pack.
//
// The Unity #219979 pack ships the skinned mesh in one FBX and each clip in
// its own animation-only FBX. This tool takes the converted mesh GLB plus
// name=animGlb pairs, copies each animation's samplers/channels into the mesh
// document (rebinding channel targets to the same-named skeleton node), names
// the merged clips, and writes a single GLB with mesh + all clips.
//
// Usage:
//   assemble_reference.mjs <mesh.glb> <out.glb> idle=idle.glb walk=walk.glb \
//                          run=run.glb attack=attack.glb

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const args = process.argv.slice(2);
const [meshPath, outPath, ...pairs] = args;
if (!meshPath || !outPath || pairs.length === 0) {
  console.error('usage: assemble_reference.mjs <mesh.glb> <out.glb> name=anim.glb ...');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const meshDoc = await io.read(meshPath);
const meshRoot = meshDoc.getRoot();
const buf = meshRoot.listBuffers()[0];

// name -> node in the mesh document (skeleton joints + any transform nodes).
const meshNodeByName = new Map();
for (const n of meshRoot.listNodes()) {
  const nm = n.getName();
  if (nm && !meshNodeByName.has(nm)) meshNodeByName.set(nm, n);
}
console.log(`[assemble] mesh '${meshPath}': ${meshRoot.listNodes().length} nodes, skin joints=${meshRoot.listSkins()[0]?.listJoints().length ?? 0}`);

// Drop any animations already on the mesh doc (the pack mesh has none, but be safe).
for (const a of meshRoot.listAnimations()) a.dispose();

function copyAccessor(srcAcc) {
  const out = meshDoc.createAccessor()
    .setArray(srcAcc.getArray().slice())
    .setType(srcAcc.getType())
    .setBuffer(buf);
  if (srcAcc.getNormalized && srcAcc.getNormalized()) out.setNormalized(true);
  return out;
}

let totalClips = 0;
for (const pair of pairs) {
  const eq = pair.indexOf('=');
  const clipName = pair.slice(0, eq);
  const animPath = pair.slice(eq + 1);
  const animDoc = await io.read(animPath);
  const animRoot = animDoc.getRoot();
  const anims = animRoot.listAnimations();
  if (anims.length === 0) { console.warn(`[assemble] ${clipName}: ${animPath} has NO animations — skipped`); continue; }

  // FBX2glTF emits a 1-frame 'tpose' alongside the real clip. Pick the real
  // one: ignore anything named 'tpose', then take the longest time-span.
  function span(a) {
    const inp = a.listSamplers()[0]?.getInput();
    if (!inp) return 0;
    const t = inp.getArray();
    return t.length ? t[t.length - 1] - t[0] : 0;
  }
  const real = anims.filter(a => a.getName().toLowerCase() !== 'tpose');
  const pool = real.length ? real : anims;
  let srcAnim = pool[0];
  for (const a of pool) if (span(a) > span(srcAnim)) srcAnim = a;

  const dstAnim = meshDoc.createAnimation(clipName);
  let bound = 0, missed = 0;
  const missNames = new Set();
  for (const ch of srcAnim.listChannels()) {
    const srcNode = ch.getTargetNode();
    const tgtName = srcNode ? srcNode.getName() : null;
    const dstNode = tgtName ? meshNodeByName.get(tgtName) : null;
    if (!dstNode) { missed++; if (tgtName) missNames.add(tgtName); continue; }
    const srcSamp = ch.getSampler();
    const samp = meshDoc.createAnimationSampler()
      .setInput(copyAccessor(srcSamp.getInput()))
      .setOutput(copyAccessor(srcSamp.getOutput()))
      .setInterpolation(srcSamp.getInterpolation());
    const dstCh = meshDoc.createAnimationChannel()
      .setTargetNode(dstNode)
      .setTargetPath(ch.getTargetPath())
      .setSampler(samp);
    dstAnim.addSampler(samp).addChannel(dstCh);
    bound++;
  }
  totalClips++;
  const inAcc = srcAnim.listSamplers()[0]?.getInput();
  const t = inAcc ? inAcc.getArray() : null;
  const dur = t ? (t[t.length - 1] - t[0]).toFixed(2) : '?';
  console.log(`[assemble] clip '${clipName}' <- ${animPath} (src '${srcAnim.getName()}'): bound ${bound} ch, missed ${missed}${missNames.size ? ' [' + [...missNames].slice(0,6).join(',') + (missNames.size>6?'…':'') + ']' : ''}, dur=${dur}s`);
}

await io.write(outPath, meshDoc);
const st = await stat(outPath);
console.log(`[assemble] wrote ${outPath} (${(st.size/1024).toFixed(1)} KB) with ${totalClips} clips`);
