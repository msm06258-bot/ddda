/**
 * Seeded PRNG (mulberry32). The only source of randomness allowed in /src/sim.
 * State is a single 32-bit integer so it can live in GameState and round-trip through JSON.
 */

/** Advances a mulberry32 state once. Returns a float in [0, 1) and the next state. */
export function mulberry32(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}

/** Scrambles a user-facing seed into an initial RNG state so nearby seeds diverge quickly. */
export function seedToState(seed: number): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

export type Rng = {
  /** Current state; write this back into GameState after use. */
  readonly state: number;
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, maxExclusive). */
  int(min: number, maxExclusive: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Uniformly random element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
};

/** Creates a stateful wrapper around a mulberry32 state for convenient use within one tick. */
export function createRng(initialState: number): Rng {
  let state = initialState | 0;
  const next = (): number => {
    const r = mulberry32(state);
    state = r.state;
    return r.value;
  };
  return {
    get state() {
      return state;
    },
    next,
    int(min, maxExclusive) {
      if (maxExclusive <= min) throw new Error(`rng.int: empty range [${min}, ${maxExclusive})`);
      return min + Math.floor(next() * (maxExclusive - min));
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: empty array');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}
