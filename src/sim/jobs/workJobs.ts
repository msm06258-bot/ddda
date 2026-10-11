import { content } from '../../data/content';
import type { EntityId, GameState, TilePos } from '../../data/schemas';
import { buryCorpse, unburiedCorpses } from '../death';
import { getComponent, setComponent } from '../entities';
import { currentSeason } from '../environment';
import { isWalkable } from '../map';
import { livingPawns } from '../pawnQueries';
import { blueprints, campCenter, isHearthLit, manhattan, positionOf } from '../structures';
import {
  addResources,
  bestTile,
  countJobsOnEntity,
  foodDemand,
  otherJobs,
  pawnSkillFactor,
  reservedTiles,
  spotNearCamp,
  woodDemand,
} from './common';
import type { JobHandler } from './types';

function pawnPos(state: GameState, id: EntityId): TilePos {
  return getComponent(state, 'position', id) ?? campCenter(state);
}

/** Nearest tile satisfying pred, measured from the pawn, skipping tiles other pawns have claimed. */
function nearestTile(
  state: GameState,
  id: EntityId,
  kind: 'forage' | 'chopWood' | 'quarry',
  pred: (pos: TilePos) => boolean,
  value: (pos: TilePos) => number = () => 1,
): TilePos | null {
  const from = pawnPos(state, id);
  return bestTile(state, (pos) => (pred(pos) ? value(pos) / (1 + manhattan(from, pos) * 0.05) : null), reservedTiles(state, id, [kind]));
}

const terrainOf = (state: GameState, p: TilePos) => state.map.tiles[p.y * state.map.width + p.x]?.terrain;

export const forage: JobHandler = {
  utility(state) {
    return foodDemand(state) * Math.min(1, content.climate.forageYield[currentSeason(state.tick)]);
  },
  findTarget(state, id) {
    const yields = content.climate.terrainForageYield;
    const tile = nearestTile(
      state,
      id,
      'forage',
      (p) => (yields[terrainOf(state, p)!] ?? 0) > 0,
      (p) => yields[terrainOf(state, p)!] ?? 0,
    );
    return tile && { targetTile: tile, targetEntity: null };
  },
  complete(state, id, job) {
    const t = job.targetTile ? terrainOf(state, job.targetTile) : undefined;
    const terrainYield = (t && content.climate.terrainForageYield[t]) ?? 1;
    const scale = pawnSkillFactor(state, id, 'foraging') * terrainYield * content.climate.forageYield[currentSeason(state.tick)];
    return addResources(state, content.jobs.forage.yield, scale);
  },
};

export const hunt: JobHandler = {
  utility(state) {
    const hides = state.resources.hides < 6 ? 0.3 : 0;
    return Math.min(1, foodDemand(state) * content.climate.huntYield[currentSeason(state.tick)] + hides);
  },
  findTarget(state, _id, rng) {
    const w = content.balance.work;
    const center = campCenter(state);
    for (let i = 0; i < 30; i++) {
      const p = { x: center.x + rng.int(-w.huntMaxDistance, w.huntMaxDistance + 1), y: center.y + rng.int(-w.huntMaxDistance, w.huntMaxDistance + 1) };
      const d = manhattan(p, center);
      if (d >= w.huntMinDistance && d <= w.huntMaxDistance && isWalkable(state.map, p.x, p.y)) {
        return { targetTile: p, targetEntity: null };
      }
    }
    return null;
  },
  complete(state, id, _job, ctx) {
    const w = content.balance.work;
    const skill = getComponent(state, 'pawn', id)?.skills.hunting ?? 0;
    if (!ctx.rng.chance(w.huntBaseSuccess + w.huntSuccessPerSkill * skill)) return state;
    return addResources(state, content.jobs.hunt.yield, content.climate.huntYield[currentSeason(state.tick)]);
  },
};

export const cook: JobHandler = {
  utility(state, id) {
    const need = content.jobs.cook.consume.food ?? 0;
    if (state.resources.food < need || !isHearthLit(state)) return 0;
    if (otherJobs(state, id, ['cook']).length > 0) return 0;
    return state.resources.meals < livingPawns(state).length * 2 ? 1 : 0.2;
  },
  findTarget: (state, id, rng) => ({ targetTile: spotNearCamp(state, id, rng, 1), targetEntity: null }),
  complete(state, id) {
    const def = content.jobs.cook;
    const need = def.consume.food ?? 0;
    if (state.resources.food < need) return state;
    const skill = getComponent(state, 'pawn', id)?.skills.cooking ?? 0;
    const paid = { ...state, resources: { ...state.resources, food: state.resources.food - need } };
    return addResources(paid, def.yield, 1 + skill / 40);
  },
};

export const chopWood: JobHandler = {
  utility: (state) => woodDemand(state),
  findTarget(state, id) {
    const tile = nearestTile(state, id, 'chopWood', (p) => terrainOf(state, p) === 'forest');
    return tile && { targetTile: tile, targetEntity: null };
  },
  complete: (state, id) => addResources(state, content.jobs.chopWood.yield, pawnSkillFactor(state, id, 'woodcutting')),
};

export const quarry: JobHandler = {
  utility(state) {
    const target = content.balance.work.targetStone;
    return Math.max(0, 1 - state.resources.stone / target);
  },
  findTarget(state, id) {
    const nextToRock = (p: TilePos) =>
      isWalkable(state.map, p.x, p.y) &&
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => terrainOf(state, { x: p.x + dx!, y: p.y + dy! }) === 'rock');
    const tile = nearestTile(state, id, 'quarry', nextToRock);
    return tile && { targetTile: tile, targetEntity: null };
  },
  complete: (state, id) => addResources(state, content.jobs.quarry.yield, pawnSkillFactor(state, id, 'building')),
};

function openBlueprint(state: GameState, id: EntityId): EntityId | null {
  const max = content.balance.work.maxBuildersPerSite;
  const from = pawnPos(state, id);
  const open = blueprints(state).filter((b) => countJobsOnEntity(state, id, 'build', b) < max);
  if (open.length === 0) return null;
  return open.reduce((a, b) => (manhattan(positionOf(state, a)!, from) <= manhattan(positionOf(state, b)!, from) ? a : b));
}

export const build: JobHandler = {
  utility: (state, id) => (openBlueprint(state, id) === null ? 0 : 1),
  findTarget(state, id) {
    const site = openBlueprint(state, id);
    return site === null ? null : { targetTile: positionOf(state, site)!, targetEntity: site };
  },
  stillValid(state, _id, job) {
    const s = job.targetEntity === null ? undefined : getComponent(state, 'structure', job.targetEntity);
    return s !== undefined && s.progress < 1;
  },
  work(state, id, job, ctx, speed) {
    const siteId = job.targetEntity!;
    const site = getComponent(state, 'structure', siteId)!;
    const def = content.structures[site.kind];
    const progress = Math.min(1, site.progress + speed / def.buildTicks);
    let s = setComponent(state, 'structure', siteId, { ...site, progress });
    const shift = Math.min(1, job.progress + speed / content.jobs.build.workTicks);
    if (progress >= 1) {
      ctx.emit({ type: 'structureCompleted', entityId: siteId });
      ctx.emit({ type: 'log', category: 'build', text: `The ${def.label.toLowerCase()} is finished.` });
    }
    return { state: s, job: { ...job, progress: shift }, done: progress >= 1 || shift >= 1 };
  },
};

function claimableCorpse(state: GameState, id: EntityId): EntityId | null {
  const from = pawnPos(state, id);
  const free = unburiedCorpses(state).filter((c) => countJobsOnEntity(state, id, 'bury', c) === 0);
  if (free.length === 0) return null;
  return free.reduce((a, b) => (manhattan(positionOf(state, a)!, from) <= manhattan(positionOf(state, b)!, from) ? a : b));
}

export const bury: JobHandler = {
  utility: (state, id) => (claimableCorpse(state, id) === null ? 0 : 1),
  findTarget(state, id) {
    const corpse = claimableCorpse(state, id);
    return corpse === null ? null : { targetTile: positionOf(state, corpse)!, targetEntity: corpse };
  },
  stillValid(state, _id, job) {
    return job.targetEntity !== null && getComponent(state, 'corpse', job.targetEntity)?.moundId === null;
  },
  complete: (state, id, job, ctx) => buryCorpse(state, job.targetEntity!, id, ctx),
};
