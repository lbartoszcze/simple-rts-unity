import * as THREE from 'three';
import {
  scene, camera, renderer, canvas,
  panCamera, zoomCamera,
} from './scene.js';
import { makeUnit, updateUnitVisuals, killVisuals } from './units.js';
import { RACES, showCardPicker, showRacePicker } from './lib/cards.js';

const TEAM_BLUE = 0;
const TEAM_RED = 1;
const SPACING = 2.6;
const PAN_SPEED = 38;
const EDGE_PAD = 14;

const banner = document.getElementById('banner');
const roundLabel = document.getElementById('round-label');
const scoreLabel = document.getElementById('score-label');

const ENEMY_RACES = ['skeletons', 'dwarves', 'elves', 'humans'];
let playerRace = 'humans';
let enemyRace = 'skeletons';
let playerStats = { ...RACES.humans.base };
let round = 1;
let wins = 0;
let phase = 'select';
const units = [];

function enemyStatsForRound(n, raceKey) {
  const base = RACES[raceKey].base;
  const scale = 1 + (n - 1) * 0.18;
  return {
    count: Math.round(base.count * (0.85 + (n - 1) * 0.18)),
    hp: Math.round(base.hp * scale),
    damage: Math.round(base.damage * (1 + (n - 1) * 0.10)),
    speed: base.speed,
    range: base.range,
  };
}

function clearArmies() {
  for (const u of units) scene.remove(u.mesh);
  units.length = 0;
}

function spawnArmy(teamIdx, stats, baseZ, raceKey) {
  const cols = Math.min(6, Math.ceil(Math.sqrt(stats.count * 1.5)));
  const rows = Math.ceil(stats.count / cols);
  let placed = 0;
  for (let r = 0; r < rows && placed < stats.count; r++) {
    for (let c = 0; c < cols && placed < stats.count; c++) {
      const x = (c - (cols - 1) * 0.5) * SPACING;
      const z = baseZ + r * SPACING * (baseZ > 0 ? 1 : -1);
      const u = makeUnit(teamIdx, x, z, stats, raceKey);
      units.push(u);
      scene.add(u.mesh);
      placed++;
    }
  }
}

function startRound() {
  clearArmies();
  enemyRace = ENEMY_RACES[(round - 1) % ENEMY_RACES.length];
  if (enemyRace === playerRace) enemyRace = ENEMY_RACES[(round) % ENEMY_RACES.length];
  spawnArmy(TEAM_BLUE, playerStats, 30, playerRace);
  spawnArmy(TEAM_RED, enemyStatsForRound(round, enemyRace), -30, enemyRace);
  phase = 'battle';
  roundLabel.textContent = `Round ${round} — vs ${RACES[enemyRace].name}`;
  scoreLabel.textContent = `${RACES[playerRace].icon} ${RACES[playerRace].name} · ${wins} ${wins === 1 ? 'win' : 'wins'}`;
  banner.classList.add('hidden');
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
      u.attackTarget = nearestEnemy(u).u;
    }
    if (!u.attackTarget) { u.vx = 0; u.vz = 0; continue; }
    const dx = u.attackTarget.x - u.x;
    const dz = u.attackTarget.z - u.z;
    const dist = Math.hypot(dx, dz);
    if (dist < u.range) {
      u.vx = 0; u.vz = 0;
      u.attackTarget.hp -= u.damage * dt;
    } else {
      u.vx = (dx / dist) * u.speed;
      u.vz = (dz / dist) * u.speed;
    }
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
  if (phase === 'battle') {
    if (red === 0 && blue > 0) onWin();
    else if (blue === 0) onLoss();
  }
}

function onWin() {
  phase = 'cardpick';
  wins++;
  scoreLabel.textContent = `${RACES[playerRace].icon} ${RACES[playerRace].name} · ${wins} ${wins === 1 ? 'win' : 'wins'}`;
  setTimeout(() => {
    showCardPicker(playerRace, round, (card) => {
      card.apply(playerStats);
      round++;
      startRound();
    });
  }, 800);
}

function onLoss() {
  phase = 'gameover';
  banner.innerHTML = `Defeat — round ${round}<small>${wins} ${wins === 1 ? 'win' : 'wins'} in this run</small><button id="retry">New Run</button>`;
  banner.className = 'lose';
  banner.classList.remove('hidden');
  setTimeout(() => {
    const btn = document.getElementById('retry');
    if (btn) btn.addEventListener('click', () => { banner.classList.add('hidden'); startGame(); });
  }, 0);
}

function resetRun() {
  playerStats = { ...RACES[playerRace].base };
  round = 1;
  wins = 0;
  startRound();
}

function startGame() {
  showRacePicker((raceKey) => {
    playerRace = raceKey;
    playerStats = { ...RACES[raceKey].base };
    round = 1;
    wins = 0;
    startRound();
  });
}

const keys = new Set();
const mouseClient = { x: 0, y: 0 };
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouseClient.x = e.clientX - r.left;
  mouseClient.y = e.clientY - r.top;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomCamera(e.deltaY * 0.04);
}, { passive: false });

function tickPan(dt) {
  let dx = 0, dz = 0;
  if (keys.has('w') || keys.has('arrowup')    || mouseClient.y < EDGE_PAD) dz -= 1;
  if (keys.has('s') || keys.has('arrowdown')  || mouseClient.y > canvas.clientHeight - EDGE_PAD) dz += 1;
  if (keys.has('a') || keys.has('arrowleft')  || mouseClient.x < EDGE_PAD) dx -= 1;
  if (keys.has('d') || keys.has('arrowright') || mouseClient.x > canvas.clientWidth - EDGE_PAD) dx += 1;
  if (dx || dz) panCamera(dx * PAN_SPEED * dt, dz * PAN_SPEED * dt);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickPan(dt);
  if (phase === 'battle') step(dt);
  for (const u of units) updateUnitVisuals(u, camera, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

startGame();
requestAnimationFrame(frame);
