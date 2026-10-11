import { describe, expect, it } from 'vitest';
import { TerrainId, TileMap } from '../../src/data/schemas';
import { isWalkable, terrainAt, walkableTilesNear } from '../../src/sim/map';
import { CAMP_CLEARING_RADIUS, generateMap } from '../../src/sim/mapgen';
import { createRng, seedToState } from '../../src/sim/rng';

const gen = (seed: number) => generateMap(createRng(seedToState(seed)), 64, 64);

describe('generateMap', () => {
  it('is deterministic per seed and differs across seeds', () => {
    expect(gen(1)).toEqual(gen(1));
    expect(gen(1)).not.toEqual(gen(2));
  });

  it('produces a schema-valid map', () => {
    expect(() => TileMap.parse(gen(3))).not.toThrow();
  });

  it('has a walkable camp clearing at the center', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const map = gen(seed);
      for (let dy = -CAMP_CLEARING_RADIUS + 1; dy < CAMP_CLEARING_RADIUS; dy++) {
        for (let dx = -CAMP_CLEARING_RADIUS + 1; dx < CAMP_CLEARING_RADIUS; dx++) {
          expect(isWalkable(map, 32 + dx, 32 + dy)).toBe(true);
        }
      }
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
    const tiles = walkableTilesNear(gen(1), { x: 32, y: 32 }, 2);
    expect(tiles[0]).toEqual({ x: 32, y: 32 });
  });
});
