import { useEffect } from 'react';
import { startGameLoop } from './gameLoop';
import { MapView } from './map/MapView';
import { useGameStore } from './store';
import { TimeControls } from './TimeControls';

function SelectedSummary() {
  const selectedId = useGameStore((s) => s.selectedId);
  const pawn = useGameStore((s) => (selectedId === null ? undefined : s.game.components.pawn[selectedId]));
  if (!pawn) return <p className="hint">Click a pawn to select it.</p>;
  return (
    <p className="hint">
      Selected: <strong>{pawn.name}</strong> ({pawn.sex})
    </p>
  );
}

export function App() {
  useEffect(() => startGameLoop(), []);

  return (
    <div className="app">
      <header>
        <h1>Hearth &amp; Mound</h1>
        <TimeControls />
      </header>
      <main>
        <MapView />
        <SelectedSummary />
      </main>
    </div>
  );
}
