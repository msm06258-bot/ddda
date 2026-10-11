import { useEffect, useState } from 'react';
import { DevPanel } from '../dev/DevPanel';
import { BuildMenu } from './BuildMenu';
import { EventLog } from './EventLog';
import { startGameLoop } from './gameLoop';
import { MapView } from './map/MapView';
import { PawnList } from './PawnList';
import { PawnPanel } from './PawnPanel';
import { ResourceBar } from './ResourceBar';
import { SaveLoadPanel } from './SaveLoadPanel';
import { useGameStore } from './store';
import { TimeControls } from './TimeControls';

function useKeyboard(toggleDev: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const { speed, setSpeed, setBuildMode, select } = useGameStore.getState();
      if (e.key === ' ') {
        e.preventDefault();
        setSpeed(speed === 0 ? 1 : 0);
      } else if (e.key === '1') setSpeed(1);
      else if (e.key === '3') setSpeed(3);
      else if (e.key === 'Escape') {
        setBuildMode(null);
        select(null);
      } else if (e.key === '`') toggleDev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDev]);
}

export function App() {
  const [showDev, setShowDev] = useState(false);
  useEffect(() => startGameLoop(), []);
  useKeyboard(() => setShowDev((v) => !v));

  return (
    <div className="app">
      <header>
        <h1>Hearth &amp; Mound</h1>
        <TimeControls />
        <SaveLoadPanel />
        <button className={showDev ? 'active' : undefined} onClick={() => setShowDev((v) => !v)} title="Toggle dev tools (`)">
          Dev
        </button>
      </header>
      <ResourceBar />
      <BuildMenu />
      <div className="layout">
        <main>
          <MapView />
          {showDev && <DevPanel />}
        </main>
        <aside>
          <PawnPanel />
          <PawnList />
          <EventLog />
        </aside>
      </div>
    </div>
  );
}
