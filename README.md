# Hearth & Mound

A colony and dynasty sim set among Proto-Indo-European pastoralists on the Chalcolithic steppe
(~4500–2500 BCE). Guide a small band from a seasonal camp to a permanent village over many
generations, watched over by **The Ancestors**.

## Running it

Requires Node 20+.

```bash
npm install
npm run dev        # open the printed URL (default http://localhost:5173)
npm run test       # Vitest
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build into dist/
```

## How to play

Your band of eight has made camp around a hearth on the steppe. Pawns decide for themselves what to
do — eat, sleep, gather, hunt, cook, chop wood, quarry stone, talk at the fire, honor the ancestors —
based on their needs, skills and what the band lacks. You shape the camp:

- **Build** shelters, storage pits, hearths and burial mounds from the build bar, then click the map.
  Pawns build them. Winter is the test: you need wood for the hearth, shelter for everyone, and food
  stored in pits.
- **Watch** a pawn by clicking it on the map or in the band list: needs, traits, skills, kin and memories.
- **Read** the chronicle. Deaths, burials, rites and the turning seasons are recorded there.
- **Time**: space pauses, `1` and `3` set the speed. Save to a file or to the browser.
- **Dev tools**: press `` ` `` (backtick) or click *Dev* to spawn pawns, grant resources, trigger
  events, kill a pawn, or fast-forward.

The dead are buried by the living in a kurgan near camp, and later rites at the mound remember them by name.

## Project layout

```
src/sim     deterministic simulation (systems, jobs, RNG, save/load) — no UI imports
src/data    Zod schemas + JSON content (all tuning numbers and flavor text)
src/ui      React UI, PixiJS map renderer, Zustand store
src/dev     dev commands and panel
tests       Vitest specs
```

See `CLAUDE.md` for architecture rules, design decisions and current status.

## Roadmap

- **Phase 1** (done): a playable single-settlement colony sim. Needs, jobs, seasons, building,
  death and burial.
- **Phase 2:** births and dynasties across generations, herds as wealth, a regional map with
  neighbouring bands, and The Ancestors as a storyteller drawing on the colony's history.
- **Phase 3:** language drift, wider technology (wheel, metallurgy) and migrations.
