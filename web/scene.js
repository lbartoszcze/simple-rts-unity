import * as THREE from 'three';

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
const camOffset = new THREE.Vector3(22, 62, 56);
export const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
function syncCamera() {
  camera.position.copy(cameraTarget).add(camOffset);
  camera.lookAt(cameraTarget);
}
syncCamera();

export const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x7fc05a })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const dirtPaint = new THREE.Mesh(
  new THREE.CircleGeometry(14, 32),
  new THREE.MeshLambertMaterial({ color: 0xc6a877, transparent: true, opacity: 0.55 })
);
dirtPaint.rotation.x = -Math.PI / 2;
dirtPaint.position.y = 0.01;
scene.add(dirtPaint);

function makeTree(x, z) {
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

function makeRock(x, z) {
  const r = 0.5 + Math.random() * 0.7;
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 0),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a4, flatShading: true })
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

const decor = new THREE.Group();
scene.add(decor);
for (let i = 0; i < 90; i++) {
  let x, z, tries = 0;
  do {
    x = (Math.random() - 0.5) * 200;
    z = (Math.random() - 0.5) * 200;
    tries++;
  } while (inSpawnZone(x, z) && tries < 8);
  if (Math.random() < 0.78) decor.add(makeTree(x, z));
  else decor.add(makeRock(x, z));
}

for (let i = 0; i < 4; i++) {
  const fence = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.6, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x8a6235 })
  );
  fence.position.set(-30 + i * 20, 0.3, -42);
  fence.castShadow = true;
  scene.add(fence);
}

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
