import { content } from '../data/content';
import type { DeathCause, EntityId, GameState, TilePos } from '../data/schemas';
import { createEntity, entitiesWith, getComponent, removeComponent, setComponent } from './entities';
import { isWalkable } from './map';
import { campCenter, chebyshev, nearestStructure, structureAt } from './structures';
import { formatLore } from './lore';
import { addMemory } from './memories';
import { isAlive, isKin, livingPawns, pawnName } from './pawnQueries';
import type { SystemContext } from './system';

/**
 * Turns a living pawn into a corpse where it stands, emits death events,
 * and gives every survivor a grief memory (stronger for kin).
 */
export function killPawn(
  state: GameState,
  id: EntityId,
  cause: DeathCause,
  ctx: SystemContext,
): GameState {
  if (!isAlive(state, id)) return state;
  const name = pawnName(state, id);
  const { mourning } = content.balance;

  let s = setComponent(state, 'corpse', id, { cause, diedTick: state.tick, moundId: null });
  for (const c of ['needs', 'mood', 'health', 'job', 'movement'] as const) s = removeComponent(s, c, id);

  ctx.emit({ type: 'pawnDied', pawnId: id, cause });
  ctx.emit({ type: 'log', category: 'death', text: formatLore(content.lore.death[cause], { deceased: name }) });

  for (const survivor of livingPawns(s)) {
    const pawn = getComponent(s, 'pawn', survivor);
    const kin = pawn !== undefined && isKin(pawn, id);
    s = addMemory(s, survivor, {
      kind: 'grief',
      text: kin ? `Mourns ${name}, their kin` : `Mourns ${name}`,
      moodEffect: kin ? mourning.kinGriefMood : mourning.griefMood,
      durationDays: mourning.griefDays,
      subjectId: id,
    });
  }
  return s;
}

/** Corpses not yet in a mound, ascending by ID. */
export function unburiedCorpses(state: GameState): EntityId[] {
  return entitiesWith(state, 'corpse').filter((id) => getComponent(state, 'corpse', id)?.moundId === null);
}

/** Finds a free walkable tile a short walk from camp for a new kurgan. */
function moundSite(state: GameState, ctx: SystemContext): TilePos {
  const center = campCenter(state);
  for (let attempt = 0; attempt < 60; attempt++) {
    const r = 4 + Math.floor(attempt / 15);
    const pos = { x: center.x + ctx.rng.int(-r - 2, r + 3), y: center.y + ctx.rng.int(-r - 2, r + 3) };
    if (chebyshev(pos, center) < 4) continue;
    if (isWalkable(state.map, pos.x, pos.y) && structureAt(state, pos) === null) return pos;
  }
  return center;
}

/**
 * Lays a corpse in the nearest complete burial mound (raising a new one near camp if none exists),
 * then holds the funeral: a burial log line, meaning and a memory for every survivor.
 */
export function buryCorpse(state: GameState, corpseId: EntityId, buriedBy: EntityId, ctx: SystemContext): GameState {
  const corpse = getComponent(state, 'corpse', corpseId);
  if (!corpse || corpse.moundId !== null) return state;
  const { mourning } = content.balance;

  let s = state;
  let moundId = nearestStructure(s, 'burialMound', campCenter(s));
  if (moundId === null) {
    const created = createEntity(s);
    moundId = created.id;
    s = setComponent(created.state, 'structure', moundId, { kind: 'burialMound', progress: 1 });
    s = setComponent(s, 'position', moundId, moundSite(s, ctx));
    ctx.emit({ type: 'log', category: 'build', text: 'The band raised a new mound against the sky.' });
  }

  s = setComponent(s, 'corpse', corpseId, { ...corpse, moundId });
  s = setComponent(s, 'position', corpseId, { ...getComponent(s, 'position', moundId)! });

  const deceased = pawnName(s, corpseId);
  ctx.emit({ type: 'pawnBuried', pawnId: corpseId, moundId });
  ctx.emit({
    type: 'log',
    category: 'ritual',
    text: formatLore(ctx.rng.pick(content.lore.burial), { name: pawnName(s, buriedBy), deceased }),
  });

  for (const id of livingPawns(s)) {
    const needs = getComponent(s, 'needs', id);
    if (needs) s = setComponent(s, 'needs', id, { ...needs, meaning: Math.min(1, needs.meaning + mourning.burialMeaning) });
    s = addMemory(s, id, {
      kind: 'burial',
      text: `Laid ${deceased} to rest`,
      moodEffect: mourning.burialMood,
      durationDays: mourning.burialMemoryDays,
      subjectId: corpseId,
    });
  }
  return s;
}
