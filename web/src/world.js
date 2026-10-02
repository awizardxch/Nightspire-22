// world.js — procedural Nightspire-22 scene: tower, town, lake, sky.
// ALL geometry is generated in code. No external assets.
import * as THREE from 'three';

export const PAL = {
  bg: 0x060810, bg2: 0x0a0c18, cyan: 0x00d9ff, orange: 0xff6600, purple: 0x1a082b,
};

function canvasTex(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// deterministic pseudo-random for rune glyphs
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const runeTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#07141c'; g.fillRect(0, 0, w, h);
  const rnd = mulberry32(1337);
  g.strokeStyle = '#00d9ff'; g.lineWidth = 2.5;
  g.shadowColor = '#00d9ff'; g.shadowBlur = 8;
  for (let i = 0; i < 42; i++) {
    const x = 14 + rnd() * (w - 28), y = 14 + rnd() * (h - 28), s = 6 + rnd() * 10;
    const k = Math.floor(rnd() * 4);
    g.beginPath();
    if (k === 0) { g.moveTo(x - s / 2, y); g.lineTo(x + s / 2, y); g.moveTo(x, y - s / 2); g.lineTo(x, y + s / 2); }
    else if (k === 1) { g.arc(x, y, s / 2, 0, Math.PI * 2); }
    else if (k === 2) { g.moveTo(x - s / 2, y + s / 2); g.lineTo(x + s / 2, y - s / 2); g.moveTo(x - s / 2, y - s / 2); g.lineTo(x + s / 2, y + s / 2); }
    else { g.moveTo(x - s / 2, y - s / 2); g.lineTo(x + s / 2, y - s / 2); g.lineTo(x, y + s / 2); g.closePath(); }
    g.stroke();
  }
});

const awningTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#2b1c46' : '#150f26';
    g.fillRect((i * w) / 8, 0, w / 8, h);
  }
  g.fillStyle = 'rgba(0,217,255,0.85)'; g.fillRect(0, h - 10, w, 10);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, w, 14);
});
awningTex.wrapS = awningTex.wrapT = THREE.RepeatWrapping;

const signTex = canvasTex(1024, 160, (g, w, h) => {
  g.fillStyle = '#0c0f22'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#00d9ff'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
  g.font = '800 84px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#00d9ff'; g.shadowBlur = 22;
  g.fillStyle = '#eaf6ff';
  g.fillText('Panda Park · LOT-22', w / 2, h / 2 + 4);
});

function slipTex(text) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 18);
    g.fillStyle = '#3a2c1a'; g.font = '700 40px ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 6);
    g.strokeStyle = '#8a7a5a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
  });
}

const groundTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#0b0d16'; g.fillRect(0, 0, w, h);
  const rnd = mulberry32(42);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.02})`;
    g.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  g.strokeStyle = '#161b2e'; g.lineWidth = 2;
  g.strokeRect(0, 0, w, h);
});
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(28, 28);

// ---------------------------------------------------------------------------
// Ember particle system (THREE.Points, additive)
function makeEmbers({ count, x, z, y0, y1, spread, color, size, rise }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  const rnd = mulberry32(count * 7 + x);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = x + (rnd() - 0.5) * spread;
    pos[i * 3 + 1] = y0 + rnd() * (y1 - y0);
    pos[i * 3 + 2] = z + (rnd() - 0.5) * spread;
    spd[i] = rise * (0.6 + rnd() * 0.8);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return {
    pts,
    tick(dt, t) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] += spd[i] * dt;
        p[i * 3] += Math.sin(t * 3 + i) * 0.15 * dt;
        if (p[i * 3 + 1] > y1) {
          p[i * 3 + 1] = y0;
          p[i * 3] = x + (Math.random() - 0.5) * spread;
          p[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------------------
export function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.bg);
  scene.fog = new THREE.FogExp2(PAL.purple, 0.011);

  const colliders = [];
  const solid = (x0, y0, z0, x1, y1, z1) => colliders.push({ x0, y0, z0, x1, y1, z1 });

  const std = (color, o = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05, ...o });
  const glow = (color) => new THREE.MeshBasicMaterial({ color });

  const group = new THREE.Group();
  scene.add(group);

  // box helper: w,h,d centered at (x, y+h/2? no—) → place by center
  function box(w, h, d, material, x, y, z, collide = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    group.add(m);
    if (collide) solid(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
    return m;
  }
  function plane(w, h, material, x, y, z, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    group.add(m);
    return m;
  }

  // ================= LIGHTS =================
  scene.add(new THREE.HemisphereLight(0x2a3a5f, 0x0a0c18, 0.6));
  const moonLight = new THREE.DirectionalLight(0xb8c8ff, 0.55);
  moonLight.position.set(30, 42, 120);
  scene.add(moonLight);
  const p = (color, intensity, dist, x, y, z) => {
    const l = new THREE.PointLight(color, intensity, dist, 1.6);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };

  // ================= SKY =================
  {
    const n = 900, pos = new Float32Array(n * 3), rnd = mulberry32(7);
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2, ph = rnd() * Math.PI * 0.48, r = 280 + rnd() * 40;
      pos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
      pos[i * 3 + 1] = 12 + Math.sin(ph) * r;
      pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xcfe0ff, size: 1.7, sizeAttenuation: false, fog: false,
      transparent: true, opacity: 0.9,
    }));
    scene.add(stars);
  }
  // Full moon low in the SOUTHERN sky (+Z)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 24), glow(0xf2ecd8));
  moon.material.fog = false;
  moon.position.set(14, 15, 120);
  scene.add(moon);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(9.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x8fa8ff, transparent: true, opacity: 0.18, fog: false }));
  halo.position.copy(moon.position);
  scene.add(halo);

  // ================= GROUND =================
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(150, 150),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
    g.rotation.x = -Math.PI / 2;
    scene.add(g);
    solid(-75, -1, -75, 75, 0, 75); // walkable ground plane
    // shore strip
    box(140, 0.14, 1.4, std(0x1a2030), 0, 0.02, 26, false);
  }

  // ================= LAKE (z > 26) =================
  const waterGeo = new THREE.PlaneGeometry(140, 40, 70, 20);
  const waterBase = waterGeo.attributes.position.array.slice();
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({
    color: 0x0a1c38, transparent: true, opacity: 0.88, roughness: 0.25, metalness: 0.55,
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.12, 46);
  scene.add(water);
  // moon streak on the water
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(7, 38),
    new THREE.MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  streak.rotation.x = -Math.PI / 2;
  streak.position.set(14, 0.22, 44);
  scene.add(streak);

  // ================= TOWER =================
  const wallMat = std(0x141824);
  const darkMat = std(0x0b0d17);
  const trimMat = std(0x1d2338);

  // ---- F1 (y 0..5), footprint x[-8,8] z[0,14] ----
  box(0.6, 5, 15.2, wallMat, -8.3, 2.5, 7, true);          // west
  box(0.6, 5, 15.2, wallMat, 8.3, 2.5, 7, true);           // east
  box(16, 5, 0.6, wallMat, 0, 2.5, -0.3, true);            // north
  box(6, 5, 0.6, wallMat, -5, 2.5, 14.3, true);            // south left of door
  box(6, 5, 0.6, wallMat, 5, 2.5, 14.3, true);             // south right of door
  box(4, 1.5, 0.6, wallMat, 0, 4.25, 14.3, true);          // door lintel
  // big sign over the market front
  plane(10, 1.56, new THREE.MeshBasicMaterial({ map: signTex }), 0, 4.15, 14.66);

  // ---- F2 slab (y 5..6) with stairwell opening x[4.8,6] z[1.5,10] ----
  box(10.8, 1, 12, trimMat, -0.6, 5.5, 4, true);
  box(1.2, 1, 3.5, trimMat, 5.4, 5.5, -0.25, true);

  // ---- F2 (y 6..10), footprint x[-6,6] z[-2,10] ----
  box(12, 4, 0.5, wallMat, 0, 8, -2.25, true);             // north
  box(0.5, 4, 12, wallMat, -6.25, 8, 4, true);            // west
  box(0.5, 4, 12, wallMat, 6.25, 8, 4, true);             // east
  box(4, 4, 0.5, wallMat, -4, 8, 10.25, true);            // south left
  box(4, 4, 0.5, wallMat, 4, 8, 10.25, true);             // south right
  box(4, 1.5, 0.5, wallMat, 0, 9.25, 10.25, true);        // balcony door lintel

  // ---- Balcony (south, over the lake view): slab x[-4,4] z[10,14] y[5,6] ----
  box(8, 1, 4, trimMat, 0, 5.5, 12, true);
  box(0.5, 5, 0.5, trimMat, -3.5, 2.5, 13.5, true);       // support columns
  box(0.5, 5, 0.5, trimMat, 3.5, 2.5, 13.5, true);
  const railMat = std(0x232a45);
  // railing: south edge
  for (let x = -4; x <= 4; x += 1) box(0.12, 1, 0.12, railMat, x, 6.5, 13.9, false);
  box(8.2, 0.14, 0.14, railMat, 0, 6.95, 13.9, true);
  // railing: side edges
  for (let z = 10; z <= 14; z += 1) {
    box(0.12, 1, 0.12, railMat, -3.9, 6.5, z, false);
    box(0.12, 1, 0.12, railMat, 3.9, 6.5, z, false);
  }
  box(0.14, 0.14, 4.2, railMat, -3.9, 6.95, 12, true);
  box(0.14, 0.14, 4.2, railMat, 3.9, 6.95, 12, true);
  // balcony lanterns
  for (const x of [-3.5, 3.5]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), glow(0xffca7a));
    s.position.set(x, 7.15, 13.8); group.add(s);
    p(0xffb45e, 0.9, 8, x, 7.2, 13.8);
  }

  // ---- F3 slab (y 10..11), stairwell opening x[3.9,5] z[0.5,7.6] ----
  box(8.9, 1, 9, trimMat, -0.55, 10.5, 4.5, true);
  box(1.1, 1, 0.5, trimMat, 4.45, 10.5, 0.25, true);
  box(1.1, 1, 1.4, trimMat, 4.45, 10.5, 8.3, true);

  // ---- F3 (y 11..15), footprint x[-5,5] z[0,9] ----
  box(10, 4, 0.5, wallMat, 0, 13, -0.25, true);
  box(10, 4, 0.5, wallMat, 0, 13, 9.25, true);
  box(0.5, 4, 9, wallMat, -5.25, 13, 4.5, true);
  box(0.5, 4, 9, wallMat, 5.25, 13, 4.5, true);
  // warm-lit windows (emissive planes)
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffca7a });
  plane(1.4, 1.2, winMat, -2.5, 13.2, -0.52, Math.PI);
  plane(1.4, 1.2, winMat, 1.5, 13.2, -0.52, Math.PI);
  plane(1.4, 1.2, winMat, -2, 13.2, 9.52, 0);
  plane(1.4, 1.2, winMat, 2, 13.2, 9.52, 0);
  plane(1.4, 1.2, winMat, -5.52, 13.2, 3, -Math.PI / 2);
  plane(1.4, 1.2, winMat, 5.52, 13.2, 6, Math.PI / 2);
  p(0xffb45e, 1.0, 13, 0, 13.6, 4.5);

  // ---- F4 slab (y 15..16), stairwell opening x[-4,-2.9] z[1,7.6] ----
  box(6.9, 1, 7, darkMat, 0.55, 15.5, 4.5, true);
  box(1.1, 1, 0.4, darkMat, -3.45, 15.5, 7.8, true);

  // ---- F4 crown (y 16..24), dark silhouette ----
  box(8, 8, 0.5, darkMat, 0, 20, 0.75, true);             // north
  box(8, 8, 0.5, darkMat, 0, 20, 8.25, true);            // south
  box(0.5, 8, 7, darkMat, -4.25, 20, 4.5, true);         // west
  box(0.5, 8, 7, darkMat, 4.25, 20, 4.5, true);          // east
  // CYAN NEON RIM around the crown edge
  const neon = glow(PAL.cyan);
  box(8.3, 0.22, 0.72, neon, 0, 24.05, 0.75);
  box(8.3, 0.22, 0.72, neon, 0, 24.05, 8.25);
  box(0.72, 0.22, 7.3, neon, -4.25, 24.05, 4.5);
  box(0.72, 0.22, 7.3, neon, 4.25, 24.05, 4.5);
  for (const [cx, cz] of [[-4.25, 0.75], [4.25, 0.75], [-4.25, 8.25], [4.25, 8.25]])
    box(0.2, 8, 0.2, neon, cx, 20, cz);
  // central spire + ORANGE FLAME at the tip
  box(3, 5.5, 2, darkMat, 0, 18.75, 4.5, true);
  box(2, 1, 1, darkMat, 0, 22, 4.5, true);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 12), glow(PAL.orange));
  flame.position.set(0, 23.4, 4.5); group.add(flame);
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 10), glow(0xffcc66));
  flameCore.position.set(0, 23.3, 4.5); group.add(flameCore);
  const flameLight = p(PAL.orange, 3.0, 42, 0, 23.8, 4.5);
  // dark corner spires
  for (const [cx, cz] of [[-3.3, 1.7], [3.3, 1.7], [-3.3, 7.3], [3.3, 7.3]])
    box(0.7, 6, 0.7, darkMat, cx, 19, cz, true);

  // ================= STAIRCASES =================
  const stepMat = std(0x1a1f30);
  const stairs = (x0, x1, zStart, tread, yBase, n) => {
    for (let i = 0; i < n; i++)
      box(x1 - x0, i + 1, tread, stepMat, (x0 + x1) / 2, yBase + (i + 1) / 2, zStart + tread * i + tread / 2, true);
  };
  stairs(4.9, 5.9, 1.2, 1.3, 0, 6);    // A: F1 → F2 (top y=6)
  stairs(4.0, 5.0, 0.8, 1.3, 6, 5);    // B: F2 → F3 (top y=11)
  stairs(-4.0, -3.0, 1.1, 1.3, 11, 5); // C: F3 → F4 (top y=16)

  // stairwell railings (posts + top rail)
  const rail = (x0, x1, z, yBase) => {
    for (let x = x0; x <= x1 + 0.01; x += 0.8) box(0.1, 1, 0.1, railMat, x, yBase + 0.5, z, false);
    box(x1 - x0 + 0.2, 0.12, 0.12, railMat, (x0 + x1) / 2, yBase + 1, z, true);
  };
  rail(4.8, 6.0, 1.5, 6); rail(4.8, 6.0, 10.0, 6);           // F2 stairwell
  rail(3.9, 5.0, 0.5, 11); rail(3.9, 5.0, 7.6, 11);          // F3 stairwell
  rail(-4.0, -2.9, 7.6, 16);                                 // F4 stairwell
  box(0.12, 0.12, 6.8, railMat, -2.9, 17, 4.3, true);        // F4 stairwell side

  // ================= F1: FORGE =================
  const forgeMat = std(0x1c1420);
  box(3, 2.2, 2, forgeMat, -5.5, 1.1, 3, true);              // furnace body
  box(1, 2.8, 0.8, forgeMat, -5.5, 3.6, 3, true);            // chimney
  plane(1, 1, new THREE.MeshBasicMaterial({ color: 0xff7722 }), -3.98, 1.2, 3, Math.PI / 2); // mouth glow
  const forgeLight = p(PAL.orange, 2.4, 15, -5.5, 2.7, 3);
  const forgeEmbers = makeEmbers({ count: 70, x: -5.5, z: 3, y0: 2.3, y1: 4.9, spread: 1.4, color: 0xff8830, size: 0.12, rise: 1.6 });
  group.add(forgeEmbers.pts);
  const crownEmbers = makeEmbers({ count: 50, x: 0, z: 4.5, y0: 22.6, y1: 26.5, spread: 1.0, color: 0xff9933, size: 0.14, rise: 2.2 });
  group.add(crownEmbers.pts);

  // workbench + obsidian-enchanted tools (metal-bodied, glowing orange seams — never pure obsidian)
  const benchMat = std(0x2a2138);
  box(1.4, 0.15, 4, benchMat, -6.9, 1.12, 8, true);
  for (const z of [6.5, 8, 9.5]) {
    box(0.3, 1.05, 0.3, benchMat, -7.3, 0.52, z, false);
    box(0.3, 1.05, 0.3, benchMat, -6.5, 0.52, z, false);
  }
  const toolMat = std(0x0d0d12, { metalness: 0.7, roughness: 0.35 });
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  for (const [i, z] of [6.8, 8.0, 9.2].entries()) {
    const tool = box(0.5, 0.22, 0.9 - i * 0.15, toolMat, -6.9, 1.32, z, false);
    tool.rotation.y = (i - 1) * 0.25;
    const seam = box(0.54, 0.05, 0.94 - i * 0.15, seamMat, -6.9, 1.36, z, false);
    seam.rotation.y = tool.rotation.y;
  }

  // ================= F1: MARKET =================
  // central counter + floating Spellbook ledger
  box(4, 1.1, 1.5, std(0x241a2e), 0, 0.55, 6.25, true);
  box(4.4, 0.12, 1.9, std(0x2e2340), 0, 1.16, 6.25, true);
  const book = new THREE.Group();
  const pageMat = new THREE.MeshStandardMaterial({ map: runeTex, emissive: 0x00d9ff, emissiveMap: runeTex, emissiveIntensity: 0.9, roughness: 0.6 });
  const coverMat = std(0x140d24);
  const pageL = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.85), pageMat);
  const pageR = pageL.clone();
  const covL = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.95), coverMat);
  const covR = covL.clone();
  pageL.position.set(-0.56, 0.1, 0); pageL.rotation.z = 0.26;
  pageR.position.set(0.56, 0.1, 0); pageR.rotation.z = -0.26;
  covL.position.set(-0.58, 0.02, 0); covL.rotation.z = 0.26;
  covR.position.set(0.58, 0.02, 0); covR.rotation.z = -0.26;
  book.add(pageL, pageR, covL, covR);
  book.position.set(0, 2.7, 6.25);
  group.add(book);
  p(PAL.cyan, 1.6, 10, 0, 3.4, 6.25);

  // offer boards with pinned slips (exact strings)
  const boardMat = std(0x201812);
  const slips = [
    { z: 3.2, y: [3.1, 2.4], texts: ['3x SILVER THREAD — 12g', 'GRAIN FOR CRYSTAL — 5 SPELLS'] },
    { z: 6.8, y: [2.75], texts: ['REPAIR RUNE — 1 EMBERCOIN'] },
  ];
  for (const s of slips) {
    box(0.12, 2.2, 2.4, boardMat, 7.92, 2.4, s.z, true);
    s.texts.forEach((txt, i) => {
      plane(1.9, 0.6, new THREE.MeshBasicMaterial({ map: slipTex(txt) }), 7.84, s.y[i], s.z, -Math.PI / 2);
    });
  }

  // 3 market stalls with striped awnings + hanging lanterns
  for (const sx of [-5, 0, 5]) {
    const sz = 11.5;
    box(2, 1, 1, std(0x2a1f33), sx, 0.5, sz, true);          // stall counter
    for (const [px, pz] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]])
      box(0.12, 2.6, 0.12, benchMat, sx + px, 1.3, sz + pz, false);
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.7),
      new THREE.MeshStandardMaterial({ map: awningTex, side: THREE.DoubleSide, roughness: 0.85 }));
    awn.position.set(sx, 2.75, sz);
    awn.rotation.x = -Math.PI / 2 + 0.35;
    group.add(awn);
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), glow(0xffca7a));
    lan.position.set(sx, 2.15, sz); group.add(lan);
    box(0.05, 0.5, 0.05, benchMat, sx, 2.5, sz, false);      // lantern cord
    p(0xffb45e, 1.1, 9, sx, 2.25, sz);
  }

  // ================= F2 furnishings =================
  box(2, 0.15, 2, benchMat, -2, 6.97, 3, true);              // table
  for (const [lx, lz] of [[-2.8, 2.2], [-1.2, 2.2], [-2.8, 3.8], [-1.2, 3.8]])
    box(0.14, 0.9, 0.14, benchMat, lx, 6.45, lz, false);
  box(0.5, 0.5, 0.5, benchMat, -3.9, 6.25, 3, true);          // stools
  box(0.5, 0.5, 0.5, benchMat, -0.1, 6.25, 3, true);
  for (const [lx, lz] of [[-2, 3], [2, 5.5]]) {
    box(0.05, 1.1, 0.05, benchMat, lx, 9.4, lz, false);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), glow(0xffca7a));
    s.position.set(lx, 8.8, lz); group.add(s);
    p(0xffb45e, 1.0, 9, lx, 8.9, lz);
  }

  // ================= F3: living quarters =================
  const bedMat = std(0x3a2c4a);
  box(2.5, 0.7, 2, bedMat, -2.75, 11.35, 2.5, true);         // bed
  box(0.8, 0.25, 0.8, std(0xd8cdb8), -3.3, 11.83, 2.1, false); // pillow
  box(1.3, 0.12, 2.02, new THREE.MeshStandardMaterial({ color: 0x0a4a5a, emissive: 0x00d9ff, emissiveIntensity: 0.25 }), -1.9, 11.76, 2.5, false); // blanket
  box(1.7, 0.15, 1.5, benchMat, 2.35, 11.97, 5.75, true);    // table top
  for (const [lx, lz] of [[1.7, 5.2], [3, 5.2], [1.7, 6.3], [3, 6.3]])
    box(0.13, 0.9, 0.13, benchMat, lx, 11.45, lz, false);
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), std(0xe8dcc0));
  candle.position.set(2.35, 12.2, 5.75); group.add(candle);
  const candleTip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow(0xffca7a));
  candleTip.position.set(2.35, 12.4, 5.75); group.add(candleTip);
  p(0xffb45e, 0.7, 7, 2.35, 12.6, 5.75);
  box(1, 1, 1, std(0x4a3626), -3.1, 11.5, 6.3, true);         // crates
  box(0.8, 0.8, 0.8, std(0x4a3626), -2.0, 11.4, 6.4, true);

  // ================= TOWN (flat grid, dark voxel houses) =================
  const houseSpots = [
    [-20, -10], [18, -14], [-30, 8], [28, 6], [-24, 20], [24, 22],
    [-38, -2], [36, -6], [-10, -24], [12, -28], [0, -38], [-34, -20], [34, -26],
  ];
  const hrnd = mulberry32(99);
  const houseMats = [std(0x11141f), std(0x141826), std(0x101722)];
  for (const [hx, hz] of houseSpots) {
    const w = 6 + hrnd() * 3, d = 6 + hrnd() * 3, h = 4 + hrnd() * 2;
    const hm = houseMats[Math.floor(hrnd() * 3)];
    box(w, h, d, hm, hx, h / 2, hz, true);
    box(w + 0.8, 0.6, d + 0.8, std(0x1a1426), hx, h + 0.3, hz, false); // roof slab
    // lit windows (a few)
    const nWin = 2 + Math.floor(hrnd() * 2);
    for (let i = 0; i < nWin; i++) {
      const side = Math.floor(hrnd() * 4);
      const wc = hrnd() < 0.75 ? 0xffb45e : 0x00d9ff;
      const wy = 1.6 + hrnd() * (h - 2.4);
      if (side === 0) plane(1, 1.2, new THREE.MeshBasicMaterial({ color: wc }), hx - w / 4 + (i * w) / nWin, wy, hz + d / 2 + 0.03);
      else if (side === 1) plane(1, 1.2, new THREE.MeshBasicMaterial({ color: wc }), hx - w / 4 + (i * w) / nWin, wy, hz - d / 2 - 0.03, Math.PI);
      else if (side === 2) plane(1, 1.2, new THREE.MeshBasicMaterial({ color: wc }), hx + w / 2 + 0.03, wy, hz - d / 4 + (i * d) / nWin, Math.PI / 2);
      else plane(1, 1.2, new THREE.MeshBasicMaterial({ color: wc }), hx - w / 2 - 0.03, wy, hz - d / 4 + (i * d) / nWin, -Math.PI / 2);
    }
  }
  // lantern posts along the approach path
  for (const [lx, lz] of [[-4, 16], [4, 16], [-4, 22], [4, 22]]) {
    box(0.14, 2.6, 0.14, std(0x232a45), lx, 1.3, lz, true);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), glow(0xffca7a));
    s.position.set(lx, 2.75, lz); group.add(s);
  }

  // ================= per-frame updates =================
  const waterPos = waterGeo.attributes.position;
  function tick(dt, t) {
    // lake shimmer
    for (let i = 0; i < waterPos.count; i++) {
      const bx = waterBase[i * 3], by = waterBase[i * 3 + 1];
      waterPos.array[i * 3 + 2] = Math.sin(bx * 0.35 + t * 1.4) * 0.09 + Math.cos(by * 0.5 + t) * 0.07;
    }
    waterPos.needsUpdate = true;
    waterGeo.computeVertexNormals();
    // embers
    forgeEmbers.tick(dt, t);
    crownEmbers.tick(dt, t);
    // floating spellbook: bob + slow spin
    book.position.y = 2.7 + Math.sin(t * 1.6) * 0.16;
    book.rotation.y = Math.sin(t * 0.5) * 0.45;
    // flame flicker
    const fl = 0.82 + 0.18 * Math.sin(t * 13) * Math.sin(t * 7.3);
    flame.scale.set(fl, 1 + (1 - fl) * 0.9, fl);
    flameCore.scale.set(fl, 1, fl);
    flameLight.intensity = 2.4 + 1.2 * Math.sin(t * 11) * Math.sin(t * 5.7);
    forgeLight.intensity = 2.0 + 0.8 * Math.sin(t * 9.3) * Math.sin(t * 4.1);
  }

  return { scene, colliders, tick };
}
