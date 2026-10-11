import { describe, expect, it } from 'vitest';
import { Job, Needs, SimEvent, TileMap } from '../../src/data/schemas';

describe('schemas', () => {
  it('requires every need to be present and in 0..1', () => {
    const ok = { hunger: 1, warmth: 0.5, rest: 0, social: 1, meaning: 0.2 };
    expect(Needs.parse(ok)).toEqual(ok);
    expect(() => Needs.parse({ ...ok, hunger: 1.5 })).toThrow();
    expect(() => Needs.parse({ hunger: 1 })).toThrow();
  });

  it('checks tile count matches map dimensions', () => {
    expect(() => TileMap.parse({ width: 2, height: 2, tiles: [{ terrain: 'grass' }] })).toThrow();
    expect(
      TileMap.parse({ width: 1, height: 1, tiles: [{ terrain: 'water' }] }).tiles,
    ).toHaveLength(1);
  });

  it('parses jobs and discriminated events', () => {
    expect(
      Job.parse({ kind: 'forage', targetTile: { x: 1, y: 2 }, targetEntity: null, progress: 0, startedTick: 3 })
        .kind,
    ).toBe('forage');
    const ev = SimEvent.parse({ type: 'pawnDied', tick: 10, pawnId: 4, cause: 'exposure' });
    expect(ev.type).toBe('pawnDied');
    expect(() => SimEvent.parse({ type: 'pawnDied', tick: 10, pawnId: 4, cause: 'iron' })).toThrow();
  });
});
