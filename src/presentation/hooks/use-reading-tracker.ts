"use client";

import { useEffect } from "react";
import { getContainer } from "@/infrastructure/di/container";

/** How often reading time is credited and banked. */
const TICK_MS = 15_000;

/**
 * Credits time spent reading a surah toward the daily goal.
 *
 * Reading is measured from the wall clock rather than from audio ticks, so it
 * only counts while the tab is actually visible — leaving a surah open in a
 * background tab overnight must not manufacture a streak.
 *
 * Time is banked on every tick and again when the page hides, because a mobile
 * browser may freeze or discard the page without further warning.
 */
export function useReadingTracker(surahNumber: number | undefined) {
  useEffect(() => {
    if (surahNumber === undefined) return;
    if (typeof document === "undefined") return;

    const habit = getContainer().habit;
    habit.beginReading(surahNumber);

    let lastTick = Date.now();

    const credit = () => {
      const now = Date.now();
      const elapsed = (now - lastTick) / 1000;
      lastTick = now;

      // Only credit while visible, and cap the delta so a resumed tab cannot
      // dump its entire background time into the total at once.
      if (document.visibilityState !== "visible") return;
      if (elapsed > 0 && elapsed < (TICK_MS / 1000) * 2) {
        habit.addSeconds(elapsed);
      }
    };

    const interval = setInterval(() => {
      credit();
      void habit.checkpoint();
    }, TICK_MS);

    const onVisibility = () => {
      credit();
      if (document.visibilityState === "hidden") {
        void habit.checkpoint();
      } else {
        // Reset the clock so hidden time is never back-credited.
        lastTick = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);

    return () => {
      credit();
      void habit.flush();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
    };
  }, [surahNumber]);
}
