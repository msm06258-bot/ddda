import { z } from 'zod';
import { EntityId, EntityKey, TilePos } from './common';
import { Job } from './job';
import { Needs } from './needs';
import { Movement } from './movement';
import { Corpse, Health, Mood, Pawn } from './pawn';
import { Stockpile } from './resource';
import { Structure } from './structure';
import { TileMap } from './tile';

const componentMap = <T extends z.ZodType>(schema: T) => z.record(EntityKey, schema);

export const Components = z.object({
  pawn: componentMap(Pawn),
  position: componentMap(TilePos),
  needs: componentMap(Needs),
  mood: componentMap(Mood),
  health: componentMap(Health),
  job: componentMap(Job),
  structure: componentMap(Structure),
  movement: componentMap(Movement),
  corpse: componentMap(Corpse),
});
export type Components = z.infer<typeof Components>;
export type ComponentName = keyof Components;

export const SCHEMA_VERSION = 1;

export const GameState = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  seed: z.number().int(),
  tick: z.number().int().nonnegative(),
  /** Current mulberry32 state; advanced by every random draw. */
  rngState: z.number().int(),
  nextEntityId: EntityId,
  map: TileMap,
  resources: Stockpile,
  components: Components,
});
export type GameState = z.infer<typeof GameState>;
