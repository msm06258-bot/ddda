import { describe, expect, it } from 'vitest';
import {
  createEntity,
  entitiesWith,
  getComponent,
  removeEntity,
  setComponent,
} from '../../src/sim/entities';
import { createEmptyState } from '../../src/sim/state';

describe('entities', () => {
  it('allocates increasing ids', () => {
    const a = createEntity(createEmptyState(1));
    const b = createEntity(a.state);
    expect(b.id).toBe(a.id + 1);
  });

  it('sets, gets and removes components immutably', () => {
    const { state: s0, id } = createEntity(createEmptyState(1));
    const s1 = setComponent(s0, 'position', id, { x: 3, y: 4 });
    expect(getComponent(s0, 'position', id)).toBeUndefined();
    expect(getComponent(s1, 'position', id)).toEqual({ x: 3, y: 4 });

    const s2 = setComponent(s1, 'health', id, { value: 1, lastHarm: null });
    const s3 = removeEntity(s2, id);
    expect(getComponent(s2, 'health', id)).toBeDefined();
    expect(getComponent(s3, 'health', id)).toBeUndefined();
    expect(getComponent(s3, 'position', id)).toBeUndefined();
  });

  it('lists entities in numeric order', () => {
    let s = createEmptyState(1);
    for (let i = 0; i < 12; i++) {
      const c = createEntity(s);
      s = setComponent(c.state, 'health', c.id, { value: 1, lastHarm: null });
    }
    const ids = entitiesWith(s, 'health');
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids).toHaveLength(12);
  });
});
