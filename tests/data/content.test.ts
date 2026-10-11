import { describe, expect, it } from 'vitest';
import { content, parseContent, rawContent } from '../../src/data/content';

describe('content', () => {
  it('loads built-in content', () => {
    expect(content.names.length).toBeGreaterThanOrEqual(6);
    expect(content.terrain.water.walkable).toBe(false);
    expect(content.traits.hardy?.needDecay.warmth).toBeLessThan(1);
  });

  it('has names for both sexes', () => {
    expect(content.names.some((n) => n.sex === 'female')).toBe(true);
    expect(content.names.some((n) => n.sex === 'male')).toBe(true);
  });

  it('rejects malformed content', () => {
    expect(() =>
      parseContent({ ...rawContent, names: [{ name: '', sex: 'male', gloss: '' }] }),
    ).toThrow();
  });

  it('rejects missing terrain definitions', () => {
    expect(() =>
      parseContent({ ...rawContent, terrain: [content.terrain.grass] }),
    ).toThrow(/Missing terrain/);
  });

  it('defines every job and structure', () => {
    expect(content.jobs.forage.skill).toBe('foraging');
    expect(content.structures.shelter.cost.wood).toBeGreaterThan(0);
    expect(() => parseContent({ ...rawContent, jobs: [] })).toThrow(/Missing job/);
  });

  it('keeps lore templates free of unknown placeholders', () => {
    const lines = [
      ...content.lore.ritual,
      ...content.lore.ritualAtMound,
      ...content.lore.burial,
      ...Object.values(content.lore.death),
    ];
    for (const line of lines) {
      for (const m of line.matchAll(/\{(\w+)\}/g)) expect(['name', 'ancestor', 'deceased']).toContain(m[1]);
    }
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      parseContent({ ...rawContent, traits: [content.traits.hardy, content.traits.hardy] }),
    ).toThrow(/Duplicate/);
  });
});
