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
(updated at end of each session)

## Decisions
(one line each: decision — rationale)
