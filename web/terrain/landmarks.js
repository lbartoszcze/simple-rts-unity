import * as THREE from 'three';

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });

function meadowHills(g) {
  const a = new THREE.Mesh(new THREE.SphereGeometry(10, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x6ba84a));
  a.position.set(-46, 0.05, 32); a.scale.set(1.4, 0.5, 1.4);
  a.castShadow = true; a.receiveShadow = true;
  const b = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x6ba84a));
  b.position.set(52, 0.05, -28); b.scale.set(1.2, 0.45, 1.2);
  b.castShadow = true; b.receiveShadow = true;
  g.add(a, b);
}

function desertDunes(g) {
  const ridge = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xc9a76a));
  ridge.position.set(0, 0.05, -56); ridge.scale.set(6.5, 0.45, 1.5);
  ridge.castShadow = true; ridge.receiveShadow = true;
  const small = new THREE.Mesh(new THREE.SphereGeometry(6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xc9a76a));
  small.position.set(40, 0.05, 56); small.scale.set(4, 0.4, 1.3);
  small.castShadow = true; small.receiveShadow = true;
  g.add(ridge, small);
}

function forestRiverBridge(g) {
  const river = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.05, 200),
    new THREE.MeshLambertMaterial({ color: 0x3a6a8a, transparent: true, opacity: 0.9 })
  );
  river.position.set(58, 0.03, 0); river.rotation.y = 0.32;
  g.add(river);
  const planks = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 2.8), lambert(0x6b4423));
  planks.position.set(58, 0.20, 0); planks.rotation.y = 0.32;
  planks.castShadow = true;
  g.add(planks);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.55, 0.15), lambert(0x4b3018));
    rail.position.set(58, 0.55, side * 1.35); rail.rotation.y = 0.32;
    rail.castShadow = true;
    g.add(rail);
    for (let i = -1; i <= 1; i += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), lambert(0x4b3018));
      post.position.set(58 + i * 3.4 * Math.cos(0.32), 0.4, side * 1.35 + i * 3.4 * Math.sin(0.32));
      post.castShadow = true;
      g.add(post);
    }
  }
}

function frostPond(g) {
  const ice = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 0.1, 32),
    new THREE.MeshLambertMaterial({ color: 0xb6dceb, transparent: true, opacity: 0.85 })
  );
  ice.position.set(-50, 0.04, 42); ice.scale.set(1.2, 1, 0.85);
  g.add(ice);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const lump = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 + Math.random() * 0.4, 8, 6),
      lambert(0xf2f6fa, true)
    );
    lump.position.set(-50 + Math.cos(a) * 17, 0.4, 42 + Math.sin(a) * 13);
    lump.castShadow = true;
    g.add(lump);
  }
}

function volcanicLavaPool(g) {
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 0.1, 24),
    new THREE.MeshLambertMaterial({ color: 0xff5520, emissive: 0xff8030, emissiveIntensity: 0.9 })
  );
  pool.position.set(48, 0.04, -38);
  g.add(pool);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rim = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4 + Math.random() * 0.7, 0),
      new THREE.MeshLambertMaterial({ color: 0x2a1a14, flatShading: true, emissive: 0xff3318, emissiveIntensity: 0.25 })
    );
    rim.position.set(48 + Math.cos(a) * 10.2, 0.7, -38 + Math.sin(a) * 10.2);
    rim.rotation.set(Math.random(), Math.random(), Math.random());
    rim.castShadow = true;
    g.add(rim);
  }
}

const LANDMARKS = {
  meadow: meadowHills,
  desert: desertDunes,
  forest: forestRiverBridge,
  frost: frostPond,
  volcanic: volcanicLavaPool,
};

export function buildLandmarks(key, group) {
  const fn = LANDMARKS[key];
  if (fn) fn(group);
}
