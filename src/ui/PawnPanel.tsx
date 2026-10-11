import { content } from '../data/content';
import { NeedId, SkillId } from '../data/schemas';
import { getComponent } from '../sim/entities';
import { pawnAge } from '../sim/pawnQueries';
import { calendarAt } from '../sim/time';
import { jobLabel, kinLabel, pct } from './format';
import { useGameStore } from './store';

const NEED_LABELS: Record<NeedId, string> = {
  hunger: 'Food',
  warmth: 'Warmth',
  rest: 'Rest',
  social: 'Company',
  meaning: 'Meaning',
};

function Bar({ label, value }: { label: string; value: number }) {
  const tone = value < 0.2 ? 'bad' : value < 0.45 ? 'warn' : 'ok';
  return (
    <div className="bar-row">
      <span className="label">{label}</span>
      <span className={`bar ${tone}`}>
        <span style={{ width: pct(value) }} />
      </span>
    </div>
  );
}

export function PawnPanel() {
  const game = useGameStore((s) => s.game);
  const id = useGameStore((s) => s.selectedId);
  const select = useGameStore((s) => s.select);
  if (id === null) return <section className="panel pawn-panel hint">Select a pawn on the map or in the list.</section>;
  const pawn = getComponent(game, 'pawn', id);
  if (!pawn) return null;

  const corpse = getComponent(game, 'corpse', id);
  const needs = getComponent(game, 'needs', id);
  const mood = getComponent(game, 'mood', id);
  const health = getComponent(game, 'health', id);

  return (
    <section className="panel pawn-panel">
      <h2>
        {pawn.name} <span className="muted">({pawn.sex}, {pawnAge(game, id)})</span>
      </h2>
      {corpse ? (
        <p className="muted">
          Died of {corpse.cause === 'oldAge' ? 'old age' : corpse.cause} in year {calendarAt(corpse.diedTick).year},{' '}
          {calendarAt(corpse.diedTick).season}. {corpse.moundId === null ? 'Lies unburied.' : 'Rests in the mound.'}
        </p>
      ) : (
        <p>{jobLabel(game, id)}</p>
      )}

      {needs && mood && health && (
        <div className="bars">
          <Bar label="Health" value={health.value} />
          <Bar label="Mood" value={mood.value} />
          {NeedId.options.map((n) => (
            <Bar key={n} label={NEED_LABELS[n]} value={needs[n]} />
          ))}
        </div>
      )}

      <h3>Traits</h3>
      <p>
        {pawn.traits.length === 0
          ? '—'
          : pawn.traits.map((t) => (
              <span key={t} className="tag" title={content.traits[t]?.description}>
                {content.traits[t]?.label ?? t}
              </span>
            ))}
      </p>

      <h3>Skills</h3>
      <div className="skills">
        {SkillId.options.map((s) => (
          <span key={s}>
            {s} <strong>{pawn.skills[s]}</strong>
          </span>
        ))}
      </div>

      <h3>Kin</h3>
      {pawn.kin.length === 0 ? (
        <p className="muted">No kin in the band.</p>
      ) : (
        <ul className="kin">
          {pawn.kin.map((k) => (
            <li key={`${k.type}-${k.targetId}`} onClick={() => select(k.targetId)}>
              <span className="muted">{kinLabel(game, k.type, k.targetId)}</span> {getComponent(game, 'pawn', k.targetId)?.name}
              {getComponent(game, 'corpse', k.targetId) ? ' †' : ''}
            </li>
          ))}
        </ul>
      )}

      {mood && mood.memories.length > 0 && (
        <>
          <h3>Memories</h3>
          <ul className="memories">
            {mood.memories.map((m) => (
              <li key={`${m.kind}-${m.subjectId}`} className={m.moodEffect < 0 ? 'neg' : 'pos'}>
                {m.text} <span className="muted">({m.moodEffect > 0 ? '+' : ''}{Math.round(m.moodEffect * 100)})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
