import * as THREE from 'three';

export const BOSSES = {
  giant:  { id: 'giant',  name: 'Hill Giant',     icon: '🪨', skin: 0xb0a796, accent: 0x6d5a3d, scale: 3.4, hpMul: 7.5, dmgMul: 5.0, range: 2.6 },
  dragon: { id: 'dragon', name: 'Ancient Dragon', icon: '🐉', skin: 0x6e1a1a, accent: 0xc9a44a, scale: 3.0, hpMul: 9.0, dmgMul: 6.0, range: 6.5 },
  lich:   { id: 'lich',   name: 'Lich King',      icon: '👻', skin: 0xeae6cf, accent: 0x6cd6ff, scale: 3.2, hpMul: 6.5, dmgMul: 6.5, range: 5.0 },
  troll:  { id: 'troll',  name: 'Forest Troll',   icon: '🧌', skin: 0x4c7a3a, accent: 0x6e3f1f, scale: 3.0, hpMul: 7.0, dmgMul: 6.0, range: 2.4 },
};

const BOSS_ORDER = ['giant', 'dragon', 'lich', 'troll'];

export function bossForRound(n) {
  const idx = Math.floor((n / 5) - 1) % BOSS_ORDER.length;
  return BOSSES[BOSS_ORDER[(idx + BOSS_ORDER.length) % BOSS_ORDER.length]];
}

export function isBossRound(n) {
  return n > 0 && n % 5 === 0;
}

export function bossRoster(n, baseStats) {
  const boss = bossForRound(n);
  const scale = 1 + (n - 5) * 0.15;
  const hp = Math.round(baseStats.hp * boss.hpMul * scale);
  const dmg = Math.round(baseStats.damage * boss.dmgMul * scale);
  return [{
    maxHp: hp,
    currentHp: hp,
    damage: dmg,
    speed: baseStats.speed * 0.55,
    range: boss.range,
    isBoss: true,
    bossId: boss.id,
  }];
}

function lambert(color, flat = false) {
  return new THREE.MeshLambertMaterial({ color, flatShading: flat });
}
function sphere(r, color) { return new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), lambert(color)); }
function box(w, h, d, color) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color)); }
function cyl(rt, rb, h, color) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8), lambert(color)); }
function cone(r, h, color) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), lambert(color, true)); }

export function makeBossMesh(id) {
  const def = BOSSES[id] || BOSSES.giant;
  const g = new THREE.Group();
  if (id === 'dragon') {
    const body = sphere(1.3, def.skin); body.scale.set(1.6, 1.0, 1.0); body.position.y = 1.4;
    const neck = cyl(0.4, 0.6, 1.6, def.skin); neck.position.set(1.3, 1.9, 0); neck.rotation.z = -0.6;
    const head = sphere(0.7, def.skin); head.position.set(2.4, 2.5, 0);
    const horn1 = cone(0.18, 0.6, def.accent); horn1.position.set(2.55, 3.1, 0.2);
    const horn2 = cone(0.18, 0.6, def.accent); horn2.position.set(2.55, 3.1, -0.2);
    const tail = cyl(0.45, 0.1, 2.4, def.skin); tail.position.set(-1.6, 1.4, 0); tail.rotation.z = 0.5;
    const wingL = box(2.6, 0.08, 1.4, 0x4a1313); wingL.position.set(-0.2, 2.3, 1.3); wingL.rotation.z = 0.25; wingL.rotation.x = -0.2;
    const wingR = wingL.clone(); wingR.position.z = -1.3; wingR.rotation.x = 0.2;
    const legFL = cyl(0.28, 0.32, 0.7, def.skin); legFL.position.set(0.7, 0.4, 0.7);
    const legFR = legFL.clone(); legFR.position.z = -0.7;
    const legBL = legFL.clone(); legBL.position.x = -0.7;
    const legBR = legFL.clone(); legBR.position.set(-0.7, 0.4, -0.7);
    g.add(body, neck, head, horn1, horn2, tail, wingL, wingR, legFL, legFR, legBL, legBR);
  } else if (id === 'giant') {
    const torso = box(1.6, 2.0, 1.0, def.skin); torso.position.y = 1.7;
    const legs = box(1.4, 1.2, 0.9, def.accent); legs.position.y = 0.6;
    const head = sphere(0.7, def.skin); head.position.y = 3.1;
    const armL = box(0.6, 1.8, 0.6, def.skin); armL.position.set(-1.2, 1.6, 0);
    const armR = armL.clone(); armR.position.x = 1.2;
    const club = cyl(0.4, 0.6, 1.4, def.accent); club.position.set(1.7, 0.9, 0); club.rotation.z = 0.2;
    g.add(legs, torso, armL, armR, head, club);
  } else if (id === 'lich') {
    const robe = cyl(0.7, 1.4, 2.4, 0x2a2538); robe.position.y = 1.2;
    const torso = cyl(0.7, 0.7, 0.8, 0x3d3550); torso.position.y = 2.6;
    const head = sphere(0.55, def.skin); head.position.y = 3.4;
    const eyeL = sphere(0.10, def.accent); eyeL.position.set(-0.2, 3.45, 0.45);
    const eyeR = sphere(0.10, def.accent); eyeR.position.set(0.2, 3.45, 0.45);
    const crown = cyl(0.55, 0.7, 0.5, def.accent); crown.position.y = 3.95;
    const spike = cone(0.18, 0.8, def.accent); spike.position.y = 4.55;
    const staff = cyl(0.08, 0.08, 3.0, 0x5c3b22); staff.position.set(0.9, 1.8, 0);
    const orb = sphere(0.3, def.accent); orb.position.set(0.9, 3.4, 0);
    g.add(robe, torso, head, eyeL, eyeR, crown, spike, staff, orb);
  } else if (id === 'troll') {
    const torso = box(1.8, 1.7, 1.4, def.skin); torso.position.y = 1.5;
    const head = sphere(0.8, def.skin); head.position.set(0, 2.8, 0.2);
    const tusk1 = cone(0.1, 0.4, 0xeee5d0); tusk1.position.set(-0.25, 2.5, 0.7); tusk1.rotation.x = Math.PI;
    const tusk2 = tusk1.clone(); tusk2.position.x = 0.25;
    const armL = box(0.6, 1.8, 0.6, def.skin); armL.position.set(-1.3, 1.4, 0); armL.rotation.z = -0.2;
    const armR = armL.clone(); armR.position.set(1.3, 1.4, 0); armR.rotation.z = 0.2;
    const legs = box(1.6, 1.0, 1.2, def.accent); legs.position.y = 0.5;
    g.add(legs, torso, armL, armR, head, tusk1, tusk2);
  }
  for (const m of g.children) m.castShadow = true;
  return g;
}

export function swapToBossMesh(u, scene) {
  if (u.hpBar.parent) u.hpBar.parent.remove(u.hpBar);
  if (u.ring && u.ring.parent) u.ring.parent.remove(u.ring);
  scene.remove(u.mesh);
  const bossMesh = makeBossMesh(u.bossId);
  bossMesh.position.set(u.x, 0, u.z);
  bossMesh.traverse((m) => { if (m.isMesh) m.userData.unit = u; });
  bossMesh.add(u.hpBar);
  u.hpBar.position.set(0, 5.5, 0);
  u.hpBar.scale.set(2.4, 2.4, 2.4);
  u.mesh = bossMesh;
  u.body = bossMesh;
  scene.add(bossMesh);
}
