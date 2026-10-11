import type { GameState, SimEvent } from '../data/schemas';
import type { Rng } from './rng';

/** Distributes Omit over a union so each event variant keeps its own fields. */
export type EventInput = SimEvent extends infer E ? (E extends SimEvent ? Omit<E, 'tick'> : never) : never;

export type SystemContext = {
  /** Logical seconds elapsed this tick (always TICK_DT). */
  readonly dt: number;
  /** The tick being processed. */
  readonly tick: number;
  readonly rng: Rng;
  /** Queue an event; it is published on the bus after the tick completes. */
  emit(event: EventInput): void;
};

/** A system is a pure-ish function: it may draw from ctx.rng and emit events, but must not mutate state. */
export type System = (state: GameState, ctx: SystemContext) => GameState;
