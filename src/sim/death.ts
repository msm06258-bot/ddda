import { content } from '../data/content';
import type { DeathCause, EntityId, GameState } from '../data/schemas';
import { getComponent, removeComponent, setComponent } from './entities';
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
