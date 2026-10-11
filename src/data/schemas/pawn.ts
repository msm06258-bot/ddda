import { z } from 'zod';
import { EntityId, Unit } from './common';

export const Sex = z.enum(['female', 'male']);
export type Sex = z.infer<typeof Sex>;

export const SkillId = z.enum(['foraging', 'hunting', 'cooking', 'woodcutting', 'building', 'lore']);
export type SkillId = z.infer<typeof SkillId>;

/** Skill levels are integers 0..20. */
export const Skills = z.record(SkillId, z.number().int().min(0).max(20));
export type Skills = z.infer<typeof Skills>;

export const KinRelationType = z.enum(['parent', 'child', 'spouse', 'sibling']);
export type KinRelationType = z.infer<typeof KinRelationType>;

/** "targetId is my <type>". */
export const KinRelation = z.object({
  type: KinRelationType,
  targetId: EntityId,
});
export type KinRelation = z.infer<typeof KinRelation>;

/** Identity component: who a pawn is. Needs, mood, health, job and position are separate components. */
export const Pawn = z.object({
  name: z.string().min(1),
  sex: Sex,
  /** Tick of birth; negative for pawns born before the game started. */
  birthTick: z.number().int(),
  skills: Skills,
  traits: z.array(z.string()),
  kin: z.array(KinRelation),
});
export type Pawn = z.infer<typeof Pawn>;

export const Memory = z.object({
  kind: z.string(),
  text: z.string(),
  /** Added to mood while active, roughly -0.5..0.5. */
  moodEffect: z.number(),
  expiresAtTick: z.number().int(),
  subjectId: EntityId.nullable(),
});
export type Memory = z.infer<typeof Memory>;

export const Mood = z.object({
  value: Unit,
  memories: z.array(Memory),
});
export type Mood = z.infer<typeof Mood>;

export const Health = z.object({
  value: Unit,
});
export type Health = z.infer<typeof Health>;
