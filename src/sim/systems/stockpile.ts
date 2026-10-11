import { content } from '../../data/content';
import type { GameState } from '../../data/schemas';
import { ambientTemperature } from '../environment';
import { structuresOf } from '../structures';
import type { System } from '../system';
import { perDay } from '../time';

/** Fraction of food+meals lost per day at the current temperature and storage. */
export function spoilageRatePerDay(state: GameState): number {
  const sp = content.balance.spoilage;
  const total = state.resources.food + state.resources.meals;
  if (total <= 0) return 0;
  const tempFactor = Math.max(0, ambientTemperature(state)) / sp.referenceTemp;
  const capacity = structuresOf(state, 'storagePit').length * sp.storagePitCapacity;
  const stored = Math.min(total, capacity) / total;
  return sp.baseRatePerDay * tempFactor * (stored * sp.storagePitMultiplier + (1 - stored));
}

/** Food and meals rot with warmth (pits slow it); every complete hearth burns wood. */
export const stockpileSystem: System = (state, ctx) => {
  const rate = perDay(spoilageRatePerDay(state), ctx.dt);
  const burn = perDay(content.balance.hearth.woodPerDay * structuresOf(state, 'hearth').length, ctx.dt);
  const r = state.resources;
  return {
    ...state,
    resources: {
      ...r,
      food: r.food * (1 - rate),
      meals: r.meals * (1 - rate),
      wood: Math.max(0, r.wood - burn),
    },
  };
};
