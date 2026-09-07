"use client";

import { useCallback, useEffect, useState } from "react";
import { getContainer } from "@/infrastructure/di/container";

export interface StorageStats {
  /** Bytes of recitation audio currently cached. */
  readonly usedBytes: number;
  /** Number of surahs downloaded. */
  readonly downloadCount: number;
  /** Remaining quota, or null when the browser will not report it. */
  readonly freeBytes: number | null;
}

const EMPTY: StorageStats = {
  usedBytes: 0,
  downloadCount: 0,
  freeBytes: null,
};

/**
 * Live view of what the app is holding on disk.
 *
 * Reads Cache Storage rather than summing the stored byte counts, so the
 * figure reflects what is actually on the device — a cache the browser evicted
 * under pressure would otherwise still be reported as present.
 */
export function useStorageStats() {
  const [stats, setStats] = useState<StorageStats>(EMPTY);
  const [isLoading, setLoading] = useState(true);

  /**
   * Reads the caches without touching state first. Flipping a loading flag
   * synchronously inside the mount effect would cascade an extra render for a
   * value that is already `true` on the first pass.
   */
  const read = useCallback(async (): Promise<StorageStats> => {
    const container = getContainer();

    const [usedBytes, freeBytes, completed] = await Promise.all([
      container.storage.usedBytes(),
      container.storage.estimateRemainingBytes(),
      container.offline.listCompleted(),
    ]);

    return {
      usedBytes,
      freeBytes,
      downloadCount: completed.ok ? completed.value.length : 0,
    };
  }, []);

  const refresh = useCallback(async () => {
    const next = await read();
    setStats(next);
    setLoading(false);
  }, [read]);

  useEffect(() => {
    let cancelled = false;

    void read().then((next) => {
      // The component may have unmounted while the caches were being counted.
      if (cancelled) return;
      setStats(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [read]);

  /** Drop every cached surah and forget the tasks that produced them. */
  const clear = useCallback(async () => {
    const container = getContainer();
    await container.storage.evictAll();
    await container.downloads.clearAll();
    await refresh();
  }, [refresh]);

  return { stats, isLoading, refresh, clear };
}

/** "0 B" / "42 MB" / "1.3 GB" */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;

  // Whole numbers past KB; a "1.0 MB" reads worse than "1 MB".
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}
