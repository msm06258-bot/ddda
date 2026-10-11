import { advanceClock, type Clock } from '../sim/clock';
import { useGameStore } from './store';

/** Drives the fixed-tick sim from requestAnimationFrame. Returns a stop function. */
export function startGameLoop(): () => void {
  let clock: Clock = { accumulatorMs: 0 };
  let last = performance.now();
  let frame = 0;

  const loop = (now: number) => {
    const { speed, session, syncFromRunner } = useGameStore.getState();
    const r = advanceClock(clock, now - last, speed);
    clock = r.clock;
    last = now;
    if (r.ticks > 0) {
      session.runner.runTicks(r.ticks);
      syncFromRunner();
    }
    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
