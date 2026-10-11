import { content } from '../../data/content';
import type { DeathCause, GameState } from '../../data/schemas';
import { killPawn } from '../death';
import { getComponent, setComponent } from '../entities';
import { livingPawns, pawnAge } from '../pawnQueries';
import type { System } from '../system';
import { perDay, TICKS_PER_DAY } from '../time';

/** Chance per day that a pawn of this age dies of old age. */
export function oldAgeDailyChance(ageYears: number): number {
  const { oldAgeOnsetYears, oldAgeDailyChancePerYear } = content.balance.health;
  return Math.max(0, ageYears - oldAgeOnsetYears) * oldAgeDailyChancePerYear;
}

/** Starvation and exposure damage, slow regeneration, old age, and death. */
export const healthSystem: System = (state, ctx) => {
  const h = content.balance.health;
  const newDay = ctx.tick % TICKS_PER_DAY === 0;
  let s: GameState = state;

  for (const id of livingPawns(state)) {
    const needs = getComponent(s, 'needs', id);
    const health = getComponent(s, 'health', id);
    if (!needs || !health) continue;

    let value = health.value;
    let lastHarm: DeathCause | null = health.lastHarm;
    if (needs.hunger <= 0) {
      value -= perDay(h.starvationPerDay, ctx.dt);
      lastHarm = 'starvation';
    }
    if (needs.warmth <= 0) {
      value -= perDay(h.exposurePerDay, ctx.dt);
      lastHarm = 'exposure';
    }
    if (needs.hunger > h.regenNeedFloor && needs.warmth > h.regenNeedFloor) {
      value += perDay(h.regenPerDay, ctx.dt);
    }
    value = Math.min(1, Math.max(0, value));
    s = setComponent(s, 'health', id, { value, lastHarm });

    if (value <= 0) {
      s = killPawn(s, id, lastHarm ?? 'starvation', ctx);
    } else if (newDay && ctx.rng.chance(oldAgeDailyChance(pawnAge(s, id)))) {
      s = killPawn(s, id, 'oldAge', ctx);
    }
  }
  return s;
};
