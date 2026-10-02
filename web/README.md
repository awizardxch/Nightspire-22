# Nightspire-22 · web client

Walkable voxel-hybrid Nightspire tower (Lot 22, Panda Park) built with Vite + Three.js.
Self-contained: all geometry is procedural (no external images, models, audio, or fonts).
Text signs use canvas-generated textures.

**v0.1 grey-box** — procedural stand-ins; final art pending. The wizard avatar is an
explicit placeholder; the real aWizard GLB is pending approval and is NOT embedded.

## Run

```bash
cd web
npm install
npm run dev      # → http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to web/dist/
npm run preview  # serve the build at http://localhost:4173
```

## Multiplayer server

On load the client tries a WebSocket presence server. URL resolution order:

1. `?server=` URL param (e.g. `http://localhost:5173/?server=ws://host:8787`)
2. `localStorage` key `ns22-server` (also settable in the entry overlay's Server field)
3. default `ws://localhost:8787`

If no connection within 2.5s the client drops to **offline single-player** mode
(banner: "OFFLINE — single player").

Protocol (JSON, `t` = type):

- client → server: `{"t":"hello","name"}` · `{"t":"move","p":[x,y,z],"yaw","seq"}` (20Hz when moved) · `{"t":"chat","text"}`
- server → client: `{"t":"welcome","id"}` · `{"t":"join","id","name"}` · `{"t":"leave","id"}` · `{"t":"state","players":[...]}` (20Hz) · `{"t":"chat","id","name","text"}`

## Controls

| Input | Action |
|---|---|
| Click "Enter the Nightspire" | start (browser gesture) |
| Mouse hover | look (no button held) |
| Click-drag | look (fallback) |
| WASD / arrows | move |
| Space | jump |
| V | toggle first / third person |
| Enter or T | focus chat · Enter sends · Esc unfocuses |

Spawn: (0, 1, 18), facing the tower (north, −Z). World bounds: x,z ∈ [−55,55], y ∈ [0,40].

## Layout

- **F1 (y 0–5)** — forge (ember particles, flickering forge light), obsidian-enchanted
  workbench tools (black metal, glowing orange seams), floating Spellbook ledger with
  cyan runes over the central counter, offer boards, 3 market stalls with striped
  awnings + lanterns, "Panda Park · LOT-22" sign over the south entrance.
- **F2 (y 6–10)** — balcony facing south over the lake, railing, lanterns. Staircase
  inside the tower (east side).
- **F3 (y 11–15)** — living quarters, warm-lit windows, bed/table/crates.
- **F4 (y 16–24)** — Nightspire crown: dark silhouette, cyan neon rim, orange flame
  at the tip, corner spires.

Night scene: starfield, purple fog, full moon low in the southern sky over the lake
(z > 26, animated shimmer), flat voxel town grid around the lot.

## Files

- `index.html` — shell, HUD, entry overlay
- `src/main.js` — bootstrap, remote players, chat, 20Hz move loop
- `src/world.js` — scene builder (tower, town, lake, sky, particles, lights)
- `src/avatar.js` — voxel wizard placeholder + name sprites
- `src/player.js` — controls + AABB collision + stairs step-up
- `src/net.js` — WebSocket client + offline fallback
- `src/ui.js` — HUD/overlay/chat helpers
