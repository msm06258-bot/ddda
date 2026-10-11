import { useState } from 'react';
import { DEV_EVENTS, devGrantResources, devKillPawn, devSpawnPawn, type DevEventId } from './commands';
import { isAlive } from '../sim/pawnQueries';
import { TICKS_PER_DAY, TICKS_PER_SEASON } from '../sim/time';
import { useGameStore } from '../ui/store';

/** Debug tools. Toggle with the backtick key or the header button. */
export function DevPanel() {
  const run = useGameStore((s) => s.run);
  const fastForward = useGameStore((s) => s.fastForward);
  const selectedId = useGameStore((s) => s.selectedId);
  const game = useGameStore((s) => s.game);
  const [busy, setBusy] = useState(false);

  const forward = (ticks: number) => {
    setBusy(true);
    // Let the button repaint as busy before the synchronous run blocks the thread.
    setTimeout(() => {
      fastForward(ticks);
      setBusy(false);
    }, 0);
  };

  return (
    <section className="panel dev-panel">
      <h2>Dev tools</h2>
      <div className="row">
        <button onClick={() => run(devSpawnPawn)}>Spawn pawn</button>
        <button onClick={() => run(devGrantResources(50))}>+50 all resources</button>
        <button
          disabled={selectedId === null || !isAlive(game, selectedId)}
          onClick={() => selectedId !== null && run(devKillPawn(selectedId))}
        >
          Kill selected
        </button>
      </div>
      <div className="row">
        <span className="label">Trigger:</span>
        {(Object.keys(DEV_EVENTS) as DevEventId[]).map((id) => (
          <button key={id} onClick={() => run(DEV_EVENTS[id].command)}>
            {DEV_EVENTS[id].label}
          </button>
        ))}
      </div>
      <div className="row">
        <span className="label">Fast-forward:</span>
        <button disabled={busy} onClick={() => forward(TICKS_PER_DAY / 4)}>
          6 hours
        </button>
        <button disabled={busy} onClick={() => forward(TICKS_PER_DAY)}>
          1 day
        </button>
        <button disabled={busy} onClick={() => forward(TICKS_PER_SEASON)}>
          1 season
        </button>
        {busy && <span className="muted">running…</span>}
      </div>
      <p className="muted">tick {game.tick} · seed {game.seed}</p>
    </section>
  );
}
