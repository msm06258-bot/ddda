import { content } from '../data/content';
import type { TerrainId, Tile, TileMap, TilePos } from '../data/schemas';

export function inBounds(map: TileMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function tileAt(map: TileMap, x: number, y: number): Tile | undefined {
  return inBounds(map, x, y) ? map.tiles[y * map.width + x] : undefined;
}

export function terrainAt(map: TileMap, x: number, y: number): TerrainId | undefined {
  return tileAt(map, x, y)?.terrain;
}

export function isWalkable(map: TileMap, x: number, y: number): boolean {
  const t = terrainAt(map, x, y);
  return t !== undefined && content.terrain[t].walkable;
}

/** Walkable tiles within a square radius of center, ordered by distance then row-major (deterministic). */
export function walkableTilesNear(map: TileMap, center: TilePos, radius: number): TilePos[] {
  const out: TilePos[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y++) {
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      if (isWalkable(map, x, y)) out.push({ x, y });
    }
  }
  const d = (p: TilePos) => Math.abs(p.x - center.x) + Math.abs(p.y - center.y);
  return out.sort((a, b) => d(a) - d(b) || a.y - b.y || a.x - b.x);
}
