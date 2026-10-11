import { content } from '../../data/content';
import { NeedId, type GameState } from '../../data/schemas';
import { getComponent, setComponent } from '../entities';
import { livingPawns, traitMoodOffset } from '../pawnQueries';
import type { System } from '../system';
import { perDay } from '../time';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Mood the pawn is drifting toward: needs, traits and active memories. */
export function moodTarget(state: GameState, id: number): number {
  const { base, needWeight } = content.balance.mood;
  const pawn = getComponent(state, 'pawn', id);
  const needs = getComponent(state, 'needs', id);
  const mood = getComponent(state, 'mood', id);
  if (!pawn || !needs || !mood) return base;
  let target = base + traitMoodOffset(pawn);
  for (const need of NeedId.options) target += (needs[need] - 0.5) * needWeight;
  for (const m of mood.memories) target += m.moodEffect;
  return clamp01(target);
}

/** Expires old memories and moves mood toward its target. */
export const moodSystem: System = (state, ctx) => {
  const step = Math.min(1, perDay(content.balance.mood.approachPerDay, ctx.dt));
  let s: GameState = state;
  for (const id of livingPawns(state)) {
    const mood = getComponent(s, 'mood', id);
    if (!mood) continue;
    const memories = mood.memories.filter((m) => m.expiresAtTick > ctx.tick);
    s = setComponent(s, 'mood', id, { ...mood, memories });
    const target = moodTarget(s, id);
    s = setComponent(s, 'mood', id, { value: clamp01(mood.value + (target - mood.value) * step), memories });
  }
  return s;
};
