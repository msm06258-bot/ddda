import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import type { GameState } from '../../src/data/schemas';
import { getComponent, setComponent } from '../../src/sim/entities';
import { stepTicks } from '../../src/sim/step';
import { campCenter, isHearthLit, placeStructure, structuresOf } from '../../src/sim/structures';
import { jobSelectionSystem, jobWorkSystem } from '../../src/sim/systems/jobs';
import { movementSystem } from '../../src/sim/systems/movement';
import { feltTemperature } from '../../src/sim/systems/warmth';
import { TICKS_PER_DAY } from '../../src/sim/time';
import { addPawn, addStructure, emptyWorld } from '../helpers';

const rich = (): GameState => ({
  ...emptyWorld(),
  tick: TICKS_PER_DAY * 10 + TICKS_PER_DAY / 2,
  resources: { food: 500, meals: 50, wood: 100, stone: 100, hides: 20 },
});

describe('placeStructure', () => {
  it('places a blueprint and pays the cost up front', () => {
    const r = placeStructure(rich(), 'shelter', { x: 3, y: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(getComponent(r.state, 'structure', r.id)).toEqual({ kind: 'shelter', progress: 0 });
    expect(r.state.resources.wood).toBe(100 - content.structures.shelter.cost.wood!);
    expect(r.state.resources.hides).toBe(20 - content.structures.shelter.cost.hides!);
  });

  it('rejects unaffordable, occupied, or unwalkable placements', () => {
    const poor = { ...rich(), resources: { food: 0, meals: 0, wood: 0, stone: 0, hides: 0 } };
    expect(placeStructure(poor, 'hearth', { x: 3, y: 3 })).toMatchObject({ ok: false });
    const first = placeStructure(rich(), 'hearth', { x: 3, y: 3 });
    expect(first.ok && placeStructure(first.state, 'shelter', { x: 3, y: 3 }).ok).toBe(false);
    const s = rich();
    const water = { ...s, map: { ...s.map, tiles: s.map.tiles.map((t, i) => (i === 0 ? { terrain: 'water' as const } : t)) } };
    expect(placeStructure(water, 'hearth', { x: 0, y: 0 }).ok).toBe(false);
    expect(placeStructure(rich(), 'hearth', { x: -1, y: 0 }).ok).toBe(false);
  });

  it('gets built by a pawn and announces completion', () => {
    const placed = placeStructure(rich(), 'storagePit', { x: 6, y: 5 });
    if (!placed.ok) throw new Error(placed.reason);
    const { state } = addPawn(placed.state, { position: { x: 5, y: 5 }, skills: { building: 20 } });
    const { state: after, events } = stepTicks(state, [jobSelectionSystem, movementSystem, jobWorkSystem], TICKS_PER_DAY);
    expect(getComponent(after, 'structure', placed.id)!.progress).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'structureCompleted', entityId: placed.id }));
    expect(structuresOf(after, 'storagePit')).toEqual([placed.id]);
  });

  it('does not count blueprints as working structures', () => {
    const s = addStructure(rich(), 'hearth', { x: 5, y: 5 }, 0.5).state;
    expect(isHearthLit(s)).toBe(false);
    expect(campCenter(s)).toEqual({ x: 12, y: 12 });
  });
});

describe('structure effects', () => {
  it('shelters add warmth nearby', () => {
    const s = addStructure(rich(), 'shelter', { x: 5, y: 5 }).state;
    expect(feltTemperature(s, { x: 5, y: 5 })).toBeGreaterThan(feltTemperature(s, { x: 15, y: 15 }));
  });

  it('shelters hold a limited number of sleepers', () => {
    let s = addStructure({ ...rich(), tick: TICKS_PER_DAY * 10 }, 'shelter', { x: 5, y: 5 }).state;
    s = addStructure(s, 'hearth', { x: 8, y: 8 }).state;
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const p = addPawn(s, { position: { x: 6, y: 6 }, needs: { rest: 0.2 } });
      s = p.state;
      ids.push(p.id);
    }
    s = stepTicks(s, [jobSelectionSystem], 1).state;
    const inShelter = ids.filter((id) => getComponent(s, 'job', id)?.targetEntity !== null && getComponent(s, 'job', id)?.kind === 'rest');
    expect(inShelter.length).toBe(content.balance.rest.shelterCapacity);
  });

  it('a pawn sleeping in the open gets a memory of it', () => {
    const { state, id } = addPawn(addStructure({ ...rich(), tick: TICKS_PER_DAY * 10 }, 'hearth', { x: 8, y: 8 }).state, {
      position: { x: 9, y: 8 },
      needs: { rest: 0.9 },
    });
    const resting = setComponent(state, 'job', id, { kind: 'rest', targetTile: { x: 9, y: 8 }, targetEntity: null, progress: 0, startedTick: state.tick });
    const after = stepTicks(resting, [jobWorkSystem], 200).state;
    expect(getComponent(after, 'mood', id)!.memories.some((m) => m.kind === 'sleptOutside')).toBe(true);
  });
});
