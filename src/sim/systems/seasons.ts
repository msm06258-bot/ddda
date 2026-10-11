import { content } from '../../data/content';
import type { System } from '../system';
import { currentSeason } from '../environment';
import { TICKS_PER_SEASON } from '../time';

/** Announces each turn of the season in the log. */
export const seasonsSystem: System = (state, ctx) => {
  if (ctx.tick > 0 && ctx.tick % TICKS_PER_SEASON === 0) {
    ctx.emit({ type: 'log', category: 'omen', text: content.lore.seasonTurn[currentSeason(ctx.tick)] });
  }
  return state;
};
