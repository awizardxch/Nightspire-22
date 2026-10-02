# Build notes — Nightspire-22

Running notes on the tower build. Newest at top.

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
- PR: voxel-tower-build → main (link below once opened).

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
