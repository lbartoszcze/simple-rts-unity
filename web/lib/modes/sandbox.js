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

function readSetup() {
  return {
    player: { race: document.querySelector('[data-side="p-race"]').value, ...readComp('p') },
    enemy:  { race: document.querySelector('[data-side="e-race"]').value, ...readComp('e') },
  };
}

function applySetup(s) {
  for (const side of ['player', 'enemy']) {
    const data = s[side]; if (!data) continue;
    const code = side === 'player' ? 'p' : 'e';
    if (data.race) document.querySelector(`[data-side="${code}-race"]`).value = data.race;
    for (const c of CLASSES) {
      if (data[c.id] != null) {
        const inp = document.querySelector(`input[data-side="${code}"][data-klass="${c.id}"]`);
        if (inp) inp.value = data[c.id];
      }
    }
  }
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
      <details class="sandbox-json"><summary>JSON setup (paste / copy)</summary>
        <textarea id="sb-json" rows="6" placeholder='{"player":{"race":"humans","infantry":4,"archer":2,"cavalry":1},"enemy":{"race":"skeletons","infantry":8,"flyer":2}}'></textarea>
        <div class="sandbox-json-buttons">
          <button id="sb-load" type="button">Apply JSON</button>
          <button id="sb-export" type="button">Copy current → JSON</button>
        </div>
      </details>
      <div class="sandbox-buttons">
        <button id="sb-fight">⚔️ Fight</button>
        <button id="sb-cancel">Cancel</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  const ta = document.getElementById('sb-json');
  document.getElementById('sb-load').addEventListener('click', () => {
    try { applySetup(JSON.parse(ta.value)); ta.style.borderColor = ''; }
    catch (e) { ta.style.borderColor = '#e36a6a'; }
  });
  document.getElementById('sb-export').addEventListener('click', () => {
    ta.value = JSON.stringify(readSetup(), null, 2);
  });
  try {
    const m = location.hash.match(/[#&]sb=([^&]+)/);
    if (m) applySetup(JSON.parse(decodeURIComponent(m[1])));
  } catch (e) {}
  document.getElementById('sb-fight').addEventListener('click', () => {
    const prace = document.querySelector('[data-side="p-race"]').value;
    const erace = document.querySelector('[data-side="e-race"]').value;
    const proster = buildRoster(prace, readComp('p'));
    const eroster = buildRoster(erace, readComp('e'));
    if (!proster.length || !eroster.length) {
      const btn = document.getElementById('sb-fight');
      const orig = btn.textContent;
      btn.style.background = '#e36a6a'; btn.style.color = '#fff';
      btn.textContent = !proster.length && !eroster.length ? 'Both sides empty'
        : !proster.length ? 'Your army is empty' : 'Enemy army is empty';
      setTimeout(() => { btn.style.background = ''; btn.style.color = ''; btn.textContent = orig; }, 1500);
      return;
    }
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
