import { TICKS_PER_SECOND } from './time';

/** Speed multipliers exposed to the player. 0 = paused. */
export type Speed = 0 | 1 | 3;

export type Clock = { accumulatorMs: number };

const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/**
 * Fixed-timestep accumulator. Converts real elapsed time into a whole number of ticks to run.
 * Caps work per frame so a long stall (e.g. a background tab) can't cause a spiral of death;
 * the excess time is dropped, not queued.
 */
export function advanceClock(
  clock: Clock,
  realDeltaMs: number,
  speed: number,
  maxTicksPerFrame = 30,
): { clock: Clock; ticks: number } {
  if (speed <= 0 || realDeltaMs <= 0) return { clock, ticks: 0 };

  const acc = clock.accumulatorMs + realDeltaMs * speed;
  const ticks = Math.floor(acc / MS_PER_TICK);
  if (ticks > maxTicksPerFrame) return { clock: { accumulatorMs: 0 }, ticks: maxTicksPerFrame };
  return { clock: { accumulatorMs: acc - ticks * MS_PER_TICK }, ticks };
}
