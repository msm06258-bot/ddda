import { z } from 'zod';

export const TerrainId = z.enum(['grass', 'forest', 'rock', 'water', 'fertile']);
export type TerrainId = z.infer<typeof TerrainId>;

export const Tile = z.object({
  terrain: TerrainId,
});
export type Tile = z.infer<typeof Tile>;

/** Row-major tile grid: index = y * width + x. */
export const TileMap = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    tiles: z.array(Tile),
  })
  .refine((m) => m.tiles.length === m.width * m.height, {
    message: 'tiles.length must equal width * height',
  });
export type TileMap = z.infer<typeof TileMap>;
