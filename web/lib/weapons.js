import * as THREE from 'three';

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });
const basic = (color) => new THREE.MeshBasicMaterial({ color });

const ORB_COLOR = { humans: 0xfff5b8, dwarves: 0xff5530, elves: 0xb88dff, skeletons: 0x9be2ff };

export function deriveWeaponStyle(raceKey, klass, override = null) {
  if (override) return override;
  if (klass === 'archer' || klass === 'flyer') return 'bow';
  if (klass === 'mage') return 'staff';
  if (klass === 'cavalry') return 'lance';
  if (raceKey === 'elves') return 'spear';
  if (raceKey === 'dwarves') return 'axe';
  if (raceKey === 'skeletons') return 'scythe';
  return 'sword';
}

const ANIM_FOR_STYLE = { sword: 'slash', axe: 'chop', scythe: 'slash', bow: 'bow', staff: 'cast', spear: 'thrust', pike: 'thrust', lance: 'thrust', halberd: 'chop', mace: 'swing' };
export function animForWeapon(style) { return ANIM_FOR_STYLE[style] || 'slash'; }

export function weaponPose(anim, sp) {
  if (anim === 'thrust') {
    if (sp < 0.35) { const k = sp / 0.35; return { armA: -0.40 * k, tilt: 0.04 * k, armZ: -0.20 * k }; }
    if (sp < 0.50) { const k = (sp - 0.35) / 0.15; return { armA: -0.40 + 0.60 * k, tilt: 0.04 - 0.20 * k, armZ: -0.20 + 0.85 * k }; }
    const k = (sp - 0.50) / 0.50; return { armA: 0.20 - 0.20 * k, tilt: -0.16 + 0.16 * k, armZ: 0.65 - 0.65 * k };
  }
  if (anim === 'chop') {
    if (sp < 0.45) { const k = sp / 0.45; return { armA: -1.60 * k, tilt: -0.10 * k }; }
    if (sp < 0.55) { const k = (sp - 0.45) / 0.10; return { armA: -1.60 + 4.00 * k, tilt: -0.10 + 0.50 * k }; }
    const k = (sp - 0.55) / 0.45; return { armA: 2.40 - 2.40 * k, tilt: 0.40 - 0.40 * k };
  }
  if (anim === 'swing') {
    if (sp < 0.35) { const k = sp / 0.35; return { armA: 0.60 * k, tilt: 0.04 * k, armRotZ: -0.80 * k }; }
    if (sp < 0.50) { const k = (sp - 0.35) / 0.15; return { armA: 0.60 + 1.20 * k, tilt: 0.04 - 0.06 * k, armRotZ: -0.80 + 1.60 * k }; }
    const k = (sp - 0.50) / 0.50; return { armA: 1.80 - 1.80 * k, tilt: 0, armRotZ: 0.80 - 0.80 * k };
  }
  if (anim === 'cast') {
    if (sp < 0.4) { const k = sp / 0.4; return { armA: 0.80 * k, tilt: -0.02 * k }; }
    const k = (sp - 0.4) / 0.6; return { armA: 0.80 - 0.80 * k, tilt: -0.02 + 0.02 * k };
  }
  if (sp < 0.4) { const k = sp / 0.4; return { armA: 2.0 * k, tilt: -0.06 * k }; }
  if (sp < 0.55) { const k = (sp - 0.4) / 0.15; return { armA: 2.0 - 2.5 * k, tilt: -0.06 + 0.36 * k }; }
  const k = (sp - 0.55) / 0.45; return { armA: -0.5 + 0.5 * k, tilt: 0.30 - 0.30 * k };
}

export function buildWeaponArm(team, raceKey, helmetMat, weaponTier = 0, klass = 'infantry', orbRace = null, weaponStyle = null) {
  const liveryMat = lambert(team.livery);
  const skinMat = lambert(raceKey === 'skeletons' ? 0xeee5d0 : (raceKey === 'elves' ? 0xd2e6b4 : (raceKey === 'dwarves' ? 0xd9a06d : 0xe6c39a)));
  const arm = new THREE.Group();
  arm.position.set(0.50, 1.65, 0);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.50, 6), liveryMat);
  upper.position.set(-0.05, -0.35, 0); upper.castShadow = true;
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.32, 6), skinMat);
  forearm.position.set(-0.05, -0.74, 0); forearm.castShadow = true;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.18), skinMat);
  hand.position.set(-0.05, -0.92, 0.05); hand.castShadow = true;
  arm.add(upper, forearm, hand);
  const wpn = new THREE.Group();
  wpn.scale.setScalar(1 + weaponTier * 0.18);
  arm.add(wpn);
  const style = deriveWeaponStyle(raceKey, klass, weaponStyle);
  arm.userData.weaponStyle = style;
  const metalColor = weaponTier > 2 ? 0xfff0a8 : weaponTier > 1 ? 0xffffff : weaponTier > 0 ? 0xe8e8f0 : 0xc8c8c8;
  const emit = weaponTier >= 2 ? (weaponTier >= 3 ? 0xffe070 : 0x9be2ff) : 0x000000;
  const metal = (_t) => new THREE.MeshLambertMaterial({ color: metalColor, emissive: emit, emissiveIntensity: weaponTier >= 2 ? 0.5 : 0, flatShading: true });
  if (weaponTier >= 3) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe070, transparent: true, opacity: 0.25 }));
    glow.position.set(0.10, -0.05, 0.15);
    wpn.add(glow);
  }
  if (style === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), lambert(0x3a2a1a));
    pole.position.set(0.05, -0.10, 0.15);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: ORB_COLOR[orbRace] || 0x9be2ff }));
    orb.position.set(0.05, 0.62, 0.15);
    pole.castShadow = true;
    wpn.add(pole, orb);
  } else if (style === 'bow') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16, Math.PI), lambert(0x6b4423));
    bow.position.set(0.05, -0.35, 0.15); bow.rotation.z = -Math.PI / 2;
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.88, 0.02), basic(0xfaf6e0));
    string.position.set(0.0, -0.35, 0.15);
    bow.castShadow = true;
    wpn.add(bow, string);
  } else if (style === 'spear') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), lambert(0x6b4423));
    pole.position.set(0.05, -0.10, 0.15);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), metal(weaponTier));
    head.position.set(0.05, 0.86, 0.15);
    pole.castShadow = true; head.castShadow = true;
    wpn.add(pole, head);
  } else if (style === 'pike') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6), lambert(0x6b4423));
    pole.position.set(0.05, 0.10, 0.15);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 6), metal(weaponTier));
    head.position.set(0.05, 1.40, 0.15);
    pole.castShadow = true; head.castShadow = true;
    wpn.add(pole, head);
  } else if (style === 'lance') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), lambert(0x6b4423));
    pole.position.set(0.05, 0.05, 0.55); pole.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.36, 8), metal(weaponTier));
    tip.position.set(0.05, 0.05, 1.45); tip.rotation.x = Math.PI / 2;
    const grip = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.04, 6, 12), lambert(0x3a2a1a));
    grip.position.set(0.05, 0.05, -0.30); grip.rotation.y = Math.PI / 2;
    pole.castShadow = true; tip.castShadow = true;
    wpn.add(pole, tip, grip);
  } else if (style === 'halberd') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), lambert(0x6b4423));
    pole.position.set(0.05, -0.05, 0.15);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), metal(weaponTier));
    tip.position.set(0.05, 0.95, 0.15);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.06), metal(weaponTier));
    head.position.set(0.22, 0.65, 0.15);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.05), metal(weaponTier));
    hook.position.set(-0.07, 0.65, 0.15); hook.rotation.z = 0.4;
    pole.castShadow = true; head.castShadow = true; tip.castShadow = true;
    wpn.add(pole, tip, head, hook);
  } else if (style === 'mace') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), lambert(0x3a2a1a));
    handle.position.set(0.08, -0.45, 0.15);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 8), metal(weaponTier));
    head.position.set(0.08, 0.02, 0.15);
    const sm = lambert(0x707378, true);
    for (const [dx, dy] of [[0,0.18],[0,-0.18],[0.18,0],[-0.18,0]]) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), sm);
      sp.position.set(0.08 + dx, 0.02 + dy, 0.15); sp.rotation.z = Math.atan2(-dx, dy);
      wpn.add(sp);
    }
    handle.castShadow = true; head.castShadow = true;
    wpn.add(handle, head);
  } else if (style === 'sword') {
    const bladeLen = 0.78 + weaponTier * 0.10;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, bladeLen, 0.05), metal(weaponTier));
    blade.position.set(0.12, -0.10 - (bladeLen - 0.78) * 0.5, 0.15); blade.rotation.z = -0.22;
    const crossLen = 0.22 + weaponTier * 0.06;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(crossLen, 0.05, 0.05), helmetMat);
    cross.position.set(0.05, -0.49, 0.15); cross.rotation.z = -0.22;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), lambert(0x3a2a1a));
    hilt.position.set(0.02, -0.60, 0.15); hilt.rotation.z = -0.22;
    const pommelMat = weaponTier >= 2
      ? new THREE.MeshLambertMaterial({ color: 0xfff5b8, emissive: 0x806020, emissiveIntensity: 0.5 })
      : helmetMat;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), pommelMat);
    pommel.position.set(-0.01, -0.69, 0.15);
    blade.castShadow = true; cross.castShadow = true; hilt.castShadow = true;
    wpn.add(blade, cross, hilt, pommel);
    if (weaponTier >= 1) {
      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.015, bladeLen * 0.85, 0.06), lambert(0x404040));
      fuller.position.copy(blade.position); fuller.rotation.z = -0.22;
      wpn.add(fuller);
    }
    if (weaponTier >= 2) {
      const wingMat = lambert(0xc9a44a, true);
      const wL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12, Math.PI), wingMat);
      wL.position.set(-0.10, -0.49, 0.15); wL.rotation.set(0, 0, Math.PI - 0.22);
      const wR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12, Math.PI), wingMat);
      wR.position.set( 0.20, -0.49, 0.15); wR.rotation.set(0, 0, -0.22);
      wpn.add(wL, wR);
    }
    if (weaponTier >= 3) {
      const flameMat = new THREE.MeshLambertMaterial({ color: 0xfff0a8, emissive: 0xffe070, emissiveIntensity: 0.9 });
      const flL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.04), flameMat);
      flL.position.set(0.02, -0.06, 0.15); flL.rotation.z = -0.04;
      const flR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.04), flameMat);
      flR.position.set(0.22, -0.06, 0.15); flR.rotation.z = -0.42;
      wpn.add(flL, flR);
    }
  } else if (style === 'axe') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), lambert(0x3a2a1a));
    handle.position.set(0.08, -0.45, 0.15); handle.rotation.z = -0.18;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), lambert(0x707378, true));
    head.position.set(0.16, 0.0, 0.15); head.rotation.z = -0.18;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.34), metal(weaponTier));
    edge.position.set(0.30, 0.0, 0.15); edge.rotation.z = -0.18;
    handle.castShadow = true; head.castShadow = true; edge.castShadow = true;
    wpn.add(handle, head, edge);
  } else if (style === 'scythe') {
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

const RACE_TIER = {
  humans:    { metal: 0xc9a44a, glow: 0xfff5b8, mid: 0x806020, gem: 0xff5530 },
  dwarves:   { metal: 0xa67838, glow: 0xff9050, mid: 0x803010, gem: 0xff5530 },
  elves:     { metal: 0x88c870, glow: 0xb5ffb5, mid: 0x305030, gem: 0xb88dff },
  skeletons: { metal: 0xd8d0b8, glow: 0xb0d8ff, mid: 0x305060, gem: 0x9be2ff },
};

export function buildArmorTier(team, raceKey, armorTier = 0) {
  const g = new THREE.Group();
  const rt = RACE_TIER[raceKey] || RACE_TIER.humans;
  const tierEmit = armorTier >= 3 ? rt.glow : 0x000000;
  const tierColor = armorTier >= 2 ? rt.metal : team.accent;
  const matMain = new THREE.MeshLambertMaterial({ color: tierColor, emissive: tierEmit, emissiveIntensity: armorTier >= 3 ? 0.35 : 0 });
  const matMetal = lambert(armorTier >= 2 ? rt.metal : 0x707378, true);
  const matDark = lambert(0x4a4f55);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.10), matMain);
  chest.position.set(0, 1.35, 0.36); chest.castShadow = true;
  chest.scale.set(1 + armorTier * 0.18, 1 + armorTier * 0.14, 1 + armorTier * 0.7);
  g.add(chest);
  const paldGeom = new THREE.SphereGeometry(0.18, 8, 6);
  const paldMat = new THREE.MeshLambertMaterial({ color: tierColor, emissive: tierEmit, emissiveIntensity: armorTier >= 3 ? 0.3 : 0 });
  const ps = 1 + armorTier * 0.25;
  const paldL = new THREE.Mesh(paldGeom, paldMat); paldL.position.set(-0.50, 1.65, 0); paldL.scale.set(ps, 0.7 * ps, ps); paldL.castShadow = true;
  const paldR = new THREE.Mesh(paldGeom, paldMat); paldR.position.set( 0.50, 1.65, 0); paldR.scale.set(ps, 0.7 * ps, ps); paldR.castShadow = true;
  g.add(paldL, paldR);

  if (armorTier >= 1) {
    const grL = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.34, 8), matMetal); grL.position.set(-0.18, 0.45, 0); grL.castShadow = true;
    const grR = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.34, 8), matMetal); grR.position.set( 0.18, 0.45, 0); grR.castShadow = true;
    const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.18, 6), matMetal); cuffL.position.set(-0.45, 1.04, 0); cuffL.castShadow = true;
    const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.18, 6), matMetal); cuffR.position.set( 0.45, 1.04, 0); cuffR.castShadow = true;
    const mail = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.50, 0.86, 10), matDark);
    mail.position.set(0, 1.30, 0);
    g.add(grL, grR, cuffL, cuffR, mail);
  }
  if (armorTier >= 2) {
    const spikeMat = lambert(rt.metal, true);
    const spL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), spikeMat); spL.position.set(-0.50, 1.88, 0);
    const spR = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), spikeMat); spR.position.set( 0.50, 1.88, 0);
    const cape2 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.40, 0.04),
      new THREE.MeshLambertMaterial({ color: team.livery, side: THREE.DoubleSide }));
    cape2.position.set(0, 1.05, -0.43); cape2.rotation.x = -0.05;
    const trimMat = new THREE.MeshLambertMaterial({ color: rt.glow, emissive: rt.mid, emissiveIntensity: 0.4 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.12), trimMat);
    trim.position.set(0, 1.56, 0.40);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.10), trimMat); buckle.position.set(0, 0.85, 0.42);
    g.add(spL, spR, cape2, trim, buckle);
  }
  if (armorTier >= 3) {
    const wingMat = new THREE.MeshLambertMaterial({ color: rt.glow, emissive: rt.glow, emissiveIntensity: 0.5 });
    const wL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 6), wingMat); wL.position.set(-0.34, 2.36, -0.06); wL.rotation.z = 0.55; wL.rotation.x = -0.35;
    const wR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 6), wingMat); wR.position.set( 0.34, 2.36, -0.06); wR.rotation.z = -0.55; wR.rotation.x = -0.35;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshLambertMaterial({ color: rt.gem, emissive: rt.gem, emissiveIntensity: 1.0 }));
    gem.position.set(0, 1.42, 0.46);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 26),
      new THREE.MeshBasicMaterial({ color: rt.glow, transparent: true, opacity: 0.9 }));
    halo.position.set(0, 2.22, -0.20); halo.rotation.x = -0.25;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({ color: rt.glow, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02;
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x6cd6ff });
    const runeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.13), runeMat); runeL.position.set(-0.50, 1.78, 0.10);
    const runeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.13), runeMat); runeR.position.set( 0.50, 1.78, 0.10);
    g.add(wL, wR, gem, halo, glow, runeL, runeR);
  }
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
