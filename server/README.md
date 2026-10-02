# Nightspire-22 server

Self-hosted Node.js WebSocket multiplayer server for the voxel Nightspire
tower. It is the server-authoritative movement relay: clients send `move`
packets, the server validates and clamps them, and rebroadcasts the full
player state at 20 Hz.

## Run

```bash
npm install
npm start
```

The server listens on `PORT` (default `8787`):

```bash
PORT=9000 npm start
```

Optional debug logging of accepted moves: `DEBUG_MOVES=1 npm start`.

## Test

```bash
npm test
```

The smoke test spawns the real `server.js` on port 18987 and runs the
client contract end to end: hello/welcome, join broadcast, move/state relay
(both directions), chat relay with sender name, and leave broadcast. It
exits `0` with `SMOKE OK` on success.

## Protocol

The full client↔server contract (JSON, `t` = packet type) lives in
`../../docs/PROTOCOL.md`. Summary:

| Direction | Packets |
| --- | --- |
| Client → server | `hello` (first message), `move`, `chat` |
| Server → client | `welcome`, `join`, `leave`, `state` (20 Hz), `chat` |

## Behavior

- **hello** → assigns a random hex id, sanitizes the name (max 16 chars,
  control chars stripped, falls back to `mage-####`), sends `welcome`,
  broadcasts `join` to the other players, and sends the newcomer the current
  roster as an immediate `state`.
- **move** → validated by type; position is server-authoritative:
  x/z clamped to `[-55, 55]`, y clamped to `[0, 40]`; updates that teleport
  more than 12 units from the last accepted position are rejected;
  stale `seq` numbers are ignored; max ~30 move messages/sec per client
  (extras dropped).
- **state** → broadcast to all connected clients at 20 Hz; ticks with zero
  players are skipped.
- **chat** → trimmed to 200 chars and sanitized, broadcast with the
  sender's id + name; max 1 message per 800 ms per client.
- **close** → the player is removed and `leave` is broadcast.
- Malformed JSON is ignored and the connection continues. No persistence,
  no auth, no database.
