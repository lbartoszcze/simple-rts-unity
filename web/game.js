"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const banner = document.getElementById("banner");

const W = canvas.width;
const H = canvas.height;

const UNIT_R = 14;
const UNIT_SPEED = 90;
const ATTACK_RANGE = 28;
const ATTACK_DPS = 12;
const MAX_HP = 100;
const SPACING = 38;

const TEAM_BLUE = 0;
const TEAM_RED = 1;

function makeUnit(team, x, y) {
  return {
    team, x, y,
    vx: 0, vy: 0,
    hp: MAX_HP,
    selected: false,
    moveTarget: null,
    attackTarget: null,
  };
}

const units = [];
function spawnArmy() {
  units.length = 0;
  const blueCols = 4, blueRows = 2;
  for (let r = 0; r < blueRows; r++)
    for (let c = 0; c < blueCols; c++)
      units.push(makeUnit(TEAM_BLUE, 120 + c * SPACING, H - 120 + r * SPACING));
  const redCols = 4, redRows = 2;
  for (let r = 0; r < redRows; r++)
    for (let c = 0; c < redCols; c++)
      units.push(makeUnit(TEAM_RED, W - 240 + c * SPACING, 80 + r * SPACING));
}
spawnArmy();

let drag = null;
let mouse = { x: 0, y: 0 };

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("mousedown", (e) => {
  const p = canvasPos(e);
  if (e.button === 0) {
    drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  } else if (e.button === 2) {
    issueOrder(p);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const p = canvasPos(e);
  mouse = p;
  if (drag) { drag.x1 = p.x; drag.y1 = p.y; }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !drag) return;
  finalizeSelection();
  drag = null;
});

function finalizeSelection() {
  const dx = drag.x1 - drag.x0;
  const dy = drag.y1 - drag.y0;
  const isClick = dx * dx + dy * dy < 25;
  for (const u of units) u.selected = false;
  if (isClick) {
    let best = null, bestD = 1e9;
    for (const u of units) {
      if (u.team !== TEAM_BLUE || u.hp <= 0) continue;
      const d = (u.x - drag.x1) ** 2 + (u.y - drag.y1) ** 2;
      if (d < bestD && d < (UNIT_R + 6) ** 2) { best = u; bestD = d; }
    }
    if (best) best.selected = true;
    return;
  }
  const xMin = Math.min(drag.x0, drag.x1);
  const yMin = Math.min(drag.y0, drag.y1);
  const xMax = Math.max(drag.x0, drag.x1);
  const yMax = Math.max(drag.y0, drag.y1);
  for (const u of units) {
    if (u.team !== TEAM_BLUE || u.hp <= 0) continue;
    if (u.x >= xMin && u.x <= xMax && u.y >= yMin && u.y <= yMax)
      u.selected = true;
  }
}

function issueOrder(p) {
  const selected = units.filter(u => u.selected && u.hp > 0);
  if (selected.length === 0) return;
  let target = null, bestD = (UNIT_R + 4) ** 2;
  for (const u of units) {
    if (u.team !== TEAM_RED || u.hp <= 0) continue;
    const d = (u.x - p.x) ** 2 + (u.y - p.y) ** 2;
    if (d < bestD) { target = u; bestD = d; }
  }
  if (target) {
    for (const u of selected) { u.attackTarget = target; u.moveTarget = null; }
    return;
  }
  const cols = Math.ceil(Math.sqrt(selected.length));
  const cx = selected.reduce((s, u) => s + u.x, 0) / selected.length;
  const cy = selected.reduce((s, u) => s + u.y, 0) / selected.length;
  const fx = p.x - cx, fy = p.y - cy;
  const flen = Math.hypot(fx, fy) || 1;
  const fwd = { x: fx / flen, y: fy / flen };
  const right = { x: -fwd.y, y: fwd.x };
  selected.forEach((u, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const ox = (col - (cols - 1) * 0.5) * 32;
    const oz = -row * 32;
    u.moveTarget = {
      x: p.x + right.x * ox + fwd.x * oz,
      y: p.y + right.y * ox + fwd.y * oz,
    };
    u.attackTarget = null;
  });
}

function nearestEnemy(u) {
  let best = null, bestD = 1e9;
  for (const v of units) {
    if (v.team === u.team || v.hp <= 0) continue;
    const d = (u.x - v.x) ** 2 + (u.y - v.y) ** 2;
    if (d < bestD) { best = v; bestD = d; }
  }
  return { unit: best, d2: bestD };
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  requestAnimationFrame(tick);
}

function step(dt) {
  for (const u of units) {
    if (u.hp <= 0) continue;
    if (!u.attackTarget || u.attackTarget.hp <= 0) {
      const ne = nearestEnemy(u);
      if (ne.unit && ne.d2 < 200 * 200) u.attackTarget = ne.unit;
      else u.attackTarget = null;
    }
    let targetX = null, targetY = null;
    if (u.attackTarget && u.attackTarget.hp > 0) {
      targetX = u.attackTarget.x;
      targetY = u.attackTarget.y;
    } else if (u.moveTarget) {
      targetX = u.moveTarget.x;
      targetY = u.moveTarget.y;
    }
    if (targetX !== null) {
      const dx = targetX - u.x, dy = targetY - u.y;
      const dist = Math.hypot(dx, dy);
      if (u.attackTarget && dist < ATTACK_RANGE) {
        u.vx = 0; u.vy = 0;
        u.attackTarget.hp -= ATTACK_DPS * dt;
      } else if (dist > 1.5) {
        u.vx = (dx / dist) * UNIT_SPEED;
        u.vy = (dy / dist) * UNIT_SPEED;
      } else {
        u.vx = 0; u.vy = 0;
        if (!u.attackTarget) u.moveTarget = null;
      }
    } else { u.vx = 0; u.vy = 0; }
    u.x += u.vx * dt;
    u.y += u.vy * dt;
  }
  separate();
  let blue = 0, red = 0;
  for (const u of units) { if (u.hp > 0) (u.team === TEAM_BLUE ? blue++ : red++); }
  if (red === 0) showBanner("Victory", "win");
  else if (blue === 0) showBanner("Defeat", "lose");
}

function separate() {
  for (let i = 0; i < units.length; i++) {
    const a = units[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j]; if (b.hp <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = UNIT_R * 2;
      if (d > 0 && d < minD) {
        const push = (minD - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
    a.x = Math.max(UNIT_R, Math.min(W - UNIT_R, a.x));
    a.y = Math.max(UNIT_R, Math.min(H - UNIT_R, a.y));
  }
}

function draw() {
  ctx.fillStyle = "#2a3a2a";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (const u of units) {
    if (u.hp <= 0) continue;
    if (u.selected) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, UNIT_R + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#4f9dff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(u.x, u.y, UNIT_R, 0, Math.PI * 2);
    ctx.fillStyle = u.team === TEAM_BLUE ? "#4f9dff" : "#ff6b6b";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const hpW = 28, hpH = 4;
    const hpX = u.x - hpW / 2;
    const hpY = u.y - UNIT_R - 10;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2);
    ctx.fillStyle = u.team === TEAM_BLUE ? "#6ee37a" : "#ff9a6b";
    ctx.fillRect(hpX, hpY, hpW * (u.hp / MAX_HP), hpH);
  }
  if (drag) {
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    ctx.fillStyle = "rgba(79,157,255,0.10)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(79,157,255,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}

let bannerShown = false;
function showBanner(text, cls) {
  if (bannerShown) return;
  bannerShown = true;
  banner.textContent = text;
  banner.innerHTML = text + '<small>Refresh the page to play again</small>';
  banner.className = cls;
  banner.classList.remove("hidden");
}

requestAnimationFrame((t) => { last = t; tick(t); });
