import { content } from '../../data/content';
import type { GameState, TilePos } from '../../data/schemas';
import { getComponent, setComponent } from '../entities';
import { ambientTemperature } from '../environment';
import { livingPawns, traitNeedMultiplier } from '../pawnQueries';
import { isHearthLit, isNear } from '../structures';
import type { System } from '../system';
import { perDay } from '../time';

/** Temperature a pawn feels at pos: ambient plus a lit hearth and shelter nearby. */
export function feltTemperature(state: GameState, pos: TilePos): number {
  const w = content.balance.warmth;
  let t = ambientTemperature(state);
  if (isHearthLit(state) && isNear(state, 'hearth', pos, w.hearthRadius)) t += w.hearthBonus;
  if (isNear(state, 'shelter', pos, w.shelterRadius)) t += w.shelterBonus;
  return t;
}

/** Warmth recovers when the felt temperature is comfortable and drains in proportion to the cold. */
export const warmthSystem: System = (state, ctx) => {
  const w = content.balance.warmth;
  let s: GameState = state;
  for (const id of livingPawns(state)) {
    const pawn = getComponent(s, 'pawn', id);
    const needs = getComponent(s, 'needs', id);
    const pos = getComponent(s, 'position', id);
    if (!pawn || !needs || !pos) continue;
    const felt = feltTemperature(s, pos);
    const rate =
      felt >= w.comfortTemp
        ? w.recoverPerDay
        : -(w.comfortTemp - felt) * w.lossPerDegreePerDay * traitNeedMultiplier(pawn, 'warmth');
    const warmth = Math.min(1, Math.max(0, needs.warmth + perDay(rate, ctx.dt)));
    s = setComponent(s, 'needs', id, { ...needs, warmth });
  }
  return s;
};
