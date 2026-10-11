import { content } from '../data/content';
import type { EntityId, GameState, Stockpile, StructureKind, TilePos } from '../data/schemas';
import { createEntity, entitiesWith, getComponent, setComponent } from './entities';
import { isWalkable } from './map';

/** Chebyshev (king-move) distance; used for "within radius" checks. */
export function chebyshev(a: TilePos, b: TilePos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function structuresOf(state: GameState, kind: StructureKind, completeOnly = true): EntityId[] {
  return entitiesWith(state, 'structure').filter((id) => {
    const s = getComponent(state, 'structure', id);
    return s !== undefined && s.kind === kind && (!completeOnly || s.progress >= 1);
  });
}

export function blueprints(state: GameState): EntityId[] {
  return entitiesWith(state, 'structure').filter((id) => (getComponent(state, 'structure', id)?.progress ?? 1) < 1);
}

/** Hearths burn wood from the shared stockpile; with no wood, every hearth is cold. */
export function isHearthLit(state: GameState): boolean {
  return state.resources.wood > 0 && structuresOf(state, 'hearth').length > 0;
}

export function positionOf(state: GameState, id: EntityId): TilePos | undefined {
  return getComponent(state, 'position', id);
}

/** Any complete structure of this kind within radius (Chebyshev) of pos. */
export function isNear(state: GameState, kind: StructureKind, pos: TilePos, radius: number): boolean {
  return structuresOf(state, kind).some((id) => {
    const p = positionOf(state, id);
    return p !== undefined && chebyshev(p, pos) <= radius;
  });
}

export function nearestStructure(
  state: GameState,
  kind: StructureKind,
  from: TilePos,
  completeOnly = true,
): EntityId | null {
  let best: EntityId | null = null;
  let bestD = Infinity;
  for (const id of structuresOf(state, kind, completeOnly)) {
    const p = positionOf(state, id);
    if (!p) continue;
    const d = manhattan(p, from);
    if (d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}

/** The camp's heart: the oldest complete hearth, or the map center if there is none. */
export function campCenter(state: GameState): TilePos {
  const [hearth] = structuresOf(state, 'hearth');
  const p = hearth === undefined ? undefined : positionOf(state, hearth);
  return p ?? { x: Math.floor(state.map.width / 2), y: Math.floor(state.map.height / 2) };
}

export function canAfford(resources: Stockpile, cost: Partial<Stockpile>): boolean {
  return Object.entries(cost).every(([r, n]) => resources[r as keyof Stockpile] >= (n ?? 0));
}

export function structureAt(state: GameState, pos: TilePos): EntityId | null {
  for (const id of entitiesWith(state, 'structure')) {
    const p = positionOf(state, id);
    if (p && p.x === pos.x && p.y === pos.y) return id;
  }
  return null;
}

export type PlaceResult = { ok: true; state: GameState; id: EntityId } | { ok: false; reason: string };

/** Places a blueprint (progress 0) and pays its full cost up front. */
export function placeStructure(state: GameState, kind: StructureKind, pos: TilePos): PlaceResult {
  const def = content.structures[kind];
  if (!isWalkable(state.map, pos.x, pos.y)) return { ok: false, reason: 'Cannot build there' };
  if (structureAt(state, pos) !== null) return { ok: false, reason: 'Something is already built there' };
  if (!canAfford(state.resources, def.cost)) return { ok: false, reason: `Not enough materials for ${def.label}` };

  const resources = { ...state.resources };
  for (const [r, n] of Object.entries(def.cost)) resources[r as keyof Stockpile] -= n ?? 0;

  const created = createEntity({ ...state, resources });
  let s = setComponent(created.state, 'structure', created.id, { kind, progress: 0 });
  s = setComponent(s, 'position', created.id, { ...pos });
  return { ok: true, state: s, id: created.id };
}
