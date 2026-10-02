# Nightspire-22 Multiplayer Protocol

Version: 1.0 · Branch: `voxel-tower-build` · 2026-10-02

Transport: **JSON over WebSocket**, port **8787**.
Encoding: UTF-8 JSON text frames. One JSON object per frame.
Server is authoritative for all shared state. The client is a thin renderer
plus local prediction; the server is the source of truth for player positions.

## 1. Packet table

Every packet is a JSON object with a `t` (type) discriminator.
Fields are named in full words; this is a human-readable dev protocol, not a
wire-optimized binary protocol. Optional fields are marked `opt`.

### 1.1 Client → server

| `t`    | Direction | Fields | Notes |
|--------|-----------|--------|-------|
| `hello` | C→S | `name`: string (required, 1–24 chars) | First packet after the socket opens. Announces the player's display name. |
| `move`  | C→S | `p`: [number, number, number] (x, y, z) `yaw`: number (radians, −π..π) `seq`: number (monotonic uint) | Authoritative-position *proposal*. Server validates and may reject (see §3). |
| `chat`  | C→S | `text`: string (1–200 chars) | Chat send. Server echoes to all clients as a server-originated `chat` packet. |

### 1.2 Server → client

| `t`      | Direction | Fields | Notes |
|----------|-----------|--------|-------|
| `welcome` | S→C | `id`: string | Sent once per connection, in reply to `hello`. Assigns this client's player id. |
| `join`    | S→C | `id`: string, `name`: string | Broadcast to all OTHER clients when a new player enters. |
| `leave`   | S→C | `id`: string | Broadcast to all remaining clients when a player disconnects (clean or timeout). |
| `state`   | S→C | `players`: array of `{id: string, name: string, p: [number,number,number], yaw: number}` | Full authoritative snapshot, broadcast at **20 Hz** (§2). Includes the recipient. |
| `chat`    | S→C | `id`: string, `name`: string, `text`: string | Fan-out of a validated client chat message. The sender's own message arrives the same way (no local echo). |

### 1.3 Lifecycle

```
client connects (WS) ──► server assigns a connection
client sends {"t":"hello","name":"…"}
        └─ server replies {"t":"welcome","id":"<player-id>"}
        └─ server broadcasts {"t":"join","id":"…","name":"…"} to everyone else
        └─ client starts receiving {"t":"state",…} @20Hz
client moves ──► sends {"t":"move",…} with incrementing seq
client chats ──► sends {"t":"chat","text":"…"}
        └─ server broadcasts {"t":"chat","id":"…","name":"…","text":"…"}
client disconnects ──► server broadcasts {"t":"leave","id":"…"}
```

The client MUST NOT spawn its avatar or treat itself as "in world" until it
has received `welcome`. If `welcome` never arrives (bad name, server full,
timeout), the client falls back to offline single-player (see §6).

Malformed packets (invalid JSON, unknown `t`, missing required fields) are
dropped silently; repeated malformed traffic from one connection may get the
connection closed.

## 2. Tick model

The server runs a fixed simulation tick at **20 Hz** (every 50 ms):

- On each tick the server applies all validated `move` inputs received since
  the previous tick, in `seq` order, to its authoritative player positions.
- At the end of each tick the server broadcasts one `state` packet containing
  a **full snapshot** of every connected player. Clients do not request state;
  they consume the stream. (Pattern: periodic full-state push, same role as
  HYTOPIA's tick-tagged outbound packets — §5.)
- Clients MAY send `move` more often than 20 Hz (e.g. per render frame), but
  the server only reconciles at tick boundaries; sending faster than the tick
  is allowed up to the rate limit (§3.4) and is otherwise wasteful.
- There is no client clock sync in v1; `state` packets carry no tick number.
  Clients interpolate between consecutive snapshots.

## 3. Server-authoritative validation rules

The server trusts nothing. Every inbound packet is validated before it can
affect shared state.

### 3.1 World bounds

Positions outside the buildable volume are rejected:

- `x`, `z`: **±55** (the tower lot footprint plus margin)
- `y`: **0..40** (ground floor to the Nightspire cap)

A `move` outside these bounds is dropped; the server keeps the player's last
valid position. Repeated violations flag the connection.

### 3.2 Anti-teleport

A `move` whose `p` is more than **12 units** (Euclidean distance) from the
server's last authoritative position for that player is rejected. This kills
teleport hacks and smooths over packet-loss spikes: the client should
re-converge toward the next authoritative `state` snapshot.

### 3.3 Stale sequence numbers

`move.seq` must be strictly increasing per connection. A `move` with
`seq` ≤ the last accepted `seq` for that player is dropped silently
(late/duplicate/out-of-order delivery). Clients start `seq` at 0 (or a random
value on connect) and increment by 1 per `move`.

### 3.4 Rate limits (per client)

| Packet | Limit | On exceed |
|--------|-------|-----------|
| `move` | 60/sec (burst 120) | excess dropped |
| `chat` | 1 per 800 ms | excess dropped; repeated spam closes connection |
| `hello` | 1 per connection | second `hello` ignored |

Chat is also hard-limited to **200 characters** server-side; longer text is
truncated (or the packet dropped) before fan-out. The 800 ms chat throttle is
per-client, enforced server-side — clients should also pre-throttle in UI.

## 4. Chat

- Clients send `{"t":"chat","text":string}`; the server validates length
  (1–200 chars), throttle (800 ms), and a basic profanity/slur blocklist.
- Valid messages are fanned out as `{"t":"chat","id","name","text"}` to ALL
  clients, including the sender. Clients render on receipt; **no local echo**
  (avoids double-render on resend).
- `id`/`name` in the fan-out are server-resolved from the connection — clients
  cannot spoof identity.
- One channel in v1 ("say"). No whispers, no channels field.

## 5. Design notes — what HYTOPIA's protocol informed

Skimmed `protocol/` of the MIT-licensed HYTOPIA engine source
(hytopiagg/hytopia-source, commit `44f2a42979999ef76413a6afdad02b416aecc000`)
for **layout patterns only**. No runtime code was copied or vendored (see §7).

Patterns adopted:

1. **Typed packets with a direction split.** HYTOPIA defines every packet as
   `(PacketId, schema-validated payload)` and namespaces them as
   inbound / outbound / bidirectional. We follow the same discipline:
   every packet has a discriminator (`t`), a declared field schema (§1), and
   a fixed direction (C→S or S→C). (We use string `t` tags instead of numeric
   ids — appropriate for a JSON dev protocol; the rigor is the point, not the
   byte size.)
2. **Fixed server tick with authoritative state pushes.** HYTOPIA tags state
   packets with a world tick; we run the server on a fixed 20 Hz tick and
   broadcast full `state` snapshots each tick. The client consumes; it never
   requests.
3. **Connection handshake assigns identity.** HYTOPIA's bidirectional
   `Connection` packet carries a server-issued connection id on WS open.
   Our `hello` → `welcome` handshake does the same job: the server issues the
   player `id`, which then becomes the identity key for all later packets
   (`move`, `chat`, `leave`).
4. **Heartbeat concept (implicit).** HYTOPIA has an explicit bidirectional
   heartbeat. In v1 we rely on WebSocket ping/pong + the 20 Hz `state` stream
   as the liveness signal; a client that misses state for >5 s is treated as
   timed out (→ `leave` broadcast). An explicit heartbeat packet may be added
   later.
5. **Server-authoritative movement.** HYTOPIA's input packets feed a
   server-side simulation that rejects illegal state. Our §3 rules (bounds,
   anti-teleport, seq ordering) are the same philosophy scaled down: the
   server validates every input against the world model and drops what doesn't
   fit.

Patterns deliberately NOT adopted: msgpack binary encoding (JSON is fine for
this player count), numeric packet ids, world-tick tagging on packets (v1
clients interpolate between snapshots instead).

## 6. Client fallback: offline single-player

If no server is reachable (connection refused, timeout, no `welcome` after
`hello`), the client falls back to **offline single-player mode**:

- The tower renders and the player can walk it with local movement.
- No `id` is assigned; no `state`, `join`, `leave`, or `chat` packets exist.
- On reconnect, the client discards the offline session, re-runs the
  `hello` → `welcome` handshake, and adopts server-authoritative state.
- Offline sessions are never merged into the server; they are purely local.

## 7. Provenance / license hygiene

- HYTOPIA's `protocol/` directory was cloned **sparsely, outside this repo**
  (`~/workspace/hytopia-skim`, deleted after the skim) and read for
  **packet-layout patterns only** — how packets are typed and named, tick
  conventions, join/leave lifecycle, server-authoritative movement, chat
  channels.
- **Nothing was vendored.** No HYTOPIA code, schemas, or constants appear in
  this repo. The protocol above is original to Nightspire-22 (JSON `t`-tagged
  packets), inspired by patterns, not derived from code.
- **`assets/` and `sdk/` were never touched.** The sparse checkout included
  only `protocol/`; the HGAL-licensed assets tree and the limited-license SDK
  were excluded by checkout and never read, copied, or linked.
- Files read during the skim (patterns only, all under `protocol/`):
  `packets/PacketCore.ts`, `packets/bidirectional/Connection.ts`,
  `packets/bidirectional/Heartbeat.ts`, `packets/inbound/ChatMessageSend.ts`,
  `packets/inbound/Input.ts`, `packets/outbound/Players.ts`,
  `schemas/Connection.ts`, `schemas/Heartbeat.ts`, `schemas/ChatMessage.ts`,
  `README.md`.

## 8. Reserved / future

- Explicit heartbeat packet (if WS ping/pong proves insufficient).
- Numeric tick on `state` for rollback-style client prediction.
- Player teleport/respawn packet (server-initiated position reset, bypasses
  the 12u anti-teleport rule by design).
- Build/edit packets for the obsidian tower (placement is server-validated
  against the build envelope).

---

*Canonical material spelling: **obsidian** (never "rock").*
