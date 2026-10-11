import { content } from '../data/content';
import type { TerrainId, Tile, TileMap, TilePos } from '../data/schemas';
import type { Rng } from './rng';

/** Smooth value noise in [0, 1): random values on a coarse lattice, smoothstep-interpolated. */
function valueNoise(rng: Rng, width: number, height: number, cellSize: number): number[] {
  const gw = Math.ceil(width / cellSize) + 2;
  const gh = Math.ceil(height / cellSize) + 2;
  const lattice = Array.from({ length: gw * gh }, () => rng.next());
  const at = (gx: number, gy: number) => lattice[gy * gw + gx] ?? 0;
  const smooth = (t: number) => t * t * (3 - 2 * t);

  const out: number[] = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fx = x / cellSize;
      const fy = y / cellSize;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      out[y * width + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

function fractalNoise(rng: Rng, width: number, height: number): number[] {
  const octaves: Array<[cell: number, weight: number]> = [
    [16, 0.6],
    [8, 0.3],
    [4, 0.1],
  ];
  const layers = octaves.map(([cell]) => valueNoise(rng, width, height, cell));
  return layers[0]!.map((_, i) =>
    octaves.reduce((sum, [, weight], o) => sum + (layers[o]![i] ?? 0) * weight, 0),
  );
}

export const TERRAIN_THRESHOLDS = {
  water: 0.32,
  fertile: 0.37,
  rock: 0.68,
  forest: 0.56,
} as const;

function classify(elevation: number, moisture: number): TerrainId {
  if (elevation < TERRAIN_THRESHOLDS.water) return 'water';
  if (elevation < TERRAIN_THRESHOLDS.fertile) return 'fertile';
  if (elevation > TERRAIN_THRESHOLDS.rock) return 'rock';
  if (moisture > TERRAIN_THRESHOLDS.forest) return 'forest';
  return 'grass';
}

/** Radius of the guaranteed grass clearing around the camp where the band makes its first hearth. */
export const CAMP_CLEARING_RADIUS = 3;

/** Labels 4-connected walkable regions; returns per-tile region id (-1 = unwalkable) and region sizes. */
function walkableRegions(tiles: readonly Tile[], width: number, height: number): { region: number[]; sizes: number[] } {
  const region = new Array<number>(tiles.length).fill(-1);
  const sizes: number[] = [];
  const walkable = (i: number) => content.terrain[tiles[i]!.terrain].walkable;
  for (let start = 0; start < tiles.length; start++) {
    if (region[start] !== -1 || !walkable(start)) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    region[start] = id;
    while (stack.length > 0) {
      const i = stack.pop()!;
      size++;
      const x = i % width;
      const y = Math.floor(i / width);
      const neighbors = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1];
      for (const n of neighbors) {
        if (n >= 0 && region[n] === -1 && walkable(n)) {
          region[n] = id;
          stack.push(n);
        }
      }
    }
    sizes.push(size);
  }
  return { region, sizes };
}

/** The tile of the largest walkable region closest to the map center: the band's camp. */
function chooseCamp(tiles: readonly Tile[], width: number, height: number): TilePos {
  const { region, sizes } = walkableRegions(tiles, width, height);
  const largest = sizes.indexOf(Math.max(...sizes));
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  let best = { x: cx, y: cy };
  let bestD = Infinity;
  for (let i = 0; i < tiles.length; i++) {
    if (region[i] !== largest) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    // Keep the clearing on the map.
    if (x < CAMP_CLEARING_RADIUS || y < CAMP_CLEARING_RADIUS || x >= width - CAMP_CLEARING_RADIUS || y >= height - CAMP_CLEARING_RADIUS) continue;
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (d < bestD) {
      best = { x, y };
      bestD = d;
    }
  }
  return best;
}

export type GeneratedMap = { map: TileMap; camp: TilePos };

/** Generates terrain, then places the camp in the largest connected walkable area and clears ground for it. */
export function generateMap(rng: Rng, width: number, height: number): GeneratedMap {
  const elevation = fractalNoise(rng, width, height);
  const moisture = fractalNoise(rng, width, height);
  const raw: Tile[] = elevation.map((e, i) => ({ terrain: classify(e, moisture[i] ?? 0) }));
  const camp = chooseCamp(raw, width, height);

  const tiles: Tile[] = raw.map((tile, i) => {
    const x = i % width;
    const y = Math.floor(i / width);
    const inClearing = Math.hypot(x - camp.x, y - camp.y) <= CAMP_CLEARING_RADIUS;
    return inClearing && !content.terrain[tile.terrain].walkable ? { terrain: 'grass' } : tile;
  });

  return { map: { width, height, tiles }, camp };
}
