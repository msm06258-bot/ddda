import { useEffect, useRef } from 'react';
import { calendarAt } from '../sim/time';
import { useGameStore } from './store';

export function EventLog() {
  const log = useGameStore((s) => s.log);
  const endRef = useRef<HTMLLIElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [log]);

  return (
    <section className="panel event-log">
      <h2>Chronicle</h2>
      <ul>
        {log.length === 0 && <li className="muted">The band has only just made camp.</li>}
        {log.map((e) => {
          const d = calendarAt(e.tick);
          return (
            <li key={e.id} className={`log-${e.category}`}>
              <span className="when">
                Y{d.year} {d.season.slice(0, 3)} {d.day}
              </span>{' '}
              {e.text}
            </li>
          );
        })}
        <li ref={endRef} />
      </ul>
    </section>
  );
}
