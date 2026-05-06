import * as THREE from 'three';

const basic = (c, opacity = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1, opacity });

export function buildStatusAuras() {
  const root = new THREE.Group();

  const burn = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.02, 0.45 - i * 0.05, 6), basic(i < 2 ? 0xff5530 : 0xffd066, 0.85));
    flame.position.set((Math.random() - 0.5) * 0.2, 2.4 + i * 0.2, (Math.random() - 0.5) * 0.2);
    burn.add(flame);
  }
  burn.visible = false;
  root.add(burn);

  const poison = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0x6dbf5d, 0.75));
    bub.position.set((Math.random() - 0.5) * 0.6, 2.0 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
    bub.userData.basePhase = Math.random() * Math.PI * 2;
    poison.add(bub);
  }
  poison.visible = false;
  root.add(poison);

  const bleed = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 6), basic(0xc83030, 0.9));
    drop.position.set((Math.random() - 0.5) * 0.5, 0.05, (Math.random() - 0.5) * 0.5);
    drop.scale.set(1, 0.4, 1);
    bleed.add(drop);
  }
  bleed.visible = false;
  root.add(bleed);

  const stun = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), basic(0xffe066, 0.95));
    stun.add(star);
  }
  stun.visible = false;
  root.add(stun);

  const silence = new THREE.Group();
  const xMat = basic(0x7080a0, 0.85);
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), xMat);
  bar1.rotation.z = Math.PI / 4; bar1.position.y = 2.85;
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), xMat);
  bar2.rotation.z = -Math.PI / 4; bar2.position.y = 2.85;
  silence.add(bar1, bar2);
  silence.visible = false;
  root.add(silence);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfff5b8, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  shield.position.y = 0.5;
  shield.visible = false;
  root.add(shield);

  root.userData = { burn, poison, bleed, stun, silence, shield };
  return root;
}

export function updateStatusAuras(u, t) {
  const a = u.statusAuras; if (!a) return;
  const A = a.userData;

  const burning = u.burnUntil && t < u.burnUntil;
  A.burn.visible = burning;
  if (burning) {
    A.burn.children.forEach((f, i) => {
      const k = 0.85 + 0.25 * Math.sin(t * 14 + i * 1.7);
      f.scale.set(k, k, k);
      f.position.x = Math.sin(t * 7 + i) * 0.08;
      f.position.z = Math.cos(t * 9 + i * 1.3) * 0.08;
    });
  }

  const poisoned = u.poisonUntil && t < u.poisonUntil;
  A.poison.visible = poisoned;
  if (poisoned) {
    A.poison.children.forEach((b, i) => {
      const phase = b.userData.basePhase + t * 1.5;
      b.position.y = 1.9 + ((phase % 2.0) * 0.4);
      const k = 0.7 + 0.3 * Math.sin(t * 4 + i);
      b.scale.set(k, k, k);
    });
  }

  A.bleed.visible = !!(u.bleedUntil && t < u.bleedUntil);

  const stunned = u.stunUntil && t < u.stunUntil;
  A.stun.visible = stunned;
  if (stunned) {
    A.stun.children.forEach((s, i) => {
      const angle = t * 6 + (i * Math.PI * 2 / 3);
      s.position.set(Math.cos(angle) * 0.4, 2.85, Math.sin(angle) * 0.4);
      s.rotation.y = t * 5;
    });
  }

  A.silence.visible = !!(u.silenceUntil && t < u.silenceUntil);
  A.shield.visible = !!(u.damageMul && u.damageMul < 0.95);
}
