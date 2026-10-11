import { Container, Graphics } from 'pixi.js';
import { content } from '../../data/content';
import type { EntityId, GameState, StructureKind, TileMap } from '../../data/schemas';
import { entitiesWith, getComponent } from '../../sim/entities';

export const TILE_SIZE = 12;

const hex = (color: string) => parseInt(color.slice(1), 16);

const STRUCTURE_COLORS: Record<StructureKind, number> = {
  hearth: 0xe0752d,
  shelter: 0xc9a66b,
  storagePit: 0x5a4632,
  burialMound: 0xb8b09a,
};

const PAWN_COLORS = { female: 0xf2d0a4, male: 0xd9e4f0 } as const;
const SELECTION_COLOR = 0xffe066;

/** Placeholder renderer: colored tiles, squares for structures, circles for pawns. */
export type MapRenderer = {
  readonly root: Container;
  drawTerrain(map: TileMap): void;
  drawEntities(state: GameState, selectedId: EntityId | null): void;
};

export function createMapRenderer(): MapRenderer {
  const root = new Container();
  const terrain = new Graphics();
  const entities = new Graphics();
  root.addChild(terrain, entities);

  return {
    root,
    drawTerrain(map) {
      terrain.clear();
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tile = map.tiles[y * map.width + x];
          if (!tile) continue;
          terrain
            .rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            .fill(hex(content.terrain[tile.terrain].color));
        }
      }
    },
    drawEntities(state, selectedId) {
      entities.clear();
      for (const id of entitiesWith(state, 'structure')) {
        const s = getComponent(state, 'structure', id);
        const pos = getComponent(state, 'position', id);
        if (!s || !pos) continue;
        const inset = 2;
        entities
          .rect(pos.x * TILE_SIZE + inset, pos.y * TILE_SIZE + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2)
          .fill({ color: STRUCTURE_COLORS[s.kind], alpha: s.progress < 1 ? 0.5 : 1 });
      }
      for (const id of entitiesWith(state, 'pawn')) {
        const pawn = getComponent(state, 'pawn', id);
        const pos = getComponent(state, 'position', id);
        if (!pawn || !pos) continue;
        const cx = pos.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = pos.y * TILE_SIZE + TILE_SIZE / 2;
        entities.circle(cx, cy, TILE_SIZE * 0.38).fill(PAWN_COLORS[pawn.sex]).stroke({ color: 0x1b1712, width: 1 });
        if (id === selectedId) {
          entities.circle(cx, cy, TILE_SIZE * 0.6).stroke({ color: SELECTION_COLOR, width: 2 });
        }
      }
    },
  };
}

/** Finds the pawn standing on the clicked tile, if any. */
export function pawnAtPixel(state: GameState, px: number, py: number): EntityId | null {
  const x = Math.floor(px / TILE_SIZE);
  const y = Math.floor(py / TILE_SIZE);
  for (const id of entitiesWith(state, 'pawn')) {
    const pos = getComponent(state, 'position', id);
    if (pos && pos.x === x && pos.y === y) return id;
  }
  return null;
}
