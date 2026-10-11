import type { GameState } from '../data/schemas';
import { createEventBus, type EventBus } from '../sim/eventBus';
import { createSimRunner, type SimRunner } from '../sim/runner';
import { defaultSystems } from '../sim/systems';

/** The live simulation instance. The UI reads state via the store and never mutates it. */
export type GameSession = { runner: SimRunner; bus: EventBus };

export function createSession(initial: GameState): GameSession {
  const bus = createEventBus();
  return { runner: createSimRunner(initial, defaultSystems, bus), bus };
}
