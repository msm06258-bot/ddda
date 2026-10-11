import { GameState } from '../data/schemas';

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

/** Parses and validates a save. Throws an Error with a readable message on bad input. */
export function deserializeGame(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Save file is not valid JSON');
  }
  const result = GameState.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Save file is invalid at ${issue?.path.join('.') || '<root>'}: ${issue?.message}`);
  }
  return result.data;
}
