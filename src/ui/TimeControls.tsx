import type { Speed } from '../sim/clock';
import { calendarAt } from '../sim/time';
import { useGameStore } from './store';

const SPEEDS: Array<{ speed: Speed; label: string }> = [
  { speed: 0, label: '❚❚' },
  { speed: 1, label: '1×' },
  { speed: 3, label: '3×' },
];

export function TimeControls() {
  const tick = useGameStore((s) => s.game.tick);
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const date = calendarAt(tick);

  return (
    <div className="time-controls">
      <span className="date">
        Year {date.year} · {date.season} · day {date.day}
      </span>
      {SPEEDS.map((s) => (
        <button
          key={s.speed}
          className={s.speed === speed ? 'active' : undefined}
          onClick={() => setSpeed(s.speed)}
        >
          {s.label}
        </button>
      ))}
      <span className="tick">tick {tick}</span>
    </div>
  );
}
