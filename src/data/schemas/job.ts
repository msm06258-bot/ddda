import { z } from 'zod';
import { EntityId, TilePos, Unit } from './common';

export const JobKind = z.enum([
  'idle',
  'forage',
  'hunt',
  'cook',
  'chopWood',
  'build',
  'rest',
  'socialize',
  'performRitual',
]);
export type JobKind = z.infer<typeof JobKind>;

export const Job = z.object({
  kind: JobKind,
  targetTile: TilePos.nullable(),
  targetEntity: EntityId.nullable(),
  progress: Unit,
  startedTick: z.number().int().nonnegative(),
});
export type Job = z.infer<typeof Job>;
