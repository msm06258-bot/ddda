import { content } from '../data/content';
import { StructureKind } from '../data/schemas';
import { canAfford } from '../sim/structures';
import { useGameStore } from './store';

const costText = (cost: Record<string, number | undefined>) =>
  Object.entries(cost)
    .map(([r, n]) => `${n} ${r}`)
    .join(', ');

export function BuildMenu() {
  const buildMode = useGameStore((s) => s.buildMode);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const resources = useGameStore((s) => s.game.resources);
  const notice = useGameStore((s) => s.notice);

  return (
    <div className="build-menu">
      <span className="label">Build:</span>
      {StructureKind.options.map((kind) => {
        const def = content.structures[kind];
        return (
          <button
            key={kind}
            className={buildMode === kind ? 'active' : undefined}
            disabled={!canAfford(resources, def.cost)}
            title={`${def.description} Cost: ${costText(def.cost)}.`}
            onClick={() => setBuildMode(buildMode === kind ? null : kind)}
          >
            {def.label}
          </button>
        );
      })}
      {buildMode && <span className="muted">Click the map to place · Esc to cancel</span>}
      {notice && <span className="notice">{notice}</span>}
    </div>
  );
}
