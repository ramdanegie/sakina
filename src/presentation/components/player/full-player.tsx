"use client";

import { useState } from "react";
import {
  ChevronDown,
  ListMusic,
  Moon,
  Play,
  Pause,
  Rewind,
  FastForward,
  Radio,
  Star,
  Volume2,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { formatDuration, formatRemaining, initialsOf } from "@/presentation/lib/format";
import { AmbientBackdrop } from "./ambient-backdrop";
import { AmbientIcon } from "./ambient-icon";
import { AmbientPicker } from "./ambient-picker";
import { VolumeMixer } from "./volume-mixer";
import { QueuePanel } from "./queue-panel";
import { SleepTimerSheet } from "./sleep-timer-sheet";
import { cn } from "@/lib/utils";

type Panel = "none" | "volume" | "queue" | "ambient" | "sleep";

export function FullPlayer() {
  const isOpen = usePlayerStore((s) => s.isPlayerOpen);
  const openPlayer = usePlayerStore((s) => s.openPlayer);
  const track = usePlayerStore((s) => s.currentTrack);
  const ambient = usePlayerStore((s) => s.ambient);
  const isPlaying = usePlayerStore((s) => s.status === "playing");
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const speed = usePlayerStore((s) => s.speed);
  const sleepActive = usePlayerStore(
    (s) => s.sleepTimerExpiresAt !== null || s.sleepUntilEndOfTrack,
  );

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);
  const cycleSpeed = usePlayerStore((s) => s.cycleSpeed);
  const canCast = usePlayerStore((s) => s.canCast);
  const selectRemoteDevice = usePlayerStore((s) => s.selectRemoteDevice);

  const [panel, setPanel] = useState<Panel>("none");
  // While dragging, render the thumb position instead of the audio clock —
  // otherwise timeupdate fights the drag and the thumb stutters.
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  if (track === null) return null;

  const displayPosition = scrubbing ?? positionSec;

  return (
    <Drawer open={isOpen} onOpenChange={openPlayer}>
      <DrawerContent
        // Three overrides of the shared drawer defaults, all needed to make
        // this a true full-screen surface:
        //  - `mt-24` would leave a strip of the page showing above it
        //  - the rounded top edge belongs on a sheet, not a full screen
        //  - the drawer portals to the document root, so it does not inherit
        //    the app shell's width cap; without it the controls scatter
        //    across a desktop viewport
        // The last selector lifts the drag handle out of `bg-muted`, which is
        // near-black and therefore invisible against these backdrops.
        className={cn(
          "mx-auto w-full max-w-lg border-0 bg-black p-0",
          "h-[100dvh]",
          // The shared drawer caps height at 80vh and offsets it by mt-24 via
          // direction variants. Plain utilities lose to those, so the
          // overrides have to carry the same variant prefix or the player
          // stops short of the status bar.
          "data-[vaul-drawer-direction=bottom]:mt-0",
          "data-[vaul-drawer-direction=bottom]:max-h-[100dvh]",
          "data-[vaul-drawer-direction=bottom]:rounded-none",
          "data-[vaul-drawer-direction=bottom]:border-t-0",
          // Lift the drag handle out of `bg-muted`, which is near-black and
          // invisible against these backdrops.
          "[&>div:first-child]:z-10 [&>div:first-child]:bg-white/40",
        )}
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">
          {track.surahNameLatin} — {track.reciterName}
        </DrawerTitle>

        {/* Backdrop shifts with the active bed, so the player reads as a place
            rather than a control panel. */}
        <AmbientBackdrop ambientId={ambient?.id ?? null} />

        <div className="safe-top relative flex h-full flex-col px-6 pb-8">
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => openPlayer(false)}
              aria-label="Close player"
              className="flex size-11 items-center justify-center text-white/80"
            >
              <ChevronDown className="size-6" aria-hidden />
            </button>

            {/* Carries the active bed's own icon once one is picked, so the
                chip doubles as a status readout rather than just a button. */}
            <button
              type="button"
              onClick={() => setPanel("ambient")}
              aria-label={
                ambient === null
                  ? "Choose a background sound"
                  : `Background sound: ${ambient.name}. Change it`
              }
              className="glass flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-white"
            >
              {ambient === null ? (
                <ChevronDown className="size-4 shrink-0" aria-hidden />
              ) : (
                <AmbientIcon name={ambient.icon} className="size-4 shrink-0" />
              )}
              {ambient?.name ?? "Background sound"}
            </button>

            <div className="size-11" />
          </div>

          <div className="flex-1" />

          <div className="mb-6 flex items-center gap-3">
            <Avatar className="size-14 shrink-0">
              <AvatarImage src={track.reciterAvatarUrl ?? undefined} alt="" />
              <AvatarFallback className="bg-white/10">
                {initialsOf(track.reciterName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold text-white">
                {track.surahNameLatin}
              </h2>
              <p className="truncate text-white/60">{track.reciterName}</p>
            </div>

            <button
              type="button"
              aria-label="Add to favourites"
              className="glass flex size-11 items-center justify-center rounded-full text-white"
            >
              <Star className="size-5" aria-hidden />
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed}x`}
              className="tabular min-w-11 text-lg font-semibold text-white/80"
            >
              {speed}x
            </button>

            <button
              type="button"
              onClick={() => void previous()}
              aria-label="Previous surah"
              className="flex size-14 items-center justify-center text-white"
            >
              <Rewind className="size-8 fill-current" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex size-16 items-center justify-center text-white"
            >
              {isPlaying ? (
                <Pause className="size-12 fill-current" aria-hidden />
              ) : (
                <Play className="size-12 fill-current" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={() => void next()}
              aria-label="Next surah"
              className="flex size-14 items-center justify-center text-white"
            >
              <FastForward className="size-8 fill-current" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => setPanel("sleep")}
              aria-label="Sleep timer"
              className={cn(
                "flex size-11 items-center justify-center",
                sleepActive ? "text-accent" : "text-white/80",
              )}
            >
              <Moon className="size-6" aria-hidden />
            </button>
          </div>

          <Slider
            value={[displayPosition]}
            max={durationSec > 0 ? durationSec : 1}
            step={1}
            aria-label="Seek"
            onValueChange={([value]) => setScrubbing(value)}
            onValueCommit={([value]) => {
              seek(value);
              setScrubbing(null);
            }}
            className="mb-2"
          />

          <div className="tabular mb-6 flex justify-between text-xs text-white/70">
            <span>{formatDuration(displayPosition)}</span>
            <span>{formatRemaining(displayPosition, durationSec)}</span>
          </div>

          <div className="flex items-center justify-between text-white/80">
            <button
              type="button"
              onClick={() => setPanel("volume")}
              aria-label="Volume mixer"
              className="flex size-11 items-center justify-center"
            >
              <Volume2 className="size-6" aria-hidden />
            </button>

            <button
              type="button"
              aria-label="Quran text"
              className="font-arabic flex size-11 items-center justify-center text-2xl"
            >
              ق
            </button>

            {/* Only rendered where the platform has a route picker. */}
            {canCast ? (
              <button
                type="button"
                onClick={() => void selectRemoteDevice()}
                aria-label="Play on another device"
                className="flex size-11 items-center justify-center"
              >
                <Radio className="size-6" aria-hidden />
              </button>
            ) : (
              <span className="size-11" aria-hidden />
            )}

            <button
              type="button"
              onClick={() => setPanel("queue")}
              aria-label="Queue"
              className="flex size-11 items-center justify-center"
            >
              <ListMusic className="size-6" aria-hidden />
            </button>
          </div>
        </div>

        <VolumeMixer
          open={panel === "volume"}
          onOpenChange={(open) => setPanel(open ? "volume" : "none")}
        />
        <QueuePanel
          open={panel === "queue"}
          onOpenChange={(open) => setPanel(open ? "queue" : "none")}
        />
        <AmbientPicker
          open={panel === "ambient"}
          onOpenChange={(open) => setPanel(open ? "ambient" : "none")}
        />
        <SleepTimerSheet
          open={panel === "sleep"}
          onOpenChange={(open) => setPanel(open ? "sleep" : "none")}
        />
      </DrawerContent>
    </Drawer>
  );
}
