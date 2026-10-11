import { Container, Graphics } from 'pixi.js';
import { content } from '../../data/content';
import type { EntityId, GameState, StructureKind, TileMap } from '../../data/schemas';
import { entitiesWith, getComponent } from '../../sim/entities';
import { daylight } from '../../sim/environment';
import { livingPawns } from '../../sim/pawnQueries';

export const TILE_SIZE = 12;

const hex = (color: string) => parseInt(color.slice(1), 16);

const STRUCTURE_COLORS: Record<StructureKind, number> = {
  hearth: 0xe0752d,
  shelter: 0xc9a66b,
  storagePit: 0x4a3a28,
  burialMound: 0xb8b09a,
};

const PAWN_COLORS = { female: 0xf2d0a4, male: 0xd9e4f0 } as const;
const SELECTION_COLOR = 0xffe066;
const CORPSE_COLOR = 0x5c5047;
const NIGHT_COLOR = 0x0b1630;
const MAX_NIGHT_ALPHA = 0.5;

/** Placeholder renderer: colored tiles, shapes for structures, circles for pawns. */
export type MapRenderer = {
  readonly root: Container;
  drawTerrain(map: TileMap): void;
  drawEntities(state: GameState, selectedId: EntityId | null): void;
};

function drawStructure(g: Graphics, kind: StructureKind, px: number, py: number, built: boolean): void {
  const s = TILE_SIZE;
  const alpha = built ? 1 : 0.4;
  const color = STRUCTURE_COLORS[kind];
  switch (kind) {
    case 'hearth':
      g.circle(px + s / 2, py + s / 2, s * 0.42).fill({ color: 0x6d6257, alpha });
      g.circle(px + s / 2, py + s / 2, s * 0.25).fill({ color, alpha });
      break;
    case 'shelter':
      g.poly([px + 1, py + s - 1, px + s / 2, py + 1, px + s - 1, py + s - 1]).fill({ color, alpha }).stroke({ color: 0x3a2d1e, width: 1, alpha });
      break;
    case 'storagePit':
      g.rect(px + 2, py + 2, s - 4, s - 4).fill({ color, alpha }).stroke({ color: 0x8a7350, width: 1, alpha });
      break;
    case 'burialMound':
      g.ellipse(px + s / 2, py + s * 0.62, s * 0.48, s * 0.34).fill({ color, alpha });
      break;
  }
  if (!built) g.rect(px + 0.5, py + 0.5, s - 1, s - 1).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
}

export function createMapRenderer(): MapRenderer {
  const root = new Container();
  const terrain = new Graphics();
  const entities = new Graphics();
  const night = new Graphics();
  root.addChild(terrain, entities, night);
  let mapW = 0;
  let mapH = 0;

  return {
    root,
    drawTerrain(map) {
      mapW = map.width;
      mapH = map.height;
      terrain.clear();
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tile = map.tiles[y * map.width + x];
          if (tile) terrain.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(hex(content.terrain[tile.terrain].color));
        }
      }
    },
    drawEntities(state, selectedId) {
      entities.clear();
      for (const id of entitiesWith(state, 'structure')) {
        const s = getComponent(state, 'structure', id);
        const pos = getComponent(state, 'position', id);
        if (s && pos) drawStructure(entities, s.kind, pos.x * TILE_SIZE, pos.y * TILE_SIZE, s.progress >= 1);
      }

      for (const id of entitiesWith(state, 'corpse')) {
        const corpse = getComponent(state, 'corpse', id);
        const pos = getComponent(state, 'position', id);
        if (!corpse || !pos || corpse.moundId !== null) continue;
        entities.rect(pos.x * TILE_SIZE + 2, pos.y * TILE_SIZE + TILE_SIZE / 2 - 2, TILE_SIZE - 4, 4).fill(CORPSE_COLOR);
      }

      for (const id of livingPawns(state)) {
        const pawn = getComponent(state, 'pawn', id);
        const pos = getComponent(state, 'position', id);
        if (!pawn || !pos) continue;
        // Interpolate toward the next tile of the path for smooth movement.
        const mv = getComponent(state, 'movement', id);
        const next = mv?.path[0];
        const fx = next ? pos.x + (next.x - pos.x) * mv.progress : pos.x;
        const fy = next ? pos.y + (next.y - pos.y) * mv.progress : pos.y;
        const cx = fx * TILE_SIZE + TILE_SIZE / 2;
        const cy = fy * TILE_SIZE + TILE_SIZE / 2;
        entities.circle(cx, cy, TILE_SIZE * 0.36).fill(PAWN_COLORS[pawn.sex]).stroke({ color: 0x1b1712, width: 1 });
        if (id === selectedId) entities.circle(cx, cy, TILE_SIZE * 0.62).stroke({ color: SELECTION_COLOR, width: 2 });
      }

      night.clear();
      const dark = (1 - daylight(state.tick)) * MAX_NIGHT_ALPHA;
      if (dark > 0.01) night.rect(0, 0, mapW * TILE_SIZE, mapH * TILE_SIZE).fill({ color: NIGHT_COLOR, alpha: dark });
    },
  };
}

/** Converts a canvas pixel to a tile coordinate. */
export function pixelToTile(px: number, py: number): { x: number; y: number } {
  return { x: Math.floor(px / TILE_SIZE), y: Math.floor(py / TILE_SIZE) };
}

/** The living pawn on (or nearest within one tile of) the clicked tile, if any. */
export function pawnAtTile(state: GameState, x: number, y: number): EntityId | null {
  let best: EntityId | null = null;
  let bestD = Infinity;
  for (const id of livingPawns(state)) {
    const pos = getComponent(state, 'position', id);
    if (!pos) continue;
    const d = Math.max(Math.abs(pos.x - x), Math.abs(pos.y - y));
    if (d <= 1 && d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}
