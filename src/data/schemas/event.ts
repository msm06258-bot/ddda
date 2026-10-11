import { z } from 'zod';
import { EntityId } from './common';

export const DeathCause = z.enum(['starvation', 'exposure', 'oldAge']);
export type DeathCause = z.infer<typeof DeathCause>;

export const LogCategory = z.enum(['info', 'birth', 'death', 'ritual', 'build', 'omen']);
export type LogCategory = z.infer<typeof LogCategory>;

/** Events emitted by the sim during a tick, consumed by the UI and (later) the storyteller. */
export const SimEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pawnSpawned'), tick: z.number().int(), pawnId: EntityId }),
  z.object({
    type: z.literal('pawnDied'),
    tick: z.number().int(),
    pawnId: EntityId,
    cause: DeathCause,
  }),
  z.object({ type: z.literal('structureCompleted'), tick: z.number().int(), entityId: EntityId }),
  z.object({
    type: z.literal('log'),
    tick: z.number().int(),
    category: LogCategory,
    text: z.string(),
  }),
]);
export type SimEvent = z.infer<typeof SimEvent>;
export type SimEventType = SimEvent['type'];
