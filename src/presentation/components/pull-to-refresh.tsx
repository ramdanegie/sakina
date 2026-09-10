"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** How far the finger must travel before the release fires a refresh. */
const TRIGGER_PX = 72;

/** Movement past the trigger is damped, so the indicator cannot run away. */
const MAX_PULL_PX = 110;

/**
 * Pull down at the top of a page to fetch the newest build.
 *
 * An installed PWA has no address bar, so there is no reload button. Combined
 * with a cache-first worker that meant a user could be stuck on an old build
 * with no way out from inside the app. This is that way out, using the gesture
 * people already expect.
 *
 * Refreshing clears the cached HTML and asks the worker to check for a new
 * version before reloading, so this pulls the actual latest deploy rather than
 * re-rendering what is already cached.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onTouchStart = (event: TouchEvent) => {
      // Only from a genuine rest position at the very top, or the gesture
      // fights ordinary scrolling.
      if (window.scrollY > 0) return;
      if (event.touches.length !== 1) return;
      startY.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null || refreshing) return;

      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        startY.current = null;
        setPull(0);
        return;
      }

      // Square-root damping: responsive at first, increasingly stiff.
      const damped = Math.min(MAX_PULL_PX, Math.sqrt(delta) * 7);
      setPull(damped);
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;

      if (pull >= TRIGGER_PX && !refreshing) {
        setRefreshing(true);
        void refresh();
      } else {
        setPull(0);
      }
    };

    async function refresh() {
      try {
        const registration =
          await navigator.serviceWorker?.getRegistration?.();

        // Drop cached HTML and check for a newer worker before reloading;
        // otherwise this would just re-render the build already in the cache.
        registration?.active?.postMessage({ type: "clear-pages" });
        await registration?.update();
      } catch {
        // No worker, or the check failed — reload anyway.
      }

      window.location.reload();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pull, refreshing]);

  const visible = pull > 0 || refreshing;
  const armed = pull >= TRIGGER_PX;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${refreshing ? TRIGGER_PX * 0.6 : pull * 0.6}px)`,
        opacity: visible ? 1 : 0,
        transition: startYIsIdle(pull, refreshing)
          ? "transform 200ms ease, opacity 200ms ease"
          : undefined,
      }}
    >
      <span className="glass mt-[calc(env(safe-area-inset-top)+0.5rem)] flex size-10 items-center justify-center rounded-full">
        <RefreshCw
          className={cn(
            "text-foreground size-5",
            refreshing && "animate-spin",
          )}
          style={
            refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }
          }
          aria-hidden
        />
        <span className="sr-only">
          {refreshing
            ? "Refreshing"
            : armed
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </span>
    </div>
  );
}

/** Only animate when settling back, not while the finger is driving it. */
function startYIsIdle(pull: number, refreshing: boolean): boolean {
  return pull === 0 || refreshing;
}
