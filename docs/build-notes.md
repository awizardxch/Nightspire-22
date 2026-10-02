# Build notes — Nightspire-22

Running notes on the tower build. Newest at top.

## 2026-10-02 — Phase 3: clickable Spellbook + market painting (branch `tower-phase3`)

- Per Speechless: "We need spellbook inside somewhere when we click on it
  the agent can go to the spellbook site and get a wallet. We need a
  hanging image of the Nightspire market."
- **Clickable Spellbook** (`web/src/main.js`, `ui.js`, `index.html`,
  `style.css`): the floating F1 ledger is raycast-clickable — a
  pointerdown→pointerup with <6px travel (so drag-look never fires it)
  opens `https://spellbook.awizard.dev` in a new tab (`noopener`). Hover
  shows a pointer cursor + floating hint "Spellbook — click to get your
  wallet", with an occlusion check (floors/walls block the hint) so it
  never shows through geometry. Cyan rune shimmer animation untouched.
- **Hanging market painting** (`web/public/art/nightspire-market-painting.webp`,
  renamed from the generated filename; json sidecars removed): framed
  canvas on the F1 north wall facing the entrance, forged-metal voxel
  frame, hung on two chains from the wall top with a slight gallery tilt.
  The webp itself carries the "NIGHTSPIRE MARKET — circa 1423" plaque.
- Protocol unchanged (v1.0). No HGAL/SDK code; the painting is our own
  generated media, vendored in-repo.

## 2026-10-02 — Phase 2: visitable + deeper (branch `tower-phase2`)

- Per Speechless ("merge to main and keep building"): PR #1 merged to
  `main` as `80a4db4`; Phase 2 continues on `tower-phase2`.
- **Deploy path** — `docs/DEPLOY.md`: complete self-hosting guide (relay
  on PC/VPS, `PORT` env, systemd template
  `server/nightspire-server.service`, Caddy + nginx reverse-proxy
  snippets with TLS, firewall notes, visitor join URL
  `https://<host>/?server=wss://<host>/ws`). Proxy/systemd sections are
  labeled templates — not end-to-end verified from the build environment.
- **In-world depth** (`web/src/world.js`):
  - Stairs F1→F2→F3→F4 were already present with collision; verified the
    step-up chain and stairwell alignment. Fixed one visual clip: the F3
    bed overlapped stair C — bed cluster moved east, clear of the steps.
  - F2 balcony dressed: two lake-facing benches (solid) + two lantern
    posts flanking the balcony door (emissive, no new point lights).
  - F3 quarters dressed: rug with cyan inlay (walk-over), bookshelf with
    glowing spines (solid), warm wall torch by the bed.
  - F4 crown interior: cyan rune ring on the floor (additive, breathing),
    the forge-heart — a slowly turning extruded heart in glowing orange —
    floating above the flame (existing flame light stays the light
    source).
  - Collision polish: stairs, counter, stalls, benches, shelf, balcony
    railing all solid; railing top rails block falling off the balcony.
- **Procedural WebAudio ambience** (`web/src/audio.js`, license-clean, no
  files): forge fire bed + random ember crackle pops, soft market murmur
  wash, altitude-driven wind (still in the forge, audible on the
  balcony). Starts on the entry click (autoplay-safe); mute toggle in the
  HUD (`web/index.html`, `web/src/ui.js`, `web/src/main.js`,
  `web/src/style.css`).
- Protocol unchanged (v1.0) — no `docs/PROTOCOL.md` update needed.

## 2026-10-02 — voxel tower v0.1 (branch `voxel-tower-build`)

- Built per `docs/HYTOPIA_INTEGRATION_SPEC.md` §§1–4 — Phases 1–3 in one
  pass, per Speechless ("build it all now"):
  - **`web/`** — Vite + Three.js voxel-hybrid walkable tower. 4 floors per
    README: F1 forge+market (ember particles, flickering forge light,
    obsidian-enchanted tools = black metal + glowing orange seams, floating
    Spellbook with cyan runes over the central counter, offer boards with
    the three slips, 3 lantern stalls, "Panda Park · LOT-22" sign), F2 south
    balcony over the lake, F3 warm-lit living quarters, F4 crown with cyan
    neon rim + orange flame tip. Night scene: full moon south over the
    lake, flat voxel town grid, purple fog, exposure 1.2. Controls:
    hover-look (no button held) after the entry click, WASD, Space jump,
    V first/third person, click-drag fallback. Procedural voxel wizard
    PLACEHOLDER avatar (cream body, bent purple hat) — the aWizard GLB is
    held for Speechless's approval and is NOT embedded. HUD footer marks
    v0.1 as grey-box: procedural stand-ins, final art pending.
  - **`server/`** — Node + `ws`, port 8787. Server-authoritative relay:
    20Hz state broadcast, join/leave, chat, name sanitization, world-bounds
    clamp, anti-teleport (>12u), stale-seq drop, per-client rate limits.
  - **`docs/PROTOCOL.md`** — JSON `t`-tagged packet schema, informed by a
    sparse skim of HYTOPIA `protocol/` (patterns only: typed packets, fixed
    tick, handshake identity, server authority). No engine code vendored.
- **Verification:** `npm run build` green (zero errors); `node server.js`
  starts; smoke test 6/6 green (two clients see each other move, chat
  relays, join/leave broadcast). Headless screenshot NOT feasible — this
  VM's Chromium refuses all localhost navigations
  (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`); runtime behavior
  verified via build + protocol smoke test instead.
- **Compliance (§6 of the spec):** no `hytopia-source/assets/` or
  `@hytopia.com/assets` files (sparse `protocol/`-only skim, clone
  deleted); no `hytopiagg/sdk` code; no MIT engine code adapted, so no
  `third_party/hytopia/NOTICE.md` needed; no CC0 packs used (100%
  procedural geometry — cleaner than the CC0 plan); nothing calls, embeds,
  or depends on hytopia.com. Canonical spelling "obsidian" throughout.
- PR: https://github.com/awizardxch/Nightspire-22/pull/1 (voxel-tower-build → main).

## 2026-09-30 — concept art v0.1

- Two renders generated from `docs/image-spec.md`:
  - **Hero**: night establishing shot from across the lake — full moon, cyan
    crown, forge-heart tip, "Panda Park · LOT-22" sign over the market
    stalls. (`concept-art/lot22-hero-nightspire-tower.webp`)
  - **Floor 1 close pass**: the forge — obsidian-enchanted tools
    (metal-bodied, glowing seams), floating Spellbook with cyan runes,
    offer boards pinned with slips.
    (`concept-art/lot22-forge-market-floor1.webp`)
- Grounded facts (from the 2026-09-30 survey in the Nightspire Exchange
  spec, `workspace/goals/nightspire-exchange-p2p-marketplace/`):
  - Site: Panda Park lot-22, 18 squares, x 8..10 / z 28..33
  - Ward: cultural, ring 1, heightCap 3 (tallest in town), rate 40/sq
  - Lake edge at z26; lot-22 one row back, lake to the south
  - Town is a flat grid — no mountains/hills; elevation is vertical only
  - Floors allowed: 4
  - Approved layout: F1 forge+market / F2 balcony w/ lake views /
    F3 living quarters / F4 Nightspire tower
- Open questions (for Speechless):
  - Realism level — painterly concept art vs. stylized render?
  - Muses in the market — silhouettes or more present?
  - Dawn variant for the "first raise" moment?
