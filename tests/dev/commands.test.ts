import { describe, expect, it } from 'vitest';
import { DEV_EVENTS, devGrantResources, devKillPawn, devSpawnPawn } from '../../src/dev/commands';
import { GameState } from '../../src/data/schemas';
import { getComponent } from '../../src/sim/entities';
import { createNewGame } from '../../src/sim/newGame';
import { livingPawns } from '../../src/sim/pawnQueries';
import { apply } from '../helpers';

describe('dev commands', () => {
  it('spawns a valid pawn near camp', () => {
    const s0 = createNewGame({ seed: 1 });
    const { state, events } = apply(s0, devSpawnPawn);
    expect(livingPawns(state)).toHaveLength(livingPawns(s0).length + 1);
    expect(events[0]).toMatchObject({ type: 'pawnSpawned' });
    expect(() => GameState.parse(state)).not.toThrow();
  });

  it('grants resources', () => {
    const s0 = createNewGame({ seed: 1 });
    const s = apply(s0, devGrantResources(10)).state;
    expect(s.resources.stone).toBe(s0.resources.stone + 10);
    const onlyFood = apply(s0, devGrantResources(5, ['food'])).state;
    expect(onlyFood.resources).toEqual({ ...s0.resources, food: s0.resources.food + 5 });
  });

  it('kills a pawn', () => {
    const s0 = createNewGame({ seed: 1 });
    const [first] = livingPawns(s0);
    const s = apply(s0, devKillPawn(first!, 'exposure')).state;
    expect(getComponent(s, 'corpse', first!)?.cause).toBe('exposure');
  });

  it('every triggerable event produces a log line and a valid state', () => {
    for (const ev of Object.values(DEV_EVENTS)) {
      const { state, events } = apply(createNewGame({ seed: 2 }), ev.command);
      expect(events.some((e) => e.type === 'log')).toBe(true);
      expect(() => GameState.parse(state)).not.toThrow();
    }
  });
});
