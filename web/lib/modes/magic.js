import { makeUnit } from '../../units.js';

const RACE_MAGIC = {
  humans:    { school: 'holy',    orb: 0xfff5b8 },
  dwarves:   { school: 'fire',    orb: 0xff5530 },
  elves:     { school: 'arcane',  orb: 0xb88dff },
  skeletons: { school: 'summon',  orb: 0x9be2ff },
};

export function magicSchoolFor(raceKey) {
  return (RACE_MAGIC[raceKey] || RACE_MAGIC.humans).school;
}

export function orbColorFor(raceKey) {
  return (RACE_MAGIC[raceKey] || RACE_MAGIC.humans).orb;
}

export function applyMagicHit(caster, target, ctx) {
  const { units, t, dx, dz, dist, scene, spawnFx, addUnit } = ctx;
  const school = magicSchoolFor(caster.raceKey);
  const baseDmg = caster.damage * caster.swingPeriod;

  if (school === 'holy') {
    let weakest = null, lowest = Infinity;
    for (const v of units) {
      if (v.team !== caster.team || v.hp <= 0) continue;
      const ratio = v.hp / v.maxHp;
      if (ratio < lowest && v.hp < v.maxHp) { lowest = ratio; weakest = v; }
    }
    if (weakest) {
      const heal = Math.min(weakest.maxHp - weakest.hp, baseDmg * 1.5);
      weakest.hp += heal;
      spawnFx(weakest.x, weakest.z, 1.1, 0xfff5b8, 0.55);
    } else {
      target.hp -= baseDmg;
      spawnFx(target.x, target.z, 0.55, 0xfff5b8, 0.2);
    }
    return true;
  }

  if (school === 'fire') {
    target.hp -= baseDmg;
    target.recoilStart = t;
    target.recoilDirX = -dx / dist;
    target.recoilDirZ = -dz / dist;
    spawnFx(target.x, target.z, 1.0, 0xff5530, 0.4);
    return true;
  }

  if (school === 'arcane') {
    spawnFx(target.x, target.z, 1.8, 0xb88dff, 0.45);
    for (const v of units) {
      if (v.team !== target.team || v.hp <= 0) continue;
      const d2 = (v.x - target.x) ** 2 + (v.z - target.z) ** 2;
      if (d2 < 4) {
        v.hp -= baseDmg * (v === target ? 1.0 : 0.5);
        if (v === target) { v.recoilStart = t; v.recoilDirX = -dx / dist; v.recoilDirZ = -dz / dist; }
      }
    }
    return true;
  }

  if (school === 'summon') {
    target.hp -= baseDmg * 0.4;
    spawnFx(target.x, target.z, 0.55, 0x9be2ff, 0.2);
    caster.summonCount = (caster.summonCount || 0) + 1;
    if (caster.summonCount % 2 === 0 && addUnit) {
      const stats = { hp: 55, currentHp: 55, maxHp: 55, damage: 14, speed: 7.5, range: 2.0, klass: 'infantry' };
      const u = makeUnit(caster.team, caster.x + (Math.random() - 0.5) * 2, caster.z + (Math.random() - 0.5) * 2, stats, 'skeletons');
      u.maxHp = stats.maxHp; u.hp = stats.maxHp;
      u.damage = stats.damage; u.baseSpeed = u.speed = stats.speed; u.baseRange = u.range = stats.range;
      u.x = caster.x + (Math.random() - 0.5) * 2;
      u.z = caster.z + (Math.random() - 0.5) * 2;
      u.summoned = true;
      addUnit(u);
      spawnFx(u.x, u.z, 0.8, 0x9be2ff, 0.5);
    }
    return true;
  }

  return false;
}
