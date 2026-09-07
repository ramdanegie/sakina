"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useReciters, useReciterTracks } from "./use-catalog";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { byPopularity } from "@/presentation/lib/reciter-grouping";

/**
 * Plays a surah when the user picked the surah but not a reciter — search
 * results, for instance.
 *
 * Choosing the reciter:
 *   1. Whoever is already playing. Searching for a surah mid-session almost
 *      always means "this surah, same voice", and switching reciters
 *      underneath the listener would be jarring.
 *   2. Otherwise the most popular reciter who actually recorded it.
 *
 * The queue is that reciter's full surah list starting at the chosen surah,
 * so playback continues naturally instead of stopping after one track.
 */
export function usePlaySurah() {
  const { data: reciters } = useReciters();
  const currentReciterId = usePlayerStore((s) => s.currentTrack?.reciterId);
  const playTrack = usePlayerStore((s) => s.playTrack);

  // Prefetch the active reciter's tracks so the common case needs no wait.
  const preferredId =
    currentReciterId ??
    (reciters === undefined || reciters.length === 0
      ? undefined
      : byPopularity(reciters)[0]?.id);

  const { data: tracks } = useReciterTracks(preferredId);

  return useCallback(
    async (surahNumber: number) => {
      if (tracks === undefined || tracks.length === 0) {
        toast.error("Still loading the catalogue — try again in a moment");
        return;
      }

      const track = tracks.find((t) => t.surahNumber === surahNumber);
      if (track === undefined) {
        // Plenty of reciters have only recorded part of the Quran.
        toast.error("This reciter has not recorded that surah");
        return;
      }

      await playTrack(track, tracks);
    },
    [tracks, playTrack],
  );
}
