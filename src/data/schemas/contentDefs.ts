import { z } from 'zod';
import { NeedId } from './needs';
import { Sex } from './pawn';
import { TerrainId } from './tile';

export const NameEntry = z.object({
  name: z.string().min(1),
  sex: Sex,
  /** Short gloss of the reconstructed root, for flavor tooltips. */
  gloss: z.string(),
});
export type NameEntry = z.infer<typeof NameEntry>;

export const TerrainDef = z.object({
  id: TerrainId,
  label: z.string(),
  /** Hex color string like "#6b8e3d" used by the placeholder renderer. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  walkable: z.boolean(),
  /** Movement cost multiplier; 1 = normal. Ignored when not walkable. */
  moveCost: z.number().positive(),
});
export type TerrainDef = z.infer<typeof TerrainDef>;

export const TraitDef = z.object({
  id: z.string().min(1),
  label: z.string(),
  description: z.string(),
  /** Multipliers applied to need decay rates (1 = unchanged). */
  needDecay: z.partialRecord(NeedId, z.number().positive()).default({}),
  /** Constant mood offset, roughly -0.2..0.2. */
  moodOffset: z.number().default(0),
});
export type TraitDef = z.infer<typeof TraitDef>;
