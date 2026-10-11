import type { GameState, SimEvent } from '../data/schemas';
import { createEventBus, type EventBus } from '../sim/eventBus';
import { createSimRunner, type SimRunner } from '../sim/runner';
import { defaultSystems } from '../sim/systems';

/**
 * The live simulation instance. Events are buffered here and drained by the store once per frame,
 * so a fast-forward of thousands of ticks causes one UI update, not thousands.
 */
export type GameSession = {
  runner: SimRunner;
  bus: EventBus;
  drainEvents(): SimEvent[];
};

export function createSession(initial: GameState): GameSession {
  const bus = createEventBus();
  let buffer: SimEvent[] = [];
  bus.onAny((e) => buffer.push(e));
  return {
    runner: createSimRunner(initial, defaultSystems, bus),
    bus,
    drainEvents() {
      const out = buffer;
      buffer = [];
      return out;
    },
  };
}
