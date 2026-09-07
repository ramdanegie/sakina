"use client";

import { useSyncExternalStore } from "react";

/**
 * A ticking clock as an external store.
 *
 * Reading `Date.now()` during render is impure — React may re-render at any
 * time and get a different answer, which the compiler rightly rejects.
 * `useSyncExternalStore` is the sanctioned way to read a mutable external
 * source: the snapshot stays stable between ticks and only changes when the
 * shared interval fires.
 *
 * One interval is shared across all subscribers and is torn down when the last
 * one unsubscribes, so idle screens cost nothing.
 */

let current = 0;
let interval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (interval === null) {
    current = Date.now();
    interval = setInterval(() => {
      current = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };
}

/** Stable between ticks — required, or useSyncExternalStore loops forever. */
function getSnapshot(): number {
  return current;
}

/** There is no clock on the server; render the timer as not-yet-started. */
function getServerSnapshot(): number {
  return 0;
}

export function useNowMs(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
