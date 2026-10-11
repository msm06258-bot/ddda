import type { SimEvent, SimEventType } from '../data/schemas';

type EventOf<T extends SimEventType> = Extract<SimEvent, { type: T }>;
type Handler<E> = (event: E) => void;
export type Unsubscribe = () => void;

/** Simple synchronous pub/sub for sim events. Lives outside GameState; never serialized. */
export type EventBus = {
  on<T extends SimEventType>(type: T, handler: Handler<EventOf<T>>): Unsubscribe;
  onAny(handler: Handler<SimEvent>): Unsubscribe;
  publish(events: readonly SimEvent[]): void;
};

export function createEventBus(): EventBus {
  const byType = new Map<SimEventType, Set<Handler<SimEvent>>>();
  const any = new Set<Handler<SimEvent>>();

  return {
    on(type, handler) {
      const set = byType.get(type) ?? new Set();
      byType.set(type, set);
      const h = handler as Handler<SimEvent>;
      set.add(h);
      return () => set.delete(h);
    },
    onAny(handler) {
      any.add(handler);
      return () => any.delete(handler);
    },
    publish(events) {
      for (const event of events) {
        byType.get(event.type)?.forEach((h) => h(event));
        any.forEach((h) => h(event));
      }
    },
  };
}
