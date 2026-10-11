import type { GameState, SimEvent } from '../data/schemas';
import { createRng } from './rng';
import type { System, SystemContext } from './system';
import { TICK_DT } from './time';

export type StepResult = { state: GameState; events: SimEvent[] };

/**
 * Runs fn with a SystemContext bound to state's RNG, outside the tick loop (player/dev commands).
 * Does not advance the tick; writes the RNG state back.
 */
export function withContext(
  state: GameState,
  fn: (state: GameState, ctx: SystemContext) => GameState,
): StepResult {
  const rng = createRng(state.rngState);
  const events: SimEvent[] = [];
  const tick = state.tick;
  const ctx: SystemContext = {
    dt: 0,
    tick,
    rng,
    emit: (event) => events.push({ ...event, tick } as SimEvent),
  };
  const next = fn(state, ctx);
  return { state: { ...next, rngState: rng.state }, events };
}

/** Advances the simulation by exactly one fixed tick, running systems in order. */
export function stepTick(state: GameState, systems: readonly System[]): StepResult {
  const rng = createRng(state.rngState);
  const events: SimEvent[] = [];
  const tick = state.tick;
  const ctx: SystemContext = {
    dt: TICK_DT,
    tick,
    rng,
    emit: (event) => events.push({ ...event, tick } as SimEvent),
  };

  let next = state;
  for (const system of systems) next = system(next, ctx);

  return { state: { ...next, tick: tick + 1, rngState: rng.state }, events };
}

/** Runs n ticks back to back, collecting all events. */
export function stepTicks(state: GameState, systems: readonly System[], n: number): StepResult {
  let current = state;
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = stepTick(current, systems);
    current = r.state;
    events.push(...r.events);
  }
  return { state: current, events };
}
