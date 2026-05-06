import * as THREE from 'three';
import { buildWeaponArm, makeHorse, makeWings } from './lib/weapons.js';

export const MAX_HP = 100;

const TEAM_PALETTE = [
  { livery: 0x3a6dd1, accent: 0xf3c259, ring: 0x6dc2ff },
  { livery: 0xc44545, accent: 0x2a2a2a, ring: 0xff8b6b },
];

const RACE_VISUALS = {
  humans:    { skin: 0xe6c39a, helmet: 0xc4a14a, scaleY: 1.00, width: 1.00, accessory: null,    capH: 0.45 },
  dwarves:   { skin: 0xd9a06d, helmet: 0x707378, scaleY: 0.78, width: 1.16, accessory: 'beard', capH: 0.32 },
  elves:     { skin: 0xd2e6b4, helmet: 0x4a8a4a, scaleY: 1.10, width: 0.90, accessory: 'ears',  capH: 0.65 },
  skeletons: { skin: 0xeee5d0, helmet: 0x6a6a6a, scaleY: 0.95, width: 0.92, accessory: 'skull', capH: 0.0  },
};

function lambert(color, flat = false) {
  return new THREE.MeshLambertMaterial({ color, flatShading: flat });
}
function basic(color) { return new THREE.MeshBasicMaterial({ color }); }


function makeBody(team, raceKey, armorTier = 0, weaponTier = 0, klass = 'infantry') {
  const v = RACE_VISUALS[raceKey] || RACE_VISUALS.humans;
  const liveryMat = lambert(team.livery);
  const accentMat = lambert(team.accent);
  const skinMat   = lambert(v.skin);
  const helmetMat = lambert(v.helmet, true);
  const boneMat   = lambert(0xeee5d0);
  const dark      = lambert(0x2a2a2a);
  const beltMat   = lambert(0x4a3a2a);
  const eyeMat    = basic(0x101015);

  const g = new THREE.Group();

  const bootGeom = new THREE.CylinderGeometry(0.16, 0.20, 0.30, 6);
  const bootL = new THREE.Mesh(bootGeom, dark); bootL.position.set(-0.18, 0.15, 0); bootL.castShadow = true;
  const bootR = new THREE.Mesh(bootGeom, dark); bootR.position.set( 0.18, 0.15, 0); bootR.castShadow = true;
  const legGeom = new THREE.CylinderGeometry(0.16, 0.18, 0.50, 6);
  const legL = new THREE.Mesh(legGeom, accentMat); legL.position.set(-0.18, 0.55, 0); legL.castShadow = true;
  const legR = new THREE.Mesh(legGeom, accentMat); legR.position.set( 0.18, 0.55, 0); legR.castShadow = true;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.06, 6, 14), beltMat);
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.85;

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.85, 8), liveryMat);
  torso.position.y = 1.30; torso.castShadow = true;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.10), accentMat);
  chest.position.set(0, 1.35, 0.36); chest.castShadow = true;
  chest.scale.set(1 + armorTier * 0.12, 1 + armorTier * 0.10, 1 + armorTier * 0.45);

  const paldGeom = new THREE.SphereGeometry(0.18, 8, 6);
  const paldL = new THREE.Mesh(paldGeom, accentMat);
  paldL.position.set(-0.50, 1.65, 0); paldL.scale.set(1, 0.7, 1); paldL.castShadow = true;
  const paldR = new THREE.Mesh(paldGeom, accentMat);
  paldR.position.set( 0.50, 1.65, 0); paldR.scale.set(1, 0.7, 1); paldR.castShadow = true;
  const armGeom = new THREE.CylinderGeometry(0.10, 0.12, 0.50, 6);
  const armL = new THREE.Mesh(armGeom, liveryMat); armL.position.set(-0.45, 1.30, 0); armL.castShadow = true;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.16, 6),
    raceKey === 'skeletons' ? boneMat : skinMat);
  neck.position.y = 1.78;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(raceKey === 'skeletons' ? 0.24 : 0.27, 12, 10),
    raceKey === 'skeletons' ? boneMat : skinMat
  );
  head.position.y = 2.00; head.castShadow = true;

  const eyeGeom = new THREE.SphereGeometry(raceKey === 'skeletons' ? 0.06 : 0.04, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeom, eyeMat); eyeL.position.set(-0.10, 2.04, 0.22);
  const eyeR = new THREE.Mesh(eyeGeom, eyeMat); eyeR.position.set( 0.10, 2.04, 0.22);

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.04), accentMat);
  cape.position.set(0, 1.30, -0.40); cape.rotation.x = -0.10;

  g.add(bootL, bootR, legL, legR, belt, torso, chest, paldL, paldR, armL, neck, head, eyeL, eyeR, cape);

  if (v.capH > 0) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, v.capH, 8), helmetMat);
    cap.position.y = 2.20 + v.capH * 0.5 - 0.10; cap.castShadow = true;
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.04, 6, 14), helmetMat);
    brim.rotation.x = Math.PI / 2; brim.position.y = 2.18;
    g.add(cap, brim);
  }

  if (v.accessory === 'beard') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 6), lambert(0x6e3f1f));
    beard.position.set(0, 1.85, 0.18); beard.scale.set(1.0, 0.85, 0.7); beard.castShadow = true;
    g.add(beard);
  } else if (v.accessory === 'ears') {
    const earGeom = new THREE.ConeGeometry(0.06, 0.22, 6);
    const earMat = lambert(v.skin);
    const earL = new THREE.Mesh(earGeom, earMat);
    earL.position.set(-0.27, 2.10, 0); earL.rotation.z = Math.PI / 2;
    const earR = new THREE.Mesh(earGeom, earMat);
    earR.position.set( 0.27, 2.10, 0); earR.rotation.z = -Math.PI / 2;
    g.add(earL, earR);
  } else if (v.accessory === 'skull') {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.18), boneMat);
    jaw.position.set(0, 1.86, 0.05);
    g.add(jaw);
  }

  const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.05, 16), liveryMat);
  shieldDisc.position.set(-0.58, 1.30, 0.05); shieldDisc.rotation.z = Math.PI / 2;
  shieldDisc.castShadow = true;
  const sboss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), accentMat);
  sboss.position.set(-0.63, 1.30, 0.05);
  g.add(shieldDisc, sboss);

  const weaponArm = buildWeaponArm(team, raceKey, helmetMat, weaponTier, klass);
  g.add(weaponArm);
  g.userData.weaponArm = weaponArm;
  g.rotation.order = 'YXZ';

  const ks = klass === 'beast' ? 1.45 : klass === 'archer' ? 0.94 : 1.0;
  g.scale.set(v.width * ks, v.scaleY * ks, v.width * ks);
  return g;
}

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

  const body = makeBody(team, raceKey, stats?.armorTier || 0, stats?.weaponTier || 0, stats?.klass);
  const ring = makeRing(team);
  const hp = makeHpBar();
  root.add(body, ring, hp);
  let bodyBaseY = 0;
  let wingsRig = null;
  if (stats?.klass === 'cavalry') { root.add(makeHorse(team)); bodyBaseY = 1.45; body.position.y = bodyBaseY; }
  if (stats?.klass === 'flyer') { wingsRig = makeWings(team); body.add(wingsRig); }

  const u = {
    mesh: root,
    body,
    ring,
    hpBar: hp,
    weaponArm: body.userData.weaponArm,
    team: teamIdx,
    raceKey: raceKey || 'humans',
    maxHp: stats ? stats.hp : MAX_HP,
    hp: stats ? stats.hp : MAX_HP,
    damage: stats ? stats.damage : 22,
    speed: stats ? stats.speed : 7,
    range: stats ? stats.range : 2.4,
    swingPeriod: stats?.swingPeriod || SWING_PERIOD[raceKey] || 1.0,
    klass: stats?.klass || 'infantry',
    swingT: 0,
    hitDealt: false,
    bodyBaseY,
    wingsRig,
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
  let armA = 0, tilt = 0, bobY = 0;
  if (attacking) {
    const sp = (u.swingT || 0) / (u.swingPeriod || 1.0);
    if (sp < 0.4) { const k = sp / 0.4; armA = 2.0 * k; tilt = -0.06 * k; }
    else if (sp < 0.55) { const k = (sp - 0.4) / 0.15; armA = 2.0 - 2.5 * k; tilt = -0.06 + 0.36 * k; }
    else { const k = (sp - 0.55) / 0.45; armA = -0.5 + 0.5 * k; tilt = 0.30 - 0.30 * k; }
  } else if (moving) {
    const ph = t * 9 + u.x * 0.7;
    bobY = Math.abs(Math.sin(ph)) * 0.11;
    armA = Math.sin(ph * 0.5) * 0.25; tilt = Math.sin(ph * 0.5) * 0.04;
  }
  if (u.weaponArm) u.weaponArm.rotation.x = armA;
  u.body.rotation.x = tilt; u.body.rotation.z = 0;
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
