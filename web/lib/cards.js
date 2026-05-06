export const RACES = {
  humans: {
    id: 'humans', name: 'Humans', icon: '👑',
    flavor: 'Disciplined, balanced, versatile.',
    base: { count: 8, hp: 110, damage: 22, speed: 7, range: 2.4 },
    cards: [
      { id: 'iron',     icon: '🛡️', name: 'Iron Plate',       tier: 'common', desc: '+30 HP per warrior',           apply: s => { s.hp += 30; } },
      { id: 'edge',     icon: '⚔️', name: 'Sharpened Blade',  tier: 'common', desc: '+8 attack damage',             apply: s => { s.damage += 8; } },
      { id: 'recruit',  icon: '🪖', name: 'Conscription',     tier: 'common', desc: '+2 warriors',                  apply: s => { s.count += 2; } },
      { id: 'discip',   icon: '🎖️', name: 'Discipline',       tier: 'common', desc: '+15 HP, +4 damage',            apply: s => { s.hp += 15; s.damage += 4; } },
      { id: 'crusade',  icon: '✝️', name: "Crusader's Vow",   tier: 'combo',  desc: '+25 HP, +6 damage',            apply: s => { s.hp += 25; s.damage += 6; } },
      { id: 'banner',   icon: '🚩', name: 'Royal Banner',     tier: 'rare',   desc: '+3 warriors, +10 HP each',     apply: s => { s.count += 3; s.hp += 10; } },
      { id: 'tactic',   icon: '📜', name: 'Tactician',        tier: 'rare',   desc: '+1 warrior, +5 dmg, +0.5 spd', apply: s => { s.count += 1; s.damage += 5; s.speed += 0.5; } },
    ],
  },
  dwarves: {
    id: 'dwarves', name: 'Dwarves', icon: '⛏️',
    flavor: 'Stout, slow, unbreakable.',
    base: { count: 7, hp: 170, damage: 26, speed: 5.5, range: 2.0 },
    cards: [
      { id: 'forge',    icon: '🔨', name: 'Forged Plate',     tier: 'common', desc: '+55 HP per warrior',          apply: s => { s.hp += 55; } },
      { id: 'axe',      icon: '🪓', name: 'Battle Axe',       tier: 'common', desc: '+14 attack damage',            apply: s => { s.damage += 14; } },
      { id: 'mountain', icon: '⛰️', name: 'Mountain Stance',  tier: 'combo',  desc: '+60 HP, -1.5 speed',           apply: s => { s.hp += 60; s.speed -= 1.5; } },
      { id: 'brew',     icon: '🍺', name: 'Beer & Brawn',     tier: 'common', desc: '+25 HP, +5 damage',            apply: s => { s.hp += 25; s.damage += 5; } },
      { id: 'tunneler', icon: '⛏️', name: 'Tunneler',         tier: 'common', desc: '+1 warrior, +10 HP',           apply: s => { s.count += 1; s.hp += 10; } },
      { id: 'rune',     icon: '🪨', name: 'Runic Ward',       tier: 'rare',   desc: '+30 HP, +0.4 range',           apply: s => { s.hp += 30; s.range += 0.4; } },
      { id: 'thane',    icon: '👑', name: "Thane's Wrath",    tier: 'rare',   desc: '+12 damage, +20 HP',           apply: s => { s.damage += 12; s.hp += 20; } },
    ],
  },
  elves: {
    id: 'elves', name: 'Elves', icon: '🏹',
    flavor: 'Swift, ranged, fragile.',
    base: { count: 9, hp: 80, damage: 18, speed: 9, range: 4.5 },
    cards: [
      { id: 'longbow',  icon: '🏹', name: 'Longbow',          tier: 'common', desc: '+2.5 range, +5 damage',        apply: s => { s.range += 2.5; s.damage += 5; } },
      { id: 'wind',     icon: '💨', name: 'Wind Walker',      tier: 'common', desc: '+3 movement speed',            apply: s => { s.speed += 3; } },
      { id: 'cloak',    icon: '🌿', name: 'Forest Cloak',     tier: 'common', desc: '+18 HP, +1 speed',             apply: s => { s.hp += 18; s.speed += 1; } },
      { id: 'moon',     icon: '🌙', name: 'Moonlight Arrow',  tier: 'combo',  desc: '+2 range, +9 damage',          apply: s => { s.range += 2; s.damage += 9; } },
      { id: 'sylvan',   icon: '🍃', name: 'Sylvan Pact',      tier: 'common', desc: '+2 warriors',                  apply: s => { s.count += 2; } },
      { id: 'silver',   icon: '🌟', name: 'Silver Edge',      tier: 'rare',   desc: '+13 damage, +1 range',         apply: s => { s.damage += 13; s.range += 1; } },
      { id: 'wardance', icon: '🍂', name: 'Wardance',         tier: 'rare',   desc: '+0.5 speed, +1.2 range, +6 dmg', apply: s => { s.speed += 0.5; s.range += 1.2; s.damage += 6; } },
    ],
  },
  skeletons: {
    id: 'skeletons', name: 'Skeletons', icon: '💀',
    flavor: 'Numerous, expendable, relentless.',
    base: { count: 13, hp: 55, damage: 14, speed: 7.5, range: 2.0 },
    cards: [
      { id: 'raise',    icon: '🦴', name: 'Raise Dead',       tier: 'common', desc: '+4 warriors',                  apply: s => { s.count += 4; } },
      { id: 'spear',    icon: '🗡️', name: 'Bone Spear',       tier: 'common', desc: '+0.8 range, +6 damage',        apply: s => { s.range += 0.8; s.damage += 6; } },
      { id: 'plague',   icon: '☠️', name: 'Plague Bearer',    tier: 'common', desc: '+2 warriors, +4 damage',       apply: s => { s.count += 2; s.damage += 4; } },
      { id: 'necro',    icon: '🌑', name: 'Necrotic Aura',    tier: 'combo',  desc: '+18 damage, -8 HP',            apply: s => { s.damage += 18; s.hp -= 8; } },
      { id: 'march',    icon: '👣', name: 'Death March',      tier: 'common', desc: '+2 speed, +1 warrior',         apply: s => { s.speed += 2; s.count += 1; } },
      { id: 'horde',    icon: '🪦', name: 'Shambling Horde',  tier: 'rare',   desc: '+5 warriors, -10 HP each',     apply: s => { s.count += 5; s.hp -= 10; } },
      { id: 'lich',     icon: '🔮', name: "Lich's Blessing",  tier: 'rare',   desc: '+30 HP, +12 damage',           apply: s => { s.hp += 30; s.damage += 12; } },
    ],
  },
};

export function pickThree(race, rng = Math.random) {
  const pool = (RACES[race]?.cards || RACES.humans.cards).slice();
  const out = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function showRacePicker(onPick) {
  const picker = document.getElementById('cardpicker');
  const title = document.getElementById('cardpicker-title');
  const list = document.getElementById('cards');
  title.textContent = 'Choose your race';
  list.innerHTML = '';
  for (const key of Object.keys(RACES)) {
    const r = RACES[key];
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.tier = 'rare';
    el.innerHTML = `
      <div class="icon">${r.icon}</div>
      <div class="tag">${r.id}</div>
      <div class="name">${r.name}</div>
      <div class="desc">${r.flavor}<br><br>
        ${r.base.count} warriors · ${r.base.hp} HP<br>
        ${r.base.damage} dmg · ${r.base.speed} spd · ${r.base.range} rng</div>
    `;
    el.addEventListener('click', () => { picker.classList.add('hidden'); onPick(key); });
    list.appendChild(el);
  }
  picker.classList.remove('hidden');
}

export function showCardPicker(race, round, onPick) {
  const picker = document.getElementById('cardpicker');
  const title = document.getElementById('cardpicker-title');
  const list = document.getElementById('cards');
  title.textContent = `Round ${round} cleared — ${RACES[race].name} blessing`;
  list.innerHTML = '';
  const choices = pickThree(race);
  for (const card of choices) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.tier = card.tier;
    el.innerHTML = `
      <div class="icon">${card.icon}</div>
      <div class="tag">${card.tier}</div>
      <div class="name">${card.name}</div>
      <div class="desc">${card.desc}</div>
    `;
    el.addEventListener('click', () => { picker.classList.add('hidden'); onPick(card); });
    list.appendChild(el);
  }
  picker.classList.remove('hidden');
}
