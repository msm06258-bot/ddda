import { content } from '../data/content';
import type { EntityId, GameState } from '../data/schemas';
import { getComponent } from '../sim/entities';
import { pawnAge, pawnName } from '../sim/pawnQueries';

export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const whole = (v: number) => Math.floor(v).toString();

export function jobLabel(state: GameState, id: EntityId): string {
  const job = getComponent(state, 'job', id);
  return job ? content.jobs[job.kind].label : 'Thinking';
}

export function pawnSummary(state: GameState, id: EntityId): string {
  const pawn = getComponent(state, 'pawn', id);
  return pawn ? `${pawnName(state, id)}, ${pawnAge(state, id)}` : `#${id}`;
}

export function kinLabel(state: GameState, type: keyof typeof content.lore.kinTerms, targetId: EntityId): string {
  const other = getComponent(state, 'pawn', targetId);
  return other ? content.lore.kinTerms[type][other.sex] : type;
}
