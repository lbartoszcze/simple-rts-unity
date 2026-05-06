import { spawnFx } from '../scene.js';

const TEAM_BLUE = 0;
const TEAM_RED = 1;
const BASE_Z = 22;

export function runSpell(s, units) {
  if (s.id === 'fireball') {
    const enemies = units.filter(u => u.team === TEAM_RED && u.hp > 0);
    if (!enemies.length) return;
    let cx = 0, cz = 0;
    for (const e of enemies) { cx += e.x; cz += e.z; }
    cx /= enemies.length; cz /= enemies.length;
    spawnFx(cx, cz, s.radius || 6, 0xff8a3a, 0.7);
    const r2 = (s.radius || 6) ** 2;
    for (const e of enemies) {
      const d2 = (e.x - cx) ** 2 + (e.z - cz) ** 2;
      if (d2 < r2) e.hp -= s.dmg || 40;
    }
  } else if (s.id === 'all_enemies') {
    const enemies = units.filter(u => u.team === TEAM_RED && u.hp > 0);
    if (!enemies.length) return;
    spawnFx(0, -BASE_Z, 14, 0xa8e0a8, 0.6);
    for (const e of enemies) e.hp -= s.dmg || 30;
  } else if (s.id === 'heal_full') {
    spawnFx(0, BASE_Z, 12, 0x9be2ff, 0.7);
    for (const u of units) {
      if (u.team === TEAM_BLUE && u.hp > 0) u.hp = u.maxHp;
    }
  } else if (s.id === 'heal_pct') {
    spawnFx(0, BASE_Z, 12, 0xfff0a0, 0.7);
    const pct = s.pct || 0.5;
    for (const u of units) {
      if (u.team === TEAM_BLUE && u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * pct);
    }
  } else if (s.id === 'soul_drain') {
    const enemies = units
      .filter(u => u.team === TEAM_RED && u.hp > 0)
      .sort((a, b) => a.hp - b.hp)
      .slice(0, s.count || 3);
    for (const e of enemies) {
      spawnFx(e.x, e.z, 1.6, 0xa050ff, 0.5);
      e.hp = 0;
    }
  }
}

export function runAllSpells(spells, units) {
  for (const s of spells) runSpell(s, units);
}
