import type { ComponentName, Components, EntityId, GameState } from '../data/schemas';

export type ComponentOf<K extends ComponentName> = NonNullable<Components[K][string]>;

export function createEntity(state: GameState): { state: GameState; id: EntityId } {
  const id = state.nextEntityId;
  return { state: { ...state, nextEntityId: id + 1 }, id };
}

export function getComponent<K extends ComponentName>(
  state: GameState,
  name: K,
  id: EntityId,
): ComponentOf<K> | undefined {
  return state.components[name][String(id)] as ComponentOf<K> | undefined;
}

export function setComponent<K extends ComponentName>(
  state: GameState,
  name: K,
  id: EntityId,
  value: ComponentOf<K>,
): GameState {
  return {
    ...state,
    components: {
      ...state.components,
      [name]: { ...state.components[name], [String(id)]: value },
    },
  };
}

export function removeComponent(state: GameState, name: ComponentName, id: EntityId): GameState {
  const key = String(id);
  if (!(key in state.components[name])) return state;
  const { [key]: _removed, ...rest } = state.components[name];
  return { ...state, components: { ...state.components, [name]: rest } };
}

export function removeEntity(state: GameState, id: EntityId): GameState {
  let next = state;
  for (const name of Object.keys(state.components) as ComponentName[]) {
    next = removeComponent(next, name, id);
  }
  return next;
}

/** IDs of all entities with the given component, in ascending order (deterministic). */
export function entitiesWith(state: GameState, name: ComponentName): EntityId[] {
  return Object.keys(state.components[name])
    .map(Number)
    .sort((a, b) => a - b);
}
