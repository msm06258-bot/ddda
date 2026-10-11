import { content } from '../data/content';
import type { EntityId, GameState, NeedId, Pawn } from '../data/schemas';
import { entitiesWith, getComponent } from './entities';
import { ageInYears } from './time';

export function isAlive(state: GameState, id: EntityId): boolean {
  return getComponent(state, 'pawn', id) !== undefined && getComponent(state, 'corpse', id) === undefined;
}

/** Living pawn IDs in ascending order. */
export function livingPawns(state: GameState): EntityId[] {
  return entitiesWith(state, 'pawn').filter((id) => !(String(id) in state.components.corpse));
}

export function pawnName(state: GameState, id: EntityId): string {
  return getComponent(state, 'pawn', id)?.name ?? `#${id}`;
}

export function pawnAge(state: GameState, id: EntityId): number {
  const pawn = getComponent(state, 'pawn', id);
  return pawn ? ageInYears(pawn.birthTick, state.tick) : 0;
}

/** Product of all trait multipliers on a need's decay rate. */
export function traitNeedMultiplier(pawn: Pawn, need: NeedId): number {
  return pawn.traits.reduce((m, t) => m * (content.traits[t]?.needDecay[need] ?? 1), 1);
}

export function traitMoodOffset(pawn: Pawn): number {
  return pawn.traits.reduce((sum, t) => sum + (content.traits[t]?.moodOffset ?? 0), 0);
}

export function isKin(pawn: Pawn, other: EntityId): boolean {
  return pawn.kin.some((k) => k.targetId === other);
}
