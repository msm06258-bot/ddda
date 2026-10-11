import { z } from 'zod';
import balanceJson from './content/balance.json';
import climateJson from './content/climate.json';
import jobsJson from './content/jobs.json';
import loreJson from './content/lore.json';
import namesJson from './content/names.json';
import structuresJson from './content/structures.json';
import terrainJson from './content/terrain.json';
import traitsJson from './content/traits.json';
import {
  BalanceDef,
  ClimateDef,
  JobDef,
  JobKind,
  LoreDef,
  NameEntry,
  StructureDef,
  StructureKind,
  TerrainDef,
  TerrainId,
  TraitDef,
} from './schemas';

export type ContentDB = {
  names: readonly NameEntry[];
  terrain: Readonly<Record<TerrainId, TerrainDef>>;
  traits: Readonly<Record<string, TraitDef>>;
  jobs: Readonly<Record<JobKind, JobDef>>;
  structures: Readonly<Record<StructureKind, StructureDef>>;
  climate: ClimateDef;
  balance: BalanceDef;
  lore: LoreDef;
};

export type RawContent = { [K in keyof ContentDB]: unknown };

function indexBy<T, K extends string>(items: readonly T[], key: (item: T) => K): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const item of items) {
    const k = key(item);
    if (k in out) throw new Error(`Duplicate content id: ${k}`);
    out[k] = item;
  }
  return out;
}

function requireAll<K extends string>(kind: string, record: Record<K, unknown>, ids: readonly K[]): void {
  for (const id of ids) {
    if (!(id in record)) throw new Error(`Missing ${kind} definition: ${id}`);
  }
}

/** Validates raw JSON content. Throws describing the first problem found. */
export function parseContent(raw: RawContent): ContentDB {
  const names = z.array(NameEntry).min(1).parse(raw.names);
  const terrain = indexBy(z.array(TerrainDef).parse(raw.terrain), (t) => t.id);
  requireAll('terrain', terrain, TerrainId.options);
  const jobs = indexBy(z.array(JobDef).parse(raw.jobs), (j) => j.id);
  requireAll('job', jobs, JobKind.options);
  const structures = indexBy(z.array(StructureDef).parse(raw.structures), (s) => s.id);
  requireAll('structure', structures, StructureKind.options);

  return {
    names,
    terrain,
    traits: indexBy(z.array(TraitDef).parse(raw.traits), (t) => t.id),
    jobs,
    structures,
    climate: ClimateDef.parse(raw.climate),
    balance: BalanceDef.parse(raw.balance),
    lore: LoreDef.parse(raw.lore),
  };
}

export const rawContent: RawContent = {
  names: namesJson,
  terrain: terrainJson,
  traits: traitsJson,
  jobs: jobsJson,
  structures: structuresJson,
  climate: climateJson,
  balance: balanceJson,
  lore: loreJson,
};

/** The game's built-in content, validated once at module load. */
export const content: ContentDB = parseContent(rawContent);
