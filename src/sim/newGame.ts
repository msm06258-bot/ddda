import type { EntityId, GameState, TilePos } from '../data/schemas';
import { createEntity, setComponent } from './entities';
import { walkableTilesNear } from './map';
import { generateMap } from './mapgen';
import { linkKin, spawnPawn } from './pawns';
import { createRng, type Rng } from './rng';
import { createEmptyState } from './state';

export type NewGameOptions = {
  seed: number;
  width?: number;
  height?: number;
  /** Band size, 6..10 in Phase 1. */
  pawnCount?: number;
};

export const STARTING_RESOURCES = { food: 40, meals: 0, wood: 20, stone: 5, hides: 4 } as const;

/**
 * Spawns the starting band as households: a couple plus 1–2 children each,
 * with a lone elder filling an odd slot.
 */
function spawnBand(state: GameState, rng: Rng, count: number, spots: TilePos[]): GameState {
  let s = state;
  let spot = 0;
  const nextSpot = (): TilePos => spots[spot++ % spots.length]!;
  let remaining = count;

  while (remaining > 0) {
    if (remaining === 1) {
      s = spawnPawn(s, rng, { sex: rng.pick(['female', 'male']), ageYears: rng.int(52, 64), position: nextSpot() }).state;
      remaining -= 1;
      continue;
    }

    const motherAge = rng.int(24, 40);
    const father = spawnPawn(s, rng, { sex: 'male', ageYears: motherAge + rng.int(0, 7), position: nextSpot() });
    const mother = spawnPawn(father.state, rng, { sex: 'female', ageYears: motherAge, position: nextSpot() });
    s = linkKin(mother.state, father.id, 'spouse', mother.id);
    remaining -= 2;

    const kidCount = Math.min(remaining, rng.int(1, 3));
    const kids: EntityId[] = [];
    for (let k = 0; k < kidCount; k++) {
      const kid = spawnPawn(s, rng, {
        sex: rng.pick(['female', 'male']),
        ageYears: rng.int(1, Math.min(motherAge - 15, 18)),
        position: nextSpot(),
      });
      s = linkKin(kid.state, kid.id, 'parent', father.id);
      s = linkKin(s, kid.id, 'parent', mother.id);
      for (const sib of kids) s = linkKin(s, kid.id, 'sibling', sib);
      kids.push(kid.id);
    }
    remaining -= kidCount;
  }
  return s;
}

export function createNewGame(opts: NewGameOptions): GameState {
  const { seed, width = 64, height = 64, pawnCount = 8 } = opts;
  const base = createEmptyState(seed, width, height);
  const rng = createRng(base.rngState);

  let s: GameState = { ...base, map: generateMap(rng, width, height), resources: { ...STARTING_RESOURCES } };

  const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const hearth = createEntity(s);
  s = setComponent(hearth.state, 'structure', hearth.id, { kind: 'hearth', progress: 1 });
  s = setComponent(s, 'position', hearth.id, center);

  const spots = walkableTilesNear(s.map, center, 3).filter((p) => p.x !== center.x || p.y !== center.y);
  s = spawnBand(s, rng, pawnCount, spots);

  return { ...s, rngState: rng.state };
}
