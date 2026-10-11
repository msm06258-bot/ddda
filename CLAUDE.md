# Hearth & Mound — Project Notes

Persistent notes for anyone (human or Claude) working on this repo. Update at the end of every session.

## Vision
A RimWorld-meets-Paradox colony and dynasty sim set in the Chalcolithic/Neolithic Proto-Indo-European
world (steppe and Balkans, ~4500–2500 BCE). The player guides a small band of PIE-speaking pastoralists
from a seasonal camp to a permanent village over many generations. The storyteller is "The Ancestors".
Tone: grounded, mythic, systemic. No fantasy magic — omens, dreams and myths emerge from real
simulation events. No anachronisms (no iron, writing, or wheels until Phase 3).

## Stack (non-negotiable)
TypeScript (strict) · Vite + React (UI shell) · PixiJS (tile map) · Zustand (UI-facing state) ·
Zod (schemas/validation) · Vitest (tests). No backend, Electron, 3D, or multiplayer.

## Architecture rules
- **Deterministic sim.** Fixed timestep at 10 logical ticks/sec. All randomness comes from the seeded
  PRNG in `src/sim/rng.ts` (mulberry32) whose state lives in `GameState.rngState`.
  **Never use `Math.random` (or `Date.now`) in `/src/sim`.**
- **ECS-lite.** Entities are numeric IDs. Components are plain data in `GameState.components.<name>`,
  each a `Record<EntityId, Component>`. Systems are pure-ish functions
  `(state, ctx) => state` where `ctx = { dt, rng, emit }`.
- **Immutable GameState.** Systems return new objects; never mutate the input. The UI holds a
  reference to the latest state in Zustand and never writes to it directly — it sends commands.
- **Event bus.** The sim emits typed `SimEvent`s during a tick; the runner publishes them on
  `EventBus` after the tick for UI and (later) the storyteller.
- **Data-driven content.** Names, terrain, traits, etc. live as JSON in `src/data/content/`, validated
  by Zod schemas in `src/data/` at load.
- **UI-agnostic sim.** Nothing in `/src/sim` or `/src/data` may import React, PixiJS or Zustand.
- **Save/load** is `JSON.stringify(GameState)` + Zod parse on load (`src/sim/save.ts`).
- Boring, readable code. Small files, named exports. Tests for every sim system under `/tests`.

## Repo layout
```
src/sim    tick loop, systems, components, RNG, event bus, save/load
src/data   Zod schemas + JSON content (content/*.json)
src/ui     React components, PixiJS renderer, Zustand stores
src/dev    dev tools (spawn pawn, trigger event, time controls)
tests      Vitest specs mirroring src/sim
```

## Commands
- `npm run dev` — start the game in the browser
- `npm run test` — run Vitest once
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + production build

## Current phase: Phase 1 — local colony sim
See "Status" for what exists. Out of scope for Phase 1: regional map, dynasties, tech tree (beyond a
stub), language drift, modding, art assets.

## Status
_Last updated: session 1 (Phase 1 foundations)._

Done:
- Project scaffold (Vite 8, React 19, PixiJS 8, Zustand 5, Zod 4, Vitest 5, TypeScript 7).
- Zod schemas (`src/data/schemas/`): GameState, Pawn, Needs, Mood/Memory, Health, Job, Structure,
  Stockpile/Resource, Tile/TileMap, SimEvent, plus content defs (names, terrain, traits).
- Content JSON (`src/data/content/`): PIE-ish names, terrain, traits — validated at load (`src/data/content.ts`).
- Sim core: mulberry32 RNG, fixed-tick `stepTick`, clock accumulator (pause/1x/3x), event bus,
  runner, entity/component helpers, calendar (`time.ts`), value-noise map generation, pawn spawning
  with reciprocal kin, `createNewGame`, JSON save/load.
- UI: PixiJS map (terrain, structures, pawns, click-to-select), time controls, rAF game loop.
- Tests: rng, loop/clock/bus, entities, mapgen, new game, calendar, schemas, content, save/load round-trip.

Not yet: any gameplay systems (`src/sim/systems/index.ts` is empty — pawns stand still), pawn list /
pawn panel / resource bar / event log, dev panel, save/load UI, buildings placement.

## Calendar (tunable in `src/sim/time.ts`)
10 ticks = 1 real second at 1x · 1 day = 600 ticks (60 s) · 1 season = 10 days · 1 year = 4 seasons.

## Decisions
(one line each: decision — rationale)
- Components are `Record<string(entityId), T>`, not `Map` — JSON-serializable for save/load with no conversion layer.
- Systems take `(state, ctx)` where `ctx = { dt, tick, rng, emit }` rather than `(state, dt)` — keeps randomness and events explicit and deterministic without globals.
- RNG state is written back to `GameState.rngState` after each tick — save/load mid-game resumes the identical random sequence.
- Phase 1 uses a single colony-wide stockpile (no hauling, no per-item entities) — keeps job AI small; storage pits will raise capacity / cut spoilage instead.
- Needs, mood and health are 0..1 (1 = good) — one scale for all utility scoring.
- Ages are stored as `birthTick` (negative for founders) — age is always derived, never drifts.
- Founding band = households (couple + 1–2 children) plus an elder for an odd count — gives kin structure from tick 0.
- Map generation forces a radius-3 grass clearing at the center for the camp + starting hearth — guarantees a valid spawn.
- Time-speed changes how many ticks run per frame, never `dt`; per-frame ticks are capped at 30 and excess dropped — avoids spiral-of-death after tab stalls.
- No Immer: immutable updates via spread helpers in `entities.ts` — avoids an extra dependency; revisit if systems get verbose.
- TypeScript 7 (native compiler) because it's current `latest`; pin to 5.x if tooling breaks.
