export const RACES = {
  humans: {
    id: 'humans', name: 'Humans', icon: '👑',
    flavor: 'Disciplined, balanced, versatile.',
    base: { count: 8, hp: 110, damage: 22, speed: 7, range: 2.4 },
    cards: [
      { id: 'h_iron',    kind: 'armor',   icon: '🛡️', name: 'Iron Plate',       tier: 'common', desc: '+25 max HP per warrior',                   hp: 25 },
      { id: 'h_tower',   kind: 'armor',   icon: '🪙', name: 'Tower Shield',     tier: 'combo',  desc: '+45 max HP, -0.5 speed',                    hp: 45, speedDelta: -0.5 },
      { id: 'h_blade',   kind: 'weapon',  icon: '⚔️', name: 'Sharpened Blades', tier: 'common', desc: '+7 attack damage',                           damage: 7 },
      { id: 'h_crus',    kind: 'weapon',  icon: '🗡️', name: 'Crusader Sword',   tier: 'combo',  desc: '+10 damage, +0.5 range',                     damage: 10, range: 0.5 },
      { id: 'h_consc',   kind: 'recruit', icon: '🪖', name: 'Conscription',     tier: 'common', desc: '+2 standard warriors',                       amount: 2 },
      { id: 'h_knight',  kind: 'recruit', icon: '🏰', name: 'Knight Order',     tier: 'rare',   desc: '+1 elite warrior (1.5x stats)',              amount: 1, mult: 1.5 },
      { id: 'h_holy',    kind: 'spell',   icon: '✨', name: 'Holy Light',       tier: 'rare',   desc: 'Spell — fully heal your army at battle start', spell: { id: 'heal_full', icon: '✨', name: 'Holy Light' } },
      { id: 'h_banner',  kind: 'spell',   icon: '🎆', name: 'Battle Banner',    tier: 'combo',  desc: 'Spell — one fireball, 45 AoE damage',          spell: { id: 'fireball', icon: '🎆', name: 'Battle Banner', dmg: 45, radius: 8 } },
      { id: 'h_fire',    kind: 'building', icon: '🔥', name: 'Fireplace',        tier: 'rare',   desc: 'Building — +15% extra heal between rounds',     building: 'fireplace' },
      { id: 'h_tower',   kind: 'building', icon: '🗼', name: 'Watchtower',       tier: 'rare',   desc: 'Building — +1 damage every round',              building: 'watchtower' },
    ],
  },
  dwarves: {
    id: 'dwarves', name: 'Dwarves', icon: '⛏️',
    flavor: 'Stout, slow, unbreakable.',
    base: { count: 7, hp: 170, damage: 26, speed: 5.5, range: 2.0 },
    cards: [
      { id: 'd_forge',   kind: 'armor',   icon: '🔨', name: 'Forged Plate',     tier: 'common', desc: '+50 max HP per warrior',                     hp: 50 },
      { id: 'd_mount',   kind: 'armor',   icon: '⛰️', name: 'Mountain Stance',  tier: 'combo',  desc: '+65 max HP, -1 speed',                       hp: 65, speedDelta: -1 },
      { id: 'd_axe',     kind: 'weapon',  icon: '🪓', name: 'Battle Axe',       tier: 'common', desc: '+12 attack damage',                           damage: 12 },
      { id: 'd_hammer',  kind: 'weapon',  icon: '🔨', name: 'Throwing Hammer',  tier: 'combo',  desc: '+8 damage, +0.8 range',                       damage: 8, range: 0.8 },
      { id: 'd_tunnel',  kind: 'recruit', icon: '⛏️', name: 'Tunneler',         tier: 'common', desc: '+1 warrior with +20 HP',                      amount: 1, hpBonus: 20 },
      { id: 'd_clan',    kind: 'recruit', icon: '🍺', name: 'Clan Muster',      tier: 'common', desc: '+2 standard warriors',                       amount: 2 },
      { id: 'd_quake',   kind: 'spell',   icon: '🌋', name: 'Earthquake',       tier: 'rare',   desc: 'Spell — 60 AoE damage at battle start',        spell: { id: 'fireball', icon: '🌋', name: 'Earthquake', dmg: 60, radius: 10 } },
      { id: 'd_brew',    kind: 'spell',   icon: '🍺', name: "Brewmaster's Toast", tier: 'combo', desc: 'Spell — heal your army for 75% of max HP',     spell: { id: 'heal_pct', icon: '🍺', name: "Brewmaster's Toast", pct: 0.75 } },
      { id: 'd_forge',   kind: 'building', icon: '🛠️', name: 'Forge',           tier: 'rare',   desc: 'Building — +2 damage every round',              building: 'forge' },
      { id: 'd_mine',    kind: 'building', icon: '⛏️', name: 'Mine',            tier: 'rare',   desc: 'Building — +1 fresh dwarf every 2 rounds',      building: 'mine' },
    ],
  },
  elves: {
    id: 'elves', name: 'Elves', icon: '🏹',
    flavor: 'Swift, ranged, fragile.',
    base: { count: 9, hp: 80, damage: 18, speed: 9, range: 4.5 },
    cards: [
      { id: 'e_cloak',   kind: 'armor',   icon: '🌿', name: 'Forest Cloak',     tier: 'common', desc: '+18 max HP, +0.8 speed',                     hp: 18, speedDelta: 0.8 },
      { id: 'e_moon',    kind: 'armor',   icon: '🌙', name: 'Moonweave',        tier: 'combo',  desc: '+25 max HP, +0.4 range',                     hp: 25, range: 0.4 },
      { id: 'e_bow',     kind: 'weapon',  icon: '🏹', name: 'Longbow',          tier: 'common', desc: '+2 range, +4 damage',                         damage: 4, range: 2.0 },
      { id: 'e_silver',  kind: 'weapon',  icon: '🌟', name: 'Silver Edge',      tier: 'combo',  desc: '+11 damage',                                  damage: 11 },
      { id: 'e_pact',    kind: 'recruit', icon: '🍃', name: 'Sylvan Pact',      tier: 'common', desc: '+2 standard warriors',                       amount: 2 },
      { id: 'e_ranger',  kind: 'recruit', icon: '🎯', name: 'Ranger Captain',   tier: 'rare',   desc: '+1 elite ranger (1.5x stats)',                amount: 1, mult: 1.5 },
      { id: 'e_volley',  kind: 'spell',   icon: '🏹', name: 'Volley',           tier: 'combo',  desc: 'Spell — 35 damage to every enemy at battle start', spell: { id: 'all_enemies', icon: '🏹', name: 'Volley', dmg: 35 } },
      { id: 'e_spring',  kind: 'spell',   icon: '💧', name: 'Healing Spring',   tier: 'rare',   desc: 'Spell — fully heal your army at battle start', spell: { id: 'heal_full', icon: '💧', name: 'Healing Spring' } },
      { id: 'e_grove',   kind: 'building', icon: '🌳', name: 'Grove',           tier: 'rare',   desc: 'Building — +6 max HP every round, also heals',  building: 'grove' },
      { id: 'e_wood',    kind: 'building', icon: '🌲', name: 'Watchwood',        tier: 'rare',   desc: 'Building — +0.15 attack range every round',     building: 'watchwood' },
    ],
  },
  skeletons: {
    id: 'skeletons', name: 'Skeletons', icon: '💀',
    flavor: 'Numerous, expendable, relentless.',
    base: { count: 13, hp: 55, damage: 14, speed: 7.5, range: 2.0 },
    cards: [
      { id: 's_bone',    kind: 'armor',   icon: '🦴', name: 'Bone Wards',       tier: 'common', desc: '+30 max HP per warrior',                     hp: 30 },
      { id: 's_tomb',    kind: 'armor',   icon: '🪦', name: 'Tomb Wraps',       tier: 'combo',  desc: '+40 max HP, -1 speed',                       hp: 40, speedDelta: -1 },
      { id: 's_spear',   kind: 'weapon',  icon: '🗡️', name: 'Bone Spear',       tier: 'common', desc: '+5 damage, +0.7 range',                       damage: 5, range: 0.7 },
      { id: 's_cursed',  kind: 'weapon',  icon: '⚫', name: 'Cursed Steel',     tier: 'combo',  desc: '+11 damage',                                  damage: 11 },
      { id: 's_raise',   kind: 'recruit', icon: '🪦', name: 'Raise Dead',       tier: 'common', desc: '+4 standard warriors',                        amount: 4 },
      { id: 's_plague',  kind: 'recruit', icon: '☠️', name: 'Plague Bearer',    tier: 'combo',  desc: '+2 warriors with +4 damage',                  amount: 2, dmgBonus: 4 },
      { id: 's_wave',    kind: 'spell',   icon: '🌑', name: 'Death Wave',       tier: 'rare',   desc: 'Spell — 55 AoE damage at battle start',        spell: { id: 'fireball', icon: '🌑', name: 'Death Wave', dmg: 55, radius: 12 } },
      { id: 's_drain',   kind: 'spell',   icon: '🔮', name: 'Soul Drain',       tier: 'combo',  desc: 'Spell — instantly kill the 3 weakest enemies', spell: { id: 'soul_drain', icon: '🔮', name: 'Soul Drain', count: 3 } },
      { id: 's_yard',    kind: 'building', icon: '🪦', name: 'Boneyard',        tier: 'rare',   desc: 'Building — +1 fresh skeleton every round',      building: 'boneyard' },
      { id: 's_crypt',   kind: 'building', icon: '⚰️', name: 'Crypt',           tier: 'rare',   desc: 'Building — +5% damage every round',             building: 'crypt' },
    ],
  },
};

export function applyCard(card, roster, spells, race, buildings) {
  const base = RACES[race].base;
  if (card.kind === 'armor') {
    for (const w of roster) {
      const bonus = card.hp || 0;
      w.maxHp += bonus;
      w.currentHp = Math.min(w.maxHp, w.currentHp + bonus);
      if (card.speedDelta) w.speed = Math.max(2, w.speed + card.speedDelta);
      if (card.range)      w.range += card.range;
    }
  } else if (card.kind === 'weapon') {
    for (const w of roster) {
      if (card.damage) w.damage += card.damage;
      if (card.range)  w.range  += card.range;
    }
  } else if (card.kind === 'recruit') {
    const mult = card.mult || 1;
    const hpBonus = card.hpBonus || 0;
    const dmgBonus = card.dmgBonus || 0;
    for (let i = 0; i < (card.amount || 1); i++) {
      const maxHp = Math.round(base.hp * mult + hpBonus);
      roster.push({
        maxHp,
        currentHp: maxHp,
        damage: Math.round(base.damage * mult + dmgBonus),
        speed: base.speed * mult,
        range: base.range,
      });
    }
  } else if (card.kind === 'spell') {
    spells.push({ ...card.spell });
  } else if (card.kind === 'building') {
    buildings.push({ id: card.building, name: card.name, icon: card.icon });
  }
}

const META_KEY = 'simple-rts-meta-v1';
const RACE_COST = { humans: 0, dwarves: 8, elves: 18, skeletons: 32 };

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw);
      m.unlocked = m.unlocked || ['humans'];
      m.best = m.best || {};
      m.gold = m.gold || 0;
      m.lifetimeGold = m.lifetimeGold || 0;
      m.runs = m.runs || 0;
      return m;
    }
  } catch (e) {}
  return { gold: 0, lifetimeGold: 0, unlocked: ['humans'], best: {}, runs: 0 };
}

export function saveMeta(m) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
}

export function awardGold(meta, round, isBoss) {
  const earned = isBoss ? 5 : 1;
  meta.gold += earned;
  meta.lifetimeGold += earned;
  return earned;
}

export function recordRunEnd(meta, race, round) {
  meta.runs += 1;
  if (!meta.best[race] || round > meta.best[race]) meta.best[race] = round;
}

export function unlockCost(race) { return RACE_COST[race] || 0; }
export function isUnlocked(meta, race) { return meta.unlocked.includes(race); }
export function tryUnlock(meta, race) {
  const cost = unlockCost(race);
  if (isUnlocked(meta, race) || meta.gold < cost) return false;
  meta.gold -= cost;
  meta.unlocked.push(race);
  return true;
}

export function pickThree(race, rng = Math.random) {
  const pool = RACES[race].cards.slice();
  const out = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function showRacePicker(meta, onPick, onMetaChange) {
  const picker = document.getElementById('cardpicker');
  const title = document.getElementById('cardpicker-title');
  const list = document.getElementById('cards');
  title.innerHTML = `Choose your race <small style="font-weight:400;color:#a3a99a;font-size:14px;letter-spacing:0;">${meta.gold} 🪙 · ${meta.runs} runs</small>`;
  list.innerHTML = '';
  for (const key of Object.keys(RACES)) {
    const r = RACES[key];
    const unlocked = isUnlocked(meta, key);
    const cost = unlockCost(key);
    const best = meta.best[key] || 0;
    const el = document.createElement('div');
    el.className = 'card' + (unlocked ? '' : ' locked');
    el.dataset.tier = 'rare';
    el.innerHTML = `
      <div class="icon">${r.icon}</div>
      <div class="tag">${r.id}${best ? ' · best R' + best : ''}</div>
      <div class="name">${r.name}</div>
      <div class="desc">${r.flavor}<br><br>
        ${r.base.count} warriors · ${r.base.hp} HP<br>
        ${r.base.damage} dmg · ${r.base.speed} spd · ${r.base.range} rng
        ${unlocked ? '' : `<br><br><b style="color:#f3c259;">🔒 ${cost} 🪙 to unlock</b>`}</div>
    `;
    el.addEventListener('click', () => {
      if (!unlocked) {
        if (!tryUnlock(meta, key)) return;
        if (onMetaChange) onMetaChange();
        showRacePicker(meta, onPick, onMetaChange);
        return;
      }
      picker.classList.add('hidden');
      onPick(key);
    });
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
    el.dataset.kind = card.kind;
    el.innerHTML = `
      <div class="icon">${card.icon}</div>
      <div class="tag">${card.kind} · ${card.tier}</div>
      <div class="name">${card.name}</div>
      <div class="desc">${card.desc}</div>
    `;
    el.addEventListener('click', () => { picker.classList.add('hidden'); onPick(card); });
    list.appendChild(el);
  }
  picker.classList.remove('hidden');
}
