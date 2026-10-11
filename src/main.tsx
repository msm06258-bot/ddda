import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { useGameStore } from './ui/store';
import './ui/styles.css';

if (import.meta.env.DEV) {
  // Handy in the browser console and for scripted playtests.
  (window as unknown as { hm: typeof useGameStore }).hm = useGameStore;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
