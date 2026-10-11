import { z } from 'zod';
import { Unit } from './common';

export const StructureKind = z.enum(['hearth', 'shelter', 'storagePit', 'burialMound']);
export type StructureKind = z.infer<typeof StructureKind>;

export const Structure = z.object({
  kind: StructureKind,
  /** 0..1 construction progress; 1 = complete. */
  progress: Unit,
});
export type Structure = z.infer<typeof Structure>;
