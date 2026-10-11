import type { EntityId, GameState, TilePos } from '../data/schemas';
import { getComponent, removeComponent, setComponent } from './entities';
import { findPath } from './pathfinding';

/**
 * Starts walking an entity toward `target`. Returns null if unreachable.
 * Already standing on the target clears any movement.
 */
export function startMoveTo(state: GameState, id: EntityId, target: TilePos): GameState | null {
  const pos = getComponent(state, 'position', id);
  if (!pos) return null;
  const path = findPath(state.map, pos, target);
  if (path === null) return null;
  if (path.length === 0) return removeComponent(state, 'movement', id);
  return setComponent(state, 'movement', id, { path, progress: 0 });
}

export function isMoving(state: GameState, id: EntityId): boolean {
  return (getComponent(state, 'movement', id)?.path.length ?? 0) > 0;
}
