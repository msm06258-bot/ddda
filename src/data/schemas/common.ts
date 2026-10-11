import { z } from 'zod';

/** Entities are plain numeric IDs. */
export const EntityId = z.number().int().nonnegative();
export type EntityId = z.infer<typeof EntityId>;

/** Component maps are keyed by the entity ID as a string so GameState stays JSON-serializable. */
export const EntityKey = z.string().regex(/^\d+$/, 'entity key must be a numeric string');

export const TilePos = z.object({
  x: z.number().int(),
  y: z.number().int(),
});
export type TilePos = z.infer<typeof TilePos>;

/** A 0..1 value used for needs, mood and health. 1 = fully satisfied / healthy. */
export const Unit = z.number().min(0).max(1);
