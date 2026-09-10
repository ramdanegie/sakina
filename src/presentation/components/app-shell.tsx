"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "./bottom-nav";
import { PullToRefresh } from "./pull-to-refresh";
import { MiniPlayer } from "./player/mini-player";
import { FullPlayer } from "./player/full-player";
import { usePlayerStore } from "@/presentation/stores/player.store";

/**
 * The persistent shell.
 *
 * The mini player and bottom nav live here, above the route outlet, so audio
 * and its controls survive navigation — browsing to a different reciter never
 * interrupts what is playing. On desktop the content column is capped to a
 * phone-ish width: this is a mobile-first product, and stretching a one-column
 * player across 2560px would just be worse.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const initialise = usePlayerStore((s) => s.initialise);
  const hasTrack = usePlayerStore((s) => s.currentTrack !== null);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main
        className="flex-1 pb-40"
        // Reserve room for the mini player + nav so the last list row is
        // never trapped underneath them.
        style={{ scrollPaddingBottom: "10rem" }}
      >
        {children}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg">
        <div className="pointer-events-auto flex flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {hasTrack ? <MiniPlayer /> : null}
          <BottomNav />
        </div>
      </div>

      <PullToRefresh />

      <FullPlayer />

      {/* Download failures and other transient errors surface here. Offset so
          toasts clear the mini player and nav rather than covering them. */}
      <Toaster position="top-center" offset={16} theme="dark" richColors />
    </div>
  );
}
