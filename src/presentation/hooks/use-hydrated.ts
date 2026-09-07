"use client";

import { useSyncExternalStore } from "react";

/** Nothing ever changes, so no subscriber is ever notified. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while rendering on the server (or during the hydration pass), true
 * afterwards.
 *
 * This is the `useState` + `useEffect` "mounted" idiom expressed the way React
 * actually wants it. Writing state from inside an effect to signal mount
 * causes a second render pass and is flagged by the lint rules;
 * `useSyncExternalStore` exists precisely to describe a value that differs
 * between server and client.
 *
 * Use it for anything read from persisted storage — theme, settings — where
 * the pre-rendered HTML necessarily disagrees with what the browser has saved.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
