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
_Last updated: session 2 — Phase 1 feature-complete; next is playtesting and tuning._

All ten Phase 1 items are in place:
- **Map**: 64×64 value-noise terrain; the camp is placed in the largest connected walkable region with
  a guaranteed clearing, a starting hearth and one hide shelter.
- **Pawns**: name, age (`birthTick`), sex, reciprocal kin, skills (0–20), traits, needs, mood with
  memories, health. Founding band = households.
- **Needs/mood/health** (`systems/needs.ts`, `mood.ts`, `health.ts`): data-driven decay with trait
  multipliers; mood drifts toward a target from needs + traits + memories; starvation/exposure damage,
  regen, old-age death.
- **Movement**: A* (`pathfinding.ts`), `movement` component, terrain move costs.
- **Climate** (`environment.ts`, `systems/warmth.ts`, `stockpile.ts`, `seasons.ts`): seasonal +
  diurnal + per-day weather temperature (pure function of seed+tick), warmth from lit hearth and
  shelters, spoilage scaled by temperature and slowed by storage pits, hearths burn wood, season omens.
- **Jobs** (`jobs/`, `systems/jobs.ts`): utility AI scores every job (need urgency or colony demand ×
  skill × night factor − distance + small noise), assigns the best reachable one; interrupts for
  critical needs; jobs: idle, eat, rest, warmUp, socialize, performRitual, forage, hunt, cook,
  chopWood, quarry, build, bury.
- **Structures** (`structures.ts`): hearth, shelter, storage pit, burial mound; blueprints paid up front
  and built by pawns.
- **Death & burial** (`death.ts`): corpse component; survivors bury the dead in the nearest mound (or
  raise a new kurgan), with funeral log line, meaning, and burial/grief memories. Rites at an ancestor
  mound name the ancestor.
- **UI**: map (night tint, smooth movement, click to select/place), resource bar, build menu, pawn list,
  pawn panel (needs, traits, skills, kin with PIE kin terms, memories), chronicle, time controls
  (space/1/3), save/load (file + browser quick save), new game by seed.
- **Dev panel** (`src/dev/`, toggle with backtick): spawn pawn, +50 resources, kill selected, trigger
  events (omen, cold snap, aurochs herd, rot), fast-forward 6h/1 day/1 season. In dev builds the store
  is on `window.hm`.
- **Tests**: 125 Vitest specs incl. need decay, job selection, food consumption, spoilage, death &
  burial, save/load round-trip with all systems, and a first-year balance test on three seeds.

Known gaps / next candidates:
- No births, so the band only shrinks (dynasties are Phase 2).
- No cancel/deconstruct for blueprints; one-tile structures only.
- Chronicle (event log) lives in the UI store and is not saved.
- Resource nodes never deplete; hunting has no animal entities.
- Balance is "survives year 1 without player input"; it is probably too easy once the player builds.

## Calendar (tunable in `src/sim/time.ts`)
10 ticks = 1 real second at 1x · 1 day = 600 ticks (60 s) · 1 season = 10 days · 1 year = 4 seasons.

## Where the numbers live
`src/data/content/`: `balance.json` (rates, thresholds), `jobs.json` (durations, yields, base utility),
`structures.json` (costs, build time), `climate.json` (temperatures, seasonal yields), `lore.json`
(myth fragments, death lines, season omens, kin terms), `names.json`, `terrain.json`, `traits.json`.
A tuning change should usually be a JSON edit; run `npm run test` afterwards (the balance test guards
against an unwinnable first year).

## Decisions
(one line each: decision — rationale)
- Components are `Record<string(entityId), T>`, not `Map` — JSON-serializable for save/load with no conversion layer.
- Systems take `(state, ctx)` where `ctx = { dt, tick, rng, emit }` rather than `(state, dt)` — keeps randomness and events explicit and deterministic without globals.
- RNG state is written back to `GameState.rngState` after each tick — save/load mid-game resumes the identical random sequence.
- Phase 1 uses a single colony-wide stockpile (no hauling, no per-item entities) — keeps job AI small; storage pits raise capacity / cut spoilage instead.
- Needs, mood and health are 0..1 (1 = good) — one scale for all utility scoring.
- Ages are stored as `birthTick` (negative for founders) — age is always derived, never drifts.
- Founding band = households (couple + 1–2 children) plus an elder for an odd count — gives kin structure from tick 0.
- Time-speed changes how many ticks run per frame, never `dt`; per-frame ticks are capped at 30 and excess dropped — avoids spiral-of-death after tab stalls.
- No Immer: immutable updates via spread helpers in `entities.ts` — avoids an extra dependency; revisit if systems get verbose.
- TypeScript 7 (native compiler) because it's current `latest`; pin to 5.x if tooling breaks.
- Added a fifth resource, `meals` (cooked food, more nourishing than raw) — gives the cook job a reason to exist.
- Added jobs beyond the brief: `eat`, `warmUp`, `quarry`, `bury`, `idle` — eating/warming need a place to happen, stone needs a source, the dead need burying.
- Temperature is a pure function of seed + tick (no weather state) — nothing extra to save, trivially deterministic.
- "Lit hearth" = any complete hearth while the shared stockpile has wood; hearths burn wood continuously — simple fuel loop without per-hearth state.
- Structure costs are paid when the blueprint is placed — no hauling in Phase 1.
- A death leaves a `corpse` component on the same entity (pawn identity kept) — the dead stay addressable for kin, mounds, and future ancestor/storyteller systems.
- Burial auto-raises a kurgan near camp if no mound exists — a death always resolves into a mound.
- Social and meaning only drive behavior below a "luxury" threshold (0.3) — otherwise pawns chat instead of gathering food for winter.
- Work utility scales with colony demand (food days vs a seasonal target; wood/stone vs targets), dropping to 0 for wood/stone once the target is met — stops pointless hoarding.
- Camp is placed in the largest connected walkable region — a walled-in camp starved a whole band in playtesting (seed 15684).
- Tile targets are found with an outward ring search that stops early — a full-map scan per decision dominated tick time.
- The starting camp includes one hide shelter (sleeps 4 of 8) — matches "seasonal camp" and gives the player a first goal.
- Dev builds expose the Zustand store as `window.hm` — handy for console debugging and scripted playtests.
