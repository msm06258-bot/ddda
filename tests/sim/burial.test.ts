import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import type { GameState } from '../../src/data/schemas';
import { buryCorpse, killPawn, unburiedCorpses } from '../../src/sim/death';
import { getComponent, setComponent } from '../../src/sim/entities';
import { livingPawns } from '../../src/sim/pawnQueries';
import { stepTicks } from '../../src/sim/step';
import { structuresOf } from '../../src/sim/structures';
import { jobSelectionSystem, jobWorkSystem } from '../../src/sim/systems/jobs';
import { movementSystem } from '../../src/sim/systems/movement';
import { TICKS_PER_DAY } from '../../src/sim/time';
import { addPawn, addStructure, apply, emptyWorld } from '../helpers';

const JOB_SYSTEMS = [jobSelectionSystem, movementSystem, jobWorkSystem];

function band(): { state: GameState; dying: number; mourner: number } {
  const s0: GameState = {
    ...addStructure(emptyWorld(), 'hearth', { x: 12, y: 12 }).state,
    tick: TICKS_PER_DAY * 10 + TICKS_PER_DAY / 2,
    resources: { food: 500, meals: 50, wood: 100, stone: 20, hides: 10 },
  };
  const dying = addPawn(s0, { position: { x: 10, y: 10 } });
  const mourner = addPawn(dying.state, { position: { x: 13, y: 12 } });
  return { state: mourner.state, dying: dying.id, mourner: mourner.id };
}

describe('death and burial', () => {
  it('leaves an unburied corpse after death', () => {
    const { state, dying } = band();
    const dead = apply(state, (s, ctx) => killPawn(s, dying, 'exposure', ctx)).state;
    expect(unburiedCorpses(dead)).toEqual([dying]);
    expect(livingPawns(dead)).not.toContain(dying);
  });

  it('buryCorpse raises a mound, moves the body into it, and holds a funeral', () => {
    const { state, dying, mourner } = band();
    const dead = apply(state, (s, ctx) => killPawn(s, dying, 'starvation', ctx)).state;
    const meaningBefore = getComponent(dead, 'needs', mourner)!.meaning;
    const { state: buried, events } = apply(dead, (s, ctx) => buryCorpse(s, dying, mourner, ctx));

    const [mound] = structuresOf(buried, 'burialMound');
    expect(mound).toBeDefined();
    expect(getComponent(buried, 'corpse', dying)!.moundId).toBe(mound);
    expect(getComponent(buried, 'position', dying)).toEqual(getComponent(buried, 'position', mound!));
    expect(events).toContainEqual(expect.objectContaining({ type: 'pawnBuried', pawnId: dying, moundId: mound }));
    expect(events.some((e) => e.type === 'log' && e.category === 'ritual')).toBe(true);
    const needs = getComponent(buried, 'needs', mourner)!;
    expect(needs.meaning).toBeCloseTo(Math.min(1, meaningBefore + content.balance.mourning.burialMeaning), 5);
    const memories = getComponent(buried, 'mood', mourner)!.memories.map((m) => m.kind);
    expect(memories).toEqual(expect.arrayContaining(['grief', 'burial']));
  });

  it('reuses an existing mound for later burials', () => {
    const { state, dying, mourner } = band();
    const withMound = addStructure(state, 'burialMound', { x: 5, y: 5 });
    const s = apply(withMound.state, (st, ctx) => buryCorpse(killPawn(st, dying, 'oldAge', ctx), dying, mourner, ctx)).state;
    expect(structuresOf(s, 'burialMound')).toEqual([withMound.id]);
    expect(getComponent(s, 'corpse', dying)!.moundId).toBe(withMound.id);
  });

  it('survivors bury the dead on their own', () => {
    const { state, dying } = band();
    const dead = apply(state, (s, ctx) => killPawn(s, dying, 'exposure', ctx)).state;
    const { state: after, events } = stepTicks(dead, JOB_SYSTEMS, TICKS_PER_DAY / 2);
    expect(unburiedCorpses(after)).toEqual([]);
    expect(events.some((e) => e.type === 'pawnBuried')).toBe(true);
  });

  it('rituals at an ancestor mound name the ancestor', () => {
    const { state, dying, mourner } = band();
    const buried = apply(state, (s, ctx) => buryCorpse(killPawn(s, dying, 'oldAge', ctx), dying, mourner, ctx)).state;
    const [mound] = structuresOf(buried, 'burialMound');
    const needs = getComponent(buried, 'needs', mourner)!;
    const yearning = setComponent(buried, 'needs', mourner, { ...needs, meaning: 0.05, hunger: 1, rest: 1, social: 1, warmth: 1 });
    const { state: after, events } = stepTicks(yearning, JOB_SYSTEMS, TICKS_PER_DAY / 2);
    const rite = events.find((e) => e.type === 'log' && e.category === 'ritual');
    expect(rite).toBeDefined();
    const deadName = getComponent(after, 'pawn', dying)!.name;
    if (rite?.type === 'log') expect(rite.text).toContain(deadName);
    expect(getComponent(after, 'needs', mourner)!.meaning).toBeGreaterThan(0.3);
    expect(mound).toBeDefined();
  });
});
