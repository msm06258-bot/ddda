import { useRef, useState } from 'react';
import { deserializeGame, serializeGame } from '../sim/save';
import { useGameStore } from './store';

const QUICKSAVE_KEY = 'hearth-and-mound/quicksave';

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SaveLoadPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const loadGame = useGameStore((s) => s.loadGame);
  const newGame = useGameStore((s) => s.newGame);
  const notify = useGameStore((s) => s.notify);
  const [seed, setSeed] = useState('');

  const current = () => useGameStore.getState().session.runner.getState();

  const tryLoad = (text: string | null) => {
    if (!text) return notify('No save found');
    try {
      loadGame(deserializeGame(text));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not load save');
    }
  };

  return (
    <div className="save-load">
      <button onClick={() => download(`hearth-and-mound-${current().tick}.json`, serializeGame(current()))}>Save file</button>
      <button onClick={() => fileRef.current?.click()}>Load file</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) tryLoad(await file.text());
        }}
      />
      <button
        title="Quick save to this browser"
        onClick={() => {
          try {
            localStorage.setItem(QUICKSAVE_KEY, serializeGame(current()));
            notify('Saved');
          } catch {
            notify('This browser blocked saving; use Save file instead');
          }
        }}
      >
        Quick save
      </button>
      <button
        title="Load the browser quick save"
        onClick={() => {
          let text: string | null = null;
          try {
            text = localStorage.getItem(QUICKSAVE_KEY);
          } catch {
            /* storage unavailable */
          }
          tryLoad(text);
        }}
      >
        Quick load
      </button>
      <input
        className="seed"
        placeholder="seed"
        value={seed}
        onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <button onClick={() => newGame(seed === '' ? Math.floor(Math.random() * 100000) : Number(seed))}>New game</button>
    </div>
  );
}
