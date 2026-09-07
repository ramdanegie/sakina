"use client";

import { Play, Pause, SkipForward } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { initialsOf } from "@/presentation/lib/format";

/**
 * The always-visible transport bar.
 *
 * Tapping the body opens the full player; the two buttons stop propagation so
 * hitting play never also expands the sheet — a mis-tap that would be
 * infuriating on a phone.
 */
export function MiniPlayer() {
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.status === "playing");
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  if (track === null) return null;

  const progress = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

  return (
    <div className="glass relative overflow-hidden rounded-full">
      <div
        className="bg-accent absolute inset-x-0 top-0 h-0.5 transition-[width] duration-300"
        style={{ width: `${progress}%` }}
        aria-hidden
      />

      <div className="flex items-center gap-3 py-2 pr-3 pl-2">
        <button
          type="button"
          onClick={() => openPlayer(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Open player: ${track.surahNameLatin} by ${track.reciterName}`}
        >
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={track.reciterAvatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-muted text-xs">
              {initialsOf(track.reciterName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {track.surahNumber}. {track.surahNameLatin}
              <span className="font-arabic ms-1.5 text-muted-foreground">
                ({track.surahNameArabic})
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {track.reciterName}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void togglePlay();
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex size-11 shrink-0 items-center justify-center text-foreground"
        >
          {isPlaying ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="size-5 fill-current" aria-hidden />
          )}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void next();
          }}
          aria-label="Next surah"
          className="flex size-11 shrink-0 items-center justify-center text-foreground"
        >
          <SkipForward className="size-5 fill-current" aria-hidden />
        </button>
      </div>
    </div>
  );
}
