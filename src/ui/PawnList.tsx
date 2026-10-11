import { entitiesWith, getComponent } from '../sim/entities';
import { livingPawns } from '../sim/pawnQueries';
import { jobLabel, pawnSummary } from './format';
import { useGameStore } from './store';

export function PawnList() {
  const game = useGameStore((s) => s.game);
  const selectedId = useGameStore((s) => s.selectedId);
  const select = useGameStore((s) => s.select);
  const dead = entitiesWith(game, 'corpse');

  return (
    <section className="panel pawn-list">
      <h2>The band</h2>
      <ul>
        {livingPawns(game).map((id) => {
          const mood = getComponent(game, 'mood', id)?.value ?? 0;
          return (
            <li key={id} className={id === selectedId ? 'selected' : undefined} onClick={() => select(id)}>
              <span className="name">{pawnSummary(game, id)}</span>
              <span className="job">{jobLabel(game, id)}</span>
              <span className="mood-bar" title={`Mood ${Math.round(mood * 100)}%`}>
                <span style={{ width: `${mood * 100}%` }} />
              </span>
            </li>
          );
        })}
        {dead.map((id) => (
          <li key={id} className={id === selectedId ? 'dead selected' : 'dead'} onClick={() => select(id)}>
            <span className="name">{getComponent(game, 'pawn', id)?.name}</span>
            <span className="job">{getComponent(game, 'corpse', id)?.moundId === null ? 'Unburied' : 'In the mound'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
