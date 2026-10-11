import type { EntityId, GameState, Needs, Pawn, TilePos } from '../src/data/schemas';
import { getComponent, setComponent } from '../src/sim/entities';
import { spawnPawn } from '../src/sim/pawns';
import { createRng } from '../src/sim/rng';
import { createEmptyState } from '../src/sim/state';
import { withContext } from '../src/sim/step';
import type { SystemContext } from '../src/sim/system';

export const FULL_NEEDS: Needs = { hunger: 1, warmth: 1, rest: 1, social: 1, meaning: 1 };

export type TestPawn = {
  position?: TilePos;
  ageYears?: number;
  needs?: Partial<Needs>;
  traits?: string[];
  skills?: Partial<Pawn['skills']>;
  sex?: Pawn['sex'];
};

/** Adds a pawn with deterministic, full needs and no traits unless overridden. */
export function addPawn(state: GameState, opts: TestPawn = {}): { state: GameState; id: EntityId } {
  const rng = createRng(state.rngState);
  const r = spawnPawn(state, rng, {
    sex: opts.sex ?? 'female',
    ageYears: opts.ageYears ?? 25,
    position: opts.position ?? { x: 5, y: 5 },
  });
  let s: GameState = { ...r.state, rngState: rng.state };
  const pawn = getComponent(s, 'pawn', r.id)!;
  s = setComponent(s, 'pawn', r.id, {
    ...pawn,
    traits: opts.traits ?? [],
    skills: { ...pawn.skills, ...opts.skills },
  });
  s = setComponent(s, 'needs', r.id, { ...FULL_NEEDS, ...opts.needs });
  s = setComponent(s, 'mood', r.id, { value: 0.5, memories: [] });
  return { state: s, id: r.id };
}

/** A small all-grass world for unit tests. */
export function emptyWorld(seed = 1, size = 24): GameState {
  return createEmptyState(seed, size, size);
}

/** Runs a command with a context and returns the state (events discarded) or both. */
export function apply(state: GameState, fn: (s: GameState, ctx: SystemContext) => GameState) {
  return withContext(state, fn);
}

import type { StructureKind } from '../src/data/schemas';
import { createEntity } from '../src/sim/entities';

/** Adds a complete (or partially built) structure at pos. */
export function addStructure(
  state: GameState,
  kind: StructureKind,
  pos: TilePos,
  progress = 1,
): { state: GameState; id: EntityId } {
  const c = createEntity(state);
  let s = setComponent(c.state, 'structure', c.id, { kind, progress });
  s = setComponent(s, 'position', c.id, pos);
  return { state: s, id: c.id };
}
