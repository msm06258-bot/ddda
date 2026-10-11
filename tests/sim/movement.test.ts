import { describe, expect, it } from 'vitest';
import type { GameState, TerrainId } from '../../src/data/schemas';
import { getComponent } from '../../src/sim/entities';
import { startMoveTo } from '../../src/sim/movement';
import { findPath } from '../../src/sim/pathfinding';
import { stepTicks } from '../../src/sim/step';
import { movementSystem } from '../../src/sim/systems/movement';
import { TICKS_PER_SECOND } from '../../src/sim/time';
import { addPawn, emptyWorld } from '../helpers';

function paint(state: GameState, terrain: TerrainId, cells: Array<[number, number]>): GameState {
  const tiles = [...state.map.tiles];
  for (const [x, y] of cells) tiles[y * state.map.width + x] = { terrain };
  return { ...state, map: { ...state.map, tiles } };
}

describe('findPath', () => {
  it('finds a straight path on open ground', () => {
    const path = findPath(emptyWorld().map, { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  });

  it('returns [] for the same tile and null for unwalkable or enclosed targets', () => {
    const s = paint(emptyWorld(), 'water', [[5, 5], [4, 6], [6, 6], [5, 7]]);
    expect(findPath(s.map, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
    expect(findPath(s.map, { x: 1, y: 1 }, { x: 5, y: 5 })).toBeNull();
    expect(findPath(s.map, { x: 1, y: 1 }, { x: 5, y: 6 })).toBeNull();
  });

  it('routes around walls', () => {
    const wall: Array<[number, number]> = [];
    for (let y = 0; y < 10; y++) wall.push([5, y]);
    const s = paint(emptyWorld(), 'rock', wall);
    const path = findPath(s.map, { x: 2, y: 2 }, { x: 8, y: 2 })!;
    expect(path.at(-1)).toEqual({ x: 8, y: 2 });
    expect(path.some((p) => p.x === 5 && p.y < 10)).toBe(false);
    for (let i = 1; i < path.length; i++) {
      expect(Math.abs(path[i]!.x - path[i - 1]!.x) + Math.abs(path[i]!.y - path[i - 1]!.y)).toBe(1);
    }
  });

  it('detours around forest when that is cheaper', () => {
    // Straight through 4 forest tiles costs 4 * 1.6 + 1 = 7.4; going around costs 7.
    const s = paint(emptyWorld(), 'forest', [[1, 2], [2, 2], [3, 2], [4, 2]]);
    const path = findPath(s.map, { x: 0, y: 2 }, { x: 5, y: 2 })!;
    expect(path.some((p) => p.y === 2 && p.x >= 1 && p.x <= 4)).toBe(false);
    // ...but crosses a single forest tile rather than detour.
    const short = findPath(paint(emptyWorld(), 'forest', [[3, 2]]).map, { x: 2, y: 2 }, { x: 4, y: 2 })!;
    expect(short).toHaveLength(2);
  });
});

describe('movementSystem', () => {
  it('walks at the configured speed and stops at the goal', () => {
    const { state, id } = addPawn(emptyWorld(), { position: { x: 0, y: 0 } });
    const moving = startMoveTo(state, id, { x: 4, y: 0 })!;
    const oneSecond = stepTicks(moving, [movementSystem], TICKS_PER_SECOND).state;
    expect(getComponent(oneSecond, 'position', id)).toEqual({ x: 2, y: 0 });
    const done = stepTicks(oneSecond, [movementSystem], TICKS_PER_SECOND * 2).state;
    expect(getComponent(done, 'position', id)).toEqual({ x: 4, y: 0 });
    expect(getComponent(done, 'movement', id)).toBeUndefined();
  });

  it('is slower through forest', () => {
    const base = addPawn(emptyWorld(), { position: { x: 0, y: 0 } });
    const forest = paint(base.state, 'forest', [[1, 0], [2, 0]]);
    const moving = startMoveTo(paint(forest, 'rock', [[0, 1], [1, 1], [2, 1]]), base.id, { x: 2, y: 0 })!;
    const after = stepTicks(moving, [movementSystem], TICKS_PER_SECOND).state;
    expect(getComponent(after, 'position', base.id)!.x).toBeLessThan(2);
  });

  it('refuses unreachable targets', () => {
    const { state, id } = addPawn(emptyWorld());
    expect(startMoveTo(paint(state, 'water', [[9, 9]]), id, { x: 9, y: 9 })).toBeNull();
  });
});
