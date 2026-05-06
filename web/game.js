import * as THREE from 'three';
import { scene, camera, renderer, setProjectiles, updateFx } from './scene.js';
import { makeUnit, updateUnitVisuals } from './units.js';
import { RACES, applyCard, showCardPicker, showRacePicker } from './lib/cards.js';
import { runAllSpells } from './lib/spells.js';
import { applyBuildings, buildingHealBonus, placeBuildings } from './lib/buildings.js';
import { isBossRound, bossRoster, bossForRound, swapToBossMesh } from './lib/bosses.js';

const TEAM_BLUE = 0;
const TEAM_RED = 1;
const SPACING = 2.6;
const BASE_Z = 22;
const HEAL_FRACTION = 0.4;

const banner = document.getElementById('banner');
const roundLabel = document.getElementById('round-label');
const scoreLabel = document.getElementById('score-label');
const rosterLabel = document.getElementById('roster-label');
const spellsBar = document.getElementById('spells');
const buildingsBar = document.getElementById('buildings');

const ENEMY_RACES = ['skeletons', 'dwarves', 'elves', 'humans'];
let playerRace = 'humans';
let enemyRace = 'skeletons';
let playerRoster = [];
let playerSpells = [];
let playerBuildings = [];
const buildingMeshes = [];
let round = 1;
let wins = 0;
let phase = 'select';
const units = [];
const projectiles = [];
const PROJ_TTL = 0.12;
const RANGED_THRESHOLD = 3.0;

function makeBaseRoster(race) {
  const b = RACES[race].base;
  const out = [];
  for (let i = 0; i < b.count; i++) {
    out.push({ maxHp: b.hp, currentHp: b.hp, damage: b.damage, speed: b.speed, range: b.range });
  }
  return out;
}

function enemyRosterForRound(n, raceKey) {
  const base = RACES[raceKey].base;
  const hpScale = 0.70 + (n - 1) * 0.12;
  const dmgScale = 0.70 + (n - 1) * 0.10;
  const countScale = 0.65 + (n - 1) * 0.12;
  const count = Math.max(3, Math.round(base.count * countScale));
  const hp = Math.max(20, Math.round(base.hp * hpScale));
  const dmg = Math.max(6, Math.round(base.damage * dmgScale));
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ maxHp: hp, currentHp: hp, damage: dmg, speed: base.speed * 0.92, range: base.range });
  }
  return out;
}

function clearArmies() {
  for (const u of units) scene.remove(u.mesh);
  units.length = 0;
  projectiles.length = 0;
  setProjectiles([]);
}

function spawnRoster(teamIdx, roster, baseZ, raceKey) {
  const cols = Math.min(6, Math.ceil(Math.sqrt(roster.length * 1.5)));
  for (let i = 0; i < roster.length; i++) {
    const w = roster[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - (cols - 1) * 0.5) * SPACING;
    const z = baseZ + row * SPACING * (baseZ > 0 ? 1 : -1);
    const u = makeUnit(teamIdx, x, z, w, raceKey);
    u.maxHp = w.maxHp;
    u.hp = Math.max(1, w.currentHp);
    u.damage = w.damage;
    u.speed = w.speed;
    u.range = w.range;
    u.rosterIdx = i;
    u.bossId = w.bossId;
    u.isBoss = !!w.isBoss;
    units.push(u);
    scene.add(u.mesh);
    if (u.isBoss) swapToBossMesh(u, scene);
  }
}

function refreshHud() {
  const alive = playerRoster.length;
  const totalHp = playerRoster.reduce((s, w) => s + w.currentHp, 0);
  const maxHp = playerRoster.reduce((s, w) => s + w.maxHp, 0);
  rosterLabel.textContent = `${alive} alive · ${Math.round(totalHp)}/${maxHp} HP`;
  spellsBar.innerHTML = '';
  for (const s of playerSpells) {
    const el = document.createElement('div');
    el.className = 'spell'; el.title = s.name; el.textContent = s.icon;
    spellsBar.appendChild(el);
  }
  buildingsBar.innerHTML = '';
  for (const b of playerBuildings) {
    const el = document.createElement('div');
    el.className = 'building'; el.title = b.name; el.textContent = b.icon;
    buildingsBar.appendChild(el);
  }
}

function startRound() {
  if (round > 1) applyBuildings(playerRoster, playerBuildings, playerRace);
  clearArmies();
  placeBuildings(scene, buildingMeshes, playerBuildings, BASE_Z + 18);
  const boss = isBossRound(round);
  enemyRace = ENEMY_RACES[(round - 1) % ENEMY_RACES.length];
  if (enemyRace === playerRace) enemyRace = ENEMY_RACES[(round) % ENEMY_RACES.length];
  spawnRoster(TEAM_BLUE, playerRoster, BASE_Z, playerRace);
  const enemyList = boss
    ? bossRoster(round, RACES[enemyRace].base)
    : enemyRosterForRound(round, enemyRace);
  spawnRoster(TEAM_RED, enemyList, -BASE_Z, enemyRace);
  phase = 'battle';
  const enemyLabel = boss ? bossForRound(round).name : RACES[enemyRace].name;
  roundLabel.textContent = `Round ${round} — vs ${enemyLabel}`;
  scoreLabel.textContent = `${RACES[playerRace].icon} ${RACES[playerRace].name} · ${wins} ${wins === 1 ? 'win' : 'wins'}`;
  refreshHud();
  banner.classList.add('hidden');
  const toast = document.getElementById('round-toast');
  if (toast) {
    const eIcon = boss ? bossForRound(round).icon : RACES[enemyRace].icon;
    const eName = boss ? bossForRound(round).name.toUpperCase() : RACES[enemyRace].name;
    toast.innerHTML = `${boss ? 'BOSS — ' : ''}Round ${round}<small>${RACES[playerRace].icon} ${RACES[playerRace].name} vs ${eIcon} ${eName}</small>`;
    toast.classList.toggle('boss', boss);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), boss ? 2400 : 1700);
  }
  setTimeout(() => { runAllSpells(playerSpells, units); playerSpells.length = 0; refreshHud(); }, 350);
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
      if (u.range >= RANGED_THRESHOLD) {
        u.fireCooldown = (u.fireCooldown || 0) - dt;
        if (u.fireCooldown <= 0) {
          projectiles.push({
            x1: u.x, y1: 1.6, z1: u.z,
            x2: u.attackTarget.x, y2: 1.6, z2: u.attackTarget.z,
            ttl: PROJ_TTL,
          });
          u.fireCooldown = 0.18;
        }
      }
    } else {
      u.vx = (dx / dist) * u.speed;
      u.vz = (dz / dist) * u.speed;
    }
    u.x += u.vx * dt;
    u.z += u.vz * dt;
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].ttl -= dt;
    if (projectiles[i].ttl <= 0) projectiles.splice(i, 1);
  }
  setProjectiles(projectiles.map(p => [p.x1, p.y1, p.z1, p.x2, p.y2, p.z2]));
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
    if (u.hp <= 0) continue;
    if (u.team === TEAM_BLUE) blue++; else red++;
  }
  if (phase === 'battle') {
    if (red === 0 && blue > 0) onWin();
    else if (blue === 0) onLoss();
  }
}

function syncRosterFromUnits() {
  const survivors = [];
  for (const u of units) {
    if (u.team !== TEAM_BLUE || u.hp <= 0) continue;
    const w = playerRoster[u.rosterIdx];
    if (!w) continue;
    w.currentHp = Math.min(w.maxHp, u.hp);
    survivors.push(w);
  }
  playerRoster = survivors;
  const fraction = HEAL_FRACTION + buildingHealBonus(playerBuildings);
  for (const w of playerRoster) {
    w.currentHp = Math.min(w.maxHp, w.currentHp + (w.maxHp - w.currentHp) * fraction);
  }
}

function onWin() {
  phase = 'cardpick';
  wins++;
  syncRosterFromUnits();
  scoreLabel.textContent = `${RACES[playerRace].icon} ${RACES[playerRace].name} · ${wins} ${wins === 1 ? 'win' : 'wins'}`;
  refreshHud();
  setTimeout(() => {
    showCardPicker(playerRace, round, (card) => {
      applyCard(card, playerRoster, playerSpells, playerRace, playerBuildings);
      refreshHud();
      round++;
      startRound();
    });
  }, 800);
}

function onLoss() {
  phase = 'gameover';
  syncRosterFromUnits();
  banner.innerHTML = `Defeat — round ${round}<small>${wins} ${wins === 1 ? 'win' : 'wins'} in this run</small><button id="retry">New Run</button>`;
  banner.className = 'lose';
  banner.classList.remove('hidden');
  setTimeout(() => {
    const btn = document.getElementById('retry');
    if (btn) btn.addEventListener('click', () => { banner.classList.add('hidden'); startGame(); });
  }, 0);
}

function startGame() {
  showRacePicker((raceKey) => {
    playerRace = raceKey;
    playerRoster = makeBaseRoster(raceKey);
    playerSpells = [];
    playerBuildings = [];
    round = 1;
    wins = 0;
    startRound();
  });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (phase === 'battle') step(dt);
  updateFx(dt);
  for (const u of units) updateUnitVisuals(u, camera, now / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

startGame();
requestAnimationFrame(frame);
