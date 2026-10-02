// avatar.js — procedural VOXEL WIZARD placeholder.
// Explicitly a placeholder: the real aWizard GLB is pending approval and is NOT embedded.
import * as THREE from 'three';

export function makeWizard(tint = 0xf5e6c8) {
  const g = new THREE.Group();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const bodyMat = std(tint);
  const skinMat = std(0xe8cfa8);
  const hatMat = std(0x6a3ec8);
  const darkMat = std(0x2a2138);

  const bx = (w, h, d, m, x, y, z) => {
    const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    q.position.set(x, y, z);
    g.add(q);
    return q;
  };

  // legs
  bx(0.2, 0.35, 0.24, darkMat, -0.13, 0.175, 0);
  bx(0.2, 0.35, 0.24, darkMat, 0.13, 0.175, 0);
  // blocky cream body (robe)
  bx(0.56, 0.68, 0.4, bodyMat, 0, 0.69, 0);
  // arms
  const armL = bx(0.16, 0.5, 0.18, bodyMat, -0.38, 0.75, 0);
  const armR = bx(0.16, 0.5, 0.18, bodyMat, 0.38, 0.75, 0);
  armR.rotation.x = -0.5; // raised toward staff
  // head
  bx(0.42, 0.38, 0.4, skinMat, 0, 1.22, 0);
  // eyes (dark voxels)
  bx(0.07, 0.07, 0.02, darkMat, -0.1, 1.26, 0.21);
  bx(0.07, 0.07, 0.02, darkMat, 0.1, 1.26, 0.21);
  // purple bent-tip hat: stacked offset boxes
  bx(0.5, 0.14, 0.48, hatMat, 0, 1.46, 0);        // brim
  bx(0.34, 0.2, 0.32, hatMat, 0, 1.62, 0);
  bx(0.26, 0.2, 0.26, hatMat, 0.03, 1.8, 0);
  const tip = bx(0.18, 0.22, 0.2, hatMat, 0.12, 1.98, 0); // bent tip
  tip.rotation.z = -0.5;
  const tip2 = bx(0.12, 0.16, 0.13, hatMat, 0.24, 2.02, 0);
  tip2.rotation.z = -1.0;
  // tiny staff in right hand
  bx(0.07, 1.1, 0.07, std(0x5a3a26), 0.46, 0.85, 0.18);
  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0x00d9ff })
  );
  orb.position.set(0.46, 1.45, 0.18);
  g.add(orb);

  g.userData.orb = orb;
  return g;
}

export function makeNameSprite(name) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g2 = c.getContext('2d');
  g2.font = '700 34px system-ui, sans-serif';
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.lineWidth = 6; g2.strokeStyle = 'rgba(4,6,14,0.9)';
  g2.strokeText(name, 128, 34);
  g2.fillStyle = '#eaf6ff';
  g2.fillText(name, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(2.4, 0.6, 1);
  s.position.y = 2.45;
  return s;
}
