import { z } from 'zod';

/** food = raw (foraged/hunted); meals = cooked food, more nourishing. */
export const ResourceId = z.enum(['food', 'meals', 'wood', 'stone', 'hides']);
export type ResourceId = z.infer<typeof ResourceId>;

/** Colony-wide stockpile (Phase 1 has no hauling; see CLAUDE.md Decisions). */
export const Stockpile = z.record(ResourceId, z.number().nonnegative());
export type Stockpile = z.infer<typeof Stockpile>;
