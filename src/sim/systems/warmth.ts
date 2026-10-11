import { content } from '../../data/content';
import type { GameState, TilePos } from '../../data/schemas';
import { getComponent, setComponent } from '../entities';
import { ambientTemperature } from '../environment';
import { livingPawns, traitNeedMultiplier } from '../pawnQueries';
import { chebyshev, isHearthLit, positionOf, structuresOf } from '../structures';
import type { System } from '../system';
import { perDay } from '../time';

type WarmthSources = { ambient: number; hearths: TilePos[]; shelters: TilePos[] };

/** Everything that affects felt temperature this tick, gathered once rather than per pawn. */
function warmthSources(state: GameState): WarmthSources {
  const positions = (kind: 'hearth' | 'shelter') =>
    structuresOf(state, kind)
      .map((id) => positionOf(state, id))
      .filter((p) => p !== undefined);
  return {
    ambient: ambientTemperature(state),
    hearths: isHearthLit(state) ? positions('hearth') : [],
    shelters: positions('shelter'),
  };
}

function felt(sources: WarmthSources, pos: TilePos): number {
  const w = content.balance.warmth;
  let t = sources.ambient;
  if (sources.hearths.some((h) => chebyshev(h, pos) <= w.hearthRadius)) t += w.hearthBonus;
  if (sources.shelters.some((s) => chebyshev(s, pos) <= w.shelterRadius)) t += w.shelterBonus;
  return t;
}

/** Temperature a pawn feels at pos: ambient plus a lit hearth and shelter nearby. */
export function feltTemperature(state: GameState, pos: TilePos): number {
  return felt(warmthSources(state), pos);
}

/** Warmth recovers when the felt temperature is comfortable and drains in proportion to the cold. */
export const warmthSystem: System = (state, ctx) => {
  const w = content.balance.warmth;
  const sources = warmthSources(state);
  let s: GameState = state;
  for (const id of livingPawns(state)) {
    const pawn = getComponent(s, 'pawn', id);
    const needs = getComponent(s, 'needs', id);
    const pos = getComponent(s, 'position', id);
    if (!pawn || !needs || !pos) continue;
    const t = felt(sources, pos);
    const rate =
      t >= w.comfortTemp
        ? w.recoverPerDay
        : -(w.comfortTemp - t) * w.lossPerDegreePerDay * traitNeedMultiplier(pawn, 'warmth');
    const warmth = Math.min(1, Math.max(0, needs.warmth + perDay(rate, ctx.dt)));
    s = setComponent(s, 'needs', id, { ...needs, warmth });
  }
  return s;
};
