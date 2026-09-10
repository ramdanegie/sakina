"use client";

import { useEffect } from "react";

/** Changes on every build; see `next.config.ts`. */
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/**
 * Registers the service worker that makes the app installable and usable
 * offline, and keeps it from pinning users to an old build.
 *
 * The registration URL carries the build id. That matters: a browser only
 * reinstalls a worker whose *bytes* changed, and `/sw.js` is byte-identical
 * across deploys. Without the query string an installed PWA would keep the
 * worker — and the caches — it picked up on its first visit, which is exactly
 * how a PWA ends up serving a months-old build.
 *
 * Registration is deferred until after `load` so it never competes with the
 * first paint or the first audio request.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // A worker registered from a dev server would cache dev-only URLs and
    // then serve them after a real build.
    if (process.env.NODE_ENV !== "production") return;

    let reloading = false;

    const onControllerChange = () => {
      // A new worker took over. Reload once so the page matches the assets it
      // will now be served — guarded, because Safari can fire this twice.
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${BUILD_ID}`,
          { scope: "/" },
        );

        // If an update is already waiting from a previous visit, take it now
        // rather than leaving the user on the old build.
        registration.waiting?.postMessage({ type: "skip-waiting" });

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (installing === null) return;

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller !== null
            ) {
              installing.postMessage({ type: "skip-waiting" });
            }
          });
        });

        // Catch updates deployed while the app sits open in the background.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        });
      } catch {
        // Registration fails on insecure origins and in some private modes.
        // The app works fine without it, so there is nothing to report.
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
