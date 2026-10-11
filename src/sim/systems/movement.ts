import { content } from '../../data/content';
import type { GameState } from '../../data/schemas';
import { entitiesWith, getComponent, removeComponent, setComponent } from '../entities';
import { moveCostAt } from '../pathfinding';
import type { System } from '../system';

/** Advances every entity along its path at tilesPerSecond, slowed by terrain move cost. */
export const movementSystem: System = (state, ctx) => {
  const speed = content.balance.movement.tilesPerSecond;
  let s: GameState = state;
  for (const id of entitiesWith(state, 'movement')) {
    const movement = getComponent(s, 'movement', id);
    let pos = getComponent(s, 'position', id);
    if (!movement || !pos) continue;

    const path = [...movement.path];
    let progress = movement.progress;
    let budget = speed * ctx.dt;
    while (path.length > 0 && budget > 0) {
      const next = path[0]!;
      const cost = moveCostAt(s.map, next.x, next.y);
      const needed = (1 - progress) * cost;
      if (budget >= needed) {
        budget -= needed;
        progress = 0;
        pos = next;
        path.shift();
      } else {
        progress += budget / cost;
        budget = 0;
      }
    }

    s = setComponent(s, 'position', id, { ...pos });
    s = path.length > 0 ? setComponent(s, 'movement', id, { path, progress }) : removeComponent(s, 'movement', id);
  }
  return s;
};
