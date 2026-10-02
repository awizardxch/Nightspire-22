# HYTOPIA Source Integration Spec — nightspire-22

**Repo:** `nightspire-22` (Lot 22, Panda Park — the Nightspire market tower)
**Status:** concept phase (README + concept-art + docs). No code yet.
**Author:** aWizard, per Speechless, 2026-10-02.

## 0. License verdict — read this first

HYTOPIA's GitHub org splits licensing by directory. Get this wrong and the
build ships a violation:

| Path | License | Usable in nightspire-22? |
|---|---|---|
| `hytopia-source/server/`, `client/`, `protocol/` | **MIT** (repo-root `LICENSE.md`) | **Yes** — fork, modify, ship |
| `hytopia-source/assets/` | **HGAL v1.0** (own `LICENSE.md` in that dir) | **No** — platform-exclusive |
| `hytopia-source/sdk/` (submodule → `hytopiagg/sdk`) | Limited Use License (revocable) | **No** |
| npm `@hytopia.com/assets` | **HGAL v1.0** (`LICENSE.md` in tarball) | **No** |

**The art assets are NOT MIT.** HGAL §3 forbids use "outside the HYTOPIA
Platform… including other game engines, storefronts, websites, or open
repositories." nightspire-22 does not run on hytopia.com, so the models,
textures, audio, and maps are off-limits — including the npm package, which
carries the same HGAL. Do not `npm install @hytopia.com/assets`.

What IS usable: the **engine source code** (MIT). That is the networking,
game-loop, entity, physics, and protocol code — not the art.

## 1. Source links

- Engine monorepo (MIT): https://github.com/hytopiagg/hytopia-source
- Root MIT license: https://github.com/hytopiagg/hytopia-source/blob/main/LICENSE.md
- Assets dir license (HGAL, do-not-use): https://github.com/hytopiagg/hytopia-source/blob/main/assets/LICENSE.md
- SDK repo (limited license, do-not-use): https://github.com/hytopiagg/sdk
- SDK license (revocable limited-use): https://github.com/hytopiagg/sdk/blob/main/LICENSE.md
- hytopia.com status: **platform paused** (funding challenges, 1–3 mo downtime
  as of 2026-10-02) — nothing can ship on their hosting right now anyway.

## 2. What to pull from the engine (MIT)

Clone and keep it OUT of this repo's dependency tree — vendor only what we
adapt, under `third_party/hytopia/` with the MIT notice preserved:

```bash
git clone --depth 1 https://github.com/hytopiagg/hytopia-source.git /tmp/hytopia-source
# Take: protocol/, server/src, client/src — reference + adapt
# Leave: assets/, sdk/, server/assets (if symlinked to HGAL assets)
```

| Engine part | What it gives nightspire-22 |
|---|---|
| `protocol/` (packet schemas, `packets/`, `schemas/`) | Reference design for any multiplayer the tower ever needs (market stalls with live offer boards, visitors walking the floors together). Study the packet layout; do not import the runtime. |
| `server/src` (entity lifecycle, game loop, anti-cheat/verification) | Patterns for a future self-hosted multiplayer server. Server-authoritative input relay is the model to copy if the tower goes multiplayer. |
| `client/src` (browser voxel renderer, prediction) | Rendering/input patterns. Our build is Three.js (matches the Forge artifact and Net1's town square), so treat this as architecture reference, not a dependency. |

**Rule:** adapt patterns, do not adopt the engine as a runtime dependency.
It is alpha, last touched ~Mar 2026, and shaped around a paused hosted
platform. We own our stack.

## 3. Assets — use CC0 instead

HYTOPIA's art is HGAL-locked, so source placeholder art from real CC0 packs:

- **Quaternius** (CC0, huge low-poly packs — blocks, nature, furniture, characters):
  https://quaternius.com
- **Kenney** (CC0, game-ready packs incl. voxel/block styles):
  https://kenney.nl/assets
- three.js examples assets (MIT): https://github.com/mrdoob/three.js/tree/dev/examples

Vendor chosen packs under `assets/third_party/<pack>/` with their license
file. These are **grey-box stand-ins only** — see §5.

## 4. Integration plan for the nightspire-22 build

Target: a **self-hosted, walkable 3D Nightspire tower** (Three.js, browser),
matching the repo README's 4-floor program. This aligns with the existing
Forge web artifact approach and Net1's town-square stack — no third-party
platform in the critical path.

### Phase 1 — Grey-box tower (now)
- Scaffold `web/` in this repo: Vite + Three.js scene of lot-22.
- Mass the 4 floors per README: F1 forge+market (largest footprint), F2
  balcony facing south over the lake, F3 living quarters, F4 Nightspire.
- Dress with CC0 placeholders: block textures, light-pole lanterns,
  particle fire/smoke/sparks at the forge, night skybox + full moon.
- Deliverable: orbit/walkable scene, committed here.

### Phase 2 — Forge identity pass
- Replace placeholders on F1 with Nightspire art direction (§5): glassy
  obsidian panes in forged metal, glowing seams, the floating Spellbook
  ledger over the central counter, market stalls with offer slips.
- Suno audio: forge ambience + market murmur from the Forge's own pipeline
  (never HGAL audio).

### Phase 3 — Multiplayer (only if Speechless asks)
- Design packet schema informed by HYTOPIA's `protocol/` patterns.
- Self-hosted WS/WebTransport server; server-authoritative movement.
- No HYTOPIA platform dependency at any phase.

## 5. Art direction constraints (non-negotiable)

From the repo README and Speechless's standing decisions:

- **Theme tokens:** deep-space `#060810` / `#0a0c18`, cyan accent `#00d9ff`,
  inner orange glow `#ff6600`, far purple `#1a082b`. Full moon 🌕 over the lake.
- **Obsidian material truth:** forge tools and fixtures are **metal-bodied,
  obsidian-enchanted** — glassy black panes set in forged metal with glowing
  seams. Never pure obsidian (volcanic glass can't take a hammer blow).
- **Terminology:** the material is **obsidian**, not "rock". 🪨 stays the symbol.
- CC0 grey-box art must be visibly placeholder; nothing ships as final art
  without the identity pass.

## 6. Compliance checklist (before any commit touching this)

- [ ] No file from `hytopia-source/assets/` or `@hytopia.com/assets` in the repo.
- [ ] No code from `hytopiagg/sdk` in the repo.
- [ ] Any adapted MIT engine code carries the MIT copyright notice
      (`third_party/hytopia/NOTICE.md` with source URL + commit hash).
- [ ] CC0 packs vendored with their license files.
- [ ] Nothing in the build calls, embeds, or depends on hytopia.com.

## 7. Standing town constraints that apply

- No Musebuck spending without Speechless's separate approval.
- Nothing posted to Musebook about the Chia onboarding project (embargo).
- Replies inside live Musebook threads only; drafts otherwise.
- Canonical spelling: **obsidian**.
