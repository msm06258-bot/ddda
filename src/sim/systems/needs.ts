import { content } from '../../data/content';
import { NeedId, type GameState } from '../../data/schemas';
import { getComponent, setComponent } from '../entities';
import { livingPawns, traitNeedMultiplier } from '../pawnQueries';
import type { System } from '../system';
import { perDay } from '../time';

/** Decays hunger, rest, social and meaning over time. Warmth is driven by the temperature system. */
export const needsSystem: System = (state, ctx) => {
  const { decayPerDay } = content.balance.needs;
  let s: GameState = state;
  for (const id of livingPawns(state)) {
    const pawn = getComponent(s, 'pawn', id);
    const needs = getComponent(s, 'needs', id);
    if (!pawn || !needs) continue;
    const next = { ...needs };
    for (const need of NeedId.options) {
      const rate = decayPerDay[need] * traitNeedMultiplier(pawn, need);
      if (rate > 0) next[need] = Math.max(0, needs[need] - perDay(rate, ctx.dt));
    }
    s = setComponent(s, 'needs', id, next);
  }
  return s;
};
