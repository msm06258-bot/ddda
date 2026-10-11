import { content } from '../data/content';
import { ResourceId } from '../data/schemas';
import { ambientTemperature } from '../sim/environment';
import { livingPawns } from '../sim/pawnQueries';
import { isHearthLit } from '../sim/structures';
import { whole } from './format';
import { useGameStore } from './store';

const LABELS: Record<ResourceId, string> = { food: 'Food', meals: 'Meals', wood: 'Wood', stone: 'Stone', hides: 'Hides' };

export function ResourceBar() {
  const game = useGameStore((s) => s.game);
  const temp = ambientTemperature(game);
  const pits = Object.values(game.components.structure).filter((s) => s.kind === 'storagePit' && s.progress >= 1).length;
  return (
    <div className="resource-bar">
      {ResourceId.options.map((r) => (
        <span key={r} className="resource">
          <span className="label">{LABELS[r]}</span> {whole(game.resources[r])}
        </span>
      ))}
      <span className="resource">
        <span className="label">Band</span> {livingPawns(game).length}
      </span>
      <span className="resource">
        <span className="label">Air</span> {Math.round(temp)}°C
      </span>
      <span className={isHearthLit(game) ? 'resource lit' : 'resource cold'}>
        {isHearthLit(game) ? 'Hearth lit' : 'Hearth cold'}
      </span>
      {pits > 0 && (
        <span className="resource">
          <span className="label">Pit space</span> {pits * content.balance.spoilage.storagePitCapacity}
        </span>
      )}
    </div>
  );
}
