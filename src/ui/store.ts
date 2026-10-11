import { create } from 'zustand';
import type { Command } from '../dev/commands';
import type { EntityId, GameState, LogCategory, StructureKind, TilePos } from '../data/schemas';
import type { Speed } from '../sim/clock';
import { createNewGame } from '../sim/newGame';
import { placeStructure } from '../sim/structures';
import { createSession, type GameSession } from './session';

export type LogEntry = { id: number; tick: number; category: LogCategory; text: string };

const MAX_LOG = 200;

type GameStore = {
  session: GameSession;
  /** Latest sim state, refreshed after each frame that ran ticks. Read-only for UI. */
  game: GameState;
  speed: Speed;
  selectedId: EntityId | null;
  buildMode: StructureKind | null;
  log: LogEntry[];
  /** A short message for the player (e.g. why a placement failed). */
  notice: string | null;

  setSpeed(speed: Speed): void;
  select(id: EntityId | null): void;
  setBuildMode(kind: StructureKind | null): void;
  placeAt(pos: TilePos): void;
  /** Apply a command between ticks (dev tools, player actions needing RNG). */
  run(command: Command): void;
  fastForward(ticks: number): void;
  newGame(seed: number): void;
  loadGame(state: GameState): void;
  notify(message: string | null): void;
  /** Pull state and buffered events from the runner. Called by the game loop after ticks run. */
  syncFromRunner(): void;
};

let nextLogId = 1;

const initial = createSession(createNewGame({ seed: Math.floor(Date.now() % 100000) }));

export const useGameStore = create<GameStore>((set, get) => ({
  session: initial,
  game: initial.runner.getState(),
  speed: 1,
  selectedId: null,
  buildMode: null,
  log: [],
  notice: null,

  setSpeed: (speed) => set({ speed }),
  select: (selectedId) => set({ selectedId }),
  setBuildMode: (buildMode) => set({ buildMode, notice: null }),

  placeAt(pos) {
    const { buildMode, session } = get();
    if (!buildMode) return;
    const r = placeStructure(session.runner.getState(), buildMode, pos);
    if (!r.ok) {
      set({ notice: r.reason });
      return;
    }
    session.runner.setState(r.state);
    set({ notice: null });
    get().syncFromRunner();
  },

  run(command) {
    get().session.runner.apply(command);
    get().syncFromRunner();
  },

  fastForward(ticks) {
    get().session.runner.runTicks(ticks);
    get().syncFromRunner();
  },

  newGame(seed) {
    const session = createSession(createNewGame({ seed }));
    set({ session, game: session.runner.getState(), selectedId: null, buildMode: null, log: [], notice: null });
  },

  loadGame(state) {
    const session = createSession(state);
    set({ session, game: state, selectedId: null, buildMode: null, log: [], notice: 'Game loaded' });
  },

  notify: (notice) => set({ notice }),

  syncFromRunner() {
    const { session, log } = get();
    const entries: LogEntry[] = [];
    for (const e of session.drainEvents()) {
      if (e.type === 'log') entries.push({ id: nextLogId++, tick: e.tick, category: e.category, text: e.text });
    }
    set({
      game: session.runner.getState(),
      log: entries.length > 0 ? [...log, ...entries].slice(-MAX_LOG) : log,
    });
  },
}));
