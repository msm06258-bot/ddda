import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import { getComponent, setComponent } from '../../src/sim/entities';
import { isAlive, livingPawns } from '../../src/sim/pawnQueries';
import { linkKin } from '../../src/sim/pawns';
import { stepTicks } from '../../src/sim/step';
import { healthSystem, oldAgeDailyChance } from '../../src/sim/systems/health';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../../src/sim/time';
import { addPawn, emptyWorld } from '../helpers';

describe('healthSystem', () => {
  it('starves a pawn with zero hunger and records the cause', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { hunger: 0 } });
    const days = 1 / content.balance.health.starvationPerDay;
    const { state: after, events } = stepTicks(state, [healthSystem], Math.ceil(days * TICKS_PER_DAY) + 1);
    expect(isAlive(after, id)).toBe(false);
    expect(getComponent(after, 'corpse', id)?.cause).toBe('starvation');
    expect(events).toContainEqual(expect.objectContaining({ type: 'pawnDied', pawnId: id, cause: 'starvation' }));
    expect(events.some((e) => e.type === 'log' && e.category === 'death')).toBe(true);
  });

  it('kills from exposure when warmth is zero', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { warmth: 0 } });
    const after = stepTicks(state, [healthSystem], 2 * TICKS_PER_DAY).state;
    expect(getComponent(after, 'corpse', id)?.cause).toBe('exposure');
  });

  it('regenerates when fed and warm', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { hunger: 0 } });
    const hurt = stepTicks(state, [healthSystem], TICKS_PER_DAY / 2).state;
    const healthHurt = getComponent(hurt, 'health', id)!.value;
    expect(healthHurt).toBeLessThan(1);
    const fed = setComponent(hurt, 'needs', id, { ...getComponent(hurt, 'needs', id)!, hunger: 1 });
    const healed = stepTicks(fed, [healthSystem], TICKS_PER_DAY).state;
    expect(getComponent(healed, 'health', id)!.value).toBeGreaterThan(healthHurt);
  });

  it('removes living components but keeps identity and position on death', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { hunger: 0 } });
    const after = stepTicks(state, [healthSystem], 3 * TICKS_PER_DAY).state;
    expect(getComponent(after, 'pawn', id)).toBeDefined();
    expect(getComponent(after, 'position', id)).toBeDefined();
    expect(getComponent(after, 'needs', id)).toBeUndefined();
    expect(livingPawns(after)).not.toContain(id);
  });

  it('gives survivors grief memories, stronger for kin', () => {
    const w = emptyWorld();
    const dying = addPawn(w, { needs: { hunger: 0 } });
    const child = addPawn(dying.state);
    const stranger = addPawn(child.state);
    const s = linkKin(stranger.state, child.id, 'parent', dying.id);
    const after = stepTicks(s, [healthSystem], 3 * TICKS_PER_DAY).state;
    const kinGrief = getComponent(after, 'mood', child.id)!.memories.find((m) => m.kind === 'grief')!;
    const otherGrief = getComponent(after, 'mood', stranger.id)!.memories.find((m) => m.kind === 'grief')!;
    expect(kinGrief.moodEffect).toBeLessThan(otherGrief.moodEffect);
    expect(kinGrief.subjectId).toBe(dying.id);
  });

  it('has no old-age risk for the young and rising risk for elders', () => {
    expect(oldAgeDailyChance(30)).toBe(0);
    expect(oldAgeDailyChance(70)).toBeGreaterThan(oldAgeDailyChance(60));
  });

  it('eventually kills the very old', () => {
    const { state, id } = addPawn(emptyWorld(), { ageYears: 90 });
    const after = stepTicks(state, [healthSystem], TICKS_PER_YEAR).state;
    expect(getComponent(after, 'corpse', id)?.cause).toBe('oldAge');
  });
});
