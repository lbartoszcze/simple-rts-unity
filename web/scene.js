import * as THREE from 'three';
import { buildLandmarks } from './terrain/landmarks.js';

export const canvas = document.getElementById('game');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8d8e8);
scene.fog = new THREE.Fog(0xc8e0e8, 70, 180);

const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
sun.position.set(40, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 200;
const s = 70;
sun.shadow.camera.left = -s;
sun.shadow.camera.right = s;
sun.shadow.camera.top = s;
sun.shadow.camera.bottom = -s;
sun.shadow.bias = -0.0008;
scene.add(sun);

const sky = new THREE.HemisphereLight(0xbfe4ff, 0x7a8b5a, 0.65);
scene.add(sky);

export const cameraTarget = new THREE.Vector3(0, 0, 0);
const camOffset = new THREE.Vector3(10, 36, 28);
export const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 400);
function syncCamera() {
  camera.position.copy(cameraTarget).add(camOffset);
  camera.lookAt(cameraTarget);
}
syncCamera();

export function trackCamera(units) {
  let cx = 0, cz = 0, n = 0;
  for (const u of units) {
    if (u.hp <= 0) continue;
    cx += u.x; cz += u.z; n++;
  }
  if (n === 0) return;
  cx /= n; cz /= n;
  cameraTarget.x += (cx - cameraTarget.x) * 0.05;
  cameraTarget.z += (cz - cameraTarget.z) * 0.05;
  syncCamera();
}

export function resetCameraTarget() {
  cameraTarget.set(0, 0, 0);
  syncCamera();
}

export const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x7fc05a })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

export const sceneryGroup = new THREE.Group();
scene.add(sceneryGroup);

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });

function makeOak(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.42, 1.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x5c3b22 })
  );
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  g.add(trunk);
  const tiers = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < tiers; i++) {
    const r = 1.6 - i * 0.35;
    const h = 1.8 - i * 0.25;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 7),
      new THREE.MeshLambertMaterial({ color: 0x3a8a3f })
    );
    cone.position.y = 1.6 + i * 1.0;
    cone.castShadow = true;
    g.add(cone);
  }
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI;
  const k = 0.85 + Math.random() * 0.4;
  g.scale.set(k, k, k);
  return g;
}

function makeRock(x, z, color = 0x9aa0a4) {
  const r = 0.5 + Math.random() * 0.7;
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), lambert(color, true));
  m.position.set(x, r * 0.55, z);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.castShadow = true;
  return m;
}

function makeCactus(x, z) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.2, 7), lambert(0x4a8a3a, true));
  stem.position.y = 1.1; stem.castShadow = true;
  g.add(stem);
  if (Math.random() < 0.7) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.4), lambert(0x4a8a3a, true));
    arm.position.set(0.45, 1.4, 0); arm.castShadow = true;
    g.add(arm);
  }
  g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI;
  return g;
}

function makePine(x, z, snowy = false) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.4, 6), lambert(0x3a2a18));
  trunk.position.y = 0.7; trunk.castShadow = true;
  g.add(trunk);
  const snowMat = snowy ? lambert(0xf2f6fa, true) : null;
  const tiers = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < tiers; i++) {
    const r = 1.3 - i * 0.22, h = 1.4 - i * 0.18, y = 1.3 + i * 0.85;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), lambert(0x1f5a2c, true));
    cone.position.y = y; cone.castShadow = true;
    g.add(cone);
    if (snowy) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 1.06, h * 0.32, 6), snowMat);
      cap.position.y = y + h * 0.34;
      g.add(cap);
    }
  }
  g.position.set(x, 0, z);
  const k = 0.9 + Math.random() * 0.5; g.scale.set(k, k, k);
  return g;
}

function makeObelisk(x, z) {
  const g = new THREE.Group();
  const h = 3.0 + Math.random() * 1.5;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), lambert(0x141414, true));
  shaft.position.y = h / 2; shaft.castShadow = true;
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), lambert(0x202020, true));
  top.position.y = h + 0.4; top.rotation.y = Math.PI / 4; top.castShadow = true;
  g.add(shaft, top);
  g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI;
  return g;
}

function makeLavaRock(x, z) {
  const r = 0.6 + Math.random() * 0.8;
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 0),
    new THREE.MeshLambertMaterial({ color: 0x331a14, flatShading: true, emissive: 0xff4422, emissiveIntensity: 0.35 })
  );
  m.position.set(x, r * 0.55, z);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.castShadow = true;
  return m;
}

function inSpawnZone(x, z) {
  if (Math.abs(x) < 18 && Math.abs(z) < 38) return true;
  if (x * x + z * z < 12 * 12) return true;
  return false;
}

function scatter(count, factory) {
  for (let i = 0; i < count; i++) {
    let x, z, tries = 0;
    do {
      x = (Math.random() - 0.5) * 200;
      z = (Math.random() - 0.5) * 200;
      tries++;
    } while (inSpawnZone(x, z) && tries < 8);
    const obj = factory(x, z);
    if (obj) sceneryGroup.add(obj);
  }
}

const POPULATE = {
  meadow:   c => scatter(c, (x, z) => Math.random() < 0.78 ? makeOak(x, z) : makeRock(x, z)),
  desert:   c => scatter(c, (x, z) => { const r = Math.random(); if (r < 0.4) return makeCactus(x, z); if (r < 0.9) return makeRock(x, z, 0xb89a64); return null; }),
  forest:   c => scatter(c, (x, z) => Math.random() < 0.92 ? makePine(x, z, false) : makeRock(x, z, 0x4a4a3a)),
  frost:    c => scatter(c, (x, z) => Math.random() < 0.7  ? makePine(x, z, true)  : makeRock(x, z, 0xd0dae0)),
  volcanic: c => scatter(c, (x, z) => Math.random() < 0.25 ? makeObelisk(x, z) : makeLavaRock(x, z)),
};

export const MAPS = {
  meadow:   { name: 'Sunlit Meadow',  icon: '🌿', ground: 0x7fc05a, bg: 0xa8d8e8, fog: 0xc8e0e8, fogNear: 70, fogFar: 180, density: 90 },
  desert:   { name: 'Bleached Dunes', icon: '🏜️', ground: 0xd6b76a, bg: 0xf2cf8a, fog: 0xe8c97a, fogNear: 60, fogFar: 160, density: 70 },
  forest:   { name: 'Whisperwood',    icon: '🌲', ground: 0x4a7a3a, bg: 0x4f6e72, fog: 0x4f6e72, fogNear: 35, fogFar: 100, density: 130 },
  frost:    { name: 'Frostlands',     icon: '❄️', ground: 0xe6ecf2, bg: 0xc9d8e0, fog: 0xc9d8e0, fogNear: 50, fogFar: 140, density: 80 },
  volcanic: { name: 'Ashen Crater',   icon: '🌋', ground: 0x3a2a2a, bg: 0x6a2a26, fog: 0x6a2a26, fogNear: 30, fogFar: 110, density: 80 },
};

const SEQ = Object.keys(MAPS);
export function mapForRound(n) {
  return SEQ[Math.min(SEQ.length - 1, Math.floor((n - 1) / 3))];
}

let lastMapKey = null;
export function setMap(key) {
  if (key === lastMapKey) return;
  lastMapKey = key;
  const m = MAPS[key] || MAPS.meadow;
  ground.material.color.setHex(m.ground);
  scene.background = new THREE.Color(m.bg);
  scene.fog = new THREE.Fog(m.fog, m.fogNear, m.fogFar);
  while (sceneryGroup.children.length) sceneryGroup.remove(sceneryGroup.children[0]);
  POPULATE[key](m.density);
  buildLandmarks(key, sceneryGroup);
}

setMap('meadow');

export const raycaster = new THREE.Raycaster();

const PROJ_CAPACITY = 200;
const projGeom = new THREE.BufferGeometry();
projGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PROJ_CAPACITY * 3), 3));
const projMat = new THREE.LineBasicMaterial({ color: 0xfff5d6, transparent: true, opacity: 0.85 });
const projLines = new THREE.LineSegments(projGeom, projMat);
projLines.frustumCulled = false;
projGeom.setDrawRange(0, 0);
scene.add(projLines);

const fxMeshes = [];
export function spawnFx(x, z, radius, color, duration = 0.7) {
  const geom = new THREE.SphereGeometry(radius, 16, 12);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 });
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, 1.5, z);
  scene.add(m);
  fxMeshes.push({ mesh: m, age: 0, duration, mat, geom });
}
export function updateFx(dt) {
  for (let i = fxMeshes.length - 1; i >= 0; i--) {
    const fx = fxMeshes[i];
    fx.age += dt;
    const p = fx.age / fx.duration;
    fx.mesh.scale.setScalar(0.6 + p * 1.2);
    fx.mat.opacity = Math.max(0, 0.65 * (1 - p));
    if (fx.age >= fx.duration) {
      scene.remove(fx.mesh);
      fx.geom.dispose(); fx.mat.dispose();
      fxMeshes.splice(i, 1);
    }
  }
}

export function setProjectiles(segs) {
  const pos = projGeom.attributes.position.array;
  const n = Math.min(segs.length, Math.floor(PROJ_CAPACITY / 2));
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    pos[i * 6 + 0] = s[0]; pos[i * 6 + 1] = s[1]; pos[i * 6 + 2] = s[2];
    pos[i * 6 + 3] = s[3]; pos[i * 6 + 4] = s[4]; pos[i * 6 + 5] = s[5];
  }
  projGeom.attributes.position.needsUpdate = true;
  projGeom.setDrawRange(0, n * 2);
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || (window.innerHeight - 90);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

export function panCamera(dx, dz) {
  cameraTarget.x = THREE.MathUtils.clamp(cameraTarget.x + dx, -60, 60);
  cameraTarget.z = THREE.MathUtils.clamp(cameraTarget.z + dz, -60, 60);
  syncCamera();
}

export function zoomCamera(delta) {
  const y = THREE.MathUtils.clamp(camOffset.y + delta, 28, 100);
  camOffset.set(0, y, y * 0.9);
  syncCamera();
}
