import { create } from 'zustand';
import type { EntityId, GameState } from '../data/schemas';
import type { Speed } from '../sim/clock';
import { createNewGame } from '../sim/newGame';
import { createSession, type GameSession } from './session';

type GameStore = {
  session: GameSession;
  /** Latest sim state, refreshed after each frame that ran ticks. Read-only for UI. */
  game: GameState;
  speed: Speed;
  selectedId: EntityId | null;
  setSpeed(speed: Speed): void;
  select(id: EntityId | null): void;
  /** Called by the game loop after the runner advances. */
  syncFromRunner(): void;
};

const initialSeed = 1;
const initialSession = createSession(createNewGame({ seed: initialSeed }));

export const useGameStore = create<GameStore>((set, get) => ({
  session: initialSession,
  game: initialSession.runner.getState(),
  speed: 1,
  selectedId: null,
  setSpeed: (speed) => set({ speed }),
  select: (selectedId) => set({ selectedId }),
  syncFromRunner: () => set({ game: get().session.runner.getState() }),
}));
