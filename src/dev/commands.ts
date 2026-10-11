import { content } from '../data/content';
import type { DeathCause, EntityId, GameState, ResourceId } from '../data/schemas';
import { killPawn } from '../sim/death';
import { getComponent, setComponent } from '../sim/entities';
import { spotNearCamp } from '../sim/jobs/common';
import { livingPawns, pawnName } from '../sim/pawnQueries';
import { spawnPawn } from '../sim/pawns';
import type { SystemContext } from '../sim/system';

/** Dev/debug commands. Each is a pure (state, ctx) => state function applied between ticks via runner.apply. */
export type Command = (state: GameState, ctx: SystemContext) => GameState;

export const devSpawnPawn: Command = (state, ctx) => {
  const position = spotNearCamp(state, -1, ctx.rng);
  const r = spawnPawn(state, ctx.rng, { sex: ctx.rng.pick(['female', 'male']), ageYears: ctx.rng.int(16, 40), position });
  ctx.emit({ type: 'pawnSpawned', pawnId: r.id });
  ctx.emit({ type: 'log', category: 'birth', text: `${pawnName(r.state, r.id)} walked in from the steppe and joined the band.` });
  return r.state;
};

export function devGrantResources(amount: number, ids?: readonly ResourceId[]): Command {
  return (state) => {
    const resources = { ...state.resources };
    for (const r of ids ?? (Object.keys(resources) as ResourceId[])) resources[r] += amount;
    return { ...state, resources };
  };
}

export function devKillPawn(id: EntityId, cause: DeathCause = 'oldAge'): Command {
  return (state, ctx) => killPawn(state, id, cause, ctx);
}

export type DevEventId = 'omen' | 'coldSnap' | 'goodHunt' | 'blight';

export const DEV_EVENTS: Record<DevEventId, { label: string; command: Command }> = {
  omen: {
    label: 'Omen',
    command: (state, ctx) => {
      const lines = Object.values(content.lore.seasonTurn);
      ctx.emit({ type: 'log', category: 'omen', text: `An omen: ${ctx.rng.pick(lines)}` });
      return state;
    },
  },
  coldSnap: {
    label: 'Cold snap',
    command: (state, ctx) => {
      let s = state;
      for (const id of livingPawns(state)) {
        const needs = getComponent(s, 'needs', id);
        if (needs) s = setComponent(s, 'needs', id, { ...needs, warmth: Math.max(0, needs.warmth - 0.4) });
      }
      ctx.emit({ type: 'log', category: 'omen', text: 'A bitter wind came down from the north, out of season.' });
      return s;
    },
  },
  goodHunt: {
    label: 'Aurochs herd',
    command: (state, ctx) => {
      ctx.emit({ type: 'log', category: 'omen', text: 'An aurochs herd passed close to camp. The hunters ate well.' });
      return devGrantResources(30, ['food'])(devGrantResources(4, ['hides'])(state, ctx), ctx);
    },
  },
  blight: {
    label: 'Rot in the stores',
    command: (state, ctx) => {
      ctx.emit({ type: 'log', category: 'omen', text: 'Mould crept into the stores. Half the food was lost.' });
      return { ...state, resources: { ...state.resources, food: state.resources.food / 2, meals: state.resources.meals / 2 } };
    },
  },
};
