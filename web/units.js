import * as THREE from 'three';

export const MAX_HP = 100;

const TEAM_PALETTE = [
  { livery: 0x3a6dd1, accent: 0xf3c259, ring: 0x6dc2ff },
  { livery: 0xc44545, accent: 0x2a2a2a, ring: 0xff8b6b },
];

const skin = new THREE.MeshLambertMaterial({ color: 0xe6c39a });
const helmet = new THREE.MeshLambertMaterial({ color: 0xc4a14a, flatShading: true });

function makeBody(team) {
  const liveryMat = new THREE.MeshLambertMaterial({ color: team.livery });
  const accentMat = new THREE.MeshLambertMaterial({ color: team.accent });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8), liveryMat);
  torso.position.y = 1.05;
  torso.castShadow = true;

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.6, 8), accentMat);
  legs.position.y = 0.3;
  legs.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.position.y = 1.85;
  head.castShadow = true;

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 8), helmet);
  cap.position.y = 2.18;
  cap.castShadow = true;

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.55), liveryMat);
  shield.position.set(-0.55, 1.1, 0);
  shield.castShadow = true;

  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), helmet);
  sword.position.set(0.5, 1.2, 0.15);
  sword.rotation.z = -0.3;
  sword.castShadow = true;

  const g = new THREE.Group();
  g.add(legs, torso, head, cap, shield, sword);
  return g;
}

function makeRing(team) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 8, 32),
    new THREE.MeshBasicMaterial({ color: team.ring, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  return ring;
}

function makeHpBar() {
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x6ee37a })
  );
  fill.position.z = 0.001;
  const grp = new THREE.Group();
  grp.add(bg, fill);
  grp.position.y = 2.7;
  grp.userData.fill = fill;
  return grp;
}

export function makeUnit(teamIdx, x, z) {
  const team = TEAM_PALETTE[teamIdx];
  const root = new THREE.Group();
  root.position.set(x, 0, z);

  const body = makeBody(team);
  const ring = makeRing(team);
  const hp = makeHpBar();
  root.add(body, ring, hp);

  const u = {
    mesh: root,
    body,
    ring,
    hpBar: hp,
    team: teamIdx,
    teamColor: team.livery,
    hp: MAX_HP,
    x, z,
    vx: 0, vz: 0,
    moveTarget: null,
    attackTarget: null,
    selected: false,
  };
  body.traverse((m) => { if (m.isMesh) m.userData.unit = u; });
  return u;
}

export function updateUnitVisuals(u, camera, t) {
  u.mesh.position.x = u.x;
  u.mesh.position.z = u.z;

  if (u.vx !== 0 || u.vz !== 0) {
    const angle = Math.atan2(u.vx, u.vz);
    u.body.rotation.y = angle;
  }

  u.ring.visible = u.selected;
  if (u.selected) {
    const k = 1 + Math.sin(t * 4) * 0.05;
    u.ring.scale.set(k, k, k);
  }

  u.hpBar.lookAt(camera.position);
  const ratio = Math.max(0, u.hp / MAX_HP);
  u.hpBar.userData.fill.scale.x = ratio;
  u.hpBar.userData.fill.position.x = -0.58 * (1 - ratio);
  u.hpBar.userData.fill.material.color.setHex(
    ratio > 0.5 ? 0x6ee37a : ratio > 0.25 ? 0xf3c259 : 0xe36a6a
  );
  u.hpBar.visible = u.hp > 0 && u.hp < MAX_HP;
}

export function killVisuals(u) {
  u.mesh.visible = false;
}
