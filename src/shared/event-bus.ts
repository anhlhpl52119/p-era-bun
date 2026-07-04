export type Listener<T> = (value: T) => void | Promise<void>;

export interface EventBus<T> {
  subscribe: (listener: Listener<T>) => () => void;
  publish: (value: T) => Promise<void>;
}

export function createEventBus<T>(
  onListenerError: (error: unknown) => void = error => console.error(error),
): EventBus<T> {
  const listeners = new Set<Listener<T>>();

  function subscribe(listener: Listener<T>): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  async function publish(value: T): Promise<void> {
    const results = await Promise.allSettled(
      [...listeners].map(listener =>
        Promise.resolve().then(() => listener(value)),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        onListenerError(result.reason);
      }
    }
  }

  return { subscribe, publish };
}
