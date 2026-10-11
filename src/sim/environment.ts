import { content } from '../data/content';
import type { GameState } from '../data/schemas';
import { mulberry32, seedToState } from './rng';
import { calendarAt, SEASONS, TICKS_PER_DAY, TICKS_PER_SEASON, type Season } from './time';

const smooth = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/** Seasonal mean temperature, smoothly interpolated between mid-season values. */
export function seasonalMean(tick: number): number {
  const temps = content.climate.seasonTemps;
  const f = tick / TICKS_PER_SEASON - 0.5;
  const base = Math.floor(f);
  const a = SEASONS[((base % 4) + 4) % 4]!;
  const b = SEASONS[(((base + 1) % 4) + 4) % 4]!;
  return temps[a] + (temps[b] - temps[a]) * smooth(f - base);
}

/** Day-to-day weather offset in [-1, 1], deterministic per seed and day. */
function weatherNoise(seed: number, day: number): number {
  return mulberry32(seedToState(seed * 7919 + day)).value * 2 - 1;
}

/** Ambient temperature in deg C. A pure function of seed and tick, so it needs no stored state. */
export function temperatureAt(seed: number, tick: number): number {
  const { diurnalAmplitude, weatherAmplitude } = content.climate;
  const dayFloat = tick / TICKS_PER_DAY;
  const day = Math.floor(dayFloat);
  const t = dayFloat - day;
  // Coldest just before dawn (~0.15 of the day), warmest mid-afternoon.
  const diurnal = -Math.cos(2 * Math.PI * (t - 0.15)) * diurnalAmplitude;
  const weather =
    (weatherNoise(seed, day) + (weatherNoise(seed, day + 1) - weatherNoise(seed, day)) * smooth(t)) *
    weatherAmplitude;
  return seasonalMean(tick) + diurnal + weather;
}

export function ambientTemperature(state: GameState): number {
  return temperatureAt(state.seed, state.tick);
}

export function isNight(tick: number): boolean {
  const { nightStart, nightEnd } = content.climate;
  const t = calendarAt(tick).timeOfDay;
  return t >= nightStart || t < nightEnd;
}

export function currentSeason(tick: number): Season {
  return calendarAt(tick).season;
}
