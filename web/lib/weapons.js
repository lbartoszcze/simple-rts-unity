import * as THREE from 'three';

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });
const basic = (color) => new THREE.MeshBasicMaterial({ color });

export function buildWeaponArm(team, raceKey, helmetMat, weaponTier = 0, klass = 'infantry') {
  const liveryMat = lambert(team.livery);
  const arm = new THREE.Group();
  arm.position.set(0.50, 1.65, 0);
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.12, 0.50, 6), liveryMat);
  upper.position.set(-0.05, -0.35, 0); upper.castShadow = true;
  arm.add(upper);
  const wpn = new THREE.Group();
  wpn.scale.setScalar(1 + weaponTier * 0.10);
  arm.add(wpn);
  const metal = (t) => lambert(t > 1 ? 0xffffff : t > 0 ? 0xe8e8f0 : 0xc8c8c8, true);
  const style = (klass === 'archer' || klass === 'flyer') ? 'bow' : klass === 'mage' ? 'staff' : raceKey;
  if (style === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), lambert(0x3a2a1a));
    pole.position.set(0.05, -0.10, 0.15);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x9be2ff }));
    orb.position.set(0.05, 0.62, 0.15);
    pole.castShadow = true;
    wpn.add(pole, orb);
  } else if (style === 'bow' || raceKey === 'elves' && klass !== 'mage') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16, Math.PI), lambert(0x6b4423));
    bow.position.set(0.05, -0.35, 0.15); bow.rotation.z = -Math.PI / 2;
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.88, 0.02), basic(0xfaf6e0));
    string.position.set(0.0, -0.35, 0.15);
    bow.castShadow = true;
    wpn.add(bow, string);
  } else if (raceKey === 'humans') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.05), metal(weaponTier));
    blade.position.set(0.12, -0.10, 0.15); blade.rotation.z = -0.22;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), helmetMat);
    cross.position.set(0.05, -0.49, 0.15); cross.rotation.z = -0.22;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), lambert(0x3a2a1a));
    hilt.position.set(0.02, -0.60, 0.15); hilt.rotation.z = -0.22;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), helmetMat);
    pommel.position.set(-0.01, -0.69, 0.15);
    blade.castShadow = true; cross.castShadow = true; hilt.castShadow = true;
    wpn.add(blade, cross, hilt, pommel);
  } else if (raceKey === 'dwarves') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), lambert(0x3a2a1a));
    handle.position.set(0.08, -0.45, 0.15); handle.rotation.z = -0.18;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), lambert(0x707378, true));
    head.position.set(0.16, 0.0, 0.15); head.rotation.z = -0.18;
    handle.castShadow = true; head.castShadow = true;
    wpn.add(handle, head);
  } else if (raceKey === 'elves') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16, Math.PI), lambert(0x6b4423));
    bow.position.set(0.05, -0.35, 0.15); bow.rotation.z = -Math.PI / 2;
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.88, 0.02), basic(0xfaf6e0));
    string.position.set(0.0, -0.35, 0.15);
    bow.castShadow = true;
    wpn.add(bow, string);
  } else if (raceKey === 'skeletons') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.30, 6), lambert(0x3a2a1a));
    pole.position.set(0.05, -0.25, 0.15); pole.rotation.z = -0.10;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.05), metal(weaponTier));
    blade.position.set(0.35, 0.35, 0.15); blade.rotation.z = -0.45;
    pole.castShadow = true; blade.castShadow = true;
    wpn.add(pole, blade);
  }
  return arm;
}

export function makeHorse(team) {
  const g = new THREE.Group();
  const dark = lambert(0x4a3018);
  const light = lambert(0x7a5230);
  const accent = lambert(team.accent);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.8), light);
  body.position.set(0, 1.0, 0.1); body.castShadow = true;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), light);
  neck.position.set(0, 1.45, 1.05); neck.rotation.x = -0.3; neck.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.7), dark);
  head.position.set(0, 1.65, 1.45); head.castShadow = true;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), dark);
  tail.position.set(0, 1.05, -0.95); tail.rotation.x = 0.4;
  const legGeom = new THREE.CylinderGeometry(0.10, 0.12, 0.95, 6);
  for (const [px, pz] of [[0.30, -0.7], [0.30, 0.7], [-0.30, -0.7], [-0.30, 0.7]]) {
    const leg = new THREE.Mesh(legGeom, dark);
    leg.position.set(px, 0.47, pz); leg.castShadow = true;
    g.add(leg);
  }
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.9), accent);
  saddle.position.set(0, 1.42, 0.05);
  g.add(body, neck, head, tail, saddle);
  return g;
}

export function makeWings(team, raceKey, swarm = false) {
  const g = new THREE.Group();
  const color = raceKey === 'skeletons' ? 0x1a1a20 : raceKey === 'elves' ? 0xe8d8b0 : team.accent;
  const wMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  const w = swarm ? 1.4 : 2.2, h = swarm ? 0.7 : 1.1, off = swarm ? 0.85 : 1.3;
  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wMat);
  wingL.position.set(-off, 1.4, 0); wingL.rotation.y = Math.PI / 2; wingL.rotation.z = 0.15;
  const wingR = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wMat);
  wingR.position.set( off, 1.4, 0); wingR.rotation.y = -Math.PI / 2; wingR.rotation.z = -0.15;
  g.add(wingL, wingR);
  g.userData.wingL = wingL;
  g.userData.wingR = wingR;
  return g;
}
