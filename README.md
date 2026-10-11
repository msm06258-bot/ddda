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

## Current state (Phase 1, in progress)

- A generated 64×64 map: grass, forest, rock, water and fertile soil.
- A founding band of 8 pawns with names, kinship, skills, traits and needs, camped around a hearth.
- A deterministic fixed-tick simulation (10 ticks/s) with pause / 1× / 3× controls and a calendar.
- Save/load of the full game state as JSON (no UI for it yet).

Gameplay systems come next: needs, jobs, seasons, building, and death with burial. Until they land,
pawns stand still. See `CLAUDE.md` for the architecture and the full Phase 1 checklist.

## Roadmap

- **Phase 1:** a playable single-settlement colony sim (in progress).
- **Phase 2:** a regional map with neighbouring bands, herds as wealth, dynasties and inheritance
  across generations, and The Ancestors storyteller shaping events from colony history.
- **Phase 3:** language drift, wider technology (wheel, metallurgy) and migrations.
