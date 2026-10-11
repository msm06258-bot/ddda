import type { TerrainId, Tile, TileMap } from '../data/schemas';
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

/** Radius of the guaranteed grass clearing at the map center where the band makes camp. */
export const CAMP_CLEARING_RADIUS = 3;

export function generateMap(rng: Rng, width: number, height: number): TileMap {
  const elevation = fractalNoise(rng, width, height);
  const moisture = fractalNoise(rng, width, height);
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  const tiles: Tile[] = elevation.map((e, i) => {
    const x = i % width;
    const y = Math.floor(i / width);
    const inClearing = Math.hypot(x - cx, y - cy) <= CAMP_CLEARING_RADIUS;
    return { terrain: inClearing ? 'grass' : classify(e, moisture[i] ?? 0) };
  });

  return { width, height, tiles };
}
