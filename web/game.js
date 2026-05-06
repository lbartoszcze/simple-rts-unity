import * as THREE from 'three';
import {
  scene, camera, renderer, ground, raycaster, canvas,
  panCamera, zoomCamera,
} from './scene.js';
import { makeUnit, MAX_HP, updateUnitVisuals, killVisuals } from './units.js';

const TEAM_BLUE = 0;
const TEAM_RED = 1;
const UNIT_SPEED = 7;
const ATTACK_RANGE = 2.4;
const ATTACK_DPS = 22;
const SPACING = 2.6;
const PAN_SPEED = 38;
const EDGE_PAD = 14;

const banner = document.getElementById('banner');
const dragBox = document.getElementById('drag-box');

const units = [];
function spawnArmies() {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = (c - 1.5) * SPACING;
    units.push(makeUnit(TEAM_BLUE, x, 30 + r * SPACING));
  }
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = (c - 1.5) * SPACING;
    units.push(makeUnit(TEAM_RED, x, -30 - r * SPACING));
  }
  for (const u of units) scene.add(u.mesh);
}
spawnArmies();

const ndc = new THREE.Vector2();
function setNDC(e) {
  const r = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  return { px: e.clientX - r.left, py: e.clientY - r.top, rect: r };
}

function pickGround() {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(ground)[0];
  return hit ? hit.point.clone() : null;
}

function pickEnemy() {
  raycaster.setFromCamera(ndc, camera);
  const candidates = [];
  for (const u of units) {
    if (u.team !== TEAM_RED || u.hp <= 0) continue;
    u.body.traverse((m) => { if (m.isMesh) candidates.push(m); });
  }
  const hits = raycaster.intersectObjects(candidates, false);
  if (!hits.length) return null;
  let n = hits[0].object;
  while (n && !n.userData.unit) n = n.parent;
  return n ? n.userData.unit : null;
}

let drag = null;
let mouseClient = { x: 0, y: 0 };
const keys = new Set();

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  const m = setNDC(e);
  if (e.button === 0) {
    drag = { x0: m.px, y0: m.py, x1: m.px, y1: m.py };
  } else if (e.button === 2) {
    issueOrder();
  }
});

canvas.addEventListener('mousemove', (e) => {
  setNDC(e);
  const r = canvas.getBoundingClientRect();
  mouseClient.x = e.clientX - r.left;
  mouseClient.y = e.clientY - r.top;
  if (drag) {
    drag.x1 = mouseClient.x;
    drag.y1 = mouseClient.y;
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    dragBox.style.left = `${x}px`;
    dragBox.style.top = `${y}px`;
    dragBox.style.width = `${w}px`;
    dragBox.style.height = `${h}px`;
    dragBox.classList.remove('hidden');
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button !== 0 || !drag) return;
  finalizeSelection();
  drag = null;
  dragBox.classList.add('hidden');
});

window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomCamera(e.deltaY * 0.04);
}, { passive: false });

function projectToScreen(worldVec, rect) {
  const v = worldVec.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * rect.width,
    y: (-v.y * 0.5 + 0.5) * rect.height,
  };
}

function finalizeSelection() {
  const dx = drag.x1 - drag.x0;
  const dy = drag.y1 - drag.y0;
  const isClick = dx * dx + dy * dy < 25;
  for (const u of units) u.selected = false;
  const rect = canvas.getBoundingClientRect();

  if (isClick) {
    raycaster.setFromCamera(ndc, camera);
    const candidates = [];
    for (const u of units) {
      if (u.team !== TEAM_BLUE || u.hp <= 0) continue;
      u.body.traverse((m) => { if (m.isMesh) candidates.push(m); });
    }
    const hits = raycaster.intersectObjects(candidates, false);
    if (hits.length) {
      let n = hits[0].object;
      while (n && !n.userData.unit) n = n.parent;
      if (n && n.userData.unit) n.userData.unit.selected = true;
    }
    return;
  }

  const xMin = Math.min(drag.x0, drag.x1);
  const yMin = Math.min(drag.y0, drag.y1);
  const xMax = Math.max(drag.x0, drag.x1);
  const yMax = Math.max(drag.y0, drag.y1);
  const target = new THREE.Vector3();
  for (const u of units) {
    if (u.team !== TEAM_BLUE || u.hp <= 0) continue;
    target.set(u.x, 1.0, u.z);
    const s = projectToScreen(target, rect);
    if (s.x >= xMin && s.x <= xMax && s.y >= yMin && s.y <= yMax) u.selected = true;
  }
}

function issueOrder() {
  const selected = units.filter(u => u.selected && u.hp > 0);
  if (!selected.length) return;
  const enemy = pickEnemy();
  if (enemy) {
    for (const u of selected) { u.attackTarget = enemy; u.moveTarget = null; }
    return;
  }
  const p = pickGround();
  if (!p) return;

  const cols = Math.ceil(Math.sqrt(selected.length));
  let cx = 0, cz = 0;
  for (const u of selected) { cx += u.x; cz += u.z; }
  cx /= selected.length; cz /= selected.length;
  let fx = p.x - cx, fz = p.z - cz;
  const flen = Math.hypot(fx, fz) || 1;
  fx /= flen; fz /= flen;
  const rx = -fz, rz = fx;
  selected.forEach((u, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const ox = (col - (cols - 1) * 0.5) * SPACING;
    const oz = -row * SPACING;
    u.moveTarget = { x: p.x + rx * ox + fx * oz, z: p.z + rz * ox + fz * oz };
    u.attackTarget = null;
  });
}

function nearestEnemy(u) {
  let best = null, bestD = 1e9;
  for (const v of units) {
    if (v.team === u.team || v.hp <= 0) continue;
    const d = (u.x - v.x) ** 2 + (u.z - v.z) ** 2;
    if (d < bestD) { best = v; bestD = d; }
  }
  return { u: best, d2: bestD };
}

function step(dt) {
  for (const u of units) {
    if (u.hp <= 0) continue;
    if (!u.attackTarget || u.attackTarget.hp <= 0) {
      const ne = nearestEnemy(u);
      u.attackTarget = (ne.u && ne.d2 < 25 * 25) ? ne.u : null;
    }
    let tx = null, tz = null;
    if (u.attackTarget) { tx = u.attackTarget.x; tz = u.attackTarget.z; }
    else if (u.moveTarget) { tx = u.moveTarget.x; tz = u.moveTarget.z; }
    if (tx !== null) {
      const dx = tx - u.x, dz = tz - u.z;
      const dist = Math.hypot(dx, dz);
      if (u.attackTarget && dist < ATTACK_RANGE) {
        u.vx = 0; u.vz = 0;
        u.attackTarget.hp -= ATTACK_DPS * dt;
      } else if (dist > 0.15) {
        u.vx = (dx / dist) * UNIT_SPEED;
        u.vz = (dz / dist) * UNIT_SPEED;
      } else {
        u.vx = 0; u.vz = 0;
        if (!u.attackTarget) u.moveTarget = null;
      }
    } else { u.vx = 0; u.vz = 0; }
    u.x += u.vx * dt;
    u.z += u.vz * dt;
  }
  for (let i = 0; i < units.length; i++) {
    const a = units[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j]; if (b.hp <= 0) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const minD = 1.4;
      if (d > 0 && d < minD) {
        const push = (minD - d) / 2;
        a.x -= (dx / d) * push; a.z -= (dz / d) * push;
        b.x += (dx / d) * push; b.z += (dz / d) * push;
      }
    }
    a.x = Math.max(-100, Math.min(100, a.x));
    a.z = Math.max(-100, Math.min(100, a.z));
  }
  let blue = 0, red = 0;
  for (const u of units) {
    if (u.hp <= 0) { killVisuals(u); continue; }
    if (u.team === TEAM_BLUE) blue++; else red++;
  }
  if (red === 0) showBanner('Victory', 'win');
  else if (blue === 0) showBanner('Defeat', 'lose');
}

function tickPan(dt) {
  let dx = 0, dz = 0;
  if (keys.has('w') || keys.has('arrowup') || mouseClient.y < EDGE_PAD) dz -= 1;
  if (keys.has('s') || keys.has('arrowdown') || mouseClient.y > canvas.clientHeight - EDGE_PAD) dz += 1;
  if (keys.has('a') || keys.has('arrowleft') || mouseClient.x < EDGE_PAD) dx -= 1;
  if (keys.has('d') || keys.has('arrowright') || mouseClient.x > canvas.clientWidth - EDGE_PAD) dx += 1;
  if (dx || dz) panCamera(dx * PAN_SPEED * dt, dz * PAN_SPEED * dt);
}

let bannerShown = false;
function showBanner(text, cls) {
  if (bannerShown) return;
  bannerShown = true;
  banner.innerHTML = text + '<small>Refresh the page to play again</small>';
  banner.className = cls;
  banner.classList.remove('hidden');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickPan(dt);
  step(dt);
  for (const u of units) updateUnitVisuals(u, camera, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
