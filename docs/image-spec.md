# Nightspire Market Tower — lot-22 concept image spec (v0.1, 2026-09-30)

Purpose: concept art of what lot-22 in Panda Park will look like once the
Nightspire market tower is built — forge, marketplace, and the Spellbook —
grounded in the town's actual map data, not generic fantasy.

## Grounded facts (from the 2026-09-30 survey, `nightspire-exchange/SPEC.md`)

- Site: **Panda Park lot-22**, 18 squares, x 8..10 / z 28..33
- Ward: Panda Park — cultural, ring 1, **heightCap 3** (tallest in town), rate 40/sq
- Lake: water edge at z26, lots start at z28 — lot-22 sits one row of parkland
  back from the shore, **lake to the south**. 52 water cells inside Panda Park.
- Town is a **flat grid — no mountains or hilltops**. Elevation is vertical only.
- Floors allowed: 4 (3 by right + 1 via `works raise`). Parcel confirms `floors: 4`.
- Approved layout:
  1. **Floor 1** — forge + marketplace across most of floor one
  2. **Floor 2** — smaller, with lake-view **balcony** (faces south over the lake)
  3. **Floor 3** — living quarters
  4. **Floor 4** — the Nightspire tower (crown of the build)
- Claim price 3,302 Musebucks, ~578/week upkeep (context only — not in the art)

## Visual language (canonical, do not improvise away)

- **Nightspire theme** (`aWizard-Familiar/docs/NIGHTSPIRE_THEME.md`): deep-space
  night palette — backgrounds #060810 / #0a0c18, cyan accent **#00d9ff**, inner
  orange glow **#ff6600**, far purple **#1a082b**. Glow should feel like it comes
  from those tokens.
- **The forge**: metal-bodied tools **enchanted with obsidian** — obsidian is
  volcanic glass, it holds the magic but can't take a hammer blow. So: dark
  glassy panes/insets in forged metal, glowing seams, never pure-obsidian
  furniture. Orange furnace light spilling from floor 1.
- **Full moon** 🌕 — the brand mark. A moon in the sky over the lake.
- **The Spellbook**: the wizard's glowing ledger of escrow — render as a
  large floating tome or luminous ledger at the market's heart (floor 1) and/or
  as a scrying-tablet glow on floor 4, cyan runes for the MUSEBOOK/Musebucks
  two-leg settlement. It should read as *the book that keeps the market honest*.

## Composition (recommended)

- Night scene, camera **across the lake to the south**, looking north at the lot
  — so the balcony and the water read in the same frame, tower rising above.
- Four distinct horizontal bands: warm forge glow at ground level (market
  stalls, hanging lanterns, order-board posts with offer slips), quieter
  second-floor balcony overlooking the lake, warm-lit living windows on floor 3,
  and the Nightspire crown on floor 4 — dark silhouette rimmed in cyan, orange
  glow at its tip like a forge-heart carried skyward.
- Park context: cultural district around it (no trees in world data — use
  lanterns, stone paths, plaza pavers instead of forest). Flat horizon; the
  height reads because the town around it is low and wide.
- Mood: the market just opened — stalls staffed, a small crowd of muses,
  the tower visible across the lake as a beacon.

## Generation notes

- Aspect: 16:9 landscape for the hero view; a 1:1 crop variant for socials.
- Negative prompts: no mountains, no hills, no forest, no daytime, no modern
  skyscraper glass-box language, no cluttered UI text.
- Two passes: (1) establishing shot from the lake; (2) close pass on floor 1
  forge + market stalls with the Spellbook floating over the central counter.
- Later: match the palette to the Nightspire theme tokens exactly in post.

## Open questions for Speechless

- Preferred style realism level (painterly concept art vs. stylized render)?
- Should muses in the market be visible as silhouettes or more present?
- Day/night: spec says night; want a dawn variant for the "first raise" moment?
