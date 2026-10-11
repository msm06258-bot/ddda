import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import { getComponent, setComponent } from '../../src/sim/entities';
import { stepTicks } from '../../src/sim/step';
import { moodSystem, moodTarget } from '../../src/sim/systems/mood';
import { needsSystem } from '../../src/sim/systems/needs';
import { TICKS_PER_DAY } from '../../src/sim/time';
import { addMemory } from '../../src/sim/memories';
import { addPawn, emptyWorld } from '../helpers';

describe('needsSystem', () => {
  it('decays needs at the configured per-day rate', () => {
    const { state, id } = addPawn(emptyWorld());
    const after = stepTicks(state, [needsSystem], TICKS_PER_DAY / 2).state;
    const needs = getComponent(after, 'needs', id)!;
    const rates = content.balance.needs.decayPerDay;
    expect(needs.hunger).toBeCloseTo(1 - rates.hunger / 2, 5);
    expect(needs.rest).toBeCloseTo(1 - rates.rest / 2, 5);
    expect(needs.social).toBeCloseTo(1 - rates.social / 2, 5);
    expect(needs.meaning).toBeCloseTo(1 - rates.meaning / 2, 5);
    expect(needs.warmth).toBe(1);
  });

  it('never goes below zero', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { hunger: 0.01 } });
    const after = stepTicks(state, [needsSystem], TICKS_PER_DAY).state;
    expect(getComponent(after, 'needs', id)!.hunger).toBe(0);
  });

  it('applies trait multipliers', () => {
    const base = addPawn(emptyWorld());
    const glutton = addPawn(base.state, { traits: ['gluttonous'] });
    const after = stepTicks(glutton.state, [needsSystem], TICKS_PER_DAY / 4).state;
    const normal = 1 - getComponent(after, 'needs', base.id)!.hunger;
    const greedy = 1 - getComponent(after, 'needs', glutton.id)!.hunger;
    expect(greedy / normal).toBeCloseTo(content.traits.gluttonous!.needDecay.hunger!, 5);
  });
});

describe('moodSystem', () => {
  it('drifts mood toward a target derived from needs', () => {
    const { state, id } = addPawn(emptyWorld(), { needs: { hunger: 0, rest: 0, social: 0, meaning: 0, warmth: 0 } });
    const target = moodTarget(state, id);
    expect(target).toBeLessThan(0.5);
    const after = stepTicks(state, [moodSystem], 2 * TICKS_PER_DAY).state;
    expect(getComponent(after, 'mood', id)!.value).toBeCloseTo(target, 2);
  });

  it('includes memories and expires them', () => {
    const half = { hunger: 0.5, warmth: 0.5, rest: 0.5, social: 0.5, meaning: 0.5 };
    const { state, id } = addPawn(emptyWorld(), { needs: half });
    const withMemory = addMemory(state, id, { kind: 'test', text: 'x', moodEffect: 0.2, durationDays: 0.1 });
    expect(moodTarget(withMemory, id)).toBeCloseTo(moodTarget(state, id) + 0.2, 5);
    const after = stepTicks(withMemory, [moodSystem], TICKS_PER_DAY / 5).state;
    expect(getComponent(after, 'mood', id)!.memories).toHaveLength(0);
  });

  it('replaces a memory of the same kind and subject', () => {
    const { state, id } = addPawn(emptyWorld());
    let s = addMemory(state, id, { kind: 'grief', text: 'a', moodEffect: -0.1, durationDays: 1, subjectId: 9 });
    s = addMemory(s, id, { kind: 'grief', text: 'b', moodEffect: -0.1, durationDays: 1, subjectId: 9 });
    s = addMemory(s, id, { kind: 'grief', text: 'c', moodEffect: -0.1, durationDays: 1, subjectId: 10 });
    expect(getComponent(s, 'mood', id)!.memories.map((m) => m.text)).toEqual(['b', 'c']);
  });

  it('clamps mood to 0..1', () => {
    const { state, id } = addPawn(emptyWorld());
    const s = setComponent(state, 'mood', id, {
      value: 0.5,
      memories: [{ kind: 'x', text: 'x', moodEffect: 5, expiresAtTick: 1e9, subjectId: null }],
    });
    expect(moodTarget(s, id)).toBe(1);
  });
});
