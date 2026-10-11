/** Logical simulation rate. Real-time speed multipliers change how many ticks run per frame, never dt. */
export const TICKS_PER_SECOND = 10;
/** Logical seconds per tick, passed to systems as ctx.dt. */
export const TICK_DT = 1 / TICKS_PER_SECOND;

/** One in-game day lasts 60 real seconds at 1x speed. */
export const TICKS_PER_DAY = 600;
export const DAYS_PER_SEASON = 10;
export const SEASONS_PER_YEAR = 4;
export const TICKS_PER_SEASON = TICKS_PER_DAY * DAYS_PER_SEASON;
export const TICKS_PER_YEAR = TICKS_PER_SEASON * SEASONS_PER_YEAR;

export function yearsToTicks(years: number): number {
  return Math.round(years * TICKS_PER_YEAR);
}

export function ageInYears(birthTick: number, nowTick: number): number {
  return Math.floor((nowTick - birthTick) / TICKS_PER_YEAR);
}

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export type CalendarDate = {
  year: number;
  season: Season;
  /** 1-based day within the season. */
  day: number;
  /** 0..1 fraction of the current day elapsed (0 = midnight). */
  timeOfDay: number;
};

/** Converts a tick into a calendar date. Year 1, spring, day 1 starts at tick 0. */
export function calendarAt(tick: number): CalendarDate {
  const year = Math.floor(tick / TICKS_PER_YEAR) + 1;
  const seasonIndex = Math.floor((tick % TICKS_PER_YEAR) / TICKS_PER_SEASON);
  const day = Math.floor((tick % TICKS_PER_SEASON) / TICKS_PER_DAY) + 1;
  return {
    year,
    season: SEASONS[seasonIndex] ?? 'spring',
    day,
    timeOfDay: (tick % TICKS_PER_DAY) / TICKS_PER_DAY,
  };
}
