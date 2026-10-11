import type { Speed } from '../sim/clock';
import { isNight } from '../sim/environment';
import { calendarAt } from '../sim/time';
import { useGameStore } from './store';

const SPEEDS: Array<{ speed: Speed; label: string; title: string }> = [
  { speed: 0, label: '❚❚', title: 'Pause (space)' },
  { speed: 1, label: '1×', title: 'Normal speed (1)' },
  { speed: 3, label: '3×', title: 'Fast (3)' },
];

export function TimeControls() {
  const tick = useGameStore((s) => s.game.tick);
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const date = calendarAt(tick);
  const hour = Math.floor(date.timeOfDay * 24);

  return (
    <div className="time-controls">
      <span className="date">
        Year {date.year} · {date.season} · day {date.day} · {isNight(tick) ? '☾' : '☀'} {hour.toString().padStart(2, '0')}h
      </span>
      {SPEEDS.map((s) => (
        <button key={s.speed} title={s.title} className={s.speed === speed ? 'active' : undefined} onClick={() => setSpeed(s.speed)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
