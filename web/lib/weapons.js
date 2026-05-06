import * as THREE from 'three';

const lambert = (color, flat = false) => new THREE.MeshLambertMaterial({ color, flatShading: flat });
const basic = (color) => new THREE.MeshBasicMaterial({ color });

export function buildWeaponArm(team, raceKey, helmetMat) {
  const liveryMat = lambert(team.livery);
  const arm = new THREE.Group();
  arm.position.set(0.50, 1.65, 0);
  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.12, 0.50, 6), liveryMat);
  upper.position.set(-0.05, -0.35, 0); upper.castShadow = true;
  arm.add(upper);
  if (raceKey === 'humans') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.05), lambert(0xc8c8c8, true));
    blade.position.set(0.12, -0.10, 0.15); blade.rotation.z = -0.22;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), helmetMat);
    cross.position.set(0.05, -0.49, 0.15); cross.rotation.z = -0.22;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), lambert(0x3a2a1a));
    hilt.position.set(0.02, -0.60, 0.15); hilt.rotation.z = -0.22;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), helmetMat);
    pommel.position.set(-0.01, -0.69, 0.15);
    blade.castShadow = true; cross.castShadow = true; hilt.castShadow = true;
    arm.add(blade, cross, hilt, pommel);
  } else if (raceKey === 'dwarves') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), lambert(0x3a2a1a));
    handle.position.set(0.08, -0.45, 0.15); handle.rotation.z = -0.18;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), lambert(0x707378, true));
    head.position.set(0.16, 0.0, 0.15); head.rotation.z = -0.18;
    handle.castShadow = true; head.castShadow = true;
    arm.add(handle, head);
  } else if (raceKey === 'elves') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16, Math.PI), lambert(0x6b4423));
    bow.position.set(0.05, -0.35, 0.15); bow.rotation.z = -Math.PI / 2;
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.88, 0.02), basic(0xfaf6e0));
    string.position.set(0.0, -0.35, 0.15);
    bow.castShadow = true;
    arm.add(bow, string);
  } else if (raceKey === 'skeletons') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.30, 6), lambert(0x3a2a1a));
    pole.position.set(0.05, -0.25, 0.15); pole.rotation.z = -0.10;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.05), lambert(0xc8c8c8, true));
    blade.position.set(0.35, 0.35, 0.15); blade.rotation.z = -0.45;
    pole.castShadow = true; blade.castShadow = true;
    arm.add(pole, blade);
  }
  return arm;
}
