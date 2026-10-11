import { describe, expect, it } from 'vitest';
import { createRng, mulberry32, seedToState } from '../../src/sim/rng';

describe('rng', () => {
  it('is deterministic for a given state', () => {
    const a = createRng(seedToState(42));
    const b = createRng(seedToState(42));
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(a.state).toBe(b.state);
  });

  it('diverges for different seeds', () => {
    const a = createRng(seedToState(1));
    const b = createRng(seedToState(2));
    expect(a.next()).not.toBe(b.next());
  });

  it('can resume from a saved state', () => {
    const a = createRng(seedToState(7));
    a.next();
    a.next();
    const resumed = createRng(a.state);
    expect(resumed.next()).toBe(a.next());
  });

  it('matches the functional step', () => {
    const s = seedToState(99);
    const r = createRng(s);
    expect(r.next()).toBe(mulberry32(s).value);
  });

  it('produces values in range', () => {
    const r = createRng(seedToState(3));
    for (let i = 0; i < 1000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(-2, 3);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThan(3);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('is roughly uniform', () => {
    const r = createRng(seedToState(5));
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) buckets[r.int(0, 4)]!++;
    for (const b of buckets) expect(b).toBeGreaterThan(1800);
  });

  it('pick and int reject empty inputs', () => {
    const r = createRng(1);
    expect(() => r.pick([])).toThrow();
    expect(() => r.int(3, 3)).toThrow();
  });
});
