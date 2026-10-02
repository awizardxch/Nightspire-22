// main.js — Nightspire-22 client entry: scene, player, net, chat loop.
import * as THREE from 'three';
import { buildWorld, PAL } from './world.js';
import { makeWizard, makeNameSprite } from './avatar.js';
import { Player } from './player.js';
import { Net, resolveServerUrl } from './net.js';
import { initUI, randomName } from './ui.js';

const ui = initUI();

// ---------- renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 600);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- world ----------
const world = buildWorld();
const scene = world.scene;

// ---------- local player ----------
const spawn = new THREE.Vector3(0, 0, 18);
const avatar = makeWizard(0xf5e6c8);
scene.add(avatar);
const player = new Player(world.colliders, spawn);
player.attach(canvas, avatar);

// ---------- remote players ----------
const TINTS = [0xe8d8b0, 0xd8c8e8, 0xc8e0d8, 0xf0d0c0, 0xd8e8f0, 0xe8c8d8];
const remotes = new Map(); // id -> { group, name, target:Vector3, yaw }
let tintIdx = 0;

function addRemote(id, name) {
  if (remotes.has(id)) return;
  const g = makeWizard(TINTS[tintIdx++ % TINTS.length]);
  g.add(makeNameSprite(name));
  g.position.set(0, -10, 0);
  scene.add(g);
  remotes.set(id, { group: g, name, target: new THREE.Vector3(0, -10, 0), yaw: 0 });
  ui.addChat(null, `${name} entered the Nightspire`);
}
function removeRemote(id) {
  const r = remotes.get(id);
  if (!r) return;
  scene.remove(r.group);
  remotes.delete(id);
  ui.addChat(null, `${r.name} left`);
}
function applyState(players) {
  const seen = new Set();
  for (const pl of players) {
    if (pl.id === net.myId) continue;
    seen.add(pl.id);
    let r = remotes.get(pl.id);
    if (!r) { addRemote(pl.id, pl.name || 'mage'); r = remotes.get(pl.id); }
    r.target.set(pl.p[0], pl.p[1], pl.p[2]);
    r.yaw = pl.yaw;
  }
  for (const id of [...remotes.keys()]) if (!seen.has(id)) removeRemote(id);
  ui.setStatus('online', players.length);
}

// ---------- net ----------
const net = new Net();
net.onStatus = (s) => {
  if (s === 'online') { ui.setStatus('online', remotes.size + 1); ui.addChat(null, 'connected to the Nightspire'); }
  else if (s === 'offline') { ui.setStatus('offline'); ui.addChat(null, 'OFFLINE — single player'); }
  else ui.setStatus('connecting');
};
net.onJoin = (id, name) => addRemote(id, name);
net.onLeave = (id) => removeRemote(id);
net.onState = applyState;
net.onChat = (id, name, text) => {
  const cls = id === net.myId ? 'me' : '';
  ui.addChat(name || 'mage', String(text).slice(0, 140), cls);
};

// ---------- entry ----------
let started = false;
ui.enterBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  const name = ui.getName();
  const customServer = ui.getServer();
  try {
    localStorage.setItem('ns22-name', name);
    if (customServer) localStorage.setItem('ns22-server', customServer);
  } catch { /* ignore */ }
  ui.showHUD();
  ui.addChat(null, `welcome, ${name} — the forge is lit`);
  player.active = true;
  net.connect(customServer || resolveServerUrl(), name);
});
ui.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ui.enterBtn.click();
  e.stopPropagation();
});

// ---------- chat ----------
function focusChat() {
  ui.chatInput.focus();
}
window.addEventListener('keydown', (e) => {
  if (!started) return;
  const typing = document.activeElement === ui.chatInput;
  if (!typing && (e.code === 'Enter' || e.code === 'KeyT')) {
    // don't steal Enter right after clicking the entry button
    if (e.code === 'KeyT' || document.activeElement !== ui.enterBtn) {
      e.preventDefault();
      focusChat();
    }
  } else if (typing && e.code === 'Escape') {
    ui.chatInput.blur();
  }
});
ui.chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const text = ui.chatInput.value.trim().slice(0, 140);
    ui.chatInput.value = '';
    ui.chatInput.blur();
    if (!text) return;
    const name = (() => { try { return localStorage.getItem('ns22-name') || randomName(); } catch { return randomName(); } })();
    ui.addChat(name, text, 'me');
    net.sendChat(text);
  }
});

// ---------- 20Hz move sender ----------
let seq = 0;
let lastSent = '';
setInterval(() => {
  if (!started || !net.online) return;
  const s = player.state();
  const key = s.p.map((v) => v.toFixed(3)).join(',') + '|' + s.yaw.toFixed(3);
  if (key !== lastSent) {
    lastSent = key;
    net.sendMove(s.p, s.yaw, seq++);
  }
}, 50);

// ---------- main loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  world.tick(dt, t);
  if (started) player.update(dt, camera);
  else {
    // idle camera drift behind the overlay
    camera.position.set(Math.sin(t * 0.08) * 26, 9, 30);
    camera.lookAt(0, 8, 7);
  }
  // interpolate remote players
  const k = 1 - Math.exp(-10 * dt);
  for (const r of remotes.values()) {
    r.group.position.lerp(r.target, k);
    r.group.rotation.y = r.yaw + Math.PI;
  }
  renderer.render(scene, camera);
}
animate();
