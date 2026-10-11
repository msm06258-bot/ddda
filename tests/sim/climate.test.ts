import { describe, expect, it } from 'vitest';
import { content } from '../../src/data/content';
import { getComponent } from '../../src/sim/entities';
import { isNight, seasonalMean, temperatureAt } from '../../src/sim/environment';
import { stepTicks } from '../../src/sim/step';
import { seasonsSystem } from '../../src/sim/systems/seasons';
import { spoilageRatePerDay, stockpileSystem } from '../../src/sim/systems/stockpile';
import { feltTemperature, warmthSystem } from '../../src/sim/systems/warmth';
import { TICKS_PER_DAY, TICKS_PER_SEASON } from '../../src/sim/time';
import { addPawn, addStructure, emptyWorld } from '../helpers';

const MID = (season: number) => Math.round((season + 0.5) * TICKS_PER_SEASON);
const MID_SUMMER = MID(1);
const MID_WINTER = MID(3);

describe('climate', () => {
  it('hits configured seasonal means mid-season', () => {
    expect(seasonalMean(MID_SUMMER)).toBeCloseTo(content.climate.seasonTemps.summer, 5);
    expect(seasonalMean(MID_WINTER)).toBeCloseTo(content.climate.seasonTemps.winter, 5);
  });

  it('is continuous across the year boundary', () => {
    const yearEnd = 4 * TICKS_PER_SEASON;
    expect(Math.abs(seasonalMean(yearEnd) - seasonalMean(yearEnd - 1))).toBeLessThan(0.01);
  });

  it('is colder at night than mid-afternoon on average', () => {
    let night = 0;
    let day = 0;
    for (let d = 0; d < 20; d++) {
      const base = MID_SUMMER + d * TICKS_PER_DAY - (MID_SUMMER % TICKS_PER_DAY);
      night += temperatureAt(1, base + Math.round(0.15 * TICKS_PER_DAY));
      day += temperatureAt(1, base + Math.round(0.65 * TICKS_PER_DAY));
    }
    expect(night).toBeLessThan(day);
  });

  it('is deterministic per seed', () => {
    expect(temperatureAt(3, 12345)).toBe(temperatureAt(3, 12345));
    expect(temperatureAt(3, 12345)).not.toBe(temperatureAt(4, 12345));
  });

  it('knows night from day', () => {
    expect(isNight(0)).toBe(true);
    expect(isNight(TICKS_PER_DAY / 2)).toBe(false);
  });
});

describe('warmthSystem', () => {
  const winterWorld = () => ({ ...emptyWorld(), tick: MID_WINTER });

  it('drains warmth in winter away from shelter', () => {
    const { state, id } = addPawn(winterWorld());
    const after = stepTicks(state, [warmthSystem], TICKS_PER_DAY / 4).state;
    expect(getComponent(after, 'needs', id)!.warmth).toBeLessThan(0.9);
  });

  it('keeps pawns warm by a lit hearth', () => {
    const w = addStructure(winterWorld(), 'hearth', { x: 5, y: 5 });
    const near = addPawn({ ...w.state, resources: { ...w.state.resources, wood: 50 } }, {
      position: { x: 6, y: 5 },
      needs: { warmth: 0.5 },
    });
    const far = addPawn(near.state, { position: { x: 20, y: 20 }, needs: { warmth: 0.5 } });
    const state = far.state;
    expect(feltTemperature(state, { x: 6, y: 5 })).toBeGreaterThan(feltTemperature(state, { x: 20, y: 20 }));
    const after = stepTicks(state, [warmthSystem], TICKS_PER_DAY).state;
    expect(getComponent(after, 'needs', near.id)!.warmth).toBeGreaterThan(0.5);
    expect(getComponent(after, 'needs', far.id)!.warmth).toBeLessThan(0.1);
  });

  it('gives no warmth from a hearth without wood', () => {
    const w = addStructure(winterWorld(), 'hearth', { x: 5, y: 5 });
    const { state } = addPawn(w.state, { position: { x: 6, y: 5 } });
    expect(feltTemperature(state, { x: 6, y: 5 })).toBe(feltTemperature(state, { x: 20, y: 20 }));
  });

  it('makes hardy pawns lose warmth more slowly', () => {
    const a = addPawn(winterWorld());
    const b = addPawn(a.state, { traits: ['hardy'] });
    const after = stepTicks(b.state, [warmthSystem], TICKS_PER_DAY / 8).state;
    expect(getComponent(after, 'needs', b.id)!.warmth).toBeGreaterThan(getComponent(after, 'needs', a.id)!.warmth);
  });
});

describe('stockpileSystem', () => {
  const stocked = (tick: number) => ({
    ...emptyWorld(),
    tick,
    resources: { food: 100, meals: 20, wood: 10, stone: 0, hides: 0 },
  });

  it('spoils food faster in summer than in winter (frozen)', () => {
    const summer = stepTicks(stocked(MID_SUMMER), [stockpileSystem], TICKS_PER_DAY).state;
    const winterRate = spoilageRatePerDay(stocked(MID_WINTER));
    expect(summer.resources.food).toBeLessThan(99);
    expect(summer.resources.meals).toBeLessThan(20);
    expect(winterRate).toBeLessThan(spoilageRatePerDay(stocked(MID_SUMMER)) / 3);
  });

  it('slows spoilage with storage pits', () => {
    const plain = stocked(MID_SUMMER);
    const withPit = addStructure(addStructure(plain, 'storagePit', { x: 1, y: 1 }).state, 'storagePit', { x: 2, y: 1 }).state;
    expect(spoilageRatePerDay(withPit)).toBeLessThan(spoilageRatePerDay(plain) / 2);
    const halfBuilt = addStructure(plain, 'storagePit', { x: 1, y: 1 }, 0.5).state;
    expect(spoilageRatePerDay(halfBuilt)).toBe(spoilageRatePerDay(plain));
  });

  it('burns hearth wood and never goes negative', () => {
    const { state } = addStructure(stocked(0), 'hearth', { x: 5, y: 5 });
    const day = stepTicks(state, [stockpileSystem], TICKS_PER_DAY).state;
    expect(day.resources.wood).toBeCloseTo(10 - content.balance.hearth.woodPerDay, 5);
    const later = stepTicks(state, [stockpileSystem], TICKS_PER_DAY * 10).state;
    expect(later.resources.wood).toBe(0);
  });

  it('does not touch stone or hides', () => {
    const s = { ...stocked(MID_SUMMER), resources: { food: 0, meals: 0, wood: 0, stone: 5, hides: 3 } };
    expect(stepTicks(s, [stockpileSystem], TICKS_PER_DAY).state.resources).toMatchObject({ stone: 5, hides: 3 });
  });
});

describe('seasonsSystem', () => {
  it('logs each season turn', () => {
    const { events } = stepTicks(emptyWorld(), [seasonsSystem], TICKS_PER_SEASON * 4 + 1);
    expect(events.filter((e) => e.type === 'log').map((e) => e.tick)).toEqual([
      TICKS_PER_SEASON,
      TICKS_PER_SEASON * 2,
      TICKS_PER_SEASON * 3,
      TICKS_PER_SEASON * 4,
    ]);
  });
});
