import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/data/schemas';
import { entitiesWith, getComponent } from '../../src/sim/entities';
import { isWalkable } from '../../src/sim/map';
import { createNewGame } from '../../src/sim/newGame';
import { ageInYears } from '../../src/sim/time';

describe('createNewGame', () => {
  it('produces a schema-valid state', () => {
    expect(() => GameState.parse(createNewGame({ seed: 1 }))).not.toThrow();
  });

  it('is deterministic per seed', () => {
    expect(createNewGame({ seed: 77 })).toEqual(createNewGame({ seed: 77 }));
  });

  it.each([6, 7, 8, 10])('spawns %i pawns on walkable tiles', (pawnCount) => {
    const s = createNewGame({ seed: pawnCount, pawnCount });
    const pawns = entitiesWith(s, 'pawn');
    expect(pawns).toHaveLength(pawnCount);
    for (const id of pawns) {
      const pos = getComponent(s, 'position', id)!;
      expect(isWalkable(s.map, pos.x, pos.y)).toBe(true);
      expect(getComponent(s, 'needs', id)).toBeDefined();
      expect(getComponent(s, 'health', id)?.value).toBe(1);
    }
  });

  it('places a completed hearth at the center', () => {
    const s = createNewGame({ seed: 5 });
    const [hearth] = entitiesWith(s, 'structure');
    expect(getComponent(s, 'structure', hearth!)).toEqual({ kind: 'hearth', progress: 1 });
    expect(getComponent(s, 'position', hearth!)).toEqual({ x: 32, y: 32 });
  });

  it('builds reciprocal, plausible kin relations', () => {
    const s = createNewGame({ seed: 3, pawnCount: 8 });
    let spouses = 0;
    for (const id of entitiesWith(s, 'pawn')) {
      const pawn = getComponent(s, 'pawn', id)!;
      for (const rel of pawn.kin) {
        const other = getComponent(s, 'pawn', rel.targetId)!;
        const reciprocal = { parent: 'child', child: 'parent', spouse: 'spouse', sibling: 'sibling' }[rel.type];
        expect(other.kin).toContainEqual({ type: reciprocal, targetId: id });
        if (rel.type === 'parent') {
          expect(ageInYears(other.birthTick, s.tick)).toBeGreaterThanOrEqual(ageInYears(pawn.birthTick, s.tick) + 14);
        }
        if (rel.type === 'spouse') spouses++;
      }
    }
    expect(spouses).toBeGreaterThan(0);
  });

  it('prefers unique names', () => {
    const s = createNewGame({ seed: 9, pawnCount: 8 });
    const names = entitiesWith(s, 'pawn').map((id) => getComponent(s, 'pawn', id)!.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
