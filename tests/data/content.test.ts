import { describe, expect, it } from 'vitest';
import { content, parseContent } from '../../src/data/content';

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
      parseContent({ names: [{ name: '', sex: 'male', gloss: '' }], terrain: [], traits: [] }),
    ).toThrow();
  });

  it('rejects missing terrain definitions', () => {
    expect(() =>
      parseContent({
        names: content.names,
        terrain: [content.terrain.grass],
        traits: [],
      }),
    ).toThrow(/Missing terrain/);
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      parseContent({
        names: content.names,
        terrain: Object.values(content.terrain),
        traits: [content.traits.hardy, content.traits.hardy],
      }),
    ).toThrow(/Duplicate/);
  });
});
