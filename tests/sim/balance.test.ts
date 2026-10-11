import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/data/schemas';
import { unburiedCorpses } from '../../src/sim/death';
import { createNewGame } from '../../src/sim/newGame';
import { livingPawns } from '../../src/sim/pawnQueries';
import { stepTicks } from '../../src/sim/step';
import { defaultSystems } from '../../src/sim/systems';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../../src/sim/time';

/**
 * Headless balance check: with no player input, the default band should get through its first
 * year (including winter) without collapsing. This guards against tuning changes that make the
 * game unwinnable; it is not a target for difficulty.
 */
describe('balance: first year, no player input', () => {
  it.each([1, 2, 15684])('seed %i survives a year', (seed) => {
    const start = createNewGame({ seed });
    const { state, events } = stepTicks(start, defaultSystems, TICKS_PER_YEAR);

    expect(livingPawns(state).length).toBeGreaterThanOrEqual(6);
    const starved = events.filter((e) => e.type === 'pawnDied' && e.cause !== 'oldAge');
    expect(starved).toEqual([]);
    expect(state.resources.food + state.resources.meals).toBeGreaterThan(0);
    // Any deaths get buried within a couple of days.
    const recentDeaths = events.filter((e) => e.type === 'pawnDied' && e.tick > state.tick - 2 * TICKS_PER_DAY);
    expect(unburiedCorpses(state).length).toBeLessThanOrEqual(recentDeaths.length);
    expect(() => GameState.parse(state)).not.toThrow();
  });
});
