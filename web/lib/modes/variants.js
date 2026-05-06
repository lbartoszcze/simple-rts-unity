const VARIANTS = {
  humans: [
    { id: 'h_pegasus',  kind: 'recruit', klass: 'flyer',   icon: '🦄', name: 'Pegasus Knights', tier: 'rare',   desc: '+1 heavy flying knight — armored hover', amount: 1, klassOverride: { hpMul: 1.0, range: 4.5, swing: 0.8 } },
  ],
  dwarves: [
    { id: 'd_boar',     kind: 'recruit', klass: 'cavalry', icon: '🐗', name: 'Boar Riders',     tier: 'common', desc: '+1 boar-mounted dwarf — slow but tanky', amount: 1, klassOverride: { speed: 8, hpMul: 1.9, dmgMul: 1.5, swing: 1.0 } },
    { id: 'd_bear',     kind: 'recruit', klass: 'beast',   icon: '🐻', name: 'Cave Bear',        tier: 'rare',   desc: '+1 huge slow bear — 2.6x HP, 1.7x dmg',   amount: 1, klassOverride: { hpMul: 2.6, dmgMul: 1.7, swing: 1.4 } },
  ],
  elves: [
    { id: 'e_stag',     kind: 'recruit', klass: 'cavalry', icon: '🦌', name: 'Stag Riders',      tier: 'rare',   desc: '+1 stag-mounted skirmisher — fast, ranged', amount: 1, klassOverride: { speed: 13, hpMul: 1.0, range: 3.0 } },
  ],
  skeletons: [
    { id: 's_dknight',  kind: 'recruit', klass: 'cavalry', icon: '☠️', name: 'Death Knight',     tier: 'rare',   desc: '+1 skeletal cavalry — 1.7x HP, 1.7x dmg',  amount: 1, klassOverride: { hpMul: 1.7, dmgMul: 1.7 } },
  ],
};

export function registerVariants(RACES) {
  for (const race of Object.keys(VARIANTS)) {
    if (!RACES[race]) continue;
    for (const card of VARIANTS[race]) RACES[race].cards.push(card);
  }
}
