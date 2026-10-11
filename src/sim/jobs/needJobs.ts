import { content } from '../../data/content';
import type { EntityId, GameState } from '../../data/schemas';
import { getComponent, setComponent } from '../entities';
import { isNight } from '../environment';
import { formatLore } from '../lore';
import { isWalkable } from '../map';
import { addMemory } from '../memories';
import { livingPawns, pawnName } from '../pawnQueries';
import { perDay } from '../time';
import { chebyshev, isHearthLit, positionOf, structuresOf } from '../structures';
import { countJobsOnEntity, spotNearCamp, urgency } from './common';
import type { JobHandler } from './types';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function needOf(state: GameState, id: EntityId, need: 'hunger' | 'warmth' | 'rest' | 'social' | 'meaning'): number {
  return getComponent(state, 'needs', id)?.[need] ?? 1;
}

function restoreNeed(state: GameState, id: EntityId, need: 'hunger' | 'rest' | 'social' | 'meaning', amount: number) {
  const needs = getComponent(state, 'needs', id);
  if (!needs) return state;
  return setComponent(state, 'needs', id, { ...needs, [need]: clamp01(needs[need] + amount) });
}

export const idle: JobHandler = {
  utility: () => 1,
  findTarget(state, pawnId, rng) {
    const pos = getComponent(state, 'position', pawnId);
    if (!pos) return null;
    for (let i = 0; i < 8; i++) {
      const t = { x: pos.x + rng.int(-3, 4), y: pos.y + rng.int(-3, 4) };
      if (isWalkable(state.map, t.x, t.y)) return { targetTile: t, targetEntity: null };
    }
    return { targetTile: pos, targetEntity: null };
  },
};

export const eat: JobHandler = {
  utility(state, id) {
    if (state.resources.meals < 1 && state.resources.food < 1) return 0;
    return urgency(needOf(state, id, 'hunger'), content.balance.food.eatThreshold);
  },
  findTarget: (state, id, rng) => ({ targetTile: spotNearCamp(state, id, rng), targetEntity: null }),
  complete(state, id) {
    const f = content.balance.food;
    const r = state.resources;
    if (r.meals >= 1) {
      const s = restoreNeed({ ...state, resources: { ...r, meals: r.meals - 1 } }, id, 'hunger', f.mealNutrition);
      return addMemory(s, id, { kind: 'ateMeal', text: 'Ate a hot meal', moodEffect: f.mealMoodEffect, durationDays: f.foodMemoryDays });
    }
    if (r.food >= 1) {
      const s = restoreNeed({ ...state, resources: { ...r, food: r.food - 1 } }, id, 'hunger', f.rawNutrition);
      return addMemory(s, id, { kind: 'ateRaw', text: 'Ate raw food', moodEffect: f.rawMoodEffect, durationDays: f.foodMemoryDays });
    }
    return state;
  },
};

/** A shelter with a free sleeping place, preferring the one nearest the pawn. */
function freeShelter(state: GameState, pawnId: EntityId): EntityId | null {
  const pos = getComponent(state, 'position', pawnId);
  const capacity = content.balance.rest.shelterCapacity;
  const free = structuresOf(state, 'shelter').filter((s) => countJobsOnEntity(state, pawnId, 'rest', s) < capacity);
  if (!pos || free.length === 0) return null;
  return free.reduce((a, b) => (chebyshev(positionOf(state, a)!, pos) <= chebyshev(positionOf(state, b)!, pos) ? a : b));
}

export const rest: JobHandler = {
  utility(state, id) {
    return urgency(needOf(state, id, 'rest'), isNight(state.tick) ? 0.85 : 0.3);
  },
  findTarget(state, id, rng) {
    const shelter = freeShelter(state, id);
    if (shelter !== null) return { targetTile: positionOf(state, shelter)!, targetEntity: shelter };
    return { targetTile: spotNearCamp(state, id, rng), targetEntity: null };
  },
  work(state, id, job, ctx) {
    const r = content.balance.rest;
    const inShelter = job.targetEntity !== null;
    const rate = (content.jobs.rest.restorePerDay.rest ?? 0) * (inShelter ? 1 : r.openAirMultiplier);
    let s = restoreNeed(state, id, 'rest', perDay(rate, ctx.dt));
    const restNow = needOf(s, id, 'rest');
    const done = restNow >= 0.98 || (!isNight(ctx.tick) && restNow >= 0.8);
    if (done && !inShelter) {
      s = addMemory(s, id, { kind: 'sleptOutside', text: 'Slept in the open', moodEffect: r.openAirMoodEffect, durationDays: 1 });
    }
    return { state: s, job, done };
  },
};

export const warmUp: JobHandler = {
  utility(state, id) {
    return isHearthLit(state) ? urgency(needOf(state, id, 'warmth'), 0.5) : 0;
  },
  findTarget: (state, id, rng) => ({ targetTile: spotNearCamp(state, id, rng, 1), targetEntity: null }),
  stillValid: (state) => isHearthLit(state),
  work: (state, id, job) => ({ state, job, done: needOf(state, id, 'warmth') >= 0.9 }),
};

export const socialize: JobHandler = {
  utility(state, id) {
    return livingPawns(state).length > 1
      ? urgency(needOf(state, id, 'social'), content.balance.needs.luxuryThreshold)
      : 0;
  },
  findTarget: (state, id, rng) => ({ targetTile: spotNearCamp(state, id, rng), targetEntity: null }),
  work(state, id, job, ctx) {
    const pos = getComponent(state, 'position', id)!;
    const company = livingPawns(state).some((o) => {
      const p = getComponent(state, 'position', o);
      return o !== id && p !== undefined && chebyshev(p, pos) <= 3;
    });
    const rate = (content.jobs.socialize.restorePerDay.social ?? 0) * (company ? 1 : 0.4);
    const s = restoreNeed(state, id, 'social', perDay(rate, ctx.dt));
    return { state: s, job, done: needOf(s, id, 'social') >= 0.95 };
  },
};

/** Mounds that hold at least one ancestor. */
function ancestorMounds(state: GameState): EntityId[] {
  const mounds = new Set(
    Object.values(state.components.corpse)
      .map((c) => c.moundId)
      .filter((m) => m !== null),
  );
  return structuresOf(state, 'burialMound').filter((m) => mounds.has(m));
}

export const performRitual: JobHandler = {
  utility(state, id) {
    if (structuresOf(state, 'hearth').length === 0) return 0;
    return urgency(needOf(state, id, 'meaning'), content.balance.needs.luxuryThreshold);
  },
  findTarget(state, id, rng) {
    const mounds = ancestorMounds(state);
    if (mounds.length > 0) {
      const mound = rng.pick(mounds);
      const p = positionOf(state, mound)!;
      const spots = [
        { x: p.x + 1, y: p.y },
        { x: p.x - 1, y: p.y },
        { x: p.x, y: p.y + 1 },
        { x: p.x, y: p.y - 1 },
      ].filter((t) => isWalkable(state.map, t.x, t.y));
      return { targetTile: spots.length > 0 ? rng.pick(spots) : p, targetEntity: mound };
    }
    return { targetTile: spotNearCamp(state, id, rng, 1), targetEntity: null };
  },
  complete(state, id, job, ctx) {
    const r = content.balance.ritual;
    const atMound = job.targetEntity !== null;
    const gain = (content.jobs.performRitual.restoreOnComplete.meaning ?? 0) + (atMound ? r.moundMeaningBonus : 0);
    let s = restoreNeed(state, id, 'meaning', gain);
    s = addMemory(s, id, { kind: 'ritual', text: 'Honored the ancestors', moodEffect: r.moodEffect, durationDays: r.memoryDays });

    const name = pawnName(s, id);
    let text = formatLore(ctx.rng.pick(content.lore.ritual), { name });
    if (atMound) {
      const buried = Object.entries(s.components.corpse)
        .filter(([, c]) => c.moundId === job.targetEntity)
        .map(([cid]) => pawnName(s, Number(cid)));
      if (buried.length > 0) {
        text = formatLore(ctx.rng.pick(content.lore.ritualAtMound), { name, ancestor: ctx.rng.pick(buried) });
      }
    }
    ctx.emit({ type: 'log', category: 'ritual', text });
    return s;
  },
};
