// Smoke test for the Nightspire-22 multiplayer server.
// Spawns the REAL server (server.js) on a test port and runs the client
// contract against it: hello/welcome, join, move/state relay, chat, leave.
// Exit 0 + "SMOKE OK" on success, non-zero with a clear reason on failure.

const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const TEST_PORT = 18987;
const STEP_TIMEOUT_MS = 5000; // each step: generous, but finite

function fail(reason) {
  console.error('SMOKE FAIL:', reason);
  process.exit(1);
}

// Collect incoming JSON messages from a client into a queue.
function attach(ws) {
  ws.msgs = [];
  ws.on('message', (data) => {
    try { ws.msgs.push(JSON.parse(String(data))); } catch { /* ignore */ }
  });
}

function waitFor(ws, pred, label) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const found = ws.msgs.find(pred);
      if (found) { clearInterval(timer); return resolve(found); }
      if (Date.now() - start > STEP_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error(`timeout waiting for ${label} (got: ${JSON.stringify(ws.msgs.slice(-3))})`));
      }
    }, 25);
  });
}

async function openClient() {
  const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
  attach(ws);
  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  return ws;
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
      ws.close();
      return;
    } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  fail('server did not start listening on port ' + TEST_PORT);
}

async function main() {
  const server = spawn('node', [path.join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'ignore',
  });
  const killServer = () => { try { server.kill('SIGKILL'); } catch { /* noop */ } };
  process.on('exit', killServer);

  await waitForServer();

  // 1. Client A connects, says hello, expects welcome with an id.
  const A = await openClient();
  A.send(JSON.stringify({ t: 'hello', name: 'smokeA' }));
  const welcomeA = await waitFor(A, (m) => m.t === 'welcome' && m.id, 'welcome for A')
    .catch((e) => fail(e.message));
  const idA = welcomeA.id;
  console.log('step 1 ok: A welcomed as', idA);

  // 2. Client B connects; A must receive join for B.
  const B = await openClient();
  B.send(JSON.stringify({ t: 'hello', name: 'smokeB' }));
  const welcomeB = await waitFor(B, (m) => m.t === 'welcome' && m.id, 'welcome for B')
    .catch((e) => fail(e.message));
  const idB = welcomeB.id;
  const joinForB = await waitFor(A, (m) => m.t === 'join' && m.id === idB, 'join for B on A')
    .catch((e) => fail(e.message));
  if (joinForB.name !== 'smokeB') fail('join name mismatch: ' + joinForB.name);
  console.log('step 2 ok: B welcomed as', idB, '; A saw join');

  // 3. A moves to [5,1,10]; B must see A there in state within 2s.
  A.send(JSON.stringify({ t: 'move', p: [5, 1, 10], yaw: 1.5, seq: 1 }));
  const stateSeenByB = await waitFor(
    B,
    (m) => m.t === 'state' && m.players.some((pl) => pl.id === idA &&
      Math.abs(pl.p[0] - 5) < 0.01 && Math.abs(pl.p[1] - 1) < 0.01 && Math.abs(pl.p[2] - 10) < 0.01),
    'state with A at [5,1,10] on B').catch((e) => fail(e.message));
  console.log('step 3 ok: B sees A at', JSON.stringify(stateSeenByB.players.find((p) => p.id === idA).p));

  // 4. B moves to [-3,1,7]; A must see B there.
  B.send(JSON.stringify({ t: 'move', p: [-3, 1, 7], yaw: 0.5, seq: 1 }));
  const stateSeenByA = await waitFor(
    A,
    (m) => m.t === 'state' && m.players.some((pl) => pl.id === idB &&
      Math.abs(pl.p[0] + 3) < 0.01 && Math.abs(pl.p[1] - 1) < 0.01 && Math.abs(pl.p[2] - 7) < 0.01),
    'state with B at [-3,1,7] on A').catch((e) => fail(e.message));
  console.log('step 4 ok: A sees B at', JSON.stringify(stateSeenByA.players.find((p) => p.id === idB).p));

  // 5. A sends chat; B must receive it with A's name.
  A.send(JSON.stringify({ t: 'chat', text: 'hello tower' }));
  const chatMsg = await waitFor(
    B,
    (m) => m.t === 'chat' && m.id === idA && m.text === 'hello tower',
    'chat from A on B').catch((e) => fail(e.message));
  if (chatMsg.name !== 'smokeA') fail('chat name mismatch: ' + chatMsg.name);
  console.log('step 5 ok: B received chat from smokeA:', JSON.stringify(chatMsg.text));

  // 6. A disconnects; B must receive leave for A.
  A.close();
  const leaveMsg = await waitFor(B, (m) => m.t === 'leave' && m.id === idA, 'leave for A on B')
    .catch((e) => fail(e.message));
  console.log('step 6 ok: B saw leave for', leaveMsg.id);

  B.close();
  await new Promise((r) => setTimeout(r, 200));
  console.log('SMOKE OK');
  process.exit(0);
}

main().catch((e) => fail(e.message || String(e)));
