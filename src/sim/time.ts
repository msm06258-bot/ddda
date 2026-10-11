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
