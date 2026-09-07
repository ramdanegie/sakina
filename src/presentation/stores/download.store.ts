"use client";

import { create } from "zustand";
import type { TrackDto } from "@/application/dto";
import { getContainer } from "@/infrastructure/di/container";

/**
 * Download state for the surah list.
 *
 * Kept in its own store rather than in the player: downloads outlive the
 * currently playing track, and the surah list needs to re-render per row on
 * progress without touching playback state.
 */
interface DownloadState {
  /** Track ids that finished downloading. */
  completed: Set<string>;
  /** trackId -> 0..1, only present while a download is running. */
  progress: Map<string, number>;
  /** Most recent failure, surfaced as a toast by the caller. */
  lastError: string | null;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  toggle: (track: TrackDto) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  isDownloading: (trackId: string) => boolean;
  clearError: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  completed: new Set(),
  progress: new Map(),
  lastError: null,
  isHydrated: false,

  async hydrate() {
    if (get().isHydrated) return;

    const result = await getContainer().offline.listCompleted();
    set({
      isHydrated: true,
      completed: result.ok ? new Set(result.value) : new Set(),
    });
  },

  async toggle(track) {
    const { completed } = get();

    // Already downloaded: this is a delete.
    if (completed.has(track.id)) {
      const removed = await getContainer().offline.remove(track);
      if (!removed.ok) {
        set({ lastError: removed.error.message });
        return;
      }
      const next = new Set(completed);
      next.delete(track.id);
      set({ completed: next });
      return;
    }

    // Seed a zero so the row switches to its progress state immediately,
    // before the first byte arrives.
    set({
      progress: new Map(get().progress).set(track.id, 0),
      lastError: null,
    });

    const result = await getContainer().offline.download(
      track,
      (trackId, ratio) => {
        set({ progress: new Map(get().progress).set(trackId, ratio) });
      },
    );

    const progress = new Map(get().progress);
    progress.delete(track.id);

    if (!result.ok) {
      set({ progress, lastError: result.error.message });
      return;
    }

    set({ progress, completed: new Set(get().completed).add(track.id) });
  },

  isDownloaded(trackId) {
    return get().completed.has(trackId);
  },

  isDownloading(trackId) {
    return get().progress.has(trackId);
  },

  clearError() {
    set({ lastError: null });
  },
}));
