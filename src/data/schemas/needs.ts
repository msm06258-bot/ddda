import { z } from 'zod';
import { Unit } from './common';

export const NeedId = z.enum(['hunger', 'warmth', 'rest', 'social', 'meaning']);
export type NeedId = z.infer<typeof NeedId>;

/** Each need is 0..1 where 1 is fully satisfied and 0 is critical. */
export const Needs = z.record(NeedId, Unit);
export type Needs = z.infer<typeof Needs>;
