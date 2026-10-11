import { z } from 'zod';
import namesJson from './content/names.json';
import terrainJson from './content/terrain.json';
import traitsJson from './content/traits.json';
import { NameEntry, TerrainDef, TerrainId, TraitDef } from './schemas';

export type ContentDB = {
  names: readonly NameEntry[];
  terrain: Readonly<Record<TerrainId, TerrainDef>>;
  traits: Readonly<Record<string, TraitDef>>;
};

function indexBy<T, K extends string>(items: readonly T[], key: (item: T) => K): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const item of items) {
    const k = key(item);
    if (k in out) throw new Error(`Duplicate content id: ${k}`);
    out[k] = item;
  }
  return out;
}

/** Validates raw JSON content. Throws a ZodError describing the first bad file. */
export function parseContent(raw: { names: unknown; terrain: unknown; traits: unknown }): ContentDB {
  const names = z.array(NameEntry).min(1).parse(raw.names);
  const terrainList = z.array(TerrainDef).parse(raw.terrain);
  const traitList = z.array(TraitDef).parse(raw.traits);

  const terrain = indexBy(terrainList, (t) => t.id);
  for (const id of TerrainId.options) {
    if (!(id in terrain)) throw new Error(`Missing terrain definition: ${id}`);
  }

  return { names, terrain, traits: indexBy(traitList, (t) => t.id) };
}

/** The game's built-in content, validated once at module load. */
export const content: ContentDB = parseContent({
  names: namesJson,
  terrain: terrainJson,
  traits: traitsJson,
});
