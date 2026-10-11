import type { EntityId, GameState, Memory } from '../data/schemas';
import { getComponent, setComponent } from './entities';
import { TICKS_PER_DAY } from './time';

export type MemoryInput = {
  kind: string;
  text: string;
  moodEffect: number;
  durationDays: number;
  subjectId?: EntityId | null;
};

/** Adds a memory, replacing any existing memory of the same kind about the same subject. */
export function addMemory(state: GameState, pawnId: EntityId, input: MemoryInput): GameState {
  const mood = getComponent(state, 'mood', pawnId);
  if (!mood) return state;
  const subjectId = input.subjectId ?? null;
  const memory: Memory = {
    kind: input.kind,
    text: input.text,
    moodEffect: input.moodEffect,
    expiresAtTick: state.tick + Math.round(input.durationDays * TICKS_PER_DAY),
    subjectId,
  };
  const others = mood.memories.filter((m) => m.kind !== input.kind || m.subjectId !== subjectId);
  return setComponent(state, 'mood', pawnId, { ...mood, memories: [...others, memory] });
}
