import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/sim/newGame';
import { deserializeGame, serializeGame } from '../../src/sim/save';
import { stepTicks } from '../../src/sim/step';
import type { System } from '../../src/sim/system';
import { setComponent, entitiesWith, getComponent } from '../../src/sim/entities';

/** Stand-in system that uses RNG and touches components, to make drift detectable. */
const jitter: System = (state, ctx) => {
  let s = state;
  for (const id of entitiesWith(s, 'needs')) {
    const needs = getComponent(s, 'needs', id)!;
    s = setComponent(s, 'needs', id, { ...needs, hunger: Math.max(0, needs.hunger - ctx.rng.next() * 0.001) });
  }
  return s;
};

describe('save/load', () => {
  it('round-trips a fresh game exactly', () => {
    const s = createNewGame({ seed: 1 });
    expect(deserializeGame(serializeGame(s))).toEqual(s);
  });

  it('continues without drift after a mid-game save', () => {
    const start = createNewGame({ seed: 2 });
    const mid = stepTicks(start, [jitter], 300).state;
    const continuous = stepTicks(mid, [jitter], 300).state;
    const reloaded = stepTicks(deserializeGame(serializeGame(mid)), [jitter], 300).state;
    expect(reloaded).toEqual(continuous);
    expect(serializeGame(reloaded)).toBe(serializeGame(continuous));
  });

  it('rejects invalid JSON and invalid states', () => {
    expect(() => deserializeGame('{nope')).toThrow(/not valid JSON/);
    const bad = JSON.parse(serializeGame(createNewGame({ seed: 1 })));
    bad.resources.food = -5;
    expect(() => deserializeGame(JSON.stringify(bad))).toThrow(/resources\.food/);
    expect(() => deserializeGame(JSON.stringify({ ...bad, schemaVersion: 999 }))).toThrow();
  });
});

describe('save/load with the full simulation', () => {
  it('round-trips a mid-game state and continues identically', async () => {
    const { defaultSystems } = await import('../../src/sim/systems');
    const start = createNewGame({ seed: 11 });
    const mid = stepTicks(start, defaultSystems, 3000).state;
    expect(Object.keys(mid.components.job).length).toBeGreaterThan(0);
    expect(Object.keys(mid.components.movement).length).toBeGreaterThanOrEqual(0);

    const reloaded = deserializeGame(serializeGame(mid));
    expect(reloaded).toEqual(mid);

    const a = stepTicks(mid, defaultSystems, 1500);
    const b = stepTicks(reloaded, defaultSystems, 1500);
    expect(serializeGame(b.state)).toBe(serializeGame(a.state));
    expect(b.events).toEqual(a.events);
  });
});
