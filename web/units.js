import * as THREE from 'three';
import { makeHorse, makeWings, deriveWeaponStyle, animForWeapon, weaponPose } from './lib/weapons.js';
import { buildStatusAuras, updateStatusAuras } from './lib/modes/effects.js';
import { makeBody } from './game_asset_creator/src/anatomy.js';
import { loadHumanoid, isHumanoidReady, buildHumanoidUnit, playClip } from './game_asset_creator/src/loader.js';
loadHumanoid().catch(() => {});

export const MAX_HP = 100;

const TEAM_PALETTE = [
  { livery: 0x3a6dd1, accent: 0xf3c259, ring: 0x6dc2ff },
  { livery: 0xc44545, accent: 0x2a2a2a, ring: 0xff8b6b },
];


function makeRing(team) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: team.ring, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  return ring;
}

function makeHpBar() {
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x6ee37a })
  );
  fill.position.z = 0.001;
  const grp = new THREE.Group();
  grp.add(bg, fill);
  grp.position.y = 3.0;
  grp.userData.fill = fill;
  return grp;
}

const SWING_PERIOD = { humans: 1.0, dwarves: 1.4, elves: 0.7, skeletons: 0.9 };

export function makeUnit(teamIdx, x, z, stats, raceKey) {
  const team = TEAM_PALETTE[teamIdx];
  const root = new THREE.Group();
  root.position.set(x, 0, z);

  const weaponStyle = deriveWeaponStyle(raceKey, stats?.klass, stats?.weaponStyle);
  let body, gltfRig = null;
  if (isHumanoidReady() && stats?.klass !== 'cavalry' && stats?.klass !== 'flyer' && stats?.klass !== 'beast') {
    gltfRig = buildHumanoidUnit(team);
    body = gltfRig.root;
    body.userData = {};
    playClip(gltfRig, 'Idle');
  } else {
    body = makeBody(team, raceKey, stats?.armorTier || 0, stats?.weaponTier || 0, stats?.klass, raceKey, weaponStyle);
  }
  const ring = makeRing(team);
  const hp = makeHpBar();
  root.add(body, ring, hp);
  let bodyBaseY = 0;
  let wingsRig = null;
  if (stats?.klass === 'cavalry') { root.add(makeHorse(team)); bodyBaseY = 1.45; body.position.y = bodyBaseY; }
  if (stats?.klass === 'flyer') { const swarm = (stats.maxHp || 0) < 50; wingsRig = makeWings(team, raceKey, swarm); body.add(wingsRig); if (swarm) body.scale.multiplyScalar(0.6); }
  const statusAuras = buildStatusAuras();
  body.add(statusAuras);

  const u = {
    mesh: root,
    body,
    ring,
    hpBar: hp,
    weaponArm: body.userData.weaponArm,
    shieldArm: body.userData.shieldArm,
    twoHand: body.userData.twoHand,
    gltfRig,
    team: teamIdx,
    raceKey: raceKey || 'humans',
    maxHp: stats ? stats.hp : MAX_HP,
    hp: stats ? stats.hp : MAX_HP,
    damage: stats ? stats.damage : 22,
    speed: stats ? stats.speed : 7,
    range: stats ? stats.range : 2.4,
    swingPeriod: stats?.swingPeriod || SWING_PERIOD[raceKey] || 1.0,
    klass: stats?.klass || 'infantry',
    weaponStyle, weaponAnim: animForWeapon(weaponStyle),
    swingT: 0,
    hitDealt: false,
    bodyBaseY,
    wingsRig,
    statusAuras,
    x, z,
    vx: 0, vz: 0,
    attackTarget: null,
  };
  body.traverse((m) => { if (m.isMesh) m.userData.unit = u; });
  return u;
}

const DEATH_ANIM = 0.55;

export function updateUnitVisuals(u, camera, t) {
  u.mesh.position.x = u.x;
  u.mesh.position.z = u.z;
  updateStatusAuras(u, t);
  if (u.gltfRig) u.gltfRig.mixer.update(1 / 60);

  if (u.hp <= 0) {
    if (u.deadAt == null) {
      u.deadAt = t;
      u.deathFall = (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2;
      u.ring.visible = false;
      u.hpBar.visible = false;
    }
    const p = Math.min(1, (t - u.deadAt) / DEATH_ANIM);
    const eased = 1 - Math.pow(1 - p, 2);
    u.body.rotation.x = eased * u.deathFall * 0.7;
    u.body.rotation.z = eased * 0.15;
    u.body.position.y = (u.bodyBaseY || 0) - 0.6 * eased;
    return;
  }

  let faceX = u.vx, faceZ = u.vz;
  if (Math.hypot(faceX, faceZ) < 0.1 && u.attackTarget && u.attackTarget.hp > 0) {
    faceX = u.attackTarget.x - u.x;
    faceZ = u.attackTarget.z - u.z;
  }
  if (faceX !== 0 || faceZ !== 0) {
    u.body.rotation.y = Math.atan2(faceX, faceZ);
  }

  const moving = Math.hypot(u.vx, u.vz) > 0.4;
  const tgt = u.attackTarget && u.attackTarget.hp > 0 ? u.attackTarget : null;
  const dSq = tgt ? (tgt.x - u.x) ** 2 + (tgt.z - u.z) ** 2 : 1e9;
  const attacking = !moving && tgt && dSq < (u.range + 0.5) ** 2;
  let armA = 0, tilt = 0, bobY = 0, armZ = 0, armRotZ = 0;
  if (attacking) {
    const sp = (u.swingT || 0) / (u.swingPeriod || 1.0);
    const r = weaponPose(u.weaponAnim || 'slash', sp);
    armA = r.armA; tilt = r.tilt; armZ = r.armZ || 0; armRotZ = r.armRotZ || 0;
  } else if (moving) {
    const ph = t * 9 + u.x * 0.7;
    bobY = Math.abs(Math.sin(ph)) * 0.11;
    armA = Math.sin(ph * 0.5) * 0.25; tilt = Math.sin(ph * 0.5) * 0.04;
  }
  if (u.weaponArm) { u.weaponArm.rotation.x = armA; u.weaponArm.rotation.z = armRotZ; u.weaponArm.position.z = armZ; }
  if (!attacking && u.attackTarget && u.attackTarget.attackTarget === u && u.weaponArm) {
    const tsp = (u.attackTarget.swingT || 0) / (u.attackTarget.swingPeriod || 1.0);
    if (tsp > 0.30 && tsp < 0.55) u.weaponArm.rotation.x = -1.2;
  }
  let shieldA = 0;
  if (tgt) {
    const sp = (u.swingT || 0) / (u.swingPeriod || 1.0);
    shieldA = !attacking ? -0.5
            : sp < 0.35 ? -0.4 - 0.5 * (sp / 0.35)
            : sp < 0.55 ? -0.9 + 0.6 * ((sp - 0.35) / 0.20)
            : -0.3 - 0.9 * ((sp - 0.55) / 0.45);
  }
  if (u.recoilStart != null && t - u.recoilStart < 0.18) shieldA = -1.3;
  if (u.shieldArm) {
    u.shieldArm.rotation.x = u.twoHand ? armA * 0.75 : shieldA;
    if (u.twoHand) u.shieldArm.rotation.z = -armRotZ * 0.5;
  }
  const ra = u.recoilStart != null ? (t - u.recoilStart) / 0.18 : 1;
  const lean = ra < 1 ? ((u.x | 0) % 2 === 0 ? 1 : -1) * 0.22 * (1 - ra) : 0;
  u.body.rotation.x = tilt; u.body.rotation.z = lean;
  let recX = 0, recZ = 0;
  if (u.recoilStart != null) {
    const age = t - u.recoilStart;
    if (age < 0.20) {
      const fade = 1 - age / 0.20;
      recX = (u.recoilDirX || 0) * 0.22 * fade;
      recZ = (u.recoilDirZ || 0) * 0.22 * fade;
    } else u.recoilStart = null;
  }
  u.body.position.set(recX, (u.bodyBaseY || 0) + bobY, recZ);
  if (u.wingsRig) {
    const flap = Math.sin(t * 12 + u.x * 0.3) * 0.5;
    u.wingsRig.userData.wingL.rotation.z = 0.15 + flap;
    u.wingsRig.userData.wingR.rotation.z = -0.15 - flap;
  }

  if (u.team === 0) {
    u.ring.visible = true;
    const k = 1 + Math.sin(t * 3 + u.x * 0.5) * 0.06;
    u.ring.scale.set(k, k, k);
  } else {
    u.ring.visible = false;
  }

  u.hpBar.lookAt(camera.position);
  const ratio = Math.max(0, u.hp / u.maxHp);
  u.hpBar.userData.fill.scale.x = ratio;
  u.hpBar.userData.fill.position.x = -0.58 * (1 - ratio);
  u.hpBar.userData.fill.material.color.setHex(
    ratio > 0.5 ? 0x6ee37a : ratio > 0.25 ? 0xf3c259 : 0xe36a6a
  );
  u.hpBar.visible = u.hp > 0 && u.hp < u.maxHp;
}

export function killVisuals(u) {
  if (u.deadAt == null) u.deadAt = -1;
}
