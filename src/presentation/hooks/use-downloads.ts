"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useDownloadStore } from "@/presentation/stores/download.store";

/**
 * Loads which surahs are already on the device and surfaces download
 * failures as a toast.
 *
 * Hydration is idempotent, so every screen showing a download control can
 * call this without coordinating.
 */
export function useDownloads() {
  const hydrate = useDownloadStore((s) => s.hydrate);
  const lastError = useDownloadStore((s) => s.lastError);
  const clearError = useDownloadStore((s) => s.clearError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (lastError === null) return;
    toast.error(lastError);
    clearError();
  }, [lastError, clearError]);
}
