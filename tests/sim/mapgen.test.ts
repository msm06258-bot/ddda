import { describe, expect, it } from 'vitest';
import { TerrainId, TileMap } from '../../src/data/schemas';
import { isWalkable, terrainAt, walkableTilesNear } from '../../src/sim/map';
import { CAMP_CLEARING_RADIUS, generateMap } from '../../src/sim/mapgen';
import { createRng, seedToState } from '../../src/sim/rng';

const generate = (seed: number) => generateMap(createRng(seedToState(seed)), 64, 64);
const gen = (seed: number) => generate(seed).map;

describe('generateMap', () => {
  it('is deterministic per seed and differs across seeds', () => {
    expect(gen(1)).toEqual(gen(1));
    expect(gen(1)).not.toEqual(gen(2));
  });

  it('produces a schema-valid map', () => {
    expect(() => TileMap.parse(gen(3))).not.toThrow();
  });

  it('has a walkable clearing around the camp', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { map, camp } = generate(seed);
      for (let dy = -CAMP_CLEARING_RADIUS + 1; dy < CAMP_CLEARING_RADIUS; dy++) {
        for (let dx = -CAMP_CLEARING_RADIUS + 1; dx < CAMP_CLEARING_RADIUS; dx++) {
          expect(isWalkable(map, camp.x + dx, camp.y + dy)).toBe(true);
        }
      }
    }
  });

  it('puts the camp in the largest connected walkable region (never walled in)', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { map, camp } = generate(seed * 7919 + 15684);
      const seen = new Set<number>([camp.y * 64 + camp.x]);
      const stack = [camp];
      while (stack.length > 0) {
        const p = stack.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = { x: p.x + dx, y: p.y + dy };
          const k = n.y * 64 + n.x;
          if (!seen.has(k) && isWalkable(map, n.x, n.y)) {
            seen.add(k);
            stack.push(n);
          }
        }
      }
      const walkable = map.tiles.filter((t) => t.terrain !== 'water' && t.terrain !== 'rock').length;
      expect(seen.size / walkable).toBeGreaterThan(0.5);
      expect(map.tiles.some((t, i) => seen.has(i) && (t.terrain === 'forest'))).toBe(true);
    }
  });

  it('has a sensible terrain mix across seeds', () => {
    const counts = Object.fromEntries(TerrainId.options.map((t) => [t, 0])) as Record<TerrainId, number>;
    const seeds = [10, 11, 12, 13, 14, 15, 16, 17];
    for (const seed of seeds) for (const t of gen(seed).tiles) counts[t.terrain]++;
    const total = seeds.length * 64 * 64;
    for (const t of TerrainId.options) expect(counts[t]).toBeGreaterThan(0);
    const walkable = counts.grass + counts.forest + counts.fertile;
    expect(walkable / total).toBeGreaterThan(0.6);
  });
});

describe('map helpers', () => {
  it('handles out of bounds', () => {
    const map = gen(1);
    expect(terrainAt(map, -1, 0)).toBeUndefined();
    expect(isWalkable(map, 64, 0)).toBe(false);
  });

  it('orders nearby walkable tiles by distance', () => {
    const { map, camp } = generate(1);
    expect(walkableTilesNear(map, camp, 2)[0]).toEqual(camp);
  });
});
