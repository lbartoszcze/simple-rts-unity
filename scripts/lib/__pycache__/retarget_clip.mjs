// Retarget animation clips from a reference rig to the production rig
// using world-space delta transfer. The earlier failed approach copied
// absolute rotations, which broke because the production rig's axe-pose
// bind differs from the reference's T-pose bind by ~66° per bone. This
// transfers ONLY the per-frame delta-from-bind, so each character keeps
// its own bind silhouette and gets the reference's motion superimposed.
//
// Math (per bone, per frame):
//   refDeltaWorld = refCurrentWorld * refBindWorld^-1
//   prodNewWorld  = refDeltaWorld * prodBindWorld
//   prodNewLocal  = prodParentWorld^-1 * prodNewWorld
//
// Translation on the root (Hips) is carried over (scaled by height ratio)
// so the walk's forward progression and vertical bob are preserved.

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { stat } from 'node:fs/promises';

const args = process.argv.slice(2);
const ABSOLUTE = args.includes('--absolute');
const [refPath, prodPath, outPath] = args.filter(a => !a.startsWith('--'));
if (!refPath || !prodPath || !outPath) {
  console.error('usage: retarget_clip.mjs [--absolute] <reference.glb> <production_in.glb> <out.glb>');
  console.error('  default mode transfers MOTION DELTAS (preserves each rig\'s own bind).');
  console.error('  --absolute copies the reference\'s world rotations directly (forces prod bones to ref poses).');
  process.exit(1);
}

// ---- quat helpers ---------------------------------------------------------
function qMul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function qConj(q){return[-q[0],-q[1],-q[2],q[3]];}
function qInv(q){const d=q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]||1;return[-q[0]/d,-q[1]/d,-q[2]/d,q[3]/d];}
function qNorm(q){const l=Math.hypot(...q)||1;return[q[0]/l,q[1]/l,q[2]/l,q[3]/l];}
function attenuateAxisAngle(q, factor) {
  // Reduce the rotation angle of q by `factor` (0..1) while preserving axis.
  const w = Math.min(1, Math.max(-1, q[3]));
  const half = Math.acos(Math.abs(w));
  const sign = w < 0 ? -1 : 1;
  if (half < 1e-6) return [0, 0, 0, 1];
  const s = Math.sin(half) || 1;
  const ax = q[0] / s, ay = q[1] / s, az = q[2] / s;
  const newHalf = half * factor;
  const ns = Math.sin(newHalf);
  return [ax * ns * sign, ay * ns * sign, az * ns * sign, Math.cos(newHalf) * sign];
}
function clampAxisAngle(q, maxAngle) {
  // Cap the rotation angle of q to maxAngle (radians), preserving axis.
  const w = Math.min(1, Math.max(-1, q[3]));
  const full = 2 * Math.acos(Math.abs(w));
  if (full <= maxAngle) return q;
  const half = Math.acos(Math.abs(w));
  const sign = w < 0 ? -1 : 1;
  const s = Math.sin(half) || 1;
  const ax = q[0] / s, ay = q[1] / s, az = q[2] / s;
  const nh = maxAngle / 2;
  const ns = Math.sin(nh);
  return [ax * ns * sign, ay * ns * sign, az * ns * sign, Math.cos(nh) * sign];
}

// Reference (Unity Asset Store #219979 "FREE Low Poly Human - RPG Character",
// Maya-style rig: _M = mid, _L/_R = sides) bone names → production (auto-rig)
// bone names. Root_M is the pelvis; Hip_L/Hip_R are the leg roots (thighs);
// Scapula = clavicle, Shoulder = upper arm, Elbow = forearm, Wrist = hand.
const BONE_MAP = {
  'Root_M':     'hips',
  'Spine1_M':   'spine_01',
  'Spine2_M':   'spine_02',
  'Chest_M':    'spine_03',
  'Neck_M':     'neck',
  'Head_M':     'head',
  'Scapula_L':  'l_shoulder',
  'Shoulder_L': 'l_upperarm',
  'Elbow_L':    'l_forearm',
  'Wrist_L':    'l_hand',
  'Scapula_R':  'r_shoulder',
  'Shoulder_R': 'r_upperarm',
  'Elbow_R':    'r_forearm',
  'Wrist_R':    'r_hand',
  'Hip_L':      'l_thigh',
  'Knee_L':     'l_shin',
  'Ankle_L':    'l_foot',
  'Hip_R':      'r_thigh',
  'Knee_R':     'r_shin',
  'Ankle_R':    'r_foot',
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ---- load reference + production -----------------------------------------
const refDoc = await io.read(refPath);
const refRoot = refDoc.getRoot();
const refJoints = refRoot.listSkins()[0].listJoints();
const refByName = new Map(refJoints.map(j => [j.getName(), j]));

const prodDoc = await io.read(prodPath);
const prodRoot = prodDoc.getRoot();
const prodSkin = prodRoot.listSkins()[0];
const prodJoints = prodSkin.listJoints();
const prodByName = new Map(prodJoints.map(j => [j.getName(), j]));

// Sanity check the map
const missing = [];
for (const [r, p] of Object.entries(BONE_MAP)) {
  if (!refByName.has(r)) missing.push(`ref:${r}`);
  if (!prodByName.has(p)) missing.push(`prod:${p}`);
}
if (missing.length) {
  console.error('[retarget] missing bones:', missing);
  process.exit(2);
}

// ---- parent maps ----------------------------------------------------------
// We track BOTH joint-only parents (for animation hierarchy) AND full
// scene-node parents (so accumulated world rotations include any
// Blender→glTF -90°-X armature root rotation).
function buildJointParentMap(joints, set) {
  const p = new Map();
  for (const j of joints) for (const c of j.listChildren()) if (set.has(c.getName())) p.set(c.getName(), j.getName());
  return p;
}
function buildNodeParentMap(doc) {
  const p = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) p.set(c.getName(), n.getName());
  return p;
}
function buildNodeByName(doc) {
  const m = new Map();
  for (const n of doc.getRoot().listNodes()) m.set(n.getName(), n);
  return m;
}
const refParents  = buildJointParentMap(refJoints,  refByName);
const prodParents = buildJointParentMap(prodJoints, prodByName);
const refAllNodeParents  = buildNodeParentMap(refDoc);
const prodAllNodeParents = buildNodeParentMap(prodDoc);
const refAllNodeByName   = buildNodeByName(refDoc);
const prodAllNodeByName  = buildNodeByName(prodDoc);

// Accumulate world rotation by walking the ENTIRE scene-node chain
// (not just joint ancestors). Catches the Armature root rotation.
function fullWorldRot(name, nodeByName, nodeParents, localOverride) {
  const chain = [];
  let cur = name;
  while (cur) { chain.unshift(cur); cur = nodeParents.get(cur); }
  let q = [0,0,0,1];
  for (const x of chain) {
    const lr = (localOverride && localOverride.has(x)) ? localOverride.get(x) : nodeByName.get(x).getRotation();
    q = qNorm(qMul(q, lr));
  }
  return q;
}

function accumWorld(name, byName, parents, localRotOverride = null) {
  // Walk root→leaf, multiplying local rotations.
  const chain = [];
  let cur = name;
  while (cur) { chain.unshift(cur); cur = parents.get(cur); }
  let q = [0,0,0,1];
  for (const n of chain) {
    const r = localRotOverride && localRotOverride.has(n) ? localRotOverride.get(n) : byName.get(n).getRotation();
    q = qNorm(qMul(q, r));
  }
  return q;
}

// ---- compute bind world rotations (full scene chain) ----------------------
const refBindWorld  = new Map();
for (const j of refJoints)  refBindWorld.set(j.getName(),  fullWorldRot(j.getName(),  refAllNodeByName,  refAllNodeParents));
const prodBindWorld = new Map();
for (const j of prodJoints) prodBindWorld.set(j.getName(), fullWorldRot(j.getName(), prodAllNodeByName, prodAllNodeParents));

// Height ratio for Hips translation transfer.
// Use thigh-to-head world bind distance as proxy.
function bindHeight(joints, parents, byName, hipName, headName) {
  // crude: accumulate translations along the chain head→hip
  const chain = [];
  let cur = headName;
  while (cur && cur !== hipName) { chain.unshift(cur); cur = parents.get(cur); }
  // We need actual world positions of bind. Quick: use head world translation.
  function worldT(name) {
    const c = [];
    let cu = name;
    while (cu) { c.unshift(cu); cu = parents.get(cu); }
    let t = [0,0,0], r = [0,0,0,1];
    for (const n of c) {
      const node = byName.get(n);
      const lt = node.getTranslation();
      // t = t + r * lt
      const rotated = qRotateVec(r, lt);
      t = [t[0]+rotated[0], t[1]+rotated[1], t[2]+rotated[2]];
      r = qMul(r, node.getRotation());
    }
    return t;
  }
  const hp = worldT(hipName), hd = worldT(headName);
  return Math.hypot(hd[0]-hp[0], hd[1]-hp[1], hd[2]-hp[2]);
}
function qRotateVec(q, v) {
  const [x,y,z,w] = q;
  const ix =  w*v[0] + y*v[2] - z*v[1];
  const iy =  w*v[1] + z*v[0] - x*v[2];
  const iz =  w*v[2] + x*v[1] - y*v[0];
  const iw = -x*v[0] - y*v[1] - z*v[2];
  return [
    ix*w + iw*-x + iy*-z - iz*-y,
    iy*w + iw*-y + iz*-x - ix*-z,
    iz*w + iw*-z + ix*-y - iy*-x,
  ];
}

const refHeight  = bindHeight(refJoints,  refParents,  refByName,  'Root_M', 'Head_M');
const prodHeight = bindHeight(prodJoints, prodParents, prodByName, 'hips', 'head');
const heightRatio = prodHeight / refHeight;
console.log(`[retarget] ref h=${refHeight.toFixed(3)} prod h=${prodHeight.toFixed(3)} ratio=${heightRatio.toFixed(3)}`);

// ---- sample reference animations and retarget -----------------------------
const buf = prodRoot.listBuffers()[0] ?? prodDoc.createBuffer();

// Wipe existing prod animations.
for (const a of prodRoot.listAnimations()) a.dispose();

// Clips to copy from reference. (Use idle/walk/run for direct comparison;
// 'attack' is approximated by 'agree' since reference has no attack.)
// The reference (Unity #219979) ships real idle/walk/run/attack clips, so we
// transfer all four directly — no walk-sourced-run hack, no procedural attack.
const CLIPS_TO_TRANSFER = ['idle', 'walk', 'run', 'attack'];

function sampleRefAt(anim, jointName, time) {
  // Find a rotation channel for this joint; sample LINEAR
  for (const ch of anim.listChannels()) {
    if (ch.getTargetNode().getName() !== jointName) continue;
    if (ch.getTargetPath() !== 'rotation') continue;
    const s = ch.getSampler();
    const times = s.getInput().getArray();
    const vals = s.getOutput().getArray();
    // clamp
    if (time <= times[0]) return [vals[0], vals[1], vals[2], vals[3]];
    if (time >= times[times.length-1]) {
      const n = times.length-1;
      return [vals[n*4], vals[n*4+1], vals[n*4+2], vals[n*4+3]];
    }
    // binary search
    let lo=0, hi=times.length-1;
    while (lo+1 < hi) { const m=(lo+hi)>>1; if (times[m] <= time) lo=m; else hi=m; }
    const t0 = times[lo], t1 = times[hi];
    const u = (time - t0) / (t1 - t0);
    // slerp
    const a = [vals[lo*4], vals[lo*4+1], vals[lo*4+2], vals[lo*4+3]];
    const b = [vals[hi*4], vals[hi*4+1], vals[hi*4+2], vals[hi*4+3]];
    return qSlerp(a, b, u);
  }
  // No animation channel → use rest rotation
  return refByName.get(jointName).getRotation();
}
function qSlerp(a, b, t) {
  let d = a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
  let bb = b.slice();
  if (d < 0) { for (let i=0;i<4;i++) bb[i]=-bb[i]; d=-d; }
  if (d > 0.9995) return qNorm([a[0]+(bb[0]-a[0])*t,a[1]+(bb[1]-a[1])*t,a[2]+(bb[2]-a[2])*t,a[3]+(bb[3]-a[3])*t]);
  const th=Math.acos(Math.min(1,d)), s=Math.sin(th);
  const wa=Math.sin((1-t)*th)/s, wb=Math.sin(t*th)/s;
  return [a[0]*wa+bb[0]*wb,a[1]*wa+bb[1]*wb,a[2]*wa+bb[2]*wb,a[3]*wa+bb[3]*wb];
}
function sampleRefTranslationAt(anim, jointName, time) {
  for (const ch of anim.listChannels()) {
    if (ch.getTargetNode().getName() !== jointName) continue;
    if (ch.getTargetPath() !== 'translation') continue;
    const s = ch.getSampler();
    const times = s.getInput().getArray();
    const vals = s.getOutput().getArray();
    if (time <= times[0]) return [vals[0], vals[1], vals[2]];
    if (time >= times[times.length-1]) {
      const n = times.length-1;
      return [vals[n*3], vals[n*3+1], vals[n*3+2]];
    }
    let lo=0, hi=times.length-1;
    while (lo+1 < hi) { const m=(lo+hi)>>1; if (times[m] <= time) lo=m; else hi=m; }
    const t0 = times[lo], t1 = times[hi];
    const u = (time - t0) / (t1 - t0);
    return [
      vals[lo*3] + (vals[hi*3] - vals[lo*3]) * u,
      vals[lo*3+1] + (vals[hi*3+1] - vals[lo*3+1]) * u,
      vals[lo*3+2] + (vals[hi*3+2] - vals[lo*3+2]) * u,
    ];
  }
  return refByName.get(jointName).getTranslation();
}

function retargetClip(srcName, dstName, opts = {}) {
  const refAnim = refRoot.listAnimations().find(a => a.getName() === srcName);
  if (!refAnim) { console.warn(`[retarget] ref clip '${srcName}' missing`); return; }
  // Determine clip duration from any sampler.
  let dur = 0;
  for (const ch of refAnim.listChannels()) {
    const t = ch.getSampler().getInput().getArray();
    if (t.length) dur = Math.max(dur, t[t.length-1]);
  }
  const nFrames = 30;
  // Poses are SAMPLED across the source's full duration (`dur`) but the clip
  // is EMITTED with timestamps scaled by emitDurScale. emitDurScale < 1 plays
  // the same clean motion faster — e.g. run is derived from the verified-clean
  // walk at a faster cadence rather than from the reference's extreme sprint,
  // which crumpled the bulky armored mesh. General: any character whose walk
  // works gets a safe run for free.
  const emitDurScale = opts.emitDurScale ?? 1;
  const emitDur = dur * emitDurScale;
  const times = new Float32Array(nFrames);       // emitted keyframe timestamps
  const sampleTimes = new Float32Array(nFrames); // source sampling times
  for (let i=0; i<nFrames; i++) {
    times[i]       = (i / (nFrames-1)) * emitDur;
    sampleTimes[i] = (i / (nFrames-1)) * dur;
  }

  const anim = prodDoc.createAnimation(dstName);
  const timeAcc = prodDoc.createAccessor().setArray(times).setType('SCALAR').setBuffer(buf);

  // Per-frame: build refLocalRotMap, then accumulate refWorld for each mapped bone,
  // compute deltaWorld, then prodNewWorld = deltaWorld * prodBindWorld, then
  // prodLocal = prodParentWorld^-1 * prodNewWorld.
  // We also need the prodParentWorld to be consistent with the retargeted ancestors,
  // so we propagate top-down.
  const orderedProd = topoOrder(prodJoints, prodParents);

  // Storage: per-bone, per-frame rotations to write.
  const prodLocalsPerBone = new Map();
  for (const j of prodJoints) prodLocalsPerBone.set(j.getName(), new Float32Array(nFrames * 4));

  for (let f = 0; f < nFrames; f++) {
    const time = sampleTimes[f];

    // Sample reference's current local rotations (only mapped bones; others stay bind).
    // localOverride map keyed by NODE name (covers both joints and scene roots).
    const refLocalAtFrame = new Map();
    for (const refName of Object.keys(BONE_MAP)) {
      refLocalAtFrame.set(refName, sampleRefAt(refAnim, refName, time));
    }
    // Compute reference current world rotations via FULL node chain (incl. Armature root).
    const refWorldAtFrame = new Map();
    for (const j of refJoints) {
      refWorldAtFrame.set(j.getName(), fullWorldRot(j.getName(), refAllNodeByName, refAllNodeParents, refLocalAtFrame));
    }

    // Compute prod retargeted rotations top-down using full node chain.
    const prodNewWorld = new Map();
    // Per-frame local-rotation override map for the production side; seeded
    // with bind locals for any node not on the retargeted list.
    const prodLocalOverride = new Map();
    for (const pname of orderedProd) {
      // Reverse map: find ref name for this prod bone.
      let refName = null;
      for (const [r, p] of Object.entries(BONE_MAP)) if (p === pname) { refName = r; break; }

      // Compute the "parent world" by accumulating along the FULL node chain
      // using whatever locals have already been set in prodLocalOverride.
      const parentP = prodAllNodeParents.get(pname);
      const parentNewWorld = parentP
        ? fullWorldRot(parentP, prodAllNodeByName, prodAllNodeParents, prodLocalOverride)
        : [0,0,0,1];

      let newLocal;
      if (refName) {
        let newW;
        if (ABSOLUTE) {
          // Absolute: production bone gets the reference's WORLD rotation verbatim.
          newW = refWorldAtFrame.get(refName);
        } else {
          // Delta: production stays at its own bind; transfer the reference's motion delta.
          let deltaW = qNorm(qMul(refWorldAtFrame.get(refName), qInv(refBindWorld.get(refName))));
          // Clip-aware torso damping. The Unity #219979 reference's locomotion
          // (RunForward as walk, Sprint as run) has a pronounced forward lean,
          // and its melee attack has large spine rotation. Transferred raw onto
          // the bulky armored production body — whose cape extends the
          // silhouette — that over-rotates hips/spine/neck into a forward
          // crumple. A heavy armored character legitimately leans far less
          // than a lithe runner, so hard torso damping is character-appropriate
          // (general, not a per-archetype hack).
          const torsoFactor =
            (dstName === 'run')    ? 0.15 :
            (dstName === 'walk')   ? 0.18 :
            (dstName === 'attack') ? 0.30 :
            (dstName === 'idle')   ? 0.55 : 0.40;
          if (pname === 'hips' || pname === 'spine_01' || pname === 'spine_02' ||
              pname === 'spine_03' || pname === 'neck') {
            deltaW = attenuateAxisAngle(deltaW, torsoFactor);
          }
          // Clip-aware arm damping. The reference melee swing rotates the
          // shoulder/upper-arm well past 90°; transferred raw onto the
          // production rig the geodesic skin weights at the shoulder can't
          // hold that and the arm mesh tears apart (the torso fix above does
          // not cover limbs). Damping the swing to a safe amplitude keeps it
          // readable as a strike without shattering. General: any character's
          // attack arm gets the same treatment. Locomotion arm-swing is small
          // enough that the skin holds, so it is left undamped.
          const armFactor = (dstName === 'attack') ? 0.45 : 1.0;
          if (armFactor < 1.0 &&
              (pname === 'r_shoulder' || pname === 'r_upperarm' ||
               pname === 'r_forearm'  || pname === 'r_hand' ||
               pname === 'l_shoulder' || pname === 'l_upperarm' ||
               pname === 'l_forearm'  || pname === 'l_hand')) {
            deltaW = attenuateAxisAngle(deltaW, armFactor);
          }
          // Clip-aware safety clamp: no single bone may rotate past this angle
          // from its bind. Locomotion is clamped tight to kill the crumple;
          // attack arm is already damped above, so a moderate cap keeps the
          // residual swing bounded. General — applies to every bone/character.
          const maxDelta =
            (dstName === 'attack') ? 1.00 :   // ~57°
            (dstName === 'idle')   ? 1.10 :   // ~63°
                                     0.95;    // ~54° (walk/run)
          deltaW = clampAxisAngle(deltaW, maxDelta);
          newW = qNorm(qMul(deltaW, prodBindWorld.get(pname)));
        }
        newLocal = qNorm(qMul(qInv(parentNewWorld), newW));
        prodNewWorld.set(pname, newW);
      } else {
        newLocal = prodByName.get(pname).getRotation();
        prodNewWorld.set(pname, qNorm(qMul(parentNewWorld, newLocal)));
      }
      prodLocalOverride.set(pname, newLocal);
      const arr = prodLocalsPerBone.get(pname);
      arr[f*4]   = newLocal[0];
      arr[f*4+1] = newLocal[1];
      arr[f*4+2] = newLocal[2];
      arr[f*4+3] = newLocal[3];
    }
  }

  // Emit one rotation channel per mapped prod bone.
  let chCount = 0;
  for (const pname of Object.values(BONE_MAP)) {
    const arr = prodLocalsPerBone.get(pname);
    const valAcc = prodDoc.createAccessor().setArray(arr).setType('VEC4').setBuffer(buf);
    const sampler = prodDoc.createAnimationSampler().setInput(timeAcc).setOutput(valAcc).setInterpolation('LINEAR');
    const ch = prodDoc.createAnimationChannel().setTargetNode(prodByName.get(pname)).setTargetPath('rotation').setSampler(sampler);
    anim.addSampler(sampler).addChannel(ch);
    chCount++;
  }

  // Skip hips translation transfer — the simple-rts game drives world
  // position itself, and the reference's translation is in armature-rotated
  // frame which would float the character if applied raw.
  console.log(`[retarget] '${srcName}' → '${dstName}': ${chCount} rot ch, ${nFrames} frames, ${dur.toFixed(2)}s`);
}

function topoOrder(joints, parents) {
  const order = [];
  const have = new Set();
  function visit(name) {
    if (have.has(name)) return;
    const p = parents.get(name);
    if (p) visit(p);
    have.add(name);
    order.push(name);
  }
  for (const j of joints) visit(j.getName());
  return order;
}

// All four clips come straight from the reference asset's own animations
// (idle/walk/run/attack), including a genuine one-handed melee swing.
for (const name of CLIPS_TO_TRANSFER) retargetClip(name, name);

function synthesizeAttackClip(dur, fps) {
  const TAU = Math.PI * 2;
  const anim = prodDoc.createAnimation('attack');
  const nFrames = Math.max(2, Math.round(dur * fps));
  const times = new Float32Array(nFrames);
  for (let i = 0; i < nFrames; i++) times[i] = (i / (nFrames-1)) * dur;
  const timeAcc = prodDoc.createAccessor().setArray(times).setType('SCALAR').setBuffer(buf);

  // Curves authored in WORLD axes (X=side, Y=up, Z=forward, matches retarget):
  // Right arm raises behind/above the head (negative angle around world X is
  // forward-down rotation; we want backward-up then strike, so we use a
  // sin-shaped curve from 0 → -windup → 0 → +strike → 0).
  // For each bone we describe the keyframe values directly so the motion
  // feels deliberate, not a sinusoid.
  // Shape per frame: u = i / (nFrames-1) ∈ [0,1]
  //   wind-up:  u in [0, 0.35]  arm goes back/up
  //   strike:   u in [0.35, 0.55] arm swings forward-down fast
  //   recover:  u in [0.55, 1.0] arm returns smoothly
  function shape(u) {
    if (u < 0.35) {
      const t = u / 0.35;
      return -t * t;                       // wind-up to -1
    } else if (u < 0.55) {
      const t = (u - 0.35) / 0.20;
      return -1 + 1.7 * (3*t*t - 2*t*t*t); // smoothstep from -1 to +0.7 (strike)
    } else {
      const t = (u - 0.55) / 0.45;
      return 0.7 - 0.7 * (3*t*t - 2*t*t*t); // smoothstep from +0.7 back to 0
    }
  }
  // Empirically determined: the WALK clip's retarget already raises the
  // right arm via the reference's per-frame delta. Walk f13 (peak arm-raise)
  // showed the arm correctly going up+forward. That delta acts around
  // world X with NEGATIVE shape (because of the bind orientation), so for
  // the wind-up→strike→recover arc we use shape(u)*amp around X, with the
  // axis flipped (negative amp) so the wind-up phase actually goes
  // backward-up instead of forward-down.
  const CURVES = [
    ['r_upperarm', [1,0,0], -1.6],  // dominant: overhead-swing arc (flipped)
    ['r_forearm',  [1,0,0], -0.7],  // bend elbow to chamber strike
    ['l_upperarm', [1,0,0],  0.25], // counter-balance left arm
    ['spine_02',   [1,0,0], -0.15], // spine wind-back then forward-tilt
    ['hips',       [0,1,0], -0.18], // hip twist for power
  ];

  for (const [pname, worldAxis, amp] of CURVES) {
    const node = prodByName.get(pname);
    if (!node) continue;
    const rest = node.getRotation();
    const Qw = prodBindWorld.get(pname);
    const axisLocal = (() => {
      // axisLocal = Qw^-1 * worldAxis  (vector rotated by inverse rotation)
      const q = qInv(Qw);
      const v = worldAxis;
      const [x,y,z,w] = q;
      const ix =  w*v[0] + y*v[2] - z*v[1];
      const iy =  w*v[1] + z*v[0] - x*v[2];
      const iz =  w*v[2] + x*v[1] - y*v[0];
      const iw = -x*v[0] - y*v[1] - z*v[2];
      const out = [
        ix*w + iw*-x + iy*-z - iz*-y,
        iy*w + iw*-y + iz*-x - ix*-z,
        iz*w + iw*-z + ix*-y - iy*-x,
      ];
      const L = Math.hypot(...out) || 1;
      return [out[0]/L, out[1]/L, out[2]/L];
    })();
    const values = new Float32Array(nFrames * 4);
    for (let i = 0; i < nFrames; i++) {
      const u = i / (nFrames - 1);
      const angle = amp * shape(u);
      const h = angle / 2, s = Math.sin(h);
      const delta = [axisLocal[0]*s, axisLocal[1]*s, axisLocal[2]*s, Math.cos(h)];
      // new_local = rest * delta
      const q = qNorm(qMul(rest, delta));
      values[i*4]   = q[0];
      values[i*4+1] = q[1];
      values[i*4+2] = q[2];
      values[i*4+3] = q[3];
    }
    const valAcc = prodDoc.createAccessor().setArray(values).setType('VEC4').setBuffer(buf);
    const sampler = prodDoc.createAnimationSampler().setInput(timeAcc).setOutput(valAcc).setInterpolation('LINEAR');
    const ch = prodDoc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(sampler);
    anim.addSampler(sampler).addChannel(ch);
  }
  console.log(`[retarget] synthesized 'attack' on prod rig: ${CURVES.length} channels, ${nFrames} frames, ${dur}s`);
}

await io.write(outPath, prodDoc);
const st = await stat(outPath);
console.log(`[retarget] wrote ${outPath} (${(st.size/1024).toFixed(1)} KB)`);
