// Nightspire-22 multiplayer relay — self-hosted WebSocket server.
//
// Protocol (JSON, field `t` = packet type):
//   C->S: {"t":"hello","name":string}
//          {"t":"move","p":[x,y,z],"yaw":number,"seq":number}
//          {"t":"chat","text":string}
//   S->C: {"t":"welcome","id":string}
//          {"t":"join","id":string,"name":string}
//          {"t":"leave","id":string}
//          {"t":"state","players":[{"id","name","p":[x,y,z],"yaw"}]}
//          {"t":"chat","id":string,"name":string,"text":string}
// See ../../docs/PROTOCOL.md for the full contract.

const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8787;
const TICK_MS = 50;              // 20 Hz state broadcast
const MAX_NAME_LEN = 16;
const MAX_CHAT_LEN = 200;
const MOVE_LIMIT_PER_SEC = 30;
const CHAT_COOLDOWN_MS = 800;
const MAX_MOVE_DIST = 12;        // anti-teleport: reject jumps bigger than this
const WORLD = { x: [-55, 55], y: [0, 40], z: [-55, 55] };
const SPAWN = [0, 1, 18];

const wss = new WebSocketServer({ port: PORT });
const players = new Map(); // id -> { ws, id, name, p, yaw, seq, moveTimes, lastChat }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function sanitizeName(raw) {
  const clean = String(raw ?? '')
    .replace(/[\x00-\x1f\x7f]/g, '')   // strip control chars
    .trim()
    .slice(0, MAX_NAME_LEN);
  if (!clean) return 'mage-' + crypto.randomInt(1000, 10000);
  return clean;
}

function sanitizeText(raw) {
  return String(raw ?? '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, MAX_CHAT_LEN);
}

function broadcast(obj, exceptId) {
  const msg = JSON.stringify(obj);
  for (const [id, p] of players) {
    if (id === exceptId) continue;
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(msg);
  }
}

function sendState(ws) {
  const playersArr = [...players.values()].map((p) => ({
    id: p.id, name: p.name, p: p.p, yaw: p.yaw,
  }));
  ws.send(JSON.stringify({ t: 'state', players: playersArr }));
}

function handleHello(ws, msg) {
  const id = crypto.randomBytes(8).toString('hex');
  const name = sanitizeName(msg.name);
  const player = {
    ws, id, name,
    p: [...SPAWN], yaw: Math.PI, seq: 0,
    moveTimes: [], lastChat: 0,
  };
  players.set(id, player);
  ws._playerId = id;
  console.log(`join ${id} (${name}) — ${players.size} online`);
  ws.send(JSON.stringify({ t: 'welcome', id }));
  broadcast({ t: 'join', id, name }, id);  // tell everyone else
  sendState(ws);                           // newcomer gets the roster now
}

function handleMove(ws, msg) {
  const player = players.get(ws._playerId);
  if (!player) return;
  const { p, yaw, seq } = msg;
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite) ||
      !Number.isFinite(yaw) || !Number.isFinite(seq)) return;

  // Ordering: ignore stale sequence numbers.
  if (seq <= player.seq) return;

  // Rate limit: max ~30 move msgs/sec per client (sliding window).
  const now = Date.now();
  player.moveTimes = player.moveTimes.filter((t) => now - t < 1000);
  if (player.moveTimes.length >= MOVE_LIMIT_PER_SEC) return; // drop extra
  player.moveTimes.push(now);

  // Server-authoritative clamps.
  const clamped = [
    clamp(p[0], ...WORLD.x),
    clamp(p[1], ...WORLD.y),
    clamp(p[2], ...WORLD.z),
  ];

  // Anti-teleport: reject single updates that jump too far.
  const dx = clamped[0] - player.p[0];
  const dy = clamped[1] - player.p[1];
  const dz = clamped[2] - player.p[2];
  if (Math.hypot(dx, dy, dz) > MAX_MOVE_DIST) return; // keep last accepted pos

  player.p = clamped;
  player.yaw = yaw;
  player.seq = seq;
  if (process.env.DEBUG_MOVES) {
    console.log(`move ${player.id} -> [${clamped.map((v) => v.toFixed(1)).join(', ')}] yaw ${yaw.toFixed(2)}`);
  }
}

function handleChat(ws, msg) {
  const player = players.get(ws._playerId);
  if (!player) return;
  const now = Date.now();
  if (now - player.lastChat < CHAT_COOLDOWN_MS) return; // 1 chat / 800ms
  const text = sanitizeText(msg.text);
  if (!text) return;
  player.lastChat = now;
  console.log(`chat ${player.name}: ${text}`);
  broadcast({ t: 'chat', id: player.id, name: player.name, text });
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return; // malformed JSON: ignore and continue
    }
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello': handleHello(ws, msg); break;
      case 'move': handleMove(ws, msg); break;
      case 'chat': handleChat(ws, msg); break;
      default: break; // unknown packet: ignore
    }
  });

  ws.on('close', () => {
    const id = ws._playerId;
    const player = players.get(id);
    if (!player) return;
    players.delete(id);
    console.log(`leave ${id} (${player.name}) — ${players.size} online`);
    broadcast({ t: 'leave', id });
  });
});

// 20 Hz tick: broadcast full state. Skip when empty.
setInterval(() => {
  if (players.size === 0) return;
  broadcast({
    t: 'state',
    players: [...players.values()].map((p) => ({
      id: p.id, name: p.name, p: p.p, yaw: p.yaw,
    })),
  });
}, TICK_MS);

console.log(`Nightspire-22 server listening on port ${PORT} (tick ${1000 / TICK_MS} Hz)`);
