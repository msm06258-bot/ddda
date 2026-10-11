import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/data/schemas';
import { advanceClock } from '../../src/sim/clock';
import { createEventBus } from '../../src/sim/eventBus';
import { createSimRunner } from '../../src/sim/runner';
import { createEmptyState } from '../../src/sim/state';
import { stepTick, stepTicks } from '../../src/sim/step';
import type { System } from '../../src/sim/system';
import { TICK_DT } from '../../src/sim/time';

/** Test system: adds a random amount of food each tick and logs every 10th tick. */
const randomFood: System = (state, ctx) => {
  if (ctx.tick % 10 === 0) ctx.emit({ type: 'log', category: 'info', text: `tick ${ctx.tick}` });
  return { ...state, resources: { ...state.resources, food: state.resources.food + ctx.rng.next() } };
};

describe('stepTick', () => {
  it('advances tick and passes a fixed dt', () => {
    let seenDt = 0;
    const probe: System = (s, ctx) => {
      seenDt = ctx.dt;
      return s;
    };
    const { state } = stepTick(createEmptyState(1), [probe]);
    expect(state.tick).toBe(1);
    expect(seenDt).toBe(TICK_DT);
  });

  it('does not mutate the input state', () => {
    const s0 = createEmptyState(1);
    const snapshot = JSON.stringify(s0);
    stepTicks(s0, [randomFood], 20);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it('is deterministic for the same seed', () => {
    const a = stepTicks(createEmptyState(123), [randomFood], 500);
    const b = stepTicks(createEmptyState(123), [randomFood], 500);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it('persists rng state so split runs equal one long run', () => {
    const whole = stepTicks(createEmptyState(9), [randomFood], 200).state;
    const half = stepTicks(createEmptyState(9), [randomFood], 100).state;
    const resumed = stepTicks(half, [randomFood], 100).state;
    expect(resumed).toEqual(whole);
  });

  it('stamps emitted events with the tick', () => {
    const { events } = stepTicks(createEmptyState(1), [randomFood], 21);
    expect(events.map((e) => e.tick)).toEqual([0, 10, 20]);
  });

  it('runs systems in order', () => {
    const order: string[] = [];
    const a: System = (s) => (order.push('a'), s);
    const b: System = (s) => (order.push('b'), s);
    stepTick(createEmptyState(1), [a, b]);
    expect(order).toEqual(['a', 'b']);
  });
});

describe('advanceClock', () => {
  it('runs no ticks when paused', () => {
    expect(advanceClock({ accumulatorMs: 0 }, 1000, 0).ticks).toBe(0);
  });

  it('runs 10 ticks per real second at 1x and 30 at 3x', () => {
    let clock = { accumulatorMs: 0 };
    let total = 0;
    for (let i = 0; i < 60; i++) {
      const r = advanceClock(clock, 1000 / 60, 1);
      clock = r.clock;
      total += r.ticks;
    }
    expect(total).toBeGreaterThanOrEqual(9);
    expect(total).toBeLessThanOrEqual(10);
    expect(advanceClock({ accumulatorMs: 0 }, 1000, 3, 100).ticks).toBe(30);
  });

  it('carries remainder between frames', () => {
    const r1 = advanceClock({ accumulatorMs: 0 }, 150, 1);
    expect(r1.ticks).toBe(1);
    const r2 = advanceClock(r1.clock, 50, 1);
    expect(r2.ticks).toBe(1);
    expect(r2.clock.accumulatorMs).toBeCloseTo(0);
  });

  it('caps ticks after a long stall', () => {
    const r = advanceClock({ accumulatorMs: 0 }, 60_000, 3, 30);
    expect(r.ticks).toBe(30);
    expect(r.clock.accumulatorMs).toBe(0);
  });
});

describe('runner + event bus', () => {
  it('publishes events after each tick', () => {
    const bus = createEventBus();
    const logs: string[] = [];
    const typed: number[] = [];
    bus.onAny((e) => e.type === 'log' && logs.push(e.text));
    const off = bus.on('log', (e) => typed.push(e.tick));
    const runner = createSimRunner(createEmptyState(1), [randomFood], bus);
    runner.runTicks(11);
    off();
    runner.runTicks(10);
    expect(logs).toEqual(['tick 0', 'tick 10', 'tick 20']);
    expect(typed).toEqual([0, 10]);
    expect(runner.getState().tick).toBe(21);
  });

  it('setState replaces the state', () => {
    const runner = createSimRunner(createEmptyState(1), [], createEventBus());
    const other: GameState = { ...createEmptyState(2), tick: 50 };
    runner.setState(other);
    expect(runner.runTicks(1).tick).toBe(51);
  });
});
