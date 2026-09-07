"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the app installable and usable
 * offline.
 *
 * Registration is deferred until after `load` so it never competes with the
 * first paint or the first audio request — the worker is a background
 * capability, not something the user is waiting on.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // A worker registered from a dev server would cache dev-only URLs and
    // then serve them after a real build.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration fails on insecure origins and in some private modes.
        // The app works fine without it, so there is nothing to report.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
