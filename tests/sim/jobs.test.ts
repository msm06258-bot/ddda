import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import type { GameState } from '../../src/data/schemas';
import { getComponent, setComponent } from '../../src/sim/entities';
import { createRng } from '../../src/sim/rng';
import { stepTicks } from '../../src/sim/step';
import { abandonReason, assignJob, jobSelectionSystem, jobWorkSystem, scoreJobs } from '../../src/sim/systems/jobs';
import { movementSystem } from '../../src/sim/systems/movement';
import { TICKS_PER_DAY } from '../../src/sim/time';
import { addPawn, addStructure, emptyWorld } from '../helpers';

const MIDDAY = TICKS_PER_DAY * 10 + TICKS_PER_DAY / 2; // spring, day 11, noon
const MIDNIGHT = TICKS_PER_DAY * 10;
const JOB_SYSTEMS = [jobSelectionSystem, movementSystem, jobWorkSystem];

/** A grass world with a lit hearth at the center and a forest strip on the east edge. */
function camp(tick = MIDDAY, resources: Partial<GameState['resources']> = {}): GameState {
  const base = emptyWorld(1, 24);
  const tiles = base.map.tiles.map((t, i) => (i % 24 >= 21 ? { terrain: 'forest' as const } : t));
  const s: GameState = {
    ...base,
    tick,
    map: { ...base.map, tiles },
    resources: { food: 40, meals: 0, wood: 40, stone: 20, hides: 5, ...resources },
  };
  return addStructure(s, 'hearth', { x: 12, y: 12 }).state;
}

const topKind = (s: GameState, id: number) => scoreJobs(s, id, createRng(1))[0]?.kind;

describe('job selection (utility AI)', () => {
  it('sends a hungry pawn to eat when there is food', () => {
    const { state, id } = addPawn(camp(), { position: { x: 12, y: 13 }, needs: { hunger: 0.1 } });
    expect(topKind(state, id)).toBe('eat');
  });

  it('does not offer eating with an empty stockpile', () => {
    const { state, id } = addPawn(camp(MIDDAY, { food: 0, meals: 0 }), { needs: { hunger: 0.1 } });
    const kinds = scoreJobs(state, id, createRng(1)).map((j) => j.kind);
    expect(kinds).not.toContain('eat');
    expect(kinds.slice(0, 3)).toEqual(expect.arrayContaining(['forage']));
  });

  it('sends a tired pawn to sleep at night, in a shelter when there is room', () => {
    const withShelter = addStructure(camp(MIDNIGHT), 'shelter', { x: 14, y: 12 });
    const { state, id } = addPawn(withShelter.state, { needs: { rest: 0.4 } });
    const best = scoreJobs(state, id, createRng(1))[0]!;
    expect(best.kind).toBe('rest');
    expect(best.target.targetEntity).toBe(withShelter.id);
  });

  it('prefers work over leisure when food is short and needs are met', () => {
    const { state, id } = addPawn(camp(MIDDAY, { food: 0 }), { skills: { foraging: 15 } });
    expect(['forage', 'hunt']).toContain(topKind(state, id));
  });

  it('weighs skill: a skilled woodcutter picks wood over an unskilled one', () => {
    const s = camp(MIDDAY, { food: 500, wood: 0 });
    const a = addPawn(s, { skills: { woodcutting: 20, foraging: 0, hunting: 0 } });
    const b = addPawn(a.state, { skills: { woodcutting: 0, foraging: 0, hunting: 0 } });
    const scoreOf = (id: number) => scoreJobs(b.state, id, createRng(1)).find((j) => j.kind === 'chopWood')!.score;
    expect(scoreOf(a.id)).toBeGreaterThan(scoreOf(b.id));
  });

  it('does not let two pawns forage the same tile', () => {
    let s = camp(MIDDAY, { food: 0 });
    const a = addPawn(s, { skills: { foraging: 20, hunting: 0, woodcutting: 0, building: 0 } });
    const b = addPawn(a.state, { skills: { foraging: 20, hunting: 0, woodcutting: 0, building: 0 } });
    s = assignJob(b.state, a.id, createRng(1));
    s = assignJob(s, b.id, createRng(1));
    const ja = getComponent(s, 'job', a.id)!;
    const jb = getComponent(s, 'job', b.id)!;
    if (ja.kind === 'forage' && jb.kind === 'forage') expect(ja.targetTile).not.toEqual(jb.targetTile);
  });

  it('skips unreachable targets', () => {
    const s = camp();
    const tiles = s.map.tiles.map((t, i) => {
      const x = i % 24;
      const y = Math.floor(i / 24);
      return Math.max(Math.abs(x - 3), Math.abs(y - 3)) === 1 ? { terrain: 'water' as const } : t;
    });
    const { state, id } = addPawn({ ...s, map: { ...s.map, tiles } }, { position: { x: 3, y: 3 }, needs: { hunger: 0.1 } });
    const assigned = assignJob(state, id, createRng(1));
    const job = getComponent(assigned, 'job', id);
    if (job) expect(job.targetTile).toEqual({ x: 3, y: 3 });
  });
});

describe('job interruption', () => {
  it('abandons work when starving and food exists', () => {
    const { state, id } = addPawn(camp(), { needs: { hunger: 0.05 } });
    const job = { kind: 'chopWood' as const, targetTile: { x: 22, y: 3 }, targetEntity: null, progress: 0, startedTick: MIDDAY };
    expect(abandonReason(state, id, job)).toBe('hungry');
    expect(abandonReason(state, id, { ...job, kind: 'eat' })).toBeNull();
  });

  it('abandons jobs that run past maxTicks', () => {
    const { state, id } = addPawn(camp());
    const job = { kind: 'forage' as const, targetTile: null, targetEntity: null, progress: 0, startedTick: 0 };
    expect(abandonReason({ ...state, tick: content.jobs.forage.maxTicks + 1 }, id, job)).toBe('timeout');
  });
});

const eatJob = (s: GameState, id: number) =>
  setComponent(s, 'job', id, { kind: 'eat', targetTile: { x: 12, y: 13 }, targetEntity: null, progress: 0, startedTick: MIDDAY });

describe('job execution', () => {
  it('eating consumes a meal before raw food and restores hunger', () => {
    const { state, id } = addPawn(camp(MIDDAY, { food: 5, meals: 2 }), { position: { x: 12, y: 13 }, needs: { hunger: 0.2 } });
    const after = stepTicks(eatJob(state, id), [jobWorkSystem], 100).state;
    expect(after.resources.meals).toBe(1);
    expect(after.resources.food).toBe(5);
    expect(getComponent(after, 'needs', id)!.hunger).toBeCloseTo(0.2 + content.balance.food.mealNutrition, 5);
  });

  it('eats raw food when there are no meals, with a mood penalty memory', () => {
    const { state, id } = addPawn(camp(MIDDAY, { food: 5, meals: 0 }), { position: { x: 12, y: 13 }, needs: { hunger: 0.2 } });
    const after = stepTicks(eatJob(state, id), [jobWorkSystem], 100).state;
    expect(after.resources.food).toBe(4);
    expect(getComponent(after, 'needs', id)!.hunger).toBeCloseTo(0.2 + content.balance.food.rawNutrition, 5);
    expect(getComponent(after, 'mood', id)!.memories.some((m) => m.kind === 'ateRaw')).toBe(true);
  });

  it('foraging walks out and adds food to the stockpile', () => {
    const { state } = addPawn(camp(MIDDAY, { food: 0 }), { skills: { foraging: 20, hunting: 0, woodcutting: 0, building: 0, cooking: 0, lore: 0 } });
    const after = stepTicks(state, JOB_SYSTEMS, 400).state;
    expect(after.resources.food).toBeGreaterThan(0);
  });

  it('cooking turns raw food into meals', () => {
    const s = camp(MIDDAY, { food: 30, meals: 0, wood: 100, stone: 100 });
    const { state, id } = addPawn(s, { position: { x: 12, y: 13 }, skills: { cooking: 20, foraging: 0, hunting: 0, woodcutting: 0, building: 0 } });
    const cooking = setComponent(state, 'job', id, { kind: 'cook', targetTile: { x: 12, y: 13 }, targetEntity: null, progress: 0, startedTick: MIDDAY });
    const after = stepTicks(cooking, [jobWorkSystem], 120).state;
    expect(after.resources.meals).toBeGreaterThan(3);
    expect(after.resources.food).toBe(27);
  });

  it('chopping wood yields wood', () => {
    const s = camp(MIDDAY, { food: 500, wood: 0 });
    const { state, id } = addPawn(s, { position: { x: 22, y: 5 } });
    const chopping = setComponent(state, 'job', id, { kind: 'chopWood', targetTile: { x: 22, y: 5 }, targetEntity: null, progress: 0, startedTick: MIDDAY });
    const after = stepTicks(chopping, [jobWorkSystem], 400).state;
    expect(after.resources.wood).toBeGreaterThan(0);
    expect(getComponent(after, 'job', id)).toBeUndefined();
  });

  it('resting restores rest and clears the job when done', () => {
    const { state, id } = addPawn(camp(MIDNIGHT), { position: { x: 12, y: 13 }, needs: { rest: 0.3 } });
    const resting = setComponent(state, 'job', id, { kind: 'rest', targetTile: { x: 12, y: 13 }, targetEntity: null, progress: 0, startedTick: MIDNIGHT });
    const after = stepTicks(resting, [jobWorkSystem], TICKS_PER_DAY / 4).state;
    expect(getComponent(after, 'needs', id)!.rest).toBeGreaterThan(0.5);
  });

  it('is deterministic', () => {
    const { state } = addPawn(addPawn(camp(MIDDAY, { food: 0 })).state);
    expect(stepTicks(state, JOB_SYSTEMS, 500).state).toEqual(stepTicks(state, JOB_SYSTEMS, 500).state);
  });
});
