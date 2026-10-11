import { describe, expect, it } from 'vitest';
import { ageInYears, calendarAt, TICKS_PER_DAY, TICKS_PER_SEASON, TICKS_PER_YEAR, yearsToTicks } from '../../src/sim/time';

describe('calendar', () => {
  it('starts at year 1, spring, day 1, midnight', () => {
    expect(calendarAt(0)).toEqual({ year: 1, season: 'spring', day: 1, timeOfDay: 0 });
  });

  it('advances days, seasons and years', () => {
    expect(calendarAt(TICKS_PER_DAY).day).toBe(2);
    expect(calendarAt(TICKS_PER_DAY / 2).timeOfDay).toBe(0.5);
    expect(calendarAt(TICKS_PER_SEASON).season).toBe('summer');
    expect(calendarAt(TICKS_PER_SEASON * 3).season).toBe('winter');
    expect(calendarAt(TICKS_PER_YEAR)).toMatchObject({ year: 2, season: 'spring', day: 1 });
  });

  it('computes ages from birth ticks', () => {
    expect(ageInYears(-yearsToTicks(30), 0)).toBe(30);
    expect(ageInYears(-yearsToTicks(30) + 1, 0)).toBe(29);
  });
});
