import * as THREE from 'three';

const basic = (c, opacity = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1, opacity });

export function buildStatusAuras() {
  const root = new THREE.Group();

  const burn = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32 - i * 0.04, 0.85 - i * 0.10, 6), basic(i < 2 ? 0xff3010 : i < 4 ? 0xff8040 : 0xffe070, 0.9));
    flame.position.set((Math.random() - 0.5) * 0.3, 2.5 + i * 0.30, (Math.random() - 0.5) * 0.3);
    burn.add(flame);
  }
  burn.visible = false;
  root.add(burn);

  const poison = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), basic(0x4ac030, 0.85));
    bub.position.set((Math.random() - 0.5) * 0.8, 2.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8);
    bub.userData.basePhase = Math.random() * Math.PI * 2;
    poison.add(bub);
  }
  poison.visible = false;
  root.add(poison);

  const bleed = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), basic(0xa00010, 0.95));
    drop.position.set((Math.random() - 0.5) * 0.9, 0.06, (Math.random() - 0.5) * 0.9);
    drop.scale.set(1, 0.4, 1);
    bleed.add(drop);
  }
  bleed.visible = false;
  root.add(bleed);

  const stun = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.20), basic(0xffe066, 1.0));
    stun.add(star);
  }
  stun.visible = false;
  root.add(stun);

  const silence = new THREE.Group();
  const xMat = basic(0xa0b0d0, 0.95);
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.12), xMat);
  bar1.rotation.z = Math.PI / 4; bar1.position.y = 3.10;
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.12), xMat);
  bar2.rotation.z = -Math.PI / 4; bar2.position.y = 3.10;
  silence.add(bar1, bar2);
  silence.visible = false;
  root.add(silence);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfff5b8, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
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
      const angle = t * 6 + (i * Math.PI * 2 / 4);
      s.position.set(Math.cos(angle) * 0.7, 3.10, Math.sin(angle) * 0.7);
      s.rotation.y = t * 5;
    });
  }

  A.silence.visible = !!(u.silenceUntil && t < u.silenceUntil);
  A.shield.visible = !!(u.damageMul && u.damageMul < 0.95);
}
