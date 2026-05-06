import { applyMagicHit } from './magic.js';

const baseDmg = (c) => c.damage * c.swingPeriod * (c.formationMul || 1);

export const RACE_BUFF = {
  humans:    { name: 'Banner of Valor', desc: '+15% damage per nearby human ally (max +60%)' },
  dwarves:   { name: 'Stoneblood',      desc: '+30% max HP at spawn' },
  elves:     { name: 'Forest Step',     desc: '+25% movement speed' },
  skeletons: { name: 'Endless Tide',    desc: '+1 HP/s regen for every skeleton' },
};

export function applyRaceBuffsAtSpawn(stats, raceKey) {
  if (raceKey === 'dwarves') {
    stats.maxHp = Math.round(stats.maxHp * 1.3);
    stats.currentHp = Math.min(stats.maxHp, Math.round(stats.currentHp * 1.3));
  }
  const variant = RACE_CLASS[raceKey]?.[stats.klass];
  if (variant?.stats) {
    if (variant.stats.range != null)       stats.range       = variant.stats.range;
    if (variant.stats.swingPeriod != null) stats.swingPeriod = variant.stats.swingPeriod;
    if (variant.stats.kiteRatio != null)   stats.kiteRatio   = variant.stats.kiteRatio;
  }
  return stats;
}
const recoil = (t, ctx) => { t.recoilStart = ctx.t; t.recoilDirX = -ctx.dx / ctx.dist; t.recoilDirZ = -ctx.dz / ctx.dist; };

const RACE_CLASS = {
  humans: {
    infantry: { name: 'Footman', onHit: (c, t, ctx) => { t.staggerUntil = ctx.t + 0.4; ctx.spawnFx(t.x, t.z, 0.45, 0xfff5b8, 0.18); return false; } },
    archer:   { name: 'Marksman', stats: { range: 7.5, swingPeriod: 1.0, kiteRatio: 0 }, onHit: (c, t, ctx) => { const m = t.klass === 'flyer' ? 1.4 : 1.0; t.hp -= baseDmg(c) * m * 1.4; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xfff5b8, 0.22); return true; } },
    mage:     { name: 'Cleric', onHit: applyMagicHit },
    cavalry:  { name: 'Lancer', onHit: (c, t, ctx) => { const charge = c.lastChargeTarget !== t; t.hp -= baseDmg(c) * (charge ? 2 : 1); recoil(t, ctx); ctx.spawnFx(t.x, t.z, charge ? 0.9 : 0.5, 0xfff5b8, charge ? 0.35 : 0.15); c.lastChargeTarget = t; return true; } },
    flyer:    { name: 'Pegasus', onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 1.2; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xfff5b8, 0.18); return true; } },
    beast:    { name: 'War Hound', onHit: (c, t, ctx) => { let pack = 0; for (const v of ctx.units) if (v.team === c.team && v.klass === 'beast' && v.hp > 0) pack++; t.hp -= baseDmg(c) * (1 + Math.max(0, pack - 1) * 0.18); recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xfff5b8, 0.18); return true; } },
  },
  dwarves: {
    infantry: { name: 'Shieldbearer', onHit: (c, t, ctx) => { const w = c.hp / c.maxHp < 0.5 ? 1.5 : 1.0; t.hp -= baseDmg(c) * w; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xff8a3a, 0.18); return true; } },
    archer:   { name: 'Crossbowman', stats: { range: 5.0, swingPeriod: 1.2, kiteRatio: 0 }, onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 1.8; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.85, 0xff8a3a, 0.28); return true; } },
    mage:     { name: 'Pyromancer', onHit: applyMagicHit },
    cavalry:  { name: 'Boar Rider', onHit: (c, t, ctx) => { t.hp -= baseDmg(c); const nx = -ctx.dx / ctx.dist, nz = -ctx.dz / ctx.dist; t.x += nx * 1.0; t.z += nz * 1.0; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.7, 0xff8a3a, 0.22); return true; } },
    flyer:    { name: 'Gyrocopter', onHit: (c, t, ctx) => { for (const v of ctx.units) { if (v.team !== t.team || v.hp <= 0) continue; const d2 = (v.x - t.x) ** 2 + (v.z - t.z) ** 2; if (d2 < 4) v.hp -= baseDmg(c) * (v === t ? 1 : 0.5); } ctx.spawnFx(t.x, t.z, 1.4, 0xff5530, 0.45); return true; } },
    beast:    { name: 'Cave Bear', onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 1.3; t.staggerUntil = ctx.t + 0.6; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.7, 0xff8a3a, 0.22); return true; } },
  },
  elves: {
    infantry: { name: 'Bladedancer', onHit: (c, t, ctx) => { const dbl = Math.random() < 0.3; t.hp -= baseDmg(c) * (dbl ? 2 : 1); recoil(t, ctx); ctx.spawnFx(t.x, t.z, dbl ? 0.55 : 0.4, dbl ? 0xa8e8b8 : 0xfff5b8, 0.18); return true; } },
    archer:   { name: 'Longbowman', stats: { range: 9.0, swingPeriod: 0.5, kiteRatio: 0.85 }, onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 0.85; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.5, 0xa8e8b8, 0.18); return true; } },
    mage:     { name: 'Arcanist', onHit: applyMagicHit },
    cavalry:  { name: 'Stag Rider', onHit: (c, t, ctx) => { t.hp -= baseDmg(c); if (Math.random() < 0.25) c.dodgeUntil = ctx.t + 0.8; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.5, 0xa8e8b8, 0.18); return true; } },
    flyer:    { name: 'Hawk Archer', onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 1.3; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.5, 0xa8e8b8, 0.18); return true; } },
    beast:    { name: 'Treant', onHit: (c, t, ctx) => { t.hp -= baseDmg(c); t.rootedUntil = ctx.t + 1.4; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.7, 0x3a8a3f, 0.35); return true; } },
  },
  skeletons: {
    infantry: { name: 'Risen', onHit: (c, t, ctx) => { t.hp -= baseDmg(c); recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.5, 0xb88dff, 0.18); return true; } },
    archer:   { name: 'Bone Slinger', stats: { range: 5.5, swingPeriod: 0.45, kiteRatio: 0.4 }, onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 0.7; recoil(t, ctx); let n = null, nd = 9; for (const v of ctx.units) if (v !== t && v.team === t.team && v.hp > 0) { const d2 = (v.x - t.x) ** 2 + (v.z - t.z) ** 2; if (d2 < nd) { nd = d2; n = v; } } if (n) { n.hp -= baseDmg(c) * 0.4; ctx.spawnFx(n.x, n.z, 0.4, 0xb88dff, 0.22); } return true; } },
    mage:     { name: 'Necromancer', onHit: applyMagicHit },
    cavalry:  { name: 'Death Knight', onHit: (c, t, ctx) => { const k = t.hp <= baseDmg(c); t.hp -= baseDmg(c); if (k) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.25); recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xb88dff, k ? 0.4 : 0.18); return true; } },
    flyer:    { name: 'Crow', onHit: (c, t, ctx) => { t.hp -= baseDmg(c); recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.4, 0x4a4a4a, 0.15); return true; } },
    beast:    { name: 'Bone Hydra', onHit: (c, t, ctx) => { t.hp -= baseDmg(c) * 1.2; recoil(t, ctx); ctx.spawnFx(t.x, t.z, 0.55, 0xb88dff, 0.2); return true; } },
  },
};

export function variantNameFor(raceKey, klass) { return RACE_CLASS[raceKey]?.[klass]?.name || null; }

export function applyVariantHit(caster, target, ctx) {
  const v = RACE_CLASS[caster.raceKey]?.[caster.klass];
  if (v && v.onHit) return v.onHit(caster, target, ctx);
  return false;
}

export function tickRaceClass(units, dt, t) {
  for (const u of units) {
    if (u.hp <= 0) {
      if (!u.revived && u.raceKey === 'skeletons' && u.klass === 'infantry') { u.hp = 1; u.revived = true; }
      continue;
    }
    if (u.staggerUntil && t < u.staggerUntil) u.speed *= 0.2;
    if (u.rootedUntil && t < u.rootedUntil) u.speed = 0;
    if (u.raceKey === 'elves') u.speed *= 1.25;
    if (u.raceKey === 'skeletons') u.hp = Math.min(u.maxHp, u.hp + (u.klass === 'beast' ? 6 : 1) * dt);
    if (u.raceKey === 'skeletons' && u.klass === 'beast') {} // (legacy noop placeholder)
    if (u.raceKey === 'humans') {
      let near = 0;
      for (const v of units) { if (v === u || v.team !== u.team || v.hp <= 0 || v.raceKey !== 'humans') continue; if ((u.x - v.x) ** 2 + (u.z - v.z) ** 2 < 25) near++; }
      u.formationMul = 1 + Math.min(4, near) * 0.15;
      if (u.klass === 'cavalry' && u.attackTarget !== u.lastChargeTarget) u.lastChargeTarget = null;
    } else u.formationMul = 1;
  }
}
