import { RACES, KLASS } from '../cards.js';

const CLASSES = [
  { id: 'infantry', icon: '⚔️', label: 'Infantry', def: { p: 6, e: 6 } },
  { id: 'archer',   icon: '🏹', label: 'Archer',   def: { p: 2, e: 2 } },
  { id: 'mage',     icon: '🔮', label: 'Mage',     def: { p: 0, e: 0 } },
  { id: 'cavalry',  icon: '🐎', label: 'Cavalry',  def: { p: 0, e: 0 } },
  { id: 'flyer',    icon: '🦇', label: 'Flyer',    def: { p: 0, e: 0 } },
  { id: 'beast',    icon: '🐗', label: 'Beast',    def: { p: 0, e: 0 } },
];

function buildRoster(race, comp) {
  const base = RACES[race].base;
  const out = [];
  for (const klass of Object.keys(comp)) {
    const k = KLASS[klass] || KLASS.infantry;
    const count = comp[klass] | 0;
    for (let i = 0; i < count; i++) {
      const maxHp = Math.round(base.hp * k.hpMul);
      out.push({
        maxHp, currentHp: maxHp,
        damage: Math.round(base.damage * k.dmgMul),
        speed: k.speed ?? base.speed,
        range: k.range ?? base.range,
        klass, swingPeriod: k.swing, hoverY: k.y || 0,
        armorTier: 0, weaponTier: 0,
      });
    }
  }
  return out;
}

function buildSide(side, label) {
  const races = Object.keys(RACES).map(r =>
    `<option value="${r}">${RACES[r].icon} ${RACES[r].name}</option>`).join('');
  const rows = CLASSES.map(c =>
    `<label><span>${c.icon} ${c.label}</span>
       <input type="number" min="0" max="20" value="${c.def[side]}" data-side="${side}" data-klass="${c.id}"></label>`
  ).join('');
  return `<div class="sandbox-side">
    <h3>${label}</h3>
    <select data-side="${side}-race">${races}</select>
    <div class="sandbox-cls">${rows}</div>
  </div>`;
}

function readComp(side) {
  const out = {};
  for (const c of CLASSES) {
    const inp = document.querySelector(`input[data-side="${side}"][data-klass="${c.id}"]`);
    out[c.id] = Math.max(0, Math.min(20, parseInt(inp.value, 10) || 0));
  }
  return out;
}

export function showSandboxBuilder(onStart, onCancel) {
  const modal = document.getElementById('sandbox');
  modal.innerHTML = `
    <div class="sandbox-content">
      <h2>Sandbox — Custom Clash</h2>
      <p class="sandbox-hint">Pick races and per-class counts. No XP, no cards — just instant fights for testing.</p>
      <div class="sandbox-cols">
        ${buildSide('p', '👑 Your army')}
        ${buildSide('e', '💀 Enemy army')}
      </div>
      <div class="sandbox-buttons">
        <button id="sb-fight">⚔️ Fight</button>
        <button id="sb-cancel">Cancel</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  document.getElementById('sb-fight').addEventListener('click', () => {
    const prace = document.querySelector('[data-side="p-race"]').value;
    const erace = document.querySelector('[data-side="e-race"]').value;
    const proster = buildRoster(prace, readComp('p'));
    const eroster = buildRoster(erace, readComp('e'));
    if (!proster.length || !eroster.length) return;
    modal.classList.add('hidden');
    onStart(prace, proster, erace, eroster);
  });
  document.getElementById('sb-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
    onCancel();
  });
}

export function showSandboxResult(won, onAgain, onExit) {
  const banner = document.getElementById('banner');
  banner.innerHTML = `${won ? 'Victory' : 'Defeat'}<small>Sandbox match — no XP awarded</small>
    <button id="sb-again">Refight / Tweak</button>
    <button id="sb-exit">Exit Sandbox</button>`;
  banner.className = won ? 'win' : 'lose';
  banner.classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('sb-again').addEventListener('click', () => {
      banner.classList.add('hidden'); onAgain();
    });
    document.getElementById('sb-exit').addEventListener('click', () => {
      banner.classList.add('hidden'); onExit();
    });
  }, 0);
}
