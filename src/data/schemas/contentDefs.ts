import { z } from 'zod';
import { JobKind } from './job';
import { NeedId } from './needs';
import { DeathCause, Sex, SkillId } from './pawn';
import { ResourceId } from './resource';
import { StructureKind } from './structure';
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

const ResourceAmounts = z.partialRecord(ResourceId, z.number().nonnegative());
const NeedAmounts = z.partialRecord(NeedId, z.number().nonnegative());
const Seasonal = z.object({ spring: z.number(), summer: z.number(), autumn: z.number(), winter: z.number() });

export const JobDef = z.object({
  id: JobKind,
  label: z.string(),
  /** Skill that scales work speed and utility; null for need-driven jobs. */
  skill: SkillId.nullable(),
  /** Ticks of work at the target to complete; 0 = continuous until the need is met. */
  workTicks: z.number().int().nonnegative(),
  /** The job is abandoned if not finished within this many ticks of starting. */
  maxTicks: z.number().int().positive(),
  baseUtility: z.number().nonnegative(),
  yield: ResourceAmounts.default({}),
  consume: ResourceAmounts.default({}),
  restorePerDay: NeedAmounts.default({}),
  restoreOnComplete: NeedAmounts.default({}),
});
export type JobDef = z.infer<typeof JobDef>;

export const StructureDef = z.object({
  id: StructureKind,
  label: z.string(),
  description: z.string(),
  cost: ResourceAmounts,
  buildTicks: z.number().int().positive(),
});
export type StructureDef = z.infer<typeof StructureDef>;

export const ClimateDef = z.object({
  /** Mean temperature (deg C) at the middle of each season. */
  seasonTemps: Seasonal,
  diurnalAmplitude: z.number().nonnegative(),
  weatherAmplitude: z.number().nonnegative(),
  /** Fractions of the day; night is timeOfDay >= nightStart or < nightEnd. */
  nightStart: z.number().min(0).max(1),
  nightEnd: z.number().min(0).max(1),
  forageYield: Seasonal,
  huntYield: Seasonal,
  terrainForageYield: z.partialRecord(TerrainId, z.number().nonnegative()),
});
export type ClimateDef = z.infer<typeof ClimateDef>;

const Num = z.number();
export const BalanceDef = z.object({
  movement: z.object({ tilesPerSecond: Num.positive() }),
  needs: z.object({
    decayPerDay: z.record(NeedId, Num.nonnegative()),
    critical: Num,
    /** Social and meaning only drive behavior below this; above it they just shade mood. */
    luxuryThreshold: Num,
  }),
  food: z.object({
    rawNutrition: Num,
    mealNutrition: Num,
    rawMoodEffect: Num,
    mealMoodEffect: Num,
    foodMemoryDays: Num,
    eatThreshold: Num,
    eatenPerPawnPerDay: Num,
    targetStockDays: Num,
    autumnTargetStockDays: Num,
  }),
  health: z.object({
    starvationPerDay: Num,
    exposurePerDay: Num,
    regenPerDay: Num,
    regenNeedFloor: Num,
    oldAgeOnsetYears: Num,
    oldAgeDailyChancePerYear: Num,
  }),
  mood: z.object({ base: Num, needWeight: Num, approachPerDay: Num }),
  warmth: z.object({
    comfortTemp: Num,
    recoverPerDay: Num,
    lossPerDegreePerDay: Num,
    hearthBonus: Num,
    hearthRadius: Num,
    shelterBonus: Num,
    shelterRadius: Num,
  }),
  spoilage: z.object({
    baseRatePerDay: Num,
    referenceTemp: Num,
    storagePitCapacity: Num,
    storagePitMultiplier: Num,
  }),
  hearth: z.object({ woodPerDay: Num }),
  rest: z.object({ shelterCapacity: Num, openAirMultiplier: Num, openAirMoodEffect: Num }),
  work: z.object({
    skillFactorMin: Num,
    skillFactorMax: Num,
    distancePenaltyPerTile: Num,
    noise: Num,
    skillGainChance: Num,
    moodSpeedMin: Num,
    moodSpeedRange: Num,
    huntBaseSuccess: Num,
    huntSuccessPerSkill: Num,
    huntMinDistance: Num,
    huntMaxDistance: Num,
    targetWood: Num,
    autumnTargetWood: Num,
    targetStone: Num,
    maxBuildersPerSite: Num,
  }),
  mourning: z.object({
    griefMood: Num,
    kinGriefMood: Num,
    griefDays: Num,
    burialMeaning: Num,
    burialMood: Num,
    burialMemoryDays: Num,
  }),
  ritual: z.object({ moundMeaningBonus: Num, moodEffect: Num, memoryDays: Num }),
});
export type BalanceDef = z.infer<typeof BalanceDef>;

const Lines = z.array(z.string().min(1)).min(1);
export const LoreDef = z.object({
  ritual: Lines,
  ritualAtMound: Lines,
  burial: Lines,
  death: z.record(DeathCause, z.string()),
  seasonTurn: z.object({ spring: z.string(), summer: z.string(), autumn: z.string(), winter: z.string() }),
});
export type LoreDef = z.infer<typeof LoreDef>;
