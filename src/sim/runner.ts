import type { GameState } from '../data/schemas';
import type { EventBus } from './eventBus';
import { stepTick, withContext } from './step';
import type { System, SystemContext } from './system';

/**
 * Owns the current GameState and publishes events after each tick.
 * UI-agnostic: whoever drives it (rAF loop, test, dev fast-forward) just calls runTicks.
 */
export type SimRunner = {
  getState(): GameState;
  /** Replace the state wholesale (load game, dev commands). */
  setState(state: GameState): void;
  runTicks(n: number): GameState;
  /** Apply a command between ticks; any events it emits are published. */
  apply(command: (state: GameState, ctx: SystemContext) => GameState): GameState;
};

export function createSimRunner(
  initial: GameState,
  systems: readonly System[],
  bus: EventBus,
): SimRunner {
  let state = initial;
  return {
    getState: () => state,
    setState(next) {
      state = next;
    },
    runTicks(n) {
      for (let i = 0; i < n; i++) {
        const r = stepTick(state, systems);
        state = r.state;
        bus.publish(r.events);
      }
      return state;
    },
    apply(command) {
      const r = withContext(state, command);
      state = r.state;
      bus.publish(r.events);
      return state;
    },
  };
}
