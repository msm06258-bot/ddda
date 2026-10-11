import { z } from 'zod';
import { TilePos, Unit } from './common';

/** An in-progress walk. `path` excludes the current tile; `progress` is 0..1 toward path[0]. */
export const Movement = z.object({
  path: z.array(TilePos),
  progress: Unit,
});
export type Movement = z.infer<typeof Movement>;
