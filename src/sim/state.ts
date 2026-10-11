import { SCHEMA_VERSION, type GameState, type Tile } from '../data/schemas';
import { seedToState } from './rng';

/** A blank world: all-grass map, no entities, empty stockpile. Useful for tests and as a base for new games. */
export function createEmptyState(seed: number, width = 64, height = 64): GameState {
  const tiles: Tile[] = Array.from({ length: width * height }, () => ({ terrain: 'grass' }));
  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    tick: 0,
    rngState: seedToState(seed),
    nextEntityId: 1,
    map: { width, height, tiles },
    resources: { food: 0, meals: 0, wood: 0, stone: 0, hides: 0 },
    components: {
      pawn: {},
      position: {},
      needs: {},
      mood: {},
      health: {},
      job: {},
      structure: {},
      movement: {},
      corpse: {},
    },
  };
}
