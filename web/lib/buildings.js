import * as THREE from 'three';
import { RACES } from './cards.js';

function spawnRecruit(roster, race) {
  const b = RACES[race].base;
  roster.push({ maxHp: b.hp, currentHp: b.hp, damage: b.damage, speed: b.speed, range: b.range });
}

export const BUILDINGS = {
  fireplace: {
    id: 'fireplace', name: 'Fireplace', icon: '🔥',
    desc: '+15% extra heal between rounds (compounds)',
    apply: () => { /* effect read by buildingHealBonus */ },
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', icon: '🗼',
    desc: '+1 damage per warrior at round start',
    apply: (roster) => { for (const w of roster) w.damage += 1; },
  },
  forge: {
    id: 'forge', name: 'Forge', icon: '🛠️',
    desc: '+2 damage per warrior at round start',
    apply: (roster) => { for (const w of roster) w.damage += 2; },
  },
  mine: {
    id: 'mine', name: 'Mine', icon: '⛏️',
    desc: '+1 warrior every 2 rounds',
    apply: (roster, race, b) => {
      b.tick = (b.tick || 0) + 1;
      if (b.tick % 2 === 0) spawnRecruit(roster, race);
    },
  },
  grove: {
    id: 'grove', name: 'Grove', icon: '🌳',
    desc: '+6 max HP per warrior at round start, also heals',
    apply: (roster) => {
      for (const w of roster) {
        w.maxHp += 6;
        w.currentHp = Math.min(w.maxHp, w.currentHp + 6);
      }
    },
  },
  watchwood: {
    id: 'watchwood', name: 'Watchwood', icon: '🌲',
    desc: '+0.15 range per warrior at round start',
    apply: (roster) => { for (const w of roster) w.range += 0.15; },
  },
  boneyard: {
    id: 'boneyard', name: 'Boneyard', icon: '🪦',
    desc: '+1 fresh warrior at round start',
    apply: (roster, race) => spawnRecruit(roster, race),
  },
  crypt: {
    id: 'crypt', name: 'Crypt', icon: '⚰️',
    desc: '+5% damage per warrior at round start',
    apply: (roster) => { for (const w of roster) w.damage = Math.round(w.damage * 1.05 + 0.0001); },
  },
};

export function applyBuildings(roster, buildings, race) {
  for (const b of buildings) {
    const def = BUILDINGS[b.id];
    if (def && def.apply) def.apply(roster, race, b);
  }
}

export function buildingHealBonus(buildings) {
  let bonus = 0;
  for (const b of buildings) if (b.id === 'fireplace') bonus += 0.15;
  return bonus;
}

export function placeBuildings(scene, existing, list, z) {
  for (const m of existing) scene.remove(m);
  existing.length = 0;
  if (!list.length) return;
  const spacing = 5;
  const startX = -(list.length - 1) * spacing * 0.5;
  for (let i = 0; i < list.length; i++) {
    const m = makeBuildingMesh(list[i].id);
    m.position.set(startX + i * spacing, 0, z);
    scene.add(m);
    existing.push(m);
  }
}

const colors = {
  stone: 0x9aa0a4, wood: 0x6b4423, dark: 0x33373d, fire: 0xff8a3a,
  bone: 0xeee5d0, leaf: 0x3a8a3f, gold: 0xc9a44a, glow: 0x6cd6ff,
};

function box(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true;
  return m;
}
function cyl(rt, rb, h, color, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg),
    new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true;
  return m;
}
function cone(r, h, color, seg = 7) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg),
    new THREE.MeshLambertMaterial({ color }));
  m.castShadow = true;
  return m;
}

export function makeBuildingMesh(id) {
  const g = new THREE.Group();
  if (id === 'fireplace') {
    const ring = cyl(1.0, 1.1, 0.4, colors.stone); ring.position.y = 0.2; g.add(ring);
    const flame = cone(0.5, 1.4, colors.fire); flame.position.y = 1.1; g.add(flame);
    const flame2 = cone(0.3, 1.0, 0xffd066); flame2.position.y = 1.3; g.add(flame2);
  } else if (id === 'watchtower') {
    const base = box(1.4, 0.4, 1.4, colors.stone); base.position.y = 0.2; g.add(base);
    const trunk = box(1.1, 2.6, 1.1, colors.stone); trunk.position.y = 1.7; g.add(trunk);
    const top = box(1.4, 0.3, 1.4, colors.dark); top.position.y = 3.15; g.add(top);
    const roof = cone(1.0, 0.9, colors.wood); roof.position.y = 3.75; g.add(roof);
  } else if (id === 'forge') {
    const base = box(1.6, 1.0, 1.4, colors.stone); base.position.y = 0.5; g.add(base);
    const chim = box(0.5, 1.4, 0.5, colors.dark); chim.position.set(0.4, 1.7, -0.4); g.add(chim);
    const glow = cone(0.32, 0.5, colors.fire); glow.position.set(0.4, 2.5, -0.4); g.add(glow);
  } else if (id === 'mine') {
    const ent = box(1.6, 1.4, 0.3, colors.wood); ent.position.y = 0.7; g.add(ent);
    const hole = box(0.9, 1.0, 0.5, colors.dark); hole.position.set(0, 0.5, 0.2); g.add(hole);
    const beam = box(0.2, 1.6, 0.2, colors.wood);
    beam.position.set(-0.8, 0.8, 0); g.add(beam);
    const beam2 = beam.clone(); beam2.position.x = 0.8; g.add(beam2);
  } else if (id === 'grove') {
    for (let i = 0; i < 3; i++) {
      const trunk = cyl(0.18, 0.25, 0.9, colors.wood);
      trunk.position.set((i - 1) * 0.7, 0.45, 0); g.add(trunk);
      const leaves = cone(0.7, 1.4, colors.leaf);
      leaves.position.set((i - 1) * 0.7, 1.5, 0); g.add(leaves);
    }
  } else if (id === 'watchwood') {
    const trunk = cyl(0.2, 0.3, 1.4, colors.wood); trunk.position.y = 0.7; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const tier = cone(1.0 - i * 0.2, 1.2 - i * 0.18, colors.leaf);
      tier.position.y = 1.5 + i * 0.7; g.add(tier);
    }
  } else if (id === 'boneyard') {
    const slab = box(1.6, 0.2, 1.2, colors.stone); slab.position.y = 0.1; g.add(slab);
    for (let i = 0; i < 5; i++) {
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshLambertMaterial({ color: colors.bone })
      );
      skull.position.set((Math.random() - 0.5) * 1.1, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.8);
      skull.castShadow = true;
      g.add(skull);
    }
    const cross = box(0.1, 1.0, 0.1, colors.bone); cross.position.set(0.5, 0.7, -0.5); g.add(cross);
  } else if (id === 'crypt') {
    const base = box(1.6, 0.4, 1.2, colors.stone); base.position.y = 0.2; g.add(base);
    const sarc = box(1.2, 1.0, 0.9, 0x575c66); sarc.position.y = 0.9; g.add(sarc);
    const lid = box(1.3, 0.15, 1.0, colors.dark); lid.position.y = 1.45; g.add(lid);
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5),
      new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.85 }));
    rune.position.set(0, 0.95, 0.46); g.add(rune);
  }
  return g;
}
