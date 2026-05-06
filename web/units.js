import * as THREE from 'three';

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

function makeBody(team, raceKey) {
  const v = RACE_VISUALS[raceKey] || RACE_VISUALS.humans;
  const liveryMat = new THREE.MeshLambertMaterial({ color: team.livery });
  const accentMat = new THREE.MeshLambertMaterial({ color: team.accent });
  const skinMat   = new THREE.MeshLambertMaterial({ color: v.skin });
  const helmetMat = new THREE.MeshLambertMaterial({ color: v.helmet, flatShading: true });
  const boneMat   = new THREE.MeshLambertMaterial({ color: 0xeee5d0 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8), liveryMat);
  torso.position.y = 1.05; torso.castShadow = true;

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.6, 8), accentMat);
  legs.position.y = 0.3; legs.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(raceKey === 'skeletons' ? 0.25 : 0.28, 10, 8),
    raceKey === 'skeletons' ? boneMat : skinMat
  );
  head.position.y = 1.85; head.castShadow = true;

  const g = new THREE.Group();
  g.add(legs, torso, head);

  if (v.capH > 0) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, v.capH, 8), helmetMat);
    cap.position.y = 1.85 + 0.18 + v.capH * 0.5 - 0.15;
    cap.castShadow = true;
    g.add(cap);
  }

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.55), liveryMat);
  shield.position.set(-0.55, 1.1, 0); shield.castShadow = true;
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), helmetMat);
  sword.position.set(0.5, 1.2, 0.15); sword.rotation.z = -0.3; sword.castShadow = true;
  g.add(shield, sword);

  if (v.accessory === 'beard') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x6e3f1f }));
    beard.position.set(0, 1.66, 0.2); beard.scale.set(1.0, 0.85, 0.7);
    beard.castShadow = true;
    g.add(beard);
  } else if (v.accessory === 'ears') {
    const earGeom = new THREE.ConeGeometry(0.06, 0.22, 6);
    const earMat = new THREE.MeshLambertMaterial({ color: v.skin });
    const earL = new THREE.Mesh(earGeom, earMat);
    earL.position.set(-0.28, 1.95, 0); earL.rotation.z = Math.PI / 2;
    const earR = new THREE.Mesh(earGeom, earMat);
    earR.position.set(0.28, 1.95, 0); earR.rotation.z = -Math.PI / 2;
    g.add(earL, earR);
  } else if (v.accessory === 'skull') {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x101015 });
    const eyeGeom = new THREE.SphereGeometry(0.05, 6, 6);
    const eL = new THREE.Mesh(eyeGeom, eyeMat); eL.position.set(-0.09, 1.9, 0.21);
    const eR = new THREE.Mesh(eyeGeom, eyeMat); eR.position.set( 0.09, 1.9, 0.21);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.18),
      new THREE.MeshLambertMaterial({ color: 0xeee5d0 }));
    jaw.position.set(0, 1.74, 0.05);
    g.add(eL, eR, jaw);
  }

  g.scale.set(v.width, v.scaleY, v.width);
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
  grp.position.y = 2.8;
  grp.userData.fill = fill;
  return grp;
}

export function makeUnit(teamIdx, x, z, stats, raceKey) {
  const team = TEAM_PALETTE[teamIdx];
  const root = new THREE.Group();
  root.position.set(x, 0, z);

  const body = makeBody(team, raceKey);
  const ring = makeRing(team);
  const hp = makeHpBar();
  root.add(body, ring, hp);

  const u = {
    mesh: root,
    body,
    ring,
    hpBar: hp,
    team: teamIdx,
    raceKey: raceKey || 'humans',
    maxHp: stats ? stats.hp : MAX_HP,
    hp: stats ? stats.hp : MAX_HP,
    damage: stats ? stats.damage : 22,
    speed: stats ? stats.speed : 7,
    range: stats ? stats.range : 2.4,
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
    u.body.position.y = -0.6 * eased;
    return;
  }

  if (u.vx !== 0 || u.vz !== 0) {
    const angle = Math.atan2(u.vx, u.vz);
    u.body.rotation.y = angle;
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
